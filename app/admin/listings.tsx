import React, { useState, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, Edit3, CheckCircle, Eye, LayoutList, Bell } from 'lucide-react-native';
import { differenceInDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useToast } from '../../contexts/ToastContext';
import { PlateVisual } from '../../components/PlateVisual';
import { HapticRefreshControl } from '../../components/ui/HapticRefreshControl';
import { Listing, Plate } from '../../types';
import { haptics } from '../../utils/haptics';
import { useAuth } from '../../contexts/AuthContext';
import { pushHref } from '../../lib/push';
import { deleteStorageImages } from '../../utils/imageOptimizer';
import {
  AdminHeader, Segmented, SearchBar, EmptyView, LoadingView, Pill, useAdminColors, AdminColors, money, F,
} from '../../components/admin/AdminUI';

type Tab = 'cars' | 'plates';
type Status = 'approved' | 'pending';

const age = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const days = differenceInDays(new Date(), d);
  return days === 0 ? 'bu gün' : `${days} gün əvvəl`;
};

const RowAction = ({ c, icon: Icon, label, onPress, tone }: { c: AdminColors; icon: any; label: string; onPress: () => void; tone?: string }) => (
  <TouchableOpacity
    onPress={() => { haptics.tap(); onPress(); }}
    style={[styles.action, { backgroundColor: tone ? `${tone}1F` : c.fill }]}
    hitSlop={4}
    accessibilityLabel={label}
  >
    <Icon size={16} color={tone || c.text} />
  </TouchableOpacity>
);

const ItemRow = memo(({ item, isCar, pending, c, onView, onApprove, onEdit, onDelete, onPush }: {
  item: any; isCar: boolean; pending: boolean; c: AdminColors;
  onView: (item: any) => void; onApprove: (id: string) => void; onEdit: (id: string) => void; onDelete: (id: string) => void;
  onPush?: (item: any) => void;
}) => {
  const cover = isCar ? ((Array.isArray(item.images) && item.images[0]) || item.image_url) : null;
  const oldPending = pending && differenceInDays(new Date(), new Date(item.created_at)) >= 7;
  return (
    <View style={[styles.item, { backgroundColor: c.card, borderColor: c.hairline }]}>
      <View style={[styles.thumb, { backgroundColor: c.fill }]}>
        {isCar ? (
          cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} accessibilityLabel={`${item.make} ${item.model}`} /> : null
        ) : (
          <View style={{ transform: [{ scale: 0.3 }] }}>
            <PlateVisual region={item.region} series={item.series} number={item.number} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {isCar ? `${item.make} ${item.model}` : `${item.region}-${item.series}-${item.number}`}
          </Text>
          {item.is_vip && <Pill label="VIP" tone="warning" />}
        </View>
        <Text style={[styles.price, { color: c.text }]}>{money(item.price, item.currency)}{isCar && item.year ? <Text style={{ color: c.textSecondary, fontFamily: F.medium }}>  ·  {item.year}</Text> : null}</Text>
        <Text style={[styles.meta, { color: oldPending ? c.primary : c.textSecondary }]} numberOfLines={1}>
          #{item.short_id || item.id.substring(0, 6)} · {age(item.created_at)}
        </Text>
      </View>
      <View style={styles.actions}>
        {pending
          ? <RowAction c={c} icon={CheckCircle} label="Təsdiqlə" tone={c.success} onPress={() => onApprove(item.id)} />
          : <RowAction c={c} icon={Eye} label="Bax" onPress={() => onView(item)} />}
        {!pending && onPush && <RowAction c={c} icon={Bell} label="Bildiriş göndər" tone="#FF2D55" onPress={() => onPush(item)} />}
        <RowAction c={c} icon={Edit3} label="Redaktə et" onPress={() => onEdit(item.id)} />
        <RowAction c={c} icon={Trash2} label="Sil" tone={c.primary} onPress={() => onDelete(item.id)} />
      </View>
    </View>
  );
});
ItemRow.displayName = 'ItemRow';

export default function AdminListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useAdminColors();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('cars');
  const [activeStatus, setActiveStatus] = useState<Status>('approved');
  const [items, setItems] = useState<(Listing | Plate)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const table = activeTab === 'cars' ? 'listings' : 'plates';

  const fetchItems = useCallback(async () => {
    try {
      const select = activeTab === 'cars'
        ? 'id, short_id, title, price, currency, image_url, images, make, model, year, created_at, is_vip, is_urgent'
        : 'id, short_id, region, series, number, price, created_at, is_vip';
      const { data, error } = await supabase.from(activeTab === 'cars' ? 'listings' : 'plates').select(select).eq('status', activeStatus).order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as any) || []);
    } catch (error: any) {
      showToast('Xəta: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, activeStatus, showToast]);

  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const changeTab = (tab: Tab) => { setLoading(true); setSearchQuery(''); setActiveTab(tab); };
  const changeStatus = (status: Status) => { setLoading(true); setActiveStatus(status); };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item: any) => {
      const text = activeTab === 'cars' ? `${item.make} ${item.model} ${item.year}` : `${item.region}-${item.series}-${item.number} ${item.region} ${item.series} ${item.number}`;
      return text.toLowerCase().includes(q) || (item.short_id || '').toLowerCase().includes(q);
    });
  }, [items, searchQuery, activeTab]);

  const performDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete;
    const targetItem = items.find((i) => i.id === id) as Listing | undefined;
    setItemToDelete(null);
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      haptics.error();
      showToast('Xəta: ' + error.message, 'error');
      return;
    }
    if (activeTab === 'cars' && targetItem) {
      await deleteStorageImages(supabase, [targetItem.image_url, ...(targetItem.images || [])]);
    }
    haptics.success();
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Elan silindi', 'success');
  };

  const performApprove = useCallback(async (id: string) => {
    const { error } = await supabase.from(table).update({ status: 'approved' }).eq('id', id);
    if (error) {
      haptics.error();
      showToast('Xəta: ' + error.message, 'error');
      return;
    }
    haptics.success();
    setItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Elan təsdiqləndi', 'success');
  }, [table, showToast]);

  const handleEdit = useCallback((id: string) => {
    router.push((activeTab === 'cars' ? `/admin/edit-listing/${id}` : `/admin/edit-plate/${id}`) as any);
  }, [activeTab, router]);

  const { hasModule } = useAuth();
  const canPush = hasModule('notifications');
  const handlePush = useCallback((item: any) => {
    router.push(pushHref(item, activeTab === 'plates') as any);
  }, [activeTab, router]);

  const handleView = useCallback((item: any) => {
    router.push((activeTab === 'cars' ? `/listing/${item.short_id || item.id}` : `/plate/${item.short_id || item.id}`) as any);
  }, [activeTab, router]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader title="Elanlar" subtitle={loading ? undefined : `${filteredItems.length} elan`} backLabel="Admin" />
      <View style={styles.controls}>
        <Segmented<Tab> options={[{ value: 'cars', label: 'Avtomobillər' }, { value: 'plates', label: 'Nömrələr' }]} value={activeTab} onChange={changeTab} />
        <Segmented<Status> options={[{ value: 'approved', label: 'Aktiv' }, { value: 'pending', label: 'Təsdiq gözləyir' }]} value={activeStatus} onChange={changeStatus} />
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={activeTab === 'cars' ? 'Marka, model və ya ID' : 'Nömrə və ya ID'} />
      </View>
      {loading ? <LoadingView /> : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<HapticRefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchItems(); }} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              isCar={activeTab === 'cars'}
              pending={activeStatus === 'pending'}
              c={c}
              onView={handleView}
              onApprove={performApprove}
              onEdit={handleEdit}
              onDelete={setItemToDelete}
              onPush={canPush ? handlePush : undefined}
            />
          )}
          ListEmptyComponent={
            <EmptyView
              icon={LayoutList}
              title={searchQuery ? 'Axtarışa uyğun elan yoxdur' : activeStatus === 'pending' ? 'Təsdiq gözləyən elan yoxdur' : 'Elan yoxdur'}
            />
          }
        />
      )}
      <ConfirmModal
        visible={!!itemToDelete}
        title="Elanı silmək?"
        message="Elan birdəfəlik silinəcək."
        onConfirm={performDelete}
        onCancel={() => setItemToDelete(null)}
        confirmText="Sil"
        cancelText="Ləğv et"
        isDestructive
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: 72, height: 54, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontFamily: F.semibold, flexShrink: 1 },
  price: { fontSize: 15, fontFamily: F.heavy, marginTop: 2 },
  meta: { fontSize: 12, fontFamily: F.medium, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  action: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
});
