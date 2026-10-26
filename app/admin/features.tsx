import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, Plus, Palette, Settings, Globe, Car, Zap, Edit3, Fuel, ListChecks, Check, X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { haptics } from '../../utils/haptics';
import { AdminHeader, AdminScroll, Group, GroupRow, Chips, EmptyView, LoadingView, useAdminColors, F } from '../../components/admin/AdminUI';

const TABLES = [
    { key: 'car_features', label: 'Komplektasiya', icon: ListChecks, hasCategories: true },
    { key: 'fuel_types', label: 'Yanacaq', icon: Fuel },
    { key: 'body_types', label: 'Ban növü', icon: Car },
    { key: 'colors', label: 'Rənglər', icon: Palette },
    { key: 'gearboxes', label: 'Sürətlər qutusu', icon: Settings },
    { key: 'transmissions', label: 'Ötürücü', icon: Zap },
    { key: 'markets', label: 'Bazar', icon: Globe },
] as const;
type TableKey = typeof TABLES[number]['key'];

const FEATURE_CATEGORIES = [
    'Eksteryer', 'İnteryer', 'Təhlükəsizlik', 'Komfort', 'Multimedia',
    'Funksional avadanlıq', 'Faralar', 'Disk ölçüsü', 'Kamera',
    'Tənzim edilmələr', 'Salonun üz çəkməsi', 'Digər',
];

export default function FeaturesScreen() {
    const c = useAdminColors();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const [tableKey, setTableKey] = useState<TableKey>('car_features');
    const [items, setItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(FEATURE_CATEGORIES[0]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const table = TABLES.find((t) => t.key === tableKey)!;
    const hasCategories = 'hasCategories' in table && table.hasCategories;

    const fetchItems = useCallback(async () => {
        const { data, error } = await supabase.from(tableKey).select('*').order('name', { ascending: true });
        if (error) showToast('Məlumatlar yüklənmədi', 'error');
        else setItems(data || []);
        setLoading(false);
    }, [tableKey, showToast]);

    useEffect(() => {
        const timer = setTimeout(fetchItems, 0);
        return () => clearTimeout(timer);
    }, [fetchItems]);

    const switchTable = (key: TableKey) => {
        setLoading(true);
        setNewItem('');
        setEditingItem(null);
        setTableKey(key);
    };

    const handleSave = async () => {
        const name = newItem.trim();
        if (!name) return;
        setSaving(true);
        const payload: any = { name };
        if (hasCategories) payload.category = selectedCategory;
        const { error } = editingItem
            ? await supabase.from(tableKey).update(payload).eq('id', editingItem.id)
            : await supabase.from(tableKey).insert(payload);
        setSaving(false);
        if (error) {
            haptics.error();
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        haptics.success();
        showToast(editingItem ? 'Yeniləndi' : 'Əlavə edildi', 'success');
        setNewItem('');
        setEditingItem(null);
        fetchItems();
    };

    const performDelete = async () => {
        if (deleteId == null) return;
        const id = deleteId;
        setDeleteId(null);
        const { error } = await supabase.from(tableKey).delete().eq('id', id);
        if (error) {
            haptics.error();
            showToast('Silinmədi: ' + error.message, 'error');
            return;
        }
        haptics.success();
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast('Silindi', 'info');
    };

    const startEdit = (item: any) => {
        setEditingItem(item);
        setNewItem(item.name);
        if (item.category && hasCategories) setSelectedCategory(item.category);
    };

    const visible = hasCategories ? items.filter((i) => i.category === selectedCategory) : items;

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <AdminHeader title="Xüsusiyyətlər" subtitle="Elan formalarındakı seçimlər" backLabel="Admin" />
            <View style={styles.filters}>
                <Chips options={TABLES.map((t) => ({ value: t.key, label: t.label, icon: t.icon }))} value={tableKey} onChange={switchTable} />
                {hasCategories && (
                    <Chips options={FEATURE_CATEGORIES.map((cat) => ({ value: cat, label: cat }))} value={selectedCategory} onChange={setSelectedCategory} />
                )}
            </View>

            {loading ? <LoadingView /> : (
                <AdminScroll contentStyle={{ paddingTop: 8, paddingBottom: 24 }}>
                    {visible.length === 0 ? (
                        <EmptyView title="Hələ heç nə yoxdur" subtitle="Aşağıdakı sahədən yeni dəyər əlavə edin." />
                    ) : (
                        <Group footer={`${visible.length} dəyər`}>
                            {visible.map((item) => (
                                <GroupRow
                                    key={item.id}
                                    title={item.name}
                                    chevron={false}
                                    right={
                                        <View style={styles.rowActions}>
                                            <TouchableOpacity onPress={() => { haptics.tap(); startEdit(item); }} hitSlop={8} style={[styles.rowBtn, { backgroundColor: c.fill }]} accessibilityLabel={`${item.name} redaktə et`}>
                                                <Edit3 size={15} color={c.text} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => { haptics.tap(); setDeleteId(item.id); }} hitSlop={8} style={[styles.rowBtn, { backgroundColor: c.accentSoft }]} accessibilityLabel={`${item.name} sil`}>
                                                <Trash2 size={15} color={c.primary} />
                                            </TouchableOpacity>
                                        </View>
                                    }
                                />
                            ))}
                        </Group>
                    )}
                </AdminScroll>
            )}

            <View style={[styles.composer, { backgroundColor: c.card, borderTopColor: c.hairline, paddingBottom: Math.max(insets.bottom, 12) }]}>
                {editingItem && (
                    <View style={styles.editingRow}>
                        <Text style={[styles.editingText, { color: c.textSecondary }]} numberOfLines={1}>Redaktə: {editingItem.name}</Text>
                        <TouchableOpacity onPress={() => { setEditingItem(null); setNewItem(''); }} hitSlop={8} accessibilityLabel="Ləğv et">
                            <X size={16} color={c.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={styles.inputRow}>
                    <TextInput
                        style={[styles.input, { backgroundColor: c.fill, color: c.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                        placeholder={hasCategories ? `${selectedCategory}: yeni dəyər` : `Yeni: ${table.label.toLowerCase()}`}
                        placeholderTextColor={c.textSecondary}
                        value={newItem}
                        onChangeText={setNewItem}
                        onSubmitEditing={handleSave}
                        returnKeyType="done"
                    />
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: c.primary, opacity: !newItem.trim() || saving ? 0.45 : 1 }]}
                        onPress={handleSave}
                        disabled={!newItem.trim() || saving}
                        accessibilityLabel={editingItem ? 'Yadda saxla' : 'Əlavə et'}
                    >
                        {saving ? <ActivityIndicator color="#FFF" size="small" /> : editingItem ? <Check size={20} color="#FFF" /> : <Plus size={22} color="#FFF" />}
                    </TouchableOpacity>
                </View>
            </View>

            <ConfirmModal
                visible={deleteId != null}
                title="Silmək?"
                message="Bu dəyər seçimlərdən silinəcək."
                onConfirm={performDelete}
                onCancel={() => setDeleteId(null)}
                confirmText="Sil"
                cancelText="Ləğv et"
                isDestructive
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    filters: { paddingTop: 12, paddingBottom: 4, gap: 8 },
    rowActions: { flexDirection: 'row', gap: 8 },
    rowBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    composer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
    editingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    editingText: { fontSize: 13, fontFamily: F.medium, flex: 1 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: { flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, fontFamily: F.medium },
    addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
