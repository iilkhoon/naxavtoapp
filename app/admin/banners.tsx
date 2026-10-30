import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { Image } from 'expo-image';
import { Save, Image as ImageIcon, Trash2, Link2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { compressImage, deleteStorageImages } from '../../utils/imageOptimizer';
import { AppSetting } from '../../types';
import { haptics } from '../../utils/haptics';
import { loadTargetOptions, PickOption } from '../../lib/links';
import {
    AdminHeader, AdminScroll, Group, GroupRow, FieldRow, HeaderAction, LoadingView, PickerSheet, useAdminColors, AdminColors, F, uploadPath,
} from '../../components/admin/AdminUI';

const BANNER_KEYS = [
    { key: 'startup_popup_enabled', label: 'Popup aktivdir' },
    { key: 'startup_popup_image', label: 'Popup şəkli' },
    { key: 'startup_popup_title', label: 'Başlıq' },
    { key: 'startup_popup_subtitle', label: 'Mətn' },
    { key: 'startup_popup_button_text', label: 'Düymə' },
    { key: 'startup_popup_url', label: 'Link' },
    { key: 'home_banner_url', label: 'Banner 1' }, { key: 'home_banner_url_2', label: 'Banner 2' }, { key: 'home_banner_url_3', label: 'Banner 3' },
    { key: 'home_mid_banner_1', label: 'Banner 1' }, { key: 'home_mid_banner_2', label: 'Banner 2' }, { key: 'home_mid_banner_3', label: 'Banner 3' },
    { key: 'favorite_banner_1', label: 'Banner 1' }, { key: 'favorite_banner_2', label: 'Banner 2' }, { key: 'favorite_banner_3', label: 'Banner 3' },
    { key: 'compare_banner_1', label: 'Banner 1' }, { key: 'compare_banner_2', label: 'Banner 2' }, { key: 'compare_banner_3', label: 'Banner 3' },
    { key: 'web_left_banner_url', label: 'Sol banner' }, { key: 'web_right_banner_url', label: 'Sağ banner' },
    { key: 'required_app_version', label: 'Minimum versiya' },
    { key: 'update_url', label: 'Yeniləmə linki' },
];
const IMAGE_KEYS = [
    'home_banner_url', 'home_banner_url_2', 'home_banner_url_3', 'home_mid_banner_1', 'home_mid_banner_2', 'home_mid_banner_3',
    'favorite_banner_1', 'favorite_banner_2', 'favorite_banner_3', 'compare_banner_1', 'compare_banner_2', 'compare_banner_3',
    'web_left_banner_url', 'web_right_banner_url',
];
// Where a tap on a banner goes: "listing:<id>", "plate:<id>" or a URL (lib/links)
const linkKeyOf = (key: string) => (key.startsWith('web_') ? key.replace(/_url$/, '_link') : `${key}_link`);
IMAGE_KEYS.forEach((key) => {
    const label = BANNER_KEYS.find((k) => k.key === key)?.label || key;
    BANNER_KEYS.push({ key: linkKeyOf(key), label: `${label} keçidi` });
});
const OWN_KEYS = new Set(BANNER_KEYS.map((k) => k.key));
const NO_LINK = '__none';
const URL_LINK = '__url';
const isListingTarget = (v: string) => v.startsWith('listing:') || v.startsWith('plate:');

// One image slot: thumbnail, label and upload/remove actions
const ImageRow = ({ c, label, value, busy, disabled, onUpload, onRemove }: {
    c: AdminColors; label: string; value: string; busy: boolean; disabled: boolean; onUpload: () => void; onRemove: () => void;
}) => (
    <View style={styles.imageRow}>
        <View style={[styles.thumb, { backgroundColor: c.fill }]}>
            {value ? <Image source={{ uri: value }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={label} /> : <ImageIcon size={18} color={c.textSecondary} />}
        </View>
        <View style={{ flex: 1 }}>
            <Text style={[styles.imageLabel, { color: c.text }]}>{label}</Text>
            <Text style={[styles.imageState, { color: c.textSecondary }]}>{value ? 'Yüklənib' : 'Boşdur'}</Text>
        </View>
        {!!value && (
            <TouchableOpacity onPress={onRemove} disabled={disabled} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.accentSoft }]} accessibilityLabel={`${label} sil`}>
                <Trash2 size={16} color={c.primary} />
            </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onUpload} disabled={disabled} style={[styles.uploadBtn, { backgroundColor: c.fill }]}>
            {busy ? <ActivityIndicator size="small" color={c.text} /> : <Text style={[styles.uploadText, { color: c.primary }]}>{value ? 'Dəyiş' : 'Yüklə'}</Text>}
        </TouchableOpacity>
    </View>
);

export default function BannersScreen() {
    const router = useRouter();
    const c = useAdminColors();
    const { showToast } = useToast();
    const { refreshSettings } = useSettings();
    const [settings, setSettings] = useState<AppSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [targets, setTargets] = useState<PickOption[] | null>(null);
    const [pickingFor, setPickingFor] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase.from('app_settings').select('*').order('key');
                if (error) throw error;
                const current: AppSetting[] = data ? [...data] : [];
                BANNER_KEYS.forEach((def) => {
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
    const labelOf = (key: string) => BANNER_KEYS.find((k) => k.key === key)?.label || key;
    const updateSetting = (key: string, value: string) => setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));

    const openPicker = async (linkKey: string) => {
        setPickingFor(linkKey);
        if (targets) return;
        try {
            setTargets(await loadTargetOptions());
        } catch (e: any) {
            showToast('Elanlar yüklənmədi: ' + e.message, 'error');
            setTargets([]);
        }
    };

    const describeTarget = (value: string) =>
        targets?.find((o) => o.value === value)?.label || `Elan #${value.split(':')[1]}`;

    // Picker row under each uploaded banner, plus a URL field when the target is a link
    const linkRows = (imageKey: string) => {
        const linkKey = linkKeyOf(imageKey);
        const value = valueOf(linkKey);
        const isUrl = !!value && !isListingTarget(value);
        return (
            <React.Fragment key={linkKey}>
                <GroupRow
                    icon={Link2}
                    tint="#007AFF"
                    title="Toxunduqda"
                    value={!value ? 'Heç nə' : isUrl ? 'Link' : describeTarget(value)}
                    onPress={() => openPicker(linkKey)}
                />
                {isUrl && (
                    <FieldRow
                        label="Link"
                        value={value === 'https://' ? '' : value}
                        onChangeText={(v) => updateSetting(linkKey, v.trim() || 'https://')}
                        placeholder="https://"
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                )}
            </React.Fragment>
        );
    };

    const handleImageUpload = async (key: string) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
            if (result.canceled) return;
            setUploadingKey(key);
            const prevUrl = valueOf(key);
            const compressed = await compressImage(result.assets[0].uri, 1200, 0.7);
            const fileName = uploadPath(`banners/${key}`, 'webp');
            const { error } = await supabase.storage.from('images').upload(fileName, decode(compressed.base64!), { contentType: 'image/webp' });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
            updateSetting(key, publicUrl);
            if (prevUrl && prevUrl !== publicUrl) {
                await deleteStorageImages(supabase, [prevUrl]);
            }
            haptics.success();
            showToast('Şəkil WebP formatında yükləndi — yadda saxlamağı unutmayın', 'success');
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
            const updates = settings
                .filter((s) => OWN_KEYS.has(s.key))
                .map((s) => ({ key: s.key, value: s.value === 'https://' ? '' : s.value || '', label: s.label || labelOf(s.key) }));
            const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' });
            if (error) throw error;
            await refreshSettings();
            haptics.success();
            showToast('Reklamlar yeniləndi', 'success');
            router.back();
        } catch (error: any) {
            haptics.error();
            showToast('Xəta: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const imageGroup = (title: string, keys: string[], footer?: string) => (
        <Group title={title} footer={footer}>
            {keys.map((key) => (
                <React.Fragment key={key}>
                    <ImageRow
                        c={c}
                        label={labelOf(key)}
                        value={valueOf(key)}
                        busy={uploadingKey === key}
                        disabled={!!uploadingKey}
                        onUpload={() => handleImageUpload(key)}
                        onRemove={() => {
                            const prevUrl = valueOf(key);
                            if (prevUrl) deleteStorageImages(supabase, [prevUrl]);
                            updateSetting(key, '');
                            updateSetting(linkKeyOf(key), '');
                            haptics.tap();
                        }}
                    />
                    {!!valueOf(key) && linkRows(key)}
                </React.Fragment>
            ))}
        </Group>
    );

    const textRow = (key: string, placeholder: string, extra?: object) => (
        <FieldRow key={key} label={labelOf(key)} value={valueOf(key)} onChangeText={(v) => updateSetting(key, v)} placeholder={placeholder} autoCapitalize="none" {...extra} />
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <AdminHeader
                title="Reklamlar"
                subtitle="Bannerlər, açılış popupu və versiya"
                backLabel="Admin"
                right={saving ? <ActivityIndicator color={c.primary} /> : <HeaderAction icon={Save} label="Yadda saxla" onPress={handleSave} />}
            />
            {loading ? <LoadingView /> : (
                <AdminScroll>
                    <Group title="Açılış popupu">
                        <GroupRow
                            title={labelOf('startup_popup_enabled')}
                            right={
                                <Switch
                                    value={valueOf('startup_popup_enabled') === 'true'}
                                    onValueChange={(v) => { haptics.tap(); updateSetting('startup_popup_enabled', String(v)); }}
                                    trackColor={{ false: c.fill, true: c.success }}
                                />
                            }
                        />
                        <ImageRow
                            c={c}
                            label={labelOf('startup_popup_image')}
                            value={valueOf('startup_popup_image')}
                            busy={uploadingKey === 'startup_popup_image'}
                            disabled={!!uploadingKey}
                            onUpload={() => handleImageUpload('startup_popup_image')}
                            onRemove={() => {
                                const prevUrl = valueOf('startup_popup_image');
                                if (prevUrl) deleteStorageImages(supabase, [prevUrl]);
                                updateSetting('startup_popup_image', '');
                            }}
                        />
                        {textRow('startup_popup_title', 'Başlıq')}
                        {textRow('startup_popup_subtitle', 'Qısa mətn')}
                        {textRow('startup_popup_button_text', 'Məs: Bax')}
                        {textRow('startup_popup_url', 'https://')}
                    </Group>

                    {imageGroup('Ana səhifə — yuxarı', ['home_banner_url', 'home_banner_url_2', 'home_banner_url_3'])}
                    {imageGroup('Ana səhifə — ortada', ['home_mid_banner_1', 'home_mid_banner_2', 'home_mid_banner_3'], 'Şəkil yüklədikdən sonra "Toxunduqda" sətrindən elan və ya link seçin.')}
                    {imageGroup('Seçilmişlər', ['favorite_banner_1', 'favorite_banner_2', 'favorite_banner_3'])}
                    {imageGroup('Müqayisə', ['compare_banner_1', 'compare_banner_2', 'compare_banner_3'])}
                    {imageGroup('Veb — yan bannerlər', ['web_left_banner_url', 'web_right_banner_url'], 'Yalnız geniş ekranlarda (1024 px-dən böyük) göstərilir.')}

                    <Group title="Məcburi yeniləmə" footer="Tətbiqin versiyası bundan köhnədirsə, istifadəçiyə yeniləmə ekranı göstərilir.">
                        {textRow('required_app_version', '1.4.1', { keyboardType: 'numbers-and-punctuation' })}
                        {textRow('update_url', 'https://')}
                    </Group>
                </AdminScroll>
            )}
            <PickerSheet
                visible={!!pickingFor}
                title="Banner nəyi açsın?"
                options={[
                    { label: 'Heç nə açmasın', value: NO_LINK },
                    { label: '🔗 Link (sayt, Instagram, WhatsApp)', value: URL_LINK },
                    ...(targets || []),
                ]}
                selected={pickingFor ? valueOf(pickingFor) || NO_LINK : undefined}
                onSelect={(o) => {
                    if (!pickingFor) return;
                    const current = valueOf(pickingFor);
                    const keepUrl = !!current && !isListingTarget(current);
                    updateSetting(pickingFor, o.value === NO_LINK ? '' : o.value === URL_LINK ? (keepUrl ? current : 'https://') : o.value);
                }}
                onClose={() => setPickingFor(null)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    thumb: { width: 64, height: 40, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    imageLabel: { fontSize: 15, fontFamily: F.semibold },
    imageState: { fontSize: 12, fontFamily: F.medium, marginTop: 1 },
    iconBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    uploadBtn: { minWidth: 64, height: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
    uploadText: { fontSize: 14, fontFamily: F.semibold },
});
