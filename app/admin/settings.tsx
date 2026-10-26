import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Save, Image as ImageIcon, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { compressImage } from '../../utils/imageOptimizer';
import { AppSetting } from '../../types';
import { haptics } from '../../utils/haptics';
import {
    AdminHeader, AdminScroll, Group, GroupRow, FieldRow, TextArea, Segmented, HeaderAction, LoadingView, useAdminColors, AdminColors, F, uploadPath,
} from '../../components/admin/AdminUI';

const DEFAULT_KEYS = [
    { key: 'seller_name', label: 'Satıcı adı' },
    { key: 'email', label: 'Email' },
    { key: 'website', label: 'Vebsayt' },
    { key: 'address', label: 'Ünvan' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'privacy_policy', label: 'Məxfilik siyasəti' },
    { key: 'site_logo_dark', label: 'Loqo — qaranlıq tema' },
    { key: 'site_logo_light', label: 'Loqo — işıqlı tema' },
    { key: 'watermark_url', label: 'Watermark şəkli' },
    { key: 'watermark_position', label: 'Watermark mövqeyi' },
    { key: 'watermark_scale', label: 'Ölçü' },
];
const GENERAL = ['seller_name', 'email', 'website', 'address', 'instagram', 'tiktok', 'whatsapp'];
const PLACEHOLDERS: Record<string, string> = {
    seller_name: 'Naxçıvan Avto', email: 'info@naxavto.com', website: 'https://naxavto.com', address: 'Naxçıvan şəhəri',
    instagram: 'https://instagram.com/…', tiktok: 'https://tiktok.com/@…', whatsapp: 'https://wa.me/994…',
};
// Keys edited on the Reklamlar screen
const isBannerKey = (k: string) => k.includes('banner') || k.startsWith('startup_popup_') || k === 'required_app_version' || k === 'update_url';
const KNOWN = new Set([...DEFAULT_KEYS.map((d) => d.key)]);

const WATERMARK_POSITIONS = [
    { value: 'top_left', label: '↖' },
    { value: 'top_right', label: '↗' },
    { value: 'center', label: 'Mərkəz' },
    { value: 'bottom_left', label: '↙' },
    { value: 'bottom_right', label: '↘' },
];

const ImageRow = ({ c, label, value, busy, disabled, onUpload }: {
    c: AdminColors; label: string; value: string; busy: boolean; disabled: boolean; onUpload: () => void;
}) => (
    <View style={styles.imageRow}>
        <View style={[styles.thumb, { backgroundColor: c.fill }]}>
            {value ? <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={label} /> : <ImageIcon size={18} color={c.textSecondary} />}
        </View>
        <Text style={[styles.imageLabel, { color: c.text }]} numberOfLines={1}>{label}</Text>
        <TouchableOpacity onPress={onUpload} disabled={disabled} style={[styles.uploadBtn, { backgroundColor: c.fill }]}>
            {busy ? <ActivityIndicator size="small" color={c.text} /> : <Text style={[styles.uploadText, { color: c.primary }]}>{value ? 'Dəyiş' : 'Yüklə'}</Text>}
        </TouchableOpacity>
    </View>
);

export default function SettingsScreen() {
    const router = useRouter();
    const c = useAdminColors();
    const { showToast } = useToast();
    const { refreshSettings } = useSettings();
    const { isSuperAdmin } = useAuth();
    const [settings, setSettings] = useState<AppSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase.from('app_settings').select('*').order('key');
                if (error) throw error;
                const current: AppSetting[] = data ? [...data] : [];
                for (let i = 1; i <= 7; i++) {
                    const key = `phone_${i}`;
                    if (!current.find((s) => s.key === key)) current.push({ key, value: '', label: `Əlaqə nömrəsi ${i}` });
                }
                DEFAULT_KEYS.forEach((def) => {
                    if (!current.find((s) => s.key === def.key)) current.push({ key: def.key, value: '', label: def.label });
                });
                if (!cancelled) setSettings(current);
            } catch (error: any) {
                showToast('Xəta: ' + error.message, 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [showToast]);

    const valueOf = (key: string) => settings.find((s) => s.key === key)?.value || '';
    const labelOf = (key: string) => DEFAULT_KEYS.find((d) => d.key === key)?.label || settings.find((s) => s.key === key)?.label || key;
    const updateSetting = (key: string, value: string) => setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));

    const handleImageUpload = async (key: string) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
            if (result.canceled) return;
            setUploadingKey(key);
            const compressed = await compressImage(result.assets[0].uri);
            const fileName = uploadPath(`settings/${key}`);
            const { error } = await supabase.storage.from('images').upload(fileName, decode(compressed.base64!), { contentType: 'image/jpeg', upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
            updateSetting(key, publicUrl);
            haptics.success();
            showToast('Şəkil yükləndi — yadda saxlamağı unutmayın', 'success');
        } catch (error: any) {
            haptics.error();
            showToast('Yükləmə xətası: ' + error.message, 'error');
        } finally {
            setUploadingKey(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Banner keys are saved from the Reklamlar screen; leave them untouched here
            const updates = settings.filter((s) => !isBannerKey(s.key)).map((s) => ({ key: s.key, value: s.value || '', label: s.label || labelOf(s.key) }));
            const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' });
            if (error) throw error;
            await refreshSettings();
            haptics.success();
            showToast('Ayarlar yeniləndi', 'success');
            router.back();
        } catch (error: any) {
            haptics.error();
            showToast('Xəta: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const phones = settings.filter((s) => /^phone_\d+$/.test(s.key)).sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
    const others = settings.filter((s) => !KNOWN.has(s.key) && !/^phone_\d+$/.test(s.key) && !isBannerKey(s.key));

    const imageRow = (key: string) => (
        <ImageRow key={key} c={c} label={labelOf(key)} value={valueOf(key)} busy={uploadingKey === key} disabled={!!uploadingKey} onUpload={() => handleImageUpload(key)} />
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <AdminHeader
                title="Ayarlar"
                subtitle="Əlaqə, loqo və ümumi məlumatlar"
                backLabel="Admin"
                right={saving ? <ActivityIndicator color={c.primary} /> : <HeaderAction icon={Save} label="Yadda saxla" onPress={handleSave} />}
            />
            {loading ? <LoadingView /> : (
                <AdminScroll>
                    <Group title="Ümumi">
                        {GENERAL.map((key) => (
                            <FieldRow
                                key={key}
                                label={labelOf(key)}
                                value={valueOf(key)}
                                onChangeText={(v) => updateSetting(key, v)}
                                placeholder={PLACEHOLDERS[key]}
                                autoCapitalize={key === 'seller_name' || key === 'address' ? 'sentences' : 'none'}
                                keyboardType={key === 'email' ? 'email-address' : key === 'seller_name' || key === 'address' ? 'default' : 'url'}
                            />
                        ))}
                    </Group>

                    <Group title="Əlaqə nömrələri" footer="Birinci nömrə saytda və elan səhifələrində əsas nömrə kimi göstərilir.">
                        {phones.map((p, i) => (
                            <FieldRow key={p.key} label={`Nömrə ${i + 1}`} value={p.value} onChangeText={(v) => updateSetting(p.key, v)} placeholder="+994 …" keyboardType="phone-pad" />
                        ))}
                    </Group>

                    <Group title="Loqo">
                        {imageRow('site_logo_light')}
                        {imageRow('site_logo_dark')}
                    </Group>

                    <Group title="Watermark" footer="Elan şəkillərinin üzərində göstərilir.">
                        {imageRow('watermark_url')}
                        <FieldRow label={labelOf('watermark_scale')} value={valueOf('watermark_scale')} onChangeText={(v) => updateSetting('watermark_scale', v)} placeholder="1" keyboardType="decimal-pad" />
                        <View style={styles.segmentRow}>
                            <Text style={[styles.segmentLabel, { color: c.text }]}>Mövqe</Text>
                            <Segmented
                                options={WATERMARK_POSITIONS}
                                value={valueOf('watermark_position') || 'bottom_right'}
                                onChange={(v) => updateSetting('watermark_position', v)}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </Group>

                    <Group title={labelOf('privacy_policy')}>
                        <TextArea value={valueOf('privacy_policy')} onChangeText={(v) => updateSetting('privacy_policy', v)} placeholder="Məxfilik siyasətinin mətni" style={{ minHeight: 180 }} />
                    </Group>

                    {others.length > 0 && (
                        <Group title="Digər">
                            {others.map((s) => (
                                <FieldRow key={s.key} label={s.label || s.key} value={s.value} onChangeText={(v) => updateSetting(s.key, v)} autoCapitalize="none" />
                            ))}
                        </Group>
                    )}

                    {isSuperAdmin && (
                        <Group>
                            <GroupRow icon={Users} tint="#5856D6" title="Admin istifadəçilər" onPress={() => router.push('/admin/users')} />
                        </Group>
                    )}
                </AdminScroll>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    thumb: { width: 64, height: 40, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    imageLabel: { flex: 1, fontSize: 15, fontFamily: F.semibold },
    uploadBtn: { minWidth: 64, height: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
    uploadText: { fontSize: 14, fontFamily: F.semibold },
    segmentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    segmentLabel: { width: 70, fontSize: 15, fontFamily: F.semibold },
});
