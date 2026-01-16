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
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, ChevronDown, ArrowLeft, Layers, Search } from 'lucide-react-native';
import { SelectionModal } from '../../components/SelectionModal';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { MotiView } from 'moti';

export default function ModelsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);

  const [models, setModels] = useState<any[]>([]);
  const [newModel, setNewModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand.id);
    } else {
      setModels([]);
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    const { data } = await supabase.from('brands').select('*').order('name');
    if (data) setBrands(data);
  };

  const fetchModels = async (brandId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('brand_id', brandId)
        .order('name');
      
      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (selectedBrand) {
      setRefreshing(true);
      fetchModels(selectedBrand.id);
    }
  }, [selectedBrand]);

  const handleAddModel = async () => {
    if (!newModel.trim() || !selectedBrand) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from('models')
        .insert({ 
          name: newModel.trim(),
          brand_id: selectedBrand.id 
        });

      if (error) throw error;
      
      setNewModel('');
      fetchModels(selectedBrand.id);
    } catch (error: any) {
      Alert.alert('Xəta', 'Model əlavə edilə bilmədi. ' + error.message);
    } finally {
      setAdding(false);
    }
  };

  const performDelete = async (id: string) => {
    try {
        const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id);
        
        if (error) throw error;
        if (selectedBrand) fetchModels(selectedBrand.id);
    } catch (error: any) {
        Alert.alert('Xəta', error.message);
    }
  };

  const handleDeleteModel = async (id: string, name: string) => {
    if (Platform.OS === 'web') {
        if (window.confirm(`"${name}" modelini silmək istədiyinizə əminsiniz?`)) {
            performDelete(id);
        }
    } else {
        Alert.alert(
          'Sil',
          `"${name}" modelini silmək istədiyinizə əminsiniz?`,
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
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 30 }}
    >
        <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                    <Layers size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
            </View>
            <TouchableOpacity 
                onPress={() => handleDeleteModel(item.id, item.name)}
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
        <Text style={[styles.title, { color: colors.text }]}>Modellər</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.selectionSection}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Marka seçin:</Text>
        <TouchableOpacity 
          style={[styles.brandSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowBrandModal(true)}
        >
          <Text style={[selectedBrand ? styles.brandText : styles.placeholderText, { color: selectedBrand ? colors.text : colors.placeholder }]}>
            {selectedBrand ? selectedBrand.name : 'Marka seçin'}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={models}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} enabled={!!selectedBrand} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Layers size={40} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {selectedBrand 
                    ? 'Bu marka üçün model tapılmadı' 
                    : 'Zəhmət olmasa əvvəlcə marka seçin'}
                </Text>
            </View>
          }
        />
      )}

      {selectedBrand && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.inputRow}>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Yeni model adı..."
                    placeholderTextColor={colors.placeholder}
                    value={newModel}
                    onChangeText={setNewModel}
                />
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: colors.primary }, (!newModel.trim() || adding) && styles.disabledButton]}
                    onPress={handleAddModel}
                    disabled={!newModel.trim() || adding}
                >
                    {adding ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Plus size={24} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
      )}

      <SelectionModal
        visible={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        title="Marka Seçin"
        items={brands}
        onSelect={(brand) => setSelectedBrand(brand)}
        selectedId={selectedBrand?.id}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
  backButton: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold' },
  selectionSection: { padding: 16 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  brandSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  brandText: { fontSize: 16, fontWeight: 'bold' },
  placeholderText: { fontSize: 16 },
  list: { padding: 16, paddingBottom: 100 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemText: { fontSize: 16, fontWeight: '600' },
  deleteButton: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 16 },
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, height: 50, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  addButton: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
});
