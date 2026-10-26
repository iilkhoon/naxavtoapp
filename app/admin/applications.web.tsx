import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { FileText, CheckCircle2, XCircle, Trash2, Copy, X, RefreshCw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
    Segmented, Button, Badge, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney,
} from '../../components/web/WebKit';
import { AdminPage, Toolbar, SearchField, DataTable, CellText } from '../../components/web/AdminKit';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS: Record<string, { label: string; tone: 'warning' | 'success' | 'accent' }> = {
    pending: { label: 'Gözləyir', tone: 'warning' },
    approved: { label: 'Təsdiqlənib', tone: 'success' },
    rejected: { label: 'Rədd edilib', tone: 'accent' },
};
const statusOf = (app: any) => STATUS[app.status || 'pending'] || STATUS.pending;

const loadApplications = () =>
    supabase
        .from('credit_applications')
        .select('*, listings ( id, short_id, make, model, year, price, currency, image_url )')
        .order('created_at', { ascending: false });

export default function AdminApplicationsWeb() {
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
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
    }, [showToast]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error } = await loadApplications();
            if (cancelled) return;
            if (error) showToast('Müraciətlər yüklənmədi: ' + error.message, 'error');
            else setApplications(data || []);
            setLoading(false);
        })();
        const channel = supabase
            .channel('admin_web_credit_applications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_applications' }, () => fetchApplications())
            .subscribe();
        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [fetchApplications, showToast]);

    const updateStatus = async (appId: string, status: 'approved' | 'rejected') => {
        setUpdating(true);
        const { error } = await supabase.from('credit_applications').update({ status }).eq('id', appId);
        setUpdating(false);
        if (error) {
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
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
            showToast('Silinmədi: ' + error.message, 'error');
            return;
        }
        showToast('Müraciət silindi', 'success');
        setApplications((prev) => prev.filter((a) => a.id !== id));
        setSelectedApp(null);
    };

    const copy = async (text: string, label: string) => {
        await Clipboard.setStringAsync(text);
        showToast(`${label} kopyalandı`, 'success');
    };

    const counts = {
        all: applications.length,
        pending: applications.filter((a) => (a.status || 'pending') === 'pending').length,
        approved: applications.filter((a) => a.status === 'approved').length,
        rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    const q = searchQuery.trim().toLowerCase();
    const filtered = applications.filter((app) => {
        if (statusFilter !== 'all' && (app.status || 'pending') !== statusFilter) return false;
        if (!q) return true;
        return [app.full_name, app.father_name, app.fin_code, app.phone, app.workplace, app.listings?.make, app.listings?.model]
            .some((v) => v && String(v).toLowerCase().includes(q));
    });

    const carName = (app: any) => (app.listings ? `${app.listings.make} ${app.listings.model}` : 'Ümumi kredit');

    const detailRow = (label: string, value: React.ReactNode, action?: React.ReactNode) => (
        <View style={[styles.detailRow, { borderTopColor: t.hairline }]}>
            <Text style={[styles.detailLabel, { color: t.textSecondary }]}>{label}</Text>
            <View style={styles.detailValueWrap}>
                {typeof value === 'string' ? <Text selectable style={[styles.detailValue, { color: t.text }]}>{value}</Text> : value}
                {action}
            </View>
        </View>
    );

    return (
        <AdminPage
            title="Kredit müraciətləri"
            subtitle="Saytdan və tətbiqdən göndərilən müraciətlər"
            actions={<Button variant="secondary" size="sm" title="Yenilə" icon={<RefreshCw size={14} color={t.text} />} onPress={fetchApplications} />}
        >
            <Toolbar>
                <Segmented<FilterStatus>
                    options={[
                        { value: 'pending', label: 'Gözləyir', count: counts.pending },
                        { value: 'approved', label: 'Təsdiqlənib', count: counts.approved },
                        { value: 'rejected', label: 'Rədd', count: counts.rejected },
                        { value: 'all', label: 'Hamısı', count: counts.all },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
                <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Ad, FİN, telefon və ya avtomobil" />
            </Toolbar>

            <DataTable
                loading={loading}
                data={filtered}
                keyExtractor={(a) => a.id}
                onRowPress={setSelectedApp}
                emptyIcon={<FileText size={28} color={t.textSecondary} />}
                emptyTitle="Müraciət tapılmadı"
                columns={[
                    { key: 'client', title: 'Müştəri', flex: 2, render: (a) => <CellText title={a.full_name || '—'} subtitle={a.fin_code ? `FİN ${a.fin_code}` : undefined} /> },
                    { key: 'car', title: 'Avtomobil', flex: 2, hideOnMobile: true, render: (a) => <CellText title={`${carName(a)}${a.listings?.year ? `, ${a.listings.year}` : ''}`} subtitle={a.listings ? formatMoney(a.listings.price, a.listings.currency) : undefined} /> },
                    { key: 'phone', title: 'Telefon', flex: 1.4, hideOnMobile: true, render: (a) => <CellText title={a.phone || '—'} /> },
                    { key: 'income', title: 'Aylıq gəlir', flex: 1, align: 'right', hideOnMobile: true, render: (a) => <CellText title={formatMoney(a.monthly_income)} /> },
                    { key: 'status', title: 'Status', flex: 1.1, render: (a) => <Badge label={statusOf(a).label} tone={statusOf(a).tone} /> },
                    { key: 'date', title: 'Tarix', flex: 1, align: 'right', hideOnMobile: true, render: (a) => <CellText title={formatDate(a.created_at, { showMonthName: true })} /> },
                ]}
            />

            {/* Slide-over with the full application */}
            {selectedApp && (
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelectedApp(null)} accessibilityLabel="Bağla" />
                    <View style={[styles.drawer, { backgroundColor: t.bg, borderLeftColor: t.hairline }, isMobile && { width: '100%' }]}>
                        <View style={[styles.drawerHeader, { borderBottomColor: t.hairline, backgroundColor: t.surface }]}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[styles.drawerTitle, { color: t.text }]} numberOfLines={1}>{selectedApp.full_name}</Text>
                                <Text style={[styles.drawerSub, { color: t.textSecondary }]}>{formatDate(selectedApp.created_at, { showMonthName: true })}</Text>
                            </View>
                            <Badge label={statusOf(selectedApp).label} tone={statusOf(selectedApp).tone} />
                            <TouchableOpacity onPress={() => setSelectedApp(null)} style={[styles.close, { backgroundColor: t.fill }]} accessibilityLabel="Bağla">
                                <X size={16} color={t.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.drawerBody}>
                            <GroupCaption>Avtomobil</GroupCaption>
                            <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.hairline }]}>
                                {selectedApp.listings ? (
                                    <>
                                        <View style={styles.groupPad}>
                                            <Text style={[styles.carTitle, { color: t.text }]}>{carName(selectedApp)}{selectedApp.listings.year ? `, ${selectedApp.listings.year}` : ''}</Text>
                                            <Text style={[styles.carPrice, { color: t.text }]}>{formatMoney(selectedApp.listings.price, selectedApp.listings.currency)}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.linkRow, { borderTopColor: t.hairline }]}
                                            onPress={() => router.push(`/listing/${selectedApp.listings.short_id || selectedApp.listings.id}` as any)}
                                        >
                                            <Text style={[styles.link, { color: t.accent }]}>Elana bax ›</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <Text style={[styles.groupPad, { color: t.textSecondary, fontFamily: FONT.regular }]}>Elan seçilməyib və ya silinib.</Text>
                                )}
                            </View>

                            <GroupCaption style={{ marginTop: 24 }}>Müştəri</GroupCaption>
                            <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.hairline }]}>
                                {detailRow('Ad, soyad', selectedApp.full_name || '—')}
                                {detailRow('Ata adı', selectedApp.father_name || '—')}
                                {detailRow('FİN kod', selectedApp.fin_code || '—', selectedApp.fin_code ? (
                                    <TouchableOpacity onPress={() => copy(selectedApp.fin_code, 'FİN kod')} accessibilityLabel="FİN kodu kopyala">
                                        <Copy size={14} color={t.accent} />
                                    </TouchableOpacity>
                                ) : undefined)}
                                {detailRow('Doğum tarixi', selectedApp.birth_date ? formatDate(selectedApp.birth_date) : '—')}
                                {detailRow('İş yeri', selectedApp.workplace || '—')}
                                {detailRow('Aylıq gəlir', formatMoney(selectedApp.monthly_income))}
                                {detailRow('Telefon', selectedApp.phone ? (
                                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${String(selectedApp.phone).replace(/\s/g, '')}`)}>
                                        <Text style={[styles.detailValue, { color: t.accent }]}>{selectedApp.phone}</Text>
                                    </TouchableOpacity>
                                ) : '—')}
                            </View>
                        </ScrollView>

                        <View style={[styles.drawerActions, { borderTopColor: t.hairline, backgroundColor: t.surface }]}>
                            <Button variant="destructive" size="md" title="Sil" icon={<Trash2 size={15} color={t.accent} />} onPress={() => setConfirmDelete(true)} />
                            <View style={{ flex: 1 }} />
                            <Button variant="secondary" title="Rədd et" icon={<XCircle size={15} color={t.text} />} disabled={updating || selectedApp.status === 'rejected'} onPress={() => updateStatus(selectedApp.id, 'rejected')} />
                            <Button title="Təsdiqlə" icon={<CheckCircle2 size={15} color="#FFF" />} disabled={updating || selectedApp.status === 'approved'} onPress={() => updateStatus(selectedApp.id, 'approved')} />
                        </View>
                    </View>
                </View>
            )}

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
        </AdminPage>
    );
}

const styles = StyleSheet.create({
    overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, flexDirection: 'row', justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
    drawer: { width: 460, height: '100%', borderLeftWidth: StyleSheet.hairlineWidth, boxShadow: '0px 0px 48px rgba(0,0,0,0.2)' as any },
    drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    drawerTitle: { fontSize: 19, fontFamily: FONT.bold },
    drawerSub: { fontSize: 13, fontFamily: FONT.regular, marginTop: 2 },
    close: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    drawerBody: { padding: 20 },
    group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
    groupPad: { padding: 16 },
    carTitle: { fontSize: 16, fontFamily: FONT.semibold },
    carPrice: { fontSize: 20, fontFamily: FONT.heavy, marginTop: 4 },
    linkRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 12, cursor: 'pointer' as any },
    link: { fontSize: 14, fontFamily: FONT.semibold },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth, marginTop: -StyleSheet.hairlineWidth },
    detailLabel: { width: 110, fontSize: 14, fontFamily: FONT.regular },
    detailValueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
    detailValue: { fontSize: 14, fontFamily: FONT.semibold, textAlign: 'right' },
    drawerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
