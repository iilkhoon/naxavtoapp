import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CarCard } from '../../components/CarCard';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { BannerSlider } from '../../components/BannerSlider';
import { Heart, ArrowLeftRight } from 'lucide-react-native';
import { HapticRefreshControl } from '../../components/ui/HapticRefreshControl';
import { useTabBarPadding } from '../../hooks/useTabBarPadding';
import { haptics } from '../../utils/haptics';

const GAP = 12;
const SIDE = 16;

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { settings } = useSettings();
  const bottomPad = useTabBarPadding({ autoInset: true });
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const numColumns = width > 768 ? 4 : 2;

  const fetchFavorites = async () => {
    try {
      const favIds = await getFavorites();
      if (favIds.length === 0) {
        setListings([]);
        return;
      }

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .in('id', favIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Remove from the list right away instead of re-fetching (no spinner flash)
  const handleToggleFavorite = async (id: string) => {
    setListings((prev) => prev.filter((item) => item.id !== id));
    await toggleFavorite(id);
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  // Rows of `numColumns`, so cards in a row share one height
  const rows: any[][] = [];
  for (let i = 0; i < listings.length; i += numColumns) rows.push(listings.slice(i, i + numColumns));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <HapticRefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchFavorites(); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Large title */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Seçilmişlər</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {listings.length > 0 ? `${listings.length} elan yadda saxlanılıb` : 'Bəyəndiyiniz elanlar burada'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.compareBtn, { backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' }]}
          onPress={() => { haptics.tap(); router.push('/(tabs)/compare' as any); }}
          activeOpacity={0.7}
          accessibilityLabel="Müqayisə et"
        >
          <ArrowLeftRight size={16} color={colors.text} />
          <Text style={[styles.compareText, { color: colors.text }]}>Müqayisə</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : listings.length > 0 ? (
        <>
          <BannerSlider
            images={[settings.favorite_banner_1, settings.favorite_banner_2, settings.favorite_banner_3]}
            links={[settings.favorite_banner_1_link, settings.favorite_banner_2_link, settings.favorite_banner_3_link]}
            height={120}
          />
          <View style={styles.grid}>
            {rows.map((row, r) => (
              <View key={r} style={styles.row}>
                {row.map((item) => (
                  <View key={item.id} style={styles.cell}>
                    <CarCard
                      id={item.id}
                      title={item.title || `${item.make} ${item.model}`}
                      price={item.price}
                      currency={item.currency || 'AZN'}
                      image={item.image_url}
                      images={item.images}
                      location={item.location}
                      date={item.created_at}
                      mileage={item.mileage}
                      engine={item.engine}
                      year={item.year}
                      isCredit={item.is_credit}
                      isBarter={item.is_barter}
                      isVip={item.is_vip}
                      isNew={item.is_new}
                      isUrgent={item.is_urgent}
                      isFavorite
                      onToggleFavorite={handleToggleFavorite}
                      onPress={(id) => router.push(`/listing/${id}` as any)}
                    />
                  </View>
                ))}
                {/* keep the last row's cards the same width */}
                {Array.from({ length: numColumns - row.length }).map((_, i) => (
                  <View key={`spacer-${i}`} style={styles.cell} />
                ))}
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
            <Heart size={34} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Hələ seçilmiş elan yoxdur</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Elanın üzərindəki ürəyə toxunun, o burada görünəcək.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => router.navigate('/')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyButtonText}>Elanlara bax</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'RethinkSans_800ExtraBold',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: 2,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    marginBottom: 4,
  },
  compareText: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
  grid: {
    paddingHorizontal: SIDE,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 80,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'RethinkSans_500Medium',
  },
  emptyButton: {
    marginTop: 24,
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 23,
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
  },
});
