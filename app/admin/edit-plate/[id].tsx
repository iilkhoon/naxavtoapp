import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { haptics } from '../../../utils/haptics';
import {
  AdminHeader, AdminScroll, Group, GroupRow, FieldRow, TextArea, AdminButton, HeaderAction, LoadingView, useAdminColors, F,
} from '../../../components/admin/AdminUI';

export default function EditPlateScreen() {
  const { id } = useLocalSearchParams();
  const plateId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const c = useAdminColors();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [region, setRegion] = useState('');
  const [series, setSeries] = useState('');
  const [number, setNumber] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    if (!plateId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('plates').select('*').eq('id', plateId).single();
      if (cancelled) return;
      if (error || !data) {
        showToast('Nömrə yüklənmədi', 'error');
        router.back();
        return;
      }
      setRegion(data.region || '');
      setSeries(data.series || '');
      setNumber(data.number || '');
      setPrice(String(data.price ?? ''));
      setDescription(data.description || '');
      setSellerName(data.seller_name || '');
      setIsVip(!!data.is_vip);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [plateId, router, showToast]);

  const handleUpdate = async () => {
    if (!plateId) return;
    if (region.length !== 2 || series.length !== 2 || number.length !== 3) {
      haptics.error();
      showToast('Nömrəni tam daxil edin: 90-AA-000', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('plates')
      .update({
        region,
        series: series.toUpperCase(),
        number,
        price: parseFloat(price) || 0,
        description,
        seller_name: sellerName,
        is_vip: isVip,
      })
      .eq('id', plateId);
    setSaving(false);
    if (error) {
      haptics.error();
      showToast('Xəta: ' + error.message, 'error');
      return;
    }
    haptics.success();
    showToast('Nömrə yeniləndi', 'success');
    router.back();
  };

  if (loading) return <LoadingView />;

  const plateInput = (value: string, onChange: (v: string) => void, placeholder: string, width: number, letters?: boolean) => (
    <TextInput
      style={[styles.plateInput, { width }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
      value={value}
      onChangeText={(t) => onChange(letters ? t.toUpperCase().replace(/[^A-Z]/g, '') : t.replace(/\D/g, ''))}
      placeholder={placeholder}
      placeholderTextColor="#C7C7CC"
      maxLength={letters ? 2 : placeholder.length}
      keyboardType={letters ? 'default' : 'number-pad'}
      autoCapitalize={letters ? 'characters' : 'none'}
      accessibilityLabel={letters ? 'Seriya' : placeholder.length === 2 ? 'Region' : 'Nömrə'}
    />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader
        title="Nömrəni redaktə et"
        backLabel="Elanlar"
        right={saving ? <ActivityIndicator color={c.primary} /> : <HeaderAction icon={Save} label="Yadda saxla" onPress={handleUpdate} />}
      />
      <AdminScroll>
        {/* Editable plate in the real AZ plate frame */}
        <View style={styles.plate}>
          <View style={styles.plateLeft}>
            <View style={styles.flag}>
              <View style={[styles.flagStripe, { backgroundColor: '#00B5E2' }]} />
              <View style={[styles.flagStripe, { backgroundColor: '#EF3340' }]} />
              <View style={[styles.flagStripe, { backgroundColor: '#509E2F' }]} />
            </View>
            <Text style={styles.az}>AZ</Text>
          </View>
          <View style={styles.plateFields}>
            {plateInput(region, setRegion, '90', 44)}
            <View style={styles.dash} />
            {plateInput(series, setSeries, 'AA', 52, true)}
            <View style={styles.dash} />
            {plateInput(number, setNumber, '000', 64)}
          </View>
        </View>

        <Group title="Elan">
          <FieldRow label="Qiymət, ₼" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0" />
          <FieldRow label="Satıcı" value={sellerName} onChangeText={setSellerName} placeholder="Ad Soyad" />
          <GroupRow
            title="VIP nömrə"
            right={<Switch value={isVip} onValueChange={(v) => { haptics.tap(); setIsVip(v); }} trackColor={{ false: c.fill, true: '#F4B400' }} />}
          />
        </Group>

        <Group title="Əlavə məlumat">
          <TextArea value={description} onChangeText={setDescription} placeholder="Satıcının qeydi" />
        </Group>

        <AdminButton title="Yadda saxla" onPress={handleUpdate} loading={saving} />
      </AdminScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  plate: { flexDirection: 'row', height: 64, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 3, borderColor: '#111', overflow: 'hidden', marginBottom: 24 },
  plateLeft: { width: 48, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: '#D1D1D6' },
  flag: { width: 32, height: 21, borderRadius: 2, overflow: 'hidden' },
  flagStripe: { flex: 1 },
  az: { fontSize: 14, fontFamily: F.heavy, color: '#111' },
  plateFields: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  plateInput: { fontSize: 26, fontFamily: F.heavy, color: '#111', textAlign: 'center', padding: 0 },
  dash: { width: 8, height: 4, borderRadius: 2, backgroundColor: '#111', marginHorizontal: 6 },
});
