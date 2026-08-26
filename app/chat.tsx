import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react-native';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { useSettings } from '../contexts/SettingsContext';
import { Image } from 'expo-image';
import Constants from 'expo-constants';

// Basic UUID generator for anonymous users if they don't have one
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

interface Message {
    id: string;
    chat_id: string;
    sender_type: 'user' | 'admin';
    content: string;
    created_at: string;
    is_read: boolean;
}

export default function ChatScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { session } = useAuth(); // If they are logged in
    const { settings } = useSettings();
    const logoUrl = isDark ? settings?.site_logo_dark : settings?.site_logo_light;

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatId, setChatId] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const { expoPushToken } = usePushNotifications(deviceId || undefined);

    const flatListRef = useRef<FlatList>(null);

    // Initialize Chat
    useEffect(() => {
        const initChat = async () => {
            try {
                // 1. Get or create device ID
                let savedDeviceId = await AsyncStorage.getItem('device_id');
                if (!savedDeviceId) {
                    savedDeviceId = generateUUID();
                    await AsyncStorage.setItem('device_id', savedDeviceId);
                }
                setDeviceId(savedDeviceId);

                // 2. Fetch existing open chat
                let { data: existingChats, error: fetchError } = await supabase
                    .from('chats')
                    .select('*')
                    .eq('device_id', savedDeviceId)
                    .eq('status', 'open')
                    .order('created_at', { ascending: false })
                    .limit(1);

                let currentChatId = null;

                if (existingChats && existingChats.length > 0) {
                    currentChatId = existingChats[0].id;
                    // Proactively update app version if it's missing or different
                    const appVersion = Constants.expoConfig?.version || 'Unknown';
                    if (existingChats[0].app_version !== appVersion) {
                        await supabase
                            .from('chats')
                            .update({ app_version: appVersion })
                            .eq('id', currentChatId);
                    }
                } else {
                    // 3. Or create a new chat
                    const appVersion = Constants.expoConfig?.version || 'Unknown';
                    const { data: newChat, error: insertError } = await supabase
                        .from('chats')
                        .insert([
                            {
                                device_id: savedDeviceId,
                                user_id: session?.user?.id || null, // Link if logged in
                                status: 'open',
                                app_version: appVersion
                            },
                        ])
                        .select()
                        .single();

                    if (insertError) {
                        console.error('Error creating chat:', insertError);
                    } else if (newChat) {
                        currentChatId = newChat.id;
                    }
                }

                if (currentChatId) {
                    setChatId(currentChatId);
                    await loadMessages(currentChatId);
                    subscribeToMessages(currentChatId);

                    // Update watching status
                    const pushToken = await AsyncStorage.getItem('expo_push_token');
                    if (pushToken) {
                        await supabase
                            .from('push_tokens')
                            .update({ is_watching_chat: true, active_chat_id: currentChatId })
                            .eq('token', pushToken);
                    }
                }
            } catch (err) {
                console.error('Failed to init chat', err);
            } finally {
                setLoading(false);
            }
        };

        initChat();

        return () => {
            const setNotWatching = async () => {
                const pushToken = await AsyncStorage.getItem('expo_push_token');
                if (pushToken) {
                    await supabase
                        .from('push_tokens')
                        .update({ is_watching_chat: false, active_chat_id: null })
                        .eq('token', pushToken);
                }
            };
            setNotWatching();
            supabase.removeAllChannels();
        };
    }, []);

    const loadMessages = async (cId: string) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', cId)
            .order('created_at', { ascending: true }); // older first for flatlist

        if (!error && data) {
            setMessages(data);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 500);
        }
    };

    const subscribeToMessages = (cId: string) => {
        supabase
            .channel(`chat_${cId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `chat_id=eq.${cId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages((prev) => {
                        if (prev.find((m) => m.id === newMsg.id || (m.content === newMsg.content && m.sender_type === newMsg.sender_type))) return prev;
                        return [...prev, newMsg];
                    });

                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            )
            .subscribe((status, err) => {
                console.log('Mobile Chat Subscription Status:', status);
                if (err) console.error('Subscription Error:', err);
            });
    };

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !chatId) return;

        const tempId = generateUUID();
        const tempMsg: Message = {
            id: tempId,
            chat_id: chatId,
            sender_type: 'user',
            content: text,
            created_at: new Date().toISOString(),
            is_read: false,
        };

        // Optimistic UI update
        setMessages(prev => [...prev, tempMsg]);
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        setInputText('');

        try {
            const { error: insertError } = await supabase.from('messages').insert([
                {
                    chat_id: chatId,
                    sender_type: 'user',
                    content: text,
                },
            ]);

            if (insertError) {
                console.error('Insert error details:', insertError);
                setMessages(prev => prev.filter(m => m.id !== tempId));
                alert(`Error: ${insertError.message}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert(`Exception: ${error}`);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender_type === 'user';

        return (
            <MotiView
                from={{ opacity: 0, translateY: 10, scale: 0.9 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            >
                {isUser ? (
                    <LinearGradient
                        colors={[colors.primary, isDark ? '#3D00A5' : '#5D2FCF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.messageBubble, styles.userBubble]}
                    >
                        <Text style={[styles.messageText, { color: '#FFFFFF' }]}>
                            {item.content}
                        </Text>
                        <Text style={[styles.timeText, { color: 'rgba(255,255,255,0.7)' }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </LinearGradient>
                ) : (
                    <View
                        style={[
                            styles.messageBubble,
                            styles.adminBubble,
                            {
                                backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                elevation: 1,
                            },
                        ]}
                    >
                        <Text style={[styles.messageText, { color: colors.text }]}>
                            {item.content}
                        </Text>
                        <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                )}
            </MotiView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
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
                        <MessageCircle size={20} color={colors.primary} />
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Canlı Dəstək</Text>
                    <View style={styles.statusContainer}>
                        <MotiView
                            from={{ scale: 0.8, opacity: 0.3 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                loop: true,
                                type: 'timing',
                                duration: 1500,
                            }}
                            style={styles.statusDot}
                        />
                        <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>Online</Text>
                    </View>
                </View>
            </View>

            {/* Chat Area */}
            {loading ? (
                <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                                <MessageCircle size={48} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Xoş Gəlmisiniz!</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Suallarınızı buraya yaza bilərsiniz. Operativ cavab verməyə çalışacağıq.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? -34 : 0}
            >
                <View style={[
                    styles.inputWrapper,
                    {
                        paddingBottom: insets.bottom || 16,
                        backgroundColor: isDark ? 'transparent' : '#F8F9FA'
                    }
                ]}>
                    <View style={[styles.inputContainer, {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: colors.border,
                        borderWidth: isDark ? 0 : 1,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        elevation: 5,
                    }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Mesajınızı yazın..."
                            placeholderTextColor={colors.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                { backgroundColor: inputText.trim() ? colors.primary : colors.border },
                            ]}
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                        >
                            <Send size={20} color={inputText.trim() ? '#FFF' : colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
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
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    logoCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    headerLogo: {
        width: '75%',
        height: '75%',
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'RethinkSans_700Bold',
        letterSpacing: -0.5,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#34C759',
        marginRight: 6,
    },
    headerStatus: {
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: {
        padding: 20,
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
        textAlign: 'center',
        lineHeight: 22,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 20,
        marginBottom: 16,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    adminBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        fontFamily: 'RethinkSans_400Regular',
        lineHeight: 22,
    },
    timeText: {
        fontSize: 11,
        fontFamily: 'RethinkSans_500Medium',
        alignSelf: 'flex-end',
        marginTop: 6,
    },
    inputWrapper: {
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        marginBottom: 8,
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 16,
        fontFamily: 'RethinkSans_400Regular',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
