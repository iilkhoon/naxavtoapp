import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { HapticRefreshControl } from '../ui/HapticRefreshControl';
import { Listing } from '../../types';
import { haptics } from '../../utils/haptics';
import { AdminHeader, Segmented, SearchBar, EmptyView, LoadingView, useAdminColors, money, F } from './AdminUI';

type Flag = 'is_vip' | 'is_urgent';
type Filter = 'flagged' | 'all';

/**
 * Turns a listing flag (VIP or urgent) on and off. Shared by
 * app/admin/vip-listings.tsx and app/admin/urgent-listings.tsx.
 */
export function FlagListingsScreen({ flag, title, flagLabel, onText, offText, icon }: {
  flag: Flag; title: string; flagLabel: string; onText: string; offText: string; icon: any;
}) {
  const insets = useSafeAreaInsets();
  const c = useAdminColors();
  const { showToast } = useToast();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('flagged');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, short_id, make, model, year, price, currency, image_url, images, is_vip, is_urgent, created_at')
        .eq('status', 'approved')
        .order(flag, { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as Listing[]) || []);
    } catch (error: any) {
      showToast('Xəta: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [flag, showToast]);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const toggle = async (item: Listing) => {
    const next = !item[flag];
    setBusyId(item.id);
    // Optimistic: flip right away, roll back on error
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [flag]: next } : i)));
    const { error } = await supabase.from('listings').update({ [flag]: next }).eq('id', item.id);
    setBusyId(null);
    if (error) {
      haptics.error();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [flag]: !next } : i)));
      showToast('Xəta: ' + error.message, 'error');
      return;
    }
    haptics.success();
    showToast(next ? onText : offText, 'success');
  };

  const flaggedCount = items.filter((i) => i[flag]).length;
  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === 'flagged' && !i[flag]) return false;
      if (!q) return true;
      return `${i.make} ${i.model} ${i.year}`.toLowerCase().includes(q) || (i.short_id || '').toLowerCase().includes(q);
    });
  }, [items, filter, flag, searchQuery]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader title={title} subtitle={loading ? undefined : `${flaggedCount} ${flagLabel.toLowerCase()} elan`} backLabel="Admin" />
      <View style={styles.controls}>
        <Segmented<Filter>
          options={[{ value: 'flagged', label: flagLabel, count: flaggedCount }, { value: 'all', label: 'Bütün elanlar', count: items.length }]}
          value={filter}
          onChange={setFilter}
        />
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Marka, model və ya ID" />
      </View>
      {loading ? <LoadingView /> : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<HapticRefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} tintColor={c.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const cover = (Array.isArray(item.images) && item.images[0]) || item.image_url;
            return (
              <View style={[styles.item, { backgroundColor: c.card, borderColor: c.hairline }]}>
                <View style={[styles.thumb, { backgroundColor: c.fill }]}>
                  {!!cover && <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} accessibilityLabel={`${item.make} ${item.model}`} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{item.make} {item.model}</Text>
                  <Text style={[styles.price, { color: c.text }]}>{money(item.price, item.currency)}</Text>
                  <Text style={[styles.meta, { color: c.textSecondary }]}>#{item.short_id || item.id.substring(0, 6)}{item.year ? ` · ${item.year}` : ''}</Text>
                </View>
                <Switch
                  value={!!item[flag]}
                  disabled={busyId === item.id}
                  onValueChange={() => toggle(item)}
                  trackColor={{ false: c.fill, true: flag === 'is_vip' ? '#F4B400' : c.primary }}
                  accessibilityLabel={`${flagLabel}: ${item.make} ${item.model}`}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyView
              icon={icon}
              title={searchQuery ? 'Axtarışa uyğun elan yoxdur' : filter === 'flagged' ? `${flagLabel} elan yoxdur` : 'Elan yoxdur'}
              subtitle={filter === 'flagged' && !searchQuery ? '“Bütün elanlar” bölməsindən elan seçib açarı yandırın.' : undefined}
            />
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 72, height: 54, borderRadius: 10, overflow: 'hidden' },
  title: { fontSize: 15, fontFamily: F.semibold },
  price: { fontSize: 15, fontFamily: F.heavy, marginTop: 2 },
  meta: { fontSize: 12, fontFamily: F.medium, marginTop: 2 },
});
