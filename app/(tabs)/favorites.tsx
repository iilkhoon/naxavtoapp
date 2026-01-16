import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { CarCard } from '../../components/CarCard';
import { supabase } from '../../lib/supabase';
import { getFavorites, toggleFavorite } from '../../lib/favorites';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Heart, Sparkles } from 'lucide-react-native';
import { MotiView } from 'moti';

const { height } = Dimensions.get('window');

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const favIds = await getFavorites();
      setFavorites(favIds);

      if (favIds.length === 0) {
        setListings([]);
        setLoading(false);
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
    }
  };

  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
    fetchFavorites(); 
  };

  const handleCardPress = (id: string) => {
    router.push(`/listing/${id}`);
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Seçilmişlər</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Sevdiyiniz avtomobillər burada!</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {listings.length > 0 ? (
            <View style={styles.grid}>
              {listings.map((item, index) => (
                <CarCard
                  key={item.id}
                  id={item.id}
                  index={index}
                  title={item.title || `${item.make} ${item.model}`}
                  price={item.price}
                  currency={item.currency || 'AZN'}
                  image={item.image_url || 'https://via.placeholder.com/400'}
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
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                  onPress={handleCardPress}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
                <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={[styles.iconCircle, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                >
                    <Heart size={60} color="#FF3B30" fill="#FF3B30" />
                    <MotiView
                        from={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        transition={{ 
                            type: 'timing', 
                            duration: 1000, 
                            loop: true,
                            repeatReverse: true 
                        }}
                        style={{ position: 'absolute', top: -10, right: -10 }}
                    >
                        <Sparkles size={30} color="#FFD700" />
                    </MotiView>
                </MotiView>
                
                <Text style={[styles.emptyText, { color: colors.text }]}>Hələ ki, boşdur</Text>
                <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                    Sevdiyin elanın üzərindəki ürək ikonuna klik et, sehri gör!
                </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'RethinkSans_500Medium',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: height * 0.15,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px 10px 20px rgba(255, 59, 48, 0.2)',
      },
    }),
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 12,
  },
  emptySubText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    fontFamily: 'RethinkSans_400Regular',
  },
});
