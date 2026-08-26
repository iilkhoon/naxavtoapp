import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, TextInput, Platform
} from 'react-native';
import {
    FileText, Search, ArrowLeft, ChevronRight, CheckCircle2, XCircle, Trash2,
    Briefcase, DollarSign, Calendar, Fingerprint, Phone, User, Info, MapPin, X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';

export default function AdminApplicationsWeb() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [applications, setApplications] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    
    // Review Modal/Drawer State
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [reviewVisible, setReviewVisible] = useState(false);
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
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Top Row / Search */}
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
                    
                    <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <FileText size={20} color={colors.primary} />
                        <Text style={[styles.statsText, { color: colors.text }]}>
                            Toplam müraciət: <Text style={{ fontWeight: 'bold' }}>{applications.length}</Text>
                        </Text>
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
                            <View style={{ width: 40 }} />
                        </View>

                        {filteredApps.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={{ color: colors.textSecondary }}>Müraciət tapılmadı</Text>
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
                                                    {app.full_name}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                                    FIN: {app.fin_code}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View style={[styles.cell, { flex: 2 }]}>
                                            <View>
                                                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>
                                                    {carName}
                                                </Text>
                                                {app.listings && (
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                                                        {app.listings.price.toLocaleString()} {app.listings.currency}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <Text style={{ color: colors.text, fontSize: 14 }}>
                                                {app.phone}
                                            </Text>
                                        </View>

                                        <View style={[styles.cell, { flex: 1.2 }]}>
                                            <Text style={{ color: '#34C759', fontWeight: 'bold', fontSize: 14 }}>
                                                {Number(app.monthly_income).toLocaleString()} ₼
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
                                                {formatDate(app.created_at)}
                                            </Text>
                                        </View>

                                        <ChevronRight size={20} color={colors.border} />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Detailed Review Panel / Dialog */}
            {reviewVisible && selectedApp && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setReviewVisible(false)} />
                    
                    <View style={[styles.dialogContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.dialogHeader, { borderBottomColor: colors.border }]}>
                            <View>
                                <Text style={[styles.dialogTitle, { color: colors.text }]}>Müraciət Detalları</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                    ID: {selectedApp.id}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setReviewVisible(false)} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.dialogBody} showsVerticalScrollIndicator={false}>
                            <View style={{ gap: 20, paddingVertical: 8 }}>
                                
                                {/* Car Block */}
                                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>İstənilən Avtomobil</Text>
                                    {selectedApp.listings ? (
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={{ fontSize: 16, color: colors.text, fontWeight: 'bold' }}>
                                                {selectedApp.listings.make} {selectedApp.listings.model} ({selectedApp.listings.year})
                                            </Text>
                                            <Text style={{ fontSize: 17, color: colors.primary, fontWeight: 'bold', marginTop: 4 }}>
                                                Qiymət: {selectedApp.listings.price.toLocaleString()} {selectedApp.listings.currency}
                                            </Text>
                                            <TouchableOpacity 
                                                style={{ marginTop: 10 }}
                                                onPress={() => {
                                                    setReviewVisible(false);
                                                    router.push(`/listing/${selectedApp.listings.id}` as any);
                                                }}
                                            >
                                                <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                                                    Avtomobil elanını vebdə aç →
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Elan silinib və ya mövcud deyil.</Text>
                                    )}
                                </View>

                                {/* Applicant Grid */}
                                <View style={{ gap: 16 }}>
                                    <Text style={{ fontSize: 14, color: colors.text, fontWeight: 'bold' }}>Müraciətçi Məlumatları</Text>
                                    
                                    <View style={styles.gridRow}>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Ad Soyad Ata adı</Text>
                                            <Text style={[styles.gridValue, { color: colors.text }]}>{selectedApp.full_name} {selectedApp.father_name}</Text>
                                        </View>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>FİN Kod</Text>
                                            <Text style={[styles.gridValue, { color: colors.text, letterSpacing: 1 }]}>{selectedApp.fin_code}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.gridRow}>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Doğum Tarixi</Text>
                                            <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(selectedApp.birth_date)}</Text>
                                        </View>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Mobil Telefon</Text>
                                            <Text style={[styles.gridValue, { color: colors.text }]}>{selectedApp.phone}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.gridRow}>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>İşlədiyi yer</Text>
                                            <Text style={[styles.gridValue, { color: colors.text }]}>{selectedApp.workplace}</Text>
                                        </View>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Aylıq Qazanc</Text>
                                            <Text style={[styles.gridValue, { color: '#34C759', fontWeight: 'bold' }]}>{Number(selectedApp.monthly_income).toLocaleString()} ₼</Text>
                                        </View>
                                    </View>

                                    <View style={styles.gridRow}>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Status</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(selectedApp.status).bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                                                <Text style={[styles.statusText, { color: getStatusBadge(selectedApp.status).color }]}>
                                                    {getStatusBadge(selectedApp.status).label.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.gridCol}>
                                            <Text style={styles.gridLabel}>Göndərilmə Tarixi</Text>
                                            <Text style={[styles.gridValue, { color: colors.textSecondary }]}>{formatDate(selectedApp.created_at)}</Text>
                                        </View>
                                    </View>
                                </View>

                            </View>
                        </ScrollView>

                        {/* Actions */}
                        <View style={[styles.dialogActions, { borderTopColor: colors.border }]}>
                            <TouchableOpacity 
                                style={[styles.btnAction, { backgroundColor: 'rgba(255,59,48,0.08)' }]}
                                onPress={() => deleteApplication(selectedApp.id)}
                            >
                                <Trash2 size={16} color="#FF3B30" />
                                <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 14, marginLeft: 6 }}>Müraciəti Sil</Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1 }} />

                            {selectedApp.status === 'pending' && (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity 
                                        style={[styles.btnAction, { backgroundColor: '#FF3B30' }]}
                                        disabled={updating}
                                        onPress={() => updateStatus(selectedApp.id, 'rejected')}
                                    >
                                        <XCircle size={16} color="#FFF" />
                                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 6 }}>Rədd et</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.btnAction, { backgroundColor: '#34C759' }]}
                                        disabled={updating}
                                        onPress={() => updateStatus(selectedApp.id, 'approved')}
                                    >
                                        <CheckCircle2 size={16} color="#FFF" />
                                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14, marginLeft: 6 }}>Təsdiqlə</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingHorizontal: 40,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'RethinkSans_400Regular',
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 40,
        paddingTop: 24,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
        outlineStyle: 'none',
    } as any,
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    statsText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
    },
    tableCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        padding: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
    },
    columnHeader: {
        fontSize: 13,
        fontFamily: 'RethinkSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableRow: {
        flexDirection: 'row',
        padding: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        alignItems: 'center',
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
        marginRight: 12,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_700Bold',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    loadingContainer: {
        padding: 100,
        alignItems: 'center',
    },
    
    // Dialog modal
    modalOverlay: {
        position: Platform.OS === 'web' ? 'fixed' : 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    } as any,
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    dialogContainer: {
        width: '90%',
        maxWidth: 600,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 10000,
    } as any,
    dialogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 24,
        borderBottomWidth: 1,
    },
    dialogTitle: {
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
    dialogBody: {
        padding: 24,
        maxHeight: 450,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 16,
    },
    gridCol: {
        flex: 1,
        gap: 4,
    },
    gridLabel: {
        fontSize: 11,
        fontFamily: 'RethinkSans_600SemiBold',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    gridValue: {
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
    dialogActions: {
        flexDirection: 'row',
        padding: 24,
        borderTopWidth: 1,
        gap: 10,
        alignItems: 'center',
    },
    btnAction: {
        height: 44,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    }
});
