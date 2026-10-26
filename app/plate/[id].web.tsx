import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Phone, Share2, ShieldCheck, Crown } from 'lucide-react-native';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { PlateVisual } from '../../components/PlateVisual';
import { WebHeader } from '../../components/WebHeader.web';
import { WebFooter } from '../../components/WebFooter.web';
import { SeoHead, SITE_URL } from '../../components/web/SeoHead';
import {
    WebScreen, Card, Button, EmptyState, Loading, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney,
} from '../../components/web/WebKit';

export default function WebPlateDetail() {
    const { id } = useLocalSearchParams();
    const plateId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile, isTablet } = useBreakpoints();
    const { settings } = useSettings();
    const { showToast } = useToast();
    const [plate, setPlate] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const cleanId = String(plateId || '').trim();
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
                let { data } = await supabase.from('plates').select('*').eq(isUuid ? 'id' : 'short_id', cleanId).maybeSingle();
                if (!data && !isUuid) {
                    ({ data } = await supabase.from('plates').select('*').eq('id', cleanId).maybeSingle());
                }
                if (cancelled) return;
                setPlate(data || null);
                if (data) supabase.rpc('increment_plate_views', { row_id: data.id }).then(() => {}, () => {});
            } catch (e) {
                console.error('Error fetching plate:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [plateId]);


    const phones: string[] = Object.keys(settings)
        .filter(k => k.startsWith('phone_') && settings[k])
        .sort()
        .map(k => settings[k]);
    if (phones.length === 0 && settings.phone) phones.push(settings.phone);
    const logoUrl = t.isDark ? settings.site_logo_dark : settings.site_logo_light;

    if (loading || !plate) {
        return (
            <View style={{ flex: 1, backgroundColor: t.bg }}>
                <WebHeader />
                <WebScreen footer={<WebFooter />}>
                    {loading ? <Loading /> : (
                        <>
                            <SeoHead title="Nömrə tapılmadı" />
                            <EmptyState
                                title="Nömrə tapılmadı"
                                subtitle="Elan silinib və ya link səhvdir."
                                action={<Button title="Nömrələrə qayıt" onPress={() => router.push('/')} />}
                            />
                        </>
                    )}
                </WebScreen>
            </View>
        );
    }

    const plateText = `${plate.region}-${plate.series}-${plate.number}`;
    const price = formatMoney(plate.price);
    const path = `/plate/${plate.short_id || plate.id}`;
    const shareUrl = `${SITE_URL}${path}`;

    const handleShare = async () => {
        const text = `${plateText}\n${price} · Naxçıvan\n\nNaxçıvan Avto-da bax: ${shareUrl}`;
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        try {
            if (nav?.share) {
                await nav.share({ title: plateText, text });
                return;
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
        }
        await Clipboard.setStringAsync(text);
        showToast('Elan linki kopyalandı', 'success');
    };

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `Qeydiyyat nişanı ${plateText}`,
        category: 'Avtomobil qeydiyyat nişanı',
        ...(plate.description ? { description: plate.description } : {}),
        url: shareUrl,
        offers: {
            '@type': 'Offer',
            price: plate.price,
            priceCurrency: 'AZN',
            availability: 'https://schema.org/InStock',
            seller: { '@type': 'AutoDealer', name: 'Naxçıvan Avto' },
        },
    };

    const rows = [
        { label: 'Nömrə', value: plateText },
        { label: 'Region', value: plate.region },
        { label: 'Şəhər', value: 'Naxçıvan' },
        { label: 'Elan tarixi', value: plate.created_at ? format(new Date(plate.created_at), 'dd.MM.yyyy') : null },
        { label: 'Elan ID', value: plate.short_id || String(plate.id).split('-')[0].toUpperCase() },
    ].filter(r => r.value);

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <SeoHead
                title={`${plateText} nömrəsi — ${price}`}
                description={`${plateText} qeydiyyat nişanı satışda: ${price}. ${plate.description || 'Naxçıvan Avto-da nömrə elanları.'}`}
                path={path}
                jsonLd={jsonLd}
            />
            <WebHeader />
            <WebScreen footer={<WebFooter />} maxWidth={1040} contentStyle={{ paddingTop: isMobile ? 12 : 28 }}>
                <View style={styles.crumbs}>
                    <TouchableOpacity onPress={() => router.push('/')}>
                        <Text style={[styles.crumb, { color: t.accent }]}>Elanlar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.crumb, { color: t.textTertiary }]}>›</Text>
                    <Text style={[styles.crumb, { color: t.textSecondary }]}>{plateText}</Text>
                </View>

                <View style={[styles.columns, isTablet && { flexDirection: 'column' }]}>
                    <View style={[{ flex: 1, minWidth: 0 }, isTablet && { width: '100%' }]}>
                        <View
                            role="img"
                            aria-label={`Qeydiyyat nişanı ${plateText}`}
                            style={[styles.visual, { backgroundColor: t.surface, borderColor: t.hairline, boxShadow: t.shadow } as any, isMobile && { height: 220 }]}
                        >
                            <View style={{ transform: [{ scale: isMobile ? 0.8 : 1.15 }] }}>
                                <PlateVisual region={plate.region} series={plate.series} number={plate.number} />
                            </View>
                            {plate.is_vip && (
                                <View style={styles.vip}>
                                    <Crown size={12} color="#3D2B00" fill="#3D2B00" />
                                    <Text style={styles.vipText}>VIP</Text>
                                </View>
                            )}
                        </View>
                        {!!plate.description && (
                            <View style={{ marginTop: 24 }}>
                                <GroupCaption>Satıcının qeydi</GroupCaption>
                                <Card><Text style={[styles.desc, { color: t.text }]}>{plate.description}</Text></Card>
                            </View>
                        )}
                    </View>

                    <View style={[{ width: 360, gap: 20 }, isTablet && { width: '100%' }]}>
                        <View>
                            <Text style={[styles.eyebrow, { color: t.textSecondary }]}>Qeydiyyat nişanı</Text>
                            <Text role="heading" aria-level={1} style={[styles.title, { color: t.text }]}>{plateText}</Text>
                            <Text style={[styles.price, { color: t.text }]}>{price}</Text>
                        </View>
                        <Button variant="secondary" title="Paylaş" icon={<Share2 size={16} color={t.text} />} onPress={handleShare} />

                        <Card padding={0} style={{ overflow: 'hidden' }}>
                            {rows.map((r, i) => (
                                <View key={r.label} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
                                    <Text style={[styles.rowLabel, { color: t.textSecondary }]}>{r.label}</Text>
                                    <Text selectable style={[styles.rowValue, { color: t.text }]}>{r.value}</Text>
                                </View>
                            ))}
                        </Card>

                        <Card padding={20}>
                            <View style={styles.seller}>
                                <View style={[styles.sellerLogo, { backgroundColor: t.fill }]}>
                                    {logoUrl
                                        ? <Image source={{ uri: logoUrl }} accessibilityLabel="Naxçıvan Avto" style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                        : <Text style={{ fontFamily: FONT.heavy, color: t.text }}>N</Text>}
                                </View>
                                <View>
                                    <Text style={[styles.sellerName, { color: t.text }]}>{settings.seller_name || 'Naxçıvan Avto'}</Text>
                                    <View style={styles.verified}>
                                        <ShieldCheck size={13} color={t.success} />
                                        <Text style={[styles.verifiedText, { color: t.textSecondary }]}>Rəsmi satıcı</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ gap: 8, marginTop: 16 }}>
                                {phones.map((phone, i) => (
                                    <Button
                                        key={phone}
                                        title={phone}
                                        variant={i === 0 ? 'primary' : 'secondary'}
                                        icon={<Phone size={16} color={i === 0 ? '#FFF' : t.text} />}
                                        onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
                                        fullWidth
                                    />
                                ))}
                            </View>
                        </Card>
                    </View>
                </View>
            </WebScreen>
        </View>
    );
}

const styles = StyleSheet.create({
    crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    crumb: { fontSize: 14, fontFamily: FONT.medium },
    columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 },
    visual: { height: 340, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    vip: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 9, borderRadius: 7, backgroundColor: '#F4C430' },
    vipText: { color: '#3D2B00', fontSize: 12, fontFamily: FONT.heavy },
    eyebrow: { fontSize: 14, fontFamily: FONT.medium },
    title: { fontSize: 34, fontFamily: FONT.heavy, letterSpacing: -0.6, marginTop: 2 },
    price: { fontSize: 32, fontFamily: FONT.heavy, letterSpacing: -0.8, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, minHeight: 46 },
    rowLabel: { fontSize: 14, fontFamily: FONT.regular },
    rowValue: { fontSize: 14, fontFamily: FONT.semibold },
    desc: { fontSize: 15, lineHeight: 24, fontFamily: FONT.regular },
    seller: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sellerLogo: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    sellerName: { fontSize: 16, fontFamily: FONT.bold },
    verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    verifiedText: { fontSize: 13, fontFamily: FONT.medium },
});
