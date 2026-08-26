import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react-native';
import { useSettings } from '../../../contexts/SettingsContext';
import { Image } from 'expo-image';

interface Message {
    id: string;
    chat_id: string;
    sender_type: 'user' | 'admin';
    content: string;
    created_at: string;
}

export default function AdminChatNativeDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { settings } = useSettings();
    const logoUrl = isDark ? settings?.site_logo_dark : settings?.site_logo_light;

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatStatus, setChatStatus] = useState<'open' | 'closed'>('open');
    const [appVersion, setAppVersion] = useState<string | null>(null);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!id) return;

        const updateWatching = async (isWatching: boolean) => {
            const pushToken = await AsyncStorage.getItem('expo_push_token');
            if (pushToken) {
                await supabase
                    .from('push_tokens')
                    .update({ is_watching_chat: isWatching, active_chat_id: isWatching ? id : null })
                    .eq('token', pushToken);
            }
        };

        loadChatDetails();
        updateWatching(true);

        const sub = supabase
            .channel(`admin_chat_${id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}` }, (payload) => {
                const newMsg = payload.new as Message;
                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id || (m.content === newMsg.content && m.sender_type === newMsg.sender_type))) return prev;
                    return [...prev, newMsg];
                });
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${id}` }, (payload) => {
                console.log('Admin Received Chat Update:', payload);
                setChatStatus(payload.new.status);
            })
            .subscribe((status, err) => {
                console.log('Admin Chat Subscription Status:', status);
                if (err) console.error('Admin Subscription Error:', err);
            });

        return () => {
            supabase.removeChannel(sub);
            updateWatching(false);
        };
    }, [id]);

    const loadChatDetails = async () => {
        try {
            // Get status and version
            const { data: chatData } = await supabase.from('chats').select('status, app_version').eq('id', id).single();
            if (chatData) {
                setChatStatus(chatData.status);
                setAppVersion(chatData.app_version);
            }

            // Get messages
            const { data: msgs, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(msgs || []);

            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
        } catch (error) {
            console.error('Error loading chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !id) return;

        const tempId = 'temp-' + Date.now();
        const tempMsg: Message = {
            id: tempId,
            chat_id: id as string,
            sender_type: 'admin',
            content: text,
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, tempMsg]);
        setInputText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const { error } = await supabase.from('messages').insert([
                {
                    chat_id: id,
                    sender_type: 'admin',
                    content: text,
                },
            ]);

            if (error) {
                setMessages(prev => prev.filter(m => m.id !== tempId));
                console.error('Error sending:', error);
            }
        } catch (error) {
            console.error('Exception sending:', error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const handleCloseChat = async () => {
        if (!id || chatStatus === 'closed') return;

        try {
            await supabase.from('chats').update({ status: 'closed' }).eq('id', id);
            setChatStatus('closed');
        } catch (error) {
            console.error('Error closing chat:', error);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isAdmin = item.sender_type === 'admin';
        return (
            <View
                style={[
                    styles.messageBubble,
                    isAdmin ? styles.adminBubble : styles.userBubble,
                    {
                        backgroundColor: isAdmin ? colors.primary : colors.card,
                        borderColor: isAdmin ? 'transparent' : colors.border,
                        borderWidth: isAdmin ? 0 : 1,
                    },
                ]}
            >
                <Text style={[styles.messageText, { color: isAdmin ? '#FFFFFF' : colors.text }]}>
                    {item.content}
                </Text>
                <Text style={[styles.timeText, { color: isAdmin ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={[styles.logoCircle, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                    {logoUrl ? (
                        <Image
                            source={{ uri: logoUrl }}
                            style={styles.headerLogo}
                            contentFit="contain"
                        />
                    ) : (
                        <CheckCircle size={20} color={colors.primary} />
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Chat #{String(id).substring(0, 5)}</Text>
                    <View style={styles.headerSub}>
                        <Text style={[styles.headerStatus, { color: chatStatus === 'open' ? '#34C759' : '#FF3B30' }]}>
                            {chatStatus === 'open' ? 'Aktiv' : 'Bağlı'}
                        </Text>
                        {appVersion && (
                            <View style={[styles.versionBadge, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}>
                                <Text style={[styles.versionText, { color: colors.textSecondary }]}>v{appVersion}</Text>
                            </View>
                        )}
                    </View>
                </View>
                {chatStatus === 'open' && (
                    <TouchableOpacity onPress={handleCloseChat} style={styles.closeBtn}>
                        <CheckCircle size={20} color="#FF3B30" />
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {chatStatus === 'open' ? (
                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 16 }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                            placeholder="Müştəriyə cavab yazın..."
                            placeholderTextColor={colors.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: inputText.trim() ? colors.primary : colors.border }]}
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                        >
                            <Send size={20} color={inputText.trim() ? '#FFF' : colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.closedBanner, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', paddingBottom: insets.bottom || 16 }]}>
                        <Text style={[styles.closedText, { color: colors.textSecondary }]}>Bu çat bağlanıb.</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    logoCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    headerLogo: {
        width: '70%',
        height: '70%',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
    },
    headerStatus: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
    },
    headerSub: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    versionBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: 8,
    },
    versionText: {
        fontSize: 10,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    closeBtn: {
        padding: 8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: {
        padding: 16,
        paddingBottom: 32,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    adminBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    userBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
        lineHeight: 20,
    },
    timeText: {
        fontSize: 10,
        fontFamily: 'RethinkSans_500Medium',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        marginBottom: 2,
    },
    closedBanner: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closedText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
    },
});
