import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { compressImage } from '../../../utils/imageOptimizer';
import { haptics } from '../../../utils/haptics';
import {
  AdminHeader, AdminScroll, Group, GroupRow, FieldRow, SelectRow, TextArea, AdminButton, HeaderAction, PickerSheet, LoadingView,
  useAdminColors, F,
} from '../../../components/admin/AdminUI';

const MAX_IMAGES = 15;

interface SelectedImage {
  uri: string;
  base64?: string | null;
  isNew?: boolean;
}

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { showToast } = useToast();
  const colors = useAdminColors();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  
  // Data States
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [bodyTypes, setBodyTypes] = useState<any[]>([]);
  const [colorsData, setColorsData] = useState<any[]>([]);
  const [gearboxes, setGearboxes] = useState<any[]>([]);
  const [transmissions, setTransmissions] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [fuelTypes, setFuelTypes] = useState<any[]>([]);
  
  // Modal State
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Form State
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [engine, setEngine] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [vinCode, setVinCode] = useState('');
  
  const [bodyType, setBodyType] = useState('');
  const [color, setColor] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [transmission, setTransmission] = useState('');
  const [market, setMarket] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [isBarter, setIsBarter] = useState(false);

  // Image State
  const [images, setImages] = useState<SelectedImage[]>([]);


  const fetchInitialData = async () => {
    try {
      // 1. Fetch Dynamic Options
      const [bRes, cRes, gRes, tRes, mRes, fRes, brandsRes] = await Promise.all([
        supabase.from('body_types').select('*').order('name'),
        supabase.from('colors').select('*').order('name'),
        supabase.from('gearboxes').select('*').order('name'),
        supabase.from('transmissions').select('*').order('name'),
        supabase.from('markets').select('*').order('name'),
        supabase.from('fuel_types').select('*').order('name'),
        supabase.from('brands').select('*').order('name'),
      ]);

      if (bRes.data) setBodyTypes(bRes.data);
      if (cRes.data) setColorsData(cRes.data);
      if (gRes.data) setGearboxes(gRes.data);
      if (tRes.data) setTransmissions(tRes.data);
      if (mRes.data) setMarkets(mRes.data);
      if (fRes.data) setFuelTypes(fRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);

      // 2. Fetch Listing Data
      const { data: listing, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) throw error;

      // 3. Populate Form
      setMake(listing.make);
      setModel(listing.model);
      setYear(listing.year ? listing.year.toString() : '');
      setPrice(listing.price ? listing.price.toString() : '');
      setMileage(listing.mileage ? listing.mileage.toString() : '');
      setEngine(listing.engine || '');
      setLocation(listing.location || '');
      setDescription(listing.description || '');
      setBodyType(listing.body_type || '');
      setColor(listing.color || '');
      setGearbox(listing.gearbox || '');
      setTransmission(listing.transmission || '');
      setMarket(listing.market || '');
      setFuelType(listing.fuel_type || '');
      setIsNew(listing.is_new || false);
      setIsCredit(listing.is_credit || false);
      setIsBarter(listing.is_barter || false);
      setSellerName(listing.seller_name || '');
      setContactPhone(listing.contact_phone || '');
      setVinCode(listing.vin_code || '');

      // Populate Images
      if (listing.images && Array.isArray(listing.images)) {
        setImages(listing.images.map((url: string) => ({ uri: url, isNew: false })));
      } else if (listing.image_url) {
        setImages([{ uri: listing.image_url, isNew: false }]);
      }

      // 4. Fetch Models for the selected brand
      if (listing.make && brandsRes.data) {
        const brand = brandsRes.data.find((b: any) => b.name === listing.make);
        if (brand) {
            const { data: modelsData } = await supabase
                .from('models')
                .select('*')
                .eq('brand_id', brand.id)
                .order('name');
            if (modelsData) setModels(modelsData);
        }
      }

    } catch (error: any) {
      console.error(error);
      showToast('Məlumatları yükləmək mümkün olmadı', 'error');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!listingId) return;
    // Deferred a tick so the loader's state updates never run synchronously in the effect
    const timer = setTimeout(fetchInitialData, 0);
    return () => clearTimeout(timer);
    // fetchInitialData only depends on the id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      showToast(`Ən çox ${MAX_IMAGES} şəkil ola bilər`, 'info');
      return;
    }

    const remainingSlots = MAX_IMAGES - images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 1,
      base64: false,
    });

    if (!result.canceled) {
      setProcessingImages(true);
      try {
        const newImages = await Promise.all(
            result.assets.map(async (asset) => {
                const compressed = await compressImage(asset.uri);
                return {
                    uri: compressed.uri,
                    base64: compressed.base64 || null,
                    isNew: true
                };
            })
        );
        
        setImages(prev => {
            const combined = [...prev, ...newImages];
            if (combined.length > MAX_IMAGES) {
                showToast(`Ən çox ${MAX_IMAGES} şəkil ola bilər`, 'info');
                return combined.slice(0, MAX_IMAGES);
            }
            return combined;
        });
      } catch {
        showToast('Şəkilləri emal edərkən xəta baş verdi', 'error');
      } finally {
        setProcessingImages(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadNewImages = async () => {
    const newImagesToUpload = images.filter(img => img.isNew && img.base64);
    if (newImagesToUpload.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const img of newImagesToUpload) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `listings/${fileName}`;

        const { error } = await supabase.storage
          .from('images')
          .upload(filePath, decode(img.base64!), {
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const handleUpdate = async () => {
    if (!listingId) return;
    setSaving(true);
    try {
      const newUploadedUrls = await uploadNewImages();
      const existingUrls = images.filter(img => !img.isNew).map(img => img.uri);
      const finalImages = [...existingUrls, ...newUploadedUrls];

      const mainImageUrl = finalImages.length > 0 
        ? finalImages[0] 
        : `https://images.unsplash.com/photo-1617788138017-80ad40651399?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80`;

      const { error } = await supabase
        .from('listings')
        .update({
          make,
          model,
          year: parseInt(year) || 2020,
          price: parseFloat(price) || 0,
          mileage: parseInt(mileage) || 0,
          engine,
          location,
          is_credit: isCredit,
          is_barter: isBarter,
          title: `${make} ${model}`,
          body_type: bodyType,
          color,
          gearbox,
          transmission,
          market,
          fuel_type: fuelType,
          is_new: isNew,
          description,
          images: finalImages,
          image_url: mainImageUrl,
          seller_name: sellerName,
          contact_phone: contactPhone,
          vin_code: vinCode.toUpperCase()
        })
        .eq('id', listingId);

      if (error) throw error;

      haptics.success();
      showToast('Elan yeniləndi', 'success');
      router.back();
      
    } catch (error: any) {
      haptics.error();
      showToast('Xəta: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;

  // One picker sheet for every list-backed field
  const pickers: Record<string, { title: string; items: any[]; value: string; set: (item: any) => void }> = {
    brand: {
      title: 'Marka', items: brands, value: make,
      set: async (brand) => {
        setMake(brand.name);
        setModel('');
        const { data } = await supabase.from('models').select('*').eq('brand_id', brand.id).order('name');
        if (data) setModels(data);
      },
    },
    model: { title: 'Model', items: models, value: model, set: (item) => setModel(item.name) },
    bodyType: { title: 'Ban növü', items: bodyTypes, value: bodyType, set: (item) => setBodyType(item.name) },
    color: { title: 'Rəng', items: colorsData, value: color, set: (item) => setColor(item.name) },
    gearbox: { title: 'Sürətlər qutusu', items: gearboxes, value: gearbox, set: (item) => setGearbox(item.name) },
    transmission: { title: 'Ötürücü', items: transmissions, value: transmission, set: (item) => setTransmission(item.name) },
    market: { title: 'Bazar', items: markets, value: market, set: (item) => setMarket(item.name) },
    fuelType: { title: 'Yanacaq', items: fuelTypes, value: fuelType, set: (item) => setFuelType(item.name) },
  };
  const picker = activeModal ? pickers[activeModal] : null;
  const busy = saving || processingImages;

  const toggle = (value: boolean, set: (v: boolean) => void) => (
    <Switch value={value} onValueChange={(v) => { haptics.tap(); set(v); }} trackColor={{ false: colors.fill, true: colors.success }} />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AdminHeader
        title="Elanı redaktə et"
        subtitle={[make, model].filter(Boolean).join(' ')}
        backLabel="Elanlar"
        right={busy ? <ActivityIndicator color={colors.primary} /> : <HeaderAction icon={Save} label="Yadda saxla" onPress={handleUpdate} />}
      />
      <AdminScroll>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>ŞƏKİLLƏR · {images.length}/{MAX_IMAGES}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.images}>
          {images.length < MAX_IMAGES && (
            <TouchableOpacity style={[styles.addImage, { backgroundColor: colors.card, borderColor: colors.hairline }]} onPress={() => { haptics.tap(); pickImage(); }} disabled={processingImages}>
              {processingImages ? <ActivityIndicator color={colors.textSecondary} /> : <Camera size={24} color={colors.primary} />}
              <Text style={[styles.addImageText, { color: colors.primary }]}>{processingImages ? 'Sıxılır' : 'Əlavə et'}</Text>
            </TouchableOpacity>
          )}
          {images.map((img, index) => (
            <View key={img.uri + index} style={[styles.image, { backgroundColor: colors.fill }]}>
              <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} />
              <TouchableOpacity style={styles.removeImage} onPress={() => { haptics.tap(); removeImage(index); }} hitSlop={6} accessibilityLabel="Şəkli sil">
                <X size={13} color="#FFF" strokeWidth={3} />
              </TouchableOpacity>
              {index === 0 && <View style={[styles.imageTag, { backgroundColor: colors.primary }]}><Text style={styles.imageTagText}>Əsas</Text></View>}
              {index !== 0 && img.isNew && <View style={[styles.imageTag, { backgroundColor: 'rgba(0,0,0,0.6)' }]}><Text style={styles.imageTagText}>Yeni</Text></View>}
            </View>
          ))}
        </ScrollView>

        <Group title="Avtomobil">
          <SelectRow label="Marka" value={make} placeholder="Seçin" onPress={() => setActiveModal('brand')} />
          <SelectRow label="Model" value={model} placeholder={make ? 'Seçin' : 'Əvvəlcə marka'} onPress={() => setActiveModal('model')} />
          <FieldRow label="İl" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={4} placeholder="2020" />
          <FieldRow label="Qiymət, ₼" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0" />
          <SelectRow label="Ban növü" value={bodyType} placeholder="Seçin" onPress={() => setActiveModal('bodyType')} />
          <SelectRow label="Rəng" value={color} placeholder="Seçin" onPress={() => setActiveModal('color')} />
        </Group>

        <Group title="Texniki">
          <FieldRow label="Mühərrik, L" value={engine} onChangeText={(t) => setEngine(t.replace(/[^0-9.,]/g, ''))} keyboardType="decimal-pad" placeholder="2.0" />
          <FieldRow label="Yürüş, km" value={mileage} onChangeText={(t) => setMileage(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0" />
          <SelectRow label="Sürətlər qutusu" value={gearbox} placeholder="Seçin" onPress={() => setActiveModal('gearbox')} />
          <SelectRow label="Ötürücü" value={transmission} placeholder="Seçin" onPress={() => setActiveModal('transmission')} />
          <SelectRow label="Yanacaq" value={fuelType} placeholder="Seçin" onPress={() => setActiveModal('fuelType')} />
          <SelectRow label="Bazar" value={market} placeholder="Seçin" onPress={() => setActiveModal('market')} />
          <FieldRow label="VIN" value={vinCode} onChangeText={(t) => setVinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))} autoCapitalize="characters" maxLength={17} placeholder="17 simvol" />
        </Group>

        <Group title="Seçimlər">
          <GroupRow title="Yeni avtomobil" right={toggle(isNew, setIsNew)} />
          <GroupRow title="Kredit mümkündür" right={toggle(isCredit, setIsCredit)} />
          <GroupRow title="Barter mümkündür" right={toggle(isBarter, setIsBarter)} />
        </Group>

        <Group title="Satıcı">
          <FieldRow label="Ad Soyad" value={sellerName} onChangeText={setSellerName} placeholder="Satıcı" />
          <FieldRow label="Telefon" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="+994 …" />
          <FieldRow label="Şəhər" value={location} onChangeText={setLocation} placeholder="Naxçıvan" />
        </Group>

        <Group title="Əlavə məlumat">
          <TextArea value={description} onChangeText={setDescription} placeholder="Satıcının qeydi" />
        </Group>

        <AdminButton title="Yadda saxla" onPress={handleUpdate} loading={busy} />
      </AdminScroll>

      <PickerSheet
        visible={!!picker}
        title={picker?.title || ''}
        options={(picker?.items || []).map((i: any) => ({ label: i.name, value: String(i.id ?? i.name) }))}
        selected={picker ? String(picker.items.find((i: any) => i.name === picker.value)?.id ?? '') : undefined}
        onSelect={(option) => {
          const item = picker?.items.find((i: any) => String(i.id ?? i.name) === option.value);
          if (item) picker?.set(item);
        }}
        onClose={() => setActiveModal(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 13, fontFamily: F.semibold, letterSpacing: 0.4, marginBottom: 8, marginLeft: 16 },
  images: { gap: 10, paddingBottom: 24 },
  addImage: { width: 100, height: 100, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center', gap: 6 },
  addImageText: { fontSize: 13, fontFamily: F.semibold },
  image: { width: 100, height: 100, borderRadius: 14, overflow: 'hidden' },
  removeImage: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  imageTag: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 6, height: 18, borderRadius: 5, justifyContent: 'center' },
  imageTagText: { color: '#FFF', fontSize: 10, fontFamily: F.bold },
});
