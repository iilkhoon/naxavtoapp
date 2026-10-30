import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { accessLabel } from '../../components/admin/ModulePicker';
import {
    AdminHeader, AdminScroll, Group, GroupRow, HeaderAction, SearchBar, Pill, EmptyView, LoadingView, useAdminColors, F,
} from '../../components/admin/AdminUI';

export default function AdminUsers() {
    const router = useRouter();
    const c = useAdminColors();
    const { showToast } = useToast();
    const { isSuperAdmin, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = useCallback(async () => {
        const { data, error } = await supabase.from('profiles').select('*').or('role.eq.admin,is_superadmin.eq.true').order('created_at', { ascending: false });
        if (error) showToast('İstifadəçilər yüklənmədi: ' + error.message, 'error');
        else setUsers(data || []);
        setLoading(false);
        setRefreshing(false);
    }, [showToast]);

    useEffect(() => {
        if (authLoading) return;
        if (!isSuperAdmin) {
            showToast('Bu bölməyə yalnız superadminlər daxil ola bilər', 'error');
            router.back();
            return;
        }
        const timer = setTimeout(fetchUsers, 0);
        return () => clearTimeout(timer);
    }, [isSuperAdmin, authLoading, fetchUsers, router, showToast]);

    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? users.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : users;

    return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
            <AdminHeader
                title="İstifadəçilər"
                subtitle={loading ? undefined : `${users.length} istifadəçi`}
                backLabel="Admin"
                right={<HeaderAction icon={UserPlus} label="Yeni istifadəçi" onPress={() => router.push('/admin/add-user')} />}
            />
            {loading ? <LoadingView /> : (
                <AdminScroll refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }}>
                    <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Ad və ya email" style={{ marginBottom: 16 }} />
                    {filtered.length === 0 ? (
                        <EmptyView icon={Users} title="İstifadəçi tapılmadı" subtitle={q ? 'Axtarışı dəyişin.' : 'Yeni istifadəçi əlavə etmək üçün yuxarıdakı düyməyə toxunun.'} />
                    ) : (
                        <Group>
                            {filtered.map((u) => (
                                <GroupRow
                                    key={u.id}
                                    icon={() => (
                                        <Text style={[styles.initial, { color: c.text }]}>{(u.full_name?.charAt(0) || u.email?.charAt(0) || 'U').toUpperCase()}</Text>
                                    )}
                                    title={u.full_name || 'Adsız istifadəçi'}
                                    subtitle={u.email}
                                    right={<Pill label={accessLabel(u)} tone={u.is_superadmin ? 'blue' : 'accent'} />}
                                    onPress={() => router.push(`/admin/user-detail?id=${u.id}` as any)}
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
    initial: { fontSize: 14, fontFamily: F.bold },
});
