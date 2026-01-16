import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Trash2, Plus, ArrowLeft, Palette, Settings, Globe, Car, Zap, Edit, Fuel, ListChecks, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { MotiView } from 'moti';
import { useToast } from '../../contexts/ToastContext';

const TABLES = [
  { key: 'car_features', label: 'Komplektasiya', icon: ListChecks, hasCategories: true },
  { key: 'fuel_types', label: 'Yanacaq', icon: Fuel },
  { key: 'body_types', label: 'Ban Növləri', icon: Car },
  { key: 'colors', label: 'Rənglər', icon: Palette },
  { key: 'gearboxes', label: 'Sürətlər Qutusu', icon: Settings },
  { key: 'transmissions', label: 'Ötürücülər', icon: Zap },
  { key: 'markets', label: 'Bazarlar', icon: Globe },
];

const FEATURE_CATEGORIES = [
  'Eksteryer', 'İnteryer', 'Təhlükəsizlik', 'Komfort', 'Multimedia', 
  'Funksional avadanlıq', 'Faralar', 'Disk ölçüsü', 'Kamera', 
  'Tənzim edilmələr', 'Salonun üz çəkməsi', 'Digər'
];

export default function FeaturesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  
  const [activeTable, setActiveTable] = useState(TABLES[0]);
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(FEATURE_CATEGORIES[0]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchItems();
    setNewItem('');
    setEditingItem(null);
  }, [activeTable]);

  const fetchItems = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from(activeTable.key)
            .select('*')
            .order('name', { ascending: true });
            
        if (error) throw error;
        setItems(data || []);
    } catch (error: any) {
        console.error(error);
        showToast('Məlumatları yükləmək mümkün olmadı', 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
        const payload: any = { name: newItem.trim() };
        if (activeTable.hasCategories) {
            payload.category = selectedCategory;
        }

        if (editingItem) {
            const { error } = await supabase
                .from(activeTable.key)
                .update(payload)
                .eq('id', editingItem.id);
            if (error) throw error;
            showToast('Uğurla yeniləndi', 'success');
        } else {
            const { error } = await supabase
                .from(activeTable.key)
                .insert(payload);
            if (error) throw error;
            showToast('Uğurla əlavə edildi', 'success');
        }
        
        setNewItem('');
        setEditingItem(null);
        fetchItems();
    } catch (error: any) {
        Alert.alert('Xəta', error.message);
    } finally {
        setAdding(false);
    }
  };

  const performDelete = async (id: number) => {
    try {
        const { error } = await supabase.from(activeTable.key).delete().eq('id', id);
        if (error) throw error;
        showToast('Silindi', 'info');
        fetchItems();
    } catch (error: any) {
        Alert.alert('Xəta', error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (Platform.OS === 'web') {
        if (window.confirm('Bu məlumatı silmək istədiyinizə əminsiniz?')) {
            performDelete(id);
        }
    } else {
        Alert.alert('Sil', 'Bu məlumatı silmək istədiyinizə əminsiniz?', [
            { text: 'Ləğv et', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: () => performDelete(id)
            }
        ]);
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setNewItem(item.name);
    if (item.category && activeTable.hasCategories) {
        setSelectedCategory(item.category);
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setNewItem('');
  };

  const filteredItems = activeTable.hasCategories 
    ? items.filter(i => i.category === selectedCategory)
    : items;

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 30 }}
    >
        <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.itemContent}>
                <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
                {activeTable.hasCategories && (
                    <Text style={[styles.itemCategory, { color: colors.textSecondary }]}>{item.category}</Text>
                )}
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => startEdit(item)} style={[styles.actionBtn, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                    <Edit size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                    <Trash2 size={18} color="#FF3B30" />
                </TouchableOpacity>
            </View>
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
        <Text style={[styles.title, { color: colors.text }]}>Xüsusiyyətlər</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <FlatList 
            data={TABLES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.key}
            contentContainerStyle={{ paddingHorizontal: 12 }}
            renderItem={({ item }) => {
                const Icon = item.icon;
                const isActive = activeTable.key === item.key;
                return (
                    <TouchableOpacity 
                        style={[
                            styles.tab, 
                            { 
                                backgroundColor: isActive ? colors.primary : colors.card,
                                borderColor: isActive ? colors.primary : colors.border
                            }
                        ]}
                        onPress={() => setActiveTable(item)}
                    >
                        <Icon size={16} color={isActive ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            }}
        />
      </View>

      {activeTable.hasCategories && (
        <View style={styles.categoriesContainer}>
            <FlatList 
                data={FEATURE_CATEGORIES}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={({ item }) => {
                    const isActive = selectedCategory === item;
                    return (
                        <TouchableOpacity 
                            style={[
                                styles.categoryTab, 
                                { 
                                    backgroundColor: isActive ? colors.card : 'transparent',
                                    borderColor: isActive ? colors.primary : colors.border,
                                    borderWidth: 1
                                }
                            ]}
                            onPress={() => setSelectedCategory(item)}
                        >
                            <Text style={[styles.categoryText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Məlumat yoxdur. Yeni əlavə edin.</Text>
          }
        />
      )}

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.inputRow}>
            <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder={editingItem ? "Adı dəyişdir..." : `Yeni ${activeTable.label}...`}
                placeholderTextColor={colors.placeholder}
                value={newItem}
                onChangeText={setNewItem}
            />
            {editingItem && (
                <TouchableOpacity onPress={cancelEdit} style={styles.cancelButton}>
                    <Text style={{color: colors.textSecondary, fontSize: 12}}>Ləğv</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.primary }, (!newItem.trim() || adding) && styles.disabledButton]}
                onPress={handleAddOrUpdate}
                disabled={!newItem.trim() || adding}
            >
                {adding ? (
                    <ActivityIndicator color="#FFF" size="small" />
                ) : (
                    editingItem ? <Check size={20} color="#FFF" /> : <Plus size={24} color="#FFF" />
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
  tabsContainer: { paddingVertical: 12, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 4, borderRadius: 20, borderWidth: 1 },
  tabText: { fontWeight: '600', fontSize: 13 },
  categoriesContainer: { paddingVertical: 10 },
  categoryTab: { paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 4, borderRadius: 12 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1 },
  itemContent: { flex: 1 },
  itemText: { fontSize: 16, fontWeight: '600' },
  itemCategory: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, height: 48, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  cancelButton: { paddingHorizontal: 8 },
  addButton: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  disabledButton: { opacity: 0.5 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
