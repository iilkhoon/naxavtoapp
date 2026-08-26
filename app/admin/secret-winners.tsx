import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, ScrollView, Modal,
    Dimensions, StatusBar, Platform, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trophy, Check, X, Search, User, Crown, Star, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function SecretWinnersScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [competitions, setCompetitions] = useState<any[]>([]);
    const [selectedComp, setSelectedComp] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [partLoading, setPartLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [rankModalVisible, setRankModalVisible] = useState(false);
    const [activePart, setActivePart] = useState<any>(null);

    // Fetch active competitions
    const fetchCompetitions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('competitions')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompetitions(data || []);
        } catch (err: any) {
            showToast('Yarışmalar yüklənmədi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCompetitions(); }, []);

    const fetchParticipants = async (compId: string) => {
        setPartLoading(true);
        try {
            const { data, error } = await supabase
                .from('competition_participants')
                .select('*')
                .eq('competition_id', compId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setParticipants(data || []);
        } catch (err) { console.error(err); }
        finally { setPartLoading(false); }
    };

    const handleSelectComp = (comp: any) => {
        setSelectedComp(comp);
        fetchParticipants(comp.id);
    };

    const updateGuaranteedWinners = async (newWinners: string[]) => {
        if (!selectedComp) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('competitions')
                .update({ guaranteed_winners: newWinners })
                .eq('id', selectedComp.id);

            if (error) throw error;
            
            setSelectedComp({ ...selectedComp, guaranteed_winners: newWinners });
            showToast('Qalib siyahısı yeniləndi', 'success');
        } catch (err: any) {
            showToast('Xəta: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const assignRank = (username: string, rank: number) => {
        if (!username) return;
        let current = [...(selectedComp.guaranteed_winners || [])];
        
        // Remove existing occurrence if any (safer filter)
        current = current.filter(u => typeof u === 'string' && u.toLowerCase() !== username.toLowerCase());
        
        // Ensure we have enough space
        while (current.length < rank) {
            current.push(""); // Placeholder
        }
        
        // Place at new rank
        current[rank - 1] = username;
        
        // Cleanup empty/invalid values from the end
        while (current.length > 0 && (!current[current.length - 1] || current[current.length - 1] === "")) {
            current.pop();
        }

        updateGuaranteedWinners(current);
    };

    const removeRank = (username: string) => {
        if (!username) return;
        const current = [...(selectedComp.guaranteed_winners || [])];
        const updated = current.map(u => (typeof u === 'string' && u.toLowerCase() === username.toLowerCase()) ? "" : u);
        
        // Cleanup end
        while (updated.length > 0 && (!updated[updated.length - 1] || updated[updated.length - 1] === "")) {
            updated.pop();
        }
        
        updateGuaranteedWinners(updated);
    };

    const filteredParticipants = participants.filter(p => 
        (p.instagram_username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRank = (username: string) => {
        if (!username) return null;
        const list = selectedComp?.guaranteed_winners || [];
        const idx = list.findIndex((u: any) => typeof u === 'string' && u.toLowerCase() === username.toLowerCase());
        return idx !== -1 ? idx + 1 : null;
    };

    const CompetitionItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={[styles.compCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelectComp(item)}
        >
            <View style={styles.compInfo}>
                <Trophy size={20} color="#FFD700" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.compTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.compSub, { color: colors.textSecondary }]}>
                        {item.guaranteed_winners?.filter((u:any) => u && u !== "").length || 0} seçilmiş qalib
                    </Text>
                </View>
                <ArrowLeft size={20} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
        </TouchableOpacity>
    );

    const openRankModal = (part: any) => {
        setActivePart(part);
        setRankModalVisible(true);
    };

    const ParticipantItem = ({ item }: { item: any }) => {
        const rank = getRank(item.instagram_username);
        
        return (
            <TouchableOpacity 
                style={[styles.partCard, { backgroundColor: colors.card, borderColor: rank ? '#FFD700' : colors.border }]}
                onPress={() => openRankModal(item)}
            >
                <View style={styles.partAvatar}>
                    <User size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.partName, { color: colors.text }]}>@{item.instagram_username}</Text>
                    <Text style={[styles.partSub, { color: colors.textSecondary }]}>{item.full_name || 'Adsız'}</Text>
                </View>
                
                {rank ? (
                    <View style={styles.selectedRankBadge}>
                        <Text style={styles.selectedRankText}>{rank}. Qalib</Text>
                    </View>
                ) : (
                    <View style={[styles.selectBtn, { borderColor: colors.border }]}>
                        <Text style={[styles.selectBtnText, { color: colors.textSecondary }]}>Seç</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => selectedComp ? setSelectedComp(null) : router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {selectedComp ? 'Qalibləri Seç' : 'Gizli Qalib Paneli'}
                </Text>
                {selectedComp ? (
                    <TouchableOpacity onPress={() => updateGuaranteedWinners([])} style={styles.backBtn}>
                        <Trash2 size={24} color="#EF4444" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : !selectedComp ? (
                <FlatList
                    data={competitions}
                    keyExtractor={item => item.id}
                    renderItem={CompetitionItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Trophy size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aktiv yarışma yoxdur</Text>
                        </View>
                    }
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchInputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Search size={18} color={colors.textSecondary} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="İştirakçı axtar..."
                                placeholderTextColor={colors.placeholder}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    {partLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={filteredParticipants}
                            keyExtractor={item => item.id}
                            renderItem={ParticipantItem}
                            contentContainerStyle={styles.list}
                            initialNumToRender={15}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <User size={48} color={colors.textSecondary} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>İştirakçı tapılmadı</Text>
                                </View>
                            }
                        />
                    )}
                    
                    {saving && (
                        <View style={styles.savingOverlay}>
                            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                            <ActivityIndicator color="#FFF" />
                        </View>
                    )}

                    {/* Rank Selection Modal */}
                    <Modal visible={rankModalVisible} transparent animationType="fade" onRequestClose={() => setRankModalVisible(false)}>
                        <TouchableOpacity 
                            style={styles.modalOverlay} 
                            activeOpacity={1} 
                            onPress={() => setRankModalVisible(false)}
                        >
                            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                            <MotiView 
                                from={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                style={[styles.rankModal, { backgroundColor: colors.card }]}
                            >
                                <View style={styles.rankModalHeader}>
                                    <Text style={[styles.rankModalTitle, { color: colors.text }]}>
                                        @{activePart?.instagram_username}
                                    </Text>
                                    <Text style={styles.rankModalSub}>Yer seçin və ya seçimi ləğv edin</Text>
                                </View>
                                
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {Array.from({ length: selectedComp.winner_limit || 1 }, (_, i) => i + 1).map(r => {
                                        const isSelected = getRank(activePart?.instagram_username) === r;
                                        return (
                                            <TouchableOpacity 
                                                key={r} 
                                                style={[styles.rankRow, { borderBottomColor: colors.border }]}
                                                onPress={() => {
                                                    isSelected ? removeRank(activePart.instagram_username) : assignRank(activePart.instagram_username, r);
                                                    setRankModalVisible(false);
                                                }}
                                            >
                                                <Text style={[styles.rankRowText, { color: colors.text }]}>{r}. Qalib</Text>
                                                {isSelected && <Check size={20} color="#FFD700" />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                                
                                <TouchableOpacity 
                                    style={[styles.cancelBtn, { marginTop: 12 }]}
                                    onPress={() => {
                                        removeRank(activePart.instagram_username);
                                        setRankModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cancelBtnText}>Seçimi Təmizlə</Text>
                                </TouchableOpacity>
                            </MotiView>
                        </TouchableOpacity>
                    </Modal>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, gap: 12 },
    compCard: {
        padding: 16, borderRadius: 16, borderWidth: 1,
    },
    compInfo: { flexDirection: 'row', alignItems: 'center' },
    compTitle: { fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
    compSub: { fontSize: 13, fontFamily: 'RethinkSans_400Regular', marginTop: 2 },
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },
    
    searchContainer: { padding: 16, paddingBottom: 8 },
    searchInputWrapper: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
        height: 48, borderRadius: 12, borderWidth: 1, gap: 10
    },
    searchInput: { flex: 1, fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
    
    partCard: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        borderRadius: 16, borderWidth: 1,
    },
    partAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,199,190,0.1)', justifyContent: 'center', alignItems: 'center'
    },
    partName: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
    partSub: { fontSize: 12, fontFamily: 'RethinkSans_400Regular' },
    selectedRankBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    },
    selectedRankText: { color: '#000', fontSize: 12, fontFamily: 'RethinkSans_800ExtraBold' },
    selectBtn: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
    },
    selectBtnText: { fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },
    savingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
    },
    
    // Rank Modal
    modalOverlay: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20
    },
    rankModal: {
        width: '100%', maxWidth: 320, borderRadius: 24, padding: 20,
        boxShadow: '0px 10px 20px rgba(0,0,0,0.3)', elevation: 10,
    },
    rankModalHeader: { marginBottom: 16 },
    rankModalTitle: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold', textAlign: 'center' },
    rankModalSub: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
    rankRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, borderBottomWidth: 1,
    },
    rankRowText: { fontSize: 15, fontFamily: 'RethinkSans_600SemiBold' },
    cancelBtn: { padding: 14, alignItems: 'center' },
    cancelBtnText: { color: '#EF4444', fontSize: 14, fontFamily: 'RethinkSans_700Bold' },
});
