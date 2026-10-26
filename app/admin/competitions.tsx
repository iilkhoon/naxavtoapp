import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Platform, KeyboardAvoidingView, Switch, Linking } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Plus, Trophy, Edit3, Trash2, UserX, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import { haptics } from '../../utils/haptics';
import {
    AdminHeader, AdminScroll, Group, GroupRow, FieldRow, TextArea, AdminButton, HeaderAction, Pill, EmptyView, LoadingView, useAdminColors, F, uploadPath,
} from '../../components/admin/AdminUI';

const EMPTY_FORM = {
    title: '',
    description: '',
    prize_image_url: '',
    story_image_url: '',
    instagram_account_url: 'https://instagram.com/',
    instagram_post_url: 'https://instagram.com/p/',
    is_active: true,
    winner_limit: '1',
    guaranteed_winners: '',
    max_participants: '',
    slogan: '',
};

type Confirm = { title: string; message: string; confirmText: string; destructive?: boolean; run: () => void } | null;

export default function AdminCompetitionsScreen() {
    const c = useAdminColors();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [competitions, setCompetitions] = useState<any[]>([]);

    const [formVisible, setFormVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [activeComp, setActiveComp] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [partLoading, setPartLoading] = useState(false);
    const [confirm, setConfirm] = useState<Confirm>(null);

    const fetchCompetitions = useCallback(async () => {
        const { data, error } = await supabase.from('competitions').select('*, competition_participants(count)').order('created_at', { ascending: false });
        // 42P01: the table does not exist yet in this project
        if (error && error.code !== '42P01') showToast('Xəta: ' + error.message, 'error');
        setCompetitions(error ? [] : data || []);
        setLoading(false);
        setRefreshing(false);
    }, [showToast]);

    useEffect(() => {
        const timer = setTimeout(fetchCompetitions, 0);
        return () => clearTimeout(timer);
    }, [fetchCompetitions]);

    const set = (key: keyof typeof EMPTY_FORM, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

    const fail = (message: string) => {
        haptics.error();
        showToast(message, 'error');
    };

    const openNew = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormVisible(true);
    };

    const openEdit = (comp: any) => {
        setEditingId(comp.id);
        setForm({
            title: comp.title || '',
            description: comp.description || '',
            prize_image_url: comp.prize_image_url || '',
            story_image_url: comp.story_image_url || '',
            instagram_account_url: comp.instagram_account_url || '',
            instagram_post_url: comp.instagram_post_url || '',
            is_active: !!comp.is_active,
            winner_limit: String(comp.winner_limit || 1),
            guaranteed_winners: (comp.guaranteed_winners || []).join('\n'),
            max_participants: comp.max_participants ? String(comp.max_participants) : '',
            slogan: comp.slogan || '',
        });
        setFormVisible(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) return fail('Başlıq daxil edin');
        setSaving(true);
        const payload: Record<string, any> = {
            title: form.title.trim(),
            description: form.description,
            prize_image_url: form.prize_image_url,
            story_image_url: form.story_image_url,
            instagram_account_url: form.instagram_account_url,
            instagram_post_url: form.instagram_post_url,
            is_active: form.is_active,
            winner_limit: parseInt(form.winner_limit, 10) || 1,
            guaranteed_winners: form.guaranteed_winners.split('\n').map((s) => s.trim()).filter(Boolean),
            max_participants: form.max_participants ? parseInt(form.max_participants, 10) : null,
            slogan: form.slogan || null,
        };
        // The end date is set once on creation; editing used to push it 10 days forward every time
        if (!editingId) payload.end_date = new Date(Date.now() + 86400000 * 10).toISOString();

        const { error } = editingId
            ? await supabase.from('competitions').update(payload).eq('id', editingId)
            : await supabase.from('competitions').insert([payload]);
        setSaving(false);
        if (error) return fail('Xəta: ' + error.message);
        haptics.success();
        showToast(editingId ? 'Yarışma yeniləndi' : 'Yarışma yaradıldı', 'success');
        setFormVisible(false);
        fetchCompetitions();
    };

    const pickImage = async (field: 'prize_image_url' | 'story_image_url') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8, base64: true });
            if (result.canceled || !result.assets?.[0]?.base64) return;
            setUploadingField(field);
            const asset = result.assets[0];
            const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
            const path = uploadPath('competitions/img', ext);
            const { error } = await supabase.storage.from('images').upload(path, decode(asset.base64!), { contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}` });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
            set(field, publicUrl);
            haptics.success();
        } catch (error: any) {
            fail(error.message || 'Şəkil yüklənmədi');
        } finally {
            setUploadingField(null);
        }
    };

    const toggleActive = async (comp: any) => {
        const next = !comp.is_active;
        setCompetitions((prev) => prev.map((x) => (x.id === comp.id ? { ...x, is_active: next } : x)));
        const { error } = await supabase.from('competitions').update({ is_active: next }).eq('id', comp.id);
        if (error) {
            setCompetitions((prev) => prev.map((x) => (x.id === comp.id ? { ...x, is_active: !next } : x)));
            fail('Status dəyişmədi');
        } else haptics.tap();
    };

    const fetchParticipants = useCallback(async (compId: string) => {
        setPartLoading(true);
        const { data, error } = await supabase
            .from('competition_participants')
            .select('*')
            .eq('competition_id', compId)
            .order('is_winner', { ascending: false })
            .order('created_at', { ascending: true });
        if (error) console.error(error);
        setParticipants(data || []);
        setPartLoading(false);
    }, []);

    const openParticipants = (comp: any) => {
        setActiveComp(comp);
        setParticipants([]);
        fetchParticipants(comp.id);
    };

    const setWinner = async (participant: any, isWinner: boolean) => {
        const { error } = await supabase.from('competition_participants').update({ is_winner: isWinner }).eq('id', participant.id);
        if (error) return fail('Xəta: ' + error.message);
        haptics.success();
        showToast(isWinner ? 'Qalib təsdiqləndi' : 'Qalib statusu götürüldü', isWinner ? 'success' : 'info');
        fetchParticipants(activeComp.id);
    };

    // Next winner: the guaranteed name pinned to this rank if any, otherwise a random
    // participant who is not reserved for another rank
    const pickRandomWinner = () => {
        if (!activeComp) return;
        const limit = activeComp.winner_limit || 1;
        const guaranteed: string[] = activeComp.guaranteed_winners || [];
        const winners = participants.filter((p) => p.is_winner);
        if (winners.length >= limit) return fail(`Qalib limiti ${limit} nəfərdir — artıq ${winners.length} qalib seçilib`);
        const nonWinners = participants.filter((p) => !p.is_winner);
        if (nonWinners.length === 0) return fail('Bütün iştirakçılar artıq qalibdir');

        const assigned = guaranteed[winners.length];
        let winner = assigned ? nonWinners.find((p) => p.instagram_username?.toLowerCase() === assigned.toLowerCase()) : null;
        if (!winner) {
            const reserved = (p: any) => guaranteed.some((g) => g && g.toLowerCase() === p.instagram_username?.toLowerCase());
            const pool = nonWinners.filter((p) => !reserved(p));
            const from = pool.length > 0 ? pool : nonWinners;
            winner = from[Math.floor(Math.random() * from.length)];
        }
        haptics.medium();
        setConfirm({
            title: `Qalib ${winners.length + 1} / ${limit}`,
            message: [`@${winner.instagram_username}`, winner.full_name, winner.phone].filter(Boolean).join('\n'),
            confirmText: 'Təsdiqlə',
            run: () => setWinner(winner, true),
        });
    };

    const deleteCompetition = (comp: any) => setConfirm({
        title: 'Yarışmanı silmək?',
        message: `“${comp.title}” və bütün iştirakçılar silinəcək.`,
        confirmText: 'Sil',
        destructive: true,
        run: async () => {
            const { error } = await supabase.from('competitions').delete().eq('id', comp.id);
            if (error) return fail('Silinmədi: ' + error.message);
            haptics.success();
            showToast('Yarışma silindi', 'success');
            fetchCompetitions();
        },
    });

    const imageField = (field: 'prize_image_url' | 'story_image_url', label: string) => (
        <View style={styles.imageRow}>
            <View style={[styles.imageThumb, { backgroundColor: c.fill }]}>
                {form[field] ? <ExpoImage source={{ uri: form[field] }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <ImageIcon size={18} color={c.textSecondary} />}
            </View>
            <Text style={[styles.imageLabel, { color: c.text }]}>{label}</Text>
            <TouchableOpacity onPress={() => pickImage(field)} disabled={!!uploadingField} style={[styles.uploadBtn, { backgroundColor: c.fill }]}>
                {uploadingField === field ? <ActivityIndicator size="small" color={c.text} /> : <Text style={[styles.uploadText, { color: c.primary }]}>{form[field] ? 'Dəyiş' : 'Yüklə'}</Text>}
            </TouchableOpacity>
        </View>
    );

    const winnerCount = participants.filter((p) => p.is_winner).length;

    return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
            <AdminHeader title="Yarışmalar" subtitle="Hədiyyəli Instagram yarışmaları" backLabel="Admin" right={<HeaderAction icon={Plus} label="Yeni yarışma" onPress={openNew} />} />
            {loading ? <LoadingView /> : (
                <AdminScroll refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCompetitions(); }} contentStyle={{ gap: 12 }}>
                    {competitions.length === 0 ? (
                        <EmptyView icon={Trophy} title="Yarışma yoxdur" subtitle="Yuxarıdakı + düyməsi ilə ilk yarışmanı yaradın." />
                    ) : competitions.map((comp) => (
                        <View key={comp.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.hairline }]}>
                            <View style={styles.cardHead}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={[styles.cardTitle, { color: c.text }]} numberOfLines={2}>{comp.title}</Text>
                                    <Text style={[styles.cardMeta, { color: c.textSecondary }]}>
                                        {formatDate(comp.created_at)} · {comp.competition_participants?.[0]?.count ?? 0}{comp.max_participants ? ` / ${comp.max_participants}` : ''} iştirakçı · {comp.winner_limit || 1} qalib
                                    </Text>
                                </View>
                                <Switch value={!!comp.is_active} onValueChange={() => toggleActive(comp)} trackColor={{ false: c.fill, true: c.success }} accessibilityLabel="Aktiv" />
                            </View>
                            <View style={[styles.cardActions, { borderTopColor: c.hairline }]}>
                                <TouchableOpacity style={styles.cardAction} onPress={() => { haptics.tap(); openParticipants(comp); }}>
                                    <Trophy size={16} color={c.primary} />
                                    <Text style={[styles.cardActionText, { color: c.primary }]}>İştirakçılar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cardIcon} onPress={() => { haptics.tap(); openEdit(comp); }} accessibilityLabel="Redaktə et">
                                    <Edit3 size={17} color={c.text} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cardIcon} onPress={() => { haptics.tap(); deleteCompetition(comp); }} accessibilityLabel="Sil">
                                    <Trash2 size={17} color={c.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </AdminScroll>
            )}

            {/* Create / edit */}
            <Modal visible={formVisible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={() => setFormVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <AdminHeader
                        title={editingId ? 'Yarışmanı redaktə et' : 'Yeni yarışma'}
                        backLabel="Bağla"
                        onBack={() => setFormVisible(false)}
                        modal
                    />
                    <AdminScroll>
                        <Group title="Əsas">
                            <FieldRow label="Başlıq" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Yarışma başlığı" />
                            <FieldRow label="Slogan" value={form.slogan} onChangeText={(v) => set('slogan', v)} placeholder="Ana səhifədə görünür" />
                            <FieldRow label="Qalib sayı" value={form.winner_limit} onChangeText={(v) => set('winner_limit', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="1" />
                            <FieldRow label="İştirakçı limiti" value={form.max_participants} onChangeText={(v) => set('max_participants', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Limitsiz" />
                            <GroupRow title="Aktiv" right={<Switch value={form.is_active} onValueChange={(v) => { haptics.tap(); set('is_active', v); }} trackColor={{ false: c.fill, true: c.success }} />} />
                        </Group>
                        <Group title="Açıqlama">
                            <TextArea value={form.description} onChangeText={(v) => set('description', v)} placeholder="Yarışma haqqında" />
                        </Group>
                        <Group title="Şəkillər">
                            {imageField('prize_image_url', 'Hədiyyə şəkli')}
                            {imageField('story_image_url', 'Story şəkli')}
                        </Group>
                        <Group title="Instagram">
                            <FieldRow label="Profil" value={form.instagram_account_url} onChangeText={(v) => set('instagram_account_url', v)} autoCapitalize="none" keyboardType="url" />
                            <FieldRow label="Post" value={form.instagram_post_url} onChangeText={(v) => set('instagram_post_url', v)} autoCapitalize="none" keyboardType="url" />
                        </Group>
                        <AdminButton title={editingId ? 'Yadda saxla' : 'Yarışma yarat'} onPress={handleSave} loading={saving} />
                    </AdminScroll>
                </KeyboardAvoidingView>
            </Modal>

            {/* Participants */}
            <Modal visible={!!activeComp} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={() => setActiveComp(null)}>
                <View style={{ flex: 1, backgroundColor: c.background }}>
                    <AdminHeader
                        title="İştirakçılar"
                        subtitle={activeComp ? `${winnerCount} / ${activeComp.winner_limit || 1} qalib seçilib` : undefined}
                        backLabel="Bağla"
                        onBack={() => setActiveComp(null)}
                        modal
                    />
                    {partLoading ? <LoadingView /> : (
                        <AdminScroll>
                            <AdminButton title="Qalib seç" icon={<Trophy size={17} color="#FFF" />} onPress={pickRandomWinner} disabled={participants.length === 0} style={{ marginBottom: 20 }} />
                            {participants.length === 0 ? (
                                <EmptyView icon={Trophy} title="Hələ iştirakçı yoxdur" />
                            ) : (
                                <Group footer={`${participants.length} iştirakçı`}>
                                    {participants.map((p) => (
                                        <GroupRow
                                            key={p.id}
                                            title={`@${p.instagram_username}`}
                                            subtitle={[p.full_name, p.phone, formatDate(p.created_at)].filter(Boolean).join(' · ')}
                                            chevron={false}
                                            onPress={p.phone ? () => Linking.openURL(`tel:${String(p.phone).replace(/\s/g, '')}`) : undefined}
                                            right={p.is_winner ? (
                                                <View style={styles.winnerRight}>
                                                    <Pill label="Qalib" tone="warning" />
                                                    <TouchableOpacity
                                                        onPress={() => setConfirm({
                                                            title: 'Qalib statusunu götürmək?',
                                                            message: `@${p.instagram_username}`,
                                                            confirmText: 'Götür',
                                                            destructive: true,
                                                            run: () => setWinner(p, false),
                                                        })}
                                                        hitSlop={8}
                                                        accessibilityLabel="Qalib statusunu götür"
                                                    >
                                                        <UserX size={17} color={c.primary} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : undefined}
                                        />
                                    ))}
                                </Group>
                            )}
                        </AdminScroll>
                    )}
                    {/* ConfirmModal is rendered inside the sheet so it appears above it */}
                    <ConfirmModal
                        visible={!!confirm && !!activeComp}
                        title={confirm?.title || ''}
                        message={confirm?.message || ''}
                        confirmText={confirm?.confirmText}
                        cancelText="Ləğv et"
                        isDestructive={confirm?.destructive}
                        onConfirm={() => { const run = confirm?.run; setConfirm(null); run?.(); }}
                        onCancel={() => setConfirm(null)}
                    />
                </View>
            </Modal>

            <ConfirmModal
                visible={!!confirm && !activeComp}
                title={confirm?.title || ''}
                message={confirm?.message || ''}
                confirmText={confirm?.confirmText}
                cancelText="Ləğv et"
                isDestructive={confirm?.destructive}
                onConfirm={() => { const run = confirm?.run; setConfirm(null); run?.(); }}
                onCancel={() => setConfirm(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    cardTitle: { fontSize: 16, fontFamily: F.semibold },
    cardMeta: { fontSize: 12, fontFamily: F.medium, marginTop: 3 },
    cardActions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
    cardAction: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44 },
    cardActionText: { fontSize: 15, fontFamily: F.semibold },
    cardIcon: { width: 48, height: 44, justifyContent: 'center', alignItems: 'center' },
    imageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    imageThumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    imageLabel: { flex: 1, fontSize: 15, fontFamily: F.semibold },
    uploadBtn: { minWidth: 64, height: 32, borderRadius: 16, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
    uploadText: { fontSize: 14, fontFamily: F.semibold },
    winnerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
