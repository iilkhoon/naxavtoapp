import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { FileText, Copy, Phone, CheckCircle2, XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import { haptics } from '../../utils/haptics';
import {
    AdminHeader, AdminScroll, Group, GroupRow, Segmented, SearchBar, Pill, AdminButton, EmptyView, LoadingView, useAdminColors, money, F,
} from '../../components/admin/AdminUI';

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS: Record<string, { label: string; tone: 'warning' | 'success' | 'accent' }> = {
    pending: { label: 'Gözləyir', tone: 'warning' },
    approved: { label: 'Təsdiqlənib', tone: 'success' },
    rejected: { label: 'Rədd edilib', tone: 'accent' },
};
const statusOf = (app: any) => STATUS[app.status || 'pending'] || STATUS.pending;

const loadApplications = () =>
    supabase
        .from('credit_applications')
        .select('*, listings ( id, short_id, make, model, year, price, currency, image_url, images )')
        .order('created_at', { ascending: false });

export default function AdminApplications() {
    const router = useRouter();
    const c = useAdminColors();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [updating, setUpdating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const fetchApplications = useCallback(async () => {
        const { data, error } = await loadApplications();
        if (error) showToast('Müraciətlər yüklənmədi: ' + error.message, 'error');
        else setApplications(data || []);
        setLoading(false);
        setRefreshing(false);
    }, [showToast]);

    useEffect(() => {
        const first = setTimeout(fetchApplications, 0);
        // New applications arrive live
        const channel = supabase
            .channel('admin_credit_applications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_applications' }, () => fetchApplications())
            .subscribe();
        return () => {
            clearTimeout(first);
            supabase.removeChannel(channel);
        };
    }, [fetchApplications]);

    const updateStatus = async (appId: string, status: 'approved' | 'rejected') => {
        setUpdating(true);
        const { error } = await supabase.from('credit_applications').update({ status }).eq('id', appId);
        setUpdating(false);
        if (error) {
            haptics.error();
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        haptics.success();
        showToast(status === 'approved' ? 'Müraciət təsdiqləndi' : 'Müraciət rədd edildi', 'success');
        setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
        setSelectedApp((prev: any) => (prev?.id === appId ? { ...prev, status } : prev));
    };

    const deleteApplication = async () => {
        if (!selectedApp) return;
        const id = selectedApp.id;
        setConfirmDelete(false);
        const { error } = await supabase.from('credit_applications').delete().eq('id', id);
        if (error) {
            haptics.error();
            showToast('Silinmədi: ' + error.message, 'error');
            return;
        }
        haptics.success();
        showToast('Müraciət silindi', 'success');
        setApplications((prev) => prev.filter((a) => a.id !== id));
        setSelectedApp(null);
    };

    const copy = async (text: string, label: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        haptics.success();
        showToast(`${label} kopyalandı`, 'success');
    };

    const counts = {
        pending: applications.filter((a) => (a.status || 'pending') === 'pending').length,
        approved: applications.filter((a) => a.status === 'approved').length,
        rejected: applications.filter((a) => a.status === 'rejected').length,
        all: applications.length,
    };

    const q = searchQuery.trim().toLowerCase();
    const filtered = applications.filter((app) => {
        if (statusFilter !== 'all' && (app.status || 'pending') !== statusFilter) return false;
        if (!q) return true;
        return [app.full_name, app.father_name, app.fin_code, app.phone, app.workplace, app.listings?.make, app.listings?.model]
            .some((v) => v && String(v).toLowerCase().includes(q));
    });

    const carName = (app: any) => (app.listings ? `${app.listings.make} ${app.listings.model}` : 'Ümumi kredit');
    const cover = (app: any) => (Array.isArray(app.listings?.images) && app.listings.images[0]) || app.listings?.image_url;

    return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
            <AdminHeader title="Kredit müraciətləri" subtitle={loading ? undefined : `${counts.pending} gözləyir`} backLabel="Admin" />
            <View style={styles.controls}>
                <Segmented<FilterStatus>
                    options={[
                        { value: 'pending', label: 'Gözləyir', count: counts.pending },
                        { value: 'approved', label: 'Təsdiq', count: counts.approved },
                        { value: 'rejected', label: 'Rədd', count: counts.rejected },
                        { value: 'all', label: 'Hamısı' },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Ad, FİN, telefon, avtomobil" />
            </View>

            {loading ? <LoadingView /> : (
                <AdminScroll refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchApplications(); }} contentStyle={{ paddingTop: 4, gap: 10 }}>
                    {filtered.length === 0 ? (
                        <EmptyView icon={FileText} title="Müraciət yoxdur" subtitle={q ? 'Axtarışı dəyişin.' : undefined} />
                    ) : filtered.map((app) => (
                        <TouchableOpacity
                            key={app.id}
                            activeOpacity={0.7}
                            onPress={() => { haptics.tap(); setSelectedApp(app); }}
                            style={[styles.card, { backgroundColor: c.card, borderColor: c.hairline }]}
                        >
                            <View style={[styles.thumb, { backgroundColor: c.fill }]}>
                                {!!cover(app) && <ExpoImage source={{ uri: cover(app) }} style={StyleSheet.absoluteFill} contentFit="cover" />}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <View style={styles.cardTop}>
                                    <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{app.full_name || '—'}</Text>
                                    <Pill label={statusOf(app).label} tone={statusOf(app).tone} />
                                </View>
                                <Text style={[styles.sub, { color: c.textSecondary }]} numberOfLines={1}>
                                    {carName(app)}{app.listings ? ` · ${money(app.listings.price, app.listings.currency)}` : ''}
                                </Text>
                                <Text style={[styles.sub, { color: c.textSecondary }]} numberOfLines={1}>
                                    {[app.phone, formatDate(app.created_at, { showMonthName: true })].filter(Boolean).join(' · ')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </AdminScroll>
            )}

            {/* Application detail sheet */}
            <Modal
                visible={!!selectedApp}
                animationType="slide"
                presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
                onRequestClose={() => setSelectedApp(null)}
            >
                {selectedApp && (
                    <View style={{ flex: 1, backgroundColor: c.background }}>
                        <AdminHeader
                            title={selectedApp.full_name || 'Müraciət'}
                            subtitle={formatDate(selectedApp.created_at, { showMonthName: true })}
                            backLabel="Bağla"
                            onBack={() => setSelectedApp(null)}
                            modal
                            right={<Pill label={statusOf(selectedApp).label} tone={statusOf(selectedApp).tone} />}
                        />
                        <AdminScroll>
                            <Group title="Avtomobil">
                                {selectedApp.listings ? (
                                    <GroupRow
                                        title={`${carName(selectedApp)}${selectedApp.listings.year ? `, ${selectedApp.listings.year}` : ''}`}
                                        subtitle={money(selectedApp.listings.price, selectedApp.listings.currency)}
                                        onPress={() => {
                                            setSelectedApp(null);
                                            router.push(`/listing/${selectedApp.listings.short_id || selectedApp.listings.id}` as any);
                                        }}
                                    />
                                ) : (
                                    <GroupRow title="Elan seçilməyib və ya silinib" />
                                )}
                            </Group>

                            <Group title="Müştəri">
                                <GroupRow title="Ad, soyad" value={selectedApp.full_name || '—'} />
                                <GroupRow title="Ata adı" value={selectedApp.father_name || '—'} />
                                <GroupRow
                                    title="FİN kod"
                                    value={selectedApp.fin_code || '—'}
                                    right={selectedApp.fin_code ? <Copy size={15} color={c.primary} /> : undefined}
                                    chevron={false}
                                    onPress={selectedApp.fin_code ? () => copy(selectedApp.fin_code, 'FİN kod') : undefined}
                                />
                                <GroupRow title="Doğum tarixi" value={selectedApp.birth_date ? formatDate(selectedApp.birth_date) : '—'} />
                                <GroupRow title="İş yeri" value={selectedApp.workplace || '—'} />
                                <GroupRow title="Aylıq gəlir" value={money(selectedApp.monthly_income)} />
                                <GroupRow
                                    title="Telefon"
                                    value={selectedApp.phone || '—'}
                                    right={selectedApp.phone ? <Phone size={15} color={c.primary} /> : undefined}
                                    chevron={false}
                                    onPress={selectedApp.phone ? () => Linking.openURL(`tel:${String(selectedApp.phone).replace(/\s/g, '')}`) : undefined}
                                />
                            </Group>

                            <View style={styles.actions}>
                                <AdminButton
                                    title="Rədd et"
                                    variant="secondary"
                                    icon={<XCircle size={17} color={c.text} />}
                                    disabled={updating || selectedApp.status === 'rejected'}
                                    onPress={() => updateStatus(selectedApp.id, 'rejected')}
                                    style={{ flex: 1 }}
                                />
                                <AdminButton
                                    title="Təsdiqlə"
                                    icon={<CheckCircle2 size={17} color="#FFF" />}
                                    disabled={updating || selectedApp.status === 'approved'}
                                    onPress={() => updateStatus(selectedApp.id, 'approved')}
                                    style={{ flex: 1 }}
                                />
                            </View>
                            <AdminButton title="Müraciəti sil" variant="destructive" onPress={() => setConfirmDelete(true)} />
                        </AdminScroll>

                        <ConfirmModal
                            visible={confirmDelete}
                            title="Müraciəti silmək?"
                            message="Müraciət birdəfəlik silinəcək."
                            onConfirm={deleteApplication}
                            onCancel={() => setConfirmDelete(false)}
                            confirmText="Sil"
                            cancelText="Ləğv et"
                            isDestructive
                        />
                    </View>
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
    thumb: { width: 64, height: 48, borderRadius: 9, overflow: 'hidden' },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
    name: { fontSize: 16, fontFamily: F.semibold, flexShrink: 1 },
    sub: { fontSize: 13, fontFamily: F.medium, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
});
