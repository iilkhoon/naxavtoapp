import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';

export const WebFooter = () => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { settings } = useSettings();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

    return (
        <View style={styles.footer}>
            <View style={[styles.footerInner, isMobile && { paddingHorizontal: 24, paddingVertical: 36, gap: 28 }]}>
                {/* Brand */}
                <View style={styles.footerBrand}>
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={{ width: 110, height: 48 }} resizeMode="contain" />
                    ) : (
                        <View>
                            <Text style={styles.footerLogoMain}>NAXÇIVAN</Text>
                            <Text style={[styles.footerLogoSub, { color: '#FF3B30' }]}>AVTO</Text>
                        </View>
                    )}
                    <Text style={styles.footerTagline}>
                        Naxçıvan'ın ən etibarlı{'\n'}avtomobil platforması
                    </Text>
                </View>

                {/* Links */}
                <View style={styles.footerCol}>
                    <Text style={styles.footerColTitle}>Keçidlər</Text>
                    {[
                        { label: 'Ana Səhifə', href: '/' },
                        { label: 'Seçilmişlər', href: '/favorites' },
                        { label: 'Müqayisə', href: '/compare' },
                        { label: 'Əlaqə', href: '/contact' },
                        { label: 'Məxfilik Siyasəti', href: '/privacy' },
                    ].map(link => (
                        <TouchableOpacity key={link.href} onPress={() => router.push(link.href as any)}>
                            <Text style={styles.footerLink}>{link.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Contact */}
                <View style={styles.footerCol}>
                    <Text style={styles.footerColTitle}>Əlaqə</Text>
                    {settings.phone_1 && <Text style={styles.footerContact}>📞 {settings.phone_1}</Text>}
                    {!settings.phone_1 && settings.phone && <Text style={styles.footerContact}>📞 {settings.phone}</Text>}
                    {settings.email && <Text style={styles.footerContact}>✉️ {settings.email}</Text>}
                    {settings.address && <Text style={styles.footerContact}>📍 {settings.address}</Text>}
                    {settings.website && <Text style={styles.footerContact}>🌐 {settings.website}</Text>}
                </View>
            </View>

            <View style={[styles.footerBottom, isMobile && { paddingHorizontal: 24, flexDirection: 'column', alignItems: 'center' }]}>
                <Text style={[styles.footerCopy, isMobile && { textAlign: 'center' }]}>© 2025 Naxçıvan Avto. Bütün hüquqlar qorunur.</Text>
                <Text style={[styles.footerDev, isMobile && { textAlign: 'center' }]}>Hazırladı: İlkin Rzayev / Novoloji · +994 55 466 66 63</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    footer: {
        backgroundColor: '#080810',
        borderTopWidth: 1,
        borderTopColor: '#1A1A2E',
        marginTop: 'auto' as any,
    },
    footerInner: {
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 48,
        paddingVertical: 56,
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 48,
    },
    footerBrand: {
        maxWidth: 260,
        gap: 14,
    },
    footerLogoMain: {
        fontSize: 17,
        fontFamily: 'RethinkSans_800ExtraBold',
        color: '#FFF',
        letterSpacing: 3,
    },
    footerLogoSub: {
        fontSize: 11,
        fontFamily: 'RethinkSans_800ExtraBold',
        letterSpacing: 5,
    },
    footerTagline: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontFamily: 'RethinkSans_400Regular',
        lineHeight: 22,
    },
    footerCol: {
        gap: 12,
    },
    footerColTitle: {
        color: '#FFF',
        fontSize: 13,
        fontFamily: 'RethinkSans_800ExtraBold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    footerLink: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
        cursor: 'pointer' as any,
    },
    footerContact: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
        lineHeight: 22,
    },
    footerBottom: {
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 48,
        paddingVertical: 24,
        borderTopWidth: 1,
        borderTopColor: '#1A1A2E',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    footerCopy: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    footerDev: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
        fontFamily: 'RethinkSans_400Regular',
    },
});
