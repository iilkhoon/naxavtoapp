import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal,
    FlatList, Dimensions, Pressable, Platform, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getFavorites } from '../../lib/favorites';
import { MotiView } from 'moti';
import {
    Plus, X, Check, AlertCircle, Banknote, Calendar, Gauge, Zap, Fuel, Car, Palette, Settings, Activity, Globe, MapPin, CreditCard, ArrowLeftRight
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { WebFooter } from '../../components/WebFooter.web';
import { BannerSlider } from '../../components/BannerSlider';

type CarItem = {
    id: string; make: string; model: string; year: number; price: number;
    currency: string; image_url: string; mileage: number; engine: string; horsepower?: number;
    location: string; is_credit: boolean; is_barter: boolean;
    body_type: string; color: string; gearbox: string; transmission: string;
    market: string; is_new: boolean; fuel_type: string;
};

type SelectionSide = 'left' | 'right' | null;

export default function WebCompareScreen() {
    const { colors, isDark } = useTheme();
    const { settings } = useSettings();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [favorites, setFavorites] = useState<CarItem[]>([]);
    const [leftCar, setLeftCar] = useState<CarItem | null>(null);
    const [rightCar, setRightCar] = useState<CarItem | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [activeSide, setActiveSide] = useState<SelectionSide>(null);
    const [loading, setLoading] = useState(false);

    const fetchFavoritesData = useCallback(async () => {
        setLoading(true);
        const favIds = await getFavorites();
        if (favIds.length === 0) { setFavorites([]); setLoading(false); return; }
        const { data } = await supabase.from('listings').select('*').in('id', favIds).order('created_at', { ascending: false });
        setFavorites(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchFavoritesData(); }, []);
    useFocusEffect(useCallback(() => { fetchFavoritesData(); }, []));

    const openSelectionModal = (side: SelectionSide) => {
        setActiveSide(side);
        setModalVisible(true);
    };

    const handleSelectCar = (car: CarItem) => {
        if (activeSide === 'left') {
            if (rightCar?.id === car.id) setRightCar(null);
            setLeftCar(car);
        } else {
            if (leftCar?.id === car.id) setLeftCar(null);
            setRightCar(car);
        }
        setModalVisible(false);
        setActiveSide(null);
    };

    const clearSelection = (side: 'left' | 'right') => {
        if (side === 'left') setLeftCar(null);
        else setRightCar(null);
    };

    const ComparisonRow = ({ icon: Icon, label, leftValue, rightValue, highlightBest = false, type = 'text', index }: any) => {
        let leftStyle = [styles.rowValue, { color: colors.text }];
        let rightStyle = [styles.rowValue, { color: colors.text }];

        if (highlightBest && leftCar && rightCar && leftValue && rightValue) {
            let isLeftBetter = false;
            let isRightBetter = false;
            if (type === 'price') {
                if (leftCar.price < rightCar.price) isLeftBetter = true;
                else if (rightCar.price < leftCar.price) isRightBetter = true;
            } else if (type === 'year') {
                if (leftCar.year > rightCar.year) isLeftBetter = true;
                else if (rightCar.year > leftCar.year) isRightBetter = true;
            } else if (type === 'mileage') {
                if (leftCar.mileage < rightCar.mileage) isLeftBetter = true;
                else if (rightCar.mileage < leftCar.mileage) isRightBetter = true;
            }
            if (isLeftBetter) leftStyle = [styles.bestValue, { color: '#4CD964' }];
            if (isRightBetter) rightStyle = [styles.bestValue, { color: '#4CD964' }];
        }

        const isEven = index % 2 === 0;
        const rowBg = isEven ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') : 'transparent';

        return (
            <View style={[styles.rowContainer, { backgroundColor: rowBg }]}>
                <View style={styles.cellSide}>
                    <Text style={[leftStyle, !leftCar && styles.placeholderValue]} numberOfLines={1}>{leftValue || '-'}</Text>
                </View>
                <View style={styles.cellCenter}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }]}>
                        <Icon size={14} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
                </View>
                <View style={styles.cellSide}>
                    <Text style={[rightStyle, !rightCar && styles.placeholderValue]} numberOfLines={1}>{rightValue || '-'}</Text>
                </View>
            </View>
        );
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ paddingTop: isMobile ? 60 : 76, flexGrow: 1, flexDirection: 'column' as any }}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.pageWrap, isMobile && { paddingHorizontal: 16 }]}>
                {/* Page header align with mobile */}
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                    <Text style={[styles.pageTitle, { color: colors.text }]}>Müqayisə</Text>
                    <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                        Sevdiyiniz avtomobilləri müqayisə edin
                    </Text>
                </View>

                {/* Banner Slider */}
                <View style={{ marginBottom: 16 }}>
                    <BannerSlider
                        images={[settings.compare_banner_1, settings.compare_banner_2, settings.compare_banner_3]}
                        height={120}
                    />
                </View>

                {/* Selection Area like mobile */}
                <View style={styles.selectionArea}>
                    <View style={styles.slotWrapper}>
                        {leftCar ? (
                            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.carCard}>
                                <View style={[styles.imageWrapper, { borderColor: colors.border }]}>
                                    <Image source={{ uri: leftCar.image_url }} style={styles.carImage} resizeMode="cover" />
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => clearSelection('left')}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                    <View style={styles.imageOverlayContent}>
                                        <Text style={styles.overlayPrice}>{leftCar.price} {leftCar.currency}</Text>
                                    </View>
                                </View>
                                <View style={styles.carInfo}>
                                    <Text style={[styles.carMake, { color: colors.textSecondary }]}>{leftCar.make}</Text>
                                    <Text style={[styles.carModel, { color: colors.text }]} numberOfLines={1}>{leftCar.model}</Text>
                                </View>
                            </MotiView>
                        ) : (
                            <TouchableOpacity style={[styles.emptySlot, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openSelectionModal('left')}>
                                <View style={[styles.plusCircle, { backgroundColor: colors.background }]}><Plus size={24} color={colors.primary} /></View>
                                <Text style={[styles.addText, { color: colors.textSecondary }]}>Avtomobil Seç</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.vsContainer}>
                        <LinearGradient colors={['#FF3B30', '#FF9500']} style={styles.vsCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Text style={styles.vsText}>VS</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.slotWrapper}>
                        {rightCar ? (
                            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.carCard}>
                                <View style={[styles.imageWrapper, { borderColor: colors.border }]}>
                                    <Image source={{ uri: rightCar.image_url }} style={styles.carImage} resizeMode="cover" />
                                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => clearSelection('right')}>
                                        <X size={12} color="#FFF" />
                                    </TouchableOpacity>
                                    <View style={styles.imageOverlayContent}>
                                        <Text style={styles.overlayPrice}>{rightCar.price} {rightCar.currency}</Text>
                                    </View>
                                </View>
                                <View style={styles.carInfo}>
                                    <Text style={[styles.carMake, { color: colors.textSecondary }]}>{rightCar.make}</Text>
                                    <Text style={[styles.carModel, { color: colors.text }]} numberOfLines={1}>{rightCar.model}</Text>
                                </View>
                            </MotiView>
                        ) : (
                            <TouchableOpacity style={[styles.emptySlot, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openSelectionModal('right')}>
                                <View style={[styles.plusCircle, { backgroundColor: colors.background }]}><Plus size={24} color={colors.primary} /></View>
                                <Text style={[styles.addText, { color: colors.textSecondary }]}>Avtomobil Seç</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Instruction */}
                <View style={styles.instructionContainer}>
                    <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                        Müqayisə etmək istədiyiniz iki avtomobili seçin
                    </Text>
                </View>

                {/* Comparison table */}
                {(leftCar || rightCar) && (
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 500 }}
                        style={[styles.tableContainer, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 40 }]}
                    >
                        <ComparisonRow index={0} icon={Banknote} label="Qiymət" leftValue={leftCar ? `${leftCar.price.toLocaleString()} ${leftCar.currency}` : null} rightValue={rightCar ? `${rightCar.price.toLocaleString()} ${rightCar.currency}` : null} highlightBest type="price" />
                        <ComparisonRow index={1} icon={Calendar} label="İl" leftValue={leftCar?.year} rightValue={rightCar?.year} highlightBest type="year" />
                        <ComparisonRow index={2} icon={Gauge} label="Yürüş" leftValue={leftCar ? `${leftCar.mileage} km` : null} rightValue={rightCar ? `${rightCar.mileage} km` : null} highlightBest type="mileage" />
                        <ComparisonRow index={3} icon={Zap} label="Mühərrik" leftValue={leftCar ? `${leftCar.engine} L` : null} rightValue={rightCar ? `${rightCar.engine} L` : null} />
                        <ComparisonRow index={4} icon={Zap} label="At gücü" leftValue={leftCar && leftCar.horsepower ? `${leftCar.horsepower} a.g.` : (leftCar ? '-' : null)} rightValue={rightCar && rightCar.horsepower ? `${rightCar.horsepower} a.g.` : (rightCar ? '-' : null)} />
                        <ComparisonRow index={5} icon={Fuel} label="Yanacaq" leftValue={leftCar?.fuel_type} rightValue={rightCar?.fuel_type} />
                        <ComparisonRow index={6} icon={Car} label="Ban növü" leftValue={leftCar?.body_type} rightValue={rightCar?.body_type} />
                        <ComparisonRow index={7} icon={Palette} label="Rəng" leftValue={leftCar?.color} rightValue={rightCar?.color} />
                        <ComparisonRow index={8} icon={Settings} label="Sürətlər qutusu" leftValue={leftCar?.gearbox} rightValue={rightCar?.gearbox} />
                        <ComparisonRow index={9} icon={Activity} label="Ötürücü" leftValue={leftCar?.transmission} rightValue={rightCar?.transmission} />
                        <ComparisonRow index={10} icon={Globe} label="Bazar" leftValue={leftCar?.market} rightValue={rightCar?.market} />
                        <ComparisonRow index={11} icon={MapPin} label="Şəhər" leftValue={leftCar?.location} rightValue={rightCar?.location} />
                        <ComparisonRow index={12} icon={CreditCard} label="Kredit" leftValue={leftCar ? (leftCar.is_credit ? 'Var' : 'Yox') : null} rightValue={rightCar ? (rightCar.is_credit ? 'Var' : 'Yox') : null} />
                        <ComparisonRow index={13} icon={ArrowLeftRight} label="Barter" leftValue={leftCar ? (leftCar.is_barter ? 'Var' : 'Yox') : null} rightValue={rightCar ? (rightCar.is_barter ? 'Var' : 'Yox') : null} />
                    </MotiView>
                )}
            </View>

            <WebFooter />

            {/* Selection Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Seçilmişlərdən əlavə et</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.closeModalButton, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                                <X size={20} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        {loading ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : favorites.length === 0 ? (
                            <View style={styles.emptyModalState}>
                                <AlertCircle size={40} color={colors.textSecondary} />
                                <Text style={[styles.emptyModalText, { color: colors.text }]}>Seçilmiş elan yoxdur.</Text>
                                <Text style={[styles.emptyModalSubText, { color: colors.textSecondary }]}>Müqayisə etmək üçün əvvəlcə elanları bəyənin.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={favorites}
                                keyExtractor={(item) => item.id}
                                style={{ width: '100%', flex: 1 }}
                                contentContainerStyle={{ padding: 20 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalItem,
                                            { backgroundColor: colors.background, borderColor: colors.border },
                                            (leftCar?.id === item.id || rightCar?.id === item.id) && styles.disabledItem
                                        ]}
                                        onPress={() => handleSelectCar(item)}
                                        disabled={leftCar?.id === item.id || rightCar?.id === item.id}
                                    >
                                        <Image source={{ uri: item.image_url }} style={styles.modalItemImage} />
                                        <View style={styles.modalItemInfo}>
                                            <Text style={[styles.modalItemTitle, { color: colors.text }]}>{item.make} {item.model}</Text>
                                            <Text style={[styles.modalItemPrice, { color: colors.primary }]}>{item.price.toLocaleString()} {item.currency}</Text>
                                        </View>
                                        {(leftCar?.id === item.id || rightCar?.id === item.id) && (
                                            <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                                                <Check size={16} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        maxWidth: 800, // Adjusted to match mobile width proportions roughly
        alignSelf: 'center',
        width: '100%',
        paddingTop: 40,
        paddingBottom: 40,
    },
    pageTitle: {
        fontSize: 24,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 4,
    },
    pageSubtitle: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
        opacity: 0.7,
        textAlign: 'center',
    },
    selectionArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        paddingTop: 20,
        marginBottom: 10,
        position: 'relative',
        alignItems: 'flex-start',
    },
    slotWrapper: {
        width: '46%',
    },
    emptySlot: {
        height: 180,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    plusCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
            android: { elevation: 3 },
            web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' as any },
        }),
    },
    addText: {
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    carCard: {
        width: '100%',
        alignItems: 'center',
    },
    imageWrapper: {
        width: '100%',
        height: 130,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 12,
        position: 'relative',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
            android: { elevation: 5 },
            web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)' as any },
        }),
    },
    carImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    imageOverlayContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
    },
    overlayPrice: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'RethinkSans_800ExtraBold',
        ...Platform.select({
            ios: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
            android: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
            web: { textShadow: '0px 1px 2px rgba(0,0,0,0.5)' as any },
        }),
    },
    carInfo: {
        alignItems: 'center',
        width: '100%',
    },
    carMake: {
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    carModel: {
        fontSize: 16,
        fontFamily: 'RethinkSans_800ExtraBold',
        textAlign: 'center',
    },
    vsContainer: {
        position: 'absolute',
        top: 65,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    vsCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
            android: { elevation: 6 },
            web: { boxShadow: '0px 4px 8px rgba(255, 59, 48, 0.4)' as any },
        }),
    },
    vsText: {
        fontFamily: 'RethinkSans_800ExtraBold',
        fontSize: 14,
        fontStyle: 'italic',
        color: '#FFF',
    },
    instructionContainer: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 24,
        paddingHorizontal: 40,
    },
    instructionText: {
        textAlign: 'center',
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
        opacity: 0.7,
    },
    tableContainer: {
        marginHorizontal: 0,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
            android: { elevation: 4 },
            web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)' as any },
        }),
    },
    rowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
    },
    cellSide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellCenter: {
        width: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    rowLabel: {
        fontSize: 9,
        fontFamily: 'RethinkSans_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    rowValue: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
        textAlign: 'center',
    },
    bestValue: {
        fontSize: 13,
        fontFamily: 'RethinkSans_800ExtraBold',
        textAlign: 'center',
    },
    placeholderValue: {
        opacity: 0.3,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        borderRadius: 24,
        height: '75%',
        maxHeight: 600,
        width: 500,
        maxWidth: '90%',
        overflow: 'hidden',
        borderWidth: 1,
        ...Platform.select({
            web: { boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.2)' as any },
        }),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
    },
    closeModalButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 10,
        borderRadius: 16,
        borderWidth: 1,
        width: '100%',
    },
    disabledItem: {
        opacity: 0.5,
    },
    modalItemImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginRight: 12,
    },
    modalItemInfo: {
        flex: 1,
    },
    modalItemTitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 4,
    },
    modalItemPrice: {
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    selectedBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyModalState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyModalText: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyModalSubText: {
        textAlign: 'center',
        fontFamily: 'RethinkSans_400Regular',
    },
});
