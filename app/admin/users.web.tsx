import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users, UserPlus, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { Button, Badge, Segmented, EmptyState, Card, useWebTokens, FONT } from '../../components/web/WebKit';
import { AdminPage, Toolbar, SearchField, DataTable, CellText } from '../../components/web/AdminKit';

type Scope = 'admins' | 'all';

export default function AdminUsersWeb() {
    const router = useRouter();
    const t = useWebTokens();
    const { showToast } = useToast();
    const { isSuperAdmin, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [scope, setScope] = useState<Scope>('admins');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (authLoading || !isSuperAdmin) return;
        let cancelled = false;
        (async () => {
            try {
                let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
                if (scope === 'admins') query = query.eq('role', 'admin');
                const { data, error } = await query;
                if (error) throw error;
                if (!cancelled) setUsers(data || []);
            } catch (e: any) {
                showToast('İstifadəçilər yüklənərkən xəta: ' + e.message, 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [scope, isSuperAdmin, authLoading, showToast]);

    if (!authLoading && !isSuperAdmin) {
        return (
            <AdminPage title="Admin istifadəçilər">
                <Card>
                    <EmptyState icon={<Shield size={28} color={t.textSecondary} />} title="Giriş yoxdur" subtitle="Bu bölməyə yalnız superadminlər daxil ola bilər." />
                </Card>
            </AdminPage>
        );
    }

    const q = searchQuery.trim().toLowerCase();
    const filtered = q
        ? users.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
        : users;

    const roleBadge = (u: any) =>
        u.is_superadmin ? <Badge label="Superadmin" tone="blue" /> : u.role === 'admin' ? <Badge label="Admin" tone="accent" /> : <Badge label="İstifadəçi" />;

    return (
        <AdminPage
            title="Admin istifadəçilər"
            subtitle={`${users.length} ${scope === 'admins' ? 'admin' : 'istifadəçi'}`}
            actions={<Button size="sm" title="Yeni admin" icon={<UserPlus size={14} color="#FFF" />} onPress={() => router.push('/admin/add-user')} />}
        >
            <Toolbar>
                <Segmented<Scope>
                    options={[{ value: 'admins', label: 'Adminlər' }, { value: 'all', label: 'Hamısı' }]}
                    value={scope}
                    onChange={(v) => { setLoading(true); setScope(v); }}
                />
                <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Ad və ya email" />
            </Toolbar>

            <DataTable
                loading={loading}
                data={filtered}
                keyExtractor={(u) => u.id}
                onRowPress={(u) => router.push(`/admin/user-detail?id=${u.id}` as any)}
                emptyIcon={<Users size={28} color={t.textSecondary} />}
                emptyTitle="İstifadəçi tapılmadı"
                columns={[
                    {
                        key: 'user',
                        title: 'İstifadəçi',
                        flex: 2,
                        render: (u) => (
                            <View style={styles.userCell}>
                                <View style={[styles.avatar, { backgroundColor: t.fill }]}>
                                    <Text style={[styles.avatarText, { color: t.text }]}>
                                        {(u.full_name?.charAt(0) || u.email?.charAt(0) || 'U').toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <CellText title={u.full_name || 'Adsız istifadəçi'} subtitle={u.email} />
                                </View>
                            </View>
                        ),
                    },
                    { key: 'role', title: 'Rol', flex: 1, render: roleBadge },
                    { key: 'created', title: 'Qeydiyyat', flex: 1, align: 'right', hideOnMobile: true, render: (u) => <CellText title={u.created_at ? formatDate(u.created_at) : '—'} /> },
                    { key: 'go', title: '', width: 16, align: 'right', render: () => <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text> },
                ]}
            />
        </AdminPage>
    );
}

const styles = StyleSheet.create({
    userCell: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
    avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 15, fontFamily: FONT.bold },
    chevron: { fontSize: 22, fontFamily: FONT.medium },
});
