import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    StatusBar, Linking, Share, Platform, Dimensions, ScrollView, useWindowDimensions
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
    ArrowLeft, Heart, Share2, Gauge, Settings, Fuel, Zap, MapPin,
    Phone, Calculator, Calendar, Palette, CheckCircle2, Copy, Globe, Car, Info, Hash, Fingerprint,
    Percent, ArrowLeftRight, ShieldCheck, Layers
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { ImageViewer } from '../../components/ImageViewer';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Listing } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../contexts/ToastContext';
import { CreditCalculatorModal } from '../../components/CreditCalculatorModal';
import { CreditApplicationModal } from '../../components/CreditApplicationModal';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingAnimation from '../../components/LoadingAnimation';

import * as Clipboard from 'expo-clipboard';
import { CarCard } from '../../components/CarCard';

const { width, height } = Dimensions.get('window');

export default function ListingDetailScreen() {
    const { id } = useLocalSearchParams();
    const listingId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { settings } = useSettings();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const { width: windowWidth } = useWindowDimensions();

    const numColumns = windowWidth > 768 ? 4 : 2;
    const gap = 21;
    const padding = 48;
    const itemWidth = (windowWidth - padding - (numColumns - 1) * gap) / numColumns;

    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const scrollViewRef = React.useRef<ScrollView>(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [showApplication, setShowApplication] = useState(false);
    const [featureCategories, setFeatureCategories] = useState<any[]>([]);
    const [randomListings, setRandomListings] = useState<Listing[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

    useEffect(() => {
        if (listingId) {
            setLoading(true);
            setErrorMessage(null);
            scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });

            fetchListingDetails();
            checkFavoriteStatus();
        } else {
            setLoading(false);
            setErrorMessage('Elan identifikatorı tapılmadı.');
        }
    }, [listingId]);

    const fetchRandomListings = async (excludeId?: string) => {
        try {
            let query = supabase
                .from('listings')
                .select('*')
                .eq('status', 'approved')
                .limit(10);

            if (excludeId) {
                query = query.neq('id', excludeId);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data && data.length > 0) {
                const shuffled = data.sort(() => 0.5 - Math.random());
                setRandomListings(shuffled.slice(0, 4));
            }
        } catch (error) {
            console.error('Error fetching random listings:', error);
        }
    };

    const fetchListingDetails = async () => {
        if (!listingId) {
            setLoading(false);
            setErrorMessage('Elan tapılmadı.');
            return;
        }

        try {
            setErrorMessage(null);
            const cleanId = String(listingId).trim();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

            // Timeout promise (10s)
            const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: new Error('Request timeout') }), 10000)
            );

            const mainQuery = supabase
                .from('listings')
                .select('*')
                .eq(isUuid ? 'id' : 'short_id', cleanId)
                .maybeSingle();

            const { data, error } = (await Promise.race([mainQuery, timeoutPromise])) as any;

            let resultData = data;
            // Fallback: If not found by short_id, try by id (or vice versa)
            if (!resultData && !isUuid) {
                try {
                    const { data: fallbackData } = await supabase
                        .from('listings')
                        .select('*')
                        .eq('id', cleanId)
                        .maybeSingle();
                    resultData = fallbackData;
                } catch (e) {}
            }

            if (error && !resultData) throw error;

            if (!resultData) {
                setListing(null);
                setErrorMessage('Elan tapılmadı və ya silinib.');
                setLoading(false);
                return;
            }

            setListing(resultData as Listing);

            // Safe view count increment with actual UUID
            if (resultData.id) {
                supabase.rpc('increment_listing_views', { row_id: resultData.id }).then(() => {}, () => {});
            }

            if (resultData.features && Array.isArray(resultData.features) && resultData.features.length > 0) {
                supabase
                    .from('car_features')
                    .select('name, category')
                    .in('name', resultData.features)
                    .then(
                        ({ data: featuresData }) => {
                            if (featuresData) setFeatureCategories(featuresData);
                        },
                        () => {}
                    );
            }

            if (resultData.id) {
                fetchRandomListings(resultData.id);
            }
        } catch (error) {
            console.error('Listing detail fetch error:', error);
            setErrorMessage('Məlumatları yükləmək mümkün olmadı. İnternet bağlantınızı yoxlayın.');
        } finally {
            setLoading(false);
        }
    };

    const checkFavoriteStatus = async () => {
        if (!listingId) return;
        try {
            const favorites = await getFavorites();
            setFavoriteIds(favorites);
            setIsFavorite(favorites.includes(String(listingId)));
        } catch (e) {}
    };

    const handleToggleFavorite = async (idToToggle?: any) => {
        // idToToggle might be an event object if coming from Touchable properties, so check type
        const targetId = typeof idToToggle === 'string' ? idToToggle : listingId;
        if (!targetId) return;

        const newStatus = await toggleFavorite(targetId);

        if (targetId === listingId) {
            setIsFavorite(newStatus);
        }

        setFavoriteIds(prev => {
            if (newStatus) return [...prev, targetId];
            return prev.filter(id => id !== targetId);
        });

        showToast(newStatus ? 'Seçilmişlərə əlavə edildi' : 'Seçilmişlərdən silindi', 'success');
    };

    const handleShare = async () => {
        if (!listing) return;
        const shareUrl = `https://naxavto.com/listing/${listing.short_id || listing.id}`;
        try {
            await Share.share({
                message: Platform.OS === 'ios'
                    ? `Naxavto: ${listing.make} ${listing.model} - ${listing.price} AZN`
                    : `Naxavto: ${listing.make} ${listing.model} - ${listing.price} AZN\n${shareUrl}`,
                url: shareUrl, // iOS support
            });
        } catch (error) { console.log(error); }
    };

    const adminPhones = useMemo(() => {
        const phones: string[] = [];
        for (let i = 1; i <= 7; i++) {
            const key = `phone_${i}`;
            if (settings[key]) phones.push(settings[key]);
        }
        if (phones.length === 0 && settings.phone) phones.push(settings.phone);
        if (phones.length === 0) phones.push('+994 50 123 45 67');
        return phones;
    }, [settings]);

    const handleCall = (number: string) => {
        Linking.openURL(`tel:${number}`);
    };

    const handleCopyVin = async () => {
        if (listing?.vin_code) {
            await Clipboard.setStringAsync(listing.vin_code);
            showToast('VIN kod kopyalandı', 'success');
        }
    };

    const handleCopyId = async () => {
        const idToCopy = listing?.short_id || listing?.id;
        if (idToCopy) {
            await Clipboard.setStringAsync(idToCopy);
            showToast('Elan ID kopyalandı', 'success');
        }
    };

    const galleryImages = useMemo(() => {
        if (!listing) return [];
        let imgs = listing.images;
        if (typeof imgs === 'string') {
            try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
        }
        if (Array.isArray(imgs) && imgs.length > 0) {
            return imgs.map((uri: string) => ({ uri }));
        }
        return listing.image_url
            ? [{ uri: listing.image_url }]
            : [{ uri: 'https://via.placeholder.com/800x600?text=No+Image' }];
    }, [listing]);

    const groupedFeatures = useMemo(() => {
        if (!listing?.features || listing.features.length === 0) return [];

        const groups: Record<string, string[]> = {};

        listing.features.forEach(feature => {
            const found = featureCategories.find(f => f.name === feature);
            const category = found ? found.category : 'Digər';

            if (!groups[category]) groups[category] = [];
            groups[category].push(feature);
        });

        const order = ['Eksteryer', 'İnteryer', 'Təhlükəsizlik', 'Komfort', 'Multimedia', 'Digər'];

        return Object.keys(groups)
            .sort((a, b) => {
                const indexA = order.indexOf(a);
                const indexB = order.indexOf(b);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.localeCompare(b);
            })
            .map(title => ({
                title,
                items: groups[title]
            }));
    }, [listing, featureCategories]);

    const getWatermarkStyle = () => {
        const pos = settings.watermark_position || 'bottom_right';
        const scaleStr = settings.watermark_scale ? String(settings.watermark_scale).replace(',', '.') : '1';
        const scale = parseFloat(scaleStr) || 1;
        const baseStyle = { position: 'absolute', width: 80 * scale, height: 40 * scale, opacity: 0.7, zIndex: 5 };
        switch (pos) {
            case 'top_left': return { ...baseStyle, top: 20, left: 20 };
            case 'top_right': return { ...baseStyle, top: 20, right: 20 };
            case 'bottom_left': return { ...baseStyle, bottom: 20, left: 20 };
            case 'center': return { ...baseStyle, top: '50%', left: '50%', marginTop: -20 * scale, marginLeft: -40 * scale };
            default: return { ...baseStyle, bottom: 20, right: 20 };
        }
    };

    if (loading && !listing) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.fallbackHeader, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        style={[styles.backIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ArrowLeft size={22} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <LoadingAnimation />
            </View>
        );
    }

    if (!listing) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.fallbackHeader, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity
                        style={[styles.backIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.back()}
                        activeOpacity={0.8}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ArrowLeft size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.fallbackHeaderTitle, { color: colors.text }]}>Elan Detalları</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.errorContainer}>
                    <Info size={54} color={colors.primary} style={{ marginBottom: 16 }} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>
                        {errorMessage || 'Elan tapılmadı'}
                    </Text>
                    <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
                        Bu elan silinmiş, deaktiv edilmiş və ya internet bağlantınızda fasilə yaranmış ola bilər.
                    </Text>
                    <View style={styles.errorActionRow}>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                setLoading(true);
                                fetchListingDetails();
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryButtonText}>Yenidən cəhd et</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.backButtonText, { color: colors.text }]}>Geri qayıt</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    const SpecItem = ({ icon: Icon, label, value }: any) => (
        <View style={[styles.specItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.specIconCircle, { backgroundColor: isDark ? '#333' : '#F2F2F7' }]}>
                <Icon size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.specValue, { color: colors.text }]} numberOfLines={1}>{value || '-'}</Text>
            </View>
        </View>
    );

    const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Sticky Floating Header Action Buttons */}
            <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
                <TouchableOpacity style={styles.blurBtn} onPress={() => router.back()} activeOpacity={0.8}>
                    <BlurView intensity={45} tint="dark" style={styles.blurContent}>
                        <ArrowLeft size={22} color="#FFF" />
                    </BlurView>
                </TouchableOpacity>
                <View style={styles.rightActions} pointerEvents="box-none">
                    <TouchableOpacity style={styles.blurBtn} onPress={handleShare} activeOpacity={0.8}>
                        <BlurView intensity={45} tint="dark" style={styles.blurContent}>
                            <Share2 size={20} color="#FFF" />
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.blurBtn} onPress={handleToggleFavorite} activeOpacity={0.8}>
                        <BlurView intensity={45} tint="dark" style={styles.blurContent}>
                            <Heart size={20} color={isFavorite ? "#FF3B30" : "#FFF"} fill={isFavorite ? "#FF3B30" : "transparent"} />
                        </BlurView>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }} bounces={false}>
                <View style={styles.imageContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const slide = Math.round(e.nativeEvent.contentOffset.x / width);
                            setActiveSlide(slide);
                        }}
                        scrollEventThrottle={16}
                    >
                        {galleryImages.map((img, index) => (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.95}
                                onPress={() => {
                                    setActiveSlide(index);
                                    setIsViewerVisible(true);
                                }}
                                style={{ width, height: '100%', position: 'relative' }}
                            >
                                <ExpoImage
                                    style={styles.image}
                                    source={{ uri: img.uri }}
                                    contentFit="cover"
                                    transition={200}
                                />
                                <LinearGradient
                                    colors={['rgba(0,0,0,0.4)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
                                    style={StyleSheet.absoluteFill}
                                />

                                {settings.watermark_url && (
                                    <ExpoImage
                                        source={{ uri: settings.watermark_url }}
                                        style={getWatermarkStyle() as any}
                                        contentFit="contain"
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {galleryImages.length > 1 && (
                        <View style={styles.paginationWrapper}>
                            <View style={styles.paginationContainer}>
                                {galleryImages.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.dot,
                                            {
                                                width: activeSlide === i ? 24 : 6,
                                                backgroundColor: activeSlide === i ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                                            }
                                        ]}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                <View style={[styles.contentSheet, { backgroundColor: colors.background }]}>
                    <View style={styles.dragHandle} />

                    <View style={styles.headerSection}>
                        <View style={styles.headerLeft}>
                            <View style={styles.titleRow}>
                                <Text style={[styles.makeModel, { color: colors.text }]}>
                                    {listing.make} {listing.model}
                                </Text>
                                {listing.is_new && (
                                    <View style={styles.newBadge}>
                                        <Text style={styles.newBadgeText}>YENİ</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                {listing.year} • {listing.engine} L • {listing.location}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.idContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}
                            onPress={handleCopyId}
                        >
                            <Text style={[styles.idLabel, { color: colors.textSecondary }]}>ID:</Text>
                            <Text style={[styles.idValue, { color: colors.text }]}>
                                {listing.short_id || listing.id.substring(0, 6).toUpperCase()}
                            </Text>
                            <Copy size={12} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={[styles.priceCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: colors.primary }]}>
                        <View>
                            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Satış qiyməti</Text>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceValue, { color: colors.primary }]}>
                                    {listing.price.toLocaleString()}
                                </Text>
                                <Text style={[styles.currency, { color: colors.primary }]}>{listing.currency}</Text>
                            </View>
                        </View>

                        <View style={styles.priceTags}>
                            {listing.is_credit && (
                                <View style={[styles.priceTag, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                                    <Percent size={14} color="#007AFF" style={{ marginRight: 4 }} />
                                    <Text style={[styles.priceTagText, { color: '#007AFF' }]}>Kredit</Text>
                                </View>
                            )}
                            {listing.is_barter && (
                                <View style={[styles.priceTag, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
                                    <ArrowLeftRight size={14} color="#34C759" style={{ marginRight: 4 }} />
                                    <Text style={[styles.priceTagText, { color: '#34C759' }]}>Barter</Text>
                                </View>
                            )}
                            {listing.is_urgent && (
                                <View style={[styles.priceTag, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                                    <Zap size={14} color="#FF3B30" style={{ marginRight: 4 }} />
                                    <Text style={[styles.priceTagText, { color: '#FF3B30' }]}>Təcili Satılır</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {listing.vin_code && (
                        <View style={[styles.vinContainer, {
                            backgroundColor: 'rgba(0,122,255,0.05)',
                            borderColor: 'rgba(0,122,255,0.3)',
                            borderStyle: 'dashed',
                            borderWidth: 1.5
                        }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 }}>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: 'rgba(0,122,255,0.1)',
                                    justifyContent: 'center', alignItems: 'center'
                                }}>
                                    <Fingerprint size={24} color="#007AFF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.vinLabel, { color: colors.textSecondary }]}>VIN Kod</Text>
                                    <Text
                                        style={styles.vinText}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.5}
                                    >
                                        {listing.vin_code}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(`https://vf.vin/search?vin=${listing.vin_code}`)}
                                        style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}
                                    >
                                        <Text style={{ color: '#007AFF', fontSize: 12, fontFamily: 'RethinkSans_600SemiBold', textDecorationLine: 'underline' }}>
                                            İnternetdə axtar
                                        </Text>
                                        <ArrowLeftRight size={12} color="#007AFF" style={{ marginLeft: 4, transform: [{ rotate: '-45deg' }] }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleCopyVin} style={styles.copyButton}>
                                <Copy size={20} color="#007AFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Göstəricilər</Text>
                    <View style={styles.specsGrid}>
                        <SpecItem icon={Calendar} label="Buraxılış" value={`${listing.year}`} />
                        <SpecItem icon={Gauge} label="Yürüş" value={`${listing.mileage} km`} />
                        <SpecItem icon={Car} label="Ban növü" value={listing.body_type} />
                        <SpecItem icon={Palette} label="Rəng" value={listing.color} />
                        <SpecItem icon={Zap} label="Mühərrik" value={`${listing.engine} L`} />
                        {listing.horsepower ? <SpecItem icon={Zap} label="At gücü" value={`${listing.horsepower} a.g.`} /> : null}
                        <SpecItem icon={Settings} label="Sürətlər qutusu" value={listing.gearbox} />
                        <SpecItem icon={Layers} label="Ötürücü" value={listing.transmission} />
                        <SpecItem icon={Globe} label="Bazar" value={listing.market} />
                        <SpecItem icon={Fuel} label="Yanacaq" value={listing.fuel_type} />
                    </View>

                    {groupedFeatures.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Avtomobilin təchizatı</Text>
                            <View style={[styles.featuresWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {groupedFeatures.map((group, gIndex) => (
                                    <View key={gIndex} style={styles.featureGroup}>
                                        <View style={styles.groupHeader}>
                                            <View style={[styles.groupDot, { backgroundColor: colors.primary }]} />
                                            <Text style={[styles.featureGroupTitle, { color: colors.textSecondary }]}>{group.title}</Text>
                                        </View>
                                        <View style={styles.featuresGridContainer}>
                                            {group.items.map((feature, fIndex) => (
                                                <View key={fIndex} style={styles.featureRow}>
                                                    <CheckCircle2 size={16} color={colors.primary} style={{ marginRight: 8 }} />
                                                    <Text style={[styles.featureText, { color: colors.text }]} numberOfLines={1}>{feature}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        {gIndex < groupedFeatures.length - 1 && (
                                            <View style={[styles.groupDivider, { backgroundColor: colors.border }]} />
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {listing.description ? (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Əlavə Məlumat</Text>
                            <Text style={[styles.description, { color: colors.textSecondary }]}>{listing.description}</Text>
                        </View>
                    ) : null}

                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Satıcı</Text>
                        <View style={[styles.sellerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.sellerHeader}>
                                <View style={styles.sellerAvatarContainer}>
                                    <ExpoImage
                                        source={{ uri: logoUrl || 'https://via.placeholder.com/100' }}
                                        style={styles.sellerLogo}
                                        contentFit="contain"
                                    />
                                </View>
                                <View style={styles.sellerInfo}>
                                    <Text style={[styles.sellerName, { color: colors.text }]}>Naxçıvan Avto</Text>
                                    <View style={styles.verifiedRow}>
                                        <ShieldCheck size={14} color="#4CD964" />
                                        <Text style={[styles.sellerRole, { color: colors.textSecondary }]}>Rəsmi Satıcı</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Əlaqə Nömrələri:</Text>
                            <View style={styles.phoneList}>
                                {adminPhones.map((phone, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.phoneRow, { backgroundColor: isDark ? '#333' : '#F8F9FA' }]}
                                        onPress={() => handleCall(phone)}
                                    >
                                        <Phone size={16} color={colors.primary} />
                                        <Text style={[styles.phoneText, { color: colors.text }]}>{phone}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {randomListings.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Digər elanlar</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: 21, rowGap: numColumns > 2 ? 21 : 8 }}>
                                {randomListings.map((item, index) => {
                                    let itemImages: string[] = [];
                                    try {
                                        if (Array.isArray(item.images)) {
                                            itemImages = item.images;
                                        } else if (typeof item.images === 'string') {
                                            const imgStr = item.images as string;
                                            if (imgStr.trim().startsWith('[')) {
                                                itemImages = JSON.parse(imgStr);
                                            } else {
                                                itemImages = [imgStr];
                                            }
                                        }
                                    } catch (e) {
                                        itemImages = item.image_url ? [item.image_url] : [];
                                    }
                                    const mainImage = itemImages.length > 0 ? itemImages[0] : (item.image_url || '');

                                    return (
                                        <View key={item.id} style={{ width: itemWidth, marginBottom: 0 }}>
                                            <CarCard
                                                id={item.id}
                                                title={`${item.make} ${item.model}`}
                                                price={item.price}
                                                currency={item.currency}
                                                image={mainImage}
                                                images={itemImages}
                                                location={item.location}
                                                date={item.created_at}
                                                mileage={item.mileage}
                                                engine={item.engine}
                                                year={item.year}
                                                isCredit={item.is_credit}
                                                isBarter={item.is_barter}
                                                isVip={item.is_vip}
                                                isNew={item.is_new}
                                                isFavorite={favoriteIds.includes(item.id)}
                                                onToggleFavorite={handleToggleFavorite}
                                                onPress={() => router.push(`/listing/${item.id}` as any)}
                                                index={index}
                                            />
                                        </View>
                                    )
                                })}
                            </View>
                        </View>
                    )}

                    <View style={styles.footerInfo}>
                        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                            Avtomobil və nömrə haqqında ətraflı məlumat üçün bizimlə əlaqə saxlayın!
                        </Text>
                        <Text style={[styles.devCredit, { color: colors.textSecondary }]}>
                            İlkin Rzayev / Novoloji / +994 55 466 66 63
                        </Text>
                    </View>


                </View>
            </ScrollView >

            <BlurView intensity={90} tint="dark" style={[styles.footer, { paddingBottom: insets.bottom + 10, borderColor: 'rgba(255,255,255,0.1)', gap: 10 }]}>
                {listing.is_credit && (
                    <TouchableOpacity style={[styles.calcButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setShowCalculator(true)}>
                        <Calculator size={24} color="#FFF" />
                    </TouchableOpacity>
                )}
                {listing.is_credit && (
                    <TouchableOpacity style={[styles.applyButton, { backgroundColor: '#FF9500' }]} onPress={() => setShowApplication(true)}>
                        <Percent size={18} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.applyButtonText}>Müraciət et</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.callButton, { backgroundColor: colors.primary }]} onPress={() => handleCall(adminPhones[0])}>
                    <Phone size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.callButtonText}>Zəng et</Text>
                </TouchableOpacity>
            </BlurView>

            <CreditCalculatorModal
                visible={showCalculator}
                onClose={() => setShowCalculator(false)}
                initialPrice={listing.price.toString()}
            />

            <CreditApplicationModal
                visible={showApplication}
                onClose={() => setShowApplication(false)}
                carId={listing.id}
                carTitle={`${listing.make} ${listing.model}`}
                carPrice={listing.price}
                carCurrency={listing.currency}
            />

            <ImageViewer
                visible={isViewerVisible}
                images={galleryImages}
                initialIndex={activeSlide}
                onClose={() => setIsViewerVisible(false)}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageContainer: { height: height * 0.45, width: '100%', position: 'relative' },
    image: { width: '100%', height: '100%' },
    headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, zIndex: 100 },
    rightActions: { flexDirection: 'row', gap: 10 },
    blurBtn: { borderRadius: 22, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
    blurContent: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    paginationWrapper: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
    paginationContainer: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
    dot: { height: 6, borderRadius: 3 },
    contentSheet: { flex: 1, marginTop: -20, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 12 },
    dragHandle: { width: 40, height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, alignSelf: 'center', marginBottom: 20, opacity: 0.5 },
    headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    headerLeft: { flex: 1, marginRight: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    makeModel: { fontSize: 22, fontFamily: 'RethinkSans_800ExtraBold' },
    newBadge: { backgroundColor: '#34C759', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    newBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'RethinkSans_800ExtraBold' },
    subtitle: { fontSize: 13, marginTop: 4, fontFamily: 'RethinkSans_500Medium' },
    idContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    idLabel: { fontSize: 10, marginRight: 4, fontFamily: 'RethinkSans_600SemiBold' },
    idValue: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
    divider: { height: 1, width: '100%', marginBottom: 16 },
    priceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, boxShadow: '0px 4px 12px rgba(255, 59, 48, 0.15)', elevation: 5 },
    priceLabel: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
    priceRow: { flexDirection: 'row', alignItems: 'flex-start' },
    priceValue: { fontSize: 32, fontFamily: 'RethinkSans_800ExtraBold', lineHeight: 38 },
    currency: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginTop: 6, marginLeft: 4 },
    priceTags: { alignItems: 'flex-end', gap: 8 },
    priceTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    priceTagText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
    vinContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10 },
    vinLabel: { fontSize: 11, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 2, textTransform: 'uppercase' },
    vinText: { fontSize: 16, fontFamily: 'RethinkSans_800ExtraBold', color: '#007AFF', letterSpacing: 1 },
    copyButton: { padding: 8 },
    sectionTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold', marginBottom: 16 },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    specItem: { width: (width - 48 - 12) / 2, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 10 },
    specIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    specLabel: { fontSize: 10, marginBottom: 1, fontFamily: 'RethinkSans_500Medium' },
    specValue: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
    featuresWrapper: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24 },
    featureGroup: { marginBottom: 16 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    groupDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    featureGroupTitle: { fontSize: 12, fontFamily: 'RethinkSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    featuresGridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    featureRow: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 8, paddingRight: 8 },
    featureText: { fontSize: 13, fontFamily: 'RethinkSans_500Medium' },
    groupDivider: { height: 1, width: '100%', marginTop: 8, marginBottom: 16, opacity: 0.5 },
    section: { marginBottom: 24 },
    description: { fontSize: 15, lineHeight: 24, fontFamily: 'RethinkSans_400Regular' },
    sellerCard: { padding: 16, borderRadius: 20, borderWidth: 1 },
    sellerHeader: { flexDirection: 'row', alignItems: 'center' },
    sellerAvatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#E5E5EA', overflow: 'hidden' },
    sellerLogo: { width: '80%', height: '80%' },
    sellerInfo: { flex: 1 },
    sellerName: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold' },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
    sellerRole: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold' },
    contactLabel: { fontSize: 12, marginBottom: 8, fontFamily: 'RethinkSans_600SemiBold' },
    phoneList: { gap: 8 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 10 },
    phoneText: { fontSize: 15, fontFamily: 'RethinkSans_600SemiBold' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, paddingHorizontal: 24, gap: 10, borderTopWidth: 1, boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.05)', elevation: 5 },
    calcButton: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    callButton: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    callButtonText: { color: '#FFF', fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
    applyButton: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    applyButtonText: { color: '#FFF', fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
    footerInfo: {
        marginTop: 20,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    disclaimerText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 20,
    },
    devCredit: {
        fontSize: 12,
        fontFamily: 'RethinkSans_400Regular',
        textAlign: 'center',
        opacity: 0.5,
    },
    fallbackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        zIndex: 10,
    },
    fallbackHeaderTitle: {
        fontSize: 17,
        fontFamily: 'RethinkSans_700Bold',
    },
    backIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        marginTop: -60,
    },
    errorTitle: {
        fontSize: 20,
        fontFamily: 'RethinkSans_700Bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    errorSubtitle: {
        fontSize: 14,
        fontFamily: 'RethinkSans_400Regular',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    errorActionRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        maxWidth: 320,
    },
    retryButton: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
    backButton: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    backButtonText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
    },
});
