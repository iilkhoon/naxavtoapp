import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { compressImage } from '../../utils/imageOptimizer';
import { AppSetting } from '../../types';
import { Image } from 'react-native';

const InputField = ({ item, colors, onChange }: { item: AppSetting, colors: any, onChange: (key: string, value: string) => void }) => {
    return (
        <View style={styles.inputWrapper}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={item.value}
                    onChangeText={(text) => onChange(item.key, text)}
                    placeholder="Daxil edin..."
                    placeholderTextColor={colors.placeholder}
                />
            </View>
        </View>
    );
};

const ImageUploader = ({ item, icon: Icon, colors, onUpload, onRemove, uploading }: any) => (
    <View style={styles.inputWrapper}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
        <View style={[styles.imageUploadContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.imagePreviewWrapper}>
                {item.value ? (<Image source={{ uri: item.value }} style={styles.previewImage} resizeMode="contain" />) : (<View style={[styles.placeholderImage, { backgroundColor: colors.background }]}>{Icon ? <Icon size={24} color={colors.textSecondary} /> : <ImageIcon size={24} color={colors.textSecondary} />}</View>)}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {item.value ? (
                    <TouchableOpacity style={[styles.removeButton, { backgroundColor: '#FF3B3015' }]} onPress={() => onRemove(item.key)} disabled={uploading}>
                        <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]} onPress={() => onUpload(item.key)} disabled={uploading}>
                    {uploading ? (<ActivityIndicator color="#FFF" size="small" />) : (<Text style={styles.uploadText}>{item.value ? 'Dəyişdir' : 'Yüklə'}</Text>)}
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

export default function BannersScreen() {
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

            const bannerKeys = [
                { key: 'startup_popup_enabled', label: 'Popup-u Aktiv et' },
                { key: 'startup_popup_image', label: 'Popup Şəkli' },
                { key: 'startup_popup_title', label: 'Popup Başlığı' },
                { key: 'startup_popup_subtitle', label: 'Popup Mətni' },
                { key: 'startup_popup_button_text', label: 'Düymə Yazısı' },
                { key: 'startup_popup_url', label: 'Yönləndirmə Linki' },
                { key: 'home_banner_url', label: 'Ana Səhifə Banneri 1' }, { key: 'home_banner_url_2', label: 'Ana Səhifə Banneri 2' }, { key: 'home_banner_url_3', label: 'Ana Səhifə Banneri 3' },
                { key: 'home_mid_banner_1', label: 'Ana Səhifə (Daxili) Banner 1' }, { key: 'home_mid_banner_2', label: 'Ana Səhifə (Daxili) Banner 2' }, { key: 'home_mid_banner_3', label: 'Ana Səhifə (Daxili) Banner 3' },
                { key: 'favorite_banner_1', label: 'Seçilmişlər Banner 1' }, { key: 'favorite_banner_2', label: 'Seçilmişlər Banner 2' }, { key: 'favorite_banner_3', label: 'Seçilmişlər Banner 3' },
                { key: 'compare_banner_1', label: 'Müqayisə Banner 1' }, { key: 'compare_banner_2', label: 'Müqayisə Banner 2' }, { key: 'compare_banner_3', label: 'Müqayisə Banner 3' },
                { key: 'web_left_banner_url', label: 'Sol Veb Banner Şəkli' }, { key: 'web_left_banner_link', label: 'Sol Veb Banner Linki' },
                { key: 'web_right_banner_url', label: 'Sağ Veb Banner Şəkli' }, { key: 'web_right_banner_link', label: 'Sağ Veb Banner Linki' },
                { key: 'required_app_version', label: 'Tələb Olunan Versiya (məs: 1.0.7)' },
                { key: 'update_url', label: 'Yönləndirmə Linki' }
            ];

            bannerKeys.forEach(def => { if (!currentSettings.find(s => s.key === def.key)) { currentSettings.push({ key: def.key, value: '', label: def.label }); } });
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
                const fileName = `banners/${key}_${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage.from('images').upload(fileName, decode(compressed.base64!), { contentType: 'image/jpeg', upsert: true });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                updateSetting(key, publicUrl);
                showToast('Şəkil yükləndi, yadda saxlamağı unutmayın!', 'success');
            }
        } catch (error: any) { showToast('Yükləmə xətası: ' + error.message, 'error'); } finally { setUploading(false); }
    };

    const handleRemove = (key: string) => {
        updateSetting(key, '');
        showToast('Banner silindi, yadda saxlamağı unutmayın!', 'info');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = settings.filter(s => s.key.includes('banner') || s.key.includes('startup_popup') || s.key === 'required_app_version' || s.key === 'update_url').map(item => ({ key: item.key, value: item.value || '', label: item.label }));
            const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' });
            if (error) throw error;
            await refreshSettings();
            showToast('Reklamlar uğurla yeniləndi!', 'success');
            setTimeout(() => router.back(), 1000);
        } catch (error: any) { console.error(error); showToast('Xəta: ' + error.message, 'error'); } finally { setSaving(false); }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><ArrowLeft size={24} color={colors.text} /></TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Reklam İdarəetməsi</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>{saving ? <ActivityIndicator color="#FFF" size="small" /> : <Save size={20} color="#FFF" />}</TouchableOpacity>
                </View>
                {loading ? (<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />) : (
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Məcburi Güncəlləmə</Text></View>
                        {settings.filter(s => s.key === 'required_app_version').map((item) => (<InputField key={item.key} item={item} colors={colors} onChange={updateSetting} />))}
                        {settings.filter(s => s.key === 'update_url').map((item) => (<InputField key={item.key} item={item} colors={colors} onChange={updateSetting} />))}

                        <View style={[styles.sectionHeader, { marginTop: 16 }]}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Tətbiq Popupu</Text></View>
                        {settings.filter(s => s.key === 'startup_popup_enabled').map((item) => (
                            <View key={item.key} style={[styles.inputWrapper, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>{item.label}</Text>
                                <Switch
                                    trackColor={{ false: "#767577", true: colors.primary }}
                                    thumbColor={item.value === 'true' ? "#fff" : "#f4f3f4"}
                                    ios_backgroundColor="#3e3e3e"
                                    onValueChange={(val) => updateSetting(item.key, String(val))}
                                    value={item.value === 'true'}
                                />
                            </View>
                        ))}
                        {settings.filter(s => s.key === 'startup_popup_image').map((item) => (<ImageUploader key={item.key} item={item} icon={ImageIcon} colors={colors} onUpload={handleImageUpload} onRemove={handleRemove} uploading={uploading} />))}
                        {settings.filter(s => s.key.startsWith('startup_popup_') && !s.key.includes('enabled') && !s.key.includes('image')).map((item) => (<InputField key={item.key} item={item} colors={colors} onChange={updateSetting} />))}

                        <View style={[styles.sectionHeader, { marginTop: 16 }]}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Ana Səhifə (Yuxarı)</Text></View>
                        {settings.filter(s => s.key.startsWith('home_banner_url') && !s.key.includes('mid')).map((item) => (<ImageUploader key={item.key} item={item} icon={ImageIcon} colors={colors} onUpload={handleImageUpload} onRemove={handleRemove} uploading={uploading} />))}

                        <View style={[styles.sectionHeader, { marginTop: 16 }]}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Ana Səhifə (Daxili)</Text></View>
                        {settings.filter(s => s.key.startsWith('home_mid_banner')).map((item) => (<ImageUploader key={item.key} item={item} icon={ImageIcon} colors={colors} onUpload={handleImageUpload} onRemove={handleRemove} uploading={uploading} />))}

                        <View style={[styles.sectionHeader, { marginTop: 16 }]}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Seçilmişlər</Text></View>
                        {settings.filter(s => s.key.startsWith('favorite_banner')).map((item) => (<ImageUploader key={item.key} item={item} icon={ImageIcon} colors={colors} onUpload={handleImageUpload} onRemove={handleRemove} uploading={uploading} />))}

                        <View style={[styles.sectionHeader, { marginTop: 16 }]}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Müqayisə</Text></View>
                        {settings.filter(s => ['compare_banner_1', 'compare_banner_2', 'compare_banner_3'].includes(s.key)).map((item) => (<ImageUploader key={item.key} item={item} icon={ImageIcon} colors={colors} onUpload={handleImageUpload} onRemove={handleRemove} uploading={uploading} />))}

                        <View style={[styles.sectionHeader, { marginTop: 16 }]}><Text style={[styles.sectionTitle, { color: colors.primary }]}>Veb Yan Reklamlar (Böyük Ekran)</Text></View>
                        {settings.filter(s => ['web_left_banner_url', 'web_right_banner_url'].includes(s.key)).map((item) => (<ImageUploader key={item.key} item={item} icon={ImageIcon} colors={colors} onUpload={handleImageUpload} onRemove={handleRemove} uploading={uploading} />))}
                        {settings.filter(s => ['web_left_banner_link', 'web_right_banner_link'].includes(s.key)).map((item) => (<InputField key={item.key} item={item} colors={colors} onChange={updateSetting} />))}
                    </ScrollView>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1 },
    backButton: { padding: 8, borderRadius: 12 },
    title: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
    saveButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF3B30', borderRadius: 20 },
    content: { padding: 20, paddingBottom: 50 },
    sectionHeader: { marginBottom: 12, marginTop: 8 },
    sectionTitle: { fontSize: 13, fontFamily: 'RethinkSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
    inputWrapper: { marginBottom: 16 },
    label: { marginBottom: 8, fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },
    inputContainer: { borderRadius: 12, borderWidth: 1, height: 48, justifyContent: 'center' },
    input: { height: '100%', paddingHorizontal: 12, fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
    imageUploadContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 12, borderWidth: 1 },
    imagePreviewWrapper: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    placeholderImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    uploadButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    removeButton: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    uploadText: { color: '#FFF', fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
});
