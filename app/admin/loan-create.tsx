import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from 'react-native';
import { Check, UserCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { haptics } from '../../utils/haptics';
import {
  AdminHeader, AdminScroll, Group, GroupRow, FieldRow, SelectRow, TextArea, Segmented, AdminButton, HeaderAction, PickerSheet,
  useAdminColors, money, PickerOption,
} from '../../components/admin/AdminUI';

type PickerItem = PickerOption;

export default function LoanCreate() {
  const router = useRouter();
  const colors = useAdminColors();
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
  // Models are kept with the brand they belong to, so a brand change clears them without an effect
  const [brandModels, setBrandModels] = useState<{ brandId: string; items: PickerItem[] }>({ brandId: '', items: [] });
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
    if (!selectedBrandId) return;
    (async () => {
      const { data } = await supabase.from('models').select('id, name').eq('brand_id', selectedBrandId).order('name');
      if (data) setBrandModels({ brandId: selectedBrandId, items: data.map(m => ({ label: m.name, value: m.id })) });
    })();
  }, [selectedBrandId]);

  const models = brandModels.brandId === selectedBrandId ? brandModels.items : [];

  const openPicker = (title: string, data: PickerItem[], cb: (item: PickerItem) => void) => {
    setPickerTitle(title);
    setPickerData(data);
    setPickerCallback(() => cb);
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
        if (schedError) {
          // Don't leave a credit account without its payment schedule
          await supabase.from('loan_accounts').delete().eq('id', loan.id);
          throw schedError;
        }
      }

      showToast(`${saleType === 'credit' ? 'Kredit' : 'Nağd satış'} uğurla yaradıldı! ID: ${loan.customer_unique_id}`, 'success');
      haptics.success();
      router.back();
    } catch (e: any) {
      haptics.error();
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Note: InputField and PickerField are defined outside the component to prevent re-creation on every render


  const fillFromCustomer = (item: PickerItem) => {
    const c = pastCustomers.find((p) => p.customer_fin === item.value);
    if (!c) return;
    setCustomerName(c.customer_name || '');
    setCustomerSurname(c.customer_surname || '');
    setCustomerFatherName(c.customer_father_name || '');
    setCustomerFin(c.customer_fin || '');
    setCustomerIdCard(c.customer_id_card || '');
    // YYYY-MM-DD → DD.MM.YYYY
    const parts = (c.customer_birth_date || '').split('-');
    if (parts.length === 3) setCustomerBirthDate(`${parts[2]}.${parts[1]}.${parts[0]}`);
    setCustomerPhone(c.customer_phone || '');
    setCustomerPhone2(c.customer_phone_2 || '');
    setCustomerPhone3(c.customer_phone_3 || '');
    haptics.success();
    showToast('Məlumatlar dolduruldu', 'success');
  };

  const digits = (v: string) => v.replace(/[^0-9.]/g, '');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader
        title="Yeni satış"
        backLabel="Kredit paneli"
        right={saving ? <ActivityIndicator color={colors.primary} /> : <HeaderAction icon={Check} label="Yadda saxla" onPress={handleSave} />}
      />
      <AdminScroll>
        <Segmented<'credit' | 'cash'>
          options={[{ value: 'credit', label: 'Kreditlə' }, { value: 'cash', label: 'Nağd' }]}
          value={saleType}
          onChange={setSaleType}
          style={{ marginBottom: 24 }}
        />

        <Group title="Müştəri">
          {pastCustomers.length > 0 && (
            <GroupRow
              icon={UserCheck}
              tint="#007AFF"
              title="Mövcud müştəridən doldur"
              onPress={() => openPicker('Mövcud müştəri', pastCustomers.map((c) => ({ label: `${c.customer_name} ${c.customer_surname} · ${c.customer_fin}`, value: c.customer_fin })), fillFromCustomer)}
            />
          )}
          <FieldRow label="Ad *" value={customerName} onChangeText={setCustomerName} placeholder="Ad" textContentType="givenName" />
          <FieldRow label="Soyad *" value={customerSurname} onChangeText={setCustomerSurname} placeholder="Soyad" textContentType="familyName" />
          <FieldRow label="Ata adı" value={customerFatherName} onChangeText={setCustomerFatherName} placeholder="İstəyə bağlı" />
          <FieldRow label="FİN kod *" value={customerFin} onChangeText={handleFinInput} placeholder="1A2B3C4" maxLength={7} autoCapitalize="characters" autoCorrect={false} />
          <FieldRow label="Ş.V. seriya" value={customerIdCard} onChangeText={setCustomerIdCard} placeholder="AZE12345678" autoCapitalize="characters" autoCorrect={false} />
          <FieldRow label="Doğum tarixi *" value={customerBirthDate} onChangeText={handleBirthInput} placeholder="GG.AA.İİİİ" keyboardType="number-pad" maxLength={10} />
          <FieldRow label="Telefon *" value={customerPhone} onChangeText={setCustomerPhone} placeholder="+994 …" keyboardType="phone-pad" />
          <FieldRow label="Telefon 2" value={customerPhone2} onChangeText={setCustomerPhone2} placeholder="İstəyə bağlı" keyboardType="phone-pad" />
          <FieldRow label="Telefon 3" value={customerPhone3} onChangeText={setCustomerPhone3} placeholder="İstəyə bağlı" keyboardType="phone-pad" />
        </Group>

        <Group title="Avtomobil">
          <SelectRow
            label="Marka *"
            value={selectedBrandName}
            placeholder="Seçin"
            onPress={() => openPicker('Marka', brands, (item) => {
              setSelectedBrandId(item.value);
              setSelectedBrandName(item.label);
              setSelectedModelName('');
            })}
          />
          <SelectRow
            label="Model *"
            value={selectedModelName}
            placeholder={selectedBrandName ? 'Seçin' : 'Əvvəlcə marka'}
            onPress={() => {
              if (!selectedBrandId) { showToast('Əvvəlcə marka seçin', 'error'); return; }
              openPicker('Model', models, (item) => setSelectedModelName(item.label));
            }}
          />
          <SelectRow label="İl *" value={carYear} placeholder="Seçin" onPress={() => openPicker('Buraxılış ili', yearList, (item) => setCarYear(item.value))} />
          <FieldRow label="Nömrə" value={carPlate} onChangeText={(v) => setCarPlate(v.toUpperCase())} placeholder="50-AA-001" autoCapitalize="characters" autoCorrect={false} />
        </Group>

        <Group title="Maliyyə">
          <FieldRow label="Satış qiyməti *" value={totalPrice} onChangeText={(v) => setTotalPrice(digits(v))} placeholder="₼" keyboardType="decimal-pad" />
          {saleType === 'credit' && (
            <>
              <FieldRow label="İlkin ödəniş" value={downPayment} onChangeText={(v) => setDownPayment(digits(v))} placeholder="₼" keyboardType="decimal-pad" />
              <FieldRow label="İllik faiz, %" value={interestRate} onChangeText={(v) => setInterestRate(digits(v))} placeholder="0" keyboardType="decimal-pad" />
              <FieldRow label="Müddət, ay" value={durationMonths} onChangeText={(v) => setDurationMonths(v.replace(/\D/g, ''))} placeholder="12" keyboardType="number-pad" />
            </>
          )}
          <GroupRow
            title="Alış qiymətini qeyd et"
            subtitle="Mənfəəti hesablamaq üçün"
            right={<Switch value={hasPurchasePrice} onValueChange={(v) => { haptics.tap(); setHasPurchasePrice(v); }} trackColor={{ false: colors.fill, true: colors.success }} />}
          />
          {hasPurchasePrice && (
            <FieldRow label="Alış qiyməti" value={purchasePrice} onChangeText={(v) => setPurchasePrice(digits(v))} placeholder="₼" keyboardType="decimal-pad" />
          )}
        </Group>

        {saleType === 'credit' && (
          <Group title="Xülasə" footer={`Ödəniş cədvəli ${durationMonths || 0} aylıq avtomatik yaradılacaq.`}>
            <GroupRow title="Kredit məbləği" value={money(loanAmount)} />
            {Number(interestRate) > 0 && <GroupRow title="Faizlə cəmi" value={money(totalWithInterest)} />}
            <GroupRow title="Aylıq ödəniş" value={`${monthlyPayment.toLocaleString('az-AZ', { maximumFractionDigits: 2 })} ₼`} />
            {hasPurchasePrice && Number(purchasePrice) > 0 && Number(totalPrice) > 0 && (
              <GroupRow title="Mənfəət" value={`${profit >= 0 ? '+' : ''}${money(profit)}`} />
            )}
          </Group>
        )}

        <Group title="Qeyd">
          <TextArea value={notes} onChangeText={setNotes} placeholder="Əlavə qeydlər" />
        </Group>

        <AdminButton title={saleType === 'credit' ? 'Kredit yarat' : 'Nağd satışı qeyd et'} onPress={handleSave} loading={saving} />
      </AdminScroll>

      <PickerSheet
        visible={pickerVisible}
        title={pickerTitle}
        options={pickerData}
        onSelect={(item) => pickerCallback?.(item)}
        onClose={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
