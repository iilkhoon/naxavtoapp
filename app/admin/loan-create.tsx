import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, KeyboardAvoidingView, Modal, FlatList
} from 'react-native';
import {
  ArrowLeft, Car, User, Phone, CreditCard, Calendar, Percent,
  Check, DollarSign, Hash, ChevronDown, Shield, TrendingUp
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

type PickerItem = { label: string; value: string };

const InputField = ({ label, value, onChangeText, icon: Icon, placeholder, keyboardType = 'default', required = false, maxLength, autoCapitalize, colors }: any) => (
  <View style={styles.fieldWrap}>
    <Text style={[styles.fieldLabel, { color: colors.text }]}>
      {label}{required && <Text style={{ color: '#FF3B30' }}> *</Text>}
    </Text>
    <View style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Icon size={18} color={colors.textSecondary} />
      <TextInput
        style={[styles.fieldInputText, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
  </View>
);

const PickerField = ({ label, value, placeholder, onPress, required = false, colors }: any) => (
  <View style={styles.fieldWrap}>
    <Text style={[styles.fieldLabel, { color: colors.text }]}>
      {label}{required && <Text style={{ color: '#FF3B30' }}> *</Text>}
    </Text>
    <TouchableOpacity
      style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Car size={18} color={colors.textSecondary} />
      <Text style={[styles.fieldInputText, { color: value ? colors.text : colors.placeholder, flex: 1 }]}>
        {value || placeholder}
      </Text>
      <ChevronDown size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  </View>
);

export default function LoanCreate() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saleType, setSaleType] = useState<'credit' | 'cash'>('credit');

  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerSurname, setCustomerSurname] = useState('');
  const [customerFatherName, setCustomerFatherName] = useState('');
  const [customerFin, setCustomerFin] = useState('');
  const [customerIdCard, setCustomerIdCard] = useState('');
  const [customerBirthDate, setCustomerBirthDate] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhone2, setCustomerPhone2] = useState('');
  const [customerPhone3, setCustomerPhone3] = useState('');

  // Car fields - using picker
  const [brands, setBrands] = useState<PickerItem[]>([]);
  const [models, setModels] = useState<PickerItem[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedBrandName, setSelectedBrandName] = useState('');
  const [selectedModelName, setSelectedModelName] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carPlate, setCarPlate] = useState('');

  // Picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerData, setPickerData] = useState<PickerItem[]>([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [pickerCallback, setPickerCallback] = useState<((item: PickerItem) => void) | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Finance fields
  const [totalPrice, setTotalPrice] = useState('');
  const [downPayment, setDownPayment] = useState('0');
  const [interestRate, setInterestRate] = useState('0');
  const [durationMonths, setDurationMonths] = useState('12');
  const [notes, setNotes] = useState('');

  // Past customers for auto-fill
  const [pastCustomers, setPastCustomers] = useState<any[]>([]);

  // Profit tracking
  const [hasPurchasePrice, setHasPurchasePrice] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState('');

  const loanAmount = Math.max(0, Number(totalPrice) - Number(downPayment));
  const years = Number(durationMonths) / 12;
  const totalInterest = loanAmount * (Number(interestRate) / 100) * years;
  const totalWithInterest = loanAmount + totalInterest;
  const monthlyPayment = Number(durationMonths) > 0 ? totalWithInterest / Number(durationMonths) : 0;
  const profit = hasPurchasePrice ? Number(totalPrice) - Number(purchasePrice) : 0;

  // Year list
  const currentYear = new Date().getFullYear();
  const yearList: PickerItem[] = Array.from({ length: 50 }, (_, i) => {
    const y = String(currentYear - i);
    return { label: y, value: y };
  });

  // Fetch brands and past customers
  useEffect(() => {
    (async () => {
      const { data: bData } = await supabase.from('brands').select('id, name').order('name');
      if (bData) setBrands(bData.map(b => ({ label: b.name, value: b.id })));

      const { data: cData } = await supabase.from('loan_accounts')
        .select('customer_name, customer_surname, customer_fin, customer_father_name, customer_birth_date, customer_phone, customer_phone_2, customer_phone_3, customer_id_card')
        .order('created_at', { ascending: false });

      if (cData) {
        const unique = new Map();
        cData.forEach((c: any) => {
          if (c.customer_fin && !unique.has(c.customer_fin)) {
            unique.set(c.customer_fin, c);
          }
        });
        setPastCustomers(Array.from(unique.values()));
      }
    })();
  }, []);

  // Fetch models when brand changes
  useEffect(() => {
    if (!selectedBrandId) { setModels([]); return; }
    (async () => {
      const { data } = await supabase.from('models').select('id, name').eq('brand_id', selectedBrandId).order('name');
      if (data) setModels(data.map(m => ({ label: m.name, value: m.id })));
    })();
  }, [selectedBrandId]);

  const openPicker = (title: string, data: PickerItem[], cb: (item: PickerItem) => void) => {
    setPickerTitle(title);
    setPickerData(data);
    setPickerCallback(() => cb);
    setPickerSearch('');
    setPickerVisible(true);
  };

  const handleFinInput = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 7) setCustomerFin(cleaned);
  };

  const handleBirthInput = (text: string) => {
    const nums = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (nums.length > 0) formatted += nums.substring(0, 2);
    if (nums.length > 2) formatted += '.' + nums.substring(2, 4);
    if (nums.length > 4) formatted += '.' + nums.substring(4, 8);
    setCustomerBirthDate(formatted);
  };

  const handleSave = async () => {
    if (!customerName.trim() || !customerSurname.trim()) {
      showToast('Müştəri adı və soyadı tələb olunur', 'error');
      return;
    }
    if (!customerFin.trim()) {
      showToast('FIN kod tələb olunur', 'error');
      return;
    }
    if (!customerBirthDate || customerBirthDate.length !== 10) {
      showToast('Doğum tarixi tələb olunur (DD.MM.YYYY)', 'error');
      return;
    }
    if (!customerPhone.trim()) {
      showToast('Telefon nömrəsi tələb olunur', 'error');
      return;
    }
    if (!selectedBrandName || !selectedModelName) {
      showToast('Marka və model seçin', 'error');
      return;
    }
    if (!carYear) {
      showToast('İl seçin', 'error');
      return;
    }
    if (!totalPrice || Number(totalPrice) <= 0) {
      showToast('Satış qiyməti tələb olunur', 'error');
      return;
    }

    setSaving(true);
    try {
      // Convert DD.MM.YYYY to YYYY-MM-DD
      const bParts = customerBirthDate.split('.');
      const formattedBirth = `${bParts[2]}-${bParts[1]}-${bParts[0]}`;

      const insertData: any = {
        customer_name: customerName.trim(),
        customer_surname: customerSurname.trim(),
        customer_father_name: customerFatherName.trim() || null,
        customer_fin: customerFin.trim().toUpperCase(),
        customer_id_card: customerIdCard.trim() || null,
        customer_birth_date: formattedBirth,
        customer_phone: customerPhone.trim(),
        customer_phone_2: customerPhone2.trim() || null,
        customer_phone_3: customerPhone3.trim() || null,
        car_brand: selectedBrandName,
        car_model: selectedModelName,
        car_year: Number(carYear),
        car_plate: carPlate.trim().toUpperCase() || null,
        sale_type: saleType,
        total_price: Number(totalPrice),
        down_payment: Number(downPayment) || 0,
        loan_amount: saleType === 'cash' ? Number(totalPrice) : loanAmount,
        interest_rate: Number(interestRate) || 0,
        duration_months: saleType === 'cash' ? 1 : Number(durationMonths),
        monthly_payment: saleType === 'cash' ? Number(totalPrice) : Math.round(monthlyPayment * 100) / 100,
        status: saleType === 'cash' ? 'completed' : 'active',
        has_purchase_price: hasPurchasePrice,
        purchase_price: hasPurchasePrice ? Number(purchasePrice) : 0,
        profit: hasPurchasePrice ? profit : 0,
        notes: notes.trim() || null,
        created_by: user?.id,
      };

      const { data: loan, error: loanError } = await supabase
        .from('loan_accounts')
        .insert(insertData)
        .select()
        .single();

      if (loanError) throw loanError;

      // If credit, create payment schedule
      if (saleType === 'credit' && loan) {
        const scheduleItems = [];
        const startDate = new Date();
        const mp = Math.round(monthlyPayment * 100) / 100;
        const principalPerMonth = Math.round((loanAmount / Number(durationMonths)) * 100) / 100;
        const interestPerMonth = mp - principalPerMonth;

        for (let i = 1; i <= Number(durationMonths); i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          scheduleItems.push({
            loan_id: loan.id,
            installment_number: i,
            due_date: dueDate.toISOString().split('T')[0],
            amount: mp,
            principal: principalPerMonth,
            interest: interestPerMonth > 0 ? interestPerMonth : 0,
            status: 'pending',
            paid_amount: 0,
          });
        }

        const { error: schedError } = await supabase.from('loan_schedule').insert(scheduleItems);
        if (schedError) throw schedError;
      }

      showToast(`${saleType === 'credit' ? 'Kredit' : 'Nağd satış'} uğurla yaradıldı! ID: ${loan.customer_unique_id}`, 'success');
      router.back();
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Note: InputField and PickerField are defined outside the component to prevent re-creation on every render

  const filteredPickerData = pickerData.filter(item =>
    item.label.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Yeni Satış</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Sale Type */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Satış Növü</Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, { backgroundColor: saleType === 'credit' ? colors.primary : colors.card, borderColor: colors.border }]}
              onPress={() => setSaleType('credit')}
            >
              <CreditCard size={18} color={saleType === 'credit' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.typeBtnText, { color: saleType === 'credit' ? '#FFF' : colors.text }]}>Kreditlə</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, { backgroundColor: saleType === 'cash' ? '#34C759' : colors.card, borderColor: colors.border }]}
              onPress={() => setSaleType('cash')}
            >
              <DollarSign size={18} color={saleType === 'cash' ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.typeBtnText, { color: saleType === 'cash' ? '#FFF' : colors.text }]}>Nağd</Text>
            </TouchableOpacity>
          </View>

          {/* Customer Info */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>👤 Müştəri Məlumatları</Text>
            {pastCustomers.length > 0 && (
              <TouchableOpacity
                style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
                onPress={() => {
                  openPicker('Mövcud Müştəri Seç', pastCustomers.map(c => ({
                    label: `${c.customer_name} ${c.customer_surname} (${c.customer_fin})`,
                    value: c.customer_fin
                  })), (item) => {
                    const c = pastCustomers.find(p => p.customer_fin === item.value);
                    if (c) {
                      setCustomerName(c.customer_name || '');
                      setCustomerSurname(c.customer_surname || '');
                      setCustomerFatherName(c.customer_father_name || '');
                      setCustomerFin(c.customer_fin || '');
                      setCustomerIdCard(c.customer_id_card || '');
                      
                      // Format birth date back from YYYY-MM-DD to DD.MM.YYYY
                      if (c.customer_birth_date) {
                        const parts = c.customer_birth_date.split('-');
                        if (parts.length === 3) setCustomerBirthDate(`${parts[2]}.${parts[1]}.${parts[0]}`);
                      }
                      
                      setCustomerPhone(c.customer_phone || '');
                      setCustomerPhone2(c.customer_phone_2 || '');
                      setCustomerPhone3(c.customer_phone_3 || '');
                      showToast('Məlumatlar dolduruldu', 'success');
                    }
                  });
                }}
              >
                <Text style={{ color: colors.primary, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>Təkrar Müştəri Seç</Text>
              </TouchableOpacity>
            )}
          </View>
          <InputField label="Ad" value={customerName} onChangeText={setCustomerName} icon={User} placeholder="Müştərinin adı" required colors={colors} />
          <InputField label="Soyad" value={customerSurname} onChangeText={setCustomerSurname} icon={User} placeholder="Müştərinin soyadı" required colors={colors} />
          <InputField label="Ata adı" value={customerFatherName} onChangeText={setCustomerFatherName} icon={User} placeholder="Atanın adı" colors={colors} />
          <InputField label="FIN Kod" value={customerFin} onChangeText={handleFinInput} icon={Hash} placeholder="Məs: 1A2B3C4" required maxLength={7} autoCapitalize="characters" colors={colors} />
          <InputField label="Şəxsiyyət vəsiqəsi (Seriya/Nömrə)" value={customerIdCard} onChangeText={setCustomerIdCard} icon={Shield} placeholder="Məs: AZE12345678" colors={colors} />

          {/* Birth Date */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Doğum Tarixi<Text style={{ color: '#FF3B30' }}> *</Text>
            </Text>
            <View style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Calendar size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.fieldInputText, { color: colors.text }]}
                value={customerBirthDate}
                onChangeText={handleBirthInput}
                placeholder="GG.AA.İİİİ"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          <InputField label="Telefon 1" value={customerPhone} onChangeText={setCustomerPhone} icon={Phone} placeholder="+994 XX XXX XX XX" keyboardType="phone-pad" required colors={colors} />
          <InputField label="Telefon 2" value={customerPhone2} onChangeText={setCustomerPhone2} icon={Phone} placeholder="İkinci nömrə (istəyə bağlı)" keyboardType="phone-pad" colors={colors} />
          <InputField label="Telefon 3" value={customerPhone3} onChangeText={setCustomerPhone3} icon={Phone} placeholder="Üçüncü nömrə (istəyə bağlı)" keyboardType="phone-pad" colors={colors} />

          {/* Car Info */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>🚗 Maşın Məlumatları</Text>
          <PickerField
            label="Marka"
            value={selectedBrandName}
            placeholder="Marka seçin"
            required
            colors={colors}
            onPress={() => openPicker('Marka Seçin', brands, (item) => {
              setSelectedBrandId(item.value);
              setSelectedBrandName(item.label);
              setSelectedModelName('');
            })}
          />
          <PickerField
            label="Model"
            value={selectedModelName}
            placeholder={selectedBrandName ? 'Model seçin' : 'Əvvəlcə marka seçin'}
            required
            colors={colors}
            onPress={() => {
              if (!selectedBrandId) { showToast('Əvvəlcə marka seçin', 'error'); return; }
              openPicker('Model Seçin', models, (item) => setSelectedModelName(item.label));
            }}
          />
          <PickerField
            label="İl"
            value={carYear}
            placeholder="İl seçin"
            required
            colors={colors}
            onPress={() => openPicker('İl Seçin', yearList, (item) => setCarYear(item.value))}
          />
          <InputField label="Avtomobil Nömrəsi" value={carPlate} onChangeText={(t: string) => setCarPlate(t.toUpperCase())} icon={Hash} placeholder="Məs: 50-AA-001" autoCapitalize="characters" colors={colors} />

          {/* Finance Info */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>💰 Maliyyə Məlumatları</Text>

          {/* Profit Tracking Toggle */}
          <TouchableOpacity
            style={[styles.profitToggle, {
              backgroundColor: hasPurchasePrice ? (isDark ? '#1a2e1a' : '#F0FFF0') : colors.card,
              borderColor: hasPurchasePrice ? '#34C759' : colors.border,
            }]}
            onPress={() => setHasPurchasePrice(!hasPurchasePrice)}
          >
            <View style={[styles.checkbox, { borderColor: hasPurchasePrice ? '#34C759' : colors.border, backgroundColor: hasPurchasePrice ? '#34C759' : 'transparent' }]}>
              {hasPurchasePrice && <Check size={14} color="#FFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profitToggleText, { color: colors.text }]}>Başqa qiymətə almışam</Text>
              <Text style={[styles.profitToggleDesc, { color: colors.textSecondary }]}>
                Mənfəəti hesablamaq üçün alış qiymətini daxil edin
              </Text>
            </View>
          </TouchableOpacity>

          {hasPurchasePrice && (
            <InputField label="Alış Qiyməti (₼)" value={purchasePrice} onChangeText={setPurchasePrice} icon={DollarSign} placeholder="20000" keyboardType="numeric" required colors={colors} />
          )}

          <InputField label="Satış Qiyməti (₼)" value={totalPrice} onChangeText={setTotalPrice} icon={DollarSign} placeholder="25000" keyboardType="numeric" required colors={colors} />

          {/* Profit Display */}
          {hasPurchasePrice && Number(purchasePrice) > 0 && Number(totalPrice) > 0 && (
            <View style={[styles.profitCard, {
              backgroundColor: profit >= 0 ? (isDark ? '#1a2e1a' : '#F0FFF0') : (isDark ? '#2e1a1a' : '#FFF0F0'),
              borderColor: profit >= 0 ? '#34C759' : '#FF3B30',
            }]}>
              <TrendingUp size={20} color={profit >= 0 ? '#34C759' : '#FF3B30'} />
              <View>
                <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>Mənfəət</Text>
                <Text style={[styles.profitValue, { color: profit >= 0 ? '#34C759' : '#FF3B30' }]}>
                  {profit >= 0 ? '+' : ''}{profit.toLocaleString('az-AZ')} ₼
                </Text>
              </View>
            </View>
          )}

          {saleType === 'credit' && (
            <>
              <InputField label="İlkin Ödəniş (₼)" value={downPayment} onChangeText={setDownPayment} icon={DollarSign} placeholder="5000" keyboardType="numeric" colors={colors} />
              <InputField label="Faiz (%)" value={interestRate} onChangeText={setInterestRate} icon={Percent} placeholder="0" keyboardType="numeric" colors={colors} />
              <InputField label="Müddət (ay)" value={durationMonths} onChangeText={setDurationMonths} icon={Calendar} placeholder="12" keyboardType="number-pad" colors={colors} />

              {/* Summary */}
              <View style={[styles.summaryCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                <Text style={[styles.summaryTitle, { color: colors.primary }]}>📋 Kredit Xülasəsi</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Kredit məbləği:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{loanAmount.toLocaleString('az-AZ')} ₼</Text>
                </View>
                {Number(interestRate) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Faizlə toplam:</Text>
                    <Text style={[styles.summaryValue, { color: '#FF9500' }]}>{totalWithInterest.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</Text>
                  </View>
                )}
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.primary + '20', paddingTop: 12, marginTop: 4 }]}>
                  <Text style={[styles.summaryLabel, { color: colors.text, fontFamily: 'RethinkSans_700Bold' }]}>Aylıq ödəniş:</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary, fontSize: 20 }]}>{monthlyPayment.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</Text>
                </View>
              </View>
            </>
          )}

          {/* Notes */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>📝 Qeyd</Text>
          <View style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, minHeight: 100, alignItems: 'flex-start', paddingTop: 14 }]}>
            <TextInput
              style={[styles.fieldInputText, { color: colors.text, minHeight: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Əlavə qeydlər..."
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Check size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>
              {saving ? 'Saxlanılır...' : saleType === 'credit' ? 'Kredit Yarat' : 'Nağd Satış Yarat'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{pickerTitle}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={[styles.pickerClose, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.pickerSearch, { backgroundColor: isDark ? '#1a1a1e' : '#F8F8FA', borderColor: colors.border }]}>
              <TextInput
                style={[styles.pickerSearchText, { color: colors.text }]}
                placeholder="Axtar..."
                placeholderTextColor={colors.placeholder}
                value={pickerSearch}
                onChangeText={setPickerSearch}
              />
            </View>
            <FlatList
              data={filteredPickerData}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    if (pickerCallback) pickerCallback(item);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary }}>Nəticə tapılmadı</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: Platform.OS === 'android' ? 10 : 0, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 16 },
  typeToggle: { flexDirection: 'row', gap: 12 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 16, borderWidth: 1,
  },
  typeBtnText: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 8 },
  fieldInput: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1, gap: 10,
  },
  fieldInputText: { flex: 1, fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
  profitToggle: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
    borderWidth: 1, gap: 14, marginBottom: 16,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  profitToggleText: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  profitToggleDesc: { fontSize: 12, fontFamily: 'RethinkSans_400Regular', marginTop: 2 },
  profitCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
    borderWidth: 1, gap: 14, marginBottom: 16,
  },
  profitLabel: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
  profitValue: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold' },
  summaryCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginTop: 8 },
  summaryTitle: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, fontFamily: 'RethinkSans_500Medium' },
  summaryValue: { fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 18, borderRadius: 16, gap: 10, marginTop: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontFamily: 'RethinkSans_700Bold' },
  // Picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', overflow: 'hidden' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  pickerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  pickerClose: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pickerSearch: { margin: 16, padding: 12, borderRadius: 12, borderWidth: 1 },
  pickerSearchText: { fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
  pickerItem: { padding: 16, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },
});
