import React, { useState, useCallback, useRef } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Car, Hash, CheckCircle, Trash2, Edit, Eye, RefreshCw, Bell, Zap } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PlateVisual } from '../../components/PlateVisual';
import { Listing, Plate } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { pushHref } from '../../lib/push';
import { deleteStorageImages } from '../../utils/imageOptimizer';
import { runFullWebpAndDatabaseOptimization, OptimizationProgress } from '../../utils/storageOptimizer';
import { Segmented, Stat, Button, Badge, useWebTokens, useBreakpoints, formatMoney, FONT } from '../../components/web/WebKit';
import { AdminPage, Toolbar, SearchField, DataTable, IconAction, CellText } from '../../components/web/AdminKit';

type ActiveTab = 'cars' | 'plates';
type StatusTab = 'approved' | 'pending';
type Item = (Listing | Plate) & { title?: string };

export default function WebAdminListings() {
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<ActiveTab>('cars');
    const [statusTab, setStatusTab] = useState<StatusTab>('approved');
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ totalCars: 0, pendingCars: 0, totalPlates: 0, pendingPlates: 0 });
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [optimizing, setOptimizing] = useState(false);
    const [optProgress, setOptProgress] = useState<OptimizationProgress | null>(null);
    const cancelOptRef = useRef(false);

    const handleOptimize = async () => {
        if (optimizing) {
            cancelOptRef.current = true;
            return;
        }
        cancelOptRef.current = false;
        setOptimizing(true);
        try {
            const res = await runFullWebpAndDatabaseOptimization(
                supabase,
                (p) => setOptProgress(p),
                () => cancelOptRef.current
            );
            showToast(
                `${res.convertedImages} şəkil WebP-ə çevrildi, ${res.deletedEmptyChats} boş çat silindi`,
                'success'
            );
            fetchAll();
        } catch (err: any) {
            showToast('Xəta: ' + (err.message || ''), 'error');
        } finally {
            setOptimizing(false);
        }
    };

    const table = activeTab === 'cars' ? 'listings' : 'plates';
    const { hasModule } = useAuth();
    const canPush = hasModule('notifications');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const sel = activeTab === 'cars'
                ? 'id, short_id, title, price, currency, image_url, images, make, model, year, created_at, is_vip, is_urgent, status'
                : 'id, short_id, region, series, number, price, created_at, is_vip, status';
            const head = { count: 'exact' as const, head: true };
            const [{ data, error }, carApproved, carPending, platApproved, platPending] = await Promise.all([
                supabase.from(activeTab === 'cars' ? 'listings' : 'plates').select(sel).eq('status', statusTab).order('created_at', { ascending: false }),
                supabase.from('listings').select('id', head).eq('status', 'approved'),
                supabase.from('listings').select('id', head).eq('status', 'pending'),
                supabase.from('plates').select('id', head).eq('status', 'approved'),
                supabase.from('plates').select('id', head).eq('status', 'pending'),
            ]);
            if (error) throw error;
            setItems((data || []) as any);
            setStats({
                totalCars: carApproved.count || 0,
                pendingCars: carPending.count || 0,
                totalPlates: platApproved.count || 0,
                pendingPlates: platPending.count || 0,
            });
        } catch (e: any) {
            showToast('Xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [activeTab, statusTab, showToast]);

    useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

    const approveItem = async (id: string) => {
        const { error } = await supabase.from(table).update({ status: 'approved' }).eq('id', id);
        if (error) {
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        showToast('Təsdiqləndi', 'success');
        fetchAll();
    };

    const deleteItem = async () => {
        if (!deleteId) return;
        const id = deleteId;
        const targetItem = items.find((i) => i.id === id) as Listing | undefined;
        setDeleteId(null);
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            showToast('Silinmədi: ' + error.message, 'error');
            return;
        }
        if (activeTab === 'cars' && targetItem) {
            await deleteStorageImages(supabase, [targetItem.image_url, ...(targetItem.images || [])]);
        }
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast('Silindi', 'success');
    };

    const q = searchQuery.trim().toLowerCase();
    const filtered = items.filter((item) => {
        if (!q) return true;
        const text = activeTab === 'cars'
            ? `${(item as Listing).make} ${(item as Listing).model} ${(item as Listing).year}`
            : `${(item as Plate).region} ${(item as Plate).series} ${(item as Plate).number} ${(item as Plate).region}-${(item as Plate).series}-${(item as Plate).number}`;
        return text.toLowerCase().includes(q) || (item.short_id || '').toLowerCase().includes(q);
    });

    const pendingCount = activeTab === 'cars' ? stats.pendingCars : stats.pendingPlates;
    const approvedCount = activeTab === 'cars' ? stats.totalCars : stats.totalPlates;

    const cover = (c: Listing) => (Array.isArray(c.images) && c.images[0]) || c.image_url;

    return (
        <AdminPage
            title="Elanlar"
            subtitle="Təsdiq gözləyən və aktiv elanların idarəsi"
            actions={
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Button
                        variant={optimizing ? 'primary' : 'secondary'}
                        size="sm"
                        title={optimizing ? 'Dayandır' : 'WebP & Baza Təmizliyi'}
                        icon={<Zap size={14} color={optimizing ? '#FFF' : t.accent} />}
                        onPress={handleOptimize}
                    />
                    <Button variant="secondary" size="sm" title="Yenilə" icon={<RefreshCw size={14} color={t.text} />} onPress={fetchAll} />
                </View>
            }
        >
            {optProgress && (
                <View style={{ marginBottom: 16, padding: 14, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.hairline, gap: 8 }}>
                    <Text style={{ fontSize: 13, fontFamily: FONT.semibold, color: t.text }}>
                        {optProgress.message}
                    </Text>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: t.fill, overflow: 'hidden' }}>
                        <View
                            style={{
                                height: '100%',
                                width: `${Math.min(100, Math.round((optProgress.current / Math.max(1, optProgress.total)) * 100))}%`,
                                backgroundColor: optProgress.phase === 'done' ? t.success : t.accent,
                            }}
                        />
                    </View>
                </View>
            )}
            <View style={[styles.stats, isMobile && { flexWrap: 'wrap' }]}>
                <Stat label="Aktiv avtomobil" value={String(stats.totalCars)} />
                <Stat label="Gözləyən avtomobil" value={String(stats.pendingCars)} tone={stats.pendingCars ? t.warning : undefined} />
                <Stat label="Aktiv nömrə" value={String(stats.totalPlates)} />
                <Stat label="Gözləyən nömrə" value={String(stats.pendingPlates)} tone={stats.pendingPlates ? t.warning : undefined} />
            </View>

            <Toolbar>
                <Segmented<ActiveTab>
                    options={[{ value: 'cars', label: 'Avtomobillər' }, { value: 'plates', label: 'Nömrələr' }]}
                    value={activeTab}
                    onChange={(v) => { setActiveTab(v); setSearchQuery(''); }}
                />
                <Segmented<StatusTab>
                    options={[{ value: 'approved', label: 'Aktiv', count: approvedCount }, { value: 'pending', label: 'Gözləyən', count: pendingCount }]}
                    value={statusTab}
                    onChange={setStatusTab}
                />
                <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder={activeTab === 'cars' ? 'Marka, model və ya ID' : 'Nömrə və ya ID'} />
            </Toolbar>

            <DataTable<Item>
                loading={loading}
                data={filtered}
                keyExtractor={(i) => i.id}
                emptyIcon={activeTab === 'cars' ? <Car size={28} color={t.textSecondary} /> : <Hash size={28} color={t.textSecondary} />}
                emptyTitle={q ? 'Axtarışa uyğun elan yoxdur' : statusTab === 'pending' ? 'Təsdiq gözləyən elan yoxdur' : 'Elan yoxdur'}
                columns={[
                    {
                        key: 'item',
                        title: 'Elan',
                        flex: 2.4,
                        render: (item) => {
                            const isCar = activeTab === 'cars';
                            const c = item as Listing;
                            const p = item as Plate;
                            return (
                                <View style={styles.itemCell}>
                                    {isCar ? (
                                        cover(c)
                                            ? <Image source={{ uri: cover(c) }} accessibilityLabel={`${c.make} ${c.model}`} style={[styles.thumb, { backgroundColor: t.fill }]} resizeMode="cover" />
                                            : <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: t.fill }]}><Car size={18} color={t.textSecondary} /></View>
                                    ) : (
                                        <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: t.fill, overflow: 'hidden' }]}>
                                            <View style={{ transform: [{ scale: 0.22 }] }}>
                                                <PlateVisual region={p.region} series={p.series} number={p.number} />
                                            </View>
                                        </View>
                                    )}
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <CellText
                                            title={isCar ? `${c.make} ${c.model}${c.year ? `, ${c.year}` : ''}` : `${p.region}-${p.series}-${p.number}`}
                                            subtitle={`#${item.short_id || item.id.substring(0, 6)}${isMobile ? ` · ${formatMoney(item.price)}` : ''}`}
                                        />
                                    </View>
                                </View>
                            );
                        },
                    },
                    {
                        key: 'tags',
                        title: 'Status',
                        flex: 1,
                        hideOnMobile: true,
                        render: (item: any) => (
                            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                                {item.is_vip && <Badge label="VIP" tone="warning" />}
                                {item.is_urgent && <Badge label="Təcili" tone="accent" />}
                                {!item.is_vip && !item.is_urgent && <Badge label={statusTab === 'pending' ? 'Gözləyir' : 'Aktiv'} tone={statusTab === 'pending' ? 'warning' : 'success'} />}
                            </View>
                        ),
                    },
                    { key: 'price', title: 'Qiymət', flex: 1, align: 'right', hideOnMobile: true, render: (item: any) => <CellText title={formatMoney(item.price, item.currency)} strong /> },
                    { key: 'date', title: 'Tarix', flex: 1, align: 'right', hideOnMobile: true, render: (item) => <CellText title={formatDate(item.created_at || '')} /> },
                    {
                        key: 'actions',
                        title: '',
                        width: statusTab === 'pending' ? 152 : canPush ? 152 : 112,
                        align: 'right',
                        render: (item) => {
                            const isCar = activeTab === 'cars';
                            return (
                                <View style={styles.actions}>
                                    {statusTab === 'pending' && <IconAction icon={CheckCircle} label="Təsdiqlə" tone="success" onPress={() => approveItem(item.id)} />}
                                    {statusTab !== 'pending' && canPush && <IconAction icon={Bell} label="Bildiriş göndər" onPress={() => router.push(pushHref(item, !isCar) as any)} />}
                                    <IconAction icon={Eye} label="Saytda bax" onPress={() => router.push((isCar ? `/listing/${item.short_id || item.id}` : `/plate/${item.short_id || item.id}`) as any)} />
                                    <IconAction icon={Edit} label="Redaktə et" onPress={() => router.push((isCar ? `/admin/edit-listing/${item.id}` : `/admin/edit-plate/${item.id}`) as any)} />
                                    <IconAction icon={Trash2} label="Sil" tone="accent" onPress={() => setDeleteId(item.id)} />
                                </View>
                            );
                        },
                    },
                ]}
            />

            <ConfirmModal
                visible={!!deleteId}
                title="Elanı silmək?"
                message="Elan birdəfəlik silinəcək. Bu əməliyyatı geri qaytarmaq olmur."
                onConfirm={deleteItem}
                onCancel={() => setDeleteId(null)}
                confirmText="Sil"
                cancelText="Ləğv et"
                isDestructive
            />
        </AdminPage>
    );
}

const styles = StyleSheet.create({
    stats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    itemCell: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, width: '100%' },
    thumb: { width: 56, height: 42, borderRadius: 8 },
    thumbIcon: { justifyContent: 'center', alignItems: 'center' },
    actions: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
});
