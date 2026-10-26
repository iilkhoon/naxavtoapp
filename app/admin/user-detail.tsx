import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, Car, Hash, CreditCard, Phone, Calendar, Mail } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import { haptics } from '../../utils/haptics';
import {
    AdminHeader, AdminScroll, Group, GroupRow, Pill, EmptyView, LoadingView, useAdminColors, F,
} from '../../components/admin/AdminUI';

export default function UserDetailMobile() {
    const { id } = useLocalSearchParams();
    const userId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const c = useAdminColors();
    const { showToast } = useToast();
    const { isSuperAdmin, session, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ listings: 0, plates: 0, loans: 0 });

    useEffect(() => {
        if (authLoading) return;
        if (!isSuperAdmin) {
            showToast('Bu bölməyə yalnız superadminlər daxil ola bilər', 'error');
            router.back();
            return;
        }
        if (!userId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
                if (error) throw error;
                const owner = p.phone ? `user_id.eq.${userId},contact_phone.eq.${p.phone}` : `user_id.eq.${userId}`;
                const customer = p.phone ? `customer_user_id.eq.${userId},customer_phone.eq.${p.phone}` : `customer_user_id.eq.${userId}`;
                const head = { count: 'exact' as const, head: true };
                const [l, pl, lo] = await Promise.all([
                    supabase.from('listings').select('id', head).or(owner),
                    supabase.from('plates').select('id', head).or(owner),
                    supabase.from('loan_accounts').select('id', head).or(customer),
                ]);
                if (cancelled) return;
                setProfile(p);
                setStats({ listings: l.count || 0, plates: pl.count || 0, loans: lo.count || 0 });
            } catch (e: any) {
                showToast('Xəta: ' + e.message, 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId, isSuperAdmin, authLoading, router, showToast]);

    const toggleSuperAdmin = async () => {
        setActionLoading(true);
        const next = !profile.is_superadmin;
        const { error } = await supabase.from('profiles').update({ is_superadmin: next }).eq('id', userId);
        setActionLoading(false);
        if (error) {
            haptics.error();
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        haptics.success();
        setProfile((prev: any) => ({ ...prev, is_superadmin: next }));
        showToast(next ? 'Superadmin statusu verildi' : 'Superadmin statusu götürüldü', 'success');
    };

    const revokeAdmin = async () => {
        setConfirmRevoke(false);
        setActionLoading(true);
        const { error } = await supabase.from('profiles').update({ role: 'user', is_superadmin: false }).eq('id', userId);
        setActionLoading(false);
        if (error) {
            haptics.error();
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        haptics.success();
        showToast('Admin icazəsi ləğv edildi', 'success');
        router.back();
    };

    if (authLoading || loading) {
        return (
            <View style={{ flex: 1, backgroundColor: c.background }}>
                <AdminHeader title="İstifadəçi" backLabel="Adminlər" />
                <LoadingView />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={{ flex: 1, backgroundColor: c.background }}>
                <AdminHeader title="İstifadəçi" backLabel="Adminlər" />
                <EmptyView title="İstifadəçi tapılmadı" />
            </View>
        );
    }

    const isSelf = profile.id === session?.user?.id;

    return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
            <AdminHeader title={profile.full_name || 'Adsız istifadəçi'} backLabel="Adminlər" />
            <AdminScroll>
                <View style={styles.identity}>
                    <View style={[styles.avatar, { backgroundColor: c.fill }]}>
                        <Text style={[styles.avatarText, { color: c.text }]}>{(profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U').toUpperCase()}</Text>
                    </View>
                    {profile.is_superadmin ? <Pill label="Superadmin" tone="blue" /> : <Pill label="Admin" tone="accent" />}
                </View>

                <Group title="Əlaqə">
                    <GroupRow icon={Mail} tint="#007AFF" title="Email" value={profile.email || '—'} />
                    <GroupRow icon={Phone} tint="#34C759" title="Telefon" value={profile.phone || '—'} />
                    <GroupRow icon={Calendar} tint="#8E8E93" title="Qeydiyyat" value={profile.created_at ? formatDate(profile.created_at) : '—'} />
                </Group>

                <Group title="Fəaliyyət">
                    <GroupRow icon={Car} tint="#FF9500" title="Elanlar" value={String(stats.listings)} />
                    <GroupRow icon={Hash} tint="#5856D6" title="Nömrələr" value={String(stats.plates)} />
                    <GroupRow icon={CreditCard} tint="#00C7BE" title="Kreditlər" value={String(stats.loans)} />
                </Group>

                {!isSelf && (
                    <Group title="İdarəetmə" footer="Superadmin kredit panelini və admin istifadəçiləri idarə edə bilir.">
                        <GroupRow
                            icon={Shield}
                            tint="#5856D6"
                            title={profile.is_superadmin ? 'Superadmin statusunu götür' : 'Superadmin et'}
                            onPress={actionLoading ? undefined : toggleSuperAdmin}
                            chevron={false}
                        />
                        <GroupRow
                            title="Admin icazəsini ləğv et"
                            destructive
                            chevron={false}
                            onPress={actionLoading ? undefined : () => setConfirmRevoke(true)}
                        />
                    </Group>
                )}
            </AdminScroll>

            <ConfirmModal
                visible={confirmRevoke}
                title="Admin icazəsini ləğv etmək?"
                message="İstifadəçi adi istifadəçiyə çevriləcək və admin panelə daxil ola bilməyəcək."
                onConfirm={revokeAdmin}
                onCancel={() => setConfirmRevoke(false)}
                confirmText="Ləğv et"
                cancelText="İmtina"
                isDestructive
            />
        </View>
    );
}

const styles = StyleSheet.create({
    identity: { alignItems: 'center', gap: 10, marginBottom: 24 },
    avatar: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 30, fontFamily: F.heavy },
});
