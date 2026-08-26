import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, TextInput, Image, useWindowDimensions, Platform
} from 'react-native';
import {
    Car, Hash, Clock, CheckCircle, Trash2, Edit, Eye, Search, X,
    RefreshCw, ChevronRight, ArrowLeft
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { WebHeader } from '../../components/WebHeader.web';
import { WebFooter } from '../../components/WebFooter.web';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Listing, Plate } from '../../types';

type ActiveTab = 'cars' | 'plates';
type StatusTab = 'approved' | 'pending';

function StatCard({ label, value, icon: Icon, color, bg }: any) {
    return (
        <View style={[styles.statCard, { backgroundColor: bg }]}>
            <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
                <Icon size={22} color={color} />
            </View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

export default function WebAdminListings() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [activeTab, setActiveTab] = useState<ActiveTab>('cars');
    const [statusTab, setStatusTab] = useState<StatusTab>('approved');
    const [items, setItems] = useState<(Listing | Plate)[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ totalCars: 0, pendingCars: 0, totalPlates: 0, pendingPlates: 0 });
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState(false);

    useFocusEffect(useCallback(() => { fetchAll(); }, [activeTab, statusTab]));

    const fetchAll = async () => {
        setLoading(true);
        try {
            const table = activeTab === 'cars' ? 'listings' : 'plates';
            const sel = activeTab === 'cars'
                ? 'id, short_id, title, price, image_url, make, model, year, created_at, is_vip, status'
                : 'id, short_id, region, series, number, price, created_at, is_vip, status';
            const { data } = await supabase.from(table).select(sel).eq('status', statusTab).order('created_at', { ascending: false });
            setItems((data || []) as any);

            // Stats
            const [carApproved, carPending, platApproved, platPending] = await Promise.all([
                supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
                supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('plates').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
                supabase.from('plates').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            ]);
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
    };

    const approveItem = async (id: string) => {
        const table = activeTab === 'cars' ? 'listings' : 'plates';
        const { error } = await supabase.from(table).update({ status: 'approved' }).eq('id', id);
        if (error) { showToast('Xəta', 'error'); } else { showToast('Təsdiqləndi', 'success'); fetchAll(); }
    };

    const deleteItem = async () => {
        if (!deleteId) return;
        setDeleteModal(false);
        const table = activeTab === 'cars' ? 'listings' : 'plates';
        await supabase.from(table).delete().eq('id', deleteId);
        showToast('Silindi', 'success');
        fetchAll();
        setDeleteId(null);
    };

    const filtered = items.filter(item => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        if (activeTab === 'cars') {
            const c = item as Listing;
            return `${c.make} ${c.model}`.toLowerCase().includes(q) || (c.short_id || '').includes(q);
        } else {
            const p = item as Plate;
            return `${p.region} ${p.series} ${p.number}`.toLowerCase().includes(q) || (p.short_id || '').includes(q);
        }
    });

    const statCards = [
        { label: 'Aktiv Avtomobil', value: stats.totalCars, icon: Car, color: '#007AFF', bg: isDark ? '#1C1C1E' : '#FFF' },
        { label: 'Gözləyən Avtomobil', value: stats.pendingCars, icon: Clock, color: '#FF9500', bg: isDark ? '#1C1C1E' : '#FFF' },
        { label: 'Aktiv Nömrə', value: stats.totalPlates, icon: Hash, color: '#34C759', bg: isDark ? '#1C1C1E' : '#FFF' },
        { label: 'Gözləyən Nömrə', value: stats.pendingPlates, icon: Clock, color: '#FF3B30', bg: isDark ? '#1C1C1E' : '#FFF' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.pageWrap, isMobile && { paddingHorizontal: 16 }]}>
                    {/* Title */}
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={[styles.pageTitle, { color: colors.text }]}>Admin Panel</Text>
                            <Text style={[styles.pageSub, { color: colors.textSecondary }]}>Elan idarəetməsi</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={fetchAll}
                        >
                            <RefreshCw size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    <View style={[styles.statsRow, isMobile && { flexWrap: 'wrap' }]}>
                        {statCards.map(s => (
                            <StatCard key={s.label} {...s} />
                        ))}
                    </View>

                    {/* Tabs + Filters */}
                    <View style={[styles.controlsRow, isMobile && { flexDirection: 'column', gap: 12 }]}>
                        {/* Type Tabs */}
                        <View style={[styles.segControl, { backgroundColor: colors.card }]}>
                            <TouchableOpacity
                                style={[styles.segBtn, activeTab === 'cars' && { backgroundColor: colors.primary }]}
                                onPress={() => { setActiveTab('cars'); setSearchQuery(''); }}
                            >
                                <Car size={16} color={activeTab === 'cars' ? '#FFF' : colors.textSecondary} />
                                <Text style={[styles.segText, { color: activeTab === 'cars' ? '#FFF' : colors.textSecondary }]}>Avtomobillər</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segBtn, activeTab === 'plates' && { backgroundColor: colors.primary }]}
                                onPress={() => { setActiveTab('plates'); setSearchQuery(''); }}
                            >
                                <Hash size={16} color={activeTab === 'plates' ? '#FFF' : colors.textSecondary} />
                                <Text style={[styles.segText, { color: activeTab === 'plates' ? '#FFF' : colors.textSecondary }]}>Nömrələr</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Status Filter */}
                        <View style={styles.statusRow}>
                            <TouchableOpacity
                                style={[styles.statusChip, { backgroundColor: statusTab === 'approved' ? colors.primary : colors.card, borderColor: colors.border, borderWidth: 1 }]}
                                onPress={() => setStatusTab('approved')}
                            >
                                <Text style={[styles.statusText, { color: statusTab === 'approved' ? '#FFF' : colors.textSecondary }]}>Aktiv</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.statusChip, { backgroundColor: statusTab === 'pending' ? '#FF9500' : colors.card, borderColor: colors.border, borderWidth: 1 }]}
                                onPress={() => setStatusTab('pending')}
                            >
                                <Text style={[styles.statusText, { color: statusTab === 'pending' ? '#FFF' : colors.textSecondary }]}>Gözləyən</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Search size={16} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }, Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}]}
                                placeholder="Axtar..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <X size={14} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* List */}
                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Car size={48} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Elan tapılmadı</Text>
                        </View>
                    ) : (
                        <View style={styles.listWrap}>
                            {/* List header */}
                            <View style={[styles.listHeader, isMobile && { display: 'none' as any }]}>
                                <Text style={[styles.colHead, { color: colors.textSecondary, flex: 2 }]}>Elan</Text>
                                <Text style={[styles.colHead, { color: colors.textSecondary, flex: 1, textAlign: 'right' }]}>Qiymət</Text>
                                <Text style={[styles.colHead, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>Tarix</Text>
                                <Text style={[styles.colHead, { color: colors.textSecondary, width: 140, textAlign: 'center' }]}>Əməliyyat</Text>
                            </View>

                            {filtered.map((item) => {
                                const iscar = activeTab === 'cars';
                                const c = item as Listing;
                                const p = item as Plate;
                                const title = iscar ? `${c.make} ${c.model} ${c.year}` : `${p.region} ${p.series} ${p.number}`;
                                const price = `${item.price} ₼`;
                                const date = formatDate(item.created_at || '');
                                return (
                                    <View key={item.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        {/* Thumbnail / Icon */}
                                        <View style={styles.thumbWrap}>
                                            {iscar && c.image_url ? (
                                                <Image source={{ uri: c.image_url }} style={styles.thumb} resizeMode="cover" />
                                            ) : (
                                                <View style={[styles.thumb, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', justifyContent: 'center', alignItems: 'center' }]}>
                                                    {iscar ? <Car size={22} color={colors.textSecondary} /> : <Hash size={22} color={colors.textSecondary} />}
                                                </View>
                                            )}
                                        </View>

                                        {/* Info */}
                                        <View style={{ flex: 2, justifyContent: 'center' }}>
                                            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
                                            <View style={styles.itemMeta}>
                                                <Text style={[styles.itemId, { color: colors.textSecondary }]}>#{item.short_id || item.id.substring(0, 6)}</Text>
                                                {(item as any).is_vip && <Text style={styles.vipBadge}>VIP</Text>}
                                            </View>
                                        </View>

                                        {/* Price */}
                                        {!isMobile && (
                                            <Text style={[styles.priceText, { color: colors.primary, flex: 1, textAlign: 'right' }]}>{price}</Text>
                                        )}

                                        {/* Date */}
                                        {!isMobile && (
                                            <Text style={[styles.dateText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>{date}</Text>
                                        )}

                                        {/* Actions */}
                                        <View style={styles.actionBtns}>
                                            {statusTab === 'pending' && (
                                                <TouchableOpacity
                                                    style={[styles.iconBtn, { backgroundColor: '#34C759' }]}
                                                    onPress={() => approveItem(item.id)}
                                                >
                                                    <CheckCircle size={16} color="#FFF" />
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={[styles.iconBtn, { backgroundColor: '#007AFF' }]}
                                                onPress={() => router.push(iscar ? `/listing/${item.id}` as any : `/plate/${item.id}` as any)}
                                            >
                                                <Eye size={16} color="#FFF" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.iconBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                                                onPress={() => router.push(iscar ? `/admin/edit-listing/${item.id}` as any : `/admin/edit-plate/${item.id}` as any)}
                                            >
                                                <Edit size={16} color={colors.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.iconBtn, { backgroundColor: 'rgba(255,59,48,0.1)' }]}
                                                onPress={() => { setDeleteId(item.id); setDeleteModal(true); }}
                                            >
                                                <Trash2 size={16} color="#FF3B30" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

            <ConfirmModal
                visible={deleteModal}
                title="Sil"
                message="Bu elanı silmək istədiyinizə əminsiniz?"
                onConfirm={deleteItem}
                onCancel={() => setDeleteModal(false)}
                confirmText="Sil"
                cancelText="Ləğv et"
                isDestructive
            />
        </View>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        paddingTop: 32,
        paddingBottom: 40,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },
    pageTitle: {
        fontSize: 30,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 4,
    },
    pageSub: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 28,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
        color: '#999',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    segControl: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    segBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
    },
    segText: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statusChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 42,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
    },
    loadingWrap: {
        paddingTop: 60,
        alignItems: 'center',
    },
    emptyWrap: {
        paddingTop: 80,
        alignItems: 'center',
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    listWrap: {
        gap: 0,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    colHead: {
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderRadius: 16,
        marginBottom: 10,
        gap: 12,
    },
    thumbWrap: {
        marginRight: 4,
    },
    thumb: {
        width: 56,
        height: 56,
        borderRadius: 12,
    },
    itemTitle: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 4,
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemId: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
    },
    vipBadge: {
        fontSize: 10,
        fontFamily: 'RethinkSans_800ExtraBold',
        color: '#FFD700',
        backgroundColor: 'rgba(255,215,0,0.12)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priceText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    dateText: {
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    actionBtns: {
        flexDirection: 'row',
        gap: 8,
        width: 140,
        justifyContent: 'flex-end',
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
