import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Search, Check, ChevronRight, TrendingUp, CarFront, 
  Fuel, Settings, Zap, Globe, Palette, MapPin, Layers,
  Truck, Bus, Car, ArrowLeft
} from 'lucide-react-native';
import { REGIONS } from '../constants/Regions';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Azərbaycan bazarında ən populyar markalar
const POPULAR_BRANDS = ['Mercedes', 'BMW', 'Toyota', 'Hyundai', 'Kia', 'Lada (VAZ)', 'Opel', 'Nissan', 'Ford', 'Chevrolet'];

// Rənglərin Hex kodları
const COLOR_MAP: Record<string, string> = {
  'Ağ': '#FFFFFF',
  'Ağ Mirvari': '#F0EAD6',
  'Qara': '#000000',
  'Qara Metalik': '#1A1A1A',
  'Gümüşü': '#C0C0C0',
  'Boz': '#808080',
  'Yaş Asfalt': '#5E5E5E',
  'Qırmızı': '#FF3B30',
  'Albalı': '#DE3163',
  'Göy': '#007AFF',
  'Mavi': '#5AC8FA',
  'Yaşıl': '#34C759',
  'Zeytun': '#808000',
  'Sarı': '#FFCC00',
  'Qızılı': '#FFD700',
  'Qəhvəyi': '#8B4513',
  'Narıncı': '#FF9500',
  'Bənövşəyi': '#AF52DE',
  'Bej': '#F5F5DC',
  'Tünd qırmızı': '#8B0000',
  'Asfalt': '#4A4A4A',
  'Şabalıdı': '#954535',
  'Xamilyon': '#708090', 
  'Çəhrayı': '#FFC0CB',
};

export default function SelectOptionScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const { type, title, eventName, selectedId, extraParams } = params;
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let countsMap: Record<string, number> = {};

      const { data: listings } = await supabase
        .from('listings')
        .select('make, model, location, body_type')
        .eq('status', 'approved');

      if (listings) {
        listings.forEach(l => {
            if (l.make) countsMap[l.make] = (countsMap[l.make] || 0) + 1;
            if (l.model) countsMap[l.model] = (countsMap[l.model] || 0) + 1;
            if (l.location) countsMap[l.location] = (countsMap[l.location] || 0) + 1;
            if (l.body_type) countsMap[l.body_type] = (countsMap[l.body_type] || 0) + 1;
        });
      }
      setCounts(countsMap);

      if (type === 'location') {
        data = REGIONS;
      } else if (type === 'model') {
        const extras = extraParams ? JSON.parse(extraParams as string) : {};
        if (extras.brand_id) {
            const { data: models } = await supabase
                .from('models')
                .select('*')
                .eq('brand_id', extras.brand_id)
                .order('name');
            data = models || [];
        }
      } else {
        let tableName = '';
        switch(type) {
            case 'brand': tableName = 'brands'; break;
            case 'bodyType': tableName = 'body_types'; break;
            case 'color': tableName = 'colors'; break;
            case 'gearbox': tableName = 'gearboxes'; break;
            case 'transmission': tableName = 'transmissions'; break;
            case 'market': tableName = 'markets'; break;
            case 'fuelType': tableName = 'fuel_types'; break;
            default: tableName = type as string;
        }

        if (tableName) {
            const { data: result } = await supabase
                .from(tableName)
                .select('*')
                .order('name');
            data = result || [];
        }
      }

      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    if (eventName) {
      DeviceEventEmitter.emit(eventName as string, item);
    }
    router.back();
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const popularItems = useMemo(() => {
    if (type !== 'brand') return [];
    return items.filter(item => POPULAR_BRANDS.includes(item.name));
  }, [items, type]);

  const renderItemIcon = (item: any) => {
    if (type === 'color') {
        const hex = COLOR_MAP[item.name] || '#CCCCCC';
        return (
            <View style={[
                styles.colorCircle, 
                { 
                    backgroundColor: hex, 
                    borderColor: colors.border,
                    borderWidth: hex.toUpperCase() === '#FFFFFF' ? 1 : 0 
                }
            ]} />
        );
    }

    if (item.logo_url) {
        return (
           <Image source={{ uri: item.logo_url }} style={styles.logo} resizeMode="contain" />
        );
    }

    const iconProps = { size: 22, color: colors.primary };
    
    switch(type) {
        case 'fuelType': return <Fuel {...iconProps} />;
        case 'gearbox': return <Settings {...iconProps} />;
        case 'transmission': return <Zap {...iconProps} />;
        case 'bodyType': {
            const n = item.name.toLowerCase();
            if (n.includes('yük') || n.includes('pikap') || n.includes('truck') || n.includes('furqon')) return <Truck {...iconProps} />;
            if (n.includes('avtobus') || n.includes('bus') || n.includes('mikro')) return <Bus {...iconProps} />;
            if (n.includes('suv') || n.includes('jeep') || n.includes('cip')) return <Car {...iconProps} />;
            return <CarFront {...iconProps} />;
        }
        case 'market': return <Globe {...iconProps} />;
        case 'location': return <MapPin {...iconProps} />;
        case 'model': return <Layers {...iconProps} />;
        case 'brand': return <CarFront {...iconProps} />;
        default: return <Check size={20} color="transparent" />;
    }
  };

  const renderPopularItem = ({ item, index }: { item: any, index: number }) => (
    <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 50, type: 'spring' }}
    >
        <TouchableOpacity 
            style={[styles.popularCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelect(item)}
        >
            <View style={[styles.popularIconContainer, { backgroundColor: isDark ? '#333' : '#F8F9FA' }]}>
                {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.popularLogo} resizeMode="contain" />
                ) : (
                    <CarFront size={24} color={colors.textSecondary} />
                )}
            </View>
            <Text style={[styles.popularName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.popularCount, { color: colors.primary }]}>{counts[item.name] || 0} elan</Text>
        </TouchableOpacity>
    </MotiView>
  );

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isSelected = item.name === selectedId || item.id === selectedId;
    const count = counts[item.name] || 0;
    
    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 30 }}
      >
        <TouchableOpacity 
            style={[
                styles.item, 
                { 
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1
                }
            ]}
            onPress={() => handleSelect(item)}
            activeOpacity={0.7}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#F8F9FA', borderColor: colors.border }]}>
                    {renderItemIcon(item)}
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={[
                        styles.itemText, 
                        { color: colors.text },
                        isSelected && { color: colors.primary, fontWeight: '700' }
                    ]}>
                        {item.name}
                    </Text>
                    {(type === 'brand' || type === 'model' || type === 'location' || type === 'bodyType') && (
                        <Text style={[styles.itemSubText, { color: colors.textSecondary }]}>
                            {count} elan
                        </Text>
                    )}
                </View>
            </View>
            
            <View style={styles.itemRight}>
                {isSelected ? (
                    <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                        <Check size={14} color="#FFF" />
                    </View>
                ) : (
                    <ChevronRight size={18} color={colors.border} />
                )}
            </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Disable default header */}
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header for better Android interaction */}
      <View style={[
          styles.customHeader, 
          { 
              backgroundColor: colors.card, 
              borderBottomColor: colors.border,
              paddingTop: insets.top + 10
          }
      ]}>
          <View style={styles.headerTop}>
              <TouchableOpacity 
                  onPress={() => router.back()} 
                  style={styles.backButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Ləğv et</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{title as string || 'Seçin'}</Text>
              <View style={{ width: 60 }} /> 
          </View>

          <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
            <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Axtar..."
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
                autoFocus={false}
                clearButtonMode="while-editing"
            />
          </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView 
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {type === 'brand' && !search && popularItems.length > 0 && (
                <View style={styles.popularSection}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={16} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Məşhur Markalar</Text>
                    </View>
                    <FlatList
                        data={popularItems}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={item => item.id}
                        renderItem={renderPopularItem}
                        contentContainerStyle={styles.popularList}
                    />
                </View>
            )}

            <View style={styles.listContainer}>
                {type === 'brand' && !search && (
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginLeft: 20, marginBottom: 10 }]}>Bütün Markalar</Text>
                )}
                
                {filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => (
                        <View key={item.id} style={{ marginBottom: 10 }}>
                            {renderItem({ item, index })}
                        </View>
                    ))
                ) : (
                    <View style={styles.center}>
                        <Text style={{ color: colors.textSecondary, marginTop: 40, fontSize: 16 }}>Nəticə tapılmadı</Text>
                    </View>
                )}
            </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingVertical: 0, 
  },
  scrollContent: {
    paddingTop: 16,
  },
  popularSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popularList: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  popularCard: {
    width: 100,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  popularIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  popularLogo: {
    width: 32,
    height: 32,
  },
  popularName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  popularCount: {
    fontSize: 10,
    fontWeight: '500',
  },
  listContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logo: {
    width: 28,
    height: 28,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  textContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSubText: {
    fontSize: 12,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
