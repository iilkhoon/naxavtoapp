import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Dimensions,
  Platform,
  Switch,
  KeyboardAvoidingView
} from 'react-native';
import { X, RotateCcw, Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLOR_MAP: Record<string, string> = {
  'Ağ': '#FFFFFF', 'Ağ Mirvari': '#F0EAD6', 'Qara': '#000000', 'Qara Metalik': '#1A1A1A',
  'Gümüşü': '#C0C0C0', 'Boz': '#808080', 'Yaş Asfalt': '#5E5E5E', 'Qırmızı': '#FF3B30',
  'Albalı': '#DE3163', 'Göy': '#007AFF', 'Mavi': '#5AC8FA', 'Yaşıl': '#34C759',
  'Zeytun': '#808000', 'Sarı': '#FFCC00', 'Qızılı': '#FFD700', 'Qəhvəyi': '#8B4513',
  'Narıncı': '#FF9500', 'Bənövşəyi': '#AF52DE', 'Bej': '#F5F5DC', 'Tünd qırmızı': '#8B0000',
  'Asfalt': '#4A4A4A', 'Şabalıdı': '#954535', 'Xamilyon': 'gray', 'Çəhrayı': '#FFC0CB',
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

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  options?: {
    bodyTypes: any[];
    colors: any[];
    gearboxes: any[];
    transmissions: any[];
    markets: any[];
    fuelTypes: any[];
  };
}

export const FilterModal = ({ visible, onClose, onApply, options }: FilterModalProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minMileage, setMinMileage] = useState('');
  const [maxMileage, setMaxMileage] = useState('');
  const [minEngine, setMinEngine] = useState('');
  const [maxEngine, setMaxEngine] = useState('');
  const [city, setCity] = useState('');
  
  const [bodyType, setBodyType] = useState('');
  const [color, setColor] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [transmission, setTransmission] = useState('');
  const [market, setMarket] = useState('');
  const [isNew, setIsNew] = useState<boolean | undefined>(undefined);

  const handleApply = () => {
    onApply({
      minPrice, maxPrice, minYear, maxYear, minMileage, maxMileage, minEngine, maxEngine, city,
      bodyType, color, fuelType, gearbox, transmission, market, isNew
    });
    onClose();
  };

  const handleReset = () => {
    setMinPrice(''); setMaxPrice(''); setMinYear(''); setMaxYear('');
    setMinMileage(''); setMaxMileage(''); setMinEngine(''); setMaxEngine(''); setCity('');
    setBodyType(''); setColor(''); setFuelType('');
    setGearbox(''); setTransmission(''); setMarket('');
    setIsNew(undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View 
            style={[
                styles.container, 
                { 
                    backgroundColor: colors.card,
                    paddingBottom: insets.bottom
                }
            ]}
        >
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
            </View>

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleReset} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                    <RotateCcw size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Filterlər</Text>
                <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                    <X size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={styles.content} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View>
                    {/* Financial Toggles */}
                    <View style={[styles.togglesContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <SwitchRow label="Yalnız Yeni Avtomobillər" value={isNew === true} onValueChange={(v: boolean) => setIsNew(v ? true : undefined)} colors={colors} />
                    </View>

                    <RangeInput label="Qiymət (AZN)" minVal={minPrice} maxVal={maxPrice} setMin={setMinPrice} setMax={setMaxPrice} colors={colors} />
                    <RangeInput label="Buraxılış ili" minVal={minYear} maxVal={maxYear} setMin={setMinYear} setMax={setMaxYear} maxLength={4} colors={colors} />
                    <RangeInput label="Yürüş (km)" minVal={minMileage} maxVal={maxMileage} setMin={setMinMileage} setMax={setMaxMileage} colors={colors} />
                    <RangeInput label="Mühərrik (L)" minVal={minEngine} maxVal={maxEngine} setMin={setMinEngine} setMax={setMaxEngine} maxLength={4} colors={colors} suffix="L" />

                    {/* City */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Şəhər</Text>
                        <View style={[styles.singleInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <TextInput 
                                style={[styles.input, { width: '100%', color: colors.text }]} 
                                placeholder="Şəhər və ya rayon daxil edin" 
                                placeholderTextColor={colors.placeholder} 
                                value={city}
                                onChangeText={setCity}
                            />
                        </View>
                    </View>

                    {options && (
                    <>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Yanacaq</Text>
                            <View style={styles.pillContainer}>
                                {options.fuelTypes?.map((item: any) => (
                                    <SelectPill key={item.id} label={item.name} selected={fuelType === item.name} onPress={() => setFuelType(fuelType === item.name ? '' : item.name)} colors={colors} isDark={isDark} />
                                ))}
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ban növü</Text>
                            <View style={styles.pillContainer}>
                                {options.bodyTypes?.map((item: any) => (
                                    <SelectPill key={item.id} label={item.name} selected={bodyType === item.name} onPress={() => setBodyType(bodyType === item.name ? '' : item.name)} colors={colors} isDark={isDark} />
                                ))}
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Sürətlər Qutusu</Text>
                            <View style={styles.pillContainer}>
                                {options.gearboxes?.map((item: any) => (
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
                    </>
                    )}
                </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.primary }]} onPress={handleApply}>
                    <Text style={styles.applyText}>Nəticələri Göstər</Text>
                </TouchableOpacity>
            </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    height: '92%',
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'RethinkSans_800ExtraBold',
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
    fontFamily: 'RethinkSans_600SemiBold',
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
    fontFamily: 'RethinkSans_700Bold',
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
    fontFamily: 'RethinkSans_600SemiBold',
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
    fontFamily: 'RethinkSans_600SemiBold',
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
    fontFamily: 'RethinkSans_500Medium',
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
    fontFamily: 'RethinkSans_700Bold',
  },
});
