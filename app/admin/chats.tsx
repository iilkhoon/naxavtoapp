import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';
// If it's web, it will use chats.web.tsx, so this is strictly Native
import { MessageSquare, ChevronRight, ArrowLeft, RefreshCw } from 'lucide-react-native';

interface Chat {
    id: string;
    device_id: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
}

export default function AdminChatsNative() {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'open' | 'closed'>('open');

    useEffect(() => {
        loadChats();

        const sub = supabase
            .channel('admin_chats_native')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
                loadChats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, [filterStatus]);

    const loadChats = async () => {
        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('status', filterStatus)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setChats(data || []);
        } catch (error) {
            console.error('Error loading chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Chat }) => (
        <TouchableOpacity
            style={[styles.chatItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            onPress={() => router.push(`/admin/chat/${item.id}`)}
        >
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={[styles.deviceId, { color: colors.text }]} numberOfLines={1}>
                        Müştəri: {item.device_id.substring(0, 8)}...
                    </Text>
                    <View style={[styles.statusDot, { backgroundColor: item.status === 'open' ? '#34C759' : '#FF3B30' }]} />
                </View>
                <Text style={[styles.lastActive, { color: colors.textSecondary }]}>
                    Son aktivlik: {new Date(item.updated_at).toLocaleString()}
                </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Canlı Çatlar</Text>
                <TouchableOpacity onPress={loadChats}>
                    <RefreshCw size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterBtn, filterStatus === 'open' ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => setFilterStatus('open')}
                >
                    <Text style={[styles.filterText, { color: filterStatus === 'open' ? '#FFF' : colors.text }]}>Açıq</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filterStatus === 'closed' ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => setFilterStatus('closed')}
                >
                    <Text style={[styles.filterText, { color: filterStatus === 'closed' ? '#FFF' : colors.text }]}>Bağlı</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <MessageSquare size={48} color={colors.border} style={{ marginBottom: 16 }} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Hazırda bu statusda çat yoxdur.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'android' ? 10 : 20,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
    },
    filterRow: {
        flexDirection: 'row',
        padding: 16,
        gap: 10,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    list: {
        paddingBottom: 40,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    deviceId: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
        marginRight: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    lastActive: {
        fontSize: 13,
        fontFamily: 'RethinkSans_400Regular',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_500Medium',
    },
});
