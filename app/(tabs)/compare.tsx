import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal,
  FlatList, Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getFavorites } from '../../lib/favorites';
import { Plus, X, Check, Heart, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { BannerSlider } from '../../components/BannerSlider';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { haptics } from '../../utils/haptics';

type CompareCar = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  image_url: string;
  images?: string[];
  mileage: number;
  engine: string;
  horsepower?: number;
  location: string;
  is_credit: boolean;
  is_barter: boolean;
  body_type: string;
  color: string;
  gearbox: string;
  transmission: string;
  market: string;
  is_new: boolean;
  fuel_type: string;
};

type Side = 'left' | 'right';

const formatNumber = (value: number) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const money = (car: CompareCar) => `${formatNumber(car.price)} ${car.currency === 'AZN' ? '₼' : car.currency}`;
const cover = (car: CompareCar) => (car.images && car.images.length > 0 ? car.images[0] : car.image_url);

// Which side wins a numeric row (lower price/mileage, newer year)
type Better = 'lower' | 'higher';
const winner = (l: number | undefined, r: number | undefined, better: Better): Side | null => {
  if (l == null || r == null || l === r) return null;
  return better === 'lower' ? (l < r ? 'left' : 'right') : (l > r ? 'left' : 'right');
};

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { settings } = useSettings();
  const bottomPad = useTabBarPadding({ autoInset: true });

  const [favorites, setFavorites] = useState<CompareCar[]>([]);
  const [leftCar, setLeftCar] = useState<CompareCar | null>(null);
  const [rightCar, setRightCar] = useState<CompareCar | null>(null);
  const [activeSide, setActiveSide] = useState<Side | null>(null);

  const fetchFavoritesData = async () => {
    try {
      const favIds = await getFavorites();
      if (favIds.length === 0) {
        setFavorites([]);
        return;
      }
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .in('id', favIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useFocusEffect(useCallback(() => { fetchFavoritesData(); }, []));

  const handleSelectCar = (car: CompareCar) => {
    haptics.tap();
    if (activeSide === 'left') {
      if (rightCar?.id === car.id) setRightCar(null);
      setLeftCar(car);
    } else {
      if (leftCar?.id === car.id) setLeftCar(null);
      setRightCar(car);
    }
    setActiveSide(null);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/(tabs)/favorites' as any));

  const surface = { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)' };

  const renderSlot = (side: Side, car: CompareCar | null) =>
    car ? (
      <View style={styles.slot}>
        <View style={[styles.slotImageWrap, surface]}>
          <Image source={{ uri: cover(car) }} style={styles.slotImage} />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => { haptics.tap(); side === 'left' ? setLeftCar(null) : setRightCar(null); }}
            hitSlop={8}
            accessibilityLabel="Seçimi sil"
          >
            <X size={12} color="#FFF" strokeWidth={3} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.slotMake, { color: colors.textSecondary }]} numberOfLines={1}>{car.make}</Text>
        <Text style={[styles.slotModel, { color: colors.text }]} numberOfLines={1}>{car.model}</Text>
        <Text style={[styles.slotPrice, { color: colors.text }]} numberOfLines={1}>{money(car)}</Text>
      </View>
    ) : (
      <TouchableOpacity
        style={[styles.slot, styles.emptySlot, { borderColor: isDark ? '#3A3A3C' : '#D1D1D6' }]}
        onPress={() => { haptics.tap(); setActiveSide(side); }}
        activeOpacity={0.7}
      >
        <View style={[styles.plusCircle, { backgroundColor: colors.primarySoft }]}>
          <Plus size={22} color={colors.primary} strokeWidth={2.4} />
        </View>
        <Text style={[styles.addText, { color: colors.textSecondary }]}>Avtomobil seç</Text>
      </TouchableOpacity>
    );

  const rows: { label: string; left?: string | number | null; right?: string | number | null; win?: Side | null }[] = [
    { label: 'Qiymət', left: leftCar && money(leftCar), right: rightCar && money(rightCar), win: winner(leftCar?.price, rightCar?.price, 'lower') },
    { label: 'Buraxılış ili', left: leftCar?.year, right: rightCar?.year, win: winner(leftCar?.year, rightCar?.year, 'higher') },
    { label: 'Yürüş', left: leftCar && `${formatNumber(leftCar.mileage)} km`, right: rightCar && `${formatNumber(rightCar.mileage)} km`, win: winner(leftCar?.mileage, rightCar?.mileage, 'lower') },
    { label: 'Mühərrik', left: leftCar?.engine && `${leftCar.engine} L`, right: rightCar?.engine && `${rightCar.engine} L` },
    { label: 'At gücü', left: leftCar?.horsepower && `${leftCar.horsepower} a.g.`, right: rightCar?.horsepower && `${rightCar.horsepower} a.g.`, win: winner(leftCar?.horsepower, rightCar?.horsepower, 'higher') },
    { label: 'Yanacaq', left: leftCar?.fuel_type, right: rightCar?.fuel_type },
    { label: 'Ban növü', left: leftCar?.body_type, right: rightCar?.body_type },
    { label: 'Rəng', left: leftCar?.color, right: rightCar?.color },
    { label: 'Sürətlər qutusu', left: leftCar?.gearbox, right: rightCar?.gearbox },
    { label: 'Ötürücü', left: leftCar?.transmission, right: rightCar?.transmission },
    { label: 'Bazar', left: leftCar?.market, right: rightCar?.market },
    { label: 'Şəhər', left: leftCar?.location, right: rightCar?.location },
    { label: 'Kredit', left: leftCar && (leftCar.is_credit ? 'Var' : 'Yox'), right: rightCar && (rightCar.is_credit ? 'Var' : 'Yox') },
    { label: 'Barter', left: leftCar && (leftCar.is_barter ? 'Var' : 'Yox'), right: rightCar && (rightCar.is_barter ? 'Var' : 'Yox') },
  ];

  const renderValue = (value: string | number | null | undefined, wins: boolean) => (
    <View style={styles.valueCell}>
      {wins && <Check size={13} color={colors.success} strokeWidth={3} />}
      <Text
        style={[styles.value, { color: wins ? colors.success : colors.text }, wins && styles.valueWin, value == null && { color: colors.placeholder }]}
        numberOfLines={1}
      >
        {value ?? '—'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={10} accessibilityLabel="Geri">
          <ChevronLeft size={22} color={colors.primary} strokeWidth={2.4} />
          <Text style={[styles.backText, { color: colors.primary }]}>Seçilmişlər</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Müqayisə</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Seçilmişlərdən iki avtomobili yan-yana qoyun</Text>
        </View>

        <BannerSlider
          images={[settings.compare_banner_1, settings.compare_banner_2, settings.compare_banner_3]}
          height={120}
        />

        {/* Slots */}
        <View style={styles.selectionArea}>
          {renderSlot('left', leftCar)}
          <View style={[styles.vs, { backgroundColor: colors.text }]}>
            <Text style={[styles.vsText, { color: colors.background }]}>VS</Text>
          </View>
          {renderSlot('right', rightCar)}
        </View>

        {/* Comparison table */}
        {(leftCar || rightCar) && (
          <View style={[styles.table, surface]}>
            {rows.map((row, i) => (
              <View
                key={row.label}
                style={[styles.tableRow, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                {renderValue(row.left, row.win === 'left')}
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]} numberOfLines={1}>{row.label}</Text>
                {renderValue(row.right, row.win === 'right')}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Picker sheet */}
      <Modal visible={activeSide !== null} animationType="slide" transparent onRequestClose={() => setActiveSide(null)} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveSide(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 12 }]}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Avtomobil seçin</Text>
              <TouchableOpacity
                onPress={() => setActiveSide(null)}
                style={[styles.sheetClose, { backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' }]}
                accessibilityLabel="Bağla"
              >
                <X size={16} color={colors.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {favorites.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <View style={[styles.plusCircle, { backgroundColor: colors.primarySoft }]}>
                  <Heart size={22} color={colors.primary} />
                </View>
                <Text style={[styles.sheetEmptyTitle, { color: colors.text }]}>Seçilmiş elan yoxdur</Text>
                <Text style={[styles.sheetEmptyText, { color: colors.textSecondary }]}>Müqayisə üçün əvvəlcə elanları ürəklə işarələyin.</Text>
              </View>
            ) : (
              <FlatList
                data={favorites}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => {
                  const taken = leftCar?.id === item.id || rightCar?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.pickItem, surface, taken && { opacity: 0.45 }]}
                      onPress={() => handleSelectCar(item)}
                      disabled={taken}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: cover(item) }} style={styles.pickImage} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickTitle, { color: colors.text }]} numberOfLines={1}>{item.make} {item.model}</Text>
                        <Text style={[styles.pickMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {[item.year, item.mileage != null && `${formatNumber(item.mileage)} km`].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Text style={[styles.pickPrice, { color: colors.text }]}>{money(item)}</Text>
                      {taken && (
                        <View style={[styles.pickCheck, { backgroundColor: colors.primary }]}>
                          <Check size={12} color="#FFF" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: 10, marginBottom: 4 },
  backText: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 32, fontFamily: 'RethinkSans_800ExtraBold', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },

  selectionArea: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, gap: 10, marginTop: 4, marginBottom: 16 },
  slot: { flex: 1 },
  emptySlot: { height: 176, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 10 },
  plusCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  addText: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold' },
  slotImageWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 8 },
  slotImage: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  slotMake: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  slotModel: { fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  slotPrice: { fontSize: 15, fontFamily: 'RethinkSans_800ExtraBold', marginTop: 2 },
  vs: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 56 },
  vsText: { fontSize: 11, fontFamily: 'RethinkSans_800ExtraBold' },

  table: { marginHorizontal: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 12 },
  rowLabel: { width: 104, textAlign: 'center', fontSize: 12, fontFamily: 'RethinkSans_600SemiBold' },
  valueCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  value: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold', textAlign: 'center', flexShrink: 1 },
  valueWin: { fontFamily: 'RethinkSans_800ExtraBold' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '78%', minHeight: '45%', paddingTop: 8 },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  sheetTitle: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold' },
  sheetClose: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  sheetEmpty: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 40, gap: 8 },
  sheetEmptyTitle: { fontSize: 17, fontFamily: 'RethinkSans_700Bold', marginTop: 4 },
  sheetEmptyText: { textAlign: 'center', fontSize: 14, fontFamily: 'RethinkSans_500Medium', lineHeight: 20 },
  pickItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  pickImage: { width: 64, height: 48, borderRadius: 8 },
  pickTitle: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  pickMeta: { fontSize: 12, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },
  pickPrice: { fontSize: 14, fontFamily: 'RethinkSans_800ExtraBold' },
  pickCheck: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
