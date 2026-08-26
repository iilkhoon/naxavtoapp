import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, ScrollView, Modal,
    Dimensions, StatusBar, Platform, KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Edit, Trophy, Check, X, RefreshCcw, UserCheck, UserX, ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Image as ExpoImage } from 'expo-image';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { formatDate } from '../../lib/utils';
import { Image as LucideImage } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AdminCompetitionsScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Form Modal States
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
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
    });

    // Winners Modal States
    const [winnerModalVisible, setWinnerModalVisible] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [partLoading, setPartLoading] = useState(false);
    const [activeComp, setActiveComp] = useState<any>(null);

    const fetchCompetitions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('competitions')
                .select('*, competition_participants(count)')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.code === '42P01') { setCompetitions([]); return; }
                throw error;
            }
            setCompetitions(data || []);
        } catch (err: any) {
            showToast('Xəta: ' + err.message, 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchCompetitions(); }, []);
    const onRefresh = useCallback(() => { setRefreshing(true); fetchCompetitions(); }, []);

    const handleSave = async () => {
        if (!formData.title) { Alert.alert('Xəta', 'Başlıq daxil edilməlidir.'); return; }

        setSubmitLoading(true);
        try {
            // Parse guaranteed winners list from multiline text
            const guaranteedList = formData.guaranteed_winners
                .split('\n')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const payload = {
                title: formData.title,
                description: formData.description,
                prize_image_url: formData.prize_image_url,
                story_image_url: formData.story_image_url,
                instagram_account_url: formData.instagram_account_url,
                instagram_post_url: formData.instagram_post_url,
                is_active: formData.is_active,
                winner_limit: parseInt(formData.winner_limit) || 1,
                guaranteed_winners: guaranteedList,
                max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
                slogan: formData.slogan || null,
                end_date: new Date(Date.now() + 86400000 * 10).toISOString(),
            };

            if (editingId) {
                const { error } = await supabase.from('competitions').update(payload).eq('id', editingId);
                if (error) throw error;
                showToast('Yarışma yeniləndi.', 'success');
            } else {
                const { error } = await supabase.from('competitions').insert([payload]);
                if (error) throw error;
                showToast('Yarışma yaradıldı.', 'success');
            }

            setModalVisible(false);
            fetchCompetitions();
        } catch (err: any) {
            Alert.alert('Xəta', err.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    const openEditModal = (comp: any) => {
        setEditingId(comp.id);
        setFormData({
            title: comp.title || '',
            description: comp.description || '',
            prize_image_url: comp.prize_image_url || '',
            story_image_url: comp.story_image_url || '',
            instagram_account_url: comp.instagram_account_url || '',
            instagram_post_url: comp.instagram_post_url || '',
            is_active: comp.is_active,
            winner_limit: String(comp.winner_limit || 1),
            guaranteed_winners: (comp.guaranteed_winners || []).join('\n'),
            max_participants: comp.max_participants ? String(comp.max_participants) : '',
            slogan: comp.slogan || '',
        });
        setModalVisible(true);
    };

    const openNewModal = () => {
        setEditingId(null);
        setFormData({
            title: '', description: '',
            prize_image_url: '', story_image_url: '',
            instagram_account_url: 'https://instagram.com/',
            instagram_post_url: 'https://instagram.com/p/',
            is_active: true, winner_limit: '1', guaranteed_winners: '', max_participants: '', slogan: '',
        });
        setModalVisible(true);
    };

    const deleteCompetition = async (item: any) => {
        Alert.alert(
            'Yarışmanı Sil',
            `"${item.title}" yarışmasını silmək istədiyinizə əminsiniz? Bütün iştirakçı məlumatları da silinəcək.`,
            [
                { text: 'Ləğv et', style: 'cancel' },
                {
                    text: 'Sil', style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase.from('competitions').delete().eq('id', item.id);
                        if (error) { showToast('Silmə xətası', 'error'); }
                        else { showToast('Yarışma silindi', 'success'); fetchCompetitions(); }
                    },
                },
            ]
        );
    };

    const pickImage = async (field: 'prize_image_url' | 'story_image_url') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, quality: 0.8, base64: true,
            });
            if (!result.canceled && result.assets && result.assets[0].base64) {
                setSubmitLoading(true);
                const base64Data = result.assets[0].base64;
                const ext = result.assets[0].uri.split('.').pop() || 'jpg';
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(`competitions/${fileName}`, decode(base64Data), {
                        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`, upsert: false
                    });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`competitions/${fileName}`);
                setFormData(prev => ({ ...prev, [field]: publicUrl }));
                showToast('Şəkil uğurla yükləndi', 'success');
            }
        } catch (error: any) {
            Alert.alert('Xəta', error.message || 'Şəkil yüklənərkən xəta baş verdi');
        } finally {
            setSubmitLoading(false);
        }
    };

    const toggleStatus = async (comp: any) => {
        try {
            const { error } = await supabase.from('competitions').update({ is_active: !comp.is_active }).eq('id', comp.id);
            if (error) throw error;
            fetchCompetitions();
        } catch (err) { console.log(err); }
    };

    const openWinnersModal = async (comp: any) => {
        setActiveComp(comp);
        setWinnerModalVisible(true);
        fetchParticipants(comp.id);
    };

    const fetchParticipants = async (compId: string) => {
        setPartLoading(true);
        try {
            const { data, error } = await supabase
                .from('competition_participants')
                .select('*')
                .eq('competition_id', compId)
                .order('is_winner', { ascending: false })
                .order('created_at', { ascending: true });
            if (error) throw error;
            setParticipants(data || []);
        } catch (err) { console.log(err); }
        finally { setPartLoading(false); }
    };

    const pickRandomWinner = async () => {
        if (!activeComp) return;
        const limit = activeComp.winner_limit || 1;
        const guaranteed: string[] = activeComp.guaranteed_winners || [];
        const currentWinners = participants.filter(p => p.is_winner);

        if (currentWinners.length >= limit) {
            Alert.alert('Diqqət', `Bu yarışmanın qalib limiti ${limit} nəfərdir. Artıq ${currentWinners.length} qalib seçilib.`);
            return;
        }

        // Non-winners eligible to be chosen
        const nonWinners = participants.filter(p => !p.is_winner);
        if (nonWinners.length === 0) {
            Alert.alert('Diqqət', 'Bütün iştirakçılar artıq qalib seçilib.');
            return;
        }

        // 1. Check if there is a guaranteed winner assigned specifically for this next rank index
        const nextRankIdx = currentWinners.length;
        const assignedUsername = guaranteed[nextRankIdx];
        
        let winner: any = null;
        let isGuaranteed = false;

        if (assignedUsername && assignedUsername !== "") {
            // Find this specifically assigned person in participants
            winner = participants.find(p => 
                p.instagram_username?.toLowerCase() === assignedUsername.toLowerCase() && !p.is_winner
            );
            if (winner) isGuaranteed = true;
        }

        // 2. If no specific winner for this exactly matched rank, fallback to random from pool of UNASSIGNED participants
        if (!winner) {
            // EXCLUDE anyone who is already in the guaranteed list (to save them for their specific ranks)
            const unassignedPool = nonWinners.filter(p => 
                !guaranteed.some(g => g && g.toLowerCase() === p.instagram_username?.toLowerCase())
            );
            
            // If everyone is assigned or we have enough unassigned, choose from unassigned
            const pool = unassignedPool.length > 0 ? unassignedPool : nonWinners;
            winner = pool[Math.floor(Math.random() * pool.length)];
            isGuaranteed = guaranteed.some(g => g && g.toLowerCase() === winner.instagram_username?.toLowerCase());
        }

        Alert.alert(
            `🏆 Qalib Seçildi!`,
            `${isGuaranteed ? '⭐ Əvvəlcədən seçilmiş qalib!\n\n' : ''}İstifadəçi adı: @${winner.instagram_username}\n${winner.full_name ? `Ad: ${winner.full_name}\n` : ''}${winner.phone ? `Telefon: ${winner.phone}` : ''}\n\nQalib ${currentWinners.length + 1} / ${limit}`,
            [
                { text: 'Ləğv et', style: 'cancel' },
                {
                    text: 'Təsdiqlə', onPress: async () => {
                        try {
                            await supabase.from('competition_participants').update({ is_winner: true }).eq('id', winner.id);
                            showToast('Qalib təsdiqləndi! 🏆', 'success');
                            fetchParticipants(activeComp.id);
                            // Refresh activeComp for accurate counts
                            fetchCompetitions();
                        } catch (e) { console.log(e); }
                    }
                }
            ]
        );
    };

    const revokeWinner = async (participant: any) => {
        Alert.alert(
            'Qalibi Ləğv Et',
            `@${participant.instagram_username} üçün qalib statusunu ləğv etmək istəyirsiniz?`,
            [
                { text: 'Xeyr', style: 'cancel' },
                {
                    text: 'Bəli', style: 'destructive', onPress: async () => {
                        try {
                            await supabase.from('competition_participants').update({ is_winner: false }).eq('id', participant.id);
                            showToast('Qalib statusu ləğv edildi.', 'info');
                            fetchParticipants(activeComp.id);
                        } catch (e) { console.log(e); }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 50, type: 'timing', duration: 400 }}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                        {formatDate(item.created_at)}
                        {' • '}Qalib limiti: {item.winner_limit || 1}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'RethinkSans_500Medium' }}>
                            {'\uD83D\uDC65'} {item.competition_participants?.[0]?.count ?? 0} istirakci
                            {item.max_participants ? ` / ${item.max_participants}` : ''}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: item.is_active ? '#22C55E20' : '#EF444420' }]}
                    onPress={() => toggleStatus(item)}
                >
                    <Text style={{ color: item.is_active ? '#22C55E' : '#EF4444', fontSize: 12, fontWeight: '700' }}>
                        {item.is_active ? 'AKTİV' : 'PASSİV'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openWinnersModal(item)}>
                    <Trophy size={18} color="#FFD700" />
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>İştirakçılar / Qalib Seç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => openEditModal(item)}>
                    <Edit size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#EF444415' }]} onPress={() => deleteCompetition(item)}>
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </MotiView>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Yarışmalar</Text>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={openNewModal}>
                    <Plus size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={competitions}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.empty}>
                            <Trophy size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Heç bir yarışma tapılmadı.</Text>
                        </View>
                    ) : <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
                }
            />

            {/* Add / Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <X size={22} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {editingId ? 'Yarışmanı Redaktə Et' : 'Yeni Yarışma Yarat'}
                            </Text>
                            <TouchableOpacity
                                style={[styles.saveHeaderBtn, { backgroundColor: colors.primary }]}
                                onPress={handleSave}
                                disabled={submitLoading}
                            >
                                {submitLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#FFF', fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>Saxla</Text>}
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Əsas Məlumatlar</Text>
                            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Başlıq</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                    value={formData.title}
                                    onChangeText={(t) => setFormData({ ...formData, title: t })}
                                    placeholder="Yarışma başlığı"
                                    placeholderTextColor={colors.placeholder}
                                />

                                <Text style={[styles.label, { color: colors.textSecondary }]}>Slogan (Ana Səhifədə Görünür)</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                    value={formData.slogan}
                                    onChangeText={(t) => setFormData({ ...formData, slogan: t })}
                                    placeholder="Hədiyyələr qazanmaq üçün qatıl!"
                                    placeholderTextColor={colors.placeholder}
                                />

                                <Text style={[styles.label, { color: colors.textSecondary }]}>Açıqlama</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { color: colors.text, borderBottomColor: colors.border }]}
                                    value={formData.description}
                                    onChangeText={(t) => setFormData({ ...formData, description: t })}
                                    placeholder="Yarışma haqqında..."
                                    placeholderTextColor={colors.placeholder}
                                    multiline numberOfLines={3}
                                />

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Qalib Limiti</Text>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                            value={formData.winner_limit}
                                            onChangeText={(t) => setFormData({ ...formData, winner_limit: t.replace(/[^0-9]/g, '') })}
                                            keyboardType="number-pad"
                                            placeholder="1"
                                            placeholderTextColor={colors.placeholder}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>İştirakçı Sayı</Text>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                            value={formData.max_participants}
                                            onChangeText={(t) => setFormData({ ...formData, max_participants: t.replace(/[^0-9]/g, '') })}
                                            keyboardType="number-pad"
                                            placeholder="Limitsiz"
                                            placeholderTextColor={colors.placeholder}
                                        />
                                    </View>
                                </View>
                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 8 }]}>Status</Text>
                                <TouchableOpacity
                                    style={[styles.toggleBtn, { backgroundColor: formData.is_active ? '#22C55E20' : '#EF444420', borderColor: formData.is_active ? '#22C55E' : '#EF4444' }]}
                                    onPress={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                >
                                    <Text style={{ color: formData.is_active ? '#22C55E' : '#EF4444', fontFamily: 'RethinkSans_700Bold', fontSize: 14 }}>
                                        {formData.is_active ? '● AKTİV' : '○ PASSİV'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Section: Şəkillər */}
                            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Şəkillər</Text>
                            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Hədiyyə Cover Şəkli</Text>
                                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, color: colors.text, borderBottomColor: colors.border }]}
                                        value={formData.prize_image_url}
                                        onChangeText={(t) => setFormData({ ...formData, prize_image_url: t })}
                                        placeholder="https://..."
                                        placeholderTextColor={colors.placeholder}
                                    />
                                    <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.primary }]} onPress={() => pickImage('prize_image_url')}>
                                        <LucideImage size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                {formData.prize_image_url ? (
                                    <ExpoImage source={{ uri: formData.prize_image_url }} style={styles.previewImage} contentFit="cover" />
                                ) : null}

                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Instagram Story Şəkli</Text>
                                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, color: colors.text, borderBottomColor: colors.border }]}
                                        value={formData.story_image_url}
                                        onChangeText={(t) => setFormData({ ...formData, story_image_url: t })}
                                        placeholder="https://..."
                                        placeholderTextColor={colors.placeholder}
                                    />
                                    <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: colors.primary }]} onPress={() => pickImage('story_image_url')}>
                                        <LucideImage size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                {formData.story_image_url ? (
                                    <ExpoImage source={{ uri: formData.story_image_url }} style={styles.previewImage} contentFit="cover" />
                                ) : null}
                            </View>

                            {/* Section: Instagram */}
                            <Text style={[styles.sectionLabel, { color: colors.primary }]}>Instagram Linklər</Text>
                            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>İzləniləcək Profil URL</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                    value={formData.instagram_account_url}
                                    onChangeText={(t) => setFormData({ ...formData, instagram_account_url: t })}
                                    autoCapitalize="none"
                                    placeholderTextColor={colors.placeholder}
                                />

                                <Text style={[styles.label, { color: colors.textSecondary }]}>Bəyəniləcək Post URL</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                                    value={formData.instagram_post_url}
                                    onChangeText={(t) => setFormData({ ...formData, instagram_post_url: t })}
                                    autoCapitalize="none"
                                    placeholderTextColor={colors.placeholder}
                                />
                            </View>

                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Participants & Winners Modal */}
            <Modal visible={winnerModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setWinnerModalVisible(false)}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                        <TouchableOpacity onPress={() => setWinnerModalVisible(false)} style={styles.closeBtn}>
                            <X size={22} color={colors.text} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>İştirakçılar</Text>
                            {activeComp && (
                                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>
                                    Qalib: {participants.filter(p => p.is_winner).length} / {activeComp.winner_limit || 1}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.saveHeaderBtn, { backgroundColor: '#FFD700' }]}
                            onPress={pickRandomWinner}
                        >
                            <Trophy size={14} color="#000" />
                            <Text style={{ color: '#000', fontFamily: 'RethinkSans_700Bold', fontSize: 12, marginLeft: 4 }}>
                                Qalib Seç
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {partLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={participants}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16, gap: 12 }}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 60 }}>
                                    <Trophy size={40} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: 'RethinkSans_600SemiBold' }}>
                                        Heç kim iştirak etməyib.
                                    </Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={[styles.partCard, {
                                    backgroundColor: item.is_winner ? '#FFD70015' : colors.card,
                                    borderColor: item.is_winner ? '#FFD700' : colors.border
                                }]}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={[styles.partName, { color: colors.text }]}>@{item.instagram_username}</Text>
                                            {item.is_winner && (
                                                <View style={styles.winnerBadge}>
                                                    <Trophy size={10} color="#FFD700" />
                                                    <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700', marginLeft: 2 }}>QALİB</Text>
                                                </View>
                                            )}
                                        </View>
                                        {item.full_name && (
                                            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'RethinkSans_500Medium' }}>
                                                {item.full_name}
                                            </Text>
                                        )}
                                        {item.phone && (
                                            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'RethinkSans_500Medium' }}>
                                                📞 {item.phone}
                                            </Text>
                                        )}
                                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                                            {formatDate(item.created_at)}
                                        </Text>
                                    </View>
                                    {item.is_winner && (
                                        <TouchableOpacity
                                            style={[styles.revokeBtn, { backgroundColor: '#EF444420' }]}
                                            onPress={() => revokeWinner(item)}
                                        >
                                            <UserX size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, height: 60, borderBottomWidth: 1,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold' },
    addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, gap: 16, paddingBottom: 40 },
    card: { padding: 16, borderRadius: 20, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    cardTitle: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginBottom: 4 },
    cardSubtitle: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtnText: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold' },
    iconBtn: { padding: 10, borderRadius: 12 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },

    // Modal
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        borderBottomWidth: 1, gap: 12,
    },
    modalTitle: { fontSize: 17, fontFamily: 'RethinkSans_800ExtraBold' },
    closeBtn: { padding: 4 },
    saveHeaderBtn: {
        flexDirection: 'row',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
        alignItems: 'center',
    },
    modalScroll: { padding: 16 },

    sectionLabel: {
        fontSize: 12, fontFamily: 'RethinkSans_700Bold',
        letterSpacing: 1, marginBottom: 10, marginTop: 20, marginLeft: 4,
    },
    inputCard: {
        borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 4,
    },
    label: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 6, marginTop: 4 },
    input: {
        paddingVertical: 8, borderBottomWidth: 1,
        fontSize: 15, fontFamily: 'RethinkSans_500Medium',
        marginBottom: 4,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    toggleBtn: {
        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
        borderWidth: 1.5, alignItems: 'center', marginTop: 4,
    },
    uploadBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: '100%', height: 130, borderRadius: 12, marginTop: 10, backgroundColor: '#f0f0f0' },

    // Participants
    partCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 14, borderRadius: 16, borderWidth: 1,
    },
    partName: { fontSize: 15, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
    winnerBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD70025',
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    },
    revokeBtn: { padding: 10, borderRadius: 12 },
});
