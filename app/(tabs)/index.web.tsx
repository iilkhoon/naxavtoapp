import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, TextInput, Image, useWindowDimensions, TextStyle, Platform,
    DeviceEventEmitter
} from 'react-native';
import {
    Search, X, Wallet, Percent, ArrowLeftRight,
    TrendingUp, Star, Zap, ChevronRight, Crown, Heart,
    SlidersHorizontal, Calculator, AlertTriangle
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { Listing } from '../../types';
import { BannerSlider } from '../../components/BannerSlider';
import { formatListingDate } from '../../utils/date';
import { WebSideBanners } from '../../components/WebSideBanners';
import { Pagination } from '../../components/Pagination';
import { PlateCard } from '../../components/PlateCard'; // Added PlateCard import

type FilterType = 'cash' | 'credit' | 'barter' | 'urgent';

import { StyleProp } from 'react-native';
const Typewriter = ({ words, color, style }: { words: string[], color: string, style?: StyleProp<TextStyle> }) => {
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        const cursorInterval = setInterval(() => setCursorVisible(v => !v), 500);
        return () => clearInterval(cursorInterval);
    }, []);

    useEffect(() => {
        const currentWord = words[currentWordIndex];
        let timer: NodeJS.Timeout;
        if (isDeleting) {
            timer = setTimeout(() => {
                setDisplayedText(prev => prev.slice(0, -1));
                if (displayedText.length === 0) {
                    setIsDeleting(false);
                    setCurrentWordIndex(prev => (prev + 1) % words.length);
                }
            }, 50);
        } else {
            if (displayedText.length < currentWord.length) {
                timer = setTimeout(() => {
                    setDisplayedText(currentWord.slice(0, displayedText.length + 1));
                }, 90);
            } else {
                timer = setTimeout(() => setIsDeleting(true), 2200);
            }
        }
        return () => clearTimeout(timer);
    }, [displayedText, isDeleting, currentWordIndex, words]);

    return (
        <Text style={[style, { color, fontFamily: 'RethinkSans_800ExtraBold' }]}>
            {displayedText}<Text style={{ color, opacity: cursorVisible ? 1 : 0 }}>|</Text>
        </Text>
    );
};

/* ─── Premium Car Card ──────────────────────────────────── */
const CarCard = ({ car, isFavorite, onToggleFavorite, onPress }: any) => {
    const { colors, isDark } = useTheme();
    const [hovered, setHovered] = useState(false);
    const formattedPrice = car.price.toLocaleString().replace(/,/g, '.');
    const displayDate = formatListingDate(car.created_at);

    let allImages: string[] = [];
    try {
        if (Array.isArray(car.images) && car.images.length > 0) allImages = car.images;
        else if (typeof car.images === 'string') allImages = JSON.parse(car.images);
    } catch { }
    if (!allImages.length && car.image_url) allImages = [car.image_url];
    const mainImage = allImages[0] || '';

    return (
        <TouchableOpacity
            style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: hovered ? colors.primary + '60' : colors.border },
                hovered && { transform: [{ translateY: -4 }], boxShadow: `0 16px 40px rgba(0,0,0,${isDark ? '0.4' : '0.12'})` } as any
            ]}
            onPress={() => onPress(car.id)}
            activeOpacity={1}
            {...{ onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } as any}
        >
            {/* Image */}
            <View style={[styles.cardImgWrap, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                {mainImage ? (
                    <Image
                        source={{ uri: mainImage }}
                        style={[styles.cardImg, hovered && { transform: [{ scale: 1.04 }] } as any]}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.cardImg, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Şəkil yoxdur</Text>
                    </View>
                )}

                {/* Gradient overlay on image bottom */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 0, y: 1 }}
                />

                {/* Badges top-left */}
                <View style={styles.badgesRow}>
                    {car.is_credit && <View style={[styles.badge, { backgroundColor: '#007AFF' }]}><Text style={styles.badgeText}>Kredit</Text></View>}
                    {car.is_barter && <View style={[styles.badge, { backgroundColor: '#FF9500' }]}><Text style={styles.badgeText}>Barter</Text></View>}
                    {car.is_new && <View style={[styles.badge, { backgroundColor: '#34C759' }]}><Text style={styles.badgeText}>Yeni</Text></View>}
                </View>

                {/* VIP bottom-left */}
                {car.is_vip && (
                    <View style={[styles.vipBadge, { backgroundColor: 'rgba(0,0,0,0.65)', borderColor: '#FFD700' }]}>
                        <Crown size={9} color="#FFD700" fill="#FFD700" />
                        <Text style={{ color: '#FFD700', fontSize: 8, fontFamily: 'RethinkSans_800ExtraBold', marginLeft: 3 }}>VIP</Text>
                    </View>
                )}

                {/* Urgent badge */}
                {car.is_urgent && (
                    <View style={[styles.vipBadge, { backgroundColor: 'rgba(255,59,48,0.85)', borderColor: '#FF3B30', bottom: car.is_vip ? 34 : 8 }]}>
                        <AlertTriangle size={9} color="#FFF" fill="#FFF" />
                        <Text style={{ color: '#FFF', fontSize: 8, fontFamily: 'RethinkSans_800ExtraBold', marginLeft: 3 }}>TƏCİLİ</Text>
                    </View>
                )}

                {/* Price overlay bottom-right */}
                <View style={styles.priceOverlay}>
                    <Text style={styles.priceOverlayText}>
                        {formattedPrice} {car.currency === 'AZN' ? '₼' : car.currency}
                    </Text>
                </View>

                {/* Heart top-right */}
                <TouchableOpacity
                    style={[styles.heartBtn, { backgroundColor: isFavorite ? 'rgba(255,59,48,0.15)' : (isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)') }]}
                    onPress={(e: any) => { e.stopPropagation?.(); onToggleFavorite(car.id); }}
                >
                    <Heart size={15} color={isFavorite ? '#FF3B30' : (isDark ? '#FFF' : '#666')} fill={isFavorite ? '#FF3B30' : 'transparent'} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {car.make} {car.model}
                </Text>
                <Text style={[styles.cardSpecs, { color: colors.textSecondary }]}>
                    {car.year} · {car.engine} L · {car.mileage?.toLocaleString()} km
                </Text>
                <View style={styles.cardFooterRow}>
                    <Text style={[styles.cardLoc, { color: colors.textSecondary }]} numberOfLines={1}>
                        📍 {car.location}
                    </Text>
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{displayDate}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

/* ─── Main Screen ───────────────────────────────────────── */
export default function WebHomeScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { settings } = useSettings();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const isTablet = width < 1024;

    const [listings, setListings] = useState<Listing[]>([]);
    const [vipListings, setVipListings] = useState<Listing[]>([]);
    const [urgentListings, setUrgentListings] = useState<Listing[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Plate State
    const [activeTopTab, setActiveTopTab] = useState<'transport' | 'plates'>('transport');
    const [plates, setPlates] = useState<any[]>([]); // Using any or importing Plate type
    const [plateSearchRegion, setPlateSearchRegion] = useState('');
    const [plateSearchSeries, setPlateSearchSeries] = useState('');
    const [plateSearchNumber, setPlateSearchNumber] = useState('');
    const [platesPage, setPlatesPage] = useState(1);
    const [totalPlatesPages, setTotalPlatesPages] = useState(1);

    const [activeFilterType, setActiveFilterType] = useState<FilterType>('cash');
    const [searchQuery, setSearchQuery] = useState('');
    const [todayCount, setTodayCount] = useState<number>(0);
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [advancedFilters, setAdvancedFilters] = useState<any>({});

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 40;

    const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

    const handleBrandSelect = () => {
        const eventName = 'select_brand_home_web';
        const sub = DeviceEventEmitter.addListener(eventName, (brand) => {
            setSelectedBrand(brand);
            setSelectedModel(null);
            sub.remove();
        });
        router.push({ pathname: '/select-option', params: { type: 'brand', title: 'Marka Seçin', eventName, selectedId: selectedBrand?.id } });
    };

    const handleModelSelect = () => {
        if (!selectedBrand) {
            showToast('Əvvəlcə marka seçin', 'info');
            return;
        }
        const eventName = 'select_model_home_web';
        const sub = DeviceEventEmitter.addListener(eventName, (model) => {
            setSelectedModel(model);
            sub.remove();
        });
        router.push({ pathname: '/select-option', params: { type: 'model', title: 'Model Seçin', eventName, selectedId: selectedModel?.id, extraParams: JSON.stringify({ brand_id: selectedBrand.id }) } });
    };

    const handleFilterPress = () => {
        const eventName = 'apply_filters_home_web';
        const sub = DeviceEventEmitter.addListener(eventName, (filters) => {
            setAdvancedFilters(filters);
            sub.remove();
            // We use setTimeout because state updates batching in mixed listeners might need a tick
            setTimeout(() => fetchListings(), 50);
        });
        router.push({ pathname: '/filter', params: { eventName } });
    };

    const handleResetSearch = () => {
        setSelectedBrand(null);
        setSelectedModel(null);
        setSearchQuery('');
    };

    const handleResetPlateSearch = () => {
        setPlateSearchRegion('');
        setPlateSearchSeries('');
        setPlateSearchNumber('');
    };

    const fetchTodayCount = useCallback(async () => {
        try {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const { count, error } = await supabase
                .from('listings')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'approved')
                .gte('created_at', startOfToday.toISOString());

            if (!error && count !== null) {
                setTodayCount(count);
            }
        } catch (err) {
            console.error('Error fetching today count:', err);
        }
    }, []);

    const fetchListings = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('listings')
                .select('id, make, model, price, currency, image_url, images, location, created_at, mileage, engine, year, is_credit, is_barter, is_vip, is_urgent, is_new', { count: 'exact' })
                .eq('status', 'approved')
                .order('is_vip', { ascending: false })
                .order('created_at', { ascending: false });

            if (activeFilterType === 'credit') query = query.eq('is_credit', true);
            if (activeFilterType === 'barter') query = query.eq('is_barter', true);
            if (activeFilterType === 'urgent') query = query.eq('is_urgent', true);
            if (searchQuery.trim()) query = query.or(`make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%`);
            if (selectedBrand) query = query.eq('make', selectedBrand.name);
            if (selectedModel) query = query.eq('model', selectedModel.name);

            if (advancedFilters.minYear) query = query.gte('year', advancedFilters.minYear);
            if (advancedFilters.maxYear) query = query.lte('year', advancedFilters.maxYear);
            if (advancedFilters.minPrice) query = query.gte('price', advancedFilters.minPrice);
            if (advancedFilters.maxPrice) query = query.lte('price', advancedFilters.maxPrice);
            if (advancedFilters.bodyType) query = query.eq('body_type', advancedFilters.bodyType);
            query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

            const { data, count } = await query;
            if (data) {
                setListings(data as Listing[]);
                setVipListings((data as Listing[]).filter(l => l.is_vip).slice(0, 6));
                setUrgentListings((data as Listing[]).filter(l => l.is_urgent).slice(0, 6));
                if (count !== null) setTotalPages(Math.ceil(count / PAGE_SIZE));
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [activeFilterType, searchQuery, selectedBrand, selectedModel, advancedFilters, page]);

    const fetchPlates = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('plates')
                .select('id, region, series, number, price, description, is_vip, created_at, status', { count: 'exact' })
                .eq('status', 'approved')
                .order('is_vip', { ascending: false })
                .order('created_at', { ascending: false });

            if (plateSearchRegion) query = query.eq('region', plateSearchRegion);
            if (plateSearchSeries) query = query.ilike('series', `${plateSearchSeries}%`);
            if (plateSearchNumber) query = query.ilike('number', `${plateSearchNumber}%`);

            query = query.range((platesPage - 1) * PAGE_SIZE, platesPage * PAGE_SIZE - 1);

            const { data, count } = await query;
            if (data) {
                setPlates(data);
                if (count !== null) setTotalPlatesPages(Math.ceil(count / PAGE_SIZE));
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [plateSearchRegion, plateSearchSeries, plateSearchNumber, platesPage]);

    useEffect(() => {
        setPage(1);
    }, [activeFilterType, searchQuery, selectedBrand, selectedModel, advancedFilters]);

    useEffect(() => {
        setPlatesPage(1);
    }, [plateSearchRegion, plateSearchSeries, plateSearchNumber]);

    useEffect(() => { getFavorites().then(setFavorites); fetchTodayCount(); }, [fetchTodayCount]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (activeTopTab === 'transport') {
                fetchListings();
            } else {
                fetchPlates();
            }
        }, 350);
        return () => clearTimeout(t);
    }, [fetchListings, fetchPlates, activeTopTab]);

    const handleToggleFavorite = useCallback(async (id: string) => {
        const isFav = await toggleFavorite(id);
        setFavorites(prev => isFav ? [...prev, id] : prev.filter(fid => fid !== id));
        showToast(isFav ? 'Seçilmişlərə əlavə edildi' : 'Seçilmişlərdən silindi', 'success');
    }, [showToast]);

    const filterBtns = [
        { type: 'cash' as FilterType, label: 'Hamısı', icon: Wallet, color: '#FF3B30' },
        { type: 'credit' as FilterType, label: 'Kredit', icon: Percent, color: '#AF52DE' },
        { type: 'barter' as FilterType, label: 'Barter', icon: ArrowLeftRight, color: '#FF9500' },
        { type: 'urgent' as FilterType, label: 'Təcili', icon: Zap, color: '#FF3B30' },
    ];

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ paddingTop: isMobile ? 60 : 76, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
        >

            {/* ═══ HERO ══════════════════════════════════════════════ */}
            <View style={styles.hero}>
                {/* Gradient base */}
                <LinearGradient
                    colors={['#0A0A1A', '#12122A', '#1A0A0F']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Decorative blurred orbs */}
                <View style={[styles.orb, styles.orbRed]} />
                <View style={[styles.orb, styles.orbPurple]} />
                <View style={[styles.orb, styles.orbBlue]} />

                {/* Grid pattern overlay */}
                <View style={styles.gridPattern} />

                <View style={[styles.heroInner, isMobile && { paddingHorizontal: 20, paddingTop: 44, paddingBottom: 36 }]}>
                    {/* Pill badge */}
                    <View style={styles.heroPill}>
                        <Zap size={12} color="#FF3B30" fill="#FF3B30" />
                        <Text style={styles.heroPillText}>Naxçıvan'ın #1 Avtomobil Platforması</Text>
                    </View>

                    {/* Headline */}
                    <Text style={[styles.heroH1, isMobile && { fontSize: 34, lineHeight: 42 }]}>
                        Xəyalındakı{'\n'}
                        <Typewriter
                            words={['avtomobili tap', 'nömrəni tap', 'qiyməti müqayisə et']}
                            color="#FF3B30"
                            style={[styles.heroH1, isMobile && { fontSize: 34, lineHeight: 42 }]}
                        />
                    </Text>

                    <Text style={[styles.heroSub, isMobile && { fontSize: 14, marginBottom: 28 }]}>
                        Minlərlə elan, şəffaf qiymət, etibarlı satıcı — hamısı bir platformada.
                    </Text>

                    {/* Unified Search Container */}

                    {/* Top Tab Toggle */}
                    <View style={styles.webTogglePill}>
                        <TouchableOpacity
                            style={[styles.webToggleItem, activeTopTab === 'transport' && { backgroundColor: isDark ? '#333' : 'rgba(255,255,255,0.15)' }]}
                            onPress={() => setActiveTopTab('transport')}
                        >
                            <Text style={[styles.webToggleText, { color: activeTopTab === 'transport' ? '#FFF' : 'rgba(255,255,255,0.5)' }]}>Nəqliyyat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.webToggleItem, activeTopTab === 'plates' && { backgroundColor: isDark ? '#333' : 'rgba(255,255,255,0.15)' }]}
                            onPress={() => setActiveTopTab('plates')}
                        >
                            <Text style={[styles.webToggleText, { color: activeTopTab === 'plates' ? '#FFF' : 'rgba(255,255,255,0.5)' }]}>Nömrələr</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTopTab === 'transport' ? (
                        <View style={[styles.unifiedSearchContainer, isMobile && { flexDirection: 'column', height: 'auto', borderRadius: 16, padding: 12, gap: 12 }]}>
                            <TouchableOpacity style={[styles.searchInputItem, isMobile && { width: '100%', paddingLeft: 0 }]} onPress={handleBrandSelect}>
                                <Text style={[styles.inputLabel, { color: 'rgba(255,255,255,0.55)' }]}>Marka</Text>
                                <View style={styles.inputValueRow}>
                                    <Text style={[styles.inputValue, { color: selectedBrand ? '#FFF' : 'rgba(255,255,255,0.35)' }]} numberOfLines={1}>
                                        {selectedBrand ? selectedBrand.name : 'Seçin'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={[styles.verticalDivider, isMobile && { width: '100%', height: 1, marginHorizontal: 0, marginVertical: 4 }]} />

                            <TouchableOpacity style={[styles.searchInputItem, isMobile && { width: '100%', paddingLeft: 0 }]} onPress={handleModelSelect}>
                                <Text style={[styles.inputLabel, { color: 'rgba(255,255,255,0.55)' }]}>Model</Text>
                                <View style={styles.inputValueRow}>
                                    <Text style={[styles.inputValue, { color: selectedModel ? '#FFF' : 'rgba(255,255,255,0.35)' }]} numberOfLines={1}>
                                        {selectedModel ? selectedModel.name : 'Seçin'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {(selectedBrand || selectedModel || searchQuery) && (
                                <TouchableOpacity onPress={handleResetSearch} style={styles.resetButton}>
                                    <X size={16} color="rgba(255,255,255,0.55)" />
                                </TouchableOpacity>
                            )}

                            <View style={[isMobile ? { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 10, marginTop: 4 } : { flexDirection: 'row', alignItems: 'center' }]}>
                                <TouchableOpacity style={[styles.smallActionBtn, isMobile && { flex: 1, marginLeft: 0 }]} onPress={handleFilterPress}>
                                    <SlidersHorizontal size={20} color="#FFF" />
                                    {isMobile && <Text style={{ color: '#FFF', marginLeft: 8, fontFamily: 'RethinkSans_600SemiBold' }}>Ətraflı</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.searchActionSubmit, isMobile && { flex: 1, marginLeft: 0 }]} onPress={fetchListings}>
                                    <LinearGradient
                                        colors={['#FF3B30', '#FF6B35']}
                                        style={styles.searchActionSubmitGrad}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Search size={18} color="#FFF" />
                                        <Text style={styles.searchBtnText}>Axtar</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={[styles.unifiedSearchContainer, isMobile && { flexDirection: 'column', height: 'auto', borderRadius: 16, padding: 12, gap: 12 }]}>
                            <View style={[styles.searchInputItem, isMobile && { width: '100%', paddingLeft: 0 }]}>
                                <Text style={[styles.inputLabel, { color: 'rgba(255,255,255,0.55)' }]}>Region</Text>
                                <TextInput
                                    style={[styles.inputValue, { color: '#FFF', padding: 0, fontSize: 18, height: 24, outlineStyle: 'none' } as any]}
                                    placeholder="90"
                                    placeholderTextColor="rgba(255,255,255,0.35)"
                                    value={plateSearchRegion}
                                    onChangeText={setPlateSearchRegion}
                                    keyboardType="number-pad"
                                    maxLength={2}
                                />
                            </View>

                            <View style={[styles.verticalDivider, isMobile && { width: '100%', height: 1, marginHorizontal: 0, marginVertical: 4 }]} />

                            <View style={[styles.searchInputItem, isMobile && { width: '100%', paddingLeft: 0 }]}>
                                <Text style={[styles.inputLabel, { color: 'rgba(255,255,255,0.55)' }]}>Seriya</Text>
                                <TextInput
                                    style={[styles.inputValue, { color: '#FFF', padding: 0, fontSize: 18, height: 24, outlineStyle: 'none' } as any]}
                                    placeholder="AA"
                                    placeholderTextColor="rgba(255,255,255,0.35)"
                                    value={plateSearchSeries}
                                    onChangeText={(text) => setPlateSearchSeries(text.toUpperCase())}
                                    maxLength={2}
                                    autoCapitalize="characters"
                                />
                            </View>

                            <View style={[styles.verticalDivider, isMobile && { width: '100%', height: 1, marginHorizontal: 0, marginVertical: 4 }]} />

                            <View style={[styles.searchInputItem, isMobile && { width: '100%', paddingLeft: 0 }]}>
                                <Text style={[styles.inputLabel, { color: 'rgba(255,255,255,0.55)' }]}>Nömrə</Text>
                                <TextInput
                                    style={[styles.inputValue, { color: '#FFF', padding: 0, fontSize: 18, height: 24, outlineStyle: 'none' } as any]}
                                    placeholder="000"
                                    placeholderTextColor="rgba(255,255,255,0.35)"
                                    value={plateSearchNumber}
                                    onChangeText={setPlateSearchNumber}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                />
                            </View>

                            {(plateSearchRegion || plateSearchSeries || plateSearchNumber) && (
                                <TouchableOpacity onPress={handleResetPlateSearch} style={styles.resetButton}>
                                    <X size={16} color="rgba(255,255,255,0.55)" />
                                </TouchableOpacity>
                            )}

                            <View style={[isMobile ? { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 10, marginTop: 4 } : { flexDirection: 'row', alignItems: 'center' }]}>
                                <TouchableOpacity style={[styles.searchActionSubmit, { flex: 1, marginLeft: 0 }]} onPress={fetchPlates}>
                                    <LinearGradient
                                        colors={['#FF3B30', '#FF6B35']}
                                        style={styles.searchActionSubmitGrad}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Search size={18} color="#FFF" />
                                        <Text style={styles.searchBtnText}>Axtar</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Today's Count */}
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'RethinkSans_500Medium', marginBottom: 24, textAlign: 'center' }}>
                        Bu gün: <Text style={{ color: '#FF3B30', fontFamily: 'RethinkSans_700Bold' }}>{todayCount}</Text> yeni elan əlavə edilib
                    </Text>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        {[
                            { val: `${listings.length}+`, label: 'Aktiv Elan', icon: TrendingUp },
                            { val: '100%', label: 'Etibarlı', icon: Star },
                            { val: '7/24', label: 'Dəstək', icon: Zap },
                        ].map(({ val, label, icon: Icon }, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <View style={styles.statDivider} />}
                                <View style={styles.statItem}>
                                    <Text style={styles.statVal}>{val}</Text>
                                    <Text style={styles.statLabel}>{label}</Text>
                                </View>
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* Wave bottom */}
                <View style={styles.heroWave} />
            </View>

            {/* ═══ BANNER ════════════════════════════════════════════ */}
            {width < 1024 && (settings.home_banner_url || settings.home_banner_url_2) && (
                <View style={[styles.sectionWrap, isMobile && { marginHorizontal: 16 }]}>
                    <BannerSlider
                        images={[settings.home_banner_url, settings.home_banner_url_2, settings.home_banner_url_3]}
                        height={isMobile ? 120 : 180}
                    />
                </View>
            )}

            {/* ═══ URGENT LISTINGS ════════════════════════════════ */}
            {urgentListings.length > 0 && (
                <View style={[styles.vipSection, { backgroundColor: isDark ? '#1A0505' : '#FFF5F5', borderTopColor: isDark ? '#3C1515' : '#FFE5E5', borderBottomColor: isDark ? '#3C1515' : '#FFE5E5' }]}>
                    <View style={styles.sectionWrap}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleGroup}>
                                <AlertTriangle size={20} color="#FF3B30" fill="#FF3B30" />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Təcili Elanlar</Text>
                                <View style={[styles.newBadge, { backgroundColor: '#FF3B30' }]}>
                                    <Text style={styles.newBadgeText}>TƏCİLİ</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.seeAllBtn} onPress={() => setActiveFilterType('cash')}>
                                <Text style={[styles.seeAllText, { color: colors.primary }]}>Hamısına bax</Text>
                                <ChevronRight size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: isMobile ? -16 : -32 }} contentContainerStyle={{ paddingHorizontal: isMobile ? 16 : 32, gap: isMobile ? 12 : 16 }}>
                            {urgentListings.map(car => (
                                <View key={car.id} style={styles.vipCardWrap}>
                                    <CarCard
                                        car={car}
                                        isFavorite={favorites.includes(car.id)}
                                        onToggleFavorite={handleToggleFavorite}
                                        onPress={(id: string) => router.push(`/listing/${id}`)}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* ═══ VIP SHOWCASE ═══════════════════════════════════ */}
            {vipListings.length > 0 && (
                <View style={[styles.vipSection, { backgroundColor: isDark ? '#1C1C1E' : '#F7F7FA', borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA', borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                    <View style={styles.sectionWrap}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleGroup}>
                                <Crown size={20} color="#FFD700" fill="#FFD700" />
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>VIP Elanlar</Text>
                                <View style={[styles.newBadge, { backgroundColor: '#FFD700' }]}>
                                    <Text style={styles.newBadgeText}>Premium</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.seeAllBtn} onPress={() => setActiveFilterType('cash')}>
                                <Text style={[styles.seeAllText, { color: colors.primary }]}>Hamısına bax</Text>
                                <ChevronRight size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: isMobile ? -16 : -32 }} contentContainerStyle={{ paddingHorizontal: isMobile ? 16 : 32, gap: isMobile ? 12 : 16 }}>
                            {vipListings.map(car => (
                                <View key={car.id} style={styles.vipCardWrap}>
                                    <CarCard
                                        car={car}
                                        isFavorite={favorites.includes(car.id)}
                                        onToggleFavorite={handleToggleFavorite}
                                        onPress={(id: string) => router.push(`/listing/${id}`)}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {/* ═══ LISTINGS GRID & BANNERS ════════════════════════════════ */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
                <WebSideBanners side="left" />

                <View style={[styles.sectionWrap, isMobile && { paddingHorizontal: 16, marginTop: 28 }, { flex: 1, marginTop: 28 }]}>
                    {/* Section header + filters */}
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionTitleGroup}>
                            <TrendingUp size={20} color={colors.primary} />
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Son {activeTopTab === 'transport' ? 'Elanlar' : 'Nömrələr'}</Text>
                            {!loading && (
                                <Text style={[styles.listingCount, { color: colors.textSecondary }]}>{activeTopTab === 'transport' ? listings.length : plates.length} {activeTopTab === 'transport' ? 'elan' : 'nömrə'}</Text>
                            )}
                        </View>

                        {activeTopTab === 'transport' && (
                            <View style={styles.filterRow}>
                                {filterBtns.map(({ type, label, icon: Icon, color }) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.filterChip,
                                            {
                                                backgroundColor: activeFilterType === type ? color : (isDark ? '#2C2C2E' : '#F2F2F7'),
                                                borderColor: activeFilterType === type ? color : 'transparent',
                                            }
                                        ]}
                                        onPress={() => setActiveFilterType(type)}
                                    >
                                        <Icon size={13} color={activeFilterType === type ? '#FFF' : colors.textSecondary} />
                                        <Text style={[styles.filterChipText, { color: activeFilterType === type ? '#FFF' : colors.textSecondary }]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {loading ? (
                        <View style={{ paddingVertical: 80, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 16, fontFamily: 'RethinkSans_500Medium' }}>Elanlar yüklənir...</Text>
                        </View>
                    ) : (activeTopTab === 'transport' ? listings.length === 0 : plates.length === 0) ? (
                        <View style={{ paddingVertical: 80, alignItems: 'center', gap: 12 }}>
                            <Text style={{ fontSize: 40 }}>🔍</Text>
                            <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 18 }}>Nəticə tapılmadı</Text>
                            <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_400Regular' }}>Axtarış kriteriyalarını dəyişin</Text>
                            <TouchableOpacity onPress={() => {
                                if (activeTopTab === 'transport') {
                                    setSearchQuery('');
                                    setActiveFilterType('cash');
                                } else {
                                    handleResetPlateSearch();
                                }
                            }} style={[styles.resetBtn, { backgroundColor: colors.primary }]}>
                                <Text style={{ color: '#FFF', fontFamily: 'RethinkSans_700Bold' }}>Sıfırla</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={[styles.grid, activeTopTab === 'transport' ? (isMobile && { gap: 14 }) : { gap: 16 }]}>
                            {activeTopTab === 'transport' ? listings.map(car => (
                                <View key={car.id} style={[styles.gridItem, isMobile && { flexBasis: '48%', maxWidth: '50%' }]}>
                                    <CarCard
                                        car={car}
                                        isFavorite={favorites.includes(car.id)}
                                        onToggleFavorite={handleToggleFavorite}
                                        onPress={(id: string) => router.push(`/listing/${id}`)}
                                    />
                                </View>
                            )) : plates.map((plate, index) => (
                                <View key={plate.id} style={[isMobile ? { flexBasis: '48%', maxWidth: '50%' } : { flexBasis: '23%', maxWidth: '25%' }]}>
                                    <PlateCard
                                        region={plate.region}
                                        series={plate.series}
                                        number={plate.number}
                                        price={plate.price}
                                        description={plate.description}
                                        isVip={plate.is_vip}
                                        index={index}
                                        onPress={() => router.push(`/plate/${plate.id}`)}
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    {!loading && (activeTopTab === 'transport' ? totalPages > 1 : totalPlatesPages > 1) && (
                        <Pagination
                            currentPage={activeTopTab === 'transport' ? page : platesPage}
                            totalPages={activeTopTab === 'transport' ? totalPages : totalPlatesPages}
                            onPageChange={(p) => {
                                if (activeTopTab === 'transport') {
                                    setPage(p);
                                } else {
                                    setPlatesPage(p);
                                }
                                if (Platform.OS === 'web') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                        />
                    )}
                </View>

                <WebSideBanners side="right" />
            </View>

            {/* ═══ CTA STRIP ════════════════════════════════════════ */}
            <LinearGradient
                colors={['#FF3B30', '#FF6B35', '#FF9500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaStrip}
            >
                <View style={[styles.ctaStripInner, isMobile && { flexDirection: 'column', gap: 16, paddingHorizontal: 24, alignItems: 'flex-start' }]}>
                    <View>
                        <Text style={[styles.ctaStripTitle, isMobile && { fontSize: 18 }]}>Avtomobilinizi satmaq istəyirsiniz?</Text>
                        <Text style={styles.ctaStripSub}>Elanınızı dərc edin, alıcılar sizi tapsın.</Text>
                    </View>
                    <TouchableOpacity style={styles.ctaStripBtn} onPress={() => router.push('/add-listing' as any)}>
                        <Text style={styles.ctaStripBtnText}>Elan ver →</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* ═══ FOOTER ═══════════════════════════════════════════ */}
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
                        {/* Social dots */}
                        <View style={styles.footerSocials}>
                            {[settings.instagram, settings.whatsapp, settings.tiktok].filter(Boolean).map((url, i) => (
                                <View key={i} style={styles.socialDot} />
                            ))}
                        </View>
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
                        {settings.phone && !settings.phone_1 && <Text style={styles.footerContact}>📞 {settings.phone}</Text>}
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
        </ScrollView>
    );
}

const CARD_HEIGHT_IMG = 195;

const styles = StyleSheet.create({

    /* ── Hero ─────────────────────────── */
    hero: {
        minHeight: 560,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
    },
    orb: {
        position: 'absolute',
        borderRadius: 999,
        filter: 'blur(90px)' as any,
        opacity: 0.45,
    },
    orbRed: {
        width: 420,
        height: 420,
        backgroundColor: '#FF3B30',
        top: -100,
        left: '5%' as any,
    },
    orbPurple: {
        width: 360,
        height: 360,
        backgroundColor: '#7B2FFF',
        top: 60,
        right: '10%' as any,
    },
    orbBlue: {
        width: 300,
        height: 300,
        backgroundColor: '#0055FF',
        bottom: -60,
        left: '40%' as any,
    },
    gridPattern: {
        ...StyleSheet.absoluteFillObject,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)' as any,
        backgroundSize: '50px 50px' as any,
    },
    heroInner: {
        maxWidth: 860,
        alignSelf: 'center',
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 80,
        paddingBottom: 48,
        zIndex: 2,
    },
    heroPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,59,48,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,59,48,0.3)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 7,
        marginBottom: 28,
    },
    heroPillText: {
        color: 'rgba(255,180,170,0.9)',
        fontFamily: 'RethinkSans_600SemiBold',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    heroH1: {
        color: '#FFF',
        fontSize: 58,
        fontFamily: 'RethinkSans_800ExtraBold',
        textAlign: 'center',
        lineHeight: 68,
        marginBottom: 16,
        textShadowColor: 'rgba(0,0,0,0.3)' as any,
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    heroSub: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 17,
        fontFamily: 'RethinkSans_400Regular',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 26,
        maxWidth: 500,
    },
    unifiedSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 22,
        padding: 6,
        height: 64,
        width: '100%',
        maxWidth: 680,
        marginBottom: 40,
    },
    searchInputItem: {
        flex: 1,
        justifyContent: 'center',
        paddingLeft: 12,
        cursor: 'pointer' as any,
    },
    inputLabel: {
        fontSize: 10,
        fontFamily: 'RethinkSans_600SemiBold',
        marginBottom: 2,
    },
    inputValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputValue: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    verticalDivider: {
        width: 1,
        height: '50%',
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 8,
    },
    resetButton: {
        padding: 8,
        marginRight: 4,
        cursor: 'pointer' as any,
    },
    smallActionBtn: {
        flexDirection: 'row',
        height: 48,
        paddingHorizontal: 16,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        cursor: 'pointer' as any,
    },
    searchActionSubmit: {
        marginLeft: 6,
        cursor: 'pointer' as any,
        borderRadius: 16,
        overflow: 'hidden',
    },
    searchActionSubmitGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 24,
        height: 48,
    },
    searchBtnText: {
        color: '#FFF',
        fontFamily: 'RethinkSans_700Bold',
        fontSize: 15,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statVal: {
        color: '#FF6B35',
        fontSize: 28,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    heroWave: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 32,
        backgroundColor: 'transparent',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },

    // Mobile style Toggle - adapted for Web Hero
    webTogglePill: {
        flexDirection: 'row',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        padding: 4,
        height: 48,
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    webToggleItem: {
        paddingHorizontal: 20,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    webToggleText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
    },

    /* ── Shared section ───────────────── */
    sectionWrap: {
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        marginTop: 48,
        marginBottom: 8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
    },
    sectionTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionTitle: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    listingCount: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
    },
    newBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newBadgeText: {
        color: '#000',
        fontSize: 11,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontFamily: 'RethinkSans_600SemiBold',
        fontSize: 13,
    },
    resetBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 8,
    },

    /* ── VIP section ──────────────────── */
    vipSection: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        paddingVertical: 8,
    },
    vipCardWrap: {
        width: 260,
    },

    /* ── Grid ─────────────────────────── */
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    gridItem: {
        flexBasis: 260,
        flexGrow: 1,
        maxWidth: 320,
    },

    /* ── Car Card ─────────────────────── */
    card: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        ...Platform.select({
            web: {
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            } as any
        })
    },
    cardImgWrap: {
        height: CARD_HEIGHT_IMG,
        position: 'relative',
        overflow: 'hidden',
    },
    cardImg: {
        width: '100%',
        height: '100%',
        ...Platform.select({
            web: {
                transition: 'transform 0.3s ease',
            } as any
        })
    },
    badgesRow: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        gap: 4,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'RethinkSans_700Bold',
    },
    vipBadge: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    priceOverlay: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    priceOverlayText: {
        color: '#FFF',
        fontSize: 17,
        fontFamily: 'RethinkSans_800ExtraBold',
        textShadowColor: 'rgba(0,0,0,0.6)' as any,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    heartBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(8px)' as any,
    },
    cardBody: {
        padding: 14,
        gap: 4,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    cardSpecs: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
    },
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    cardLoc: {
        fontSize: 11,
        fontFamily: 'RethinkSans_500Medium',
        flex: 1,
    },
    cardDate: {
        fontSize: 11,
        fontFamily: 'RethinkSans_400Regular',
    },

    /* ── CTA Strip ────────────────────── */
    ctaStrip: {
        marginTop: 48,
    },
    ctaStripInner: {
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 48,
        paddingVertical: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 24,
    },
    ctaStripTitle: {
        color: '#FFF',
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 6,
    },
    ctaStripSub: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 15,
        fontFamily: 'RethinkSans_400Regular',
    },
    ctaStripBtn: {
        backgroundColor: '#FFF',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 20,
    },
    ctaStripBtnText: {
        color: '#FF3B30',
        fontFamily: 'RethinkSans_800ExtraBold',
        fontSize: 16,
    },

    /* ── Footer ───────────────────────── */
    footer: {
        marginTop: 0,
        backgroundColor: '#080810',
        borderTopWidth: 1,
        borderTopColor: '#1A1A2E',
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
    footerSocials: {
        flexDirection: 'row',
        gap: 8,
    },
    socialDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
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
