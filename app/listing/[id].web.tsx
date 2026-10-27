import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Heart, Share2, Phone, MapPin, Check, Crown, ChevronLeft, ChevronRight, ShieldCheck, Zap } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { Listing } from '../../types';
import { WebHeader } from '../../components/WebHeader.web';
import { WebFooter } from '../../components/WebFooter.web';
import { WebListingCalculator } from '../../components/WebListingCalculator';
import { CreditApplicationModal } from '../../components/CreditApplicationModal';
import { SeoHead, SITE_URL } from '../../components/web/SeoHead';
import { WebScreen, Card, Button, Badge, EmptyState, Loading, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney } from '../../components/web/WebKit';

const formatNumber = (value: number) =>
    Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function WebListingDetail() {
    const { id } = useLocalSearchParams();
    const listingId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile, isTablet } = useBreakpoints();
    const { settings } = useSettings();
    const { showToast } = useToast();

    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeImg, setActiveImg] = useState(0);
    const [featureCategories, setFeatureCategories] = useState<any[]>([]);
    const [showApplication, setShowApplication] = useState(false);

    const logoUrl = t.isDark ? settings.site_logo_dark : settings.site_logo_light;

    const getWatermarkStyle = () => {
        const pos = settings.watermark_position || 'bottom_right';
        const scale = parseFloat(String(settings.watermark_scale || '1').replace(',', '.')) || 1;
        const w = (isMobile ? 60 : 90) * scale;
        const h = (isMobile ? 30 : 45) * scale;
        const base: any = { position: 'absolute', width: w, height: h, opacity: 0.85 };
        if (pos === 'top_left') return { ...base, top: 12, left: 12 };
        if (pos === 'top_right') return { ...base, top: 12, right: 12 };
        if (pos === 'bottom_left') return { ...base, bottom: 12, left: 12 };
        if (pos === 'center') return { ...base, top: '50%', left: '50%', marginTop: -h / 2, marginLeft: -w / 2 };
        return { ...base, bottom: 12, right: 12 };
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError(false);
        (async () => {
            try {
                const cleanId = String(listingId || '').trim();
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

                // 10 s per attempt, one retry: the first request after a cold start can stall
                const loadOnce = () => Promise.race([
                    supabase
                        .from('listings')
                        .select('*')
                        .eq(isUuid ? 'id' : 'short_id', cleanId)
                        .maybeSingle(),
                    new Promise<{ data: null; error: Error }>((resolve) => setTimeout(() => resolve({ data: null, error: new Error('Request timeout') }), 10000)),
                ]) as Promise<any>;
                let { data, error } = await loadOnce();
                if (error) {
                    await new Promise((resolve) => setTimeout(resolve, 800));
                    ({ data, error } = await loadOnce());
                }
                if (cancelled) return;
                if (error && !data) throw error;

                let result = data;
                if (!result && !isUuid) {
                    const { data: fallback } = await supabase.from('listings').select('*').eq('id', cleanId).maybeSingle();
                    result = fallback;
                }

                if (cancelled) return;
                setListing(result || null);
                if (result) {
                    supabase.rpc('increment_listing_views', { row_id: result.id }).then(
                        () => {},
                        () => {},
                    );
                    if (result.features?.length > 0) {
                        supabase
                            .from('car_features')
                            .select('name, category')
                            .in('name', result.features)
                            .then(
                                ({ data: featData }) => featData && setFeatureCategories(featData),
                                () => {},
                            );
                    }
                    // Favourites are keyed by the listing UUID everywhere else
                    const favs = await getFavorites();
                    setIsFavorite(favs.includes(result.id));
                }
            } catch (e) {
                console.error('Web listing fetch error:', e);
                if (!cancelled) setLoadError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [listingId, reloadKey]);

    const galleryImages = useMemo(() => {
        if (!listing) return [];
        let imgs: any = listing.images;
        if (typeof imgs === 'string') {
            try {
                imgs = JSON.parse(imgs);
            } catch {
                imgs = [];
            }
        }
        if (Array.isArray(imgs) && imgs.length > 0) return imgs as string[];
        return listing.image_url ? [listing.image_url] : [];
    }, [listing]);

    const groupedFeatures = useMemo(() => {
        if (!listing?.features?.length) return [];
        const groups: Record<string, string[]> = {};
        listing.features.forEach((feature: string) => {
            const cat = featureCategories.find((f) => f.name === feature)?.category || 'Digər';
            (groups[cat] = groups[cat] || []).push(feature);
        });
        return Object.entries(groups);
    }, [listing, featureCategories]);

    const adminPhones = useMemo(() => {
        const phones: string[] = [];
        for (let i = 1; i <= 7; i++) {
            if (settings[`phone_${i}`]) phones.push(settings[`phone_${i}`]);
        }
        if (!phones.length && settings.phone) phones.push(settings.phone);
        return phones;
    }, [settings]);

    const handleFavorite = async () => {
        if (!listing) return;
        const newStatus = await toggleFavorite(listing.id);
        setIsFavorite(newStatus);
        showToast(newStatus ? 'Seçilmişlərə əlavə edildi' : 'Seçilmişlərdən silindi', 'success');
    };

    if (loading || !listing) {
        return (
            <View style={{ flex: 1, backgroundColor: t.bg }}>
                <WebHeader />
                <WebScreen footer={<WebFooter />}>
                    {loading ? (
                        <Loading />
                    ) : loadError ? (
                        <EmptyState title="Bağlantı alınmadı" subtitle="İnternet bağlantınızı yoxlayıb yenidən cəhd edin." action={<Button title="Yenidən cəhd et" onPress={() => setReloadKey((k) => k + 1)} />} />
                    ) : (
                        <>
                            <SeoHead title="Elan tapılmadı" />
                            <EmptyState title="Elan tapılmadı" subtitle="Elan silinib və ya link səhvdir." action={<Button title="Elanlara qayıt" onPress={() => router.push('/')} />} />
                        </>
                    )}
                </WebScreen>
            </View>
        );
    }

    const title = `${listing.make} ${listing.model}${listing.year ? `, ${listing.year}` : ''}`;
    const price = formatMoney(listing.price, listing.currency);
    const shareUrl = `${SITE_URL}/listing/${listing.short_id || listing.id}`;
    const details = [price, listing.mileage != null ? `${formatNumber(listing.mileage)} km` : null, listing.location].filter(Boolean).join(' · ');

    // One text block keeps title, price and link together in every share target
    const handleShare = async () => {
        const text = `${title}\n${details}\n\nNaxçıvan Avto-da bax: ${shareUrl}`;
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        try {
            if (nav?.share) {
                await nav.share({ title, text });
                return;
            }
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
        }
        await Clipboard.setStringAsync(text);
        showToast('Elan linki kopyalandı', 'success');
    };

    const specs = [
        { label: 'Buraxılış ili', value: listing.year },
        { label: 'Yürüş', value: listing.mileage != null ? `${formatNumber(listing.mileage)} km` : null },
        { label: 'Mühərrik', value: listing.engine ? `${listing.engine} L` : null },
        { label: 'At gücü', value: listing.horsepower ? `${listing.horsepower} a.g.` : null },
        { label: 'Yanacaq', value: listing.fuel_type },
        { label: 'Ban növü', value: listing.body_type },
        { label: 'Sürətlər qutusu', value: listing.gearbox },
        { label: 'Ötürücü', value: listing.transmission },
        { label: 'Rəng', value: listing.color },
        { label: 'Bazar', value: listing.market },
        { label: 'Şəhər', value: listing.location },
    ].filter((s) => s.value);

    const tags = [
        listing.is_new && { label: 'Yeni', tone: 'success' as const },
        listing.is_credit && { label: 'Kredit', tone: 'blue' as const },
        listing.is_barter && { label: 'Barter', tone: 'neutral' as const },
    ].filter(Boolean) as { label: string; tone: 'success' | 'blue' | 'neutral' }[];

    const description = `${title} — ${details}. ${listing.description ? String(listing.description).slice(0, 120) : 'Naxçıvan Avto-da satışda.'}`;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Car',
        name: title,
        brand: { '@type': 'Brand', name: listing.make },
        model: listing.model,
        ...(listing.year ? { vehicleModelDate: String(listing.year) } : {}),
        ...(listing.mileage != null ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: listing.mileage, unitCode: 'KMT' } } : {}),
        ...(listing.fuel_type ? { fuelType: listing.fuel_type } : {}),
        ...(listing.body_type ? { bodyType: listing.body_type } : {}),
        ...(listing.color ? { color: listing.color } : {}),
        ...(listing.gearbox ? { vehicleTransmission: listing.gearbox } : {}),
        ...(listing.vin_code ? { vehicleIdentificationNumber: listing.vin_code } : {}),
        image: galleryImages.slice(0, 6),
        url: shareUrl,
        offers: {
            '@type': 'Offer',
            price: listing.price,
            priceCurrency: listing.currency || 'AZN',
            availability: 'https://schema.org/InStock',
            itemCondition: listing.is_new ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
            seller: { '@type': 'AutoDealer', name: 'Naxçıvan Avto' },
        },
    };

    const gallery = (
        <View>
            <View style={[styles.mainImage, { backgroundColor: t.fill, borderColor: t.hairline }, isMobile && { borderRadius: 14 }]}>
                {galleryImages[activeImg] ? (
                    <Image source={{ uri: galleryImages[activeImg] }} accessibilityLabel={`${title} — şəkil ${activeImg + 1}`} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: t.textSecondary, fontFamily: FONT.medium }}>Şəkil yoxdur</Text>
                    </View>
                )}
                {!!settings.watermark_url && <Image source={{ uri: settings.watermark_url }} accessibilityLabel="" style={getWatermarkStyle()} resizeMode="contain" />}
                {(listing.is_vip || listing.is_urgent) && (
                    <View style={styles.imageBadges}>
                        {listing.is_vip && (
                            <View style={[styles.imageBadge, { backgroundColor: '#F4C430' }]}>
                                <Crown size={12} color="#3D2B00" fill="#3D2B00" />
                                <Text style={[styles.imageBadgeText, { color: '#3D2B00' }]}>VIP</Text>
                            </View>
                        )}
                        {listing.is_urgent && (
                            <View style={[styles.imageBadge, { backgroundColor: t.accent }]}>
                                <Zap size={11} color="#FFF" fill="#FFF" />
                                <Text style={[styles.imageBadgeText, { color: '#FFF' }]}>Təcili</Text>
                            </View>
                        )}
                    </View>
                )}
                {galleryImages.length > 1 && (
                    <>
                        <TouchableOpacity
                            style={[styles.navBtn, { left: 12 }]}
                            onPress={() => setActiveImg((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                            accessibilityLabel="Əvvəlki şəkil"
                        >
                            <ChevronLeft size={18} color="#1D1D1F" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.navBtn, { right: 12 }]} onPress={() => setActiveImg((i) => (i + 1) % galleryImages.length)} accessibilityLabel="Növbəti şəkil">
                            <ChevronRight size={18} color="#1D1D1F" />
                        </TouchableOpacity>
                        <View style={styles.counter}>
                            <Text style={styles.counterText}>
                                {activeImg + 1} / {galleryImages.length}
                            </Text>
                        </View>
                    </>
                )}
            </View>
            {galleryImages.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
                    {galleryImages.map((img, i) => (
                        <TouchableOpacity key={img + i} onPress={() => setActiveImg(i)} accessibilityLabel={`Şəkil ${i + 1}`}>
                            <Image
                                source={{ uri: img }}
                                accessibilityLabel={`${title} — kiçik şəkil ${i + 1}`}
                                style={[styles.thumb, isMobile && { width: 64, height: 48 }, { borderColor: activeImg === i ? t.text : 'transparent', opacity: activeImg === i ? 1 : 0.6 }]}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    const summary = (
        <View>
            {tags.length > 0 && (
                <View style={styles.tags}>
                    {tags.map((tag) => (
                        <Badge key={tag.label} label={tag.label} tone={tag.tone} />
                    ))}
                </View>
            )}
            <Text role="heading" aria-level={1} style={[styles.title, { color: t.text }, isMobile && { fontSize: 26, lineHeight: 32 }]}>
                {title}
            </Text>
            <Text style={[styles.price, { color: t.text }, isMobile && { fontSize: 30 }]}>{price}</Text>
            <View style={styles.location}>
                <MapPin size={14} color={t.textSecondary} />
                <Text style={[styles.locationText, { color: t.textSecondary }]}>{listing.location}</Text>
            </View>

            <View style={styles.actions}>
                <Button
                    variant="secondary"
                    title={isFavorite ? 'Saxlanılıb' : 'Saxla'}
                    icon={<Heart size={16} color={isFavorite ? t.accent : t.text} fill={isFavorite ? t.accent : 'transparent'} />}
                    onPress={handleFavorite}
                    style={{ flex: 1 }}
                />
                <Button variant="secondary" title="Paylaş" icon={<Share2 size={16} color={t.text} />} onPress={handleShare} style={{ flex: 1 }} />
            </View>

            <Card padding={20} style={{ marginTop: 20 }}>
                <View style={styles.seller}>
                    <View style={[styles.sellerLogo, { backgroundColor: t.fill }]}>
                        {logoUrl ? (
                            <Image source={{ uri: logoUrl }} accessibilityLabel="Naxçıvan Avto" style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                        ) : (
                            <Text style={{ fontSize: 18, fontFamily: FONT.heavy, color: t.text }}>N</Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.sellerName, { color: t.text }]}>{listing.seller_name || 'Naxçıvan Avto'}</Text>
                        <View style={styles.verified}>
                            <ShieldCheck size={13} color={t.success} />
                            <Text style={[styles.verifiedText, { color: t.textSecondary }]}>Rəsmi satıcı</Text>
                        </View>
                    </View>
                </View>
                <View style={{ gap: 8, marginTop: 16 }}>
                    {adminPhones.map((phone, i) => (
                        <Button
                            key={phone}
                            title={phone}
                            variant={i === 0 ? 'primary' : 'secondary'}
                            icon={<Phone size={16} color={i === 0 ? '#FFF' : t.text} />}
                            onPress={() => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
                            fullWidth
                        />
                    ))}
                    {listing.is_credit && <Button variant="dark" title="Kreditə müraciət et" onPress={() => setShowApplication(true)} fullWidth />}
                </View>
            </Card>
        </View>
    );

    const specsCard = (
        <View>
            <GroupCaption>Texniki göstəricilər</GroupCaption>
            <Card padding={0} style={{ overflow: 'hidden' }}>
                {specs.map((s, i) => (
                    <View key={s.label} style={[styles.specRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
                        <Text style={[styles.specLabel, { color: t.textSecondary }]}>{s.label}</Text>
                        <Text style={[styles.specValue, { color: t.text }]}>{s.value}</Text>
                    </View>
                ))}
                {!!listing.vin_code && (
                    <View style={[styles.specRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
                        <Text style={[styles.specLabel, { color: t.textSecondary }]}>VIN</Text>
                        <Text selectable style={[styles.specValue, { color: t.text, letterSpacing: 1 }]}>
                            {listing.vin_code}
                        </Text>
                    </View>
                )}
            </Card>
        </View>
    );

    const longContent = (
        <>
            {!!listing.description && (
                <View>
                    <GroupCaption>Satıcının qeydi</GroupCaption>
                    <Card>
                        <Text style={[styles.desc, { color: t.text }]}>{listing.description}</Text>
                    </Card>
                </View>
            )}
            {groupedFeatures.length > 0 && (
                <View>
                    <GroupCaption>Avadanlıq</GroupCaption>
                    <Card>
                        {groupedFeatures.map(([category, features], gi) => (
                            <View key={category} style={gi > 0 && { marginTop: 18 }}>
                                <Text style={[styles.featureCat, { color: t.textSecondary }]}>{category}</Text>
                                <View style={styles.features}>
                                    {features.map((f) => (
                                        <View key={f} style={[styles.feature, { backgroundColor: t.fill }]}>
                                            <Check size={13} color={t.text} strokeWidth={2.6} />
                                            <Text style={[styles.featureText, { color: t.text }]}>{f}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </Card>
                </View>
            )}
        </>
    );

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <SeoHead title={`${title} — ${price}`} description={description} image={galleryImages[0]} path={`/listing/${listing.short_id || listing.id}`} jsonLd={jsonLd} />
            <WebHeader />
            <WebScreen footer={<WebFooter />} contentStyle={{ paddingTop: isMobile ? 12 : 28 }}>
                {/* Breadcrumb */}
                <View style={styles.crumbs}>
                    <TouchableOpacity onPress={() => router.push('/')}>
                        <Text style={[styles.crumb, { color: t.accent }]}>Elanlar</Text>
                    </TouchableOpacity>
                    <Text style={[styles.crumb, { color: t.textTertiary }]}>›</Text>
                    <Text style={[styles.crumb, { color: t.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                        {listing.make} {listing.model}
                    </Text>
                </View>

                {isTablet ? (
                    <View style={{ gap: 24 }}>
                        {gallery}
                        {summary}
                        {specsCard}
                        {listing.is_credit && <WebListingCalculator initialPrice={listing.price} />}
                        {longContent}
                    </View>
                ) : (
                    <View style={styles.columns}>
                        <View style={{ flex: 1, minWidth: 0, gap: 28 }}>
                            {gallery}
                            {longContent}
                        </View>
                        <View style={[styles.sidebar, { position: 'sticky' as any, top: 88 }]}>
                            {summary}
                            {specsCard}
                            {listing.is_credit && <WebListingCalculator initialPrice={listing.price} />}
                        </View>
                    </View>
                )}
            </WebScreen>

            <CreditApplicationModal
                visible={showApplication}
                onClose={() => setShowApplication(false)}
                carId={listing.id}
                carTitle={`${listing.make} ${listing.model}`}
                carPrice={listing.price}
                carCurrency={listing.currency}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    crumb: { fontSize: 14, fontFamily: FONT.medium },
    columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 },
    sidebar: { width: 380, gap: 24 },
    mainImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
    imageBadges: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 6 },
    imageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 9, borderRadius: 7 },
    imageBadgeText: { fontSize: 12, fontFamily: FONT.heavy, letterSpacing: 0.3 },
    navBtn: {
        position: 'absolute',
        top: '50%',
        marginTop: -18,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer' as any,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.15)' as any,
    },
    counter: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center' },
    counterText: { color: '#FFF', fontSize: 12, fontFamily: FONT.semibold },
    thumb: { width: 88, height: 66, borderRadius: 10, borderWidth: 2 },
    tags: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    title: { fontSize: 32, lineHeight: 38, fontFamily: FONT.heavy, letterSpacing: -0.8 },
    price: { fontSize: 36, fontFamily: FONT.heavy, letterSpacing: -1, marginTop: 6 },
    location: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    locationText: { fontSize: 14, fontFamily: FONT.medium },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    seller: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sellerLogo: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    sellerName: { fontSize: 16, fontFamily: FONT.bold },
    verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    verifiedText: { fontSize: 13, fontFamily: FONT.medium },
    specRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 18, minHeight: 46, paddingVertical: 10 },
    specLabel: { fontSize: 14, fontFamily: FONT.regular },
    specValue: { fontSize: 14, fontFamily: FONT.semibold, textAlign: 'right', flexShrink: 1 },
    desc: { fontSize: 15, lineHeight: 24, fontFamily: FONT.regular },
    featureCat: { fontSize: 13, fontFamily: FONT.semibold, marginBottom: 10 },
    features: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    feature: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 8 },
    featureText: { fontSize: 13, fontFamily: FONT.medium },
});
