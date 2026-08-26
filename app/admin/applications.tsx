import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, TextInput,
    Modal, Platform, Linking, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import {
    FileText, Search, ArrowLeft, ChevronRight, CheckCircle2, XCircle, Trash2,
    Briefcase, DollarSign, Calendar, Fingerprint, Phone, User, Info, Copy,
    ExternalLink, PhoneCall, RefreshCw, Clock
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { MotiView } from 'moti';
import { formatDate } from '../../lib/utils';
import * as Clipboard from 'expo-clipboard';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminApplications() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    
    // Detailed Review Modal State
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

    const fetchApplications = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
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
                        image_url,
                        images
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (e: any) {
            console.error('Fetch applications error:', e);
            showToast('Müraciətlər yüklənərkən xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchApplications();

        // Realtime subscription for incoming credit applications
        const channel = supabase
            .channel('admin_credit_applications')
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

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(app => (app.status || 'pending') === statusFilter);
        }

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(app => 
                (app.full_name && app.full_name.toLowerCase().includes(q)) || 
                (app.father_name && app.father_name.toLowerCase().includes(q)) ||
                (app.fin_code && app.fin_code.toLowerCase().includes(q)) ||
                (app.phone && app.phone.toLowerCase().includes(q)) ||
                (app.workplace && app.workplace.toLowerCase().includes(q)) ||
                (app.listings?.make && app.listings.make.toLowerCase().includes(q)) ||
                (app.listings?.model && app.listings.model.toLowerCase().includes(q))
            );
        }

        setFilteredApps(result);
    }, [searchQuery, statusFilter, applications]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchApplications(true);
    };

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
            showToast('Status dəyişdirilərkən xəta: ' + e.message, 'error');
        } finally {
            setUpdating(false);
        }
    };

    const deleteApplication = async (appId: string) => {
        Alert.alert(
            'Müraciəti Sil',
            'Bu müraciəti silmək istədiyinizdən əminsiniz?',
            [
                { text: 'Ləğv et', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('credit_applications')
                                .delete()
                                .eq('id', appId);

                            if (error) throw error;
                            
                            showToast('Müraciət silindi', 'success');
                            setApplications(prev => prev.filter(app => app.id !== appId));
                            setReviewModalVisible(false);
                            setSelectedApp(null);
                        } catch (e: any) {
                            showToast('Silinmə xətası: ' + e.message, 'error');
                        }
                    }
                }
            ]
        );
    };

    const handleCall = (phoneNumber: string) => {
        if (!phoneNumber) return;
        Linking.openURL(`tel:${phoneNumber}`);
    };

    const handleCopy = async (text: string, label: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        showToast(`${label} kopyalandı`, 'success');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'Təsdiqlənib', color: '#34C759', bg: 'rgba(52,199,89,0.12)' };
            case 'rejected':
                return { label: 'Rədd edilib', color: '#FF3B30', bg: 'rgba(255,59,48,0.12)' };
            default:
                return { label: 'Gözləyir', color: '#FF9500', bg: 'rgba(255,149,0,0.12)' };
        }
    };

    const pendingCount = applications.filter(a => (a.status || 'pending') === 'pending').length;
    const approvedCount = applications.filter(a => a.status === 'approved').length;
    const rejectedCount = applications.filter(a => a.status === 'rejected').length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Kredit Müraciətləri</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Cəmi: {applications.length} müraciət
                    </Text>
                </View>
                <TouchableOpacity onPress={() => fetchApplications(true)} style={styles.refreshBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <RefreshCw size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Search size={18} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Ad, Soyad, FİN, Tel və ya Model ilə axtar..."
                        placeholderTextColor={colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <XCircle size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.filterTabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            statusFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setStatusFilter('all')}
                    >
                        <Text style={[
                            styles.filterTabText,
                            { color: colors.textSecondary },
                            statusFilter === 'all' && { color: '#FFF', fontFamily: 'RethinkSans_700Bold' }
                        ]}>
                            Hamısı ({applications.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            statusFilter === 'pending' && { backgroundColor: '#FF9500', borderColor: '#FF9500' }
                        ]}
                        onPress={() => setStatusFilter('pending')}
                    >
                        <Clock size={14} color={statusFilter === 'pending' ? '#FFF' : '#FF9500'} style={{ marginRight: 4 }} />
                        <Text style={[
                            styles.filterTabText,
                            { color: colors.textSecondary },
                            statusFilter === 'pending' && { color: '#FFF', fontFamily: 'RethinkSans_700Bold' }
                        ]}>
                            Gözləyir ({pendingCount})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            statusFilter === 'approved' && { backgroundColor: '#34C759', borderColor: '#34C759' }
                        ]}
                        onPress={() => setStatusFilter('approved')}
                    >
                        <CheckCircle2 size={14} color={statusFilter === 'approved' ? '#FFF' : '#34C759'} style={{ marginRight: 4 }} />
                        <Text style={[
                            styles.filterTabText,
                            { color: colors.textSecondary },
                            statusFilter === 'approved' && { color: '#FFF', fontFamily: 'RethinkSans_700Bold' }
                        ]}>
                            Təsdiqlənib ({approvedCount})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            statusFilter === 'rejected' && { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }
                        ]}
                        onPress={() => setStatusFilter('rejected')}
                    >
                        <XCircle size={14} color={statusFilter === 'rejected' ? '#FFF' : '#FF3B30'} style={{ marginRight: 4 }} />
                        <Text style={[
                            styles.filterTabText,
                            { color: colors.textSecondary },
                            statusFilter === 'rejected' && { color: '#FFF', fontFamily: 'RethinkSans_700Bold' }
                        ]}>
                            Rədd edilib ({rejectedCount})
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: 'RethinkSans_500Medium' }}>
                        Müraciətlər yüklənir...
                    </Text>
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.list} 
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    {filteredApps.length === 0 ? (
                        <View style={styles.empty}>
                            <FileText size={56} color={colors.border} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>Müraciət Tapılmadı</Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {searchQuery ? 'Axtarışa uyğun heç bir kredit müraciəti tapılmadı.' : 'Hazırda bu kateqoriyada müraciət yoxdur.'}
                            </Text>
                        </View>
                    ) : (
                        filteredApps.map((app, index) => {
                            const badge = getStatusBadge(app.status);
                            const car = app.listings;
                            const carName = car ? `${car.make} ${car.model}` : 'Bilinməyən Avtomobil';
                            const carImg = car?.image_url || (Array.isArray(car?.images) && car.images[0]) || null;

                            return (
                                <MotiView
                                    key={app.id}
                                    from={{ opacity: 0, translateY: 10 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ delay: index * 40 }}
                                >
                                    <TouchableOpacity 
                                        style={[styles.appCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => {
                                            setSelectedApp(app);
                                            setReviewModalVisible(true);
                                        }}
                                        activeOpacity={0.88}
                                    >
                                        {/* Car and Status Header */}
                                        <View style={styles.appCardHeader}>
                                            {carImg && (
                                                <ExpoImage
                                                    source={{ uri: carImg }}
                                                    style={styles.carThumb}
                                                    contentFit="cover"
                                                    transition={200}
                                                />
                                            )}
                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                <Text style={[styles.carName, { color: colors.text }]} numberOfLines={1}>
                                                    {carName} {car?.year ? `(${car.year})` : ''}
                                                </Text>
                                                {car?.price && (
                                                    <Text style={[styles.carPrice, { color: colors.primary }]}>
                                                        {car.price.toLocaleString()} {car.currency || 'AZN'}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                                            </View>
                                        </View>

                                        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                                        {/* Applicant Info */}
                                        <View style={styles.appCardBody}>
                                            <View style={styles.applicantHeaderRow}>
                                                <Text style={[styles.applicantName, { color: colors.text }]}>
                                                    👤 {app.full_name} {app.father_name ? `(${app.father_name})` : ''}
                                                </Text>
                                            </View>

                                            <View style={styles.infoGrid}>
                                                <View style={styles.infoGridCol}>
                                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>FİN Kod:</Text>
                                                    <TouchableOpacity onPress={() => handleCopy(app.fin_code, 'FİN kod')} style={styles.inlineCopy}>
                                                        <Text style={[styles.infoValue, { color: colors.text, letterSpacing: 1 }]}>{app.fin_code}</Text>
                                                        <Copy size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={styles.infoGridCol}>
                                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Telefon:</Text>
                                                    <TouchableOpacity onPress={() => handleCall(app.phone)} style={styles.inlineCopy}>
                                                        <Text style={[styles.infoValue, { color: '#007AFF' }]}>{app.phone}</Text>
                                                        <PhoneCall size={12} color="#007AFF" style={{ marginLeft: 4 }} />
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={styles.infoGridCol}>
                                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Aylıq Qazanc:</Text>
                                                    <Text style={[styles.infoValue, { color: '#34C759', fontWeight: 'bold' }]}>
                                                        {Number(app.monthly_income || 0).toLocaleString()} ₼
                                                    </Text>
                                                </View>

                                                <View style={styles.infoGridCol}>
                                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>İş Yeri:</Text>
                                                    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                                                        {app.workplace || '-'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        
                                        {/* Card Footer */}
                                        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                                            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                                📅 {formatDate(app.created_at, { showMonthName: true })}
                                            </Text>
                                            <View style={styles.cardFooterRight}>
                                                <Text style={[styles.detailsLinkText, { color: colors.primary }]}>Ətraflı Bax</Text>
                                                <ChevronRight size={16} color={colors.primary} />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </MotiView>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Detailed Review BottomSheet Modal */}
            <Modal
                visible={reviewModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setReviewModalVisible(false)}
                statusBarTranslucent={true}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setReviewModalVisible(false)} />
                    
                    {selectedApp && (
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.handleContainer}>
                                <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                            </View>

                            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalTitle, { color: colors.text }]}>Müraciət Detalları</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                        Tarix: {formatDate(selectedApp.created_at, { showMonthName: true })}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                                    <XCircle size={22} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Car Header Info */}
                                <View style={[styles.detailSection, { backgroundColor: isDark ? '#1C1C1E' : '#F9F9FB', borderColor: colors.border, borderWidth: 1 }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🚗 Seçilmiş Avtomobil</Text>
                                    {selectedApp.listings ? (
                                        <View style={{ marginTop: 10, gap: 6 }}>
                                            <Text style={{ color: colors.text, fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold' }}>
                                                {selectedApp.listings.make} {selectedApp.listings.model} ({selectedApp.listings.year})
                                            </Text>
                                            <Text style={{ color: colors.primary, fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold' }}>
                                                {selectedApp.listings.price.toLocaleString()} {selectedApp.listings.currency || 'AZN'}
                                            </Text>
                                            <TouchableOpacity 
                                                style={styles.carLinkBtn}
                                                onPress={() => {
                                                    setReviewModalVisible(false);
                                                    router.push(`/listing/${selectedApp.listings.id}` as any);
                                                }}
                                            >
                                                <ExternalLink size={14} color="#007AFF" style={{ marginRight: 6 }} />
                                                <Text style={{ color: '#007AFF', fontSize: 13, fontFamily: 'RethinkSans_700Bold' }}>
                                                    Avtomobil elanına keçid et →
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Avtomobil tapılmadı və ya silinib.</Text>
                                    )}
                                </View>

                                {/* Applicant Info */}
                                <View style={[styles.detailSection, { marginTop: 16 }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>👤 Müştəri Məlumatları</Text>
                                    
                                    <View style={styles.detailRow}>
                                        <User size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>AD, SOYAD və ATA ADI</Text>
                                            <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'RethinkSans_700Bold' }}>
                                                {selectedApp.full_name} {selectedApp.father_name ? `(${selectedApp.father_name})` : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Fingerprint size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>FİN KOD</Text>
                                            <TouchableOpacity onPress={() => handleCopy(selectedApp.fin_code, 'FİN kod')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'RethinkSans_700Bold', letterSpacing: 1 }}>
                                                    {selectedApp.fin_code}
                                                </Text>
                                                <Copy size={14} color={colors.primary} style={{ marginLeft: 6 }} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Calendar size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>DOĞUM TARİXİ</Text>
                                            <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'RethinkSans_700Bold' }}>
                                                {formatDate(selectedApp.birth_date)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Briefcase size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>İŞ YERİ / FƏALİYYƏT</Text>
                                            <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' }}>
                                                {selectedApp.workplace || '-'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <DollarSign size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>AYLIQ QAZANC</Text>
                                            <Text style={{ color: '#34C759', fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold' }}>
                                                {Number(selectedApp.monthly_income || 0).toLocaleString()} ₼
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Phone size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>MOBİL NÖMRƏ</Text>
                                            <TouchableOpacity onPress={() => handleCall(selectedApp.phone)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#007AFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold' }}>
                                                    {selectedApp.phone}
                                                </Text>
                                                <PhoneCall size={14} color="#007AFF" style={{ marginLeft: 6 }} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Info size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>STATUS</Text>
                                            <Text style={{ 
                                                color: getStatusBadge(selectedApp.status).color, 
                                                fontSize: 15, 
                                                fontFamily: 'RethinkSans_700Bold' 
                                            }}>
                                                {getStatusBadge(selectedApp.status).label.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>

                            {/* Quick Action Footer Buttons */}
                            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                                <TouchableOpacity 
                                    style={[styles.callActionBtn, { backgroundColor: '#007AFF' }]}
                                    onPress={() => handleCall(selectedApp.phone)}
                                >
                                    <Phone size={18} color="#FFF" />
                                    <Text style={styles.callActionBtnText}>Zəng et</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.deleteActionBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B30', borderWidth: 1 }]}
                                    onPress={() => deleteApplication(selectedApp.id)}
                                >
                                    <Trash2 size={18} color="#FF3B30" />
                                </TouchableOpacity>

                                {selectedApp.status === 'pending' ? (
                                    <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity 
                                            style={[styles.statusBtn, { backgroundColor: '#FF3B30', flex: 1 }]}
                                            disabled={updating}
                                            onPress={() => updateStatus(selectedApp.id, 'rejected')}
                                        >
                                            <XCircle size={16} color="#FFF" />
                                            <Text style={styles.statusBtnText}>Rədd et</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.statusBtn, { backgroundColor: '#34C759', flex: 1 }]}
                                            disabled={updating}
                                            onPress={() => updateStatus(selectedApp.id, 'approved')}
                                        >
                                            <CheckCircle2 size={16} color="#FFF" />
                                            <Text style={styles.statusBtnText}>Təsdiqlə</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={[styles.statusBtn, { backgroundColor: selectedApp.status === 'approved' ? '#FF3B30' : '#34C759', flex: 1 }]}
                                        disabled={updating}
                                        onPress={() => updateStatus(selectedApp.id, selectedApp.status === 'approved' ? 'rejected' : 'approved')}
                                    >
                                        <Text style={styles.statusBtnText}>
                                            {selectedApp.status === 'approved' ? 'Rədd et kimi dəyiş' : 'Təsdiqlə kimi dəyiş'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderBottomWidth: 1 
    },
    backBtn: { padding: 6 },
    refreshBtn: { padding: 6 },
    headerTitleWrap: { alignItems: 'center' },
    headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold' },
    headerSubtitle: { fontSize: 12, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },
    searchSection: { paddingHorizontal: 16, paddingTop: 12 },
    searchBar: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 14, 
        height: 48,
        borderRadius: 14, 
        borderWidth: 1, 
        gap: 10 
    },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'RethinkSans_500Medium' },
    filterTabsWrapper: { paddingVertical: 10 },
    filterTabs: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
    filterTab: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 14, 
        paddingVertical: 8, 
        borderRadius: 12, 
        borderWidth: 1 
    },
    filterTabText: { fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    list: { padding: 16, gap: 14, paddingBottom: 60 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8 },
    emptyTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
    emptyText: { fontSize: 14, fontFamily: 'RethinkSans_400Regular', textAlign: 'center', paddingHorizontal: 32 },
    appCard: { 
        borderRadius: 20, 
        borderWidth: 1, 
        padding: 16, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 8, 
        elevation: 2 
    },
    appCardHeader: { flexDirection: 'row', alignItems: 'center' },
    carThumb: { width: 48, height: 48, borderRadius: 10, marginRight: 12 },
    carName: { fontSize: 16, fontFamily: 'RethinkSans_800ExtraBold' },
    carPrice: { fontSize: 14, fontFamily: 'RethinkSans_700Bold', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: 'RethinkSans_700Bold' },
    divider: { height: 1 },
    appCardBody: { gap: 10 },
    applicantHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    applicantName: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
    infoGridCol: { width: '50%' },
    infoLabel: { fontSize: 11, fontFamily: 'RethinkSans_500Medium', marginBottom: 2 },
    infoValue: { fontSize: 13, fontFamily: 'RethinkSans_700Bold' },
    inlineCopy: { flexDirection: 'row', alignItems: 'center' },
    cardFooter: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: 12, 
        paddingTop: 10, 
        borderTopWidth: 0.5 
    },
    cardFooterRight: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
    detailsLinkText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold', marginRight: 4 },
    
    // BottomSheet Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '100%',
        maxHeight: '90%',
        maxWidth: 580,
        alignSelf: 'center',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 6,
    },
    handle: {
        width: 44,
        height: 5,
        borderRadius: 3,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        paddingTop: 6,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        padding: 20,
        paddingBottom: 30,
    },
    detailSection: {
        borderRadius: 16,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    carLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 12,
    },
    detailTextContainer: {
        flex: 1,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 10,
        borderTopWidth: 1,
    },
    callActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 14,
        gap: 6,
    },
    callActionBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
    deleteActionBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 14,
        gap: 6,
    },
    statusBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
});
