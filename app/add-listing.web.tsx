import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Switch, ActivityIndicator, Image, useWindowDimensions
} from 'react-native';
import {
    Check, X, ChevronDown, Camera, ArrowLeft, ArrowRight,
    Car, Hash, Zap, MapPin, Image as ImageIcon, ListChecks,
    Calendar, Layers, Upload
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { WebFooter } from '../components/WebFooter.web';
import { SuccessModal } from '../components/SuccessModal';

type ListingType = 'car' | 'plate';

const STEPS = [
    { title: 'Növ Seçimi', icon: Car },
    { title: 'Marka / Model', icon: Layers },
    { title: 'Göstəricilər', icon: Calendar },
    { title: 'Mühərrik', icon: Zap },
    { title: 'Komplektasiya', icon: ListChecks },
    { title: 'Yürüş / Məkan', icon: MapPin },
    { title: 'Qiymət / Foto', icon: ImageIcon },
];

interface Brand { id: string; name: string; }
interface Model { id: string; name: string; brand_id: string; }

const OPTIONS = {
    bodyType: ['Sedan', 'Hetçbek', 'Universal', 'SUV', 'MPV', 'Pikap', 'Kupé', 'Kabriolet', 'Mikroavtobus', 'Furgon'],
    color: ['Ağ', 'Qara', 'Gümüşü', 'Boz', 'Mavi', 'Qırmızı', 'Yaşıl', 'Sarı', 'Narıncı', 'Bənövşəyi', 'Qəhvəyi', 'Bej'],
    gearbox: ['Mexaniki', 'Avtomat', 'Yarım-avtomat', 'Robot', 'Variator'],
    transmission: ['Ön', 'Arxa', 'Tam'],
    market: ['Azərbaycan', 'Avropa', 'Amerika', 'Yaponiya', 'Gürcüstan', 'Rusiya', 'Koreyalı'],
    fuelType: ['Benzin', 'Dizel', 'Qaz (LPG)', 'Elektrik', 'Hibrid', 'Plug-in Hibrid', 'CNG'],
    location: ['Bakı', 'Naxçıvan', 'Gəncə', 'Sumqayıt', 'Mingəçevir', 'Nakhchivan MR', 'Şirvan', 'Lənkəran'],
};

const Dropdown = ({ label, value, options, onChange, colors }: any) => {
    const [open, setOpen] = useState(false);
    return (
        <View style={{ zIndex: open ? 10 : 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
            <TouchableOpacity
                style={[styles.dropField, { backgroundColor: colors.card, borderColor: open ? colors.primary : colors.border }]}
                onPress={() => setOpen(v => !v)}
            >
                <Text style={[styles.dropFieldText, { color: value ? colors.text : colors.textSecondary }]}>
                    {value || 'Seçin...'}
                </Text>
                <ChevronDown size={16} color={colors.textSecondary} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>
            {open && (
                <View style={[styles.dropMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {options.map((opt: string) => (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.dropItem, value === opt && { backgroundColor: colors.primary + '15' }]}
                            onPress={() => { onChange(opt); setOpen(false); }}
                        >
                            <Text style={[styles.dropItemText, { color: value === opt ? colors.primary : colors.text }]}>{opt}</Text>
                            {value === opt && <Check size={14} color={colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

export default function WebAddListingScreen() {
    const router = useRouter();
    const { showToast } = useToast();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [listingType, setListingType] = useState<ListingType>('car');
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdShortId, setCreatedShortId] = useState<string>();

    // Car form state
    const [brands, setBrands] = useState<Brand[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [dbFeatures, setDbFeatures] = useState<any[]>([]);
    const [brandSearch, setBrandSearch] = useState('');
    const [modelSearch, setModelSearch] = useState('');
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
    const [isCredit, setIsCredit] = useState(false);
    const [isBarter, setIsBarter] = useState(false);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<{ uri: string; file: File }[]>([]);

    // Plate state
    const [plateRegion, setPlateRegion] = useState('');
    const [plateSeries, setPlateSeries] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [platePrice, setPlatePrice] = useState('');
    const [plateDesc, setPlateDesc] = useState('');
    const [plateContact, setPlateContact] = useState('+994');
    const [plateSellerName, setPlateSellerName] = useState('');

    const fileInputRef = useRef<any>(null);

    useEffect(() => {
        supabase.from('brands').select('*').order('name').then(({ data }) => { if (data) setBrands(data); });
        supabase.from('car_features').select('*').order('name').then(({ data }) => {
            if (data) {
                const grouped: Record<string, any[]> = {};
                data.forEach((item: any) => {
                    const cat = item.category || 'Digər';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(item);
                });
                setDbFeatures(Object.keys(grouped).map(k => ({ title: k, items: grouped[k] })));
            }
        });
    }, []);

    useEffect(() => {
        if (selectedBrandId) {
            supabase.from('models').select('*').eq('brand_id', selectedBrandId).order('name').then(({ data }) => { if (data) setModels(data); });
        }
    }, [selectedBrandId]);

    const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()));
    const filteredModels = models.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()));

    const pickImages = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        input.onchange = (e: any) => {
            const files: File[] = Array.from(e.target.files || []);
            const newImgs = files.slice(0, 15 - selectedImages.length).map(f => ({ uri: URL.createObjectURL(f), file: f }));
            setSelectedImages(prev => [...prev, ...newImgs].slice(0, 15));
        };
        input.click();
    };

    const uploadImages = async (): Promise<string[]> => {
        const urls: string[] = [];
        setUploading(true);
        try {
            for (const img of selectedImages) {
                const fname = `${Date.now()}_${Math.random().toString(36).slice(7)}.jpg`;
                const { error } = await supabase.storage.from('images').upload(`listings/${fname}`, img.file, { contentType: img.file.type });
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`listings/${fname}`);
                urls.push(publicUrl);
            }
        } finally { setUploading(false); }
        return urls;
    };

    const validate = () => {
        if (listingType === 'plate') {
            if (!plateRegion || !plateSeries || !plateNumber || !platePrice || !plateContact || !plateSellerName) {
                showToast('Bütün sahələri doldurun', 'error'); return false;
            }
            return true;
        }
        switch (step) {
            case 1: if (!make) { showToast('Marka seçin', 'error'); return false; } if (!model) { showToast('Model seçin', 'error'); return false; } return true;
            case 2: if (!year || !bodyType || !color) { showToast('İl, ban növü və rəngi seçin', 'error'); return false; } return true;
            case 3: if (!engine || !horsepower || !fuelType || !gearbox) { showToast('Mühərrik məlumatlarını doldurun', 'error'); return false; } return true;
            case 5: if (!mileage || !location) { showToast('Yürüş və regionu doldurun', 'error'); return false; } return true;
            case 6:
                if (selectedImages.length === 0) { showToast('Ən azı 1 şəkil seçin', 'error'); return false; }
                if (!price || !sellerName || !contactPhone) { showToast('Qiymət, ad və əlaqəni doldurun', 'error'); return false; }
                return true;
            default: return true;
        }
    };

    const submit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            if (listingType === 'plate') {
                const status = user ? 'approved' : 'pending';
                const { data, error } = await supabase.from('plates').insert({
                    region: plateRegion, series: plateSeries.toUpperCase(), number: plateNumber,
                    price: parseFloat(platePrice) || 0, description: plateDesc, contact_phone: plateContact,
                    seller_name: plateSellerName, status
                }).select().single();
                if (error) throw error;
                if (data?.short_id) setCreatedShortId(data.short_id);
            } else {
                const urls = await uploadImages();
                const status = user ? 'approved' : 'pending';
                const { data, error } = await supabase.from('listings').insert({
                    make, model, year: parseInt(year) || 2020, price: parseFloat(price) || 0,
                    mileage: parseInt(mileage) || 0, engine: engine || '2.0', horsepower: parseInt(horsepower) || null, location,
                    image_url: urls[0] || null, images: urls, is_credit: isCredit, is_barter: isBarter,
                    title: `${make} ${model}`, currency: 'AZN', body_type: bodyType, color, gearbox,
                    transmission, market, fuel_type: fuelType, is_new: isNew, description,
                    contact_phone: contactPhone, seller_name: sellerName, vin_code: vinCode.toUpperCase(),
                    status, features: selectedFeatures
                }).select().single();
                if (error) throw error;
                if (data?.short_id) setCreatedShortId(data.short_id);
            }
            setShowSuccess(true);
        } catch (err: any) {
            console.error(err);
            if (err.code === '23505') {
                showToast('Bu nömrə artıq sistemdə mövcuddur!', 'error');
            } else {
                showToast('Xəta: ' + err.message, 'error');
            }
        } finally { setLoading(false); }
    };

    const progress = listingType === 'car' ? Math.round(((step) / (STEPS.length - 1)) * 100) : 100;

    const renderStep = () => {
        if (listingType === 'plate') {
            return (
                <View style={styles.stepBox}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>Nömrə Elanı</Text>
                    <View style={styles.twoCol}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Region kodu</Text>
                            <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="90" placeholderTextColor={colors.textSecondary} value={plateRegion} onChangeText={t => setPlateRegion(t.replace(/\D/g, ''))} maxLength={2} keyboardType="number-pad" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Seriya</Text>
                            <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="AA" placeholderTextColor={colors.textSecondary} value={plateSeries} onChangeText={t => setPlateSeries(t.toUpperCase())} maxLength={2} autoCapitalize="characters" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Nömrə</Text>
                            <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="000" placeholderTextColor={colors.textSecondary} value={plateNumber} onChangeText={t => setPlateNumber(t.replace(/\D/g, ''))} maxLength={3} keyboardType="number-pad" />
                        </View>
                    </View>
                    {plateRegion && plateSeries && plateNumber && (
                        <View style={[styles.platePrev, { borderColor: '#000' }]}>
                            <View style={styles.platePrevLeft}>
                                <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg' }} style={{ width: 28, height: 18 }} resizeMode="cover" />
                                <Text style={{ color: '#000', fontWeight: '900', fontSize: 11 }}>AZ</Text>
                            </View>
                            <Text style={styles.platePrevText}>{plateRegion}-{plateSeries}-{plateNumber}</Text>
                        </View>
                    )}
                    <View style={styles.twoCol}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text>
                            <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.textSecondary} value={platePrice} onChangeText={t => setPlatePrice(t.replace(/\D/g, ''))} keyboardType="number-pad" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Ad Soyad</Text>
                            <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Ad Soyad" placeholderTextColor={colors.textSecondary} value={plateSellerName} onChangeText={setPlateSellerName} />
                        </View>
                    </View>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Əlaqə nömrəsi</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="+994" placeholderTextColor={colors.textSecondary} value={plateContact} onChangeText={setPlateContact} keyboardType="phone-pad" />
                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Qeydlər</Text>
                    <TextInput style={[styles.input, styles.textarea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Əlavə məlumat..." placeholderTextColor={colors.textSecondary} value={plateDesc} onChangeText={setPlateDesc} multiline textAlignVertical="top" />
                </View>
            );
        }

        switch (step) {
            case 0:
                return (
                    <View style={styles.stepBox}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Elanın növünü seçin</Text>
                        <View style={styles.typeRow}>
                            <TouchableOpacity
                                style={[styles.typeCard, { borderColor: listingType === 'car' ? colors.primary : colors.border, backgroundColor: listingType === 'car' ? colors.primary + '15' : colors.card }]}
                                onPress={() => setListingType('car')}
                            >
                                <Car size={32} color={listingType === 'car' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.typeCardLabel, { color: listingType === 'car' ? colors.primary : colors.text }]}>Avtomobil</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeCard, { borderColor: (listingType as string) === 'plate' ? colors.primary : colors.border, backgroundColor: (listingType as string) === 'plate' ? colors.primary + '15' : colors.card }]}
                                onPress={() => setListingType('plate')}
                            >
                                <Hash size={32} color={(listingType as string) === 'plate' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.typeCardLabel, { color: (listingType as string) === 'plate' ? colors.primary : colors.text }]}>Nömrə</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            case 1:
                return (
                    <View style={styles.stepBox}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Marka və Model</Text>
                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Marka</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: make ? colors.primary : colors.border }]} placeholder="Marka axtar..." placeholderTextColor={colors.textSecondary} value={brandSearch || make} onChangeText={t => { setBrandSearch(t); if (!t) { setMake(''); setModel(''); setSelectedBrandId(null); } }} />
                                {brandSearch.length > 0 && (
                                    <View style={[styles.dropMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        {filteredBrands.slice(0, 8).map(b => (
                                            <TouchableOpacity key={b.id} style={styles.dropItem} onPress={() => { setMake(b.name); setSelectedBrandId(b.id); setBrandSearch(''); setModel(''); }}>
                                                <Text style={[styles.dropItemText, { color: colors.text }]}>{b.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {make ? (
                                    <View style={[styles.selectedPill, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                                        <Text style={{ color: colors.primary, fontFamily: 'RethinkSans_700Bold' }}>✓ {make}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Model</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: model ? colors.primary : colors.border }]} placeholder={make ? 'Model axtar...' : 'Əvvəl marka seçin'} placeholderTextColor={colors.textSecondary} value={modelSearch || model} editable={!!make} onChangeText={t => { setModelSearch(t); if (!t) setModel(''); }} />
                                {modelSearch.length > 0 && (
                                    <View style={[styles.dropMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        {filteredModels.slice(0, 8).map(m => (
                                            <TouchableOpacity key={m.id} style={styles.dropItem} onPress={() => { setModel(m.name); setModelSearch(''); }}>
                                                <Text style={[styles.dropItemText, { color: colors.text }]}>{m.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {model ? (
                                    <View style={[styles.selectedPill, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                                        <Text style={{ color: colors.primary, fontFamily: 'RethinkSans_700Bold' }}>✓ {model}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepBox}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Göstəricilər</Text>
                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Buraxılış ili</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="2023" placeholderTextColor={colors.textSecondary} value={year} onChangeText={t => setYear(t.replace(/\D/g, ''))} maxLength={4} keyboardType="number-pad" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Dropdown label="Ban növü" value={bodyType} options={OPTIONS.bodyType} onChange={setBodyType} colors={colors} />
                            </View>
                        </View>
                        <Dropdown label="Rəng" value={color} options={OPTIONS.color} onChange={setColor} colors={colors} />
                        <Dropdown label="Bazar" value={market} options={OPTIONS.market} onChange={setMarket} colors={colors} />
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepBox}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Mühərrik və Sistem</Text>
                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Mühərrik həcmi (L)</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="2.0" placeholderTextColor={colors.textSecondary} value={engine} onChangeText={setEngine} keyboardType="decimal-pad" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>At gücü (a.g.)</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="At gücü (məsələn: 200)" placeholderTextColor={colors.textSecondary} value={horsepower} onChangeText={t => setHorsepower(t.replace(/\D/g, ''))} keyboardType="number-pad" />
                            </View>
                        </View>
                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Dropdown label="Yanacaq növü" value={fuelType} options={OPTIONS.fuelType} onChange={setFuelType} colors={colors} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Dropdown label="Sürətlər qutusu" value={gearbox} options={OPTIONS.gearbox} onChange={setGearbox} colors={colors} />
                            </View>
                        </View>
                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Dropdown label="Ötürücü" value={transmission} options={OPTIONS.transmission} onChange={setTransmission} colors={colors} />
                            </View>
                            <View style={{ flex: 1 }} />
                        </View>
                    </View>
                );

            case 4:
                return (
                    <View style={styles.stepBox}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Komplektasiya</Text>
                        {dbFeatures.map(cat => (
                            <View key={cat.title} style={{ marginBottom: 24 }}>
                                <Text style={[styles.catTitle, { color: colors.textSecondary }]}>{cat.title}</Text>
                                <View style={styles.featureGrid}>
                                    {cat.items.map((item: any) => {
                                        const sel = selectedFeatures.includes(item.name);
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[styles.featureChip, { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? colors.primary + '15' : colors.card }]}
                                                onPress={() => setSelectedFeatures(prev => sel ? prev.filter(f => f !== item.name) : [...prev, item.name])}
                                            >
                                                {sel && <Check size={12} color={colors.primary} />}
                                                <Text style={[styles.featureChipText, { color: sel ? colors.primary : colors.text }]}>{item.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </View>
                );

            case 5:
                return (
                    <View style={styles.stepBox}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Yürüş və Məkan</Text>
                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Yürüş (km)</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.textSecondary} value={mileage} onChangeText={t => setMileage(t.replace(/\D/g, ''))} keyboardType="number-pad" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Dropdown label="Şəhər / Region" value={location} options={OPTIONS.location} onChange={setLocation} colors={colors} />
                            </View>
                        </View>
                        <View style={[styles.switchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Avtomobil yenidir?</Text>
                            <Switch value={isNew} onValueChange={setIsNew} trackColor={{ false: '#555', true: colors.primary }} />
                        </View>
                    </View>
                );

            case 6:
                return (
                    <View style={styles.stepBox}>
                        <Text style={[styles.stepTitle, { color: colors.text }]}>Qiymət və Foto</Text>

                        {/* Image picker */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Şəkillər (maks. 15)</Text>
                        <View style={styles.imgGrid}>
                            <TouchableOpacity style={[styles.imgAddBtn, { borderColor: colors.primary + '60', backgroundColor: colors.primary + '10' }]} onPress={pickImages}>
                                <Upload size={22} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontFamily: 'RethinkSans_600SemiBold', fontSize: 13, marginTop: 6 }}>Şəkil seç</Text>
                            </TouchableOpacity>
                            {selectedImages.map((img, i) => (
                                <View key={i} style={styles.imgPreview}>
                                    <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    <TouchableOpacity style={styles.imgRemove} onPress={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="0" placeholderTextColor={colors.textSecondary} value={price} onChangeText={t => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Ad Soyad</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Ad Soyad" placeholderTextColor={colors.textSecondary} value={sellerName} onChangeText={setSellerName} />
                            </View>
                        </View>
                        <View style={styles.twoCol}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Əlaqə nömrəsi</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="+994" placeholderTextColor={colors.textSecondary} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>VIN Kod (İstəyə bağlı)</Text>
                                <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="VIN" placeholderTextColor={colors.textSecondary} value={vinCode} onChangeText={t => setVinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={17} autoCapitalize="characters" />
                            </View>
                        </View>

                        <View style={[styles.switchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Kreditlə mümkündür?</Text>
                            <Switch value={isCredit} onValueChange={setIsCredit} trackColor={{ false: '#555', true: colors.primary }} />
                        </View>
                        <View style={[styles.switchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.switchLabel, { color: colors.text }]}>Barter mümkündür?</Text>
                            <Switch value={isBarter} onValueChange={setIsBarter} trackColor={{ false: '#555', true: colors.primary }} />
                        </View>

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Əlavə məlumat</Text>
                        <TextInput style={[styles.input, styles.textarea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} placeholder="Qeydlər..." placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} multiline textAlignVertical="top" />
                    </View>
                );
            default: return null;
        }
    };

    const isLastStep = listingType === 'plate' || step === STEPS.length - 1;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, display: 'flex' as any, flexDirection: 'column', minHeight: '100vh' as any }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingTop: isMobile ? 60 : 76, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.pageWrap}>
                    {/* Page header */}
                    <View style={{ marginBottom: 32 }}>
                        <Text style={[styles.pageTitle, { color: colors.text }]}>Elan Ver</Text>
                        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                            Avtomobilinizi və ya nömrənizi platformada yerləşdirin
                        </Text>
                    </View>

                    <View style={[styles.mainLayout, isMobile && { flexDirection: 'column' }]}>
                        {/* LEFT: Step sidebar - hidden on mobile */}
                        {listingType === 'car' && !isMobile && (
                            <View style={[styles.sidebar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.sidebarTitle, { color: colors.textSecondary }]}>Addımlar</Text>
                                {STEPS.map((s, i) => {
                                    const Icon = s.icon;
                                    const done = i < step;
                                    const active = i === step;
                                    return (
                                        <View key={i} style={styles.sidebarStep}>
                                            <View style={[
                                                styles.stepDot,
                                                { backgroundColor: done ? colors.primary : active ? colors.primary + '20' : (isDark ? '#2C2C2E' : '#F0F0F5'), borderColor: done || active ? colors.primary : colors.border }
                                            ]}>
                                                {done
                                                    ? <Check size={13} color="#FFF" />
                                                    : <Icon size={13} color={active ? colors.primary : colors.textSecondary} />
                                                }
                                            </View>
                                            <Text style={[styles.stepLabel, { color: active ? colors.text : colors.textSecondary, fontFamily: active ? 'RethinkSans_700Bold' : 'RethinkSans_500Medium' }]}>
                                                {s.title}
                                            </Text>
                                        </View>
                                    );
                                })}

                                {/* Progress */}
                                <View style={[styles.progressWrap, { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F5' }]}>
                                    <View style={[styles.progressBar, { width: `${progress}%` as any, backgroundColor: colors.primary }]} />
                                </View>
                                <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progress}% tamamlandı</Text>
                            </View>
                        )}

                        {/* RIGHT: Step content */}
                        <View style={{ flex: 1 }}>
                            <View style={[styles.stepCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {renderStep()}
                            </View>

                            {/* Navigation buttons */}
                            <View style={styles.navRow}>
                                {/* Back button logic */}
                                {step === 0 && listingType === 'plate' ? (
                                    // Plate form → go back to type selection (car)
                                    <TouchableOpacity style={[styles.prevBtn, { borderColor: colors.border }]} onPress={() => setListingType('car')}>
                                        <ArrowLeft size={18} color={colors.text} />
                                        <Text style={[styles.prevBtnText, { color: colors.text }]}>Geri</Text>
                                    </TouchableOpacity>
                                ) : step === 0 && listingType === 'car' ? (
                                    // Step 0 of car → go back to previous page
                                    <TouchableOpacity style={[styles.prevBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
                                        <ArrowLeft size={18} color={colors.text} />
                                        <Text style={[styles.prevBtnText, { color: colors.text }]}>Geri</Text>
                                    </TouchableOpacity>
                                ) : listingType === 'car' && step > 0 ? (
                                    // Car multi-step → go to prev step
                                    <TouchableOpacity style={[styles.prevBtn, { borderColor: colors.border }]} onPress={() => setStep(s => s - 1)}>
                                        <ArrowLeft size={18} color={colors.text} />
                                        <Text style={[styles.prevBtnText, { color: colors.text }]}>Geri</Text>
                                    </TouchableOpacity>
                                ) : null}

                                {isLastStep ? (
                                    <TouchableOpacity
                                        style={[styles.submitBtn, (loading || uploading) && { opacity: 0.7 }]}
                                        onPress={submit}
                                        disabled={loading || uploading}
                                    >
                                        <LinearGradient colors={['#FF3B30', '#FF6B35']} style={styles.submitBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                            {loading || uploading
                                                ? <ActivityIndicator color="#FFF" />
                                                : <>
                                                    <Check size={18} color="#FFF" />
                                                    <Text style={styles.submitBtnText}>Elanı Paylaş</Text>
                                                </>
                                            }
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.nextBtn} onPress={() => { if (validate()) setStep(s => s + 1); }}>
                                        <LinearGradient colors={[colors.primary, colors.primary]} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                            <Text style={styles.nextBtnText}>Növbəti</Text>
                                            <ArrowRight size={18} color="#FFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                <WebFooter />
            </ScrollView>

            <SuccessModal
                visible={showSuccess}
                onClose={() => { setShowSuccess(false); router.push('/'); }}
                message="Elanınız uğurla göndərildi. Yaxın zamanda nəzərdən keçiriləcək."
                shortId={createdShortId}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        maxWidth: 1100,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    pageTitle: {
        fontSize: 34,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_400Regular',
    },
    mainLayout: {
        flexDirection: 'row',
        gap: 28,
        alignItems: 'flex-start',
    },
    sidebar: {
        width: 220,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        gap: 4,
    },
    sidebarTitle: {
        fontSize: 11,
        fontFamily: 'RethinkSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    sidebarStep: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    stepDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepLabel: {
        fontSize: 13,
        flex: 1,
    },
    progressWrap: {
        height: 4,
        borderRadius: 2,
        marginTop: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
        marginTop: 6,
        textAlign: 'center',
    },
    stepCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    stepBox: {
        padding: 28,
        gap: 6,
    },
    stepTitle: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        fontSize: 15,
        fontFamily: 'RethinkSans_500Medium',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    } as any,
    textarea: {
        height: 100,
        paddingTop: 12,
    },
    twoCol: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
    },
    typeRow: {
        flexDirection: 'row',
        gap: 16,
    },
    typeCard: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 2,
        padding: 32,
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer' as any,
    },
    typeCardLabel: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
    },
    dropField: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        cursor: 'pointer' as any,
    },
    dropFieldText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_500Medium',
    },
    dropMenu: {
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4,
        maxHeight: 220,
        overflow: 'scroll' as any,
    },
    dropItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    dropItemText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
    },
    selectedPill: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    catTitle: {
        fontSize: 11,
        fontFamily: 'RethinkSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    featureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        cursor: 'pointer' as any,
    },
    featureChipText: {
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    switchCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
    },
    switchLabel: {
        fontSize: 15,
        fontFamily: 'RethinkSans_500Medium',
    },
    imgGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    imgAddBtn: {
        width: 100,
        height: 100,
        borderRadius: 14,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer' as any,
    },
    imgPreview: {
        width: 100,
        height: 100,
        borderRadius: 14,
        overflow: 'hidden',
    },
    imgRemove: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    platePrev: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 3,
        borderRadius: 10,
        height: 56,
        overflow: 'hidden',
        alignSelf: 'flex-start',
        marginVertical: 12,
    },
    platePrevLeft: {
        width: 44,
        height: '100%',
        borderRightWidth: 1,
        borderRightColor: '#DDD',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingVertical: 4,
    },
    platePrevText: {
        color: '#000',
        fontSize: 22,
        fontWeight: '900',
        paddingHorizontal: 16,
        letterSpacing: 2,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
    },
    prevBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    prevBtnText: {
        fontSize: 15,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    nextBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    nextBtnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    nextBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    submitBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    submitBtnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    submitBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
});
