import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, X, ChevronDown, Camera } from 'lucide-react-native';
import { SelectionModal } from '../../../components/SelectionModal';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useToast } from '../../../contexts/ToastContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { compressImage } from '../../../utils/imageOptimizer';

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
  const { colors, isDark } = useTheme();
  
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

  useEffect(() => {
    if (listingId) {
        fetchInitialData();
    }
  }, [listingId]);

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

  const pickImage = async () => {
    if (images.length >= 6) {
      showToast('Maksimum 6 şəkil yükləyə bilərsiniz', 'info');
      return;
    }

    const remainingSlots = 6 - images.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
            if (combined.length > 6) {
                showToast('Maksimum 6 şəkil seçilə bilər', 'info');
                return combined.slice(0, 6);
            }
            return combined;
        });
      } catch (e) {
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

      showToast('Elan uğurla yeniləndi', 'success');
      router.back();
      
    } catch (error: any) {
      showToast('Xəta: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderSelector = (label: string, value: string, placeholder: string, modalKey: string) => (
    <View style={styles.formGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity 
        style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} 
        onPress={() => setActiveModal(modalKey)}
      >
        <Text style={[value ? styles.selectorText : styles.placeholderText, { color: value ? colors.text : colors.placeholder }]}>
          {value || placeholder}
        </Text>
        <ChevronDown size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Elanı Redaktə Et</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={saving || processingImages}>
             {saving || processingImages ? <ActivityIndicator color={colors.primary} /> : <Save size={24} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Şəkillər</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
                    {images.length < 6 && (
                        <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage} disabled={processingImages}>
                            {processingImages ? <ActivityIndicator color={colors.primary} size="small" /> : <Camera size={28} color={colors.textSecondary} />}
                            <Text style={[styles.addImageText, { color: colors.textSecondary }]}>{processingImages ? 'Sıxılır...' : 'Əlavə et'}</Text>
                        </TouchableOpacity>
                    )}

                    {images.map((img, index) => (
                        <View key={index} style={[styles.imagePreviewContainer, { borderColor: colors.border }]}>
                            <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                            <TouchableOpacity 
                                style={styles.removeImageButton} 
                                onPress={() => removeImage(index)}
                            >
                                <X size={14} color="#FFF" />
                            </TouchableOpacity>
                            {index === 0 && (
                                <View style={[styles.mainImageBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.mainImageText}>Əsas</Text>
                                </View>
                            )}
                            {img.isNew && (
                                <View style={styles.newImageBadge}>
                                    <Text style={styles.mainImageText}>Yeni</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Əsas Məlumatlar</Text>
                
                {renderSelector('Marka', make, 'Marka seçin', 'brand')}
                {renderSelector('Model', model, 'Model seçin', 'model')}
                {renderSelector('Ban növü', bodyType, 'Ban növü seçin', 'bodyType')}
                
                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>İl</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                            keyboardType="number-pad"
                            value={year}
                            onChangeText={(text) => setYear(text.replace(/[^0-9]/g, ''))}
                            maxLength={4}
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Rəng</Text>
                        <TouchableOpacity 
                            style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} 
                            onPress={() => setActiveModal('color')}
                        >
                            <Text style={[color ? styles.selectorText : styles.placeholderText, { color: color ? colors.text : colors.placeholder }]} numberOfLines={1}>
                            {color || 'Seçin'}
                            </Text>
                            <ChevronDown size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        keyboardType="number-pad"
                        value={price}
                        onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Satıcı Məlumatları</Text>
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Ad Soyad</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        value={sellerName}
                        onChangeText={setSellerName}
                    />
                </View>
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Əlaqə Nömrəsi</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        value={contactPhone}
                        onChangeText={setContactPhone}
                        keyboardType="phone-pad"
                        placeholder="+994..."
                        placeholderTextColor={colors.placeholder}
                    />
                </View>
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>VIN Kod</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        value={vinCode}
                        onChangeText={(text) => setVinCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        autoCapitalize="characters"
                        maxLength={17} 
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Texniki Göstəricilər</Text>
                
                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Mühərrik (L)</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                            value={engine}
                            onChangeText={(text) => setEngine(text.replace(/[^0-9.,]/g, ''))}
                            keyboardType="decimal-pad"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Yürüş (km)</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                            keyboardType="number-pad"
                            value={mileage}
                            onChangeText={(text) => setMileage(text.replace(/[^0-9]/g, ''))}
                        />
                    </View>
                </View>

                {renderSelector('Sürətlər qutusu', gearbox, 'Seçin', 'gearbox')}
                {renderSelector('Ötürücü', transmission, 'Seçin', 'transmission')}
                {renderSelector('Bazar', market, 'Seçin', 'market')}
                {renderSelector('Yanacaq', fuelType, 'Seçin', 'fuelType')}
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Əlavə</Text>
                
                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Şəhər</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        value={location}
                        onChangeText={setLocation}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Əlavə məlumat</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <View style={[styles.togglesContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Yeni avtomobildir?</Text>
                        <Switch 
                            value={isNew} 
                            onValueChange={setIsNew}
                            trackColor={{ false: '#333', true: colors.primary }}
                        />
                    </View>
                    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Kredit var?</Text>
                        <Switch 
                            value={isCredit} 
                            onValueChange={setIsCredit}
                            trackColor={{ false: '#333', true: colors.primary }}
                        />
                    </View>
                    <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>Barter var?</Text>
                        <Switch 
                            value={isBarter} 
                            onValueChange={setIsBarter}
                            trackColor={{ false: '#333', true: colors.primary }}
                        />
                    </View>
                </View>
            </View>

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
                <Save size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Yadda Saxla</Text>
            </TouchableOpacity>

        </ScrollView>

        {/* Modals */}
        <SelectionModal visible={activeModal === 'brand'} onClose={() => setActiveModal(null)} title="Marka Seçin" items={brands} onSelect={async (brand) => { setMake(brand.name); setModel(''); const { data } = await supabase.from('models').select('*').eq('brand_id', brand.id).order('name'); if (data) setModels(data); }} selectedId={make} />
        <SelectionModal visible={activeModal === 'model'} onClose={() => setActiveModal(null)} title="Model Seçin" items={models} onSelect={(item) => setModel(item.name)} selectedId={model} />
        <SelectionModal visible={activeModal === 'bodyType'} onClose={() => setActiveModal(null)} title="Ban növü" items={bodyTypes} onSelect={(item) => setBodyType(item.name)} selectedId={bodyType} />
        <SelectionModal visible={activeModal === 'color'} onClose={() => setActiveModal(null)} title="Rəng" items={colorsData} onSelect={(item) => setColor(item.name)} selectedId={color} />
        <SelectionModal visible={activeModal === 'gearbox'} onClose={() => setActiveModal(null)} title="Sürətlər qutusu" items={gearboxes} onSelect={(item) => setGearbox(item.name)} selectedId={gearbox} />
        <SelectionModal visible={activeModal === 'transmission'} onClose={() => setActiveModal(null)} title="Ötürücü" items={transmissions} onSelect={(item) => setTransmission(item.name)} selectedId={transmission} />
        <SelectionModal visible={activeModal === 'market'} onClose={() => setActiveModal(null)} title="Bazar" items={markets} onSelect={(item) => setMarket(item.name)} selectedId={market} />
        <SelectionModal visible={activeModal === 'fuelType'} onClose={() => setActiveModal(null)} title="Yanacaq" items={fuelTypes} onSelect={(item) => setFuelType(item.name)} selectedId={fuelType} />

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 4 },
  content: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 14 },
  input: { padding: 16, borderRadius: 16, fontSize: 16, borderWidth: 1 },
  textArea: { minHeight: 100 },
  selector: { padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorText: { fontSize: 16 },
  placeholderText: { fontSize: 16 },
  row: { flexDirection: 'row' },
  togglesContainer: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  toggleLabel: { fontSize: 16 },
  submitButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 30, marginTop: 10, marginBottom: 40 },
  submitButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  imageList: { flexDirection: 'row' },
  addImageButton: { width: 100, height: 100, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addImageText: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  imagePreviewContainer: { width: 100, height: 100, marginRight: 12, position: 'relative', borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  imagePreview: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mainImageBadge: { position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newImageBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: '#4CD964', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  mainImageText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
});
