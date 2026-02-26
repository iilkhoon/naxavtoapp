import React, { memo, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image as RNImage, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Heart, Crown } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { useTheme } from '../contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { formatListingDate } from '../utils/date';

const { width } = Dimensions.get('window');

interface CarCardProps {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  images?: string[];
  location: string;
  date: string; // Changed from time to date (ISO string)
  mileage: number;
  engine: string;
  year?: number;
  isCredit?: boolean;
  isBarter?: boolean;
  isVip?: boolean;
  isNew?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onPress?: (id: string) => void;
  index?: number;
}

export const CarCard = memo(({
  id,
  title,
  price,
  currency,
  image,
  images = [],
  location,
  date,
  mileage,
  engine,
  year,
  isCredit,
  isBarter,
  isVip,
  isNew,
  isFavorite,
  onToggleFavorite,
  onPress,
  index = 0,
}: CarCardProps) => {
  const { colors, isDark } = useTheme();
  const formattedPrice = price.toLocaleString().replace(/,/g, '.');
  const displayDate = formatListingDate(date);

  const allImages = React.useMemo(() => {
    const list = images && images.length > 0 ? images : [image];
    // Ensure unique images if possible, or just slice
    return list.slice(0, 5);
  }, [image, images]);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // PERFORMANCE OPTIMIZATION: Removed auto-scroll for VIP to improve list performance
    // if (allImages.length <= 1 || !isVip) return;
    // intervalRef.current = setInterval(() => {
    //   setCurrentImgIndex((prev) => (prev + 1) % allImages.length);
    // }, 4000);
    // return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // Empty dependency array, effectively disabled

  const ImageComponent = Platform.OS === 'web' ? RNImage : ExpoImage;
  // Always use the first image for list performance
  const currentImageSource = allImages[0];

  return (
    <View style={styles.container}>
      <AnimatedPressable
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
          }
        ]}
        onPress={() => onPress && onPress(id)}
      >
        {/* Image Section */}
        <View style={[styles.imageContainer, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
          <ImageComponent
            style={styles.image}
            source={Platform.OS === 'web' ? { uri: currentImageSource } : currentImageSource}
            {...(Platform.OS !== 'web' ? { contentFit: 'cover', cachePolicy: 'memory-disk' } : { resizeMode: 'cover' })}
          />

          <View style={styles.topRow}>
            <View style={styles.badges}>
              {isCredit && <View style={[styles.badge, { backgroundColor: '#007AFF' }]}><Text style={styles.badgeText}>Kredit</Text></View>}
              {isBarter && <View style={[styles.badge, { backgroundColor: '#FF9500' }]}><Text style={styles.badgeText}>Barter</Text></View>}
              {isNew && <View style={[styles.badge, { backgroundColor: '#34C759' }]}><Text style={styles.badgeText}>Yeni</Text></View>}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(id); }}
              style={styles.heartButtonWrapper}
            >
              {/* Replaced BlurView with simple translucent View for performance */}
              <View style={[styles.heartBlur, { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]}>
                <Heart size={18} color={isFavorite ? "#FF3B30" : (isDark ? "#FFF" : "#000")} fill={isFavorite ? "#FF3B30" : "transparent"} />
              </View>
            </TouchableOpacity>
          </View>

          {isVip && (
            <View style={[styles.vipBadge, { borderColor: '#FFD700', backgroundColor: isDark ? '#000' : '#FFF' }]}>
              <Crown size={10} color="#FFD700" fill="#FFD700" style={{ marginRight: 3 }} />
              <Text style={[styles.vipText, { color: isDark ? '#FFD700' : '#000' }]}>VIP</Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceText, { color: colors.primary }]}>
              {formattedPrice} <Text style={{ fontSize: 12, fontFamily: 'RethinkSans_700Bold' }}>{currency === 'AZN' ? '₼' : currency}</Text>
            </Text>
            {isVip && <Crown size={16} color="#FFD700" fill="#FFD700" />}
          </View>

          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.specsRow}>
            <Text style={[styles.specText, { color: colors.textSecondary }]}>{year} • {engine} • {mileage} km</Text>
          </View>

          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {location}, {displayDate}
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
  },
  imageContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    flex: 1,
    marginRight: 4,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontFamily: 'RethinkSans_700Bold',
  },
  heartButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  heartBlur: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  vipBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    zIndex: 10,
  },
  vipText: {
    fontSize: 9,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    zIndex: 10,
  },
  dot: {
    borderRadius: 3,
  },
  content: {
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 17,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  title: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 4,
  },
  specsRow: {
    marginBottom: 4,
  },
  specText: {
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
  },
  locationText: {
    fontSize: 10,
    fontFamily: 'RethinkSans_500Medium',
  },
});
