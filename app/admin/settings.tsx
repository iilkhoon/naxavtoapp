import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft, Phone, Globe, Mail, MapPin, Instagram, Video, Image as ImageIcon, Upload, UserPlus, ChevronRight, Moon, Sun, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, Crosshair } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { compressImage } from '../../utils/imageOptimizer';
import { AppSetting } from '../../types';

const InputField = ({ item, colors, onChange }: { item: AppSetting, colors: any, onChange: (key: string, value: string) => void }) => {
    const isMultiline = item.key === 'privacy_policy' || item.key === 'address';
    return (
        <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }, isMultiline && { height: 120, alignItems: 'flex-start' }]}>
                <TextInput style={[styles.input, { color: colors.text }, isMultiline && { height: '100%', textAlignVertical: 'top', paddingTop: 12 }]} value={item.value} onChangeText={(text) => onChange(item.key, text)} placeholder={item.key.startsWith('phone_') ? "+994..." : "Daxil edin..."} placeholderTextColor={colors.placeholder} keyboardType={item.key.startsWith('phone_') ? "phone-pad" : "default"} multiline={isMultiline} />
            </View>
        </View>
    );
};

const ImageUploader = ({ item, icon: Icon, colors, onUpload, uploading }: any) => (
    <View style={styles.inputWrapper}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
        <View style={[styles.imageUploadContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.imagePreviewWrapper}>
                {item.value ? (<Image source={{ uri: item.value }} style={styles.previewImage} resizeMode="contain" />) : (<View style={[styles.placeholderImage, { backgroundColor: colors.background }]}>{Icon ? <Icon size={24} color={colors.textSecondary} /> : <ImageIcon size={24} color={colors.textSecondary} />}</View>)}
            </View>
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={() => onUpload(item.key)} disabled={uploading}>
                {uploading ? (<ActivityIndicator color="#FFF" size="small" />) : (<Text style={styles.uploadText}>{item.value ? 'Dəyişdir' : 'Yüklə'}</Text>)}
            </TouchableOpacity>
        </View>
    </View>
);

const PositionSelector = ({ value, onChange, colors }: { value: string, onChange: (val: string) => void, colors: any }) => {
    const positions = [{ key: 'top_left', icon: ArrowUpLeft }, { key: 'top_right', icon: ArrowUpRight }, { key: 'center', icon: Crosshair }, { key: 'bottom_left', icon: ArrowDownLeft }, { key: 'bottom_right', icon: ArrowDownRight }];
    return (
        <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Watermark Mövqeyi</Text>
            <View style={styles.positionGrid}>
                {positions.map((pos) => {
                    const Icon = pos.icon;
                    const isSelected = value === pos.key || (!value && pos.key === 'bottom_right');
                    return (<TouchableOpacity key={pos.key} style={[styles.positionButton, { backgroundColor: isSelected ? colors.primary : colors.card, borderColor: isSelected ? colors.primary : colors.border }]} onPress={() => onChange(pos.key)}><Icon size={20} color={isSelected ? '#FFF' : colors.textSecondary} /></TouchableOpacity>);
                })}
            </View>
        </View>
    );
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
        const { data, error } = await supabase.from('app_settings').select('*').order('key');
        if (error) throw error;
        let currentSettings: AppSetting[] = data ? [...data] : [];
        for (let i = 1; i <= 7; i++) { const key = `phone_${i}`; if (!currentSettings.find(s => s.key === key)) { currentSettings.push({ key, value: '', label: `Əlaqə Nömrəsi ${i}` }); } }
        const defaultKeys = [{ key: 'seller_name', label: 'Satıcı Adı' }, { key: 'email', label: 'Email Ünvanı' }, { key: 'address', label: 'Ünvan' }, { key: 'privacy_policy', label: 'Məxfilik Siyasəti' }, { key: 'website', label: 'Vebsayt' }, { key: 'instagram', label: 'Instagram Linki' }, { key: 'tiktok', label: 'TikTok Linki' }, { key: 'whatsapp', label: 'WhatsApp Linki' }, { key: 'site_logo_dark', label: 'Sayt Logosu (Qara Tema)' }, { key: 'site_logo_light', label: 'Sayt Logosu (Ağ Tema)' }, { key: 'watermark_url', label: 'Watermark (Şəkil üzəri logo)' }, { key: 'watermark_position', label: 'Watermark Mövqeyi' }];
        defaultKeys.forEach(def => { if (!currentSettings.find(s => s.key === def.key)) { currentSettings.push({ key: def.key, value: '', label: def.label }); } });
        currentSettings.sort((a, b) => { if (a.key.startsWith('phone_') && !b.key.startsWith('phone_')) return 1; if (!a.key.startsWith('phone_') && b.key.startsWith('phone_')) return -1; return a.key.localeCompare(b.key); });
        setSettings(currentSettings);
    } catch (error: any) { showToast('Xəta: ' + error.message, 'error'); } finally { setLoading(false); }
  };

  const updateSetting = (key: string, value: string) => { setSettings(prev => prev.map(item => item.key === key ? { ...item, value } : item)); };

  const handleImageUpload = async (key: string) => {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1, base64: false });
        if (!result.canceled) {
            setUploading(true);
            const compressed = await compressImage(result.assets[0].uri);
            const fileName = `settings/${key}_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('images').upload(fileName, decode(compressed.base64!), { contentType: 'image/jpeg', upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
            updateSetting(key, publicUrl);
            showToast('Şəkil yükləndi, yadda saxlamağı unutmayın!', 'success');
        }
    } catch (error: any) { showToast('Yükləmə xətası: ' + error.message, 'error'); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = settings.map(item => ({ key: item.key, value: item.value || '', label: item.label }));
      const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      await refreshSettings();
      showToast('Məlumatlar uğurla yeniləndi!', 'success');
      setTimeout(() => router.back(), 1000);
    } catch (error: any) { console.error(error); showToast('Xəta: ' + error.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color={colors.text} /></TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>{saving ? <ActivityIndicator color="#FFF" size="small" /> : <Save size={20} color="#FFF" />}</TouchableOpacity>
        </View>
        {loading ? (<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />) : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.primary }]}>İstifadəçilər</Text></View>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push('/admin/add-user')}>
                <View style={styles.actionButtonLeft}><View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}><UserPlus size={20} color={colors.primary} /></View><Text style={[styles.actionButtonText, { color: colors.text }]}>Yeni İstifadəçi Əlavə Et</Text></View>
                <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Görünüş & Watermark</Text></View>
            <View style={[styles.groupContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {settings.filter(s => s.key === 'site_logo_dark').map((item) => (<ImageUploader key={item.key} item={item} icon={Moon} colors={colors} onUpload={handleImageUpload} uploading={uploading} />))}
                {settings.filter(s => s.key === 'site_logo_light').map((item) => (<ImageUploader key={item.key} item={item} icon={Sun} colors={colors} onUpload={handleImageUpload} uploading={uploading} />))}
                {settings.filter(s => s.key === 'watermark_url').map((item) => (<ImageUploader key={item.key} item={item} colors={colors} onUpload={handleImageUpload} uploading={uploading} />))}
                {settings.filter(s => s.key === 'watermark_position').map((item) => (<PositionSelector key={item.key} value={item.value} onChange={(val) => updateSetting(item.key, val)} colors={colors} />))}
            </View>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Ümumi Məlumatlar</Text></View>
            <View style={[styles.groupContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {settings.filter(s => !s.key.startsWith('phone_') && !s.key.startsWith('site_logo') && !s.key.startsWith('watermark')).map((item) => (<InputField key={item.key} item={item} colors={colors} onChange={updateSetting} />))}
            </View>
            <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Əlaqə Nömrələri</Text></View>
            <View style={[styles.groupContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {settings.filter(s => s.key.startsWith('phone_')).map((item) => (<InputField key={item.key} item={item} colors={colors} onChange={updateSetting} />))}
            </View>
            </ScrollView>
        )}
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
  backButton: { padding: 8, borderRadius: 12 },
  title: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  saveButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3B30', borderRadius: 20 },
  content: { padding: 20, paddingBottom: 50 },
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontFamily: 'RethinkSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  groupContainer: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 24 },
  inputWrapper: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },
  inputContainer: { borderRadius: 12, borderWidth: 1, height: 48, justifyContent: 'center' },
  input: { height: '100%', paddingHorizontal: 12, fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  imageUploadContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 12, borderWidth: 1 },
  imagePreviewWrapper: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  placeholderImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  uploadButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  uploadText: { color: '#FFF', fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  actionButtonLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionButtonText: { fontSize: 15, fontFamily: 'RethinkSans_600SemiBold' },
  positionGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  positionButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});
