import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Sun, Moon, Plus, Menu, X, User } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebTokens, useBreakpoints, HEADER_HEIGHT, CONTENT_MAX_WIDTH, FONT, GroupedList, ListRow, Button } from './web/WebKit';

const NAV_LINKS = [
    { label: 'Elanlar', href: '/' },
    { label: 'Seçilmişlər', href: '/favorites' },
    { label: 'Müqayisə', href: '/compare' },
    { label: 'Kredit', href: '/calculator' },
    { label: 'Əlaqə', href: '/contact' },
];

// Translucent Apple-style bar: logo, quiet text links, one accent action
export function WebHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { isDark, toggleTheme } = useTheme();
    const { settings } = useSettings();
    const { user, isAdmin } = useAuth();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const [menuOpen, setMenuOpen] = useState(false);

    const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;
    const accountLabel = user ? (isAdmin ? 'Admin panel' : 'Kreditlərim') : 'Daxil ol';
    const accountHref = user ? (isAdmin ? '/admin' : '/my-loans') : '/auth/login';

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/' || pathname === '/index' || pathname.startsWith('/listing') || pathname.startsWith('/plate');
        return pathname.startsWith(href);
    };

    const go = (href: string) => {
        setMenuOpen(false);
        router.push(href as any);
    };

    return (
        <View style={styles.fixed}>
            <View style={[styles.bar, {
                height: isMobile ? HEADER_HEIGHT.mobile : HEADER_HEIGHT.desktop,
                backgroundColor: isDark ? 'rgba(22,22,23,0.8)' : 'rgba(255,255,255,0.8)',
                borderBottomColor: t.hairline,
            }]}>
                <View style={[styles.inner, { paddingHorizontal: isMobile ? 16 : 32 }]}>
                    <TouchableOpacity onPress={() => go('/')} accessibilityLabel="Naxçıvan Avto — ana səhifə" style={styles.logo}>
                        {logoUrl ? (
                            <Image
                                source={{ uri: logoUrl }}
                                accessibilityLabel="Naxçıvan Avto"
                                style={isMobile ? { width: 84, height: 34 } : { width: 96, height: 38 }}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={[styles.wordmark, { color: t.text }]}>
                                Naxçıvan<Text style={{ color: t.accent }}> Avto</Text>
                            </Text>
                        )}
                    </TouchableOpacity>

                    {!isMobile && (
                        <View role="navigation" style={styles.nav}>
                            {NAV_LINKS.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <TouchableOpacity
                                        key={link.href}
                                        onPress={() => go(link.href)}
                                        style={[styles.navItem, active && { backgroundColor: t.fill }]}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        <Text style={[styles.navText, {
                                            color: active ? t.text : t.textSecondary,
                                            fontFamily: active ? FONT.semibold : FONT.medium,
                                        }]}>
                                            {link.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            accessibilityLabel={isDark ? 'İşıqlı rejim' : 'Qaranlıq rejim'}
                            style={[styles.iconBtn, { backgroundColor: t.fill }]}
                        >
                            {isDark ? <Sun size={17} color={t.text} /> : <Moon size={17} color={t.text} />}
                        </TouchableOpacity>

                        {!isMobile && (
                            <TouchableOpacity onPress={() => go(accountHref)} style={styles.accountBtn}>
                                <User size={16} color={t.textSecondary} />
                                <Text style={[styles.accountText, { color: t.text }]}>{accountLabel}</Text>
                            </TouchableOpacity>
                        )}

                        {!isMobile && (
                            <Button title="Elan ver" size="sm" icon={<Plus size={15} color="#FFF" strokeWidth={2.6} />} onPress={() => go('/add-listing')} style={{ height: 34, paddingHorizontal: 14 }} />
                        )}

                        {isMobile && (
                            <TouchableOpacity
                                onPress={() => setMenuOpen((v) => !v)}
                                accessibilityLabel={menuOpen ? 'Menyunu bağla' : 'Menyu'}
                                style={[styles.iconBtn, { backgroundColor: t.fill }]}
                            >
                                {menuOpen ? <X size={19} color={t.text} /> : <Menu size={19} color={t.text} />}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {isMobile && menuOpen && (
                <View style={[styles.sheet, { backgroundColor: t.bg, borderBottomColor: t.hairline }]}>
                    <GroupedList>
                        {NAV_LINKS.map((link) => (
                            <ListRow
                                key={link.href}
                                title={link.label}
                                onPress={() => go(link.href)}
                                right={isActive(link.href) ? <View style={[styles.dot, { backgroundColor: t.accent }]} /> : undefined}
                            />
                        ))}
                    </GroupedList>
                    <GroupedList style={{ marginTop: 12 }}>
                        <ListRow icon={<User size={16} color={t.text} />} title={accountLabel} onPress={() => go(accountHref)} />
                    </GroupedList>
                    <Button title="Elan ver" size="lg" fullWidth icon={<Plus size={18} color="#FFF" />} onPress={() => go('/add-listing')} style={{ marginTop: 16 }} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fixed: { zIndex: 1000, position: 'fixed' as any, top: 0, left: 0, right: 0 },
    bar: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        backdropFilter: 'saturate(180%) blur(20px)' as any,
    },
    inner: {
        maxWidth: CONTENT_MAX_WIDTH + 64,
        alignSelf: 'center',
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    logo: { flexDirection: 'row', alignItems: 'center', cursor: 'pointer' as any },
    wordmark: { fontSize: 17, fontFamily: FONT.heavy, letterSpacing: -0.3 },
    nav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    navItem: { paddingHorizontal: 12, height: 32, borderRadius: 8, justifyContent: 'center', cursor: 'pointer' as any },
    navText: { fontSize: 14 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    accountBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 34, cursor: 'pointer' as any },
    accountText: { fontSize: 14, fontFamily: FONT.semibold },
    sheet: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderBottomWidth: StyleSheet.hairlineWidth, boxShadow: '0px 24px 48px rgba(0,0,0,0.12)' as any },
    dot: { width: 7, height: 7, borderRadius: 4 },
});
