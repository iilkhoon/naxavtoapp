import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Car, Hash, CreditCard, ChevronLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
    Segmented, Button, Badge, Card, EmptyState, Loading, GroupCaption, Checkbox, useWebTokens, useBreakpoints, FONT, formatMoney,
} from '../../components/web/WebKit';
import { ADMIN_MODULES, AdminModule } from '../../constants/adminMenu';
import { accessLabel } from '../../components/admin/ModulePicker';
import { AdminPage, DataTable, CellText } from '../../components/web/AdminKit';

type TabType = 'listings' | 'plates' | 'loans';

const LOAN_STATUS: Record<string, { label: string; tone: 'blue' | 'success' | 'accent' | 'neutral' }> = {
    active: { label: 'Aktiv', tone: 'blue' },
    completed: { label: 'Bağlanıb', tone: 'success' },
    defaulted: { label: 'Defolt', tone: 'accent' },
    cancelled: { label: 'Ləğv', tone: 'neutral' },
};

export default function UserDetailWeb() {
    const { id } = useLocalSearchParams();
    const userId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const t = useWebTokens();
    const { isTablet } = useBreakpoints();
    const { showToast } = useToast();
    const { session, isSuperAdmin } = useAuth();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [listings, setListings] = useState<any[]>([]);
    const [plates, setPlates] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('listings');
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [modules, setModules] = useState<AdminModule[]>([]);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data: p, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
                if (error) throw error;
                // Listings created before accounts existed are matched by phone
                const owner = p.phone ? `user_id.eq.${userId},contact_phone.eq.${p.phone}` : `user_id.eq.${userId}`;
                const customer = p.phone ? `customer_user_id.eq.${userId},customer_phone.eq.${p.phone}` : `customer_user_id.eq.${userId}`;
                const [l, pl, lo] = await Promise.all([
                    supabase.from('listings').select('*').or(owner).order('created_at', { ascending: false }),
                    supabase.from('plates').select('*').or(owner).order('created_at', { ascending: false }),
                    supabase.from('loan_accounts').select('*').or(customer).order('created_at', { ascending: false }),
                ]);
                if (cancelled) return;
                setProfile(p);
                setModules(Array.isArray(p.modules) ? p.modules : ADMIN_MODULES.map((m) => m.key));
                setListings(l.data || []);
                setPlates(pl.data || []);
                setLoans(lo.data || []);
            } catch (e: any) {
                showToast('Məlumatlar yüklənmədi: ' + e.message, 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId, showToast]);

    const saveModules = async () => {
        if (modules.length === 0) {
            showToast('Ən azı bir bölmə seçin', 'error');
            return;
        }
        setActionLoading(true);
        const { error } = await supabase.rpc('admin_save_user', {
            p_user_id: userId, p_email: profile.email, p_full_name: profile.full_name || '', p_modules: modules,
        });
        setActionLoading(false);
        if (error) {
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        setProfile((prev: any) => ({ ...prev, modules }));
        showToast('İcazələr yadda saxlanıldı', 'success');
    };

    const revokeAdmin = async () => {
        setConfirmRevoke(false);
        setActionLoading(true);
        const { error } = await supabase.from('profiles').update({ role: 'user', is_superadmin: false, modules: null }).eq('id', userId);
        setActionLoading(false);
        if (error) {
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        showToast('Giriş bağlandı', 'success');
        router.back();
    };

    const back = (
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/users' as any))} style={styles.back}>
            <ChevronLeft size={18} color={t.accent} />
            <Text style={[styles.backText, { color: t.accent }]}>İstifadəçilər</Text>
        </TouchableOpacity>
    );

    if (loading) return <AdminPage title="İstifadəçi"><Loading /></AdminPage>;
    if (!profile) {
        return (
            <AdminPage title="İstifadəçi">
                {back}
                <Card><EmptyState title="İstifadəçi tapılmadı" /></Card>
            </AdminPage>
        );
    }

    const isSelf = profile.id === session?.user?.id;
    const isAdminProfile = profile.role === 'admin';
    const statusBadge = (s: string) => <Badge label={s === 'approved' ? 'Aktiv' : s === 'rejected' ? 'Rədd' : 'Gözləyir'} tone={s === 'approved' ? 'success' : s === 'rejected' ? 'accent' : 'warning'} />;

    return (
        <AdminPage title={profile.full_name || 'Adsız istifadəçi'} subtitle={profile.email}>
            {back}
            <View style={[styles.layout, isTablet && { flexDirection: 'column' }]}>
                <View style={[{ width: 320, gap: 20 }, isTablet && { width: '100%' }]}>
                    <Card padding={0} style={{ overflow: 'hidden' }}>
                        <View style={styles.profileHead}>
                            <View style={[styles.avatar, { backgroundColor: t.fill }]}>
                                <Text style={[styles.avatarText, { color: t.text }]}>{(profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'U').toUpperCase()}</Text>
                            </View>
                            {profile.is_superadmin || isAdminProfile ? <Badge label={accessLabel(profile)} tone={profile.is_superadmin ? 'blue' : 'accent'} /> : <Badge label="İstifadəçi" />}
                        </View>
                        {[
                            { l: 'Email', v: profile.email || '—' },
                            { l: 'Telefon', v: profile.phone || '—' },
                            { l: 'Qeydiyyat', v: profile.created_at ? formatDate(profile.created_at) : '—' },
                            { l: 'Elan / nömrə / kredit', v: `${listings.length} / ${plates.length} / ${loans.length}` },
                        ].map((r) => (
                            <View key={r.l} style={[styles.infoRow, { borderTopColor: t.hairline }]}>
                                <Text style={[styles.infoLabel, { color: t.textSecondary }]}>{r.l}</Text>
                                <Text selectable style={[styles.infoValue, { color: t.text }]} numberOfLines={1}>{r.v}</Text>
                            </View>
                        ))}
                    </Card>

                    {isSuperAdmin && isAdminProfile && !profile.is_superadmin && !isSelf && (
                        <View>
                            <GroupCaption>Açıq bölmələr</GroupCaption>
                            <Card style={{ gap: 14 }}>
                                {ADMIN_MODULES.map((m) => (
                                    <Checkbox
                                        key={m.key}
                                        checked={modules.includes(m.key)}
                                        onChange={(on) => setModules((prev) => (on ? [...prev, m.key] : prev.filter((x) => x !== m.key)))}
                                        label={m.title}
                                        description={m.desc}
                                    />
                                ))}
                            </Card>
                            <View style={{ gap: 8, marginTop: 12 }}>
                                <Button title="İcazələri yadda saxla" loading={actionLoading} onPress={saveModules} fullWidth />
                                <Button variant="destructive" title="Admin panelə girişi bağla" onPress={() => setConfirmRevoke(true)} disabled={actionLoading} fullWidth />
                            </View>
                        </View>
                    )}
                </View>

                <View style={{ flex: 1, minWidth: 0, width: isTablet ? '100%' : undefined }}>
                    <Segmented<TabType>
                        options={[
                            { value: 'listings', label: 'Avtomobillər', count: listings.length },
                            { value: 'plates', label: 'Nömrələr', count: plates.length },
                            // Loan tables are superadmin-only under RLS
                            ...(isSuperAdmin ? [{ value: 'loans' as TabType, label: 'Kreditlər', count: loans.length }] : []),
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                        style={{ marginBottom: 16 }}
                    />

                    {activeTab === 'listings' && (
                        <DataTable
                            data={listings}
                            keyExtractor={(i) => i.id}
                            onRowPress={(i) => router.push(`/listing/${i.short_id || i.id}` as any)}
                            emptyIcon={<Car size={28} color={t.textSecondary} />}
                            emptyTitle="Elan yoxdur"
                            columns={[
                                {
                                    key: 'car', title: 'Elan', flex: 2.4, render: (i) => (
                                        <View style={styles.itemCell}>
                                            {i.image_url
                                                ? <Image source={{ uri: (Array.isArray(i.images) && i.images[0]) || i.image_url }} accessibilityLabel={`${i.make} ${i.model}`} style={[styles.thumb, { backgroundColor: t.fill }]} />
                                                : <View style={[styles.thumb, { backgroundColor: t.fill }]} />}
                                            <View style={{ flex: 1, minWidth: 0 }}><CellText title={`${i.make} ${i.model}`} subtitle={i.year ? String(i.year) : undefined} /></View>
                                        </View>
                                    ),
                                },
                                { key: 'price', title: 'Qiymət', flex: 1, align: 'right', render: (i) => <CellText title={formatMoney(i.price, i.currency)} /> },
                                { key: 'status', title: 'Status', flex: 1, align: 'right', render: (i) => statusBadge(i.status) },
                            ]}
                        />
                    )}

                    {activeTab === 'plates' && (
                        <DataTable
                            data={plates}
                            keyExtractor={(i) => i.id}
                            onRowPress={(i) => router.push(`/plate/${i.short_id || i.id}` as any)}
                            emptyIcon={<Hash size={28} color={t.textSecondary} />}
                            emptyTitle="Nömrə yoxdur"
                            columns={[
                                { key: 'plate', title: 'Nömrə', flex: 2, render: (i) => <CellText title={`${i.region}-${i.series}-${i.number}`} subtitle={formatDate(i.created_at)} /> },
                                { key: 'price', title: 'Qiymət', flex: 1, align: 'right', render: (i) => <CellText title={formatMoney(i.price)} /> },
                                { key: 'status', title: 'Status', flex: 1, align: 'right', render: (i) => statusBadge(i.status) },
                            ]}
                        />
                    )}

                    {isSuperAdmin && activeTab === 'loans' && (
                        <DataTable
                            data={loans}
                            keyExtractor={(i) => i.id}
                            onRowPress={(i) => router.push(`/admin/loan-detail?id=${i.id}` as any)}
                            emptyIcon={<CreditCard size={28} color={t.textSecondary} />}
                            emptyTitle="Kredit yoxdur"
                            columns={[
                                { key: 'car', title: 'Avtomobil', flex: 2, render: (l) => <CellText title={`${l.car_brand} ${l.car_model}`} subtitle={[l.car_year, l.car_plate].filter(Boolean).join(' · ')} /> },
                                { key: 'amount', title: 'Kredit', flex: 1, align: 'right', render: (l) => <CellText title={formatMoney(l.loan_amount)} subtitle={`${l.duration_months} ay`} /> },
                                { key: 'monthly', title: 'Aylıq', flex: 1, align: 'right', render: (l) => <CellText title={formatMoney(l.monthly_payment)} /> },
                                { key: 'status', title: 'Status', flex: 1, align: 'right', render: (l) => <Badge label={LOAN_STATUS[l.status]?.label || l.status} tone={LOAN_STATUS[l.status]?.tone || 'neutral'} /> },
                            ]}
                        />
                    )}
                </View>
            </View>

            <ConfirmModal
                visible={confirmRevoke}
                title="Girişi bağlamaq?"
                message="İstifadəçi adi istifadəçiyə çevriləcək və admin panelə daxil ola bilməyəcək."
                onConfirm={revokeAdmin}
                onCancel={() => setConfirmRevoke(false)}
                confirmText="Bağla"
                cancelText="İmtina"
                isDestructive
            />
        </AdminPage>
    );
}

const styles = StyleSheet.create({
    back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: -12, marginBottom: 20, marginLeft: -4, cursor: 'pointer' as any },
    backText: { fontSize: 15, fontFamily: FONT.medium },
    layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
    profileHead: { alignItems: 'center', gap: 10, paddingVertical: 22 },
    avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 28, fontFamily: FONT.heavy },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth },
    infoLabel: { fontSize: 14, fontFamily: FONT.regular },
    infoValue: { fontSize: 14, fontFamily: FONT.semibold, flexShrink: 1, textAlign: 'right' },
    itemCell: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
    thumb: { width: 52, height: 39, borderRadius: 7 },
});
