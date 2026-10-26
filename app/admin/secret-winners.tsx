import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trophy, Check, Trash2, User } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { haptics } from '../../utils/haptics';
import {
    AdminHeader, AdminScroll, Group, GroupRow, HeaderAction, SearchBar, Pill, EmptyView, LoadingView, useAdminColors, F,
} from '../../components/admin/AdminUI';

const sameUser = (a: unknown, b: string) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();

// Hidden screen (five taps on the admin version line): pin guaranteed winners of a competition
export default function SecretWinnersScreen() {
    const c = useAdminColors();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [selectedComp, setSelectedComp] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [partLoading, setPartLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [activePart, setActivePart] = useState<any>(null);
    const [confirmClear, setConfirmClear] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase.from('competitions').select('*').eq('is_active', true).order('created_at', { ascending: false });
            if (cancelled) return;
            if (error) showToast('Yarışmalar yüklənmədi', 'error');
            else setCompetitions(data || []);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [showToast]);

    const openCompetition = useCallback(async (comp: any) => {
        setSelectedComp(comp);
        setSearchQuery('');
        setPartLoading(true);
        const { data, error } = await supabase.from('competition_participants').select('*').eq('competition_id', comp.id).order('created_at', { ascending: false });
        if (error) console.error(error);
        setParticipants(data || []);
        setPartLoading(false);
    }, []);

    const saveWinners = async (winners: string[]) => {
        if (!selectedComp) return;
        setSaving(true);
        const { error } = await supabase.from('competitions').update({ guaranteed_winners: winners }).eq('id', selectedComp.id);
        setSaving(false);
        if (error) {
            haptics.error();
            showToast('Xəta: ' + error.message, 'error');
            return;
        }
        haptics.success();
        setSelectedComp({ ...selectedComp, guaranteed_winners: winners });
        setCompetitions((prev) => prev.map((x) => (x.id === selectedComp.id ? { ...x, guaranteed_winners: winners } : x)));
        showToast('Qalib siyahısı yeniləndi', 'success');
    };

    // Drop trailing empty slots so the stored list stays compact
    const trim = (list: string[]) => {
        const out = [...list];
        while (out.length > 0 && !out[out.length - 1]) out.pop();
        return out;
    };

    const assignRank = (username: string, rank: number) => {
        const current = (selectedComp.guaranteed_winners || []).map((u: unknown) => (sameUser(u, username) ? '' : u));
        while (current.length < rank) current.push('');
        current[rank - 1] = username;
        saveWinners(trim(current));
    };

    const removeRank = (username: string) => {
        saveWinners(trim((selectedComp.guaranteed_winners || []).map((u: unknown) => (sameUser(u, username) ? '' : u))));
    };

    const getRank = (username: string) => {
        if (!username || !selectedComp) return null;
        const idx = (selectedComp.guaranteed_winners || []).findIndex((u: unknown) => sameUser(u, username));
        return idx === -1 ? null : idx + 1;
    };

    const q = searchQuery.trim().toLowerCase();
    const filtered = participants.filter((p) => !q || (p.instagram_username || '').toLowerCase().includes(q) || (p.full_name || '').toLowerCase().includes(q));
    const winnerCount = (comp: any) => (comp.guaranteed_winners || []).filter((u: unknown) => !!u).length;

    if (loading) return <LoadingView />;

    if (!selectedComp) {
        return (
            <View style={{ flex: 1, backgroundColor: c.background }}>
                <AdminHeader title="Qalib paneli" subtitle="Aktiv yarışmalar" backLabel="Admin" />
                <AdminScroll>
                    {competitions.length === 0 ? (
                        <EmptyView icon={Trophy} title="Aktiv yarışma yoxdur" />
                    ) : (
                        <Group>
                            {competitions.map((comp) => (
                                <GroupRow
                                    key={comp.id}
                                    icon={Trophy}
                                    tint="#F4B400"
                                    title={comp.title}
                                    subtitle={`${winnerCount(comp)} / ${comp.winner_limit || 1} qalib seçilib`}
                                    onPress={() => openCompetition(comp)}
                                />
                            ))}
                        </Group>
                    )}
                </AdminScroll>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
            <AdminHeader
                title={selectedComp.title}
                subtitle={`${winnerCount(selectedComp)} / ${selectedComp.winner_limit || 1} qalib seçilib`}
                backLabel="Yarışmalar"
                onBack={() => setSelectedComp(null)}
                right={saving ? <ActivityIndicator color={c.primary} /> : <HeaderAction icon={Trash2} label="Hamısını təmizlə" onPress={() => setConfirmClear(true)} />}
            />
            <View style={styles.controls}>
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="İştirakçı axtar" />
            </View>
            {partLoading ? <LoadingView /> : (
                <AdminScroll contentStyle={{ paddingTop: 4 }}>
                    {filtered.length === 0 ? (
                        <EmptyView icon={User} title="İştirakçı tapılmadı" />
                    ) : (
                        <Group footer={`${participants.length} iştirakçı`}>
                            {filtered.map((p) => {
                                const rank = getRank(p.instagram_username);
                                return (
                                    <GroupRow
                                        key={p.id}
                                        title={`@${p.instagram_username}`}
                                        subtitle={p.full_name || 'Adsız'}
                                        right={rank ? <Pill label={`${rank}. qalib`} tone="warning" /> : undefined}
                                        onPress={() => setActivePart(p)}
                                    />
                                );
                            })}
                        </Group>
                    )}
                </AdminScroll>
            )}

            {/* Rank action sheet */}
            <Modal visible={!!activePart} transparent animationType="fade" onRequestClose={() => setActivePart(null)}>
                <View style={styles.overlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setActivePart(null)} />
                    <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom + 12 }]}>
                        <Text style={[styles.sheetTitle, { color: c.text }]}>@{activePart?.instagram_username}</Text>
                        <Text style={[styles.sheetSub, { color: c.textSecondary }]}>Yeri seçin</Text>
                        <View style={[styles.sheetList, { borderColor: c.hairline }]}>
                            {Array.from({ length: selectedComp.winner_limit || 1 }, (_, i) => i + 1).map((r) => {
                                const selected = activePart && getRank(activePart.instagram_username) === r;
                                return (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.sheetRow, r > 1 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.hairline }]}
                                        onPress={() => {
                                            haptics.tap();
                                            if (selected) removeRank(activePart.instagram_username);
                                            else assignRank(activePart.instagram_username, r);
                                            setActivePart(null);
                                        }}
                                    >
                                        <Text style={[styles.sheetRowText, { color: c.text }]}>{r}. qalib</Text>
                                        {selected && <Check size={18} color={c.primary} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {activePart && getRank(activePart.instagram_username) && (
                            <TouchableOpacity
                                style={[styles.sheetButton, { backgroundColor: c.accentSoft }]}
                                onPress={() => { removeRank(activePart.instagram_username); setActivePart(null); }}
                            >
                                <Text style={[styles.sheetButtonText, { color: c.primary }]}>Seçimi təmizlə</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.sheetButton, { backgroundColor: c.fill }]} onPress={() => setActivePart(null)}>
                            <Text style={[styles.sheetButtonText, { color: c.text }]}>Bağla</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ConfirmModal
                visible={confirmClear}
                title="Bütün qalibləri təmizləmək?"
                message="Bu yarışma üçün seçilmiş bütün qaliblər silinəcək."
                onConfirm={() => { setConfirmClear(false); saveWinners([]); }}
                onCancel={() => setConfirmClear(false)}
                confirmText="Təmizlə"
                cancelText="Ləğv et"
                isDestructive
            />
        </View>
    );
}

const styles = StyleSheet.create({
    controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 18, gap: 10 },
    sheetTitle: { fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
    sheetSub: { fontSize: 13, fontFamily: F.medium, textAlign: 'center', marginTop: -6 },
    sheetList: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', maxHeight: 320 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 50, paddingHorizontal: 16 },
    sheetRowText: { fontSize: 16, fontFamily: F.semibold },
    sheetButton: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    sheetButtonText: { fontSize: 16, fontFamily: F.semibold },
});
