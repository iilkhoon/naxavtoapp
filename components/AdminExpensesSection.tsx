import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Car,
  DollarSign,
  User,
  X,
  Filter,
  FileText,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

export type ExpenseType = 'income' | 'expense' | 'debt_given' | 'debt_taken';

export interface AdminExpenseItem {
  id: string;
  user_id?: string;
  type: ExpenseType;
  amount: number;
  currency: string;
  person_name?: string;
  car_info?: string;
  description: string;
  status: 'pending' | 'completed';
  date?: string;
  created_at: string;
}

export const AdminExpensesSection = () => {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [items, setItems] = useState<AdminExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<ExpenseType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('AZN');
  const [description, setDescription] = useState('');
  const [personName, setPersonName] = useState('');
  const [carInfo, setCarInfo] = useState('');

  // Filter State
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [showPersonSummary, setShowPersonSummary] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin expenses:', error);
      } else if (data) {
        setItems(data as AdminExpenseItem[]);
      }
    } catch (err) {
      console.error('Error fetching admin expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!description.trim() || !amount.trim() || isNaN(Number(amount))) {
      Alert.alert('Xəta', 'Zəhmət olmasa məbləğ və təsviri düzgün daxil edin');
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const newItem = {
        user_id: userData?.user?.id || null,
        type: selectedType,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        description: description.trim(),
        person_name: personName.trim() || null,
        car_info: carInfo.trim() || null,
        status: selectedType === 'income' || selectedType === 'expense' ? 'completed' : 'pending',
      };

      const { data, error } = await supabase
        .from('admin_expenses')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setItems(prev => [data as AdminExpenseItem, ...prev]);
        showToast('Qeyd serverə uğurla əlavə olundu!', 'success');
        setModalVisible(false);
        resetForm();
      }
    } catch (err: any) {
      console.error('Error adding expense:', err);
      Alert.alert('Xəta', err.message || 'Serverə qeyd etmək mümkün olmadı');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedType('expense');
    setAmount('');
    setDescription('');
    setPersonName('');
    setCarInfo('');
  };

  const handleToggleStatus = async (item: AdminExpenseItem) => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    try {
      const { error } = await supabase
        .from('admin_expenses')
        .update({ status: newStatus })
        .eq('id', item.id);

      if (error) throw error;

      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
      showToast(newStatus === 'completed' ? 'Status: Tamamlandı' : 'Status: Gözləmədə', 'info');
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Qeydi Sil', 'Bu qeydi həqiqətən silmək istəyirsiniz?', [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('admin_expenses')
              .delete()
              .eq('id', id);

            if (error) throw error;
            setItems(prev => prev.filter(i => i.id !== id));
            showToast('Qeyd silindi', 'info');
          } catch (err) {
            console.error('Error deleting expense:', err);
          }
        },
      },
    ]);
  };

  // Calculations
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let debtGivenPending = 0; // Mənə borc (Alacaqlar)
    let debtTakenPending = 0; // Mənim borcum (Verəcəklər)

    items.forEach(item => {
      const amt = Number(item.amount) || 0;
      if (item.type === 'income') income += amt;
      else if (item.type === 'expense') expense += amt;
      else if (item.type === 'debt_given' && item.status === 'pending') debtGivenPending += amt;
      else if (item.type === 'debt_taken' && item.status === 'pending') debtTakenPending += amt;
    });

    return {
      income,
      expense,
      balance: income - expense,
      debtGivenPending,
      debtTakenPending,
    };
  }, [items]);

  // Unique Persons & Per-Person Balances
  const personSummaries = useMemo(() => {
    const map: Record<string, { given: number; taken: number }> = {};

    items.forEach(item => {
      if (!item.person_name) return;
      const name = item.person_name.trim();
      if (!map[name]) map[name] = { given: 0, taken: 0 };

      const amt = Number(item.amount) || 0;
      if (item.status === 'pending') {
        if (item.type === 'debt_given') map[name].given += amt;
        if (item.type === 'debt_taken') map[name].taken += amt;
      }
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      given: data.given,
      taken: data.taken,
      net: data.given - data.taken, // + means they owe me, - means I owe them
    }));
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterPerson !== 'all' && item.person_name?.trim() !== filterPerson) return false;
      return true;
    });
  }, [items, filterType, filterPerson]);

  const getTypeBadge = (type: ExpenseType) => {
    switch (type) {
      case 'income':
        return { label: 'Gəlir', color: '#34C759', icon: TrendingUp };
      case 'expense':
        return { label: 'Xərc', color: '#FF3B30', icon: TrendingDown };
      case 'debt_given':
        return { label: 'Mənə Borc (Alacaq)', color: '#007AFF', icon: UserCheck };
      case 'debt_taken':
        return { label: 'Mənim Borcum (Verəcək)', color: '#FF9500', icon: UserX };
    }
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.headerIconBg, { backgroundColor: `${colors.primary}20` }]}>
            <Wallet size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Xərclər və Borclar</Text>
            <Text style={[styles.sectionHeaderSub, { color: colors.textSecondary }]}>SuperAdmin Maliyyə Qeydləri</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFF" />
          <Text style={styles.addBtnText}>Qeyd Yaz</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: isDark ? '#1C1C1E' : '#F8F9FA' }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ümumi Gəlir</Text>
          <Text style={[styles.statVal, { color: '#34C759' }]}>+{totals.income.toLocaleString()} AZN</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: isDark ? '#1C1C1E' : '#F8F9FA' }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ümumi Xərc</Text>
          <Text style={[styles.statVal, { color: '#FF3B30' }]}>-{totals.expense.toLocaleString()} AZN</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: isDark ? '#1C1C1E' : '#F8F9FA' }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mənə Borclular (Alacaq)</Text>
          <Text style={[styles.statVal, { color: '#007AFF' }]}>{totals.debtGivenPending.toLocaleString()} AZN</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: isDark ? '#1C1C1E' : '#F8F9FA' }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Borcum Qalır (Verəcək)</Text>
          <Text style={[styles.statVal, { color: '#FF9500' }]}>{totals.debtTakenPending.toLocaleString()} AZN</Text>
        </View>
      </View>

      {/* Toggle Person Summary & Filter */}
      <View style={styles.filterControlRow}>
        <TouchableOpacity
          style={[styles.chipFilter, { backgroundColor: showPersonSummary ? colors.primary : (isDark ? '#333' : '#E5E5EA') }]}
          onPress={() => setShowPersonSummary(!showPersonSummary)}
        >
          <User size={14} color={showPersonSummary ? '#FFF' : colors.text} />
          <Text style={[styles.chipText, { color: showPersonSummary ? '#FFF' : colors.text }]}>
            Borclu Şəxslər ({personSummaries.length})
          </Text>
        </TouchableOpacity>

        {filterPerson !== 'all' && (
          <TouchableOpacity
            style={[styles.chipFilter, { backgroundColor: '#FF3B3015', borderColor: '#FF3B30' }]}
            onPress={() => setFilterPerson('all')}
          >
            <Text style={{ fontSize: 12, color: '#FF3B30', fontFamily: 'RethinkSans_600SemiBold' }}>
              Şəxs: {filterPerson} ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Person Summary Drawer / Box */}
      {showPersonSummary && (
        <MotiView
          from={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={[styles.personDrawer, { backgroundColor: isDark ? '#151515' : '#F2F2F7', borderColor: colors.border }]}
        >
          <Text style={[styles.drawerTitle, { color: colors.text }]}>👤 Adamlar üzrə Borc Balansları:</Text>
          {personSummaries.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>Aktiv borclu adam yoxdur.</Text>
          ) : (
            personSummaries.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.personRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setFilterPerson(p.name);
                  setShowPersonSummary(false);
                }}
              >
                <Text style={[styles.personName, { color: colors.text }]}>{p.name}</Text>
                <View style={styles.personBadgeWrap}>
                  {p.given > 0 && <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>Alacaq: {p.given} AZN</Text>}
                  {p.taken > 0 && <Text style={{ color: '#FF9500', fontSize: 12, fontWeight: '600', marginLeft: 8 }}>Verəcək: {p.taken} AZN</Text>}
                  <Text style={[styles.personNetText, { color: p.net >= 0 ? '#34C759' : '#FF3B30' }]}>
                    {p.net > 0 ? `+${p.net} AZN` : `${p.net} AZN`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </MotiView>
      )}

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 8 }}>
        {[
          { id: 'all', label: 'Bütün Qeydlər' },
          { id: 'expense', label: '🔴 Xərclər' },
          { id: 'income', label: '🟢 Gəlirlər' },
          { id: 'debt_given', label: '🔵 Mənə Borclar' },
          { id: 'debt_taken', label: '🟠 Mənim Borclarım' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabPill,
              { backgroundColor: filterType === tab.id ? colors.primary : (isDark ? '#2C2C2E' : '#E5E5EA') },
            ]}
            onPress={() => setFilterType(tab.id)}
          >
            <Text style={[styles.tabPillText, { color: filterType === tab.id ? '#FFF' : colors.text }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item List */}
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
      ) : filteredItems.length === 0 ? (
        <Text style={[styles.emptyNotice, { color: colors.textSecondary }]}>Hələ heç bir qeyd daxil edilməyib.</Text>
      ) : (
        <View style={{ gap: 10, marginTop: 8 }}>
          {filteredItems.map(item => {
            const info = getTypeBadge(item.type);
            const Icon = info.icon;
            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  { backgroundColor: isDark ? '#1E1E20' : '#F9FAFB', borderColor: colors.border },
                ]}
              >
                <View style={styles.itemMainRow}>
                  <View style={[styles.typeIconBg, { backgroundColor: `${info.color}15` }]}>
                    <Icon size={18} color={info.color} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={[styles.itemAmount, { color: info.color }]}>
                        {item.type === 'expense' || item.type === 'debt_taken' ? '-' : '+'}
                        {Number(item.amount).toLocaleString()} {item.currency}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      {item.person_name && (
                        <View style={styles.metaChip}>
                          <User size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{item.person_name}</Text>
                        </View>
                      )}
                      {item.car_info && (
                        <View style={styles.metaChip}>
                          <Car size={12} color={colors.textSecondary} />
                          <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{item.car_info}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Actions & Status */}
                <View style={[styles.itemFooterRow, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      { backgroundColor: item.status === 'completed' ? '#34C75915' : '#FF950015' },
                    ]}
                    onPress={() => handleToggleStatus(item)}
                  >
                    {item.status === 'completed' ? (
                      <CheckCircle2 size={14} color="#34C759" />
                    ) : (
                      <Clock size={14} color="#FF9500" />
                    )}
                    <Text
                      style={[
                        styles.statusToggleText,
                        { color: item.status === 'completed' ? '#34C759' : '#FF9500' },
                      ]}
                    >
                      {item.status === 'completed' ? 'Ödənildi / Bağlandı' : 'Açıq Borc'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 6 }}>
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Add Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Yeni Qeyd Əlavə Et</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Selectors */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Qeydin Növü</Text>
              <View style={styles.typeSelectorGrid}>
                {[
                  { id: 'expense', label: '🔴 Xərc', desc: 'Nəyə xərclədim' },
                  { id: 'income', label: '🟢 Gəlir', desc: 'Nədən pul gəldi' },
                  { id: 'debt_given', label: '🔵 Mənə Borc', desc: 'Adamın mənə borcu' },
                  { id: 'debt_taken', label: '🟠 Mənim Borcum', desc: 'Mənim adam borcum' },
                ].map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeGridBtn,
                      {
                        backgroundColor: selectedType === t.id ? `${colors.primary}15` : (isDark ? '#2C2C2E' : '#F2F2F7'),
                        borderColor: selectedType === t.id ? colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedType(t.id as ExpenseType)}
                  >
                    <Text style={[styles.typeGridText, { color: selectedType === t.id ? colors.primary : colors.text }]}>
                      {t.label}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount & Currency */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Məbləğ</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                    placeholder="Məs: 150"
                    placeholderTextColor={colors.placeholder}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Valyuta</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {['AZN', 'USD'].map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.currencyBtn,
                          { backgroundColor: currency === c ? colors.primary : (isDark ? '#2C2C2E' : '#F2F2F7') },
                        ]}
                        onPress={() => setCurrency(c)}
                      >
                        <Text style={{ color: currency === c ? '#FFF' : colors.text, fontSize: 12, fontWeight: 'bold' }}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Description */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nəyə xərcləndi / Qeyd</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                  placeholder="Məs: BMW F30 yağ dəyişdirilməsi"
                  placeholderTextColor={colors.placeholder}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Person Name */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Şəxs / Adam Adı (İstəyə görə)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                  placeholder="Məs: Əli usta, Ramil"
                  placeholderTextColor={colors.placeholder}
                  value={personName}
                  onChangeText={setPersonName}
                />
              </View>

              {/* Car Info */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Maşın Məlumatı (İstəyə görə)</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                  placeholder="Məs: Mercedes E220 (77-AA-007)"
                  placeholderTextColor={colors.placeholder}
                  value={carInfo}
                  onChangeText={setCarInfo}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddExpense}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveModalBtnText}>Serverə Qeyd Et</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  sectionHeaderSub: {
    fontSize: 12,
    fontFamily: 'RethinkSans_400Regular',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 14,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 15,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  filterControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  chipFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  personDrawer: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  drawerTitle: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 8,
  },
  personRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  personName: {
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  personBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personNetText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginLeft: 10,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  tabPillText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  emptyNotice: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'RethinkSans_400Regular',
    marginVertical: 16,
  },
  itemCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
    flex: 1,
  },
  itemAmount: {
    fontSize: 15,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontFamily: 'RethinkSans_500Medium',
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusToggleText: {
    fontSize: 11,
    fontFamily: 'RethinkSans_700Bold',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  closeBtn: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
    marginBottom: 6,
  },
  typeSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeGridBtn: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeGridText: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 2,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'RethinkSans_500Medium',
  },
  currencyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  saveModalBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
});
