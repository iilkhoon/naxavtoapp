import React, { useState, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trash2, ArrowLeft, RefreshCw, Edit, CarFront, Hash, CheckCircle, Clock, Eye, Search, X, Filter } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useToast } from '../../contexts/ToastContext';
import { differenceInDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { PlateVisual } from '../../components/PlateVisual';
import { Listing, Plate } from '../../types';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

type Tab = 'cars' | 'plates';
type Status = 'approved' | 'pending';

const DateBadge = ({ dateString }: { dateString: string }) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const daysOld = differenceInDays(new Date(), date);
    const isExpired = daysOld >= 7;
    return (
        <View style={[styles.dateBadge, isExpired && styles.dateBadgeExpired]}>
            <Clock size={10} color={isExpired ? '#FF3B30' : '#AAA'} style={{ marginRight: 4 }} />
            <Text style={[styles.dateText, isExpired && styles.dateTextExpired]}>{daysOld === 0 ? 'Bu gün' : `${daysOld} gün`}</Text>
        </View>
    );
};

const ActionButton = ({ icon: Icon, color, onPress, bg }: any) => (
    <TouchableOpacity onPress={onPress} style={[styles.actionBtn, { backgroundColor: bg }]}><Icon size={18} color={color} /></TouchableOpacity>
);

const CarItem = memo(({ item, colors, activeStatus, onView, onApprove, onEdit, onDelete }: any) => (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.itemLeft}>
          <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} style={styles.image} />
          <View style={styles.info}>
            <View style={styles.headerRow}><Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.make} {item.model}</Text>{item.is_vip && <View style={styles.vipDot} />}</View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.year} • {item.price} AZN</Text>
            <View style={styles.metaRow}><View style={[styles.idPill, { backgroundColor: colors.background }]}><Text style={[styles.idText, { color: colors.textSecondary }]}>{item.short_id || item.id.substring(0,6)}</Text></View><DateBadge dateString={item.created_at} /></View>
          </View>
      </View>
      <View style={styles.actions}>
        {activeStatus === 'pending' ? (<ActionButton icon={CheckCircle} color="#FFF" bg="#4CD964" onPress={() => onApprove(item.id)} />) : (<ActionButton icon={Eye} color="#FFF" bg="#007AFF" onPress={() => onView(item.id)} />)}
        <ActionButton icon={Edit} color={colors.text} bg={colors.background} onPress={() => onEdit(item.id)} />
        <ActionButton icon={Trash2} color="#FF3B30" bg="rgba(255, 59, 48, 0.1)" onPress={() => onDelete(item.id)} />
      </View>
    </MotiView>
));

const PlateItem = memo(({ item, colors, activeStatus, onView, onApprove, onEdit, onDelete }: any) => (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.itemLeft}>
          <View style={styles.plateIcon}><PlateVisual region={item.region} series={item.series} number={item.number} scale={0.35} /></View>
          <View style={styles.info}>
            <View style={styles.headerRow}><Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.region} {item.series} {item.number}</Text>{item.is_vip && <View style={styles.vipDot} />}</View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.price} AZN</Text>
            <View style={styles.metaRow}><View style={[styles.idPill, { backgroundColor: colors.background }]}><Text style={[styles.idText, { color: colors.textSecondary }]}>{item.short_id || item.id.substring(0,6)}</Text></View><DateBadge dateString={item.created_at} /></View>
          </View>
      </View>
      <View style={styles.actions}>
        {activeStatus === 'pending' ? (<ActionButton icon={CheckCircle} color="#FFF" bg="#4CD964" onPress={() => onApprove(item.id)} />) : (<ActionButton icon={Eye} color="#FFF" bg="#007AFF" onPress={() => onView(item.id)} />)}
        <ActionButton icon={Edit} color={colors.text} bg={colors.background} onPress={() => onEdit(item.id)} />
        <ActionButton icon={Trash2} color="#FF3B30" bg="rgba(255, 59, 48, 0.1)" onPress={() => onDelete(item.id)} />
      </View>
    </MotiView>
));

export default function AdminListingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('cars');
  const [activeStatus, setActiveStatus] = useState<Status>('approved');
  const [items, setItems] = useState<(Listing | Plate)[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { fetchItems(); }, [activeTab, activeStatus]));

  const fetchItems = async () => {
    setLoading(true);
    try {
      const table = activeTab === 'cars' ? 'listings' : 'plates';
      const selectQuery = activeTab === 'cars' ? 'id, short_id, title, price, image_url, make, model, year, created_at, contact_phone, seller_name, is_vip' : '*';
      const { data, error } = await supabase.from(table).select(selectQuery).eq('status', activeStatus).order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data as (Listing | Plate)[] || []);
    } catch (error: any) { console.error(error); showToast('Xəta: ' + error.message, 'error'); } finally { setLoading(false); }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (item.short_id && item.short_id.toLowerCase().includes(query)) || item.id.toLowerCase().includes(query) || (activeTab === 'cars' ? `${(item as Listing).make} ${(item as Listing).model}`.toLowerCase().includes(query) : `${(item as Plate).region} ${(item as Plate).series} ${(item as Plate).number}`.toLowerCase().includes(query));
        return matchesSearch;
    });
  }, [items, searchQuery, activeTab]);

  const confirmDelete = useCallback((id: string) => { setItemToDelete(id); setDeleteModalVisible(true); }, []);
  const performDelete = async () => {
    if (!itemToDelete) return;
    setDeleteModalVisible(false);
    const table = activeTab === 'cars' ? 'listings' : 'plates';
    const { error } = await supabase.from(table).delete().eq('id', itemToDelete);
    if (error) { showToast('Xəta: ' + error.message, 'error'); } else { showToast('Elan uğurla silindi', 'success'); fetchItems(); }
    setItemToDelete(null);
  };

  const performApprove = useCallback(async (id: string) => {
    const table = activeTab === 'cars' ? 'listings' : 'plates';
    const { error } = await supabase.from(table).update({ status: 'approved' }).eq('id', id);
    if (error) { showToast('Xəta: ' + error.message, 'error'); } else { showToast('Elan təsdiqləndi', 'success'); fetchItems(); }
  }, [activeTab, fetchItems, showToast]);

  const handleEdit = useCallback((id: string) => { if (activeTab === 'cars') { router.push(`/admin/edit-listing/${id}`); } else { router.push(`/admin/edit-plate/${id}`); } }, [activeTab, router]);
  const handleView = useCallback((id: string) => { if (activeTab === 'cars') { router.push(`/listing/${id}`); } else { router.push(`/plate/${id}`); } }, [activeTab, router]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (activeTab === 'cars') { return (<CarItem item={item} colors={colors} activeStatus={activeStatus} onView={handleView} onApprove={performApprove} onEdit={handleEdit} onDelete={confirmDelete} />); } else { return (<PlateItem item={item} colors={colors} activeStatus={activeStatus} onView={handleView} onApprove={performApprove} onEdit={handleEdit} onDelete={confirmDelete} />); }
  }, [activeTab, colors, activeStatus, handleView, performApprove, handleEdit, confirmDelete]);

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Elan İdarəetməsi</Text>
        <TouchableOpacity onPress={fetchItems}><RefreshCw size={24} color={colors.primary} /></TouchableOpacity>
      </View>
      <View style={styles.tabContainer}>
        <View style={[styles.segmentControl, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={[styles.segmentBtn, activeTab === 'cars' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('cars')}><Text style={[styles.segmentText, activeTab === 'cars' ? { color: '#FFF' } : { color: colors.textSecondary }]}>Avtomobillər</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.segmentBtn, activeTab === 'plates' && { backgroundColor: colors.primary }]} onPress={() => setActiveTab('plates')}><Text style={[styles.segmentText, activeTab === 'plates' ? { color: '#FFF' } : { color: colors.textSecondary }]}>Nömrələr</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.statusFilter}>
        <TouchableOpacity style={[styles.statusChip, activeStatus === 'approved' ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setActiveStatus('approved')}><Text style={[styles.statusText, { color: activeStatus === 'approved' ? '#FFF' : colors.text }]}>Aktiv</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.statusChip, activeStatus === 'pending' ? { backgroundColor: '#FF9500' } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setActiveStatus('pending')}><Text style={[styles.statusText, { color: activeStatus === 'pending' ? '#FFF' : colors.text }]}>Gözləyən</Text></TouchableOpacity>
      </View>
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} style={{ marginLeft: 12 }} />
            <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Axtar..." placeholderTextColor={colors.placeholder} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery.length > 0 && (<TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 12 }}><X size={16} color={colors.textSecondary} /></TouchableOpacity>)}
        </View>
      </View>
      {loading ? (<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />) : (<FlatList data={filteredItems} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={renderItem} ListEmptyComponent={<View style={styles.emptyContainer}><Filter size={40} color={colors.border} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>Elan tapılmadı</Text></View>} />)}
      <ConfirmModal visible={deleteModalVisible} title="Sil" message="Bu elanı silmək istədiyinizə əminsiniz?" onConfirm={performDelete} onCancel={() => setDeleteModalVisible(false)} confirmText="Sil" cancelText="Ləğv et" isDestructive />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  tabContainer: { padding: 16, paddingBottom: 8 },
  segmentControl: { flexDirection: 'row', padding: 4, borderRadius: 12, height: 44 },
  segmentBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  segmentText: { fontFamily: 'RethinkSans_600SemiBold', fontSize: 14 },
  statusFilter: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontFamily: 'RethinkSans_600SemiBold', fontSize: 12 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 44, borderWidth: 1 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  list: { padding: 16 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, justifyContent: 'space-between' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  image: { width: 60, height: 60, borderRadius: 12, marginRight: 12, backgroundColor: '#EEE' },
  plateIcon: { width: 80, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1, marginRight: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  vipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700' },
  subtitle: { fontSize: 13, marginTop: 2, fontFamily: 'RethinkSans_500Medium' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  idPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  idText: { fontSize: 10, fontFamily: 'RethinkSans_600SemiBold' },
  dateBadge: { flexDirection: 'row', alignItems: 'center' },
  dateBadgeExpired: { backgroundColor: 'rgba(255, 59, 48, 0.1)', paddingHorizontal: 4, borderRadius: 4 },
  dateText: { color: '#AAA', fontSize: 10, fontFamily: 'RethinkSans_500Medium' },
  dateTextExpired: { color: '#FF3B30', fontFamily: 'RethinkSans_700Bold' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginTop: 10 },
});
