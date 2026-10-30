import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import {
    AdminHeader, AdminScroll, Group, GroupRow, Segmented, EmptyView, LoadingView, useAdminColors, F,
} from '../../components/admin/AdminUI';

interface Chat {
    id: string;
    device_id: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
}

// Today → "14:05", earlier → "12.10, 14:05"
const stamp = (iso: string) => {
    const d = new Date(iso);
    const time = d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === new Date().toDateString()) return time;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}, ${time}`;
};

// Chat list in the app (the web panel uses chats.web.tsx)
export default function AdminChatsNative() {
    const router = useRouter();
    const c = useAdminColors();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'open' | 'closed'>('open');

    const loadChats = useCallback(async () => {
        const [{ data, error }, { data: msgRows }] = await Promise.all([
            supabase.from('chats').select('*').eq('status', filterStatus).order('updated_at', { ascending: false }),
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
        setLoading(false);
        setRefreshing(false);
    }, [filterStatus]);

    useEffect(() => {
        const first = setTimeout(loadChats, 0);
        const sub = supabase
            .channel('admin_chats_native')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadChats())
            .subscribe();
        return () => {
            clearTimeout(first);
            supabase.removeChannel(sub);
        };
    }, [loadChats]);

    return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
            <AdminHeader title="Canlı dəstək" subtitle="Müştəri yazışmaları" backLabel="Admin" />
            <View style={styles.controls}>
                <Segmented
                    options={[{ value: 'open', label: 'Açıq' }, { value: 'closed', label: 'Bağlı' }]}
                    value={filterStatus}
                    onChange={(v) => { setLoading(true); setFilterStatus(v); }}
                />
            </View>
            {loading ? <LoadingView /> : (
                <AdminScroll refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChats(); }} contentStyle={{ paddingTop: 4 }}>
                    {chats.length === 0 ? (
                        <EmptyView icon={MessageSquare} title={filterStatus === 'open' ? 'Açıq çat yoxdur' : 'Bağlı çat yoxdur'} />
                    ) : (
                        <Group>
                            {chats.map((chat) => (
                                <GroupRow
                                    key={chat.id}
                                    icon={() => <Text style={[styles.initials, { color: c.text }]}>{chat.device_id.slice(0, 2).toUpperCase()}</Text>}
                                    title={`Müştəri ${chat.device_id.substring(0, 8)}`}
                                    subtitle={`Son aktivlik ${stamp(chat.updated_at)}`}
                                    right={chat.status === 'open' ? <View style={[styles.dot, { backgroundColor: c.success }]} /> : undefined}
                                    onPress={() => router.push(`/admin/chat/${chat.id}`)}
                                />
                            ))}
                        </Group>
                    )}
                </AdminScroll>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    initials: { fontSize: 12, fontFamily: F.bold },
    dot: { width: 8, height: 8, borderRadius: 4 },
});
