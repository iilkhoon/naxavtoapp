import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, TextInput, Platform, Linking
} from 'react-native';
import {
    FileText, Search, ArrowLeft, ChevronRight, CheckCircle2, XCircle, Trash2,
    Briefcase, DollarSign, Calendar, Fingerprint, Phone, User, Info, MapPin, X,
    Copy, ExternalLink, PhoneCall, RefreshCw, Clock
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminApplicationsWeb() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    
    // Review Modal/Drawer State
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [reviewVisible, setReviewVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

    const fetchApplications = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('credit_applications')
                .select(`
                    *,
                    listings (
                        id,
                        make,
                        model,
                        year,
                        price,
                        currency,
                        image_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (e: any) {
            showToast('Müraciətlər yüklənərkən xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchApplications();

        const channel = supabase
            .channel('admin_web_credit_applications')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'credit_applications' },
                () => {
                    fetchApplications(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchApplications]);

    useEffect(() => {
        let result = [...applications];

        if (statusFilter !== 'all') {
            result = result.filter(app => (app.status || 'pending') === statusFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(app => 
                (app.full_name?.toLowerCase().includes(query)) || 
                (app.father_name?.toLowerCase().includes(query)) || 
                (app.fin_code?.toLowerCase().includes(query)) ||
                (app.phone?.toLowerCase().includes(query)) ||
                (app.workplace?.toLowerCase().includes(query)) ||
                (app.listings?.make?.toLowerCase().includes(query)) ||
                (app.listings?.model?.toLowerCase().includes(query))
            );
        }

        setFilteredApps(result);
    }, [searchQuery, statusFilter, applications]);

    const updateStatus = async (appId: string, status: 'approved' | 'rejected') => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('credit_applications')
                .update({ status })
                .eq('id', appId);

            if (error) throw error;
            
            showToast(status === 'approved' ? 'Müraciət təsdiqləndi!' : 'Müraciət rədd edildi!', 'success');
            
            setApplications(prev => prev.map(app => app.id === appId ? { ...app, status } : app));
            if (selectedApp && selectedApp.id === appId) {
                setSelectedApp({ ...selectedApp, status });
            }
        } catch (e: any) {
            showToast('Xəta baş verdi: ' + e.message, 'error');
        } finally {
            setUpdating(false);
        }
    };

    const deleteApplication = async (appId: string) => {
        if (!window.confirm('Bu müraciəti silmək istədiyinizdən əminsiniz?')) return;
        
        try {
            const { error } = await supabase
                .from('credit_applications')
                .delete()
                .eq('id', appId);

            if (error) throw error;
            
            showToast('Müraciət silindi', 'success');
            setApplications(prev => prev.filter(app => app.id !== appId));
            setReviewVisible(false);
            setSelectedApp(null);
        } catch (e: any) {
            showToast('Silinmə xətası: ' + e.message, 'error');
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            showToast(`${label} kopyalandı`, 'success');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'Təsdiqlənib', color: '#34C759', bg: 'rgba(52,199,89,0.1)' };
            case 'rejected':
                return { label: 'Rədd edilib', color: '#FF3B30', bg: 'rgba(255,59,48,0.1)' };
            default:
                return { label: 'Gözləyir', color: '#FF9500', bg: 'rgba(255,149,0,0.1)' };
        }
    };

    const pendingCount = applications.filter(a => (a.status || 'pending') === 'pending').length;
    const approvedCount = applications.filter(a => a.status === 'approved').length;
    const rejectedCount = applications.filter(a => a.status === 'rejected').length;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Kredit Müraciətləri</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                            Avtomobil almaq üçün göndərilmiş kredit müraciətlərinin idarə edilməsi
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => fetchApplications(true)} style={[styles.refreshBtn, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <RefreshCw size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' }}>Yenilə</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Search and Tabs Row */}
                <View style={styles.topRow}>
                    <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Search size={20} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Müştəri adı, FİN kod və ya avtomobil ilə axtar..."
                            placeholderTextColor={colors.placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.filterGroup}>
                        <TouchableOpacity
                            style={[
                                styles.filterBtn,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                statusFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => setStatusFilter('all')}
                        >
                            <Text style={[
                                styles.filterBtnText,
                                { color: colors.textSecondary },
                                statusFilter === 'all' && { color: '#FFF', fontWeight: 'bold' }
                            ]}>
                                Hamısı ({applications.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterBtn,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                statusFilter === 'pending' && { backgroundColor: '#FF9500', borderColor: '#FF9500' }
                            ]}
                            onPress={() => setStatusFilter('pending')}
                        >
                            <Clock size={14} color={statusFilter === 'pending' ? '#FFF' : '#FF9500'} style={{ marginRight: 4 }} />
                            <Text style={[
                                styles.filterBtnText,
                                { color: colors.textSecondary },
                                statusFilter === 'pending' && { color: '#FFF', fontWeight: 'bold' }
                            ]}>
                                Gözləyir ({pendingCount})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterBtn,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                statusFilter === 'approved' && { backgroundColor: '#34C759', borderColor: '#34C759' }
                            ]}
                            onPress={() => setStatusFilter('approved')}
                        >
                            <CheckCircle2 size={14} color={statusFilter === 'approved' ? '#FFF' : '#34C759'} style={{ marginRight: 4 }} />
                            <Text style={[
                                styles.filterBtnText,
                                { color: colors.textSecondary },
                                statusFilter === 'approved' && { color: '#FFF', fontWeight: 'bold' }
                            ]}>
                                Təsdiqlənib ({approvedCount})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.filterBtn,
                                { borderColor: colors.border, backgroundColor: colors.card },
                                statusFilter === 'rejected' && { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }
                            ]}
                            onPress={() => setStatusFilter('rejected')}
                        >
                            <XCircle size={14} color={statusFilter === 'rejected' ? '#FFF' : '#FF3B30'} style={{ marginRight: 4 }} />
                            <Text style={[
                                styles.filterBtnText,
                                { color: colors.textSecondary },
                                statusFilter === 'rejected' && { color: '#FFF', fontWeight: 'bold' }
                            ]}>
                                Rədd edilib ({rejectedCount})
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.columnHeader, { flex: 2.5, color: colors.textSecondary }]}>Müştəri</Text>
                            <Text style={[styles.columnHeader, { flex: 2, color: colors.textSecondary }]}>Avtomobil</Text>
                            <Text style={[styles.columnHeader, { flex: 1.5, color: colors.textSecondary }]}>Mobil Telefon</Text>
                            <Text style={[styles.columnHeader, { flex: 1.2, color: colors.textSecondary }]}>Aylıq Qazanc</Text>
                            <Text style={[styles.columnHeader, { flex: 1.2, color: colors.textSecondary }]}>Status</Text>
                            <Text style={[styles.columnHeader, { flex: 1.2, color: colors.textSecondary }]}>Tarix</Text>
                            <View style={{ width: 60 }} />
                        </View>

                        {filteredApps.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FileText size={48} color={colors.border} />
                                <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 16 }}>Müraciət tapılmadı</Text>
                            </View>
                        ) : (
                            filteredApps.map((app) => {
                                const badge = getStatusBadge(app.status);
                                const carName = app.listings ? `${app.listings.make} ${app.listings.model}` : 'Silinmiş Avtomobil';
                                return (
                                    <TouchableOpacity 
                                        key={app.id} 
                                        style={[styles.tableRow, { borderBottomColor: colors.border }]}
                                        onPress={() => {
                                            setSelectedApp(app);
                                            setReviewVisible(true);
                                        }}
                                    >
                                        <View style={[styles.cell, { flex: 2.5 }]}>
                                            <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                                    {app.full_name?.charAt(0)}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                                                    {app.full_name} {app.father_name ? `(${app.father_name})` : ''}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                                    FİN: {app.fin_code}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={[styles.cell, { flex: 2 }]}>
                                            <View>
                                                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
                                                    {carName} {app.listings?.year ? `(${app.listings.year})` : ''}
                                                </Text>
                                                {app.listings && (
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                                        {app.listings.price.toLocaleString()} {app.listings.currency || 'AZN'}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>
                                                {app.phone}
                                            </Text>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.2 }]}>
                                            <Text style={{ color: '#34C759', fontWeight: 'bold', fontSize: 14 }}>
                                                {Number(app.monthly_income || 0).toLocaleString()} ₼
                                            </Text>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.2 }]}>
                                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.statusText, { color: badge.color }]}>
                                                    {badge.label}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.2 }]}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                                {formatDate(app.created_at, { showMonthName: true })}
                                            </Text>
                                        </View>

                                        <View style={[styles.cell, { width: 60, justifyContent: 'flex-end' }]}>
                                            <ChevronRight size={18} color={colors.textSecondary} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Slide-over Drawer / Modal for Review */}
            {reviewVisible && selectedApp && (
                <View style={styles.drawerOverlay}>
                    <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={() => setReviewVisible(false)} />
                    <View style={[styles.drawerContent, { backgroundColor: colors.card, borderLeftColor: colors.border }]}>
                        {/* Drawer Header */}
                        <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
                            <View>
                                <Text style={[styles.drawerTitle, { color: colors.text }]}>Müraciət Detalları</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>ID: {selectedApp.id}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setReviewVisible(false)} style={styles.closeBtn}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Drawer Body */}
                        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
                            {/* Car Section */}
                            <View style={[styles.drawerSection, { backgroundColor: colors.background, borderRadius: 12, padding: 16 }]}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Avtomobil Məlumatı</Text>
                                {selectedApp.listings ? (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                                            {selectedApp.listings.make} {selectedApp.listings.model} ({selectedApp.listings.year})
                                        </Text>
                                        <Text style={{ color: colors.primary, fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
                                            {selectedApp.listings.price.toLocaleString()} {selectedApp.listings.currency || 'AZN'}
                                        </Text>
                                        <TouchableOpacity 
                                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}
                                            onPress={() => router.push(`/listing/${selectedApp.listings.id}` as any)}
                                        >
                                            <ExternalLink size={14} color="#007AFF" style={{ marginRight: 6 }} />
                                            <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>Elana get</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Avtomobil tapılmadı və ya silinib.</Text>
                                )}
                            </View>

                            {/* Applicant Section */}
                            <View style={[styles.drawerSection, { marginTop: 20 }]}>
                                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>Müştəri Məlumatları</Text>
                                
                                <View style={styles.infoRow}>
                                    <User size={18} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Ad, Soyad və Ata adı</Text>
                                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 }}>
                                            {selectedApp.full_name} {selectedApp.father_name ? `(${selectedApp.father_name})` : ''}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <Fingerprint size={18} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>FİN Kod</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold', letterSpacing: 1 }}>
                                                {selectedApp.fin_code}
                                            </Text>
                                            <TouchableOpacity onPress={() => copyToClipboard(selectedApp.fin_code, 'FİN kod')} style={{ marginLeft: 8 }}>
                                                <Copy size={14} color={colors.primary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <Calendar size={18} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Doğum Tarixi</Text>
                                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 }}>
                                            {formatDate(selectedApp.birth_date)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <Briefcase size={18} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>İş yeri / Fəaliyyət</Text>
                                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 2 }}>
                                            {selectedApp.workplace || '-'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <DollarSign size={18} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Aylıq Qazanc</Text>
                                        <Text style={{ color: '#34C759', fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>
                                            {Number(selectedApp.monthly_income || 0).toLocaleString()} ₼
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <Phone size={18} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Mobil Telefon</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <Text style={{ color: '#007AFF', fontSize: 15, fontWeight: 'bold' }}>
                                                {selectedApp.phone}
                                            </Text>
                                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedApp.phone}`)} style={{ marginLeft: 8 }}>
                                                <PhoneCall size={14} color="#007AFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.infoRow}>
                                    <Info size={18} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Status</Text>
                                        <Text style={{ color: getStatusBadge(selectedApp.status).color, fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
                                            {getStatusBadge(selectedApp.status).label.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Drawer Actions */}
                        <View style={[styles.drawerActions, { borderTopColor: colors.border }]}>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B30', borderWidth: 1 }]}
                                onPress={() => deleteApplication(selectedApp.id)}
                            >
                                <Trash2 size={16} color="#FF3B30" />
                                <Text style={{ color: '#FF3B30', fontWeight: 'bold', marginLeft: 6 }}>Sil</Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, { backgroundColor: '#FF3B30', flex: 1 }]}
                                    disabled={updating}
                                    onPress={() => updateStatus(selectedApp.id, 'rejected')}
                                >
                                    <XCircle size={16} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>Rədd et</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.actionBtn, { backgroundColor: '#34C759', flex: 1 }]}
                                    disabled={updating}
                                    onPress={() => updateStatus(selectedApp.id, 'approved')}
                                >
                                    <CheckCircle2 size={16} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>Təsdiqlə</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, height: '100%' },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    headerSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    refreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 16,
        flexWrap: 'wrap',
    },
    searchContainer: {
        flex: 1,
        minWidth: 260,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        outlineStyle: 'none' as any,
    },
    filterGroup: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    filterBtnText: {
        fontSize: 13,
    },
    loadingContainer: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    columnHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        cursor: 'pointer' as any,
    },
    cell: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    userName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    // Slide-over Drawer
    drawerOverlay: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    drawerBackdrop: {
        position: 'absolute' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    drawerContent: {
        width: 480,
        maxWidth: '90%',
        height: '100%',
        zIndex: 1001,
        borderLeftWidth: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 6,
    },
    drawerBody: {
        flex: 1,
        padding: 20,
    },
    drawerSection: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    drawerActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        gap: 10,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
});
