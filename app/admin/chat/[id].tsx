import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, ArrowUp } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useScreenTopPadding } from '../../../hooks/useScreenTopPadding';
import { haptics } from '../../../utils/haptics';
import { LoadingView, useAdminColors, F } from '../../../components/admin/AdminUI';

interface Message {
    id: string;
    chat_id: string;
    sender_type: 'user' | 'admin';
    content: string;
    created_at: string;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });

export default function AdminChatNativeDetails() {
    const { id } = useLocalSearchParams();
    const chatId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const c = useAdminColors();
    const insets = useSafeAreaInsets();
    const top = useScreenTopPadding();
    const { showToast } = useToast();

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [chatStatus, setChatStatus] = useState<'open' | 'closed'>('open');
    const [appVersion, setAppVersion] = useState<string | null>(null);
    const listRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!chatId) return;
        let cancelled = false;

        // Tell the push function this admin is reading the chat, so it skips the notification
        const updateWatching = async (isWatching: boolean) => {
            const pushToken = await AsyncStorage.getItem('expo_push_token');
            if (pushToken) {
                await supabase.from('push_tokens').update({ is_watching_chat: isWatching, active_chat_id: isWatching ? chatId : null }).eq('token', pushToken);
            }
        };

        (async () => {
            const [{ data: chat }, { data: msgs, error }] = await Promise.all([
                supabase.from('chats').select('status, app_version').eq('id', chatId).single(),
                supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true }),
            ]);
            if (cancelled) return;
            if (chat) {
                setChatStatus(chat.status);
                setAppVersion(chat.app_version);
            }
            if (error) console.error('Error loading chat:', error);
            setMessages(msgs || []);
            setLoading(false);
        })();
        updateWatching(true);

        const sub = supabase
            .channel(`admin_chat_${chatId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
                const msg = payload.new as Message;
                // Swap in the server copy of our own optimistic message; append everything else
                setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    const temp = prev.findIndex((m) => m.id.startsWith('temp-') && m.sender_type === msg.sender_type && m.content === msg.content);
                    if (temp >= 0) return prev.map((m, i) => (i === temp ? msg : m));
                    if (msg.sender_type === 'user') haptics.tap();
                    return [...prev, msg];
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats', filter: `id=eq.${chatId}` }, (payload) => {
                setChatStatus(payload.new.status);
            })
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(sub);
            updateWatching(false);
        };
    }, [chatId]);

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !chatId) return;
        haptics.tap();
        const tempId = 'temp-' + Date.now();
        setMessages((prev) => [...prev, { id: tempId, chat_id: chatId, sender_type: 'admin', content: text, created_at: new Date().toISOString() }]);
        setInputText('');

        const { error } = await supabase.from('messages').insert([{ chat_id: chatId, sender_type: 'admin', content: text }]);
        if (error) {
            haptics.error();
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setInputText(text);
            showToast('Mesaj göndərilmədi', 'error');
        }
    };

    const toggleStatus = async () => {
        if (!chatId) return;
        const next = chatStatus === 'open' ? 'closed' : 'open';
        const { error } = await supabase.from('chats').update({ status: next }).eq('id', chatId);
        if (error) {
            haptics.error();
            showToast('Status dəyişmədi', 'error');
            return;
        }
        haptics.success();
        setChatStatus(next);
    };

    const canSend = inputText.trim().length > 0;

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            <View style={[styles.header, { paddingTop: top, borderBottomColor: c.hairline, backgroundColor: c.card }]}>
                <TouchableOpacity onPress={() => { haptics.tap(); router.back(); }} style={styles.back} hitSlop={10} accessibilityLabel="Çatlar">
                    <ChevronLeft size={24} color={c.primary} strokeWidth={2.4} />
                    <Text style={[styles.backText, { color: c.primary }]}>Çatlar</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>Müştəri {String(chatId).substring(0, 5)}</Text>
                    <Text style={[styles.headerSub, { color: chatStatus === 'open' ? c.success : c.textSecondary }]}>
                        {chatStatus === 'open' ? 'Açıq' : 'Bağlı'}{appVersion ? ` · v${appVersion}` : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={toggleStatus} hitSlop={10} style={styles.headerAction} accessibilityRole="button">
                    <Text style={[styles.headerActionText, { color: c.primary }]}>{chatStatus === 'open' ? 'Bağla' : 'Aç'}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {loading ? <LoadingView /> : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(m) => m.id}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode="interactive"
                        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                        ListEmptyComponent={<Text style={[styles.empty, { color: c.textSecondary }]}>Hələ mesaj yoxdur</Text>}
                        renderItem={({ item }) => {
                            const mine = item.sender_type === 'admin';
                            return (
                                <View style={[styles.bubbleWrap, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
                                    <View style={[styles.bubble, mine ? { backgroundColor: c.primary, borderBottomRightRadius: 6 } : { backgroundColor: c.fill, borderBottomLeftRadius: 6 }]}>
                                        <Text style={[styles.bubbleText, { color: mine ? '#FFF' : c.text }]}>{item.content}</Text>
                                    </View>
                                    <Text style={[styles.time, { color: c.textSecondary }]}>{time(item.created_at)}</Text>
                                </View>
                            );
                        }}
                    />
                )}

                {chatStatus === 'open' ? (
                    <View style={[styles.composer, { backgroundColor: c.card, borderTopColor: c.hairline, paddingBottom: Math.max(insets.bottom, 10) }]}>
                        <TextInput
                            style={[styles.input, { color: c.text, borderColor: c.hairline }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                            placeholder="Cavab yazın"
                            placeholderTextColor={c.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.send, { backgroundColor: canSend ? c.primary : c.fill }]}
                            onPress={handleSend}
                            disabled={!canSend}
                            accessibilityLabel="Göndər"
                        >
                            <ArrowUp size={18} color={canSend ? '#FFF' : c.textSecondary} strokeWidth={2.6} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.closed, { borderTopColor: c.hairline, paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <Text style={[styles.closedText, { color: c.textSecondary }]}>Çat bağlıdır. Yazmaq üçün yuxarıdan “Aç” seçin.</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    back: { flexDirection: 'row', alignItems: 'center', width: 90 },
    backText: { fontSize: 17, fontFamily: F.medium },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontFamily: F.semibold },
    headerSub: { fontSize: 12, fontFamily: F.medium, marginTop: 1 },
    headerAction: { width: 90, alignItems: 'flex-end', paddingRight: 4 },
    headerActionText: { fontSize: 17, fontFamily: F.medium },
    list: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 16, gap: 8 },
    empty: { textAlign: 'center', marginTop: 40, fontSize: 14, fontFamily: F.medium },
    bubbleWrap: { gap: 3 },
    bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
    bubbleText: { fontSize: 16, lineHeight: 21, fontFamily: F.regular },
    time: { fontSize: 11, fontFamily: F.medium, marginHorizontal: 6 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
    input: { flex: 1, minHeight: 36, maxHeight: 120, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8, fontSize: 16, fontFamily: F.regular },
    send: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 1 },
    closed: { paddingTop: 14, paddingHorizontal: 24, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
    closedText: { fontSize: 13, fontFamily: F.medium, textAlign: 'center' },
});
