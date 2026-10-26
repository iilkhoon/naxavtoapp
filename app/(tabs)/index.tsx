import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
  Dimensions,
  Image as RNImage,
  DeviceEventEmitter,
  AppState,
  TextStyle,
  StyleProp,
  useWindowDimensions,
  TextInput,
  FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SlidersHorizontal, Sun, Moon, Calculator, Wallet, Percent, ArrowLeftRight, X, Zap, Gift, AlertCircle, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CarCard } from '../../components/CarCard';
import { PlateCard } from '../../components/PlateCard';
import { BannerSlider } from '../../components/BannerSlider';
import { Pagination } from '../../components/Pagination';
import { FloatingChatButton } from '../../components/FloatingChatButton';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Listing, Plate, Brand, Model, AdvancedFilters } from '../../types';

const { width } = Dimensions.get('window');

type FilterType = 'cash' | 'credit' | 'barter' | 'urgent';

const HOME_LISTINGS_CACHE_KEY = 'home_listings_cache';
const HOME_PLATES_CACHE_KEY = 'home_plates_cache';

// Cold starts can hit a stalled first request (network not ready yet): retry with backoff
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [800, 2000, 4000];

// Improved Looping Typewriter Component
const Typewriter = ({ words, color, style }: { words: string[], color: string, style?: StyleProp<TextStyle> }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  // Typing logic
  useEffect(() => {
    const currentWord = words[currentWordIndex];
    const typeSpeed = 100;
    const deleteSpeed = 50;
    const pauseTime = 2000; // Wait time before deleting

    let timer: ReturnType<typeof setTimeout>;

    if (isDeleting) {
      // Deleting
      timer = setTimeout(() => {
        setDisplayedText(prev => prev.slice(0, -1));
        if (displayedText.length === 0) {
          setIsDeleting(false);
          setCurrentWordIndex(prev => (prev + 1) % words.length);
        }
      }, deleteSpeed);
    } else {
      // Typing
      if (displayedText.length < currentWord.length) {
        timer = setTimeout(() => {
          setDisplayedText(currentWord.slice(0, displayedText.length + 1));
        }, typeSpeed);
      } else {
        // Finished typing, wait then start deleting
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentWordIndex, words]);

  return (
    <Text style={[style, { color, fontFamily: 'RethinkSans_800ExtraBold' }]}>
      {displayedText}
      <Text style={{ color: color, opacity: cursorVisible ? 1 : 0 }}>|</Text>
    </Text>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  // ~13 em is the width of the longest hero line, "Xəyalındakı avtomobili|"
  const heroFont = Math.max(22, Math.min(30, (screenWidth - 40) / 13.2));
  const heroTextSize = { fontSize: heroFont, lineHeight: Math.round(heroFont * 1.2) };
  const { showToast } = useToast();
  const { colors, toggleTheme, isDark } = useTheme();
  const { settings } = useSettings();

  const [activeTopTab, setActiveTopTab] = useState<'transport' | 'plates'>('transport');
  const [listings, setListings] = useState<Listing[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [platesLoading, setPlatesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platesError, setPlatesError] = useState<string | null>(null);
  const [activeCompetition, setActiveCompetition] = useState<any>(null);
  const [competitionParticipantCount, setCompetitionParticipantCount] = useState<number>(0);

  const listingsRequestIdRef = React.useRef(0);
  // Set when listings gave up after all retries; refetched when the app returns to the foreground
  const listingsFailedRef = React.useRef(false);
  const platesRequestIdRef = React.useRef(0);

  const fetchActiveCompetition = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setActiveCompetition(data);
        // Fetch participant count
        const { data: count } = await supabase
          .rpc('get_competition_participant_count', { p_competition_id: data.id });
        setCompetitionParticipantCount(count ?? 0);
      } else {
        setActiveCompetition(null);
        setCompetitionParticipantCount(0);
      }
    } catch (err) {
      setActiveCompetition(null);
      setCompetitionParticipantCount(0);
    }
  };
  const flatListRef = React.useRef<FlatList>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalListings, setTotalListings] = useState<number | null>(null);
  const [platesPage, setPlatesPage] = useState(1);
  const [totalPlatesPages, setTotalPlatesPages] = useState(1);
  const PAGE_SIZE = 50;

  // Car Filters
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [activeFilterType, setActiveFilterType] = useState<FilterType>('cash');

  // Plate Filters
  const [plateSearchRegion, setPlateSearchRegion] = useState('');
  const [plateSearchSeries, setPlateSearchSeries] = useState('');
  const [plateSearchNumber, setPlateSearchNumber] = useState('');

  // Refs to always access the latest values inside async functions
  const selectedBrandRef = React.useRef(selectedBrand);
  selectedBrandRef.current = selectedBrand;

  const selectedModelRef = React.useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  const advancedFiltersRef = React.useRef(advancedFilters);
  advancedFiltersRef.current = advancedFilters;

  const activeFilterTypeRef = React.useRef(activeFilterType);
  activeFilterTypeRef.current = activeFilterType;

  const pageRef = React.useRef(page);
  pageRef.current = page;

  const plateSearchRegionRef = React.useRef(plateSearchRegion);
  plateSearchRegionRef.current = plateSearchRegion;

  const plateSearchSeriesRef = React.useRef(plateSearchSeries);
  plateSearchSeriesRef.current = plateSearchSeries;

  const plateSearchNumberRef = React.useRef(plateSearchNumber);
  plateSearchNumberRef.current = plateSearchNumber;

  const platesPageRef = React.useRef(platesPage);
  platesPageRef.current = platesPage;

  const ImageComponent = Platform.OS === 'web' ? RNImage : ExpoImage;

  const fetchListings = async (isRefresh = false, retryCount = 0) => {
    const currentRequestId = ++listingsRequestIdRef.current;
    let isRetrying = false;
    try {
      if ((!isRefresh && listings.length === 0) || (isRefresh && error)) {
        setListingsLoading(true);
      }
      setError(null);

      const brand = selectedBrandRef.current;
      const model = selectedModelRef.current;
      const advFilters = advancedFiltersRef.current;
      const filterType = activeFilterTypeRef.current;
      const currentPage = pageRef.current;

      // Optimized query: Select only needed fields
      let query = supabase
        .from('listings')
        .select('id, make, model, price, currency, image_url, images, location, created_at, mileage, engine, year, is_credit, is_barter, is_vip, is_urgent, is_new, short_id', { count: 'exact' })
        .eq('status', 'approved')
        .order('is_vip', { ascending: false }) // VIPs first
        .order('created_at', { ascending: false });

      if (brand) query = query.eq('make', brand.name);
      if (model) query = query.eq('model', model.name);

      if (filterType === 'credit') query = query.eq('is_credit', true);
      if (filterType === 'barter') query = query.eq('is_barter', true);
      if (filterType === 'urgent') query = query.eq('is_urgent', true);

      if (advFilters.minPrice) query = query.gte('price', parseFloat(advFilters.minPrice));
      if (advFilters.maxPrice) query = query.lte('price', parseFloat(advFilters.maxPrice));

      if (advFilters.minYear) query = query.gte('year', parseInt(advFilters.minYear));
      if (advFilters.maxYear) query = query.lte('year', parseInt(advFilters.maxYear));

      if (advFilters.minMileage) query = query.gte('mileage', parseInt(advFilters.minMileage));
      if (advFilters.maxMileage) query = query.lte('mileage', parseInt(advFilters.maxMileage));

      if (advFilters.minEngine) query = query.gte('engine', advFilters.minEngine);
      if (advFilters.maxEngine) query = query.lte('engine', advFilters.maxEngine);

      if (advFilters.city) query = query.ilike('location', `%${advFilters.city}%`);

      if (advFilters.bodyType) query = query.eq('body_type', advFilters.bodyType);
      if (advFilters.fuelType) query = query.eq('fuel_type', advFilters.fuelType);
      if (advFilters.gearbox) query = query.eq('gearbox', advFilters.gearbox);
      if (advFilters.transmission) query = query.eq('transmission', advFilters.transmission);
      if (advFilters.color) query = query.eq('color', advFilters.color);
      if (advFilters.market) query = query.eq('market', advFilters.market);

      if (advFilters.isNew) query = query.eq('is_new', true);
      if (advFilters.isCredit) query = query.eq('is_credit', true);
      if (advFilters.isBarter) query = query.eq('is_barter', true);

      // Limit results for performance
      query = query.range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      const { data, count, error: supabaseError } = await query;
      if (supabaseError) throw supabaseError;

      if (currentRequestId === listingsRequestIdRef.current) {
        if (data) {
          listingsFailedRef.current = false;
          setListings(data as Listing[]);
          if (count !== null && count !== undefined) {
            setTotalPages(Math.ceil(count / PAGE_SIZE));
            setTotalListings(count);
          }

          // Save default page 1 to cache for instant cold start display
          const isDefaultFeed = currentPage === 1 && !brand && !model && filterType === 'cash' && Object.keys(advFilters).length === 0;
          if (isDefaultFeed && data.length > 0) {
            AsyncStorage.setItem(HOME_LISTINGS_CACHE_KEY, JSON.stringify(data)).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      if (currentRequestId === listingsRequestIdRef.current) {
        // Retry with backoff on cold start / transient errors
        if (retryCount < MAX_RETRIES) {
          isRetrying = true;
          setTimeout(() => {
            fetchListings(isRefresh, retryCount + 1);
          }, RETRY_DELAYS_MS[retryCount]);
          return;
        }
        listingsFailedRef.current = true;
        if (listings.length === 0) setError('Məlumatları yükləmək mümkün olmadı.');
      }
    } finally {
      if (currentRequestId === listingsRequestIdRef.current && !isRetrying) {
        setListingsLoading(false);
        setRefreshing(false);
      }
    }
  };

  const fetchPlates = async (isRefresh = false, retryCount = 0) => {
    const currentRequestId = ++platesRequestIdRef.current;
    let isRetrying = false;
    try {
      if ((!isRefresh && plates.length === 0) || (isRefresh && platesError)) setPlatesLoading(true);
      setPlatesError(null);

      const region = plateSearchRegionRef.current;
      const series = plateSearchSeriesRef.current;
      const number = plateSearchNumberRef.current;
      const currentPlatesPage = platesPageRef.current;

      let query = supabase
        .from('plates')
        .select('id, region, series, number, price, description, is_vip, created_at, status', { count: 'exact' })
        .eq('status', 'approved')
        .order('is_vip', { ascending: false })
        .order('created_at', { ascending: false });

      if (region) query = query.eq('region', region);
      if (series) query = query.ilike('series', `${series}%`);
      if (number) query = query.ilike('number', `${number}%`);

      query = query.range((currentPlatesPage - 1) * PAGE_SIZE, currentPlatesPage * PAGE_SIZE - 1);

      const { data, count, error: platesErr } = await query;
      if (platesErr) throw platesErr;

      if (currentRequestId === platesRequestIdRef.current) {
        if (data) {
          setPlates(data as Plate[]);
          if (count !== null && count !== undefined) setTotalPlatesPages(Math.ceil(count / PAGE_SIZE));

          const isDefaultPlates = currentPlatesPage === 1 && !region && !series && !number;
          if (isDefaultPlates && data.length > 0) {
            AsyncStorage.setItem(HOME_PLATES_CACHE_KEY, JSON.stringify(data)).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Error fetching plates:', err);
      if (currentRequestId === platesRequestIdRef.current) {
        if (retryCount < MAX_RETRIES) {
          isRetrying = true;
          setTimeout(() => {
            fetchPlates(isRefresh, retryCount + 1);
          }, RETRY_DELAYS_MS[retryCount]);
          return;
        }
        if (plates.length === 0) setPlatesError('Nömrələri yükləmək mümkün olmadı.');
      }
    } finally {
      if (currentRequestId === platesRequestIdRef.current && !isRetrying) {
        setPlatesLoading(false);
        setRefreshing(false);
      }
    }
  };

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  };

  const handleToggleFavorite = useCallback(async (id: string) => {
    const isFav = await toggleFavorite(id);
    setFavorites(prev => isFav ? [...prev, id] : prev.filter(fid => fid !== id));
    if (isFav) showToast('Seçilmişlərə əlavə edildi', 'success');
    else showToast('Seçilmişlərdən silindi', 'info');
  }, [showToast]);

  useEffect(() => {
    // 1. Immediately load cache on cold start
    AsyncStorage.getItem(HOME_LISTINGS_CACHE_KEY).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setListings((prev) => (prev.length === 0 ? parsed : prev));
            setListingsLoading(false);
          }
        } catch (e) {}
      }
    }).catch(() => {});

    AsyncStorage.getItem(HOME_PLATES_CACHE_KEY).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlates((prev) => (prev.length === 0 ? parsed : prev));
          }
        } catch (e) {}
      }
    }).catch(() => {});

    loadFavorites();
    fetchActiveCompetition();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && listingsFailedRef.current) fetchListings(true);
    });

    const sub = DeviceEventEmitter.addListener('scroll_to_top_home', () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return () => {
      sub.remove();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedBrand, selectedModel, advancedFilters, activeFilterType]);

  useEffect(() => {
    setPlatesPage(1);
  }, [plateSearchRegion, plateSearchSeries, plateSearchNumber]);

  // When filters or page change for Transport, fetch listings
  useEffect(() => {
    if (activeTopTab === 'transport') {
      const delayDebounceFn = setTimeout(() => {
        fetchListings();
      }, 250);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [page, selectedBrand, selectedModel, activeTopTab, advancedFilters, activeFilterType]);

  // When filters or page change for Plates, fetch plates
  useEffect(() => {
    if (activeTopTab === 'plates') {
      const delayDebounceFn = setTimeout(() => {
        fetchPlates();
      }, 250);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [platesPage, plateSearchRegion, plateSearchSeries, plateSearchNumber, activeTopTab]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      // Notice: We only reload favorites on focus.
      // We do NOT re-fetch listings or reset state on focus when navigating back from details.
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTopTab === 'transport') fetchListings(true);
    else fetchPlates(true);
    loadFavorites();
    fetchActiveCompetition();
  }, [activeTopTab]);

  const handleBrandSelect = () => {
    const eventName = 'select_brand_home';
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
    const eventName = 'select_model_home';
    const sub = DeviceEventEmitter.addListener(eventName, (model) => {
      setSelectedModel(model);
      sub.remove();
    });
    router.push({ pathname: '/select-option', params: { type: 'model', title: 'Model Seçin', eventName, selectedId: selectedModel?.id, extraParams: JSON.stringify({ brand_id: selectedBrand.id }) } });
  };

  const handleFilterPress = () => {
    const eventName = 'apply_filters_home';
    const sub = DeviceEventEmitter.addListener(eventName, (filters) => {
      setAdvancedFilters(filters);
      sub.remove();
    });
    router.push({ pathname: '/filter', params: { eventName, initialFilters: JSON.stringify(advancedFilters) } });
  };

  const handleResetSearch = () => {
    setSelectedBrand(null);
    setSelectedModel(null);
  };

  const handleResetPlateSearch = () => {
    setPlateSearchRegion('');
    setPlateSearchSeries('');
    setPlateSearchNumber('');
  };

  const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

  // Category strip (Airbnb-style): line icon over a label, no boxes; the
  // selected one is full-contrast with an underline, the rest are muted.
  const CategoryTab = ({ type, label, icon: Icon }: { type: FilterType, label: string, icon: any }) => {
    const isActive = activeFilterType === type;
    const tone = isActive ? colors.text : colors.textSecondary;

    return (
      <TouchableOpacity
        style={styles.categoryTab}
        onPress={() => setActiveFilterType(type)}
        activeOpacity={0.6}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
      >
        <Icon size={22} color={tone} strokeWidth={isActive ? 2 : 1.6} />
        <Text style={[styles.categoryLabel, { color: tone }, isActive && styles.categoryLabelActive]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.categoryUnderline, { backgroundColor: isActive ? colors.text : 'transparent' }]} />
      </TouchableOpacity>
    );
  };

  const cardSurface = [
    styles.card,
    { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)' },
  ];

  const renderHeader = () => (
    <>
      {/* Large animated title */}
      <View style={styles.titleSection}>
        {/* Font size comes from the screen width so "Xəyalındakı avtomobili" always fits on one line (no re-wrap while typing) */}
        <Text style={[styles.largeTitle, heroTextSize, { color: colors.text }]} numberOfLines={1}>
          Xəyalındakı{' '}
          <Typewriter words={['avtomobili', 'nömrəni']} color={colors.primary} style={[styles.largeTitle, heroTextSize]} />
        </Text>
        <Text style={[styles.largeTitle, heroTextSize, { color: colors.text }]} numberOfLines={1}>tapmaq daha asan!</Text>
        <Text style={[styles.largeSubtitle, { color: colors.textSecondary }]}>
          {activeTopTab === 'transport'
            ? totalListings !== null
              ? `${totalListings} aktiv elan · Naxçıvan`
              : 'Naxçıvanda alqı-satqı elanları'
            : 'Qeydiyyat nişanı elanları'}
        </Text>
      </View>

      {activeTopTab === 'transport' ? (
        <View style={[cardSurface, styles.unifiedSearchContainer]}>
          <TouchableOpacity style={styles.searchInputItem} onPress={handleBrandSelect}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Marka</Text>
            <View style={styles.inputValueRow}>
              <Text style={[styles.inputValue, { color: selectedBrand ? colors.text : colors.placeholder }]} numberOfLines={1}>
                {selectedBrand ? selectedBrand.name : 'Seçin'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.searchInputItem} onPress={handleModelSelect}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Model</Text>
            <View style={styles.inputValueRow}>
              <Text style={[styles.inputValue, { color: selectedModel ? colors.text : colors.placeholder }]} numberOfLines={1}>
                {selectedModel ? selectedModel.name : 'Seçin'}
              </Text>
            </View>
          </TouchableOpacity>

          {(selectedBrand || selectedModel) && (
            <TouchableOpacity onPress={handleResetSearch} style={styles.resetButton}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            onPress={() => router.push('/calculator')}
            accessibilityLabel="Kredit kalkulyatoru"
          >
            <Calculator size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallActionBtn, { backgroundColor: colors.text }]}
            onPress={handleFilterPress}
            accessibilityLabel="Ətraflı filtr"
          >
            <SlidersHorizontal size={18} color={colors.background} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[cardSurface, styles.unifiedSearchContainer]}>
          <View style={[styles.searchInputItem, { flex: 0.8 }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Region</Text>
            <TextInput
              style={[styles.inputValue, { color: colors.text, padding: 0, fontSize: 18 }]}
              placeholder="90"
              placeholderTextColor={colors.placeholder}
              value={plateSearchRegion}
              onChangeText={setPlateSearchRegion}
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="next"
            />
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

          <View style={[styles.searchInputItem, { flex: 0.8 }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Seriya</Text>
            <TextInput
              style={[styles.inputValue, { color: colors.text, padding: 0, fontSize: 18 }]}
              placeholder="AA"
              placeholderTextColor={colors.placeholder}
              value={plateSearchSeries}
              onChangeText={(text) => setPlateSearchSeries(text.toUpperCase())}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>

          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

          <View style={[styles.searchInputItem, { flex: 1 }]}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nömrə</Text>
            <TextInput
              style={[styles.inputValue, { color: colors.text, padding: 0, fontSize: 18 }]}
              placeholder="000"
              placeholderTextColor={colors.placeholder}
              value={plateSearchNumber}
              onChangeText={setPlateSearchNumber}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          {!!(plateSearchRegion || plateSearchSeries || plateSearchNumber) && (
            <TouchableOpacity onPress={handleResetPlateSearch} style={styles.resetButton}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeTopTab === 'transport' && (
        <View>
          <View style={[styles.categoryStrip, { borderBottomColor: colors.border }]}>
            <CategoryTab type="cash" label="Nağd" icon={Wallet} />
            <CategoryTab type="credit" label="Kredit" icon={Percent} />
            <CategoryTab type="barter" label="Barter" icon={ArrowLeftRight} />
            <CategoryTab type="urgent" label="Təcili" icon={Zap} />
          </View>

          {activeCompetition && (
            <TouchableOpacity
              style={[cardSurface, styles.competitionBanner]}
              onPress={() => router.push('/competition')}
              activeOpacity={0.8}
            >
              <View style={styles.competitionContent}>
                <View style={[styles.competitionIconBg, { backgroundColor: colors.primarySoft }]}>
                  <Gift size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.competitionTitle, { color: colors.text }]}>{activeCompetition.title || 'Böyük Yarışma Başladı!'}</Text>
                  {activeCompetition.slogan ? (
                    <Text style={[styles.competitionSubtitle, { color: colors.textSecondary, marginTop: 2 }]}>
                      {activeCompetition.slogan}
                    </Text>
                  ) : null}
                  <Text style={[styles.competitionSubtitle, { color: colors.textSecondary, marginTop: 2, fontSize: 11 }]}>
                    İştirakçı: {activeCompetition.max_participants || 0}
                  </Text>
                </View>
                <View style={[styles.competitionAction, { backgroundColor: colors.primary }]}>
                  <Text style={styles.competitionActionText}>Qatıl</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          <BannerSlider
            images={[
              settings.home_banner_url,
              settings.home_banner_url_2,
              settings.home_banner_url_3
            ]}
            height={120}
          />
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {activeTopTab === 'transport' ? 'Son elanlar' : 'Bütün nömrələr'}
        </Text>
      </View>
    </>
  );


  const { width } = Dimensions.get('window'); // Get width inside component for updates or useWindowDimensions
  const windowWidth = Dimensions.get('window').width;
  const numColumns = windowWidth > 768 ? 4 : 2;

  // Memoized data processing for grid with banner
  const processedData = React.useMemo(() => {
    if (activeTopTab === 'plates') return plates;

    const rows: any[] = [];
    let currentChunk: Listing[] = [];

    listings.forEach((item, index) => {
      // Inject banner after a certain number of rows? 
      // Original logic injected after 6 items (3 rows of 2).
      // Let's keep it simple: inject banner after index 8 (still roughly top of page)
      if (index === 8) {
        if (currentChunk.length > 0) {
          rows.push({ type: 'row', items: currentChunk });
          currentChunk = [];
        }
        rows.push({ type: 'banner' });
      }

      currentChunk.push(item);
      if (currentChunk.length === numColumns) {
        rows.push({ type: 'row', items: currentChunk });
        currentChunk = [];
      }
    });

    if (currentChunk.length > 0) {
      rows.push({ type: 'row', items: currentChunk });
    }

    return rows;
  }, [listings, activeTopTab, plates, numColumns]);

  const renderRow = useCallback(({ item }: { item: any }) => {
    if (activeTopTab === 'plates') {
      // Standard render for plates (using existing logic, but simplified since we might not process plates the same way yet)
      // actually, let's keep plates as is?
      // If standard FlatList is used for both, we need consistent data structure.
      // Let's keep plates linear for now and simple.
      return (
        <PlateCard
          region={item.region}
          series={item.series}
          number={item.number}
          price={item.price}
          description={item.description}
          isVip={item.is_vip}
          index={0}
          onPress={() => router.push(`/plate/${item.id}`)}
        />
      );
    }

    if (item.type === 'banner') {
      return (
        <View>
          <BannerSlider
            images={[
              settings.home_mid_banner_1,
              settings.home_mid_banner_2,
              settings.home_mid_banner_3
            ]}
            height={120}
          />
        </View>
      );
    }

    if (item.type === 'row') {
      return (
        <View style={styles.rowContainer}>
          {item.items.map((car: Listing, i: number) => (
            <View
              key={car.id}
              style={{
                flex: 1,
                // Add padding to create gaps
                paddingRight: i < item.items.length - 1 ? 8 : 0,
                paddingLeft: i > 0 ? 8 : 0
              }}
            >
              <CarCard
                id={car.id}
                index={i}
                title={car.make + ' ' + car.model}
                price={car.price}
                currency={car.currency || 'AZN'}
                image={car.image_url}
                images={car.images}
                location={car.location}
                date={car.created_at}
                mileage={car.mileage}
                engine={car.engine}
                year={car.year}
                isCredit={car.is_credit}
                isBarter={car.is_barter}
                isVip={car.is_vip}
                isNew={car.is_new}
                isUrgent={car.is_urgent}
                isFavorite={favorites.includes(car.id)}
                onToggleFavorite={handleToggleFavorite}
                onPress={(id) => router.push(`/listing/${id}`)}
              />
            </View>
          ))}
          {/* Spacers for incomplete rows */}
          {Array.from({ length: numColumns - item.items.length }).map((_, i) => (
            <View key={`spacer-${i}`} style={{ flex: 1, paddingLeft: 8 }} />
          ))}
        </View>
      );
    }
    return null;
  }, [activeTopTab, favorites, handleToggleFavorite, router, settings]);

  const isLoading = activeTopTab === 'transport' ? listingsLoading : platesLoading;
  const currentError = activeTopTab === 'transport' ? error : platesError;
  const currentData = activeTopTab === 'transport' ? listings : plates;

  const renderEmptyOrError = () => {
    if (isLoading && currentData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {activeTopTab === 'transport' ? 'Elanlar yüklənir...' : 'Nömrələr yüklənir...'}
          </Text>
        </View>
      );
    }

    if (currentError && currentData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <AlertCircle size={44} color="#FF3B30" style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: colors.text, marginBottom: 16, textAlign: 'center' }]}>
            {currentError}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => (activeTopTab === 'transport' ? fetchListings(true) : fetchPlates(true))}
            activeOpacity={0.8}
          >
            <RefreshCw size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryBtnText}>Yenidən cəhd et</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {activeTopTab === 'transport' ? 'Axtarışa uyğun elan tapılmadı.' : 'Axtarışa uyğun nömrə tapılmadı.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <ImageComponent 
              source={{ uri: logoUrl }} 
              style={styles.logoImage} 
              contentFit="contain"
              {...(Platform.OS === 'web' ? { resizeMode: 'contain' } : {})} 
            />
          ) : (
            <View>
              <Text style={[styles.logoText, { color: colors.text }]}>NAXÇIVAN</Text>
              <Text style={[styles.logoSubText, { color: colors.primary }]}>AVTO</Text>
            </View>
          )}
        </View>

        <View style={[styles.headerSegmented, { backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' }]}>
          {(['transport', 'plates'] as const).map((tab) => {
            const selected = activeTopTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.segment, selected && [styles.segmentSelected, { backgroundColor: isDark ? '#636366' : '#FFFFFF' }]]}
                onPress={() => setActiveTopTab(tab)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentText, { color: colors.text }, selected && styles.segmentTextSelected]}>
                  {tab === 'transport' ? 'Nəqliyyat' : 'Nömrələr'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' }]}
            accessibilityLabel="Temanı dəyiş"
          >
            {isDark ? <Sun size={18} color={colors.text} /> : <Moon size={18} color={colors.text} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <FlatList
        ref={flatListRef}
        key={activeTopTab === 'transport' ? 'transport-list' : 'plates-list'}
        data={activeTopTab === 'transport' ? processedData : plates}
        renderItem={activeTopTab === 'transport' ? renderRow : ({ item, index }) => (
          <PlateCard
            region={item.region}
            series={item.series}
            number={item.number}
            price={item.price}
            description={item.description}
            isVip={item.is_vip}
            index={index}
            onPress={() => router.push(`/plate/${item.id}`)}
          />
        )}
        keyExtractor={(item, index) => activeTopTab === 'transport' ? (item.type === 'banner' ? 'banner' : `row-${index}`) : item.id}
        numColumns={activeTopTab === 'transport' ? 1 : 2}
        columnWrapperStyle={activeTopTab === 'plates' ? styles.grid : undefined}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyOrError}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        ListFooterComponent={
          <View style={{ paddingBottom: 40 }}>
            {isLoading && currentData.length > 0 && !refreshing ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : null}
            {!isLoading && (activeTopTab === 'transport' ? totalPages > 1 : totalPlatesPages > 1) && (
              <Pagination
                currentPage={activeTopTab === 'transport' ? page : platesPage}
                totalPages={activeTopTab === 'transport' ? totalPages : totalPlatesPages}
                onPageChange={(p) => {
                  if (activeTopTab === 'transport') setPage(p);
                  else setPlatesPage(p);
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }}
              />
            )}
          </View>
        }
      />

      {/* Live Chat Floating Button */}
      {activeTopTab === 'transport' && <FloatingChatButton />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  logoContainer: {
    justifyContent: 'center',
  },
  logoImage: { width: 80, height: 36 },
  logoText: { fontSize: 14, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: 1 },
  logoSubText: { fontSize: 10, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: 3, marginTop: -2 },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: { paddingBottom: 20, paddingTop: 4 },

  // Large title (iOS-style)
  titleSection: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  largeTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: -0.6,
  },
  largeSubtitle: {
    fontSize: 15,
    marginTop: 8,
    fontFamily: 'RethinkSans_500Medium',
  },

  // Segmented control
  headerSegmented: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 9,
    height: 32,
    width: 196,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentSelected: {
    boxShadow: '0px 3px 8px rgba(0, 0, 0, 0.12), 0px 1px 1px rgba(0, 0, 0, 0.04)',
  },
  segmentText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
  },
  segmentTextSelected: {
    fontFamily: 'RethinkSans_700Bold',
  },

  // Shared card surface: hairline border + soft shadow (Stripe-like)
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 4px 12px rgba(0, 0, 0, 0.04)',
  },

  // Unified Search Bar
  unifiedSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 6,
    height: 62,
  },
  searchInputItem: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
    marginBottom: 2,
  },
  inputValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputValue: {
    fontSize: 15,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: '50%',
    marginHorizontal: 8,
  },
  resetButton: {
    padding: 8,
    marginRight: 4,
  },
  smallActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  // Competition Banner
  competitionBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
  },
  competitionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  competitionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  competitionTitle: {
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 2,
  },
  competitionSubtitle: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
  },
  competitionAction: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  competitionActionText: {
    color: '#FFF',
    fontFamily: 'RethinkSans_700Bold',
    fontSize: 13,
  },

  // Category strip
  categoryStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    gap: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
  },
  categoryLabelActive: {
    fontFamily: 'RethinkSans_700Bold',
  },
  categoryUnderline: {
    height: 2,
    width: 32,
    borderRadius: 1,
    marginTop: 4,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'RethinkSans_700Bold',
    letterSpacing: -0.3,
  },

  grid: {
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 0
  },
  emptyState: { width: '100%', alignItems: 'center', marginTop: 50, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
  },
});
