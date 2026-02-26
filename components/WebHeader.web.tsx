import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { Sun, Moon, Plus, Menu, X, Home, Heart, ArrowLeftRight, Phone, Calculator } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

export function WebHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark, toggleTheme } = useTheme();
    const { settings } = useSettings();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [menuOpen, setMenuOpen] = useState(false);

    const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

    const navLinks = [
        { label: 'Ana Səhifə', href: '/', icon: Home },
        { label: 'Müqayisə', href: '/compare', icon: ArrowLeftRight },
        { label: 'Seçilmişlər', href: '/favorites', icon: Heart },
        { label: 'Kredit', href: '/calculator', icon: Calculator },
        { label: 'Əlaqə', href: '/contact', icon: Phone },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/' || pathname === '/index';
        return pathname.startsWith(href);
    };

    const handleNav = (href: string) => {
        router.push(href as any);
        setMenuOpen(false);
    };

    return (
        <View style={{ zIndex: 1000, position: 'fixed' as any, top: 0, left: 0, right: 0 }}>
            {/* Main header bar */}
            <View style={[styles.header, {
                backgroundColor: isDark ? 'rgba(18,18,18,0.96)' : 'rgba(242,242,247,0.96)',
                borderBottomColor: colors.border,
            }]}>
                <View style={[styles.inner, isMobile && { paddingHorizontal: 16, paddingVertical: 12 }]}>
                    {/* Logo */}
                    <TouchableOpacity onPress={() => router.push('/')} style={styles.logoArea}>
                        {logoUrl ? (
                            <Image source={{ uri: logoUrl }} style={[styles.logoImg, isMobile && { width: 80, height: 36 }]} resizeMode="contain" />
                        ) : (
                            <View>
                                <Text style={[styles.logoTextMain, { color: colors.text }]}>NAXÇIVAN</Text>
                                <Text style={[styles.logoTextSub, { color: colors.primary }]}>AVTO</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Desktop Nav Links */}
                    {!isMobile && (
                        <View style={styles.navLinks}>
                            {navLinks.map((link) => (
                                <TouchableOpacity
                                    key={link.href}
                                    onPress={() => handleNav(link.href)}
                                    style={styles.navLinkBtn}
                                >
                                    <Text style={[
                                        styles.navLinkText,
                                        {
                                            color: isActive(link.href) ? colors.primary : colors.textSecondary,
                                            fontFamily: isActive(link.href) ? 'RethinkSans_700Bold' : 'RethinkSans_500Medium',
                                        }
                                    ]}>
                                        {link.label}
                                    </Text>
                                    {isActive(link.href) && (
                                        <View style={[styles.activeUnderline, { backgroundColor: colors.primary }]} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Right Actions */}
                    <View style={styles.rightActions}>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        >
                            {isDark
                                ? <Sun size={18} color={colors.text} />
                                : <Moon size={18} color={colors.text} />
                            }
                        </TouchableOpacity>

                        {!isMobile && (
                            <TouchableOpacity
                                onPress={() => router.push('/add-listing' as any)}
                                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                            >
                                <Plus size={18} color="#FFF" />
                                <Text style={styles.addBtnText}>Elan ver</Text>
                            </TouchableOpacity>
                        )}

                        {isMobile && (
                            <TouchableOpacity
                                onPress={() => setMenuOpen(v => !v)}
                                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                {menuOpen
                                    ? <X size={20} color={colors.text} />
                                    : <Menu size={20} color={colors.text} />
                                }
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Mobile Dropdown Menu */}
            {isMobile && menuOpen && (
                <View style={[styles.mobileMenu, {
                    backgroundColor: isDark ? '#111' : '#F8F8F8',
                    borderBottomColor: colors.border,
                }]}>
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.href);
                        return (
                            <TouchableOpacity
                                key={link.href}
                                style={[styles.mobileLink, active && { backgroundColor: colors.primary + '15' }]}
                                onPress={() => handleNav(link.href)}
                            >
                                <Icon size={18} color={active ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.mobileLinkText, {
                                    color: active ? colors.primary : colors.text,
                                    fontFamily: active ? 'RethinkSans_700Bold' : 'RethinkSans_500Medium',
                                }]}>
                                    {link.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {/* Elan ver button inside mobile menu */}
                    <TouchableOpacity
                        style={[styles.mobileAddBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleNav('/add-listing')}
                    >
                        <Plus size={18} color="#FFF" />
                        <Text style={styles.addBtnText}>Elan ver</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        borderBottomWidth: 1,
        backdropFilter: 'blur(20px)' as any,
    },
    inner: {
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    logoArea: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoImg: {
        width: 100,
        height: 44,
    },
    logoTextMain: {
        fontSize: 15,
        fontFamily: 'RethinkSans_800ExtraBold',
        letterSpacing: 2,
    },
    logoTextSub: {
        fontSize: 11,
        fontFamily: 'RethinkSans_800ExtraBold',
        letterSpacing: 4,
        marginTop: -3,
    },
    navLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    navLinkBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
        position: 'relative',
    },
    navLinkText: {
        fontSize: 15,
    },
    activeUnderline: {
        position: 'absolute',
        bottom: 2,
        left: 14,
        right: 14,
        height: 2,
        borderRadius: 1,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    addBtnText: {
        color: '#FFF',
        fontFamily: 'RethinkSans_700Bold',
        fontSize: 14,
    },
    // Mobile menu
    mobileMenu: {
        borderBottomWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 4,
    },
    mobileLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    mobileLinkText: {
        fontSize: 16,
    },
    mobileAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 8,
        marginBottom: 8,
    },
});
