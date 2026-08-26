import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, Image, Platform, useWindowDimensions
} from 'react-native';
import {
    ArrowLeft, Mail, Phone, Calendar, Shield, 
    Car, Hash, CreditCard, ChevronRight, Clock,
    CheckCircle, AlertCircle, Trash2, ExternalLink
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';

type TabType = 'listings' | 'plates' | 'loans';

export default function UserDetailWeb() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [listings, setListings] = useState<any[]>([]);
    const [plates, setPlates] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('listings');

    useEffect(() => {
        if (id) {
            fetchUserData();
        }
    }, [id]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError) throw profileError;
            setUserProfile(profile);

            // 2. Fetch Listings
            // We'll try user_id then contact_phone as fallback
            const { data: userListings, error: listingsError } = await supabase
                .from('listings')
                .select('*')
                .or(`user_id.eq.${id},contact_phone.eq.${profile.phone}`)
                .order('created_at', { ascending: false });
            
            setListings(userListings || []);

            // 3. Fetch Plates
            const { data: userPlates, error: platesError } = await supabase
                .from('plates')
                .select('*')
                .or(`user_id.eq.${id},contact_phone.eq.${profile.phone}`)
                .order('created_at', { ascending: false });

            setPlates(userPlates || []);

            // 4. Fetch Loans
            const { data: userLoans, error: loansError } = await supabase
                .from('loan_accounts')
                .select('*')
                .or(`customer_user_id.eq.${id},customer_phone.eq.${profile.phone}`)
                .order('created_at', { ascending: false });

            setLoans(userLoans || []);

        } catch (e: any) {
            showToast('Məlumatlar yüklənərkən xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!userProfile) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <AlertCircle size={48} color="#FF3B30" />
                <Text style={[styles.errorText, { color: colors.text }]}>İstifadəçi tapılmadı</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={{ color: colors.primary }}>Geri qayıt</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'listings':
                return (
                    <View style={styles.tabPane}>
                        {listings.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Car size={40} color={colors.border} />
                                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Elan yoxdur</Text>
                            </View>
                        ) : (
                            <View style={styles.grid}>
                                {listings.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => router.push(`/listing/${item.id}` as any)}
                                    >
                                        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                                        <View style={styles.itemInfo}>
                                            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                                                {item.make} {item.model}
                                            </Text>
                                            <Text style={[styles.itemPrice, { color: colors.primary }]}>
                                                {item.price} AZN
                                            </Text>
                                            <View style={styles.itemMeta}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.year}</Text>
                                                <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#34C75920' : '#FF950020' }]}>
                                                    <Text style={[styles.statusText, { color: item.status === 'approved' ? '#34C759' : '#FF9500' }]}>
                                                        {item.status === 'approved' ? 'Aktiv' : 'Gözləyir'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                );
            case 'plates':
                return (
                    <View style={styles.tabPane}>
                        {plates.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Hash size={40} color={colors.border} />
                                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Nömrə yoxdur</Text>
                            </View>
                        ) : (
                            <View style={styles.grid}>
                                {plates.map((item) => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => router.push(`/plate/${item.id}` as any)}
                                    >
                                        <View style={styles.platePlaceholder}>
                                            <Text style={styles.plateText}>{item.region} {item.series} {item.number}</Text>
                                        </View>
                                        <View style={styles.itemInfo}>
                                            <Text style={[styles.itemPrice, { color: colors.primary }]}>
                                                {item.price} AZN
                                            </Text>
                                            <View style={styles.itemMeta}>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(item.created_at)}</Text>
                                                <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#34C75920' : '#FF950020' }]}>
                                                    <Text style={[styles.statusText, { color: item.status === 'approved' ? '#34C759' : '#FF9500' }]}>
                                                        {item.status === 'approved' ? 'Aktiv' : 'Gözləyir'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                );
            case 'loans':
                return (
                    <View style={styles.tabPane}>
                        {loans.length === 0 ? (
                            <View style={styles.emptyState}>
                                <CreditCard size={40} color={colors.border} />
                                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Kredit yoxdur</Text>
                            </View>
                        ) : (
                            <View style={styles.loanList}>
                                {loans.map((loan) => (
                                    <TouchableOpacity 
                                        key={loan.id} 
                                        style={[styles.loanCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => router.push(`/admin/loan-detail/${loan.id}` as any)}
                                    >
                                        <View style={styles.loanHeader}>
                                            <View style={styles.loanIcon}>
                                                <Car size={20} color={colors.primary} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.loanTitle, { color: colors.text }]}>
                                                    {loan.car_brand} {loan.car_model}
                                                </Text>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                                    {loan.car_plate} • {loan.car_year}
                                                </Text>
                                            </View>
                                            <View style={[styles.loanStatus, { backgroundColor: loan.status === 'active' ? '#007AFF20' : '#34C75920' }]}>
                                                <Text style={{ color: loan.status === 'active' ? '#007AFF' : '#34C759', fontWeight: 'bold', fontSize: 12 }}>
                                                    {loan.status === 'active' ? 'Aktiv' : 'Bağlanıb'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.loanStats}>
                                            <View style={styles.loanStatItem}>
                                                <Text style={styles.loanStatLabel}>Məbləğ</Text>
                                                <Text style={[styles.loanStatValue, { color: colors.text }]}>{loan.loan_amount} AZN</Text>
                                            </View>
                                            <View style={styles.loanStatItem}>
                                                <Text style={styles.loanStatLabel}>Ödəniş</Text>
                                                <Text style={[styles.loanStatValue, { color: colors.text }]}>{loan.monthly_payment} AZN</Text>
                                            </View>
                                            <View style={styles.loanStatItem}>
                                                <Text style={styles.loanStatLabel}>Müddət</Text>
                                                <Text style={[styles.loanStatValue, { color: colors.text }]}>{loan.loan_term} ay</Text>
                                            </View>
                                        </View>
                                        <View style={styles.loanFooter}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                                Başlanğıc: {formatDate(loan.created_at)}
                                            </Text>
                                            <ChevronRight size={16} color={colors.border} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Top Navigation */}
            <View style={[styles.navHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.navTitle, { color: colors.text }]}>İstifadəçi Təfərrüatları</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainLayout}>
                    {/* Left Column: User Profile Info */}
                    <View style={[styles.leftCol, isMobile && { width: '100%', marginBottom: 24 }]}>
                        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.profileHeader, { backgroundColor: colors.primary + '10' }]}>
                                <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.avatarLargeText}>
                                        {userProfile.full_name?.charAt(0) || userProfile.email?.charAt(0).toUpperCase() || 'U'}
                                    </Text>
                                </View>
                                <Text style={[styles.profileName, { color: colors.text }]}>
                                    {userProfile.full_name || 'Adsız İstifadəçi'}
                                </Text>
                                <View style={[styles.roleBadgeLarge, { backgroundColor: userProfile.role === 'admin' ? '#FF3B3020' : '#34C75920' }]}>
                                    <Shield size={14} color={userProfile.role === 'admin' ? '#FF3B30' : '#34C759'} style={{ marginRight: 6 }} />
                                    <Text style={[styles.roleTextLarge, { color: userProfile.role === 'admin' ? '#FF3B30' : '#34C759' }]}>
                                        {userProfile.role === 'admin' ? 'Administrator' : 'İstifadəçi'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.profileBody}>
                                <View style={styles.infoRow}>
                                    <Mail size={18} color={colors.textSecondary} />
                                    <View style={styles.infoTextGroup}>
                                        <Text style={styles.infoLabel}>Email</Text>
                                        <Text style={[styles.infoValue, { color: colors.text }]}>{userProfile.email}</Text>
                                    </View>
                                </View>
                                <View style={styles.infoRow}>
                                    <Phone size={18} color={colors.textSecondary} />
                                    <View style={styles.infoTextGroup}>
                                        <Text style={styles.infoLabel}>Telefon</Text>
                                        <Text style={[styles.infoValue, { color: colors.text }]}>{userProfile.phone || 'Qeyd edilməyib'}</Text>
                                    </View>
                                </View>
                                <View style={styles.infoRow}>
                                    <Calendar size={18} color={colors.textSecondary} />
                                    <View style={styles.infoTextGroup}>
                                        <Text style={styles.infoLabel}>Qeydiyyat</Text>
                                        <Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(userProfile.created_at)}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.profileFooter, { borderTopColor: colors.border }]}>
                                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.actionButtonText}>Şifrəni Sıfırla</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)', marginTop: 8 }]}>
                                    <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Hesabı Blokla</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.quickStatsRow}>
                            <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.miniStatValue, { color: colors.text }]}>{listings.length}</Text>
                                <Text style={styles.miniStatLabel}>Elan</Text>
                            </View>
                            <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.miniStatValue, { color: colors.text }]}>{plates.length}</Text>
                                <Text style={styles.miniStatLabel}>Nömrə</Text>
                            </View>
                            <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.miniStatValue, { color: colors.text }]}>{loans.length}</Text>
                                <Text style={styles.miniStatLabel}>Kredit</Text>
                            </View>
                        </View>
                    </View>

                    {/* Right Column: Content Tabs */}
                    <View style={styles.rightCol}>
                        <View style={[styles.tabsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.tabHeader, { borderBottomColor: colors.border }]}>
                                <TouchableOpacity 
                                    style={[styles.tabBtn, activeTab === 'listings' && { borderBottomColor: colors.primary }]}
                                    onPress={() => setActiveTab('listings')}
                                >
                                    <Car size={18} color={activeTab === 'listings' ? colors.primary : colors.textSecondary} />
                                    <Text style={[styles.tabBtnText, { color: activeTab === 'listings' ? colors.primary : colors.textSecondary }]}>Avtomobillər</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.tabBtn, activeTab === 'plates' && { borderBottomColor: colors.primary }]}
                                    onPress={() => setActiveTab('plates')}
                                >
                                    <Hash size={18} color={activeTab === 'plates' ? colors.primary : colors.textSecondary} />
                                    <Text style={[styles.tabBtnText, { color: activeTab === 'plates' ? colors.primary : colors.textSecondary }]}>Nömrələr</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.tabBtn, activeTab === 'loans' && { borderBottomColor: colors.primary }]}
                                    onPress={() => setActiveTab('loans')}
                                >
                                    <CreditCard size={18} color={activeTab === 'loans' ? colors.primary : colors.textSecondary} />
                                    <Text style={[styles.tabBtnText, { color: activeTab === 'loans' ? colors.primary : colors.textSecondary }]}>Kreditlər</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.tabContent}>
                                {renderTabContent()}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
        marginTop: 16,
        marginBottom: 24,
    },
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingHorizontal: 40,
        borderBottomWidth: 1,
    },
    backIconBtn: {
        padding: 8,
        borderRadius: 12,
    },
    navTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 40,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    mainLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 32,
    },
    leftCol: {
        width: 320,
    },
    rightCol: {
        flex: 1,
        minWidth: 500,
    },
    profileCard: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24,
    },
    profileHeader: {
        padding: 32,
        alignItems: 'center',
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        boxShadow: '0px 8px 16px rgba(0,0,0,0.1)',
    },
    avatarLargeText: {
        color: '#FFF',
        fontSize: 40,
        fontWeight: 'bold',
    },
    profileName: {
        fontSize: 22,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 8,
        textAlign: 'center',
    },
    roleBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    roleTextLarge: {
        fontSize: 13,
        fontFamily: 'RethinkSans_700Bold',
    },
    profileBody: {
        padding: 24,
        gap: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    infoTextGroup: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'RethinkSans_500Medium',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    profileFooter: {
        padding: 24,
        borderTopWidth: 1,
    },
    actionButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
    quickStatsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    miniStat: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    miniStatValue: {
        fontSize: 20,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    miniStatLabel: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'RethinkSans_500Medium',
    },
    tabsCard: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 600,
    },
    tabHeader: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
    },
    tabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabBtnText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    tabContent: {
        flex: 1,
        padding: 32,
    },
    tabPane: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        opacity: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    itemCard: {
        width: 240,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: 140,
        backgroundColor: '#EEE',
    },
    platePlaceholder: {
        width: '100%',
        height: 100,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    plateText: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    itemInfo: {
        padding: 16,
    },
    itemTitle: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 16,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 8,
    },
    itemMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'RethinkSans_700Bold',
    },
    loanList: {
        gap: 16,
    },
    loanCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
    },
    loanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    loanIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loanTitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
    },
    loanStatus: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    loanStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.02)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    loanStatItem: {
        alignItems: 'center',
    },
    loanStatLabel: {
        fontSize: 11,
        color: '#999',
        marginBottom: 4,
    },
    loanStatValue: {
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
    loanFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        marginTop: 12,
    }
});
