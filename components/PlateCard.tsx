import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { MotiView } from 'moti';
import { Crown } from 'lucide-react-native';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { PlateVisual } from './PlateVisual';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Platform.OS === 'web' ? '100%' : (width - 48) / 2;

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

export const PlateCard = ({
  region,
  series,
  number,
  price,
  description,
  index = 0,
  isVip,
  onPress
}: PlateCardProps) => {
  const { colors, isDark } = useTheme();

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 50, 300), type: 'spring' }}
      style={styles.container}
    >
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isVip ? '#FFD700' : 'transparent',
            borderWidth: isVip ? 1 : 0,
            width: '100%'
          }
        ]}
      >
        {/* Visual Section */}
        <View style={[styles.visualContainer, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
          <View style={{ transform: [{ scale: 0.45 }] }}>
            <PlateVisual
              region={region}
              series={series}
              number={number}
            />
          </View>
          {isVip && (
            <View style={[styles.vipBadge, { backgroundColor: '#FFD700' }]}>
              <Crown size={10} color="#000" fill="#000" />
              <Text style={styles.vipText}>VIP</Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.content}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {price.toLocaleString()} <Text style={{ fontSize: 12 }}>AZN</Text>
          </Text>

          <Text style={[styles.plateText, { color: colors.text }]}>
            {region}-{series}-{number}
          </Text>

          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            Naxçıvan
          </Text>
        </View>
      </AnimatedPressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH as any,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  visualContainer: {
    height: 100,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  content: {
    padding: 12,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '500',
  },
  vipBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  vipText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
});
