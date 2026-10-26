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
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { X, Check, Sparkles, Percent, ArrowLeftRight, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../utils/haptics';

// Swatch colours for the colour picker (keys match the `colors` table)
const COLOR_MAP: Record<string, string> = {
  'Ağ': '#FFFFFF', 'Ağ Mirvari': '#F0EAD6', 'Qara': '#000000', 'Qara Metalik': '#1A1A1A',
  'Gümüşü': '#C0C0C0', 'Boz': '#808080', 'Yaş Asfalt': '#5E5E5E', 'Qırmızı': '#FF3B30',
  'Albalı': '#DE3163', 'Göy': '#007AFF', 'Mavi': '#5AC8FA', 'Yaşıl': '#34C759',
  'Zeytun': '#808000', 'Sarı': '#FFCC00', 'Qızılı': '#FFD700', 'Qəhvəyi': '#8B4513',
  'Narıncı': '#FF9500', 'Bənövşəyi': '#AF52DE', 'Bej': '#F5F5DC', 'Tünd qırmızı': '#8B0000',
  'Asfalt': '#4A4A4A', 'Şabalıdı': '#954535', 'Xamilyon': '#7D5BA6', 'Çəhrayı': '#FFC0CB',
};

// Light swatches need an outline and a dark check mark to stay visible
const isLightSwatch = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 200;
};

const SectionTitle = ({ children, colors }: any) => (
  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{children}</Text>
);

const SelectPill = ({ label, selected, onPress, colors, isDark }: any) => (
  <TouchableOpacity
    style={[
      styles.pill,
      selected
        ? { backgroundColor: colors.primarySoft, borderColor: colors.primary }
        : { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(0,0,0,0.08)' },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityState={{ selected }}
  >
    {selected && <Check size={14} color={colors.primary} strokeWidth={3} />}
    <Text style={[styles.pillText, { color: selected ? colors.primary : colors.text }]}>{label}</Text>
  </TouchableOpacity>
);

const ColorSwatch = ({ label, selected, onPress, colors }: any) => {
  const hex = COLOR_MAP[label] || '#CCCCCC';
  const light = isLightSwatch(hex);
  return (
    <TouchableOpacity style={styles.swatch} onPress={onPress} activeOpacity={0.7} accessibilityLabel={label} accessibilityState={{ selected }}>
      <View style={[styles.swatchRing, { borderColor: selected ? colors.primary : 'transparent' }]}>
        <View style={[styles.swatchDot, { backgroundColor: hex, borderWidth: light ? StyleSheet.hairlineWidth : 0, borderColor: 'rgba(0,0,0,0.25)' }]}>
          {selected && <Check size={14} color={light ? '#000' : '#FFF'} strokeWidth={3} />}
        </View>
      </View>
      <Text style={[styles.swatchLabel, { color: selected ? colors.text : colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// One grouped card holding "min — max" for a numeric range
const RangeRow = ({ label, minVal, maxVal, setMin, setMax, maxLength = 10, colors, isDark, suffix = '' }: any) => (
  <View style={styles.rangeRow}>
    <Text style={[styles.rangeLabel, { color: colors.text }]}>{label}</Text>
    <View style={styles.rangeInputs}>
      {[
        { value: minVal, onChange: setMin, placeholder: 'Min' },
        { value: maxVal, onChange: setMax, placeholder: 'Maks' },
      ].map((field, i) => (
        <React.Fragment key={field.placeholder}>
          {i === 1 && <Text style={[styles.rangeDash, { color: colors.textSecondary }]}>–</Text>}
          <View style={[styles.rangeField, { backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={field.placeholder}
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
              value={field.value}
              onChangeText={field.onChange}
              maxLength={maxLength}
            />
            {suffix ? <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text> : null}
          </View>
        </React.Fragment>
      ))}
    </View>
  </View>
);

const ToggleRow = ({ label, icon: Icon, tint, value, onValueChange, colors, isDark, last }: any) => (
  <View style={[styles.toggleRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
    <View style={[styles.toggleIcon, { backgroundColor: tint }]}>
      <Icon size={15} color="#FFF" strokeWidth={2.4} />
    </View>
    <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: isDark ? '#39393D' : '#E9E9EB', true: colors.success }}
      thumbColor="#FFF"
      ios_backgroundColor={isDark ? '#39393D' : '#E9E9EB'}
    />
  </View>
);

export default function FilterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { eventName, initialFilters } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);

  // Filters passed in from the opening screen seed the initial state
  const [initial] = useState<Record<string, any>>(() => {
    try {
      return initialFilters ? JSON.parse(initialFilters as string) : {};
    } catch {
      return {};
    }
  });
  const str = (v: any) => (v ? String(v) : '');

  // Range States
  const [minPrice, setMinPrice] = useState(str(initial.minPrice));
  const [maxPrice, setMaxPrice] = useState(str(initial.maxPrice));
  const [minYear, setMinYear] = useState(str(initial.minYear));
  const [maxYear, setMaxYear] = useState(str(initial.maxYear));
  const [minMileage, setMinMileage] = useState(str(initial.minMileage));
  const [maxMileage, setMaxMileage] = useState(str(initial.maxMileage));
  const [minEngine, setMinEngine] = useState(str(initial.minEngine));
  const [maxEngine, setMaxEngine] = useState(str(initial.maxEngine));
  const [city, setCity] = useState(str(initial.city));

  // Selection States
  const [bodyType, setBodyType] = useState(str(initial.bodyType));
  const [fuelType, setFuelType] = useState(str(initial.fuelType));
  const [gearbox, setGearbox] = useState(str(initial.gearbox));
  const [transmission, setTransmission] = useState(str(initial.transmission));
  const [color, setColor] = useState(str(initial.color));
  const [market, setMarket] = useState(str(initial.market));

  // Toggle States
  const [isNew, setIsNew] = useState(!!initial.isNew);
  const [isCredit, setIsCredit] = useState(!!initial.isCredit);
  const [isBarter, setIsBarter] = useState(!!initial.isBarter);

  // Options Data
  const [options, setOptions] = useState<any>({
    bodyTypes: [],
    fuelTypes: [],
    gearboxes: [],
    transmissions: [],
    colors: [],
    markets: []
  });


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

  useEffect(() => {
    fetchOptions();
  }, []);

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

  // Count of filter groups in use, shown on the apply button
  const activeCount = [
    minPrice || maxPrice, minYear || maxYear, minMileage || maxMileage, minEngine || maxEngine,
    city, bodyType, fuelType, gearbox, transmission, color, market, isNew, isCredit, isBarter,
  ].filter(Boolean).length;

  const groupStyle = [
    styles.group,
    { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)' },
  ];

  // iOS presents this as a sheet (no status bar overlap); Android as a full card
  const headerTop = Platform.OS === 'ios' ? 14 : insets.top + 10;

  const pillSection = (title: string, items: any[], value: string, setValue: (v: string) => void) =>
    items.length > 0 && (
      <View style={styles.section}>
        <SectionTitle colors={colors}>{title}</SectionTitle>
        <View style={styles.pillContainer}>
          {items.map((item: any) => (
            <SelectPill
              key={item.id}
              label={item.name}
              selected={value === item.name}
              onPress={() => { haptics.tap(); setValue(value === item.name ? '' : item.name); }}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </View>
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTop, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' }]}
          accessibilityLabel="Bağla"
        >
          <X size={18} color={colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Filtrlər</Text>
        <TouchableOpacity onPress={handleReset} disabled={activeCount === 0} hitSlop={10}>
          <Text style={[styles.resetText, { color: activeCount > 0 ? colors.primary : colors.placeholder }]}>Sıfırla</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Offer type */}
          <View style={styles.section}>
            <SectionTitle colors={colors}>Təklif</SectionTitle>
            <View style={groupStyle}>
              <ToggleRow label="Yalnız yeni avtomobillər" icon={Sparkles} tint="#007AFF" value={isNew} onValueChange={setIsNew} colors={colors} isDark={isDark} />
              <ToggleRow label="Kreditlə mümkündür" icon={Percent} tint="#AF52DE" value={isCredit} onValueChange={setIsCredit} colors={colors} isDark={isDark} />
              <ToggleRow label="Barter mümkündür" icon={ArrowLeftRight} tint="#34C759" value={isBarter} onValueChange={setIsBarter} colors={colors} isDark={isDark} last />
            </View>
          </View>

          {/* Ranges */}
          <View style={styles.section}>
            <SectionTitle colors={colors}>Parametrlər</SectionTitle>
            <View style={groupStyle}>
              <RangeRow label="Qiymət, AZN" minVal={minPrice} maxVal={maxPrice} setMin={setMinPrice} setMax={setMaxPrice} colors={colors} isDark={isDark} />
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <RangeRow label="Buraxılış ili" minVal={minYear} maxVal={maxYear} setMin={setMinYear} setMax={setMaxYear} maxLength={4} colors={colors} isDark={isDark} />
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <RangeRow label="Yürüş, km" minVal={minMileage} maxVal={maxMileage} setMin={setMinMileage} setMax={setMaxMileage} colors={colors} isDark={isDark} />
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <RangeRow label="Mühərrik" minVal={minEngine} maxVal={maxEngine} setMin={setMinEngine} setMax={setMaxEngine} maxLength={4} colors={colors} isDark={isDark} suffix="L" />
            </View>
          </View>

          {/* City */}
          <View style={styles.section}>
            <SectionTitle colors={colors}>Şəhər</SectionTitle>
            <View style={[groupStyle, styles.cityField]}>
              <MapPin size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Şəhər və ya rayon"
                placeholderTextColor={colors.placeholder}
                value={city}
                onChangeText={setCity}
              />
              {!!city && (
                <TouchableOpacity onPress={() => setCity('')} hitSlop={10} accessibilityLabel="Şəhəri təmizlə">
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {pillSection('Ban növü', options.bodyTypes, bodyType, setBodyType)}
          {pillSection('Yanacaq', options.fuelTypes, fuelType, setFuelType)}
          {pillSection('Sürətlər qutusu', options.gearboxes, gearbox, setGearbox)}
          {pillSection('Ötürücü', options.transmissions, transmission, setTransmission)}
          {pillSection('Bazar', options.markets, market, setMarket)}

          {/* Colors */}
          {options.colors.length > 0 && (
            <View style={styles.section}>
              <SectionTitle colors={colors}>Rəng</SectionTitle>
              <View style={[groupStyle, styles.swatchGrid]}>
                {options.colors.map((item: any) => (
                  <ColorSwatch
                    key={item.id}
                    label={item.name}
                    selected={color === item.name}
                    onPress={() => { haptics.tap(); setColor(color === item.name ? '' : item.name); }}
                    colors={colors}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          },
        ]}
      >
        <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.primary }]} onPress={handleApply} activeOpacity={0.85}>
          <Text style={styles.applyText}>Nəticələri göstər</Text>
          {activeCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={[styles.countText, { color: colors.primary }]}>{activeCount}</Text>
            </View>
          )}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontFamily: 'RethinkSans_700Bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  group: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 52,
  },
  toggleIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'RethinkSans_500Medium',
  },
  rangeRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rangeLabel: {
    fontSize: 15,
    fontFamily: 'RethinkSans_600SemiBold',
    marginBottom: 8,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeField: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeDash: {
    marginHorizontal: 10,
    fontSize: 16,
    fontFamily: 'RethinkSans_500Medium',
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontSize: 16,
    fontFamily: 'RethinkSans_500Medium',
  },
  suffix: {
    fontSize: 14,
    fontFamily: 'RethinkSans_600SemiBold',
    marginLeft: 4,
  },
  cityField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  swatch: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  swatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  swatchDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchLabel: {
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
    maxWidth: '90%',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  applyButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
});
