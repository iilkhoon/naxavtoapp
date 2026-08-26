import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import {
    PieChart,
    MessageSquare,
    LayoutDashboard,
    Star,
    Zap,
    ImageIcon,
    Users,
    Bell,
    Settings,
    LogOut,
    PlusCircle,
    FileText
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const DashboardCard = ({ title, icon: Icon, onPress, color, colors, badge }: any) => (
    <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 400 }}
    >
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            {badge !== undefined && badge > 0 && (
                <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{badge}</Text>
                </View>
            )}
            <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
                <Icon size={24} color={color} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        </TouchableOpacity>
    </MotiView>
);

export default function AdminDashboard() {
    const router = useRouter();
    const { colors } = useTheme();
    const { isSuperAdmin } = useAuth();
    const [pendingApplications, setPendingApplications] = useState(0);

    useEffect(() => {
        const fetchPendingApps = async () => {
            try {
                const { count, error } = await supabase
                    .from('credit_applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending');
                if (!error && count !== null) {
                    setPendingApplications(count);
                }
            } catch (e) {
                console.error(e);
            }
        };

        fetchPendingApps();

        const channel = supabase
            .channel('admin_dashboard_credit_count')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'credit_applications' },
                () => {
                    fetchPendingApps();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const allMenuItems = [
        { title: 'Statistika', path: '/admin/statistics', icon: PieChart, color: '#AF52DE' },
        { title: 'Kredit Paneli', path: '/admin/loans', icon: PlusCircle, color: '#00C7BE', superAdminOnly: true },
        { title: 'Kredit Müraciətləri', path: '/admin/applications', icon: FileText, color: '#FF9500', badge: pendingApplications },
        { title: 'Canlı Çat', path: '/admin/chats', icon: MessageSquare, color: '#007AFF' },
        { title: 'Elanlar', path: '/admin/listings', icon: LayoutDashboard, color: '#34C759' },
        { title: 'VIP Elanlar', path: '/admin/vip-listings', icon: Star, color: '#FFD700' },
        { title: 'Təcili Elanlar', path: '/admin/urgent-listings', icon: Zap, color: '#FF3B30' },
        { title: 'Reklamlar', path: '/admin/banners', icon: ImageIcon, color: '#FF9500' },
        { title: 'Admin İstifadəçilər', path: '/admin/users', icon: Users, color: '#5856D6', superAdminOnly: true },
        { title: 'Bildirişlər', path: '/admin/notifications', icon: Bell, color: '#FF2D55' },
        { title: 'Ayarlar', path: '/admin/settings', icon: Settings, color: '#8E8E93' },
    ];

    const menuItems = allMenuItems.filter(item => !item.superAdminOnly || isSuperAdmin);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/novo');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Xoş gəlmisiniz!</Text>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Paneli</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                    {menuItems.map((item, index) => (
                        <View key={index} style={styles.gridCol}>
                            <DashboardCard
                                {...item}
                                colors={colors}
                                onPress={() => router.push(item.path as any)}
                            />
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.logoutBtn, { borderTopColor: colors.border }]}
                    onPress={handleLogout}
                >
                    <LogOut size={20} color="#FF3B30" />
                    <Text style={styles.logoutText}>Çıxış Et</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
    },
    headerSub: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    gridCol: {
        width: '50%',
        padding: 8,
    },
    card: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 140,
        position: 'relative',
    },
    cardBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FF3B30',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontFamily: 'RethinkSans_700Bold',
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
        textAlign: 'center',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        paddingTop: 32,
        borderTopWidth: 1,
        gap: 10,
    },
    logoutText: {
        fontSize: 16,
        color: '#FF3B30',
        fontFamily: 'RethinkSans_700Bold',
    },
});
