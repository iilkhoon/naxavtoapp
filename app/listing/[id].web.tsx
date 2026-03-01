import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, Image, Linking, useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft, Heart, Share2, Phone, Gauge, Settings, Fuel, MapPin,
    Calendar, Palette, Hash, CheckCircle2, Crown, ChevronLeft, ChevronRight,
    ShieldCheck
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { Listing } from '../../types';
import { WebHeader } from '../../components/WebHeader.web';
import { WebListingCalculator } from '../../components/WebListingCalculator';

export default function WebListingDetail() {
    const { id } = useLocalSearchParams();
    const listingId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { settings } = useSettings();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const getWatermarkStyle = () => {
        const pos = settings.watermark_position || 'bottom_right';
        const scaleStr = settings.watermark_scale ? String(settings.watermark_scale).replace(',', '.') : '1';
        const scale = parseFloat(scaleStr) || 1;
        const base: any = {
            position: 'absolute',
            width: (isMobile ? 60 : 90) * scale,
            height: (isMobile ? 30 : 45) * scale,
            resizeMode: 'contain',
            opacity: 0.85,
        };
        if (pos === 'top_left') return { ...base, top: 12, left: 12 };
        if (pos === 'top_right') return { ...base, top: 12, right: 12 };
        if (pos === 'bottom_left') return { ...base, bottom: 12, left: 12 };
        if (pos === 'center') return { ...base, top: '50%', left: '50%', marginTop: -((isMobile ? 30 : 45) * scale) / 2, marginLeft: -((isMobile ? 60 : 90) * scale) / 2 };
        return { ...base, bottom: 12, right: 12 }; // default: bottom_right
    };

    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeImg, setActiveImg] = useState(0);
    const [featureCategories, setFeatureCategories] = useState<any[]>([]);

    const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

    useEffect(() => {
        if (listingId) fetchAll();
    }, [listingId]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            // Increment views
            supabase.rpc('increment_listing_views', { row_id: listingId }).then();

            const { data } = await supabase.from('listings').select('*').eq('id', listingId).single();
            if (data) {
                setListing(data as Listing);
                if (data.features?.length > 0) {
                    const { data: featData } = await supabase
                        .from('car_features').select('name, category').in('name', data.features);
                    if (featData) setFeatureCategories(featData);
                }
            }
            const favs = await getFavorites();
            setIsFavorite(favs.includes(listingId));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const galleryImages = useMemo(() => {
        if (!listing) return [];
        let imgs = listing.images;
        if (typeof imgs === 'string') { try { imgs = JSON.parse(imgs); } catch { imgs = []; } }
        if (Array.isArray(imgs) && imgs.length > 0) return imgs as string[];
        return listing.image_url ? [listing.image_url] : [];
    }, [listing]);

    const groupedFeatures = useMemo(() => {
        if (!listing?.features?.length) return [];
        const groups: Record<string, string[]> = {};
        listing.features.forEach((feature: string) => {
            const found = featureCategories.find(f => f.name === feature);
            const cat = found?.category || 'Digər';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(feature);
        });
        return Object.entries(groups);
    }, [listing, featureCategories]);

    const adminPhones = useMemo(() => {
        const phones: string[] = [];
        for (let i = 1; i <= 7; i++) { if (settings[`phone_${i}`]) phones.push(settings[`phone_${i}`]); }
        if (!phones.length && settings.phone) phones.push(settings.phone);
        return phones;
    }, [settings]);

    const handleFavorite = async () => {
        const newStatus = await toggleFavorite(listingId);
        setIsFavorite(newStatus);
        showToast(newStatus ? 'Seçilmişlərə əlavə edildi' : 'Seçilmişlərdən silindi', 'success');
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <WebHeader />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 76 }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (!listing) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <WebHeader />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 76 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 18, fontFamily: 'RethinkSans_500Medium' }}>Elan tapılmadı.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                        <Text style={{ color: colors.primary, fontFamily: 'RethinkSans_700Bold' }}>← Geri qayıt</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const formattedPrice = listing.price.toLocaleString().replace(/,/g, '.');

    const specs = [
        { label: 'Buraxılış', value: listing.year, icon: Calendar },
        { label: 'Mühərrik', value: listing.engine ? `${listing.engine} L` : null, icon: Settings },
        { label: 'At gücü', value: listing.horsepower ? `${listing.horsepower} a.g.` : null, icon: Settings },
        { label: 'Kilometr', value: listing.mileage ? `${listing.mileage} km` : null, icon: Gauge },
        { label: 'Yanacaq', value: listing.fuel_type, icon: Fuel },
        { label: 'Rəng', value: listing.color, icon: Palette },
        { label: 'Bazar', value: listing.market, icon: Hash },
        { label: 'Karoseriya', value: listing.body_type, icon: Settings },
        { label: 'Sürətqutulu', value: listing.gearbox, icon: Settings },
        { label: 'Ötürücü', value: listing.transmission, icon: Settings },
    ].filter(s => s.value);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <WebHeader />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingTop: isMobile ? 60 : 76 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.pageWrap, isMobile && { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 20 }]}>
                    {/* Breadcrumb */}
                    <View style={[styles.breadcrumb, isMobile && { marginBottom: 14 }]}>
                        <TouchableOpacity onPress={() => router.push('/')}>
                            <Text style={[styles.breadcrumbLink, { color: colors.textSecondary }, isMobile && { fontSize: 12 }]}>Ana Səhifə</Text>
                        </TouchableOpacity>
                        <Text style={{ color: colors.textSecondary, marginHorizontal: 6, fontSize: isMobile ? 12 : 14 }}>›</Text>
                        <Text style={[styles.breadcrumbCurrent, { color: colors.text }, isMobile && { fontSize: 12 }]} numberOfLines={1}>
                            {listing.make} {listing.model} {listing.year}
                        </Text>
                    </View>

                    {/* ═══ MOBILE LAYOUT ═══ */}
                    {isMobile ? (
                        <View style={{ gap: 12 }}>
                            {/* 1. Images */}
                            <View style={[styles.mainImageWrap, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', height: 240, borderRadius: 14 }]}>
                                {galleryImages[activeImg] ? (
                                    <Image source={{ uri: galleryImages[activeImg] }} style={styles.mainImage} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.mainImage, { justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: colors.textSecondary }}>Şəkil yoxdur</Text>
                                    </View>
                                )}
                                {settings.watermark_url && (
                                    <Image source={{ uri: settings.watermark_url }} style={getWatermarkStyle()} resizeMode="contain" />
                                )}
                                {galleryImages.length > 0 && (
                                    <View style={styles.imgCountBadge}>
                                        <Text style={styles.imgCountText}>{activeImg + 1}/{galleryImages.length}</Text>
                                    </View>
                                )}
                                {listing.is_vip && (
                                    <View style={[styles.vipBadgeLarge, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
                                        <Crown size={14} color="#FFD700" fill="#FFD700" />
                                        <Text style={{ color: isDark ? '#FFD700' : '#000', fontFamily: 'RethinkSans_800ExtraBold', fontSize: 11, marginLeft: 4 }}>VIP</Text>
                                    </View>
                                )}
                                {galleryImages.length > 1 && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.imgNavBtn, { left: 8, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', width: 32, height: 32, borderRadius: 16, marginTop: -16 }]}
                                            onPress={() => setActiveImg(prev => Math.max(0, prev - 1))}
                                        >
                                            <ChevronLeft size={16} color={isDark ? '#FFF' : '#000'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.imgNavBtn, { right: 8, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', width: 32, height: 32, borderRadius: 16, marginTop: -16 }]}
                                            onPress={() => setActiveImg(prev => Math.min(galleryImages.length - 1, prev + 1))}
                                        >
                                            <ChevronRight size={16} color={isDark ? '#FFF' : '#000'} />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                            {galleryImages.length > 1 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -6 }}>
                                    {galleryImages.map((img, i) => (
                                        <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                                            <Image
                                                source={{ uri: img }}
                                                style={[{ width: 56, height: 42, borderRadius: 8, marginRight: 6, borderWidth: 2 }, { borderColor: activeImg === i ? colors.primary : 'transparent', opacity: activeImg === i ? 1 : 0.6 }]}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {/* 2. Badges + Title + Price + Location */}
                            <View style={{ gap: 6, marginTop: 4 }}>
                                <View style={styles.badgesRow}>
                                    {listing.is_credit && <View style={[styles.badge, { backgroundColor: '#007AFF' }]}><Text style={styles.badgeText}>Kredit</Text></View>}
                                    {listing.is_barter && <View style={[styles.badge, { backgroundColor: '#FF9500' }]}><Text style={styles.badgeText}>Barter</Text></View>}
                                    {listing.is_new && <View style={[styles.badge, { backgroundColor: '#34C759' }]}><Text style={styles.badgeText}>Yeni</Text></View>}
                                    {listing.is_urgent && <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}><Text style={styles.badgeText}>Təcili</Text></View>}
                                </View>
                                <Text style={[styles.listingTitle, { color: colors.text, fontSize: 20, lineHeight: 26 }]}>
                                    {listing.make} {listing.model} {listing.year}
                                </Text>
                                <Text style={[styles.priceText, { color: colors.primary, fontSize: 26 }]}>
                                    {formattedPrice} {listing.currency === 'AZN' ? '₼' : listing.currency}
                                </Text>
                                <View style={styles.locationRow}>
                                    <MapPin size={14} color={colors.textSecondary} />
                                    <Text style={[styles.locationText, { color: colors.textSecondary, fontSize: 13 }]}>{listing.location}</Text>
                                </View>
                            </View>

                            {/* 3. Action buttons */}
                            <View style={[styles.actionsRow, { gap: 8 }]}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1, paddingVertical: 10, borderRadius: 12 }]}
                                    onPress={handleFavorite}
                                >
                                    <Heart size={16} color={isFavorite ? '#FF3B30' : colors.textSecondary} fill={isFavorite ? '#FF3B30' : 'transparent'} />
                                    <Text style={[styles.actionBtnText, { color: isFavorite ? '#FF3B30' : colors.textSecondary, fontSize: 13 }]}>
                                        {isFavorite ? 'Saxlanılıb' : 'Saxla'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1, paddingVertical: 10, borderRadius: 12 }]}
                                    onPress={() => { if (navigator.share) { navigator.share({ title: `${listing.make} ${listing.model}`, url: window.location.href }); } }}
                                >
                                    <Share2 size={16} color={colors.textSecondary} />
                                    <Text style={[styles.actionBtnText, { color: colors.textSecondary, fontSize: 13 }]}>Paylaş</Text>
                                </TouchableOpacity>
                            </View>

                            {/* 4. Texniki İcmal */}
                            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14, borderRadius: 12 }]}>
                                <Text style={[styles.cardTitle, { color: colors.text, fontSize: 14, marginBottom: 10 }]}>Texniki İcmal</Text>
                                {specs.map(({ label, value, icon: Icon }) => (
                                    <View key={label} style={[styles.specRow, { borderBottomColor: colors.border, paddingVertical: 8 }]}>
                                        <View style={styles.specLabelRow}>
                                            <Icon size={12} color={colors.textSecondary} />
                                            <Text style={[styles.specLabel, { color: colors.textSecondary, fontSize: 12 }]}>{label}</Text>
                                        </View>
                                        <Text style={[styles.specValue, { color: colors.text, fontSize: 12 }]}>{value}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* 5. Avadanlıq */}
                            {groupedFeatures.length > 0 && (
                                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14, borderRadius: 12 }]}>
                                    <Text style={[styles.cardTitle, { color: colors.text, fontSize: 14, marginBottom: 10 }]}>Avadanlıq</Text>
                                    {groupedFeatures.map(([category, features]) => (
                                        <View key={category} style={{ marginBottom: 10 }}>
                                            <Text style={[styles.featureCat, { color: colors.textSecondary }]}>{category}</Text>
                                            <View style={[styles.featuresGrid, { gap: 6 }]}>
                                                {(features as string[]).map((f) => (
                                                    <View key={f} style={[styles.featureChip, { paddingHorizontal: 8, paddingVertical: 4 }]}>
                                                        <CheckCircle2 size={12} color={colors.primary} />
                                                        <Text style={[styles.featureText, { color: colors.text, fontSize: 11 }]}>{f}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* 6. Əlavə Məlumat */}
                            {listing.description && (
                                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14, borderRadius: 12 }]}>
                                    <Text style={[styles.cardTitle, { color: colors.text, fontSize: 14, marginBottom: 10 }]}>Əlavə Məlumat</Text>
                                    <Text style={[styles.descText, { color: colors.textSecondary, fontSize: 13 }]}>{listing.description}</Text>
                                </View>
                            )}

                            {/* 7. Satıcı */}
                            <View style={[styles.callCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 14, borderRadius: 12 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? '#333' : '#F2F2F7', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 }}>
                                        {logoUrl ? (
                                            <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                        ) : (
                                            <Text style={{ fontSize: 20, color: colors.text }}>N</Text>
                                        )}
                                    </View>
                                    <View>
                                        <Text style={[{ color: colors.text, fontSize: 16, fontFamily: 'RethinkSans_700Bold' }]}>{listing.seller_name || 'Naxçıvan Avto'}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <ShieldCheck size={14} color="#4CD964" />
                                            <Text style={[{ color: colors.textSecondary, fontSize: 13, marginLeft: 4 }]}>Rəsmi Satıcı</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />
                                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12, fontFamily: 'RethinkSans_500Medium' }}>Əlaqə Nömrələri:</Text>
                                {adminPhones.map((phone, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[styles.callBtn, { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, marginBottom: i === adminPhones.length - 1 ? 0 : 8 }]}
                                        onPress={() => Linking.openURL(`tel:${phone}`)}
                                    >
                                        <Phone size={16} color="#FFF" />
                                        <Text style={[styles.callBtnText, { fontSize: 14 }]}>{phone}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* 8. VIN */}
                            {listing.vin_code && (
                                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14, borderRadius: 12 }]}>
                                    <Text style={[styles.cardTitle, { color: colors.text, fontSize: 14, marginBottom: 10 }]}>VIN Kod</Text>
                                    <Text selectable style={[styles.vinText, { color: colors.primary, backgroundColor: colors.background, fontSize: 12, padding: 10, letterSpacing: 1.5 }]}>
                                        {listing.vin_code}
                                    </Text>
                                </View>
                            )}

                            {/* 9. Calculator */}
                            {listing.is_credit && (
                                <View style={{ marginTop: 12 }}>
                                    <WebListingCalculator initialPrice={listing.price} />
                                </View>
                            )}
                        </View>
                    ) : (
                        /* ═══ DESKTOP LAYOUT ═══ */
                        <View style={styles.twoCol}>
                            {/* LEFT: Image Gallery */}
                            <View style={styles.leftCol}>
                                {/* Main Image */}
                                <View style={[styles.mainImageWrap, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                    {galleryImages[activeImg] ? (
                                        <Image source={{ uri: galleryImages[activeImg] }} style={styles.mainImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.mainImage, { justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ color: colors.textSecondary }}>Şəkil yoxdur</Text>
                                        </View>
                                    )}
                                    {settings.watermark_url && (
                                        <Image source={{ uri: settings.watermark_url }} style={getWatermarkStyle()} resizeMode="contain" />
                                    )}
                                    {galleryImages.length > 0 && (
                                        <View style={styles.imgCountBadge}>
                                            <Text style={styles.imgCountText}>{activeImg + 1}/{galleryImages.length}</Text>
                                        </View>
                                    )}
                                    {listing.is_vip && (
                                        <View style={[styles.vipBadgeLarge, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
                                            <Crown size={14} color="#FFD700" fill="#FFD700" />
                                            <Text style={{ color: isDark ? '#FFD700' : '#000', fontFamily: 'RethinkSans_800ExtraBold', fontSize: 11, marginLeft: 4 }}>VIP</Text>
                                        </View>
                                    )}
                                    {galleryImages.length > 1 && (
                                        <>
                                            <TouchableOpacity
                                                style={[styles.imgNavBtn, { left: 12, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }]}
                                                onPress={() => setActiveImg(prev => Math.max(0, prev - 1))}
                                            >
                                                <ChevronLeft size={20} color={isDark ? '#FFF' : '#000'} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.imgNavBtn, { right: 12, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }]}
                                                onPress={() => setActiveImg(prev => Math.min(galleryImages.length - 1, prev + 1))}
                                            >
                                                <ChevronRight size={20} color={isDark ? '#FFF' : '#000'} />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>

                                {/* Thumbnail Strip */}
                                {galleryImages.length > 1 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailStrip}>
                                        {galleryImages.map((img, i) => (
                                            <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                                                <Image
                                                    source={{ uri: img }}
                                                    style={[styles.thumbnail, { borderColor: activeImg === i ? colors.primary : 'transparent', opacity: activeImg === i ? 1 : 0.6 }]}
                                                    resizeMode="cover"
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}

                                {/* Description */}
                                {listing.description && (
                                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>Əlavə Məlumat</Text>
                                        <Text style={[styles.descText, { color: colors.textSecondary }]}>{listing.description}</Text>
                                    </View>
                                )}

                                {/* Features */}
                                {groupedFeatures.length > 0 && (
                                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>Avadanlıq</Text>
                                        {groupedFeatures.map(([category, features]) => (
                                            <View key={category} style={{ marginBottom: 16 }}>
                                                <Text style={[styles.featureCat, { color: colors.textSecondary }]}>{category}</Text>
                                                <View style={styles.featuresGrid}>
                                                    {(features as string[]).map((f) => (
                                                        <View key={f} style={styles.featureChip}>
                                                            <CheckCircle2 size={14} color={colors.primary} />
                                                            <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* RIGHT: Sticky Details Sidebar */}
                            <View style={styles.rightCol}>
                                {/* Badges */}
                                <View style={styles.badgesRow}>
                                    {listing.is_credit && <View style={[styles.badge, { backgroundColor: '#007AFF' }]}><Text style={styles.badgeText}>Kredit</Text></View>}
                                    {listing.is_barter && <View style={[styles.badge, { backgroundColor: '#FF9500' }]}><Text style={styles.badgeText}>Barter</Text></View>}
                                    {listing.is_new && <View style={[styles.badge, { backgroundColor: '#34C759' }]}><Text style={styles.badgeText}>Yeni</Text></View>}
                                    {listing.is_urgent && <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}><Text style={styles.badgeText}>Təcili</Text></View>}
                                </View>

                                {/* Title & Price */}
                                <Text style={[styles.listingTitle, { color: colors.text }]}>
                                    {listing.make} {listing.model} {listing.year}
                                </Text>
                                <Text style={[styles.priceText, { color: colors.primary }]}>
                                    {formattedPrice} {listing.currency === 'AZN' ? '₼' : listing.currency}
                                </Text>

                                {/* Location */}
                                <View style={styles.locationRow}>
                                    <MapPin size={16} color={colors.textSecondary} />
                                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>{listing.location}</Text>
                                </View>

                                {/* Seller Card */}
                                <View style={[styles.callCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? '#333' : '#F2F2F7', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 }}>
                                            {logoUrl ? (
                                                <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                            ) : (
                                                <Text style={{ fontSize: 20, color: colors.text }}>N</Text>
                                            )}
                                        </View>
                                        <View>
                                            <Text style={[{ color: colors.text, fontSize: 16, fontFamily: 'RethinkSans_700Bold' }]}>{listing.seller_name || 'Naxçıvan Avto'}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                <ShieldCheck size={14} color="#4CD964" />
                                                <Text style={[{ color: colors.textSecondary, fontSize: 13, marginLeft: 4 }]}>Rəsmi Satıcı</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12, fontFamily: 'RethinkSans_500Medium' }}>Əlaqə Nömrələri:</Text>
                                    {adminPhones.map((phone, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.callBtn, { backgroundColor: colors.primary, marginBottom: i === adminPhones.length - 1 ? 0 : 8 }]}
                                            onPress={() => Linking.openURL(`tel:${phone}`)}
                                        >
                                            <Phone size={18} color="#FFF" />
                                            <Text style={styles.callBtnText}>{phone}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Action buttons row */}
                                <View style={styles.actionsRow}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
                                        onPress={handleFavorite}
                                    >
                                        <Heart size={18} color={isFavorite ? '#FF3B30' : colors.textSecondary} fill={isFavorite ? '#FF3B30' : 'transparent'} />
                                        <Text style={[styles.actionBtnText, { color: isFavorite ? '#FF3B30' : colors.textSecondary }]}>
                                            {isFavorite ? 'Saxlanılıb' : 'Saxla'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
                                        onPress={() => { if (navigator.share) { navigator.share({ title: `${listing.make} ${listing.model}`, url: window.location.href }); } }}
                                    >
                                        <Share2 size={18} color={colors.textSecondary} />
                                        <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Paylaş</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Specs */}
                                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Texniki İcmal</Text>
                                    {specs.map(({ label, value, icon: Icon }) => (
                                        <View key={label} style={[styles.specRow, { borderBottomColor: colors.border }]}>
                                            <View style={styles.specLabelRow}>
                                                <Icon size={14} color={colors.textSecondary} />
                                                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>{label}</Text>
                                            </View>
                                            <Text style={[styles.specValue, { color: colors.text }]}>{value}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* VIN */}
                                {listing.vin_code && (
                                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[styles.cardTitle, { color: colors.text }]}>VIN Kod</Text>
                                        <Text selectable style={[styles.vinText, { color: colors.primary, backgroundColor: colors.background }]}>
                                            {listing.vin_code}
                                        </Text>
                                    </View>
                                )}

                                {/* Calculator */}
                                {listing.is_credit && (
                                    <WebListingCalculator initialPrice={listing.price} />
                                )}
                            </View>
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View style={[styles.footer, { backgroundColor: '#0D0D0D', borderTopColor: '#222' }, isMobile && { marginTop: 20, paddingVertical: 18 }]}>
                    <Text style={[styles.footerText, isMobile && { fontSize: 11 }]}>© 2025 Naxçıvan Avto. Bütün hüquqlar qorunur.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        paddingTop: 24,
        paddingBottom: 40,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    breadcrumbLink: {
        fontFamily: 'RethinkSans_500Medium',
        fontSize: 14,
        cursor: 'pointer' as any,
    },
    breadcrumbCurrent: {
        fontFamily: 'RethinkSans_600SemiBold',
        fontSize: 14,
    },
    twoCol: {
        flexDirection: 'row',
        gap: 32,
        alignItems: 'flex-start',
    },
    leftCol: {
        flex: 1.6,
        gap: 20,
    },
    rightCol: {
        flex: 1,
        gap: 16,
        position: 'sticky' as any,
        top: 96,
    },
    mainImageWrap: {
        borderRadius: 20,
        overflow: 'hidden',
        height: 480,
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    imgCountBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imgCountText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    vipBadgeLarge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    imgNavBtn: {
        position: 'absolute',
        top: '50%',
        marginTop: -20,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnailStrip: {
        marginTop: -12,
    },
    thumbnail: {
        width: 80,
        height: 60,
        borderRadius: 10,
        marginRight: 8,
        borderWidth: 2,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 16,
    },
    descText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_400Regular',
        lineHeight: 22,
    },
    featureCat: {
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    featureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255,59,48,0.08)',
        borderRadius: 8,
    },
    featureText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'RethinkSans_700Bold',
    },
    listingTitle: {
        fontSize: 26,
        fontFamily: 'RethinkSans_800ExtraBold',
        lineHeight: 32,
    },
    priceText: {
        fontSize: 34,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
    },
    callCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    callBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    actionBtnText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    specRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    specLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    specLabel: {
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    specValue: {
        fontSize: 13,
        fontFamily: 'RethinkSans_700Bold',
    },
    vinText: {
        fontFamily: 'RethinkSans_700Bold',
        fontSize: 14,
        padding: 12,
        borderRadius: 8,
        letterSpacing: 2,
    },
    footer: {
        marginTop: 40,
        borderTopWidth: 1,
        paddingVertical: 24,
        alignItems: 'center',
    },
    footerText: {
        color: 'rgba(255,255,255,0.35)',
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
});
