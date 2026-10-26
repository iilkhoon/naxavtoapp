import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image as RNImage } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Heart, Crown, Zap, MapPin } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { formatListingDate } from '../utils/date';

interface CarCardProps {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  images?: string[];
  location: string;
  date: string; // ISO string
  mileage: number;
  engine: string;
  year?: number;
  isCredit?: boolean;
  isBarter?: boolean;
  isVip?: boolean;
  isNew?: boolean;
  isUrgent?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onPress?: (id: string) => void;
  index?: number;
}

// 1 250 000 style grouping (thin spaces read better than dots for big numbers)
const formatNumber = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

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
  isUrgent,
  isFavorite,
  onToggleFavorite,
  onPress,
}: CarCardProps) => {
  const { colors, isDark } = useTheme();
  const displayDate = formatListingDate(date);

  // Lists always show the first photo; the gallery lives on the detail screen
  const coverImage = images && images.length > 0 ? images[0] : image;
  const ImageComponent = Platform.OS === 'web' ? RNImage : ExpoImage;

  // Only show the specs we actually have (avoids "undefined • …")
  const specs = [
    year ? String(year) : null,
    engine ? (/l$/i.test(String(engine).trim()) ? String(engine) : `${engine} L`) : null,
    mileage || mileage === 0 ? `${formatNumber(mileage)} km` : null,
  ].filter(Boolean).join(' · ');

  const tags = [
    isNew && { label: 'Yeni', color: '#34C759' },
    isCredit && { label: 'Kredit', color: '#AF52DE' },
    isBarter && { label: 'Barter', color: '#007AFF' },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
          },
        ]}
        activeOpacity={0.88}
        onPress={() => onPress && onPress(id)}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${formatNumber(price)} ${currency}`}
      >
        {/* Image */}
        <View style={[styles.imageContainer, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
          <ImageComponent
            style={styles.image}
            source={Platform.OS === 'web' ? { uri: coverImage } : coverImage}
            {...(Platform.OS !== 'web'
              ? { contentFit: 'cover', cachePolicy: 'memory-disk', transition: 150 }
              : { resizeMode: 'cover' })}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => { e.stopPropagation(); onToggleFavorite && onToggleFavorite(id); }}
            style={styles.heartButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={isFavorite ? 'Seçilmişlərdən sil' : 'Seçilmişlərə əlavə et'}
          >
            <Heart
              size={16}
              color={isFavorite ? '#FF3B30' : '#1C1C1E'}
              fill={isFavorite ? '#FF3B30' : 'transparent'}
              strokeWidth={2.4}
            />
          </TouchableOpacity>

          {(isVip || isUrgent) && (
            <View style={styles.imageBadges}>
              {isVip && (
                <View style={[styles.imageBadge, { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
                  <Crown size={10} color="#FFD60A" fill="#FFD60A" />
                  <Text style={[styles.imageBadgeText, { color: '#FFD60A' }]}>VIP</Text>
                </View>
              )}
              {isUrgent && (
                <View style={[styles.imageBadge, { backgroundColor: 'rgba(255,59,48,0.92)' }]}>
                  <Zap size={10} color="#FFF" fill="#FFF" />
                  <Text style={[styles.imageBadgeText, { color: '#FFF' }]}>Təcili</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.priceText, { color: colors.text }]} numberOfLines={1}>
            {formatNumber(price)}
            <Text style={[styles.currencyText, { color: colors.textSecondary }]}>
              {' '}{currency === 'AZN' ? '₼' : currency}
            </Text>
          </Text>

          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>

          {!!specs && (
            <Text style={[styles.specText, { color: colors.textSecondary }]} numberOfLines={1}>
              {specs}
            </Text>
          )}

          {tags.length > 0 && (
            <View style={styles.tags}>
              {tags.map((tag) => (
                <View key={tag.label} style={[styles.tag, { backgroundColor: `${tag.color}${isDark ? '33' : '1A'}` }]}>
                  <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.metaRow}>
            <MapPin size={11} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {[location, displayDate].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

CarCard.displayName = 'CarCard';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '100%',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.04), 0px 4px 12px rgba(0, 0, 0, 0.04)',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  imageBadges: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    gap: 4,
  },
  imageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 10,
  },
  imageBadgeText: {
    fontSize: 10,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  priceText: {
    fontSize: 17,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  currencyText: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
  title: {
    fontSize: 14,
    fontFamily: 'RethinkSans_600SemiBold',
    marginBottom: 2,
  },
  specText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 5,
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'RethinkSans_700Bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
  },
});
