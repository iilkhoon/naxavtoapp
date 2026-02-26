import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Linking, useWindowDimensions
} from 'react-native';
import {
    Phone, Mail, MapPin, MessageCircle, Instagram, Video,
    Globe, ChevronRight
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { WebFooter } from '../../components/WebFooter.web';

export default function WebContactScreen() {
    const { colors, isDark } = useTheme();
    const { settings } = useSettings();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [phones, setPhones] = useState<string[]>([]);
    const [contactInfo, setContactInfo] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('app_settings').select('*');
            if (data) {
                const map: any = {};
                const phoneList: string[] = [];
                data.forEach(item => {
                    map[item.key] = item.value;
                    if (item.key.startsWith('phone_') && item.value?.trim()) phoneList.push(item.value);
                });
                if (!phoneList.length && map.phone) phoneList.push(map.phone);
                setContactInfo(map);
                setPhones(phoneList);
            }
            setLoading(false);
        })();
    }, []);

    const open = (url: string) => Linking.openURL(url);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: 76 }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const socialLinks = [
        contactInfo.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: contactInfo.whatsapp, color: '#25D366', url: contactInfo.whatsapp },
        contactInfo.instagram && { icon: Instagram, label: 'Instagram', value: contactInfo.instagram, color: '#E1306C', url: contactInfo.instagram },
        contactInfo.tiktok && { icon: Video, label: 'TikTok', value: contactInfo.tiktok, color: '#000', url: contactInfo.tiktok },
        contactInfo.website && { icon: Globe, label: 'Veb Sayt', value: contactInfo.website, color: colors.primary, url: contactInfo.website },
    ].filter(Boolean) as any[];

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ paddingTop: isMobile ? 60 : 76, flexGrow: 1, flexDirection: 'column' as any }}
            showsVerticalScrollIndicator={false}
        >
            {/* Hero banner */}
            <View style={[styles.heroBanner, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderBottomColor: colors.border }]}>
                <View style={[styles.heroIconWrap, { backgroundColor: colors.primary + '20' }]}>
                    <Phone size={36} color={colors.primary} />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>Bizimlə Əlaqə</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                    Sualınız varsa, bizimlə əlaqə saxlayın — ən qısa zamanda cavab verərik.
                </Text>
            </View>

            <View style={[styles.pageWrap, isMobile && { paddingHorizontal: 16, paddingTop: 20 }]}>
                <View style={[styles.twoCol, isMobile && { flexDirection: 'column', gap: 20 }]}>
                    {/* LEFT: Phone + Social */}
                    <View style={[styles.leftCol, isMobile && { flex: undefined, width: '100%' }]}>
                        {/* Phone numbers */}
                        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.sectionHead}>
                                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + '15' }]}>
                                    <Phone size={20} color={colors.primary} />
                                </View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Telefon Nömrələri</Text>
                            </View>
                            {phones.length > 0 ? phones.map((phone, i) => (
                                <TouchableOpacity key={i} style={[styles.contactRow, { borderBottomColor: colors.border }]} onPress={() => open(`tel:${phone}`)}>
                                    <View>
                                        <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Nömrə {i + 1}</Text>
                                        <Text style={[styles.contactValue, { color: colors.text }]}>{phone}</Text>
                                    </View>
                                    <View style={[styles.callBtn, { backgroundColor: colors.primary }]}>
                                        <Phone size={16} color="#FFF" />
                                        <Text style={styles.callBtnText}>Zəng et</Text>
                                    </View>
                                </TouchableOpacity>
                            )) : (
                                <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_400Regular', padding: 16 }}>Məlumat yoxdur</Text>
                            )}
                        </View>

                        {/* Email */}
                        {contactInfo.email && (
                            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.sectionHead}>
                                    <View style={[styles.sectionIcon, { backgroundColor: '#FF9500' + '15' }]}>
                                        <Mail size={20} color="#FF9500" />
                                    </View>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>E-poçt</Text>
                                </View>
                                <TouchableOpacity style={[styles.contactRow, { borderBottomWidth: 0 }]} onPress={() => open(`mailto:${contactInfo.email}`)}>
                                    <Text style={[styles.contactValue, { color: colors.text }]}>{contactInfo.email}</Text>
                                    <ChevronRight size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Social */}
                        {socialLinks.length > 0 && (
                            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.sectionHead}>
                                    <View style={[styles.sectionIcon, { backgroundColor: '#007AFF' + '15' }]}>
                                        <Globe size={20} color="#007AFF" />
                                    </View>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Sosial Media</Text>
                                </View>
                                {socialLinks.map(({ icon: Icon, label, value, color, url }: any, i: number) => (
                                    <TouchableOpacity key={i} style={[styles.socialRow, { borderBottomColor: colors.border, borderBottomWidth: i < socialLinks.length - 1 ? 1 : 0 }]} onPress={() => open(url)}>
                                        <View style={[styles.socialIcon, { backgroundColor: color + '15' }]}>
                                            <Icon size={18} color={color} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'RethinkSans_500Medium' }}>{label}</Text>
                                            <Text style={{ color: colors.text, fontSize: 14, fontFamily: 'RethinkSans_600SemiBold' }} numberOfLines={1}>{value}</Text>
                                        </View>
                                        <ChevronRight size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* RIGHT: Address + Map */}
                    <View style={[styles.rightCol, isMobile && { flex: undefined, width: '100%' }]}>
                        {contactInfo.address && (
                            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.sectionHead}>
                                    <View style={[styles.sectionIcon, { backgroundColor: '#34C759' + '15' }]}>
                                        <MapPin size={20} color="#34C759" />
                                    </View>
                                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ünvan</Text>
                                </View>
                                <View style={{ padding: 20 }}>
                                    <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'RethinkSans_600SemiBold', lineHeight: 24, marginBottom: 16 }}>
                                        {contactInfo.address}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.mapBtn, { backgroundColor: '#34C759' }]}
                                        onPress={() => open(`https://maps.google.com/?q=${contactInfo.address}`)}
                                    >
                                        <MapPin size={16} color="#FFF" />
                                        <Text style={{ color: '#FFF', fontFamily: 'RethinkSans_700Bold', fontSize: 14, marginLeft: 8 }}>Xəritədə Aç</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Working hours card */}
                        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.sectionHead}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#5856D6' + '15' }]}>
                                    <Text style={{ fontSize: 16 }}>🕐</Text>
                                </View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>İş Saatları</Text>
                            </View>
                            <View style={{ padding: 20, gap: 12 }}>
                                {[
                                    { day: 'Bazar ertəsi – Cümə', hours: contactInfo.working_hours || '09:00 – 18:00' },
                                    { day: 'Şənbə', hours: contactInfo.working_hours_saturday || '10:00 – 16:00' },
                                    { day: 'Bazar', hours: contactInfo.working_hours_sunday || 'İstirahət' },
                                ].map(({ day, hours }, i) => (
                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_500Medium', fontSize: 14 }}>{day}</Text>
                                        <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 14 }}>{hours}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Quick CTA card */}
                        <View style={[styles.ctaCard, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: '#FFF', fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 8 }}>
                                Elan vermək istəyirsiniz?
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: 'RethinkSans_400Regular', lineHeight: 22, marginBottom: 20 }}>
                                Bizə zəng edin, avtomobilinizi platformaya əlavə etmək üçün kömək edərik.
                            </Text>
                            {phones[0] && (
                                <TouchableOpacity
                                    style={[styles.ctaBtn]}
                                    onPress={() => open(`tel:${phones[0]}`)}
                                >
                                    <Phone size={16} color={colors.primary} />
                                    <Text style={{ color: colors.primary, fontFamily: 'RethinkSans_700Bold', fontSize: 14, marginLeft: 8 }}>{phones[0]}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            <WebFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    heroBanner: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
        borderBottomWidth: 1,
    },
    heroIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 36,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 10,
    },
    heroSubtitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_400Regular',
        textAlign: 'center',
        maxWidth: 460,
        lineHeight: 26,
    },
    pageWrap: {
        maxWidth: 1140,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        paddingTop: 48,
        paddingBottom: 48,
    },
    twoCol: {
        flexDirection: 'row',
        gap: 28,
        alignItems: 'flex-start',
    },
    leftCol: {
        flex: 1.2,
        gap: 20,
    },
    rightCol: {
        flex: 1,
        gap: 20,
    },
    sectionCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 20,
        paddingBottom: 16,
    },
    sectionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    contactLabel: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
        marginBottom: 4,
    },
    contactValue: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    callBtnText: {
        color: '#FFF',
        fontFamily: 'RethinkSans_700Bold',
        fontSize: 14,
    },
    socialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    socialIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
    },
    ctaCard: {
        borderRadius: 20,
        padding: 28,
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        alignSelf: 'flex-start',
    },

});
