import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettings } from '../contexts/SettingsContext';
import { useWebTokens, useBreakpoints, CONTENT_MAX_WIDTH, FONT, WebTokens } from './web/WebKit';

const LINKS = [
    { label: 'Elanlar', href: '/' },
    { label: 'Elan ver', href: '/add-listing' },
    { label: 'Seçilmişlər', href: '/favorites' },
    { label: 'Müqayisə', href: '/compare' },
    { label: 'Kredit kalkulyatoru', href: '/calculator' },
    { label: 'Kreditlərim', href: '/my-loans' },
];

const HELP = [
    { label: 'Əlaqə', href: '/contact' },
    { label: 'Məxfilik siyasəti', href: '/privacy' },
];

const Column = ({ t, wide, title, children }: { t: WebTokens; wide: boolean; title: string; children: React.ReactNode }) => (
    <View style={[styles.col, wide && { minWidth: '45%' as any }]}>
        <Text style={[styles.colTitle, { color: t.text }]}>{title}</Text>
        {children}
    </View>
);

const Link = ({ t, label, onPress }: { t: WebTokens; label: string; onPress?: () => void }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={onPress ? ({ cursor: 'pointer' } as any) : undefined}>
        <Text style={[styles.link, { color: t.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
);

// Quiet, Apple-style footer: hairline on top, small grey type, three columns
export const WebFooter = () => {
    const router = useRouter();
    const { settings } = useSettings();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const phone = settings.phone_1 || settings.phone;

    const contacts = [
        phone && { label: phone, url: `tel:${String(phone).replace(/\s/g, '')}` },
        settings.email && { label: settings.email, url: `mailto:${settings.email}` },
        settings.address && { label: settings.address },
    ].filter(Boolean) as { label: string; url?: string }[];

    return (
        <View role="contentinfo" style={[styles.footer, { backgroundColor: t.isDark ? '#0A0A0A' : '#FFFFFF', borderTopColor: t.hairline }]}>
            <View style={[styles.inner, isMobile && { paddingHorizontal: 16, paddingTop: 32 }]}>
                <View style={[styles.top, isMobile && { flexDirection: 'column', gap: 28 }]}>
                    <View style={styles.brand}>
                        <Text style={[styles.wordmark, { color: t.text }]}>
                            Naxçıvan<Text style={{ color: t.accent }}> Avto</Text>
                        </Text>
                        <Text style={[styles.tagline, { color: t.textSecondary }]}>
                            Naxçıvanda avtomobil və qeydiyyat nişanı elanları — satış, kredit və barter.
                        </Text>
                    </View>
                    <View style={[styles.cols, isMobile && { gap: 24 }]}>
                        <Column t={t} wide={isMobile} title="Sayt">
                            {LINKS.map((l) => <Link t={t} key={l.href} label={l.label} onPress={() => router.push(l.href as any)} />)}
                        </Column>
                        <Column t={t} wide={isMobile} title="Kömək">
                            {HELP.map((l) => <Link t={t} key={l.href} label={l.label} onPress={() => router.push(l.href as any)} />)}
                        </Column>
                        {contacts.length > 0 && (
                            <Column t={t} wide={isMobile} title="Əlaqə">
                                {contacts.map((c) => (
                                    <Link t={t} key={c.label} label={c.label} onPress={c.url ? () => Linking.openURL(c.url!) : undefined} />
                                ))}
                            </Column>
                        )}
                    </View>
                </View>

                <View style={[styles.bottom, { borderTopColor: t.hairline }, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={[styles.small, { color: t.textSecondary }]}>© {new Date().getFullYear()} Naxçıvan Avto. Bütün hüquqlar qorunur.</Text>
                    <Text style={[styles.small, { color: t.textTertiary }]}>İlkin Rzayev / Novo Media · +994 51 500 00 77</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    footer: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 'auto' as any },
    inner: { maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', width: '100%', paddingHorizontal: 32, paddingTop: 48, paddingBottom: 28 },
    top: { flexDirection: 'row', justifyContent: 'space-between', gap: 48, marginBottom: 36 },
    brand: { maxWidth: 300, gap: 10 },
    wordmark: { fontSize: 17, fontFamily: FONT.heavy, letterSpacing: -0.3 },
    tagline: { fontSize: 13, lineHeight: 20, fontFamily: FONT.regular },
    cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 56 },
    col: { gap: 10, minWidth: 140 },
    colTitle: { fontSize: 12, fontFamily: FONT.semibold, marginBottom: 2 },
    link: { fontSize: 13, fontFamily: FONT.regular },
    bottom: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
    small: { fontSize: 12, fontFamily: FONT.regular },
});
