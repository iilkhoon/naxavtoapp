import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, Mail, Phone, Calendar, Shield, 
    Car, Hash, CreditCard, ChevronRight, AlertCircle
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';
import { MotiView } from 'moti';
import { useAuth } from '../../contexts/AuthContext';

export default function UserDetailMobile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { isSuperAdmin, session, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [stats, setStats] = useState({ listings: 0, plates: 0, loans: 0 });

    useEffect(() => {
        if (!authLoading) {
            if (!isSuperAdmin) {
                showToast('Bu səhifəyə yalnız superadminlər daxil ola bilər!', 'error');
                router.back();
            } else if (id) {
                fetchUserData();
            }
        }
    }, [id, isSuperAdmin, authLoading]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError) throw profileError;
            setUserProfile(profile);

            // Fetch counts
            const [listingCount, plateCount, loanCount] = await Promise.all([
                supabase.from('listings').select('id', { count: 'exact', head: true }).or(`user_id.eq.${id},contact_phone.eq.${profile.phone}`),
                supabase.from('plates').select('id', { count: 'exact', head: true }).or(`user_id.eq.${id},contact_phone.eq.${profile.phone}`),
                supabase.from('loan_accounts').select('id', { count: 'exact', head: true }).or(`customer_user_id.eq.${id},customer_phone.eq.${profile.phone}`)
            ]);

            setStats({
                listings: listingCount.count || 0,
                plates: plateCount.count || 0,
                loans: loanCount.count || 0
            });
        } catch (e: any) {
            showToast('Xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleSuperAdmin = async () => {
        setActionLoading(true);
        try {
            const nextStatus = !userProfile.is_superadmin;
            const { error } = await supabase
                .from('profiles')
                .update({ is_superadmin: nextStatus })
                .eq('id', id);

            if (error) throw error;

            showToast(nextStatus ? 'İstifadəçiyə superadmin statusu verildi!' : 'Superadmin statusu ləğv edildi!', 'success');
            setUserProfile((prev: any) => ({ ...prev, is_superadmin: nextStatus }));
        } catch (e: any) {
            showToast('Xəta: ' + e.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        Alert.alert(
            'Admini Sil',
            'Bu istifadəçinin admin icazəsini tamamilə silmək istədiyinizə əminsiniz?',
            [
                { text: 'Ləğv et', style: 'cancel' },
                {
                    text: 'Bəli, Sil',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            // Demote admin to simple user
                            const { error } = await supabase
                                .from('profiles')
                                .update({ role: 'user', is_superadmin: false })
                                .eq('id', id);

                            if (error) throw error;

                            showToast('Admin icazələri ləğv edildi', 'success');
                            router.back();
                        } catch (e: any) {
                            showToast('Xəta: ' + e.message, 'error');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (authLoading || (loading && !userProfile)) {
        return (
            <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    if (!userProfile) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <AlertCircle size={48} color="#FF3B30" />
                <Text style={[styles.errorText, { color: colors.text }]}>İstifadəçi tapılmadı</Text>
            </View>
        );
    }

    const StatItem = ({ icon: Icon, label, value, color }: any) => (
        <TouchableOpacity style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            </View>
            <ChevronRight size={18} color={colors.border} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>İstifadəçi</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.profileSection}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>{userProfile.full_name?.charAt(0) || 'U'}</Text>
                    </View>
                    <Text style={[styles.name, { color: colors.text }]}>{userProfile.full_name || 'Adsız'}</Text>
                    <Text style={[styles.email, { color: colors.textSecondary }]}>{userProfile.email}</Text>
                    <View style={[styles.badge, { backgroundColor: userProfile.is_superadmin ? '#AF52DE15' : '#FF3B3015' }]}>
                        <Text style={[styles.badgeText, { color: userProfile.is_superadmin ? '#AF52DE' : '#FF3B30' }]}>
                            {userProfile.is_superadmin ? 'Superadmin' : 'Admin'}
                        </Text>
                    </View>
                </MotiView>

                <View style={styles.infoSection}>
                    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.infoRow}>
                            <Phone size={18} color={colors.textSecondary} />
                            <Text style={[styles.infoValue, { color: colors.text }]}>{userProfile.phone || '-'}</Text>
                        </View>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <View style={styles.infoRow}>
                            <Calendar size={18} color={colors.textSecondary} />
                            <Text style={[styles.infoValue, { color: colors.text }]}>Qeydiyyat: {formatDate(userProfile.created_at)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MƏLUMATLAR</Text>
                    <StatItem icon={Car} label="Elanlar" value={stats.listings} color="#FF9500" />
                    <StatItem icon={Hash} label="Nömrələr" value={stats.plates} color="#5856D6" />
                    <StatItem icon={CreditCard} label="Kreditlər" value={stats.loans} color="#007AFF" />
                </View>

                {isSuperAdmin && userProfile.id !== session?.user?.id && (
                    <View style={styles.actionsSection}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24, marginBottom: 12 }]}>İDARƏETMƏ</Text>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                            onPress={toggleSuperAdmin}
                            disabled={actionLoading}
                        >
                            <Shield size={20} color={colors.primary} />
                            <Text style={[styles.actionBtnText, { color: colors.text }]}>
                                {userProfile.is_superadmin ? 'Superadmin Statusunu Al' : 'Superadmin Statusu Ver'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#FF3B3010', borderColor: '#FF3B30', borderWidth: 1, marginTop: 12 }]}
                            onPress={handleDeleteUser}
                            disabled={actionLoading}
                        >
                            <Shield size={20} color="#FF3B30" />
                            <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>
                                Admin İcazəsini Ləğv Et (Sil)
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
    content: { padding: 20 },
    profileSection: { alignItems: 'center', marginBottom: 30 },
    avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
    name: { fontSize: 22, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 4 },
    email: { fontSize: 14, fontFamily: 'RethinkSans_400Regular', marginBottom: 12 },
    badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
    infoSection: { marginBottom: 30 },
    infoCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    infoValue: { fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
    separator: { height: 1, marginVertical: 4 },
    statsSection: { gap: 12 },
    sectionTitle: { fontSize: 12, fontFamily: 'RethinkSans_700Bold', marginBottom: 4, letterSpacing: 1 },
    statItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
    statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statLabel: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
    statValue: { fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
    errorText: { fontSize: 16, marginTop: 12 },
    actionsSection: { marginTop: 16, gap: 4 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: 16, paddingHorizontal: 16, gap: 12, justifyContent: 'center' },
    actionBtnText: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' }
});
