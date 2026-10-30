import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Send, MessageSquare, ChevronLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Segmented, Button, EmptyState, Loading, useWebTokens, useBreakpoints, FONT } from '../../components/web/WebKit';
import { SearchField } from '../../components/web/AdminKit';

interface Chat {
    id: string;
    device_id: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
}

interface Message {
    id: string;
    chat_id: string;
    sender_type: 'user' | 'admin';
    content: string;
    created_at: string;
}

type Filter = 'open' | 'closed' | 'all';

// Today → "14:05", earlier → "12.10 14:05"
const stamp = (iso: string) => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString()
        ? time
        : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${time}`;
};

export default function AdminChatsWeb() {
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const { showToast } = useToast();

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<Filter>('open');
    const listRef = useRef<FlatList>(null);

    const loadChats = useCallback(async () => {
        let query = supabase.from('chats').select('*').order('updated_at', { ascending: false });
        if (filterStatus !== 'all') query = query.eq('status', filterStatus);
        const [{ data, error }, { data: msgRows }] = await Promise.all([
            query,
            supabase.from('messages').select('chat_id'),
        ]);
        if (error) console.error('Error loading chats:', error);
        else {
            const hasMsg = new Set((msgRows || []).map((m: any) => m.chat_id));
            const all = data || [];
            const emptyIds = all.filter((ch) => !hasMsg.has(ch.id)).map((ch) => ch.id);
            if (emptyIds.length > 0) {
                supabase.from('chats').delete().in('id', emptyIds).then(() => {});
            }
            setChats(all.filter((ch) => hasMsg.has(ch.id)));
        }
        setLoadingChats(false);
    }, [filterStatus]);

    useEffect(() => {
        // First load waits a tick so it never sets state synchronously inside the effect
        const first = setTimeout(loadChats, 0);
        const sub = supabase
            .channel('admin_chats_web')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadChats())
            .subscribe();
        return () => {
            clearTimeout(first);
            supabase.removeChannel(sub);
        };
    }, [loadChats]);

    const selectedId = selectedChat?.id;

    useEffect(() => {
        if (!selectedId) return;
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase.from('messages').select('*').eq('chat_id', selectedId).order('created_at', { ascending: true });
            if (cancelled) return;
            if (error) console.error('Error loading messages:', error);
            setMessages(data || []);
            setLoadingMessages(false);
        })();

        const sub = supabase
            .channel(`admin_messages_web_${selectedId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedId}` },
                (payload) => {
                    const msg = payload.new as Message;
                    // Replace our optimistic copy, or append a message from the customer
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === msg.id)) return prev;
                        const temp = prev.findIndex((m) => m.id.startsWith('temp-') && m.sender_type === msg.sender_type && m.content === msg.content);
                        if (temp >= 0) return prev.map((m, i) => (i === temp ? msg : m));
                        return [...prev, msg];
                    });
                }
            )
            .subscribe();
        return () => {
            cancelled = true;
            supabase.removeChannel(sub);
        };
    }, [selectedId]);

    const openChat = (chat: Chat) => {
        if (chat.id === selectedChat?.id) return;
        setMessages([]);
        setLoadingMessages(true);
        setSelectedChat(chat);
    };

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !selectedChat) return;
        setInputText('');
        const tempId = 'temp-' + Date.now();
        setMessages((prev) => [...prev, { id: tempId, chat_id: selectedChat.id, sender_type: 'admin', content: text, created_at: new Date().toISOString() }]);

        const { error } = await supabase.from('messages').insert([{ chat_id: selectedChat.id, sender_type: 'admin', content: text }]);
        if (error) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setInputText(text);
            showToast('Mesaj göndərilmədi', 'error');
        }
    };

    const toggleStatus = async (chat: Chat) => {
        const status = chat.status === 'open' ? 'closed' : 'open';
        const { error } = await supabase.from('chats').update({ status }).eq('id', chat.id);
        if (error) {
            showToast('Status dəyişmədi', 'error');
            return;
        }
        setSelectedChat({ ...chat, status });
        loadChats();
    };

    const q = searchQuery.trim().toLowerCase();
    const filtered = chats.filter((c) => !q || c.device_id.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));

    const list = (
        <View style={[styles.listPane, { borderRightColor: t.hairline, backgroundColor: t.surface }, isMobile && { width: '100%', borderRightWidth: 0 }]}>
            <View style={styles.listHeader}>
                <Text style={[styles.paneTitle, { color: t.text }]}>Canlı dəstək</Text>
                <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Müştəri ID" style={{ flexBasis: 'auto', flexGrow: 0 }} />
                <Segmented<Filter>
                    options={[{ value: 'open', label: 'Açıq' }, { value: 'closed', label: 'Bağlı' }, { value: 'all', label: 'Hamısı' }]}
                    value={filterStatus}
                    onChange={(v) => { setLoadingChats(true); setFilterStatus(v); }}
                    fullWidth
                />
            </View>
            {loadingChats ? <Loading /> : (
                <ScrollView style={{ flex: 1 }}>
                    {filtered.length === 0 && <Text style={[styles.muted, { color: t.textSecondary }]}>Çat tapılmadı</Text>}
                    {filtered.map((chat) => {
                        const active = selectedChat?.id === chat.id;
                        return (
                            <TouchableOpacity
                                key={chat.id}
                                onPress={() => openChat(chat)}
                                style={[styles.chatRow, active && { backgroundColor: t.accent }]}
                            >
                                <View style={[styles.avatar, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : t.fill }]}>
                                    <Text style={[styles.avatarText, { color: active ? '#FFF' : t.text }]}>{chat.device_id.slice(0, 2).toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <View style={styles.chatRowTop}>
                                        <Text style={[styles.chatName, { color: active ? '#FFF' : t.text }]} numberOfLines={1}>
                                            Müştəri {chat.device_id.substring(0, 8)}
                                        </Text>
                                        <Text style={[styles.chatTime, { color: active ? 'rgba(255,255,255,0.8)' : t.textSecondary }]}>{stamp(chat.updated_at)}</Text>
                                    </View>
                                    <Text style={[styles.chatStatus, { color: active ? 'rgba(255,255,255,0.85)' : chat.status === 'open' ? t.success : t.textSecondary }]}>
                                        {chat.status === 'open' ? '● Açıq' : 'Bağlı'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );

    const conversation = selectedChat ? (
        <View style={styles.convPane}>
            <View style={[styles.convHeader, { borderBottomColor: t.hairline, backgroundColor: t.surface }]}>
                {isMobile && (
                    <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.back} accessibilityLabel="Çatlara qayıt">
                        <ChevronLeft size={20} color={t.accent} />
                        <Text style={[styles.backText, { color: t.accent }]}>Çatlar</Text>
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.convTitle, { color: t.text }]} numberOfLines={1}>Müştəri {selectedChat.device_id.substring(0, 12)}</Text>
                    <Text style={[styles.convSub, { color: t.textSecondary }]}>Başlayıb: {stamp(selectedChat.created_at)}</Text>
                </View>
                <Button
                    size="sm"
                    variant={selectedChat.status === 'open' ? 'destructive' : 'secondary'}
                    title={selectedChat.status === 'open' ? 'Çatı bağla' : 'Yenidən aç'}
                    onPress={() => toggleStatus(selectedChat)}
                />
            </View>

            {loadingMessages ? <Loading /> : (
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(m) => m.id}
                    contentContainerStyle={styles.messages}
                    onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={<Text style={[styles.muted, { color: t.textSecondary }]}>Hələ mesaj yoxdur</Text>}
                    renderItem={({ item }) => {
                        const mine = item.sender_type === 'admin';
                        return (
                            <View style={[styles.bubbleWrap, mine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                                <View style={[styles.bubble, mine ? { backgroundColor: t.accent, borderBottomRightRadius: 6 } : { backgroundColor: t.fill, borderBottomLeftRadius: 6 }]}>
                                    <Text style={[styles.bubbleText, { color: mine ? '#FFF' : t.text }]}>{item.content}</Text>
                                </View>
                                <Text style={[styles.bubbleTime, { color: t.textTertiary }]}>{stamp(item.created_at)}</Text>
                            </View>
                        );
                    }}
                />
            )}

            {selectedChat.status === 'open' ? (
                <View style={[styles.composer, { borderTopColor: t.hairline, backgroundColor: t.surface }]}>
                    <TextInput
                        placeholder="Mesaj yazın"
                        placeholderTextColor={t.placeholder}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        accessibilityLabel="Mesaj"
                        // Enter sends, Shift+Enter adds a new line
                        onKeyPress={(e: any) => {
                            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                                e.preventDefault?.();
                                handleSend();
                            }
                        }}
                        style={[styles.input, { color: t.text, borderColor: t.hairlineStrong }, { outlineStyle: 'none' } as any]}
                    />
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                        accessibilityLabel="Göndər"
                        style={[styles.send, { backgroundColor: inputText.trim() ? t.accent : t.fill }]}
                    >
                        <Send size={16} color={inputText.trim() ? '#FFF' : t.textTertiary} />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={[styles.closed, { borderTopColor: t.hairline }]}>
                    <Text style={[styles.muted, { color: t.textSecondary, marginTop: 0 }]}>Bu çat bağlıdır</Text>
                </View>
            )}
        </View>
    ) : (
        <View style={[styles.convPane, { justifyContent: 'center' }]}>
            <EmptyState icon={<MessageSquare size={28} color={t.textSecondary} />} title="Çat seçin" subtitle="Yazışmaya başlamaq üçün soldakı siyahıdan müştəri seçin." />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: t.bg }]}>
            {isMobile ? (selectedChat ? conversation : list) : (
                <>
                    {list}
                    {conversation}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'row' },
    listPane: { width: 320, borderRightWidth: StyleSheet.hairlineWidth },
    listHeader: { padding: 16, gap: 10 },
    paneTitle: { fontSize: 24, fontFamily: FONT.heavy, letterSpacing: -0.5, marginBottom: 2 },
    muted: { textAlign: 'center', marginTop: 24, fontSize: 14, fontFamily: FONT.medium },
    chatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, cursor: 'pointer' as any },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 14, fontFamily: FONT.bold },
    chatRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    chatName: { flex: 1, fontSize: 14, fontFamily: FONT.semibold },
    chatTime: { fontSize: 12, fontFamily: FONT.regular },
    chatStatus: { fontSize: 12, fontFamily: FONT.medium, marginTop: 2 },
    convPane: { flex: 1, minWidth: 0 },
    convHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    back: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
    backText: { fontSize: 15, fontFamily: FONT.medium },
    convTitle: { fontSize: 16, fontFamily: FONT.semibold },
    convSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 1 },
    messages: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
    bubbleWrap: { gap: 3 },
    bubble: { maxWidth: '72%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
    bubbleText: { fontSize: 15, lineHeight: 21, fontFamily: FONT.regular },
    bubbleTime: { fontSize: 11, fontFamily: FONT.medium, marginHorizontal: 6 },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
    input: { flex: 1, minHeight: 38, maxHeight: 120, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 9, paddingBottom: 9, fontSize: 15, fontFamily: FONT.regular },
    send: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    closed: { padding: 18, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
});
