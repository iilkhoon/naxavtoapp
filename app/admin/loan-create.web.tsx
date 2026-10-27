import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Card, Button, Segmented, TextField, SelectField, Checkbox, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney,
} from '../../components/web/WebKit';
import { AdminPage, PickerModal, PickerItem } from '../../components/web/AdminKit';

const money2 = (n: number) => `${n.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;
const digits = (v: string) => v.replace(/[^0-9.]/g, '');

export default function LoanCreate() {
  const router = useRouter();
  const t = useWebTokens();
  const { isTablet } = useBreakpoints();
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

      // Down payment / cash sale price goes into the cash book (Finans → Kassa)
      if (saleType === 'cash' || Number(downPayment) > 0) {
        const { error: cashError } = await supabase.rpc('post_loan_sale_to_cash', { p_loan_id: loan.id });
        if (cashError) showToast('Kredit yaradıldı, amma kassaya yazılmadı: ' + cashError.message, 'error');
      }

      showToast(`${saleType === 'credit' ? 'Kredit' : 'Nağd satış'} uğurla yaradıldı! ID: ${loan.customer_unique_id}`, 'success');
      router.back();
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

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
    showToast('Məlumatlar dolduruldu', 'success');
  };

  const pair = (a: React.ReactNode, b: React.ReactNode) => (
    <View style={[styles.pair, isTablet && { flexDirection: 'column' }]}>
      <View style={{ flex: 1 }}>{a}</View>
      <View style={{ flex: 1 }}>{b}</View>
    </View>
  );

  const summaryRow = (label: string, value: string, strong?: boolean, color?: string) => (
    <View style={[styles.sumRow, { borderTopColor: t.hairline }]}>
      <Text style={[styles.sumLabel, { color: strong ? t.text : t.textSecondary }, strong && { fontFamily: FONT.semibold }]}>{label}</Text>
      <Text style={[styles.sumValue, { color: color || t.text }, strong && { fontFamily: FONT.heavy, fontSize: 18 }]}>{value}</Text>
    </View>
  );

  return (
    <AdminPage title="Yeni satış" subtitle="Müştəri, avtomobil və ödəniş şərtləri" maxWidth={1100}>
      <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/loans' as any))} style={styles.back}>
        <ChevronLeft size={18} color={t.accent} />
        <Text style={[styles.backText, { color: t.accent }]}>Kredit paneli</Text>
      </TouchableOpacity>

      <View style={[styles.layout, isTablet && { flexDirection: 'column' }]}>
        <View style={{ flex: 1, minWidth: 0, gap: 24, width: isTablet ? '100%' : undefined }}>
          <Segmented<'credit' | 'cash'>
            options={[{ value: 'credit', label: 'Kreditlə satış' }, { value: 'cash', label: 'Nağd satış' }]}
            value={saleType}
            onChange={setSaleType}
          />

          <View>
            <View style={styles.captionRow}>
              <GroupCaption style={{ marginBottom: 0 }}>Müştəri</GroupCaption>
              {pastCustomers.length > 0 && (
                <Button
                  variant="plain"
                  size="sm"
                  title="Mövcud müştəridən doldur"
                  onPress={() => openPicker('Mövcud müştəri', pastCustomers.map((c) => ({ label: `${c.customer_name} ${c.customer_surname} · ${c.customer_fin}`, value: c.customer_fin })), fillFromCustomer)}
                />
              )}
            </View>
            <Card style={{ gap: 16 }}>
              {pair(
                <TextField label="Ad *" value={customerName} onChangeText={setCustomerName} placeholder="Müştərinin adı" />,
                <TextField label="Soyad *" value={customerSurname} onChangeText={setCustomerSurname} placeholder="Müştərinin soyadı" />
              )}
              {pair(
                <TextField label="Ata adı" value={customerFatherName} onChangeText={setCustomerFatherName} placeholder="Atasının adı" />,
                <TextField label="Doğum tarixi *" value={customerBirthDate} onChangeText={handleBirthInput} placeholder="GG.AA.İİİİ" keyboardType="number-pad" maxLength={10} />
              )}
              {pair(
                <TextField label="FİN kod *" value={customerFin} onChangeText={handleFinInput} placeholder="1A2B3C4" maxLength={7} autoCapitalize="characters" hint={`${customerFin.length}/7`} />,
                <TextField label="Şəxsiyyət vəsiqəsi" value={customerIdCard} onChangeText={setCustomerIdCard} placeholder="AZE12345678" autoCapitalize="characters" />
              )}
              <TextField label="Telefon *" value={customerPhone} onChangeText={setCustomerPhone} placeholder="+994 XX XXX XX XX" keyboardType="phone-pad" />
              {pair(
                <TextField label="Telefon 2" value={customerPhone2} onChangeText={setCustomerPhone2} placeholder="İstəyə bağlı" keyboardType="phone-pad" />,
                <TextField label="Telefon 3" value={customerPhone3} onChangeText={setCustomerPhone3} placeholder="İstəyə bağlı" keyboardType="phone-pad" />
              )}
            </Card>
          </View>

          <View>
            <GroupCaption>Avtomobil</GroupCaption>
            <Card style={{ gap: 16 }}>
              {pair(
                <SelectField
                  label="Marka *"
                  value={selectedBrandName}
                  placeholder="Marka seçin"
                  onPress={() => openPicker('Marka', brands, (item) => {
                    setSelectedBrandId(item.value);
                    setSelectedBrandName(item.label);
                    setSelectedModelName('');
                  })}
                />,
                <SelectField
                  label="Model *"
                  value={selectedModelName}
                  placeholder={selectedBrandName ? 'Model seçin' : 'Əvvəlcə marka'}
                  onPress={() => {
                    if (!selectedBrandId) { showToast('Əvvəlcə marka seçin', 'error'); return; }
                    openPicker('Model', models, (item) => setSelectedModelName(item.label));
                  }}
                />
              )}
              {pair(
                <SelectField label="İl *" value={carYear} placeholder="İl seçin" onPress={() => openPicker('Buraxılış ili', yearList, (item) => setCarYear(item.value))} />,
                <TextField label="Qeydiyyat nişanı" value={carPlate} onChangeText={(v) => setCarPlate(v.toUpperCase())} placeholder="50-AA-001" autoCapitalize="characters" />
              )}
            </Card>
          </View>

          <View>
            <GroupCaption>Maliyyə</GroupCaption>
            <Card style={{ gap: 16 }}>
              {pair(
                <TextField label="Satış qiyməti (₼) *" value={totalPrice} onChangeText={(v) => setTotalPrice(digits(v))} placeholder="25000" keyboardType="numeric" />,
                saleType === 'credit'
                  ? <TextField label="İlkin ödəniş (₼)" value={downPayment} onChangeText={(v) => setDownPayment(digits(v))} placeholder="5000" keyboardType="numeric" />
                  : <View />
              )}
              {saleType === 'credit' && pair(
                <TextField label="İllik faiz (%)" value={interestRate} onChangeText={(v) => setInterestRate(digits(v))} placeholder="0" keyboardType="numeric" />,
                <TextField label="Müddət (ay)" value={durationMonths} onChangeText={(v) => setDurationMonths(v.replace(/\D/g, ''))} placeholder="12" keyboardType="number-pad" />
              )}
              <Checkbox checked={hasPurchasePrice} onChange={setHasPurchasePrice} label="Alış qiymətini qeyd et" description="Mənfəəti hesablamaq üçün avtomobilin alış qiyməti" />
              {hasPurchasePrice && (
                <TextField label="Alış qiyməti (₼)" value={purchasePrice} onChangeText={(v) => setPurchasePrice(digits(v))} placeholder="20000" keyboardType="numeric" />
              )}
              <TextField label="Qeyd" value={notes} onChangeText={setNotes} placeholder="Əlavə qeydlər" multiline />
            </Card>
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.summary, isTablet ? { width: '100%' } : { position: 'sticky' as any, top: 24 }]}>
          <Card>
            <Text style={[styles.sumTitle, { color: t.textSecondary }]}>{saleType === 'credit' ? 'Aylıq ödəniş' : 'Satış məbləği'}</Text>
            <Text style={[styles.sumBig, { color: t.text }]}>
              {saleType === 'credit' ? money2(monthlyPayment) : formatMoney(totalPrice || 0)}
            </Text>
            <View style={{ marginTop: 12 }}>
              {summaryRow('Satış qiyməti', formatMoney(totalPrice || 0))}
              {saleType === 'credit' && summaryRow('İlkin ödəniş', formatMoney(downPayment || 0))}
              {saleType === 'credit' && summaryRow('Kredit məbləği', formatMoney(loanAmount))}
              {saleType === 'credit' && Number(interestRate) > 0 && summaryRow('Faizlə cəmi', money2(totalWithInterest))}
              {saleType === 'credit' && summaryRow('Müddət', `${durationMonths || 0} ay`)}
              {hasPurchasePrice && Number(purchasePrice) > 0 && Number(totalPrice) > 0 &&
                summaryRow('Mənfəət', `${profit >= 0 ? '+' : ''}${formatMoney(profit)}`, true, profit >= 0 ? t.success : t.accent)}
            </View>
            <Button
              title={saleType === 'credit' ? 'Kredit yarat' : 'Nağd satışı qeyd et'}
              size="lg"
              fullWidth
              loading={saving}
              onPress={handleSave}
              style={{ marginTop: 20 }}
            />
            {saleType === 'credit' && (
              <Text style={[styles.note, { color: t.textTertiary }]}>Ödəniş cədvəli {durationMonths || 0} aylıq avtomatik yaradılacaq.</Text>
            )}
          </Card>
        </View>
      </View>

      <PickerModal
        visible={pickerVisible}
        title={pickerTitle}
        items={pickerData}
        onSelect={(item) => pickerCallback?.(item)}
        onClose={() => setPickerVisible(false)}
      />
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: -12, marginBottom: 20, marginLeft: -4, cursor: 'pointer' as any },
  backText: { fontSize: 15, fontFamily: FONT.medium },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  captionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pair: { flexDirection: 'row', gap: 16 },
  summary: { width: 340 },
  sumTitle: { fontSize: 14, fontFamily: FONT.medium },
  sumBig: { fontSize: 34, fontFamily: FONT.heavy, letterSpacing: -1, marginTop: 2 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth },
  sumLabel: { fontSize: 14, fontFamily: FONT.regular },
  sumValue: { fontSize: 14, fontFamily: FONT.semibold },
  note: { fontSize: 12, fontFamily: FONT.regular, textAlign: 'center', marginTop: 10 },
});
