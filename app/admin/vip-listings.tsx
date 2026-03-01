import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Search, Crown, CheckCircle, XCircle, Star } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Listing } from '../../types';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

export default function VipListingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();

  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<Listing[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [])
  );

  useEffect(() => {
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      setFilteredItems(items.filter(i =>
        i.make.toLowerCase().includes(lower) ||
        i.model.toLowerCase().includes(lower) ||
        i.year.toString().includes(lower) ||
        (i.short_id && i.short_id.toLowerCase().includes(lower)) ||
        i.id.toLowerCase().includes(lower)
      ));
    } else {
      setFilteredItems(items);
    }
  }, [searchQuery, items]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'approved')
        .order('is_vip', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data as Listing[] || []);
      setFilteredItems(data as Listing[] || []);
    } catch (error: any) {
      console.error(error);
      showToast('Xəta: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleVip = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ is_vip: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showToast(currentStatus ? 'VIP statusu ləğv edildi' : 'Elan VIP edildi', 'success');

      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, is_vip: !currentStatus } : item
      ));
    } catch (error: any) {
      showToast('Xəta: ' + error.message, 'error');
    }
  };

  const renderItem = ({ item, index }: { item: Listing, index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450, delay: index * 50 }}
    >
      <View style={[
        styles.item,
        {
          backgroundColor: colors.card,
          borderColor: item.is_vip ? '#FFD700' : colors.border,
          borderWidth: item.is_vip ? 1.5 : 1
        }
      ]}>
        {item.is_vip && (
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
          style={styles.image}
        />
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.make} {item.model}</Text>
            {item.is_vip && <Crown size={14} color="#FFD700" fill="#FFD700" />}
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.year} • {item.price} AZN</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.idText, { color: colors.textSecondary }]}>ID: {item.short_id || item.id.substring(0, 6)}</Text>
            {item.is_vip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>PREMIUM</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={() => toggleVip(item.id, item.is_vip)}
          style={[
            styles.actionBtn,
            { backgroundColor: item.is_vip ? '#FF3B30' : '#4CD964' }
          ]}
        >
          {item.is_vip ? (
            <Text style={styles.actionText}>Ləğv et</Text>
          ) : (
            <Text style={styles.actionText}>VIP et</Text>
          )}
        </TouchableOpacity>
      </View>
    </MotiView>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>VIP İdarəetmə</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Elan ID, Marka, Model..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Star size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Elan tapılmadı</Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 48, borderWidth: 1 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16 },
  list: { padding: 16, paddingBottom: 50 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  image: { width: 64, height: 64, borderRadius: 12, marginRight: 12, backgroundColor: '#EEE' },
  info: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  idText: { fontSize: 11, fontWeight: '500' },
  vipBadge: { backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vipBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#000' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
});
