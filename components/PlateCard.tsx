import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, MapPin } from 'lucide-react-native';
import { PlateVisual } from './PlateVisual';
import { useTheme } from '../contexts/ThemeContext';
import { haptics } from '../utils/haptics';

const { width } = Dimensions.get('window');
// Two columns with 16pt side padding and a 12pt gap, matching the car grid
const CARD_WIDTH = Platform.OS === 'web' ? '100%' : (width - 32 - 12) / 2;

interface PlateCardProps {
  region: string;
  series: string;
  number: string;
  price: number;
  description?: string;
  index?: number;
  isVip?: boolean;
  onPress?: () => void;
}

const formatNumber = (value: number) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Same anatomy as CarCard: visual on top, price → title → meta below
export const PlateCard = ({
  region,
  series,
  number,
  price,
  description,
  isVip,
  onPress,
}: PlateCardProps) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => { haptics.tap(); onPress?.(); }}
        activeOpacity={0.88}
        style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)' }]}
        accessibilityRole="button"
        accessibilityLabel={`${region}-${series}-${number}, ${formatNumber(price)} manat`}
      >
        <View style={styles.visual}>
          <LinearGradient
            colors={isDark ? ['#2C2C2E', '#1C1C1E'] : ['#F2F2F7', '#E5E5EA']}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ transform: [{ scale: 0.45 }] }}>
            <PlateVisual region={region} series={series} number={number} />
          </View>

          {isVip && (
            <LinearGradient colors={['#FFE58A', '#F4B400']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vipBadge}>
              <Crown size={11} color="#3D2B00" fill="#3D2B00" />
              <Text style={styles.vipText}>VIP</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.price, { color: colors.text }]} numberOfLines={1}>
            {formatNumber(price)}
            <Text style={[styles.currency, { color: colors.textSecondary }]}> ₼</Text>
          </Text>
          <Text style={[styles.plateText, { color: colors.text }]} numberOfLines={1}>
            {region}-{series}-{number}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {description?.trim() || 'Qeydiyyat nişanı'}
          </Text>
          <View style={styles.metaRow}>
            <MapPin size={11} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>Naxçıvan</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH as any,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 4px 12px rgba(0, 0, 0, 0.04)',
  },
  visual: {
    width: '100%',
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  vipBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 6,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.25)',
  },
  vipText: {
    color: '#3D2B00',
    fontSize: 10,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: 0.6,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  price: {
    fontSize: 17,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  currency: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
  plateText: {
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
  },
  metaText: {
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
  },
});
