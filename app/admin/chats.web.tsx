import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { Search, Send, CheckCircle2, Circle } from 'lucide-react-native';

interface Chat {
    id: string;
    device_id: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    last_message?: string;
}

interface Message {
    id: string;
    chat_id: string;
    sender_type: 'user' | 'admin';
    content: string;
    created_at: string;
}

export default function AdminChatsWeb() {
    const { colors, isDark } = useTheme();

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'open' | 'closed' | 'all'>('open');

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadChats();

        // Subscribe to overall chat updates
        const chatSub = supabase
            .channel('admin_chats')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'chats' },
                () => {
                    loadChats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(chatSub);
        };
    }, [filterStatus]);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.id);

            const msgSub = supabase
                .channel(`admin_messages_${selectedChat.id}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChat.id}` },
                    (payload) => {
                        const newMsg = payload.new as Message;
                        setMessages((prev) => {
                            if (prev.find((m) => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                        setTimeout(() => {
                            flatListRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                        // Reload chats to update timestamps
                        loadChats();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(msgSub);
            };
        } else {
            setMessages([]);
        }
    }, [selectedChat]);

    const loadChats = async () => {
        try {
            let query = supabase
                .from('chats')
                .select('*')
                .order('updated_at', { ascending: false });

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;
            if (error) throw error;
            setChats(data || []);
        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            setLoadingChats(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        setLoadingMessages(true);
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 500);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async () => {
        const text = inputText.trim();
        if (!text || !selectedChat) return;

        setInputText('');

        const tempId = 'temp-' + Date.now();
        const tempMsg: Message = {
            id: tempId,
            chat_id: selectedChat.id,
            sender_type: 'admin',
            content: text,
            created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, tempMsg]);
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
            const { error } = await supabase.from('messages').insert([
                {
                    chat_id: selectedChat.id,
                    sender_type: 'admin',
                    content: text,
                },
            ]);
            if (error) {
                // Revert on error
                setMessages(prev => prev.filter(m => m.id !== tempId));
                console.error('Error inserting msg:', error);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const toggleChatStatus = async (chat: Chat) => {
        const newStatus = chat.status === 'open' ? 'closed' : 'open';
        try {
            const { error } = await supabase
                .from('chats')
                .update({ status: newStatus })
                .eq('id', chat.id);

            if (error) throw error;
            if (selectedChat?.id === chat.id) {
                setSelectedChat({ ...chat, status: newStatus });
            }
            loadChats();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const filteredChats = chats.filter(chat =>
        chat.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMessage = ({ item }: { item: Message }) => {
        const isAdmin = item.sender_type === 'admin';

        return (
            <View style={[
                styles.messageBubble,
                isAdmin ? styles.adminBubble : styles.userBubble,
                {
                    backgroundColor: isAdmin ? colors.primary : colors.card,
                    borderColor: isAdmin ? 'transparent' : colors.border,
                    borderWidth: isAdmin ? 0 : 1,
                }
            ]}>
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
            <View style={styles.header}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>Canlı Dəstək (Live Chat)</Text>
            </View>

            <View style={styles.contentLayout}>
                {/* Sidebar: Chat List */}
                <View style={[styles.chatSidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
                    <View style={styles.sidebarHeader}>
                        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <Search size={18} color={colors.textSecondary} />
                            <TextInput
                                placeholder="İstifadəçi axtar..."
                                placeholderTextColor={colors.placeholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={[styles.searchInput, { color: colors.text }, { outline: 'none' } as any]}
                            />
                        </View>
                        <View style={styles.filterRow}>
                            <TouchableOpacity
                                style={[styles.filterBtn, filterStatus === 'open' && { backgroundColor: colors.primary }]}
                                onPress={() => setFilterStatus('open')}
                            >
                                <Text style={[styles.filterText, { color: filterStatus === 'open' ? '#FFF' : colors.textSecondary }]}>Açıq</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterBtn, filterStatus === 'closed' && { backgroundColor: '#FF3B30' }]}
                                onPress={() => setFilterStatus('closed')}
                            >
                                <Text style={[styles.filterText, { color: filterStatus === 'closed' ? '#FFF' : colors.textSecondary }]}>Bağlı</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterBtn, filterStatus === 'all' && { backgroundColor: colors.textSecondary }]}
                                onPress={() => setFilterStatus('all')}
                            >
                                <Text style={[styles.filterText, { color: filterStatus === 'all' ? '#FFF' : colors.textSecondary }]}>Hamısı</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loadingChats ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <ScrollView style={styles.chatList}>
                            {filteredChats.map(chat => (
                                <TouchableOpacity
                                    key={chat.id}
                                    style={[
                                        styles.chatListItem,
                                        selectedChat?.id === chat.id && { backgroundColor: isDark ? '#333' : '#F2F2F7' },
                                        { borderBottomColor: colors.border }
                                    ]}
                                    onPress={() => setSelectedChat(chat)}
                                >
                                    <View style={styles.chatListRow}>
                                        <Text style={[styles.chatDeviceId, { color: colors.text }]} numberOfLines={1}>
                                            Müştəri: {chat.device_id.substring(0, 8)}...
                                        </Text>
                                        <View style={[styles.statusIndicator, { backgroundColor: chat.status === 'open' ? '#34C759' : '#FF3B30' }]} />
                                    </View>
                                    <Text style={[styles.chatTime, { color: colors.textSecondary }]}>
                                        Son aktivlik: {new Date(chat.updated_at).toLocaleTimeString()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            {filteredChats.length === 0 && (
                                <Text style={[styles.noChatsText, { color: colors.textSecondary }]}>Çat tapılmadı.</Text>
                            )}
                        </ScrollView>
                    )}
                </View>

                {/* Main: Chat View */}
                <View style={styles.chatView}>
                    {selectedChat ? (
                        <>
                            <View style={[styles.chatViewHeader, { borderBottomColor: colors.border }]}>
                                <View>
                                    <Text style={[styles.chatViewTitle, { color: colors.text }]}>Müştəri: {selectedChat.device_id}</Text>
                                    <Text style={[styles.chatViewSubtitle, { color: colors.textSecondary }]}>
                                        Başlama: {new Date(selectedChat.created_at).toLocaleString()}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.statusToggleBtn, { backgroundColor: selectedChat.status === 'open' ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)' }]}
                                    onPress={() => toggleChatStatus(selectedChat)}
                                >
                                    {selectedChat.status === 'open' ? (
                                        <Text style={{ color: '#FF3B30', fontFamily: 'RethinkSans_600SemiBold', fontSize: 13 }}>Çatı Bağla</Text>
                                    ) : (
                                        <Text style={{ color: '#34C759', fontFamily: 'RethinkSans_600SemiBold', fontSize: 13 }}>Çatı Aç</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {loadingMessages ? (
                                <View style={styles.loadingMessagesContainer}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                </View>
                            ) : (
                                <FlatList
                                    ref={flatListRef}
                                    data={messages}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderMessage}
                                    contentContainerStyle={styles.messagesList}
                                    showsVerticalScrollIndicator={false}
                                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                                    ListEmptyComponent={
                                        <Text style={[styles.noMessagesText, { color: colors.textSecondary }]}>Hələ mesaj yoxdur.</Text>
                                    }
                                />
                            )}

                            {selectedChat.status === 'open' ? (
                                <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                                    <TextInput
                                        placeholder="Mesajınızı yazın..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={inputText}
                                        onChangeText={setInputText}
                                        multiline
                                        style={[styles.input, { color: colors.text, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }, { outline: 'none' } as any]}
                                        onSubmitEditing={handleSendMessage} // Allows enter key on web
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.sendButton,
                                            { backgroundColor: inputText.trim() ? colors.primary : colors.border },
                                        ]}
                                        onPress={handleSendMessage}
                                        disabled={!inputText.trim()}
                                    >
                                        <Send size={20} color={inputText.trim() ? '#FFF' : colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={[styles.closedMessage, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                                    <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_500Medium' }}>Bu çat hazırda bağlıdır.</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.noSelectionContainer}>
                            <MessageSquare size={64} color={colors.border} />
                            <Text style={[styles.noSelectionText, { color: colors.textSecondary }]}>Söhbətə başlamaq üçün soldan bir çat seçin.</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

// Ensure MessageSquare is imported for the empty state
import { MessageSquare } from 'lucide-react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },
    header: {
        marginBottom: 20,
    },
    pageTitle: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    contentLayout: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: 16,
        overflow: 'hidden',
    },
    chatSidebar: {
        width: 300,
        borderRightWidth: 1,
        flexDirection: 'column',
    },
    sidebarHeader: {
        padding: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'RethinkSans_400Regular',
        fontSize: 14,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(150,150,150,0.1)',
        alignItems: 'center',
    },
    filterText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    chatList: {
        flex: 1,
    },
    chatListItem: {
        padding: 16,
        borderBottomWidth: 1,
    },
    chatListRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatDeviceId: {
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
        flex: 1,
        marginRight: 8,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chatTime: {
        fontSize: 12,
        fontFamily: 'RethinkSans_400Regular',
    },
    noChatsText: {
        textAlign: 'center',
        marginTop: 20,
        fontFamily: 'RethinkSans_500Medium',
    },
    chatView: {
        flex: 1,
        flexDirection: 'column',
    },
    noSelectionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noSelectionText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: 'RethinkSans_500Medium',
    },
    chatViewHeader: {
        padding: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatViewTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 4,
    },
    chatViewSubtitle: {
        fontSize: 12,
        fontFamily: 'RethinkSans_400Regular',
    },
    statusToggleBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    loadingMessagesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messagesList: {
        padding: 24,
    },
    noMessagesText: {
        textAlign: 'center',
        marginTop: 40,
        fontFamily: 'RethinkSans_500Medium',
    },
    messageBubble: {
        maxWidth: '70%',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
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
        lineHeight: 22,
    },
    timeText: {
        fontSize: 11,
        fontFamily: 'RethinkSans_500Medium',
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    inputContainer: {
        padding: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        minHeight: 48,
        maxHeight: 120,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12, // Needs both top/bottom for multiline
        paddingBottom: 12,
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    closedMessage: {
        padding: 24,
        borderTopWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
