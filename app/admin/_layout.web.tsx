import React, { useEffect } from 'react';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
    LayoutDashboard,
    Settings,
    Image as ImageIcon,
    Users,
    Bell,
    Star,
    Zap,
    LogOut,
    Menu,
    X,
    MessageSquare,
    PieChart
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { WebHeader } from '../../components/WebHeader.web';

export default function AdminLayoutWeb() {
    const { session, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [menuOpen, setMenuOpen] = React.useState(!isMobile);

    useEffect(() => {
        if (!loading && !session) {
            router.replace('/novo');
        }
    }, [session, loading]);

    useEffect(() => {
        if (!isMobile) {
            setMenuOpen(true);
        } else {
            setMenuOpen(false);
        }
    }, [isMobile]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/novo');
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!session) {
        return null;
    }

    const menuItems = [
        { title: 'Statistika', path: '/admin/statistics', icon: PieChart },
        { title: 'Elanlar', path: '/admin/listings', icon: LayoutDashboard },
        { title: 'VIP Elanlar', path: '/admin/vip-listings', icon: Star },
        { title: 'Təcili Elanlar', path: '/admin/urgent-listings', icon: Zap },
        { title: 'Reklam İdarəetməsi', path: '/admin/banners', icon: ImageIcon },
        { title: 'Marka/Model & Şəhər', path: '/admin/features', icon: MessageSquare },
        { title: 'İstifadəçilər', path: '/admin/add-user', icon: Users },
        { title: 'Bildirişlər', path: '/admin/notifications', icon: Bell },
        { title: 'Ayarlar', path: '/admin/settings', icon: Settings },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, flexDirection: 'column', height: '100vh' as any }}>
            <WebHeader />
            <View style={[styles.container, { paddingTop: isMobile ? 60 : 76 }]}>
                {/* Mobile Menu Toggle */}
                {isMobile && (
                    <TouchableOpacity
                        style={[styles.menuToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={20} color={colors.text} /> : <Menu size={20} color={colors.text} />}
                        <Text style={[styles.menuToggleText, { color: colors.text }]}>Admin Menyu</Text>
                    </TouchableOpacity>
                )}

                {/* Sidebar */}
                {(menuOpen || !isMobile) && (
                    <View style={[
                        styles.sidebar,
                        { backgroundColor: colors.card, borderRightColor: colors.border },
                        isMobile && styles.sidebarMobile
                    ]}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
                            <View style={styles.menuGroup}>
                                <Text style={[styles.menuGroupTitle, { color: colors.textSecondary }]}>İDARƏETMƏ</Text>
                                {menuItems.map((item, index) => {
                                    const Icon = item.icon;
                                    const isActive = pathname.startsWith(item.path);
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.menuItem,
                                                isActive && { backgroundColor: `${colors.primary}15` }
                                            ]}
                                            onPress={() => {
                                                router.push(item.path as any);
                                                if (isMobile) setMenuOpen(false);
                                            }}
                                        >
                                            <Icon size={20} color={isActive ? colors.primary : colors.textSecondary} />
                                            <Text style={[
                                                styles.menuItemText,
                                                { color: isActive ? colors.primary : colors.text },
                                                isActive && { fontFamily: 'RethinkSans_700Bold' }
                                            ]}>
                                                {item.title}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.logoutWrapper}>
                                <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
                                    <LogOut size={20} color="#FF3B30" />
                                    <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Çıxış Et</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* Main Content Area */}
                <View style={[styles.mainContent, { backgroundColor: colors.background }]}>
                    <Slot />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
    },
    menuToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        gap: 8,
    },
    menuToggleText: {
        fontFamily: 'RethinkSans_600SemiBold',
        fontSize: 15,
    },
    sidebar: {
        width: 260,
        borderRightWidth: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    },
    sidebarMobile: {
        position: 'absolute',
        top: 60 + 45, // Web header + toggle height
        left: 0,
        bottom: 0,
        zIndex: 100,
        height: 'auto',
    },
    sidebarContent: {
        paddingVertical: 24,
        paddingHorizontal: 16,
        flexGrow: 1,
    },
    menuGroup: {
        marginBottom: 24,
    },
    menuGroupTitle: {
        fontSize: 12,
        fontFamily: 'RethinkSans_700Bold',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4,
        gap: 12,
    },
    menuItemText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_500Medium',
    },
    logoutWrapper: {
        marginTop: 'auto',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150,150,150,0.1)',
    },
    logoutItem: {
        backgroundColor: 'rgba(255,59,48,0.05)',
    },
    mainContent: {
        flex: 1,
        height: '100%',
        overflow: 'hidden',
    },
});
