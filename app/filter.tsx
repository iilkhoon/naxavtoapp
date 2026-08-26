import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  DeviceEventEmitter,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { RotateCcw, X, Check } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Rənglərin Hex kodları (Vizual seçim üçün)
const COLOR_MAP: Record<string, string> = {
  'Ağ': '#FFFFFF', 'Ağ Mirvari': '#F0EAD6', 'Qara': '#000000', 'Qara Metalik': '#1A1A1A',
  'Gümüşü': '#C0C0C0', 'Boz': '#808080', 'Yaş Asfalt': '#5E5E5E', 'Qırmızı': '#FF3B30',
  'Albalı': '#DE3163', 'Göy': '#007AFF', 'Mavi': '#5AC8FA', 'Yaşıl': '#34C759',
  'Zeytun': '#808000', 'Sarı': '#FFCC00', 'Qızılı': '#FFD700', 'Qəhvəyi': '#8B4513',
  'Narıncı': '#FF9500', 'Bənövşəyi': '#AF52DE', 'Bej': '#F5F5DC', 'Tünd qırmızı': '#8B0000',
  'Asfalt': '#4A4A4A', 'Şabalıdı': '#954535', 'Xamilyon': 'linear-gradient(45deg, #00F, #F00)', 'Çəhrayı': '#FFC0CB',
};

const SelectPill = ({ label, selected, onPress, colors, isDark }: any) => (
    <TouchableOpacity 
        style={[
            styles.pill, 
            { 
                backgroundColor: selected ? colors.primary : (isDark ? '#2C2C2E' : '#F3F4F6'),
                borderColor: selected ? colors.primary : 'transparent',
                borderWidth: 1
            }
        ]} 
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[
            styles.pillText, 
            { color: selected ? '#FFFFFF' : colors.text }
        ]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const ColorPill = ({ label, selected, onPress, colors }: any) => {
    const hex = COLOR_MAP[label] || '#CCCCCC';
    return (
        <TouchableOpacity 
            style={[
                styles.colorPill, 
                selected && { borderColor: colors.primary, borderWidth: 2 }
            ]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[
                styles.colorCircle, 
                { backgroundColor: hex, borderWidth: hex.toUpperCase() === '#FFFFFF' ? 1 : 0, borderColor: '#DDD' }
            ]}>
                {selected && <Check size={12} color={hex.toUpperCase() === '#FFFFFF' ? '#000' : '#FFF'} />}
            </View>
            <Text style={[styles.colorLabel, { color: colors.text, fontWeight: selected ? 'bold' : '400' }]}>{label}</Text>
        </TouchableOpacity>
    );
};

const RangeInput = ({ label, minVal, maxVal, setMin, setMax, placeholderMin = "Min", placeholderMax = "Maks", maxLength = 10, colors, suffix = '' }: any) => (
    <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.rangeContainer}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput 
                    style={[styles.input, { color: colors.text }]} 
                    placeholder={placeholderMin} 
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    value={minVal}
                    onChangeText={setMin}
                    maxLength={maxLength}
                />
                {suffix ? <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text> : null}
            </View>
            <View style={[styles.dash, { backgroundColor: colors.border }]} />
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput 
                    style={[styles.input, { color: colors.text }]} 
                    placeholder={placeholderMax} 
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                    value={maxVal}
                    onChangeText={setMax}
                    maxLength={maxLength}
                />
                {suffix ? <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text> : null}
            </View>
        </View>
    </View>
);

const SwitchRow = ({ label, value, onValueChange, colors }: any) => (
    <View style={[styles.switchRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.switchLabel, { color: colors.text }]}>{label}</Text>
        <Switch 
            value={value} 
            onValueChange={onValueChange}
            trackColor={{ false: '#333', true: colors.primary }}
            thumbColor={'#FFF'}
        />
    </View>
);

export default function FilterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { eventName, initialFilters } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  
  // Range States
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minMileage, setMinMileage] = useState('');
  const [maxMileage, setMaxMileage] = useState('');
  const [minEngine, setMinEngine] = useState('');
  const [maxEngine, setMaxEngine] = useState('');
  const [city, setCity] = useState('');
  
  // Selection States
  const [bodyType, setBodyType] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [transmission, setTransmission] = useState('');
  const [color, setColor] = useState('');
  const [market, setMarket] = useState('');
  
  // Toggle States
  const [isNew, setIsNew] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [isBarter, setIsBarter] = useState(false);

  // Options Data
  const [options, setOptions] = useState<any>({
    bodyTypes: [],
    fuelTypes: [],
    gearboxes: [],
    transmissions: [],
    colors: [],
    markets: []
  });

  useEffect(() => {
    fetchOptions();
    if (initialFilters) {
      try {
        const parsed = JSON.parse(initialFilters as string);
        if (parsed.minPrice) setMinPrice(String(parsed.minPrice));
        if (parsed.maxPrice) setMaxPrice(String(parsed.maxPrice));
        if (parsed.minYear) setMinYear(String(parsed.minYear));
        if (parsed.maxYear) setMaxYear(String(parsed.maxYear));
        if (parsed.minMileage) setMinMileage(String(parsed.minMileage));
        if (parsed.maxMileage) setMaxMileage(String(parsed.maxMileage));
        if (parsed.minEngine) setMinEngine(String(parsed.minEngine));
        if (parsed.maxEngine) setMaxEngine(String(parsed.maxEngine));
        if (parsed.city) setCity(String(parsed.city));
        if (parsed.bodyType) setBodyType(String(parsed.bodyType));
        if (parsed.fuelType) setFuelType(String(parsed.fuelType));
        if (parsed.gearbox) setGearbox(String(parsed.gearbox));
        if (parsed.transmission) setTransmission(String(parsed.transmission));
        if (parsed.color) setColor(String(parsed.color));
        if (parsed.market) setMarket(String(parsed.market));
        if (parsed.isNew !== undefined) setIsNew(!!parsed.isNew);
        if (parsed.isCredit !== undefined) setIsCredit(!!parsed.isCredit);
        if (parsed.isBarter !== undefined) setIsBarter(!!parsed.isBarter);
      } catch (e) {}
    }
  }, []);

  const fetchOptions = async () => {
    try {
        const [bRes, fRes, gRes, tRes, cRes, mRes] = await Promise.all([
            supabase.from('body_types').select('*').order('name'),
            supabase.from('fuel_types').select('*').order('name'),
            supabase.from('gearboxes').select('*').order('name'),
            supabase.from('transmissions').select('*').order('name'),
            supabase.from('colors').select('*').order('name'),
            supabase.from('markets').select('*').order('name'),
        ]);
        
        setOptions({
            bodyTypes: bRes.data || [],
            fuelTypes: fRes.data || [],
            gearboxes: gRes.data || [],
            transmissions: tRes.data || [],
            colors: cRes.data || [],
            markets: mRes.data || []
        });
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleApply = () => {
    const filters = {
      minPrice, maxPrice, minYear, maxYear, minMileage, maxMileage, minEngine, maxEngine, city,
      bodyType, fuelType, gearbox, transmission, color, market,
      isNew: isNew ? true : undefined,
      isCredit: isCredit ? true : undefined,
      isBarter: isBarter ? true : undefined
    };
    
    if (eventName) {
        DeviceEventEmitter.emit(eventName as string, filters);
    }
    router.back();
  };

  const handleReset = () => {
    setMinPrice(''); setMaxPrice(''); setMinYear(''); setMaxYear('');
    setMinMileage(''); setMaxMileage(''); setMinEngine(''); setMaxEngine(''); setCity('');
    setBodyType(''); setFuelType(''); setGearbox(''); setTransmission(''); setColor(''); setMarket('');
    setIsNew(false); setIsCredit(false); setIsBarter(false);
  };

  return (
    <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
              <X size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Ətraflı Axtarış</Text>
          <TouchableOpacity onPress={handleReset} style={[styles.iconBtn, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
              <RotateCcw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
      </View>

      {loading ? (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
          </View>
      ) : (
        <ScrollView 
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }}>
                
                {/* Financial Toggles */}
                <View style={[styles.togglesContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SwitchRow label="Yalnız Yeni Avtomobillər" value={isNew} onValueChange={setIsNew} colors={colors} />
                    <SwitchRow label="Kreditlə Mümkündür" value={isCredit} onValueChange={setIsCredit} colors={colors} />
                    <View style={styles.switchRowLast}>
                        <Text style={[styles.switchLabel, { color: colors.text }]}>Barter Mümkündür</Text>
                        <Switch 
                            value={isBarter} 
                            onValueChange={setIsBarter}
                            trackColor={{ false: '#333', true: colors.primary }}
                            thumbColor={'#FFF'}
                        />
                    </View>
                </View>

                {/* Ranges */}
                <RangeInput label="Qiymət (AZN)" minVal={minPrice} maxVal={maxPrice} setMin={setMinPrice} setMax={setMaxPrice} colors={colors} />
                <RangeInput label="Buraxılış ili" minVal={minYear} maxVal={maxYear} setMin={setMinYear} setMax={setMaxYear} maxLength={4} colors={colors} />
                <RangeInput label="Yürüş (km)" minVal={minMileage} maxVal={maxMileage} setMin={setMinMileage} setMax={setMaxMileage} colors={colors} />
                <RangeInput label="Mühərrik (L)" minVal={minEngine} maxVal={maxEngine} setMin={setMinEngine} setMax={setMaxEngine} maxLength={4} colors={colors} suffix="L" />

                {/* City */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Şəhər</Text>
                    <View style={[styles.singleInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput 
                            style={[styles.input, { width: '100%', color: colors.text }]} 
                            placeholder="Şəhər və ya rayon daxil edin" 
                            placeholderTextColor={colors.placeholder}
                            value={city}
                            onChangeText={setCity}
                        />
                    </View>
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ban növü</Text>
                    <View style={styles.pillContainer}>
                        {options.bodyTypes.map((item: any) => (
                            <SelectPill key={item.id} label={item.name} selected={bodyType === item.name} onPress={() => setBodyType(bodyType === item.name ? '' : item.name)} colors={colors} isDark={isDark} />
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Yanacaq</Text>
                    <View style={styles.pillContainer}>
                        {options.fuelTypes.map((item: any) => (
                            <SelectPill key={item.id} label={item.name} selected={fuelType === item.name} onPress={() => setFuelType(fuelType === item.name ? '' : item.name)} colors={colors} isDark={isDark} />
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Sürətlər Qutusu</Text>
                    <View style={styles.pillContainer}>
                        {options.gearboxes.map((item: any) => (
                            <SelectPill key={item.id} label={item.name} selected={gearbox === item.name} onPress={() => setGearbox(gearbox === item.name ? '' : item.name)} colors={colors} isDark={isDark} />
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ötürücü</Text>
                    <View style={styles.pillContainer}>
                        {options.transmissions.map((item: any) => (
                            <SelectPill key={item.id} label={item.name} selected={transmission === item.name} onPress={() => setTransmission(transmission === item.name ? '' : item.name)} colors={colors} isDark={isDark} />
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bazar</Text>
                    <View style={styles.pillContainer}>
                        {options.markets.map((item: any) => (
                            <SelectPill key={item.id} label={item.name} selected={market === item.name} onPress={() => setMarket(market === item.name ? '' : item.name)} colors={colors} isDark={isDark} />
                        ))}
                    </View>
                </View>

                {/* Colors */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Rəng</Text>
                    <View style={styles.pillContainer}>
                        {options.colors.map((item: any) => (
                            <ColorPill key={item.id} label={item.name} selected={color === item.name} onPress={() => setColor(color === item.name ? '' : item.name)} colors={colors} />
                        ))}
                    </View>
                </View>

            </MotiView>
        </ScrollView>
      )}

      {/* Sticky Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.primary }]} onPress={handleApply}>
            <Text style={styles.applyText}>Nəticələri Göstər</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 20 },
  togglesContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  switchRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  singleInputWrapper: {
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
  },
  dash: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    flex: 1,
    height: '100%',
  },
  suffix: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10, 
    borderRadius: 20,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorLabel: {
    fontSize: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applyText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
