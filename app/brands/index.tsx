import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, ArrowLeft, Search, CarFront } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { MotiView } from 'moti';
import LoadingAnimation from '../../components/LoadingAnimation';

export default function BrandsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [brands, setBrands] = useState<any[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredBrands(brands.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFilteredBrands(brands);
    }
  }, [searchQuery, brands]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
      setFilteredBrands(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBrands();
  }, []);

  const handleAddBrand = async () => {
    if (!newBrand.trim()) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from('brands')
        .insert({ name: newBrand.trim() });

      if (error) throw error;

      setNewBrand('');
      fetchBrands();
    } catch (error: any) {
      if (Platform.OS === 'web') alert('Xəta: ' + error.message);
      else Alert.alert('Xəta', 'Marka əlavə edilə bilmədi. ' + error.message);
    } finally {
      setAdding(false);
    }
  };

  const performDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBrands();
    } catch (error: any) {
      Alert.alert('Xəta', error.message);
    }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`"${name}" markasını silmək istədiyinizə əminsiniz?`)) {
        performDelete(id);
      }
    } else {
      Alert.alert(
        'Sil',
        `"${name}" markasını silmək istədiyinizə əminsiniz?`,
        [
          { text: 'Ləğv et', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: () => performDelete(id)
          }
        ]
      );
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 30 }}
      style={styles.cardWrapper}
    >
      <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.itemLeft}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#F8F9FA' }]}>
            {item.logo_url ? (
              <Image
                source={{ uri: item.logo_url }}
                style={styles.brandLogo}
                contentFit="contain"
              />
            ) : (
              <CarFront size={24} color={colors.textSecondary} />
            )}
          </View>
          <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteBrand(item.id, item.name)}
          style={[styles.deleteButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
        >
          <Trash2 size={18} color="#FF3B30" />
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
        <Text style={[styles.title, { color: colors.text }]}>Markalar</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.placeholder} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Marka axtar..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <LoadingAnimation fullScreen={false} size={120} />
      ) : (
        <FlatList
          data={filteredBrands}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Marka tapılmadı</Text>
          }
        />
      )}

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Yeni marka adı..."
            placeholderTextColor={colors.placeholder}
            value={newBrand}
            onChangeText={setNewBrand}
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }, (!newBrand.trim() || adding) && styles.disabledButton]}
            onPress={handleAddBrand}
            disabled={!newBrand.trim() || adding}
          >
            {adding ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Plus size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold' },
  searchSection: { padding: 16, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, height: 48, borderWidth: 1 },
  searchInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16 },
  list: { padding: 16, paddingBottom: 100 },
  cardWrapper: { width: '48%', marginBottom: 12 },
  item: { padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 12 },
  itemLeft: { alignItems: 'center', width: '100%' },
  iconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  brandLogo: { width: 36, height: 36 },
  itemText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  deleteButton: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, height: 50, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  addButton: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
});
