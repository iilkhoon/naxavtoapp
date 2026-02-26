import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Image, KeyboardAvoidingView, Platform, DeviceEventEmitter, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Check, X, ChevronDown, CarFront, Hash, Camera, ArrowLeft, ArrowRight, Layers, Calendar, Zap, MapPin, Image as ImageIcon, ListChecks } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { MotiView, AnimatePresence } from 'moti';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compressImage } from '../utils/imageOptimizer';
import { SuccessModal } from '../components/SuccessModal';

const { width } = Dimensions.get('window');
type ListingType = 'car' | 'plate';
interface SelectedImage { uri: string; base64?: string | null; }

const STEPS = [
  { title: 'Marka Seçimi', icon: CarFront },
  { title: 'Model Seçimi', icon: Layers },
  { title: 'Göstəricilər', icon: Calendar },
  { title: 'Mühərrik və Sistem', icon: Zap },
  { title: 'Təchizat', icon: ListChecks },
  { title: 'Yürüş və Məkan', icon: MapPin },
  { title: 'Qiymət və Foto', icon: ImageIcon }
];

const TRANSITION_CONFIG = { type: 'timing', duration: 250 } as const;

export default function AddListingScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [listingType, setListingType] = useState<ListingType>('car');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdShortId, setCreatedShortId] = useState<string | undefined>(undefined);
  const [dbFeatures, setDbFeatures] = useState<any[]>([]);

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [price, setPrice] = useState('');
  const [mileage, setMileage] = useState('');
  const [engine, setEngine] = useState('');
  const [horsepower, setHorsepower] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('+994');
  const [sellerName, setSellerName] = useState('');
  const [vinCode, setVinCode] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [color, setColor] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [transmission, setTransmission] = useState('');
  const [market, setMarket] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isCredit, setIsCredit] = useState(false);
  const [isBarter, setIsBarter] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [plateRegion, setPlateRegion] = useState('');
  const [plateSeries, setPlateSeries] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [platePrice, setPlatePrice] = useState('');
  const [plateDesc, setPlateDesc] = useState('');
  const [plateContact, setPlateContact] = useState('+994');
  const [plateSellerName, setPlateSellerName] = useState('');
  const [plateIsVip, setPlateIsVip] = useState(false);

  const regionRef = useRef<TextInput>(null);
  const seriesRef = useRef<TextInput>(null);
  const numberRef = useRef<TextInput>(null);

  const ImageComponent = Platform.OS === 'web' ? Image : ExpoImage;
  const flagImageProps = Platform.OS === 'web'
    ? { source: { uri: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg' }, resizeMode: 'cover' as const }
    : { source: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg', contentFit: 'cover' as const };

  useEffect(() => { fetchFeatures(); }, []);

  const fetchFeatures = async () => {
    const { data } = await supabase.from('car_features').select('*').order('name');
    if (data) {
      const grouped: Record<string, any[]> = {};
      data.forEach(item => {
        const cat = item.category || 'Digər';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });
      setDbFeatures(Object.keys(grouped).map(key => ({ title: key, items: grouped[key] })));
    }
  };

  const resetForm = () => {
    setCurrentStep(0); setListingType('car'); setCreatedShortId(undefined); setSelectedBrandId(null);
    setMake(''); setModel(''); setYear(''); setPrice(''); setMileage(''); setEngine(''); setHorsepower(''); setLocation('');
    setDescription(''); setContactPhone('+994'); setSellerName(''); setVinCode(''); setBodyType('');
    setColor(''); setGearbox(''); setTransmission(''); setMarket(''); setFuelType(''); setIsNew(false);
    setSelectedImages([]); setIsCredit(false); setIsBarter(false); setSelectedFeatures([]);
    setPlateRegion(''); setPlateSeries(''); setPlateNumber(''); setPlatePrice(''); setPlateDesc('');
    setPlateContact('+994'); setPlateSellerName(''); setPlateIsVip(false);
  };

  const handleEngineBlur = () => {
    if (!engine) return;
    let val = engine.replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (num >= 100) setEngine((num / 1000).toFixed(1));
      else setEngine(num.toFixed(1));
    }
  };

  const openSelection = (type: string, title: string, currentId?: string, extraParams?: object) => {
    const eventName = `select_${type}_${Date.now()}`;
    const subscription = DeviceEventEmitter.addListener(eventName, (item) => {
      switch (type) {
        case 'brand': setMake(item.name); setSelectedBrandId(item.id); setModel(''); setTimeout(() => setCurrentStep(prev => prev + 1), 150); break;
        case 'model': setModel(item.name); setTimeout(() => setCurrentStep(prev => prev + 1), 150); break;
        case 'bodyType': setBodyType(item.name); break;
        case 'color': setColor(item.name); break;
        case 'gearbox': setGearbox(item.name); break;
        case 'transmission': setTransmission(item.name); break;
        case 'market': setMarket(item.name); break;
        case 'fuelType': setFuelType(item.name); break;
        case 'location': setLocation(item.name); break;
      }
      subscription.remove();
    });
    router.push({ pathname: '/select-option', params: { type, title, eventName, selectedId: currentId, extraParams: extraParams ? JSON.stringify(extraParams) : undefined } });
  };

  const toggleFeature = (featureName: string) => {
    if (selectedFeatures.includes(featureName)) setSelectedFeatures(prev => prev.filter(f => f !== featureName));
    else setSelectedFeatures(prev => [...prev, featureName]);
  };

  const pickImage = async () => {
    if (selectedImages.length >= 15) { showToast('Maksimum 15 şəkil yükləyə bilərsiniz.', 'info'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, allowsMultipleSelection: true, selectionLimit: 15 - selectedImages.length, quality: 0.8, base64: false });
    if (!result.canceled) {
      setProcessingImages(true);
      try {
        const processedImages = await Promise.all(result.assets.map(async (asset) => {
          const compressed = await compressImage(asset.uri);
          return { uri: compressed.uri, base64: compressed.base64 || null };
        }));
        setSelectedImages(prev => [...prev, ...processedImages].slice(0, 15));
      } catch (error) { console.error(error); showToast('Şəkilləri emal edərkən xəta baş verdi', 'error'); } finally { setProcessingImages(false); }
    }
  };

  const removeImage = (index: number) => setSelectedImages(prev => prev.filter((_, i) => i !== index));

  const uploadImagesToSupabase = async () => {
    if (selectedImages.length === 0) return [];
    setUploading(true);
    const uploadedUrls: string[] = [];
    try {
      for (const img of selectedImages) {
        if (!img.base64) continue;
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `listings/${fileName}`;
        const { error } = await supabase.storage.from('images').upload(filePath, decode(img.base64), { contentType: 'image/jpeg' });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }
      return uploadedUrls;
    } finally { setUploading(false); }
  };

  const validateStep = () => {
    if (listingType === 'plate') return true;
    switch (currentStep) {
      case 0: if (!make) { showToast('Zəhmət olmasa marka seçin', 'error'); return false; } return true;
      case 1: if (!model) { showToast('Zəhmət olmasa model seçin', 'error'); return false; } return true;
      case 2: if (!year || !bodyType || !color) { showToast('Zəhmət olmasa il, ban növü və rəngi seçin', 'error'); return false; } return true;
      case 3: if (!engine || !horsepower || !fuelType || !gearbox) { showToast('Zəhmət olmasa mühərrik məlumatlarını doldurun', 'error'); return false; } return true;
      case 4: return true;
      case 5: if (!mileage || !location) { showToast('Zəhmət olmasa yürüş və regionu qeyd edin', 'error'); return false; } return true;
      case 6: if (selectedImages.length === 0) { showToast('Ən azı 1 şəkil yükləmək mütləqdir', 'error'); return false; } if (!price || !sellerName || !contactPhone) { showToast('Zəhmət olmasa qiymət və əlaqə məlumatlarını doldurun', 'error'); return false; } return true;
      default: return true;
    }
  };

  const handleNextStep = () => { if (validateStep()) setCurrentStep(prev => prev + 1); };
  const handlePrevStep = () => setCurrentStep(prev => prev - 1);
  const handleExit = () => router.back();

  const handleSubmit = async () => {
    if (listingType === 'car') { if (!validateStep()) return; await submitCarListing(); } else { await submitPlateListing(); }
  };

  const submitCarListing = async () => {
    setLoading(true);
    try {
      let uploadedImageUrls: string[] = [];
      if (selectedImages.length > 0) uploadedImageUrls = await uploadImagesToSupabase();
      const mainImageUrl = uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null;
      const status = user ? 'approved' : 'pending';
      const { data, error } = await supabase.from('listings').insert({
        make, model, year: parseInt(year) || 2020, price: parseFloat(price) || 0, mileage: parseInt(mileage) || 0, engine: engine || '2.0', horsepower: parseInt(horsepower) || null, location, image_url: mainImageUrl, images: uploadedImageUrls, is_credit: isCredit, is_barter: isBarter, title: `${make} ${model}`, currency: 'AZN', body_type: bodyType, color, gearbox, transmission, market, fuel_type: fuelType, is_new: isNew, description: description || '', contact_phone: contactPhone || '+994', seller_name: sellerName, vin_code: vinCode.toUpperCase(), status, features: selectedFeatures
      }).select().single();
      if (error) throw error;
      if (data && data.short_id) setCreatedShortId(data.short_id);
      setShowSuccessModal(true);
    } catch (error: any) { console.error(error); showToast('Elan göndərmək mümkün olmadı: ' + error.message, 'error'); } finally { setLoading(false); }
  };

  const submitPlateListing = async () => {
    if (!plateRegion || !plateSeries || !plateNumber || !platePrice || !plateContact || !plateSellerName) { showToast('Zəhmət olmasa bütün sahələri doldurun', 'error'); return; }
    setLoading(true);
    try {
      const status = user ? 'approved' : 'pending';
      const { data, error } = await supabase.from('plates').insert({
        region: plateRegion, series: plateSeries.toUpperCase(), number: plateNumber, price: parseFloat(platePrice) || 0, description: plateDesc || '', is_vip: plateIsVip, contact_phone: plateContact || '+994', seller_name: plateSellerName, status
      }).select().single();
      if (error) throw error;
      if (data && data.short_id) setCreatedShortId(data.short_id);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error(error);
      if (error.code === '23505') {
        showToast('Bu nömrə artıq sistemdə mövcuddur!', 'error');
      } else {
        showToast('Elan göndərmək mümkün olmadı: ' + error.message, 'error');
      }
    } finally { setLoading(false); }
  };

  const handleSuccessClose = () => { setShowSuccessModal(false); resetForm(); handleExit(); };

  const renderCompactSelector = (label: string, value: string, placeholder: string, type: string, extra?: object) => (
    <View style={styles.compactFormGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { if (type === 'model' && !selectedBrandId) { showToast('Əvvəlcə marka seçin', 'info'); return; } openSelection(type, label, value, extra); }}>
        <Text style={[value ? styles.selectorText : styles.placeholderText, { color: value ? colors.text : colors.placeholder }]} numberOfLines={1}>{value || placeholder}</Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const Container = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const containerProps = Platform.OS === 'ios' ? { behavior: 'padding' as const, style: { flex: 1 } } : { style: { flex: 1 } };
  const totalSteps = STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const CurrentStepIcon = listingType === 'car' ? STEPS[currentStep].icon : Hash;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Container {...containerProps}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
          <TouchableOpacity onPress={() => currentStep > 0 ? handlePrevStep() : handleExit()} style={styles.backButton}>
            {currentStep > 0 ? <ArrowLeft size={24} color={colors.text} /> : <X size={24} color={colors.text} />}
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <MotiView key={currentStep} from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={TRANSITION_CONFIG} style={styles.stepIndicator}>
              <CurrentStepIcon size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>{listingType === 'car' ? STEPS[currentStep].title : 'Yeni Nömrə'}</Text>
            </MotiView>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {listingType === 'car' && (
          <View style={styles.progressBarContainer}><MotiView animate={{ width: `${progress}%` }} transition={{ type: 'timing', duration: 300 }} style={[styles.progressBar, { backgroundColor: colors.primary }]} /></View>
        )}

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {currentStep === 0 && (
            <View style={[styles.typeSelectorContainer, { backgroundColor: colors.card }]}>
              <TouchableOpacity style={[styles.typeButton, listingType === 'car' && { backgroundColor: colors.primary }]} onPress={() => setListingType('car')}>
                <CarFront size={18} color={listingType === 'car' ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.typeButtonText, listingType === 'car' ? { color: '#FFF' } : { color: colors.textSecondary }]}>Avtomobil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeButton, listingType === 'plate' && { backgroundColor: colors.primary }]} onPress={() => setListingType('plate')}>
                <Hash size={18} color={listingType === 'plate' ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.typeButtonText, listingType === 'plate' ? { color: '#FFF' } : { color: colors.textSecondary }]}>Nömrə</Text>
              </TouchableOpacity>
            </View>
          )}

          {listingType === 'car' ? (
            <AnimatePresence exitBeforeEnter>
              {currentStep === 0 && (
                <MotiView key="step0" from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} exit={{ opacity: 0, translateX: -20 }} transition={TRANSITION_CONFIG}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Marka seçin</Text>
                  <TouchableOpacity style={[styles.bigSelector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openSelection('brand', 'Marka Seçin', make)}>
                    <Text style={[styles.bigSelectorText, { color: make ? colors.text : colors.placeholder }]}>{make || 'Marka Seçin'}</Text>
                    <ChevronDown size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </MotiView>
              )}
              {currentStep === 1 && (
                <MotiView key="step1" from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} exit={{ opacity: 0, translateX: -20 }} transition={TRANSITION_CONFIG}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{make} Modeli</Text>
                  <TouchableOpacity style={[styles.bigSelector, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openSelection('model', 'Model Seçin', model, { brand_id: selectedBrandId })}>
                    <Text style={[styles.bigSelectorText, { color: model ? colors.text : colors.placeholder }]}>{model || 'Model Seçin'}</Text>
                    <ChevronDown size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </MotiView>
              )}
              {currentStep === 2 && (
                <MotiView key="step2" from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} exit={{ opacity: 0, translateX: -20 }} transition={TRANSITION_CONFIG}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Göstəricilər</Text>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Buraxılış İli</Text>
                    <TextInput style={[styles.bigInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="2023" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={year} onChangeText={(text) => setYear(text.replace(/[^0-9]/g, ''))} maxLength={4} />
                  </View>
                  {renderCompactSelector('Ban növü', bodyType, 'Seçin', 'bodyType')}
                  {renderCompactSelector('Rəng', color, 'Seçin', 'color')}
                </MotiView>
              )}
              {currentStep === 3 && (
                <MotiView key="step3" from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} exit={{ opacity: 0, translateX: -20 }} transition={TRANSITION_CONFIG}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Mühərrik</Text>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Mühərrik Həcmi (L)</Text>
                    <TextInput style={[styles.bigInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="2.0" placeholderTextColor={colors.placeholder} value={engine} onChangeText={(text) => setEngine(text.replace(/[^0-9.,]/g, ''))} onBlur={handleEngineBlur} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.compactFormGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>At gücü (a.g.)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="At gücü (məsələn: 200)" placeholderTextColor={colors.placeholder} value={horsepower} onChangeText={(text) => setHorsepower(text.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={4} />
                  </View>
                  {renderCompactSelector('Yanacaq növü', fuelType, 'Seçin', 'fuelType')}
                  {renderCompactSelector('Sürətlər qutusu', gearbox, 'Seçin', 'gearbox')}
                  {renderCompactSelector('Ötürücü', transmission, 'Seçin', 'transmission')}
                </MotiView>
              )}
              {currentStep === 4 && (
                <MotiView key="step4_features" from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} exit={{ opacity: 0, translateX: -20 }} transition={TRANSITION_CONFIG}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Komplektasiya</Text>
                  {dbFeatures.length > 0 ? (
                    dbFeatures.map((category) => (
                      <View key={category.title} style={styles.featureCategory}>
                        <Text style={[styles.featureCategoryTitle, { color: colors.textSecondary }]}>{category.title}</Text>
                        <View style={styles.featureList}>
                          {category.items.map((item: any) => {
                            const isSelected = selectedFeatures.includes(item.name);
                            return (
                              <TouchableOpacity key={item.id} style={[styles.featureItem, { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border }]} onPress={() => toggleFeature(item.name)}>
                                <Text style={[styles.featureText, { color: colors.text }]}>{item.name}</Text>
                                <View style={[styles.checkboxSquare, { borderColor: isSelected ? colors.primary : colors.textSecondary }, isSelected && { backgroundColor: colors.primary }]}>{isSelected && <Check size={12} color="#FFF" />}</View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textSecondary, marginTop: 10 }}>Yüklənir...</Text></View>
                  )}
                </MotiView>
              )}
              {currentStep === 5 && (
                <MotiView key="step5" from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} exit={{ opacity: 0, translateX: -20 }} transition={TRANSITION_CONFIG}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Yürüş və Məkan</Text>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Yürüş (km)</Text>
                    <TextInput style={[styles.bigInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={mileage} onChangeText={(text) => setMileage(text.replace(/[^0-9]/g, ''))} />
                  </View>
                  {renderCompactSelector('Region', location, 'Şəhər/Rayon seçin', 'location')}
                  <View style={[styles.togglesContainer, { backgroundColor: colors.card, marginTop: 20 }]}>
                    <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}><Text style={[styles.toggleLabel, { color: colors.text }]}>Avtomobil yenidir?</Text><Switch value={isNew} onValueChange={setIsNew} trackColor={{ false: '#333', true: colors.primary }} /></View>
                  </View>
                </MotiView>
              )}
              {currentStep === 6 && (
                <MotiView key="step6" from={{ opacity: 0, translateX: 20 }} animate={{ opacity: 1, translateX: 0 }} exit={{ opacity: 0, translateX: -20 }} transition={TRANSITION_CONFIG}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Qiymət və Foto</Text>
                  <View style={styles.imageSection}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Şəkillər (Məcburi)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
                      {selectedImages.length < 15 && (
                        <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage} disabled={processingImages}>
                          {processingImages ? <ActivityIndicator color={colors.primary} size="small" /> : <Camera size={24} color={colors.placeholder} />}
                          <Text style={[styles.addImageText, { color: colors.placeholder }]}>{processingImages ? '...' : 'Əlavə et'}</Text>
                        </TouchableOpacity>
                      )}
                      {selectedImages.map((img, index) => (
                        <View key={index} style={[styles.imagePreviewContainer, { borderColor: colors.border }]}>
                          <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                          <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}><X size={12} color="#FFF" /></TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text>
                    <TextInput style={[styles.bigInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={price} onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))} />
                  </View>
                  <View style={[styles.togglesContainer, { backgroundColor: colors.card, marginBottom: 20 }]}>
                    <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}><Text style={[styles.toggleLabel, { color: colors.text }]}>Kreditlə mümkündür?</Text><Switch value={isCredit} onValueChange={setIsCredit} trackColor={{ false: '#333', true: colors.primary }} /></View>
                    <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}><Text style={[styles.toggleLabel, { color: colors.text }]}>Barter mümkündür?</Text><Switch value={isBarter} onValueChange={setIsBarter} trackColor={{ false: '#333', true: colors.primary }} /></View>
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.compactFormGroup, { flex: 1, marginRight: 8 }]}><Text style={[styles.label, { color: colors.textSecondary }]}>Ad Soyad</Text><TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Ad Soyad" placeholderTextColor={colors.placeholder} value={sellerName} onChangeText={setSellerName} /></View>
                    <View style={[styles.compactFormGroup, { flex: 1 }]}><Text style={[styles.label, { color: colors.textSecondary }]}>Əlaqə</Text><TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="+994" placeholderTextColor={colors.placeholder} keyboardType="phone-pad" value={contactPhone} onChangeText={setContactPhone} /></View>
                  </View>
                  <View style={styles.compactFormGroup}><Text style={[styles.label, { color: colors.textSecondary }]}>VIN Kod (İstəyə bağlı)</Text><TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="VIN" placeholderTextColor={colors.placeholder} value={vinCode} onChangeText={(text) => setVinCode(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))} autoCapitalize="characters" maxLength={17} /></View>
                  <View style={styles.compactFormGroup}><Text style={[styles.label, { color: colors.textSecondary }]}>Əlavə məlumat</Text><TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Qeydlər..." placeholderTextColor={colors.placeholder} value={description} onChangeText={setDescription} multiline textAlignVertical="top" scrollEnabled={true} /></View>
                </MotiView>
              )}
            </AnimatePresence>
          ) : (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={TRANSITION_CONFIG}>
              <View style={styles.section}>
                <View style={styles.plateInputContainer}>
                  <View style={styles.plateFrame}>
                    <View style={styles.leftSection}><ImageComponent style={styles.flag} {...flagImageProps} /><Text style={styles.azText}>AZ</Text></View>
                    <View style={styles.plateInputs}>
                      <TextInput ref={regionRef} style={styles.plateInputRegion} placeholder="90" placeholderTextColor="#CCC" maxLength={2} keyboardType="number-pad" value={plateRegion} onChangeText={(t) => { const txt = t.replace(/[^0-9]/g, ''); setPlateRegion(txt); if (txt.length === 2) seriesRef.current?.focus(); }} />
                      <View style={styles.plateDash} />
                      <TextInput ref={seriesRef} style={styles.plateInputSeries} placeholder="AA" placeholderTextColor="#CCC" maxLength={2} autoCapitalize="characters" value={plateSeries} onChangeText={(t) => { setPlateSeries(t.toUpperCase()); if (t.length === 2) numberRef.current?.focus(); }} />
                      <View style={styles.plateDash} />
                      <TextInput ref={numberRef} style={styles.plateInputNumber} placeholder="000" placeholderTextColor="#CCC" maxLength={3} keyboardType="number-pad" value={plateNumber} onChangeText={(t) => setPlateNumber(t.replace(/[^0-9]/g, ''))} />
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={[styles.compactFormGroup, { flex: 1, marginRight: 8 }]}><Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text><TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.placeholder} keyboardType="number-pad" value={platePrice} onChangeText={(t) => setPlatePrice(t.replace(/[^0-9]/g, ''))} /></View>
                  <View style={[styles.compactFormGroup, { flex: 1 }]}><Text style={[styles.label, { color: colors.textSecondary }]}>Ad Soyad</Text><TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Ad Soyad" placeholderTextColor={colors.placeholder} value={plateSellerName} onChangeText={setPlateSellerName} /></View>
                </View>
                <View style={styles.compactFormGroup}><Text style={[styles.label, { color: colors.textSecondary }]}>Əlaqə nömrəsi</Text><TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="+994" placeholderTextColor={colors.placeholder} keyboardType="phone-pad" value={plateContact} onChangeText={setPlateContact} /></View>
                <View style={styles.compactFormGroup}><Text style={[styles.label, { color: colors.textSecondary }]}>Qeydlər</Text><TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Əlavə məlumat..." placeholderTextColor={colors.placeholder} value={plateDesc} onChangeText={setPlateDesc} multiline textAlignVertical="top" scrollEnabled={true} /></View>
                <View style={[styles.togglesContainer, { backgroundColor: colors.card }]}>
                  <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}><Text style={[styles.toggleLabel, { color: colors.text }]}>VIP Nömrə?</Text><Switch value={plateIsVip} onValueChange={setPlateIsVip} trackColor={{ false: '#333', true: '#FFD700' }} /></View>
                </View>
              </View>
            </MotiView>
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
          {listingType === 'car' ? (
            <>
              {currentStep > 0 && (<TouchableOpacity style={[styles.navButton, styles.prevButton, { borderColor: colors.border }]} onPress={handlePrevStep}><ArrowLeft size={20} color={colors.text} /></TouchableOpacity>)}
              {currentStep < 6 ? (<TouchableOpacity style={[styles.navButton, styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleNextStep}><Text style={styles.nextButtonText}>Növbəti</Text><ArrowRight size={20} color="#FFF" /></TouchableOpacity>) : (<TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }, (loading || uploading) && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading || uploading}>{loading || uploading ? <ActivityIndicator color="#FFF" /> : <><Check size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Elanı Paylaş</Text></>}</TouchableOpacity>)}
            </>
          ) : (
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <><Check size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={styles.submitButtonText}>Elanı Yerləşdir</Text></>}</TouchableOpacity>
          )}
        </View>
      </Container>
      <SuccessModal visible={showSuccessModal} onClose={handleSuccessClose} message="Elanınız uğurla göndərildi. Yaxın zamanda sizinlə əlaqə saxlanılacaq." shortId={createdShortId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 4 },
  progressBarContainer: { height: 3, backgroundColor: 'rgba(0,0,0,0.05)', width: '100%' },
  progressBar: { height: '100%' },
  content: { padding: 20 },
  typeSelectorContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  typeButtonText: { fontFamily: 'RethinkSans_600SemiBold', fontSize: 13 },
  stepTitle: { fontSize: 22, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 20, marginTop: 10 },
  bigSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  bigSelectorText: { fontSize: 18, fontFamily: 'RethinkSans_600SemiBold' },
  bigInput: { fontSize: 24, fontFamily: 'RethinkSans_700Bold', padding: 16, borderRadius: 16, borderWidth: 1 },
  formGroup: { marginBottom: 20 },
  compactFormGroup: { marginBottom: 12 },
  label: { marginBottom: 8, fontSize: 14, fontFamily: 'RethinkSans_600SemiBold' },
  input: { padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, fontFamily: 'RethinkSans_500Medium' },
  selector: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectorText: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  placeholderText: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  row: { flexDirection: 'row' },
  textArea: { height: 120, paddingVertical: 12 },
  togglesContainer: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  toggleLabel: { fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  imageSection: { marginBottom: 24 },
  imageList: { flexDirection: 'row', marginTop: 8 },
  addImageButton: { width: 90, height: 90, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  addImageText: { fontSize: 11, marginTop: 4, fontFamily: 'RethinkSans_500Medium' },
  imagePreviewContainer: { width: 90, height: 90, marginRight: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  imagePreview: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 20, borderTopWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center', position: 'absolute', bottom: 0, left: 0, right: 0, boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.05)', elevation: 5 },
  navButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  prevButton: { width: 56, borderWidth: 1 },
  nextButton: { flex: 1, gap: 8 },
  nextButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  submitButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 56, borderRadius: 16 },
  submitButtonText: { color: '#FFF', fontFamily: 'RethinkSans_700Bold', fontSize: 16 },
  section: { marginBottom: 20 },
  plateInputContainer: { marginBottom: 20 },
  plateFrame: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 4, borderColor: '#000', height: 64, flexDirection: 'row', overflow: 'hidden' },
  leftSection: { width: 50, height: '100%', borderRightWidth: 1, borderRightColor: '#E0E0E0', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  flag: { width: 36, height: 24, borderRadius: 2 },
  azText: { fontSize: 16, fontWeight: '900', color: '#000' },
  plateInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  plateInputRegion: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', width: 40, padding: 0 },
  plateInputSeries: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', width: 50, padding: 0 },
  plateInputNumber: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', width: 60, padding: 0 },
  plateDash: { width: 8, height: 5, backgroundColor: '#000', borderRadius: 2, marginHorizontal: 4 },
  featureCategory: { marginBottom: 24 },
  featureCategoryTitle: { fontSize: 14, fontFamily: 'RethinkSans_700Bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  featureList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, width: '48%' },
  featureText: { fontSize: 13, fontFamily: 'RethinkSans_500Medium', flex: 1 },
  checkboxSquare: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', padding: 20 },
});
