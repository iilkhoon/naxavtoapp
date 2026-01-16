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
  TextStyle,
  TextInput,
  FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SlidersHorizontal, Sun, Moon, Calculator, Wallet, Percent, ArrowLeftRight, X } from 'lucide-react-native';
import { CarCard } from '../../components/CarCard';
import { PlateCard } from '../../components/PlateCard';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Listing, Plate, Brand, Model, AdvancedFilters } from '../../types';

const { width } = Dimensions.get('window');

type FilterType = 'cash' | 'credit' | 'barter';

// Improved Looping Typewriter Component
const Typewriter = ({ words, color, style }: { words: string[], color: string, style?: TextStyle }) => {
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

    let timer: NodeJS.Timeout;

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
  const { showToast } = useToast();
  const { colors, toggleTheme, isDark } = useTheme();
  const { settings } = useSettings();
  
  const [activeTopTab, setActiveTopTab] = useState<'transport' | 'plates'>('transport');
  const [listings, setListings] = useState<Listing[]>([]);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Car Filters
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  const [activeFilterType, setActiveFilterType] = useState<FilterType>('cash');
  
  // Plate Filters
  const [plateSearchRegion, setPlateSearchRegion] = useState('');
  const [plateSearchSeries, setPlateSearchSeries] = useState('');
  const [plateSearchNumber, setPlateSearchNumber] = useState('');
  
  const ImageComponent = Platform.OS === 'web' ? RNImage : ExpoImage;

  const fetchListings = async (isRefresh = false) => {
    try {
      if ((!isRefresh && listings.length === 0) || (isRefresh && error)) setLoading(true);
      setError(null);

      // Optimized query: Select only needed fields
      let query = supabase
        .from('listings')
        .select('id, make, model, price, currency, image_url, images, location, created_at, mileage, engine, year, is_credit, is_barter, is_vip, is_new')
        .eq('status', 'approved')
        .order('is_vip', { ascending: false }) // VIPs first
        .order('created_at', { ascending: false });

      if (selectedBrand) query = query.eq('make', selectedBrand.name);
      if (selectedModel) query = query.eq('model', selectedModel.name);
      
      if (activeFilterType === 'credit') query = query.eq('is_credit', true);
      if (activeFilterType === 'barter') query = query.eq('is_barter', true);
      
      if (advancedFilters.minPrice) query = query.gte('price', parseFloat(advancedFilters.minPrice));
      if (advancedFilters.maxPrice) query = query.lte('price', parseFloat(advancedFilters.maxPrice));

      // Limit results for performance (can implement pagination later)
      query = query.limit(50);

      const { data, error: supabaseError } = await query;
      if (supabaseError) throw supabaseError;
      
      if (data) {
        setListings(data as Listing[]);
      }
    } catch (err: any) {
      console.error('Error fetching listings:', err);
      if (listings.length === 0) setError('Yükləmə xətası.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPlates = async (isRefresh = false) => {
    try {
      if ((!isRefresh && plates.length === 0) || (isRefresh && error)) setLoading(true);
      setError(null);

      let query = supabase
        .from('plates')
        .select('id, region, series, number, price, description, is_vip, created_at, status')
        .eq('status', 'approved')
        .order('is_vip', { ascending: false })
        .order('created_at', { ascending: false });

      if (plateSearchRegion) query = query.eq('region', plateSearchRegion);
      if (plateSearchSeries) query = query.ilike('series', `${plateSearchSeries}%`);
      if (plateSearchNumber) query = query.ilike('number', `${plateSearchNumber}%`);

      query = query.limit(50);

      const { data, error } = await query;
      if (error) throw error;
      setPlates(data as Plate[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    loadFavorites();
    fetchPlates();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTopTab === 'transport') fetchListings();
      else fetchPlates();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [selectedBrand, selectedModel, activeTopTab, advancedFilters, activeFilterType, plateSearchRegion, plateSearchSeries, plateSearchNumber]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      if (activeTopTab === 'transport') fetchListings();
      else fetchPlates();
    }, [activeTopTab])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTopTab === 'transport') fetchListings(true);
    else fetchPlates(true);
    loadFavorites();
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
        fetchListings(true);
        sub.remove();
    });
    router.push({ pathname: '/filter', params: { eventName } });
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

  const LargeFilterButton = ({ type, label, icon: Icon, activeColor }: { type: FilterType, label: string, icon: any, activeColor: string }) => {
    const isActive = activeFilterType === type;
    
    return (
        <TouchableOpacity 
            style={[
                styles.largeFilterBtn, 
                { 
                    backgroundColor: isActive ? activeColor : colors.card, 
                    borderColor: isActive ? activeColor : colors.border,
                    borderWidth: 1
                }
            ]}
            onPress={() => setActiveFilterType(type)}
            activeOpacity={0.8}
        >
            <View style={[
                styles.largeFilterIconCircle, 
                { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }
            ]}>
                <Icon size={18} color={isActive ? '#FFF' : activeColor} />
            </View>
            <Text 
                style={[styles.largeFilterText, { color: isActive ? '#FFF' : colors.textSecondary }]} 
                numberOfLines={1} 
                adjustsFontSizeToFit
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.heroSection}>
          <Text 
              style={[styles.heroText, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
          >
              Xəyalındakı{' '}
              <Typewriter 
                  words={['avtomobili', 'nömrəni']} 
                  color={colors.primary}
                  style={styles.heroText}
              />
          </Text>
          <Text style={[styles.heroText, { color: colors.text }]}>
              tapmaq daha asan!
          </Text>
      </View>

      {activeTopTab === 'transport' ? (
          <View style={[styles.unifiedSearchContainer, { backgroundColor: colors.card }]}>
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

              <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]} onPress={handleFilterPress}>
                  <SlidersHorizontal size={20} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.smallActionBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/calculator')}>
                  <Calculator size={20} color="#FFF" />
              </TouchableOpacity>
          </View>
      ) : (
          <View style={[styles.unifiedSearchContainer, { backgroundColor: colors.card }]}>
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

              {(plateSearchRegion || plateSearchSeries || plateSearchNumber) && (
                  <TouchableOpacity onPress={handleResetPlateSearch} style={styles.resetButton}>
                      <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
              )}
          </View>
      )}

      {activeTopTab === 'transport' && (
          <View style={styles.quickFiltersContainer}>
              <LargeFilterButton type="cash" label="Nağd" icon={Wallet} activeColor="#FF3B30" />
              <LargeFilterButton type="credit" label="Kredit" icon={Percent} activeColor="#AF52DE" />
              <LargeFilterButton type="barter" label="Barter" icon={ArrowLeftRight} activeColor="#34C759" />
          </View>
      )}
    </>
  );

  const renderItem = useCallback(({ item, index }: { item: Listing | Plate, index: number }) => {
    if (activeTopTab === 'transport') {
      const car = item as Listing;
      return (
        <CarCard
            id={car.id}
            index={index}
            title={car.make + ' ' + car.model}
            price={car.price}
            currency={car.currency || 'AZN'}
            image={car.image_url}
            images={car.images}
            location={car.location}
            date={car.created_at} // Pass date ISO string
            mileage={car.mileage}
            engine={car.engine}
            year={car.year}
            isCredit={car.is_credit}
            isBarter={car.is_barter}
            isVip={car.is_vip}
            isNew={car.is_new}
            isFavorite={favorites.includes(car.id)}
            onToggleFavorite={handleToggleFavorite}
            onPress={(id) => router.push(`/listing/${id}`)}
        />
      );
    } else {
      const plate = item as Plate;
      return (
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
      );
    }
  }, [activeTopTab, favorites, handleToggleFavorite, router]);

  const renderEmpty = () => (
    <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {activeTopTab === 'transport' ? 'Elan tapılmadı.' : 'Nömrə tapılmadı.'}
        </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <View style={styles.logoContainer}>
            {logoUrl ? (
                <ImageComponent source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
            ) : (
                <View>
                    <Text style={[styles.logoText, { color: colors.text }]}>NAXÇIVAN</Text>
                    <Text style={[styles.logoSubText, { color: colors.primary }]}>AVTO</Text>
                </View>
            )}
        </View>

        <View style={[styles.togglePill, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
                style={[styles.toggleItem, activeTopTab === 'transport' && { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}
                onPress={() => setActiveTopTab('transport')}
            >
                <Text style={[styles.toggleText, { color: activeTopTab === 'transport' ? colors.text : colors.textSecondary }]}>Nəqliyyat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.toggleItem, activeTopTab === 'plates' && { backgroundColor: isDark ? '#333' : '#E5E5EA' }]}
                onPress={() => setActiveTopTab('plates')}
            >
                <Text style={[styles.toggleText, { color: activeTopTab === 'plates' ? colors.text : colors.textSecondary }]}>Nömrələr</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity 
            onPress={toggleTheme} 
            style={[styles.themeBtn, { backgroundColor: colors.card }]}
        >
            {isDark ? <Sun size={22} color={colors.text} /> : <Moon size={22} color={colors.text} />}
        </TouchableOpacity>
      </View>

      {/* Main Content - FlatList for Performance */}
      <FlatList
        data={activeTopTab === 'transport' ? listings : plates}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.grid}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        key={activeTopTab} // Force re-render when switching tabs
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} /> : null}
      />
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
    paddingBottom: 16,
    zIndex: 10,
    borderBottomWidth: 1,
  },
  logoContainer: { 
    justifyContent: 'center',
  },
  logoImage: { width: 80, height: 40 },
  logoText: { fontSize: 14, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: 1 },
  logoSubText: { fontSize: 10, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: 3, marginTop: -2 },
  
  togglePill: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 2,
    height: 36,
    alignItems: 'center',
  },
  toggleItem: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    borderRadius: 18,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: { paddingBottom: 20, paddingTop: 10 },
  
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 12,
  },
  heroText: {
    fontSize: 28, // Increased from 24
    fontFamily: 'RethinkSans_800ExtraBold',
    lineHeight: 36,
  },

  // Unified Search Bar
  unifiedSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 6,
    height: 64,
  },
  searchInputItem: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 12,
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
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
  },
  verticalDivider: {
    width: 1,
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  // Large Quick Filters
  quickFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 24,
  },
  largeFilterBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  largeFilterIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeFilterText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_700Bold',
  },

  grid: { 
    justifyContent: 'space-between', 
    paddingHorizontal: 16 
  },
  emptyState: { width: '100%', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
});
