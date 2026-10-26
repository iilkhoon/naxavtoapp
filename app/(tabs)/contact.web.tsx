import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, Image } from 'react-native';
import { Phone, Mail, MapPin, MessageCircle, Instagram, Video, Globe, Shield, MessagesSquare, CreditCard } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';
import { WebFooter } from '../../components/WebFooter.web';
import { SeoHead } from '../../components/web/SeoHead';
import {
    WebScreen, LargeTitle, Card, GroupedList, ListRow, GroupCaption, useWebTokens, useBreakpoints, FONT,
} from '../../components/web/WebKit';

const APP_ICON = require('../../icons/android-icon.png');

// "+994501234567" -> "+994 50 123 45 67"
const formatPhone = (raw: string) => {
    const digits = raw.replace(/[^\d+]/g, '');
    const m = digits.match(/^(\+994)(\d{2})(\d{3})(\d{2})(\d{2})$/);
    return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : raw;
};

const RowIcon = ({ icon: Icon }: { icon: any }) => <Icon size={16} color="#FFF" strokeWidth={2.2} />;

// iOS contact card on the left, grouped channels on the right
export default function WebContactScreen() {
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile, isTablet } = useBreakpoints();
    const { settings, refreshSettings } = useSettings();

    useFocusEffect(useCallback(() => { refreshSettings(); }, []));

    const phones: string[] = Object.keys(settings)
        .filter((key) => key.startsWith('phone_') && settings[key]?.trim())
        .sort()
        .map((key) => settings[key]);
    if (phones.length === 0 && settings.phone) phones.push(settings.phone);

    const primaryPhone = phones[0];
    const email = settings.email || 'info@naxcivanavto.com';
    const website = settings.website || 'https://naxavto.com';
    const logoUrl = t.isDark ? settings.site_logo_dark : settings.site_logo_light;

    const open = (url?: string) => url && Linking.openURL(url).catch(() => {});
    const call = (number: string) => open(`tel:${number.replace(/\s/g, '')}`);
    const openMap = () => open(`https://maps.google.com/?q=${encodeURIComponent(settings.address || 'Naxçıvan')}`);

    const quickActions = [
        { icon: Phone, label: 'Zəng', onPress: () => primaryPhone && call(primaryPhone) },
        { icon: MessageCircle, label: 'WhatsApp', onPress: () => open(settings.whatsapp || 'https://whatsapp.com') },
        { icon: Mail, label: 'Email', onPress: () => open(`mailto:${email}`) },
        { icon: MapPin, label: 'Xəritə', onPress: openMap },
    ];

    const sideBySide = !isTablet;

    return (
        <WebScreen footer={<WebFooter />} maxWidth={1040}>
            <SeoHead title="Əlaqə" description="Naxçıvan Avto ilə əlaqə: telefon, WhatsApp, email, ünvan və canlı çat." path="/contact" />
            <LargeTitle title="Əlaqə" subtitle="Sualınız var? Zəng edin, yazın və ya canlı çatda operatorla danışın." />

            <View style={[styles.layout, !sideBySide && { flexDirection: 'column' }]}>
                {/* Contact card */}
                <View style={[sideBySide ? { width: 360 } : { width: '100%' }, { gap: 16 }]}>
                    <Card padding={isMobile ? 20 : 28} style={{ alignItems: 'center' }}>
                        <View style={[styles.avatar, { backgroundColor: t.surface, borderColor: t.hairline }]}>
                            <Image source={logoUrl ? { uri: logoUrl } : APP_ICON} accessibilityLabel="Naxçıvan Avto loqosu" style={styles.avatarImage} resizeMode="contain" />
                        </View>
                        <Text style={[styles.name, { color: t.text }]}>Naxçıvan Avto</Text>
                        <Text style={[styles.tagline, { color: t.textSecondary }]}>Avtomobil və nömrə elanları · Naxçıvan</Text>

                        <View style={styles.quickRow}>
                            {quickActions.map(({ icon: Icon, label, onPress }) => (
                                <TouchableOpacity key={label} style={styles.quickAction} onPress={onPress} accessibilityLabel={label}>
                                    <View style={[styles.quickCircle, { backgroundColor: t.accentSoft }]}>
                                        <Icon size={21} color={t.accent} strokeWidth={2} />
                                    </View>
                                    <Text style={[styles.quickLabel, { color: t.accent }]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Live chat */}
                    <TouchableOpacity
                        style={[styles.chatCard, { backgroundColor: t.accent }]}
                        onPress={() => router.push('/chat')}
                        activeOpacity={0.9}
                        accessibilityLabel="Canlı çat"
                    >
                        <View style={styles.chatIcon}>
                            <MessagesSquare size={22} color="#FFF" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.chatTitle}>Canlı çat</Text>
                            <Text style={styles.chatSubtitle}>Operatorla birbaşa yazışın</Text>
                        </View>
                        <Text style={styles.chatChevron}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Channels */}
                <View style={{ flex: 1, minWidth: 0, width: sideBySide ? undefined : '100%' }}>
                    {phones.length > 0 && (
                        <>
                            <GroupCaption>Telefon</GroupCaption>
                            <GroupedList style={{ marginBottom: 28 }}>
                                {phones.map((phone, i) => (
                                    <ListRow
                                        key={phone}
                                        icon={<RowIcon icon={Phone} />}
                                        iconBg="#34C759"
                                        title={formatPhone(phone)}
                                        subtitle={i === 0 ? 'Qaynar xətt' : `Operator ${i + 1}`}
                                        onPress={() => call(phone)}
                                    />
                                ))}
                            </GroupedList>
                        </>
                    )}

                    <GroupCaption>Əlaqə</GroupCaption>
                    <GroupedList style={{ marginBottom: 28 }}>
                        <ListRow icon={<RowIcon icon={Mail} />} iconBg="#007AFF" title="Email" subtitle={email} onPress={() => open(`mailto:${email}`)} />
                        <ListRow icon={<RowIcon icon={MapPin} />} iconBg="#FF9500" title="Ünvan" subtitle={settings.address || 'Naxçıvan şəhəri'} onPress={openMap} />
                        <ListRow icon={<RowIcon icon={Globe} />} iconBg="#5856D6" title="Vebsayt" subtitle={website.replace(/^https?:\/\//, '')} onPress={() => open(website)} />
                    </GroupedList>

                    <GroupCaption>Sosial şəbəkələr</GroupCaption>
                    <GroupedList style={{ marginBottom: 28 }}>
                        <ListRow icon={<RowIcon icon={Instagram} />} iconBg="#E1306C" title="Instagram" subtitle="Yeni elanlar və kampaniyalar" onPress={() => open(settings.instagram || 'https://instagram.com')} />
                        <ListRow icon={<RowIcon icon={Video} />} iconBg="#1D1D1F" title="TikTok" subtitle="Video baxışlar" onPress={() => open(settings.tiktok || 'https://tiktok.com')} />
                    </GroupedList>

                    <GroupedList>
                        <ListRow icon={<RowIcon icon={CreditCard} />} iconBg="#AF52DE" title="Kredit hesabım" subtitle="Ödəniş cədvəli və qalıq borc" onPress={() => router.push('/my-loans' as any)} />
                        <ListRow icon={<RowIcon icon={Shield} />} iconBg="#8E8E93" title="Məxfilik siyasəti" onPress={() => router.push('/privacy')} />
                    </GroupedList>
                </View>
            </View>
        </WebScreen>
    );
}

const styles = StyleSheet.create({
    layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 32 },
    avatar: { width: 88, height: 88, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 6, marginBottom: 14, boxShadow: '0px 6px 18px rgba(0,0,0,0.08)' as any },
    avatarImage: { width: '100%', height: '100%', borderRadius: 18 },
    name: { fontSize: 26, fontFamily: FONT.heavy, letterSpacing: -0.5 },
    tagline: { fontSize: 14, fontFamily: FONT.medium, marginTop: 4, textAlign: 'center' },
    quickRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 24 },
    quickAction: { alignItems: 'center', width: '25%', cursor: 'pointer' as any },
    quickCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    quickLabel: { fontSize: 12, fontFamily: FONT.semibold },
    chatCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, cursor: 'pointer' as any, boxShadow: '0px 8px 20px rgba(255,59,48,0.22)' as any },
    chatIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    chatTitle: { color: '#FFF', fontSize: 17, fontFamily: FONT.bold },
    chatSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: FONT.medium, marginTop: 1 },
    chatChevron: { color: 'rgba(255,255,255,0.85)', fontSize: 24, fontFamily: FONT.medium },
});
