import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, TextStyle,
    DeviceEventEmitter, StyleProp,
} from 'react-native';
import { Search, X, SlidersHorizontal, Plus, Wallet, Percent, ArrowLeftRight, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { Listing } from '../../types';
import { BannerSlider } from '../../components/BannerSlider';
import { WebSideBanners } from '../../components/WebSideBanners';
import { Pagination } from '../../components/Pagination';
import { CarCard } from '../../components/CarCard';
import { PlateCard } from '../../components/PlateCard';
import { WebFooter } from '../../components/WebFooter.web';
import { SeoHead } from '../../components/web/SeoHead';
import {
    useWebTokens, useBreakpoints, Container, SectionHeader, Segmented, Card, Button, WebGrid,
    HoverLift, EmptyState, Loading, FONT, HEADER_HEIGHT, carCardProps, WebTokens,
} from '../../components/web/WebKit';
import { LavaHero } from '../../components/LavaHero';

type FilterType = 'cash' | 'credit' | 'barter' | 'urgent';
type TopTab = 'transport' | 'plates';

const HOME_LISTINGS_CACHE_KEY = 'home_listings_cache';
const HOME_PLATES_CACHE_KEY = 'home_plates_cache';
const PAGE_SIZE = 40;
const LISTING_COLUMNS = 'id, make, model, price, currency, image_url, images, location, created_at, mileage, engine, year, is_credit, is_barter, is_vip, is_urgent, is_new, short_id';

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
        let timer: ReturnType<typeof setTimeout>;
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
        <Text style={[style, { color }]}>
            {displayedText}<Text style={{ color, opacity: cursorVisible ? 1 : 0, fontFamily: FONT.regular }}>|</Text>
        </Text>
    );
};

const TYPEWRITER_WORDS = ['avtomobili tap', 'nömrəni tap', 'qiyməti müqayisə et'];
// Phone layout mirrors the app's two-line hero
const MOBILE_TYPEWRITER_WORDS = ['avtomobili', 'nömrəni'];

const CATEGORIES: { type: FilterType; label: string; icon: any }[] = [
    { type: 'cash', label: 'Nağd', icon: Wallet },
    { type: 'credit', label: 'Kredit', icon: Percent },
    { type: 'barter', label: 'Barter', icon: ArrowLeftRight },
    { type: 'urgent', label: 'Təcili', icon: Zap },
];

// Applies every filter app/filter.tsx can return (same as the mobile home screen)
const applyAdvancedFilters = (query: any, f: Record<string, any>) => {
    if (f.minPrice) query = query.gte('price', parseFloat(f.minPrice));
    if (f.maxPrice) query = query.lte('price', parseFloat(f.maxPrice));
    if (f.minYear) query = query.gte('year', parseInt(f.minYear, 10));
    if (f.maxYear) query = query.lte('year', parseInt(f.maxYear, 10));
    if (f.minMileage) query = query.gte('mileage', parseInt(f.minMileage, 10));
    if (f.maxMileage) query = query.lte('mileage', parseInt(f.maxMileage, 10));
    if (f.minEngine) query = query.gte('engine', f.minEngine);
    if (f.maxEngine) query = query.lte('engine', f.maxEngine);
    if (f.city) query = query.ilike('location', `%${f.city}%`);
    if (f.bodyType) query = query.eq('body_type', f.bodyType);
    if (f.fuelType) query = query.eq('fuel_type', f.fuelType);
    if (f.gearbox) query = query.eq('gearbox', f.gearbox);
    if (f.transmission) query = query.eq('transmission', f.transmission);
    if (f.color) query = query.eq('color', f.color);
    if (f.market) query = query.eq('market', f.market);
    if (f.isNew) query = query.eq('is_new', true);
    if (f.isCredit) query = query.eq('is_credit', true);
    if (f.isBarter) query = query.eq('is_barter', true);
    return query;
};

const countActiveFilters = (f: Record<string, any>) => [
    f.minPrice || f.maxPrice, f.minYear || f.maxYear, f.minMileage || f.maxMileage, f.minEngine || f.maxEngine,
    f.city, f.bodyType, f.fuelType, f.gearbox, f.transmission, f.color, f.market, f.isNew, f.isCredit, f.isBarter,
].filter(Boolean).length;

// Runs a Supabase query with a 15 s timeout and one retry after a short pause
// (covers a flaky first request on a cold start)
const withRetry = async (build: () => PromiseLike<{ data: any; count: number | null; error: any }>) => {
    const attempt = async () => {
        const result = await Promise.race([
            build(),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 15000)),
        ]);
        if (result.error) throw result.error;
        return result;
    };
    try {
        return await attempt();
    } catch {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return attempt();
    }
};

// Defined outside the screen so inputs keep focus between renders
const Field = ({ t, isMobile, label, value, placeholder, onPress }: {
    t: WebTokens; isMobile: boolean; label: string; value?: string; placeholder: string; onPress: () => void;
}) => (
    <TouchableOpacity style={[styles.field, isMobile && styles.fieldMobile]} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: value ? t.text : t.placeholder }]} numberOfLines={1}>{value || placeholder}</Text>
    </TouchableOpacity>
);

const PlateInput = ({ t, isMobile, label, ...props }: { t: WebTokens; isMobile: boolean; label: string } & React.ComponentProps<typeof TextInput>) => (
    <View style={[styles.field, isMobile && styles.fieldMobile, { cursor: 'text' } as any]}>
        <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>{label}</Text>
        <TextInput
            {...props}
            placeholderTextColor={t.placeholder}
            style={[styles.fieldValue, styles.plateInput, { color: t.text }]}
        />
    </View>
);

export default function WebHomeScreen() {
    const router = useRouter();
    const t = useWebTokens();
    const { settings } = useSettings();
    const { showToast } = useToast();
    const { width, isMobile } = useBreakpoints();

    const [listings, setListings] = useState<Listing[]>([]);
    const [vipListings, setVipListings] = useState<Listing[]>([]);
    const [urgentListings, setUrgentListings] = useState<Listing[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [totalCount, setTotalCount] = useState<number | null>(null);

    const [activeTopTab, setActiveTopTab] = useState<TopTab>('transport');
    const [plates, setPlates] = useState<any[]>([]);
    const [plateSearchRegion, setPlateSearchRegion] = useState('');
    const [plateSearchSeries, setPlateSearchSeries] = useState('');
    const [plateSearchNumber, setPlateSearchNumber] = useState('');
    const platesKey = `${plateSearchRegion}|${plateSearchSeries}|${plateSearchNumber}`;
    const [platesPageState, setPlatesPageState] = useState({ key: platesKey, page: 1 });
    const platesPage = platesPageState.key === platesKey ? platesPageState.page : 1;
    const setPlatesPage = (p: number) => setPlatesPageState({ key: platesKey, page: p });
    const [totalPlatesPages, setTotalPlatesPages] = useState(1);

    const [activeFilterType, setActiveFilterType] = useState<FilterType>('cash');
    const [todayCount, setTodayCount] = useState<number>(0);
    const [selectedBrand, setSelectedBrand] = useState<any>(null);
    const [selectedModel, setSelectedModel] = useState<any>(null);
    const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});

    // Page numbers reset to 1 whenever the query they belong to changes
    const listingsKey = JSON.stringify([activeFilterType, selectedBrand?.id, selectedModel?.id, advancedFilters]);
    const [pageState, setPageState] = useState({ key: listingsKey, page: 1 });
    const page = pageState.key === listingsKey ? pageState.page : 1;
    const setPage = (p: number) => setPageState({ key: listingsKey, page: p });
    const [totalPages, setTotalPages] = useState(1);

    // Whether something is already on screen; a refetch then updates silently
    const hasListings = useRef(false);
    const hasPlates = useRef(false);
    const scrollRef = useRef<any>(null);
    const gridY = useRef(0);

    const activeFilterCount = countActiveFilters(advancedFilters);

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
            // Drop empty values so "no filters" really is an empty object
            const clean = Object.fromEntries(Object.entries(filters || {}).filter(([, v]) => v !== '' && v != null));
            setAdvancedFilters(clean);
            sub.remove();
        });
        router.push({ pathname: '/filter', params: { eventName, initialFilters: JSON.stringify(advancedFilters) } });
    };

    const handleResetSearch = () => {
        setSelectedBrand(null);
        setSelectedModel(null);
        setAdvancedFilters({});
    };

    const handleResetPlateSearch = () => {
        setPlateSearchRegion('');
        setPlateSearchSeries('');
        setPlateSearchNumber('');
    };

    const showAllUrgent = () => {
        setActiveFilterType('urgent');
        scrollToGrid();
    };

    const scrollToGrid = () => scrollRef.current?.scrollTo({ y: Math.max(0, gridY.current - 80), animated: true });

    const fetchListings = useCallback(async () => {
        if (!hasListings.current) setLoading(true);
        try {
            const { data, count } = await withRetry(() => {
                let query = supabase
                    .from('listings')
                    .select(LISTING_COLUMNS, { count: 'exact' })
                    .eq('status', 'approved')
                    .order('is_vip', { ascending: false })
                    .order('created_at', { ascending: false });
                if (activeFilterType === 'credit') query = query.eq('is_credit', true);
                if (activeFilterType === 'barter') query = query.eq('is_barter', true);
                if (activeFilterType === 'urgent') query = query.eq('is_urgent', true);
                if (selectedBrand) query = query.eq('make', selectedBrand.name);
                if (selectedModel) query = query.eq('model', selectedModel.name);
                query = applyAdvancedFilters(query, advancedFilters);
                return query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
            });

            const rows = (data || []) as Listing[];
            setListings(rows);
            hasListings.current = rows.length > 0;
            setLoadError(false);
            if (count !== null) {
                setTotalCount(count);
                setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
            }

            const isDefaultFeed = page === 1 && !selectedBrand && !selectedModel && activeFilterType === 'cash' && Object.keys(advancedFilters).length === 0;
            if (isDefaultFeed) {
                setVipListings(rows.filter(l => l.is_vip).slice(0, 8));
                setUrgentListings(rows.filter(l => l.is_urgent).slice(0, 8));
                if (rows.length > 0) AsyncStorage.setItem(HOME_LISTINGS_CACHE_KEY, JSON.stringify(rows)).catch(() => {});
            }
        } catch (err) {
            console.error('Error fetching web listings:', err);
            if (!hasListings.current) setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [activeFilterType, selectedBrand, selectedModel, advancedFilters, page]);

    const fetchPlates = useCallback(async () => {
        if (!hasPlates.current) setLoading(true);
        try {
            const { data, count } = await withRetry(() => {
                let query = supabase
                    .from('plates')
                    .select('id, region, series, number, price, description, is_vip, created_at, status', { count: 'exact' })
                    .eq('status', 'approved')
                    .order('is_vip', { ascending: false })
                    .order('created_at', { ascending: false });
                if (plateSearchRegion) query = query.eq('region', plateSearchRegion);
                if (plateSearchSeries) query = query.ilike('series', `${plateSearchSeries}%`);
                if (plateSearchNumber) query = query.ilike('number', `${plateSearchNumber}%`);
                return query.range((platesPage - 1) * PAGE_SIZE, platesPage * PAGE_SIZE - 1);
            });

            const rows = data || [];
            setPlates(rows);
            hasPlates.current = rows.length > 0;
            setLoadError(false);
            if (count !== null) setTotalPlatesPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));

            const isDefaultPlates = platesPage === 1 && !plateSearchRegion && !plateSearchSeries && !plateSearchNumber;
            if (isDefaultPlates && rows.length > 0) {
                AsyncStorage.setItem(HOME_PLATES_CACHE_KEY, JSON.stringify(rows)).catch(() => {});
            }
        } catch (err) {
            console.error('Error fetching web plates:', err);
            if (!hasPlates.current) setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [plateSearchRegion, plateSearchSeries, plateSearchNumber, platesPage]);

    useEffect(() => {
        AsyncStorage.getItem(HOME_LISTINGS_CACHE_KEY).then((cached) => {
            if (!cached) return;
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0 && !hasListings.current) {
                    hasListings.current = true;
                    setListings(parsed);
                    setVipListings(parsed.filter((l: any) => l.is_vip).slice(0, 8));
                    setUrgentListings(parsed.filter((l: any) => l.is_urgent).slice(0, 8));
                    setLoading(false);
                }
            } catch { }
        }).catch(() => {});
        AsyncStorage.getItem(HOME_PLATES_CACHE_KEY).then((cached) => {
            if (!cached) return;
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0 && !hasPlates.current) {
                    hasPlates.current = true;
                    setPlates(parsed);
                }
            } catch { }
        }).catch(() => {});

        getFavorites().then(setFavorites);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        (async () => {
            const { count, error } = await supabase
                .from('listings')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'approved')
                .gte('created_at', startOfToday.toISOString());
            if (!error && count !== null) setTodayCount(count);
        })().catch((err) => console.error('Error fetching today count:', err));
    }, []);

    // Each tab refetches only when its own query changes
    useEffect(() => {
        if (activeTopTab !== 'transport') return;
        const timer = setTimeout(() => fetchListings(), 250);
        return () => clearTimeout(timer);
    }, [fetchListings, activeTopTab]);

    useEffect(() => {
        if (activeTopTab !== 'plates') return;
        const timer = setTimeout(() => fetchPlates(), 250);
        return () => clearTimeout(timer);
    }, [fetchPlates, activeTopTab]);

    const handleToggleFavorite = useCallback(async (id: string) => {
        const isFav = await toggleFavorite(id);
        setFavorites(prev => isFav ? [...prev, id] : prev.filter(fid => fid !== id));
        showToast(isFav ? 'Seçilmişlərə əlavə edildi' : 'Seçilmişlərdən silindi', 'success');
    }, [showToast]);

    const openListing = (car: Listing) => router.push(`/listing/${car.short_id || car.id}` as any);

    const renderCar = (car: Listing) => (
        <HoverLift>
            <CarCard
                {...carCardProps(car)}
                isFavorite={favorites.includes(car.id)}
                onToggleFavorite={handleToggleFavorite}
                onPress={() => openListing(car)}
            />
        </HoverLift>
    );

    const isTransport = activeTopTab === 'transport';
    const items = isTransport ? listings : plates;
    const hasSearch = !!(selectedBrand || selectedModel || activeFilterCount);
    const hasPlateSearch = !!(plateSearchRegion || plateSearchSeries || plateSearchNumber);
    const heroSize = isMobile ? { fontSize: 38, lineHeight: 44, letterSpacing: -1.2 } : width < 1024 ? { fontSize: 56, lineHeight: 62 } : null;

    const mTitleFont = Math.max(22, Math.min(30, (width - 32) / 13.2));
    const mTitleSize = { fontSize: mTitleFont, lineHeight: Math.round(mTitleFont * 1.2) };

    const divider = <View style={[isMobile ? styles.dividerH : styles.dividerV, { backgroundColor: t.hairline }]} />;

    return (
        <ScrollView
            ref={scrollRef}
            style={{ flex: 1, backgroundColor: t.bg }}
            contentContainerStyle={{ paddingTop: isMobile ? HEADER_HEIGHT.mobile : HEADER_HEIGHT.desktop, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
        >
            <SeoHead
                title="Naxçıvan Avto — Avtomobil və nömrə elanları"
                description="Naxçıvanda avtomobil və qeydiyyat nişanı elanları: satış, kredit və barter. Elanınızı pulsuz yerləşdirin."
                path="/"
            />
            {/* ═══ HERO ═══ */}
            {isMobile ? (
            <LavaHero style={styles.hero} contentStyle={styles.mHeroContent}>
                <Segmented<TopTab>
                    options={[{ value: 'transport', label: 'Nəqliyyat' }, { value: 'plates', label: 'Nömrələr' }]}
                    value={activeTopTab}
                    onChange={setActiveTopTab}
                    style={{ marginBottom: 18 }}
                    onDark
                />
                <Text role="heading" aria-level={1} style={[styles.mTitle, mTitleSize, { color: '#FFFFFF' }]} numberOfLines={1}>
                    Xəyalındakı{' '}
                    <Typewriter words={MOBILE_TYPEWRITER_WORDS} color="#FFB3A6" style={[styles.mTitle, mTitleSize]} />
                </Text>
                <Text style={[styles.mTitle, mTitleSize, { color: '#FFFFFF' }]} numberOfLines={1}>tapmaq daha asan!</Text>
                <Text style={styles.mSub}>
                    {isTransport
                        ? totalCount != null ? `${totalCount.toLocaleString('az')} aktiv elan · Naxçıvan` : 'Naxçıvanda alqı-satqı elanları'
                        : 'Qeydiyyat nişanı elanları'}
                </Text>

                <View style={[styles.mSearch, { backgroundColor: t.surface, borderColor: t.hairline }]}>
                    {isTransport ? (
                        <>
                            <TouchableOpacity style={styles.mField} onPress={handleBrandSelect} activeOpacity={0.7}>
                                <Text style={[styles.mFieldLabel, { color: t.textSecondary }]}>Marka</Text>
                                <Text style={[styles.mFieldValue, { color: selectedBrand ? t.text : t.placeholder }]} numberOfLines={1}>{selectedBrand?.name || 'Hamısı'}</Text>
                            </TouchableOpacity>
                            <View style={[styles.mDivider, { backgroundColor: t.hairline }]} />
                            <TouchableOpacity style={styles.mField} onPress={handleModelSelect} activeOpacity={0.7}>
                                <Text style={[styles.mFieldLabel, { color: t.textSecondary }]}>Model</Text>
                                <Text style={[styles.mFieldValue, { color: selectedModel ? t.text : t.placeholder }]} numberOfLines={1}>{selectedModel?.name || 'Hamısı'}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={[styles.mField, { flex: 0.8 }]}>
                                <Text style={[styles.mFieldLabel, { color: t.textSecondary }]}>Region</Text>
                                <TextInput value={plateSearchRegion} onChangeText={(v) => setPlateSearchRegion(v.replace(/\D/g, ''))} placeholder="90" placeholderTextColor={t.placeholder} keyboardType="number-pad" maxLength={2} style={[styles.mFieldValue, styles.plateInput, { color: t.text }]} />
                            </View>
                            <View style={[styles.mDivider, { backgroundColor: t.hairline }]} />
                            <View style={[styles.mField, { flex: 0.8 }]}>
                                <Text style={[styles.mFieldLabel, { color: t.textSecondary }]}>Seriya</Text>
                                <TextInput value={plateSearchSeries} onChangeText={(v) => setPlateSearchSeries(v.toUpperCase())} placeholder="AA" placeholderTextColor={t.placeholder} autoCapitalize="characters" maxLength={2} style={[styles.mFieldValue, styles.plateInput, { color: t.text }]} />
                            </View>
                            <View style={[styles.mDivider, { backgroundColor: t.hairline }]} />
                            <View style={styles.mField}>
                                <Text style={[styles.mFieldLabel, { color: t.textSecondary }]}>Nömrə</Text>
                                <TextInput value={plateSearchNumber} onChangeText={(v) => setPlateSearchNumber(v.replace(/\D/g, ''))} placeholder="000" placeholderTextColor={t.placeholder} keyboardType="number-pad" maxLength={3} style={[styles.mFieldValue, styles.plateInput, { color: t.text }]} />
                            </View>
                        </>
                    )}
                    {(isTransport ? hasSearch : hasPlateSearch) && (
                        <TouchableOpacity onPress={isTransport ? handleResetSearch : handleResetPlateSearch} style={styles.mReset} accessibilityLabel="Axtarışı təmizlə">
                            <X size={16} color={t.textSecondary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={isTransport ? handleFilterPress : () => { fetchPlates(); scrollToGrid(); }}
                        style={[styles.mAction, { backgroundColor: isTransport ? t.text : t.accent }]}
                        accessibilityLabel={isTransport ? 'Filtr' : 'Axtar'}
                    >
                        {isTransport
                            ? <SlidersHorizontal size={18} color={t.bg} />
                            : <Search size={18} color="#FFF" strokeWidth={2.4} />}
                        {isTransport && activeFilterCount > 0 && (
                            <View style={[styles.mBadge, { backgroundColor: t.accent }]}><Text style={styles.mBadgeText}>{activeFilterCount}</Text></View>
                        )}
                    </TouchableOpacity>
                </View>
            </LavaHero>
            ) : (
            <LavaHero style={styles.hero} contentStyle={styles.heroContent}>
                <Container style={[styles.heroInner, isMobile && { paddingTop: 36, paddingBottom: 32 }]}>
                    <Text style={[styles.eyebrow, { color: 'rgba(255,255,255,0.6)' }]}>Naxçıvan Avto</Text>
                    <Text role="heading" aria-level={1} style={[styles.heroTitle, { color: '#FFFFFF' }, heroSize]}>
                        Xəyalındakı{'\n'}
                        <Typewriter words={TYPEWRITER_WORDS} color="#FFB3A6" style={[styles.heroTitle, heroSize]} />
                    </Text>
                    <Text style={[styles.heroSub, { color: 'rgba(255,255,255,0.72)' }, isMobile && { fontSize: 16, lineHeight: 24 }]}>
                        Avtomobil və qeydiyyat nişanı elanları — şəffaf qiymət, kredit və barter imkanı ilə.
                    </Text>

                    <Segmented<TopTab>
                        options={[{ value: 'transport', label: 'Nəqliyyat' }, { value: 'plates', label: 'Nömrələr' }]}
                        value={activeTopTab}
                        onChange={setActiveTopTab}
                        style={{ alignSelf: 'center', marginBottom: 20 }}
                        onDark
                    />

                    <View style={[styles.searchBar, { backgroundColor: t.surface, borderColor: t.hairlineStrong, boxShadow: t.shadow } as any, isMobile && styles.searchBarMobile]}>
                        {isTransport ? (
                            <>
                                <Field t={t} isMobile={isMobile} label="Marka" value={selectedBrand?.name} placeholder="Bütün markalar" onPress={handleBrandSelect} />
                                {divider}
                                <Field t={t} isMobile={isMobile} label="Model" value={selectedModel?.name} placeholder={selectedBrand ? 'Bütün modellər' : 'Əvvəlcə marka'} onPress={handleModelSelect} />
                            </>
                        ) : (
                            <>
                                <PlateInput t={t} isMobile={isMobile} label="Region" placeholder="90" value={plateSearchRegion} onChangeText={(v) => setPlateSearchRegion(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} />
                                {divider}
                                <PlateInput t={t} isMobile={isMobile} label="Seriya" placeholder="AA" value={plateSearchSeries} onChangeText={(v) => setPlateSearchSeries(v.toUpperCase())} autoCapitalize="characters" maxLength={2} />
                                {divider}
                                <PlateInput t={t} isMobile={isMobile} label="Nömrə" placeholder="000" value={plateSearchNumber} onChangeText={(v) => setPlateSearchNumber(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={3} />
                            </>
                        )}

                        <View style={[styles.searchActions, isMobile && { paddingTop: 10 }]}>
                            {(isTransport ? hasSearch : hasPlateSearch) && (
                                <TouchableOpacity
                                    onPress={isTransport ? handleResetSearch : handleResetPlateSearch}
                                    style={[styles.clearBtn, { backgroundColor: t.fill }]}
                                    accessibilityLabel="Axtarışı təmizlə"
                                >
                                    <X size={15} color={t.textSecondary} />
                                </TouchableOpacity>
                            )}
                            {isTransport && (
                                <Button
                                    variant="secondary"
                                    title={activeFilterCount ? `Filtr · ${activeFilterCount}` : 'Filtr'}
                                    icon={<SlidersHorizontal size={16} color={t.text} />}
                                    onPress={handleFilterPress}
                                    style={isMobile ? { flex: 1 } : undefined}
                                />
                            )}
                            <Button
                                title="Axtar"
                                icon={<Search size={16} color="#FFF" strokeWidth={2.4} />}
                                onPress={() => { (isTransport ? fetchListings : fetchPlates)(); scrollToGrid(); }}
                                style={isMobile ? { flex: 1 } : undefined}
                            />
                        </View>
                    </View>

                    <Text style={[styles.heroMeta, { color: 'rgba(255,255,255,0.65)' }]}>
                        {totalCount != null && <><Text style={{ color: '#FFFFFF', fontFamily: FONT.semibold }}>{totalCount.toLocaleString('az')}</Text> aktiv elan · </>}
                        bu gün <Text style={{ color: '#FFFFFF', fontFamily: FONT.semibold }}>+{todayCount}</Text> yeni
                    </Text>
                </Container>
            </LavaHero>
            )}

            {/* Phone: the app's icon category strip replaces the segmented filter */}
            {isMobile && isTransport && (
                <View role="tablist" style={[styles.catStrip, { borderBottomColor: t.hairline }]}>
                    {CATEGORIES.map(({ type, label, icon: Icon }) => {
                        const active = activeFilterType === type;
                        const tone = active ? t.text : t.textSecondary;
                        return (
                            <TouchableOpacity key={type} role="tab" aria-selected={active} style={styles.catTab} onPress={() => setActiveFilterType(type)} activeOpacity={0.6}>
                                <Icon size={22} color={tone} strokeWidth={active ? 2 : 1.6} />
                                <Text style={[styles.catLabel, { color: tone, fontFamily: active ? FONT.bold : FONT.medium }]} numberOfLines={1}>{label}</Text>
                                <View style={[styles.catUnderline, { backgroundColor: active ? t.text : 'transparent' }]} />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {width < 1024 && !!(settings.home_banner_url || settings.home_banner_url_2) && (
                // BannerSlider sizes its pages to the window, so it must not sit inside the padded Container
                <View style={{ marginTop: isMobile ? 16 : 24 }}>
                    <BannerSlider
                        images={[settings.home_banner_url, settings.home_banner_url_2, settings.home_banner_url_3]}
                        height={isMobile ? 120 : 180}
                    />
                </View>
            )}

            {/* ═══ URGENT + VIP rails ═══ */}
            {isTransport && !isMobile && [
                { key: 'urgent', title: 'Təcili elanlar', subtitle: 'Sahibi tez satmaq istəyir', data: urgentListings },
                { key: 'vip', title: 'VIP elanlar', subtitle: 'Seçilmiş premium elanlar', data: vipListings },
            ].filter(r => r.data.length > 0).map((rail) => (
                <Container key={rail.key} style={{ marginTop: isMobile ? 32 : 48 }}>
                    <SectionHeader title={rail.title} subtitle={rail.subtitle} actionLabel={rail.key === 'urgent' ? 'Hamısına bax' : undefined} onAction={rail.key === 'urgent' ? showAllUrgent : undefined} />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginHorizontal: isMobile ? -16 : -32 }}
                        contentContainerStyle={{ paddingHorizontal: isMobile ? 16 : 32, gap: 16, paddingTop: 4 }}
                    >
                        {rail.data.map(car => (
                            <View key={car.id} style={{ width: isMobile ? 220 : 260 }}>{renderCar(car)}</View>
                        ))}
                    </ScrollView>
                </Container>
            ))}

            {/* ═══ GRID ═══ */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
                <WebSideBanners side="left" />

                <Container style={{ flex: 1, marginTop: isMobile ? 20 : 56 }}>
                    <View onLayout={(e) => { gridY.current = e.nativeEvent.layout.y; }}>
                        <SectionHeader
                            title={isTransport ? 'Son elanlar' : 'Qeydiyyat nişanları'}
                            subtitle={!loading ? `${items.length} ${isTransport ? 'elan' : 'nömrə'} göstərilir` : undefined}
                            right={isTransport && !isMobile ? (
                                <Segmented<FilterType>
                                    options={[
                                        { value: 'cash', label: 'Hamısı' },
                                        { value: 'credit', label: 'Kredit' },
                                        { value: 'barter', label: 'Barter' },
                                        { value: 'urgent', label: 'Təcili' },
                                    ]}
                                    value={activeFilterType}
                                    onChange={setActiveFilterType}
                                />
                            ) : undefined}
                        />
                    </View>

                    {loading ? (
                        <Loading label={isTransport ? 'Elanlar yüklənir…' : 'Nömrələr yüklənir…'} />
                    ) : loadError && items.length === 0 ? (
                        <EmptyState
                            title="Bağlantı alınmadı"
                            subtitle="İnternet bağlantınızı yoxlayıb yenidən cəhd edin."
                            action={<Button title="Yenidən cəhd et" onPress={() => (isTransport ? fetchListings() : fetchPlates())} />}
                        />
                    ) : items.length === 0 ? (
                        <EmptyState
                            icon={<Search size={28} color={t.textSecondary} />}
                            title="Nəticə tapılmadı"
                            subtitle="Axtarış meyarlarını dəyişin və ya filtrləri sıfırlayın."
                            action={<Button variant="secondary" title="Sıfırla" onPress={() => {
                                if (isTransport) { handleResetSearch(); setActiveFilterType('cash'); } else handleResetPlateSearch();
                            }} />}
                        />
                    ) : isTransport ? (
                        <WebGrid data={listings} keyExtractor={(c) => c.id} renderItem={(car) => renderCar(car)} minItemWidth={isMobile ? 150 : 220} gap={isMobile ? 12 : 16} />
                    ) : (
                        <WebGrid
                            data={plates}
                            keyExtractor={(p: any) => p.id}
                            minItemWidth={isMobile ? 150 : 220}
                            gap={isMobile ? 12 : 16}
                            renderItem={(plate: any) => (
                                <HoverLift>
                                    <PlateCard
                                        region={plate.region}
                                        series={plate.series}
                                        number={plate.number}
                                        price={plate.price}
                                        description={plate.description}
                                        isVip={plate.is_vip}
                                        onPress={() => router.push(`/plate/${plate.id}` as any)}
                                    />
                                </HoverLift>
                            )}
                        />
                    )}

                    {!loading && (isTransport ? totalPages > 1 : totalPlatesPages > 1) && (
                        <Pagination
                            currentPage={isTransport ? page : platesPage}
                            totalPages={isTransport ? totalPages : totalPlatesPages}
                            onPageChange={(p) => {
                                (isTransport ? setPage : setPlatesPage)(p);
                                scrollToGrid();
                            }}
                        />
                    )}
                </Container>

                <WebSideBanners side="right" />
            </View>

            {/* ═══ CTA ═══ */}
            <Container style={{ marginTop: isMobile ? 32 : 56, marginBottom: isMobile ? 40 : 72 }}>
                <Card padding={isMobile ? 24 : 40} style={[styles.cta, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <View style={{ flexShrink: 1, gap: 6 }}>
                        <Text style={[styles.ctaTitle, { color: t.text }, isMobile && { fontSize: 22 }]}>Avtomobilinizi satırsınız?</Text>
                        <Text style={[styles.ctaSub, { color: t.textSecondary }]}>Elanı bir neçə dəqiqəyə yerləşdirin — alıcılar sizi tapsın.</Text>
                    </View>
                    <Button title="Elan ver" size="lg" icon={<Plus size={18} color="#FFF" strokeWidth={2.6} />} onPress={() => router.push('/add-listing' as any)} />
                </Card>
            </Container>

            <WebFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    hero: { borderRadius: 0, borderWidth: 0 },
    heroContent: { padding: 0 },
    mHeroContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16 },
    mTitle: { fontFamily: FONT.heavy, letterSpacing: -0.6 },
    mSub: { fontSize: 15, fontFamily: FONT.medium, color: 'rgba(255,255,255,0.72)', marginTop: 8, marginBottom: 16 },
    mSearch: { flexDirection: 'row', alignItems: 'center', height: 62, padding: 6, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, boxShadow: '0px 8px 24px rgba(0,0,0,0.25)' } as any,
    mField: { flex: 1, minWidth: 0, justifyContent: 'center', paddingLeft: 12, cursor: 'pointer' as any },
    mFieldLabel: { fontSize: 11, fontFamily: FONT.medium, marginBottom: 2 },
    mFieldValue: { fontSize: 15, fontFamily: FONT.semibold },
    mDivider: { width: StyleSheet.hairlineWidth, height: '50%', marginHorizontal: 8 },
    mReset: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    mAction: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    mBadge: { position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
    mBadgeText: { color: '#FFF', fontSize: 10, fontFamily: FONT.bold },
    catStrip: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, borderBottomWidth: StyleSheet.hairlineWidth },
    catTab: { flex: 1, alignItems: 'center', paddingTop: 6, gap: 6, cursor: 'pointer' as any },
    catLabel: { fontSize: 12 },
    catUnderline: { height: 2, width: 32, borderRadius: 1, marginTop: 4 },
    heroInner: { alignItems: 'center', paddingTop: 72, paddingBottom: 56 },
    eyebrow: { fontSize: 15, fontFamily: FONT.semibold, marginBottom: 12 },
    heroTitle: { fontSize: 72, lineHeight: 78, fontFamily: FONT.heavy, letterSpacing: -2.4, textAlign: 'center' },
    heroSub: { fontSize: 19, lineHeight: 28, fontFamily: FONT.regular, textAlign: 'center', maxWidth: 560, marginTop: 18, marginBottom: 32 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: 760,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 8,
        paddingLeft: 12,
        minHeight: 68,
    },
    searchBarMobile: { flexDirection: 'column', alignItems: 'stretch', padding: 12, borderRadius: 16 },
    field: { flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, cursor: 'pointer' as any },
    fieldMobile: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: 4, paddingVertical: 10 },
    fieldLabel: { fontSize: 12, fontFamily: FONT.semibold, marginBottom: 2 },
    fieldValue: { fontSize: 16, fontFamily: FONT.semibold },
    plateInput: { padding: 0, height: 24, outlineStyle: 'none' } as any,
    dividerV: { width: StyleSheet.hairlineWidth, height: 32 },
    dividerH: { height: StyleSheet.hairlineWidth },
    searchActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    clearBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    heroMeta: { fontSize: 14, fontFamily: FONT.regular, marginTop: 18 },
    cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
    ctaTitle: { fontSize: 28, fontFamily: FONT.heavy, letterSpacing: -0.6 },
    ctaSub: { fontSize: 16, fontFamily: FONT.regular },
});
