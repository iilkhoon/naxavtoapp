import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, TextInput, SafeAreaView,
    Modal, Platform, Dimensions, Alert
} from 'react-native';
import {
    FileText, Search, ArrowLeft, ChevronRight, CheckCircle2, XCircle, Trash2,
    Briefcase, DollarSign, Calendar, Fingerprint, Phone, User, Info, MapPin
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { MotiView } from 'moti';
import { formatDate } from '../../lib/utils';

export default function AdminApplications() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    
    // Detailed Review Modal State
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredApps(applications);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = applications.filter(app => 
            (app.full_name?.toLowerCase().includes(query)) || 
            (app.fin_code?.toLowerCase().includes(query)) ||
            (app.listings?.make?.toLowerCase().includes(query)) ||
            (app.listings?.model?.toLowerCase().includes(query))
        );
        setFilteredApps(filtered);
    }, [searchQuery, applications]);

    const fetchApplications = async () => {
        setLoading(true);
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
            setFilteredApps(data || []);
        } catch (e: any) {
            showToast('Müraciətlər yüklənərkən xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
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
            
            // Update local state
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
            'Bu müraciəti silmək istədiyinizdən əminsiniz? Bu əməliyyat geri qaytarıla bilməz.',
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Kredit Müraciətləri</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Search size={20} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Müştəri adı və ya FİN kod ilə axtar..."
                        placeholderTextColor={colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {filteredApps.length === 0 ? (
                        <View style={styles.empty}>
                            <FileText size={48} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Müraciət tapılmadı</Text>
                        </View>
                    ) : (
                        filteredApps.map((app, index) => {
                            const badge = getStatusBadge(app.status);
                            const carName = app.listings ? `${app.listings.make} ${app.listings.model}` : 'Bilinməyən Avtomobil';
                            return (
                                <MotiView
                                    key={app.id}
                                    from={{ opacity: 0, translateY: 10 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ delay: index * 50 }}
                                >
                                    <TouchableOpacity 
                                        style={[styles.appCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => {
                                            setSelectedApp(app);
                                            setReviewModalVisible(true);
                                        }}
                                    >
                                        <View style={styles.appCardHeader}>
                                            <Text style={[styles.carName, { color: colors.text }]} numberOfLines={1}>
                                                🚗 {carName} {app.listings ? `(${app.listings.year})` : ''}
                                            </Text>
                                            <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                                            </View>
                                        </View>

                                        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 10 }]} />

                                        <View style={styles.appCardBody}>
                                            <Text style={[styles.applicantName, { color: colors.text }]}>
                                                👤 {app.full_name} {app.father_name ? `${app.father_name}` : ''}
                                            </Text>
                                            <View style={styles.infoGrid}>
                                                <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                                                    💳 FİN: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{app.fin_code}</Text>
                                                </Text>
                                                <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                                                    📞 Tel: <Text style={{ color: colors.text }}>{app.phone}</Text>
                                                </Text>
                                                <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                                                    💼 İş: <Text style={{ color: colors.text }} numberOfLines={1}>{app.workplace}</Text>
                                                </Text>
                                                <Text style={[styles.infoItem, { color: colors.textSecondary }]}>
                                                    💰 Qazanc: <Text style={{ color: '#34C759', fontWeight: 'bold' }}>{Number(app.monthly_income).toLocaleString()} ₼</Text>
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={styles.cardFooter}>
                                            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                                📅 {formatDate(app.created_at, { showMonthName: true })}
                                            </Text>
                                            <ChevronRight size={16} color={colors.textSecondary} />
                                        </View>
                                    </TouchableOpacity>
                                </MotiView>
                            );
                        })
                    )}
                </ScrollView>
            )}

            {/* Detailed Review Modal (BottomSheet Style) */}
            <Modal
                visible={reviewModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setReviewModalVisible(false)}
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
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                                        Müraciət ID: {selectedApp.id.substring(0, 8).toUpperCase()}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                                    <XCircle size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                                {/* Car Header Info */}
                                <View style={[styles.detailSection, { backgroundColor: colors.background, borderRadius: 16, padding: 16 }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🚗 Avtomobil Məlumatları</Text>
                                    {selectedApp.listings ? (
                                        <View style={{ marginTop: 10, gap: 4 }}>
                                            <Text style={{ color: colors.text, fontSize: 17, fontFamily: 'RethinkSans_800ExtraBold' }}>
                                                {selectedApp.listings.make} {selectedApp.listings.model} ({selectedApp.listings.year})
                                            </Text>
                                            <Text style={{ color: colors.primary, fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold', marginTop: 4 }}>
                                                Qiymət: {selectedApp.listings.price.toLocaleString()} {selectedApp.listings.currency}
                                            </Text>
                                            <TouchableOpacity 
                                                style={{ marginTop: 8 }}
                                                onPress={() => {
                                                    setReviewModalVisible(false);
                                                    router.push(`/listing/${selectedApp.listings.id}` as any);
                                                }}
                                            >
                                                <Text style={{ color: '#007AFF', fontSize: 14, fontFamily: 'RethinkSans_700Bold', textDecorationLine: 'underline' }}>
                                                    Avtomobil elanına get →
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
                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>AD, SOYAD və ATA ADI</Text>
                                            <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'RethinkSans_700Bold' }}>
                                                {selectedApp.full_name} {selectedApp.father_name}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Fingerprint size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>FİN KOD</Text>
                                            <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'RethinkSans_700Bold', letterSpacing: 1 }}>
                                                {selectedApp.fin_code}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Calendar size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>DOĞUM TARİXİ</Text>
                                            <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'RethinkSans_700Bold' }}>
                                                {formatDate(selectedApp.birth_date)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Briefcase size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>İŞLƏDİYİ YER</Text>
                                            <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'RethinkSans_600SemiBold' }}>
                                                {selectedApp.workplace}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <DollarSign size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>AYLIQ QAZANC</Text>
                                            <Text style={{ color: '#34C759', fontSize: 17, fontFamily: 'RethinkSans_800ExtraBold' }}>
                                                {Number(selectedApp.monthly_income).toLocaleString()} Borcsuz / ₼
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Phone size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>MOBİL NÖMRƏ</Text>
                                            <Text style={{ color: colors.text, fontSize: 15, fontFamily: 'RethinkSans_700Bold' }}>
                                                {selectedApp.phone}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Info size={18} color={colors.textSecondary} />
                                        <View style={styles.detailTextContainer}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>MÜRACİƏT STATUSU</Text>
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

                            {/* Action Buttons */}
                            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                                <TouchableOpacity 
                                    style={[styles.actionButton, { backgroundColor: '#FF3B3015', borderColor: '#FF3B30', borderWidth: 1 }]}
                                    onPress={() => deleteApplication(selectedApp.id)}
                                >
                                    <Trash2 size={20} color="#FF3B30" />
                                    <Text style={{ color: '#FF3B30', fontFamily: 'RethinkSans_700Bold', marginLeft: 6 }}>Sil</Text>
                                </TouchableOpacity>

                                {selectedApp.status === 'pending' && (
                                    <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity 
                                            style={[styles.actionButton, { backgroundColor: '#FF3B30', flex: 1 }]}
                                            disabled={updating}
                                            onPress={() => updateStatus(selectedApp.id, 'rejected')}
                                        >
                                            <XCircle size={20} color="#FFF" />
                                            <Text style={{ color: '#FFF', fontFamily: 'RethinkSans_700Bold', marginLeft: 6 }}>Rədd et</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.actionButton, { backgroundColor: '#34C759', flex: 1 }]}
                                            disabled={updating}
                                            onPress={() => updateStatus(selectedApp.id, 'approved')}
                                        >
                                            <CheckCircle2 size={20} color="#FFF" />
                                            <Text style={{ color: '#FFF', fontFamily: 'RethinkSans_700Bold', marginLeft: 6 }}>Təsdiqlə</Text>
                                        </TouchableOpacity>
                                    </View>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
    searchSection: { padding: 16 },
    searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, gap: 14 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 120, gap: 12 },
    emptyText: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
    appCard: { borderRadius: 20, borderWidth: 1, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    appCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    carName: { fontSize: 16, fontFamily: 'RethinkSans_800ExtraBold', flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontFamily: 'RethinkSans_700Bold' },
    divider: { height: 1 },
    appCardBody: { gap: 8 },
    applicantName: { fontSize: 15, fontFamily: 'RethinkSans_700Bold', marginBottom: 4 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
    infoItem: { width: '50%', fontSize: 13, fontFamily: 'RethinkSans_500Medium' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(150,150,150,0.15)' },
    dateText: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
    
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
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        width: '100%',
    },
    handle: {
        width: 48,
        height: 5,
        borderRadius: 3,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
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
        padding: 24,
        gap: 16,
    },
    detailSection: {
        paddingVertical: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
    },
    detailTextContainer: {
        flex: 1,
        gap: 2,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        gap: 10,
    },
    actionButton: {
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    }
});
