import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, X, Check, Heart } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getFavorites } from '../../lib/favorites';
import { WebFooter } from '../../components/WebFooter.web';
import { SeoHead } from '../../components/web/SeoHead';
import {
    WebScreen, LargeTitle, Button, Card, EmptyState, Loading, useWebTokens, useBreakpoints, formatMoney, FONT,
} from '../../components/web/WebKit';

type CompareCar = {
    id: string; short_id?: string; make: string; model: string; year: number; price: number; currency: string;
    image_url: string; images?: string[]; mileage: number; engine: string; horsepower?: number; location: string;
    is_credit: boolean; is_barter: boolean; body_type: string; color: string; gearbox: string; transmission: string;
    market: string; fuel_type: string;
};
type Side = 'left' | 'right';
type Better = 'lower' | 'higher';

const formatNumber = (value: number) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const cover = (car: CompareCar) => (car.images && car.images.length > 0 ? car.images[0] : car.image_url);
const money = (car: CompareCar) => formatMoney(car.price, car.currency);

// Which side wins a numeric row (lower price/mileage, newer year)
const winner = (l: number | undefined, r: number | undefined, better: Better): Side | null => {
    if (l == null || r == null || l === r) return null;
    return better === 'lower' ? (l < r ? 'left' : 'right') : (l > r ? 'left' : 'right');
};

export default function WebCompareScreen() {
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const [favorites, setFavorites] = useState<CompareCar[]>([]);
    const [loading, setLoading] = useState(true);
    const [leftCar, setLeftCar] = useState<CompareCar | null>(null);
    const [rightCar, setRightCar] = useState<CompareCar | null>(null);
    const [activeSide, setActiveSide] = useState<Side | null>(null);

    const load = useCallback(async () => {
        try {
            const favIds = await getFavorites();
            if (favIds.length === 0) {
                setFavorites([]);
                return;
            }
            const { data, error } = await supabase.from('listings').select('*').in('id', favIds).order('created_at', { ascending: false });
            if (error) throw error;
            const list = (data || []) as CompareCar[];
            setFavorites(list);
            // Drop picks that were un-favourited elsewhere
            setLeftCar((c) => (c && list.some((x) => x.id === c.id) ? c : null));
            setRightCar((c) => (c && list.some((x) => x.id === c.id) ? c : null));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const handleSelect = (car: CompareCar) => {
        if (activeSide === 'left') {
            if (rightCar?.id === car.id) setRightCar(null);
            setLeftCar(car);
        } else {
            if (leftCar?.id === car.id) setLeftCar(null);
            setRightCar(car);
        }
        setActiveSide(null);
    };

    const rows: { label: string; left?: string | number | null | false; right?: string | number | null | false; win?: Side | null }[] = [
        { label: 'Qiymət', left: leftCar && money(leftCar), right: rightCar && money(rightCar), win: winner(leftCar?.price, rightCar?.price, 'lower') },
        { label: 'Buraxılış ili', left: leftCar?.year, right: rightCar?.year, win: winner(leftCar?.year, rightCar?.year, 'higher') },
        { label: 'Yürüş', left: leftCar && `${formatNumber(leftCar.mileage)} km`, right: rightCar && `${formatNumber(rightCar.mileage)} km`, win: winner(leftCar?.mileage, rightCar?.mileage, 'lower') },
        { label: 'Mühərrik', left: leftCar?.engine && `${leftCar.engine} L`, right: rightCar?.engine && `${rightCar.engine} L` },
        { label: 'At gücü', left: leftCar?.horsepower && `${leftCar.horsepower} a.g.`, right: rightCar?.horsepower && `${rightCar.horsepower} a.g.`, win: winner(leftCar?.horsepower, rightCar?.horsepower, 'higher') },
        { label: 'Yanacaq', left: leftCar?.fuel_type, right: rightCar?.fuel_type },
        { label: 'Ban növü', left: leftCar?.body_type, right: rightCar?.body_type },
        { label: 'Rəng', left: leftCar?.color, right: rightCar?.color },
        { label: 'Sürətlər qutusu', left: leftCar?.gearbox, right: rightCar?.gearbox },
        { label: 'Ötürücü', left: leftCar?.transmission, right: rightCar?.transmission },
        { label: 'Bazar', left: leftCar?.market, right: rightCar?.market },
        { label: 'Şəhər', left: leftCar?.location, right: rightCar?.location },
        { label: 'Kredit', left: leftCar && (leftCar.is_credit ? 'Var' : 'Yox'), right: rightCar && (rightCar.is_credit ? 'Var' : 'Yox') },
        { label: 'Barter', left: leftCar && (leftCar.is_barter ? 'Var' : 'Yox'), right: rightCar && (rightCar.is_barter ? 'Var' : 'Yox') },
    ];

    const renderSlot = (side: Side, car: CompareCar | null) =>
        car ? (
            <View style={styles.slot}>
                <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/listing/${car.short_id || car.id}` as any)} style={[styles.slotImageWrap, { borderColor: t.hairline, backgroundColor: t.fill }]}>
                    <Image source={{ uri: cover(car) }} accessibilityLabel={`${car.make} ${car.model}`} style={styles.slotImage} resizeMode="cover" />
                    <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => (side === 'left' ? setLeftCar(null) : setRightCar(null))}
                        accessibilityLabel="Seçimi sil"
                    >
                        <X size={13} color="#FFF" strokeWidth={3} />
                    </TouchableOpacity>
                </TouchableOpacity>
                <Text style={[styles.slotMake, { color: t.textSecondary }]} numberOfLines={1}>{car.make}</Text>
                <Text style={[styles.slotModel, { color: t.text }, isMobile && { fontSize: 16 }]} numberOfLines={1}>{car.model}</Text>
                <Text style={[styles.slotPrice, { color: t.text }]} numberOfLines={1}>{money(car)}</Text>
                <TouchableOpacity onPress={() => setActiveSide(side)} style={{ cursor: 'pointer' } as any}>
                    <Text style={[styles.change, { color: t.accent }]}>Dəyiş</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity
                style={[styles.slot, styles.emptySlot, { borderColor: t.hairlineStrong }, isMobile && { height: 180 }]}
                onPress={() => setActiveSide(side)}
                activeOpacity={0.7}
            >
                <View style={[styles.plusCircle, { backgroundColor: t.accentSoft }]}>
                    <Plus size={22} color={t.accent} strokeWidth={2.4} />
                </View>
                <Text style={[styles.addText, { color: t.textSecondary }]}>Avtomobil seç</Text>
            </TouchableOpacity>
        );

    const renderValue = (value: string | number | null | undefined | false, wins: boolean) => (
        <View style={styles.valueCell}>
            {wins && <Check size={14} color={t.success} strokeWidth={3} />}
            <Text style={[styles.value, { color: value ? (wins ? t.success : t.text) : t.textTertiary }, wins && { fontFamily: FONT.heavy }]} numberOfLines={1}>
                {value || '—'}
            </Text>
        </View>
    );

    return (
        <WebScreen footer={<WebFooter />} maxWidth={960}>
            <SeoHead title="Avtomobilləri müqayisə et" description="Seçilmiş avtomobilləri qiymət, il, yürüş və texniki göstəricilər üzrə yan-yana müqayisə edin." path="/compare" />
            <LargeTitle title="Müqayisə" subtitle="Seçilmişlərdən iki avtomobili yan-yana qoyun — üstün göstərici yaşılla işarələnir." />

            {loading ? (
                <Loading />
            ) : favorites.length === 0 ? (
                <EmptyState
                    icon={<Heart size={30} color={t.textSecondary} />}
                    title="Müqayisə üçün elan yoxdur"
                    subtitle="Əvvəlcə bəyəndiyiniz elanları ürək işarəsi ilə seçilmişlərə əlavə edin."
                    action={<Button title="Elanlara bax" onPress={() => router.push('/')} />}
                />
            ) : (
                <>
                    <View style={[styles.selection, isMobile && { gap: 10 }]}>
                        {renderSlot('left', leftCar)}
                        <View style={[styles.vs, { backgroundColor: t.text }, isMobile && { marginTop: 70 }]}>
                            <Text style={[styles.vsText, { color: t.bg }]}>VS</Text>
                        </View>
                        {renderSlot('right', rightCar)}
                    </View>

                    {(leftCar || rightCar) && (
                        <Card padding={0} style={{ overflow: 'hidden' }}>
                            {rows.map((row, i) => (
                                <View key={row.label} style={[styles.tableRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
                                    {renderValue(row.left, row.win === 'left')}
                                    <Text style={[styles.rowLabel, { color: t.textSecondary }, isMobile && { width: 96, fontSize: 12 }]} numberOfLines={1}>{row.label}</Text>
                                    {renderValue(row.right, row.win === 'right')}
                                </View>
                            ))}
                        </Card>
                    )}
                </>
            )}

            {/* Picker */}
            <Modal visible={activeSide !== null} animationType="fade" transparent onRequestClose={() => setActiveSide(null)}>
                <View style={styles.overlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveSide(null)} />
                    <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.hairline }]}>
                        <View style={styles.sheetHeader}>
                            <Text style={[styles.sheetTitle, { color: t.text }]}>Avtomobil seçin</Text>
                            <TouchableOpacity onPress={() => setActiveSide(null)} style={[styles.sheetClose, { backgroundColor: t.fill }]} accessibilityLabel="Bağla">
                                <X size={16} color={t.text} strokeWidth={2.4} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 12, gap: 6 }}>
                            {favorites.map((item) => {
                                const taken = leftCar?.id === item.id || rightCar?.id === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.pickItem, { opacity: taken ? 0.45 : 1 }]}
                                        onPress={() => handleSelect(item)}
                                        disabled={taken}
                                        activeOpacity={0.7}
                                    >
                                        <Image source={{ uri: cover(item) }} accessibilityLabel={`${item.make} ${item.model}`} style={[styles.pickImage, { backgroundColor: t.fill }]} />
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={[styles.pickTitle, { color: t.text }]} numberOfLines={1}>{item.make} {item.model}</Text>
                                            <Text style={[styles.pickMeta, { color: t.textSecondary }]} numberOfLines={1}>
                                                {[item.year, item.mileage != null && `${formatNumber(item.mileage)} km`].filter(Boolean).join(' · ')}
                                            </Text>
                                        </View>
                                        <Text style={[styles.pickPrice, { color: t.text }]}>{money(item)}</Text>
                                        {taken && (
                                            <View style={[styles.pickCheck, { backgroundColor: t.accent }]}>
                                                <Check size={12} color="#FFF" strokeWidth={3} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </WebScreen>
    );
}

const styles = StyleSheet.create({
    selection: { flexDirection: 'row', alignItems: 'flex-start', gap: 20, marginBottom: 24 },
    slot: { flex: 1, minWidth: 0 },
    emptySlot: { height: 260, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 10, cursor: 'pointer' as any },
    plusCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    addText: { fontSize: 15, fontFamily: FONT.semibold },
    slotImageWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 10, cursor: 'pointer' as any },
    slotImage: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    slotMake: { fontSize: 12, fontFamily: FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
    slotModel: { fontSize: 20, fontFamily: FONT.bold, letterSpacing: -0.3 },
    slotPrice: { fontSize: 17, fontFamily: FONT.heavy, marginTop: 2 },
    change: { fontSize: 14, fontFamily: FONT.semibold, marginTop: 6 },
    vs: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    vsText: { fontSize: 12, fontFamily: FONT.heavy },
    tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 12 },
    rowLabel: { width: 150, textAlign: 'center', fontSize: 13, fontFamily: FONT.semibold },
    valueCell: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    value: { fontSize: 15, fontFamily: FONT.semibold, textAlign: 'center', flexShrink: 1 },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 16 },
    sheet: { width: '100%', maxWidth: 520, maxHeight: '80%' as any, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', boxShadow: '0px 24px 64px rgba(0,0,0,0.25)' as any },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
    sheetTitle: { fontSize: 20, fontFamily: FONT.heavy },
    sheetClose: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
    pickItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, cursor: 'pointer' as any },
    pickImage: { width: 72, height: 54, borderRadius: 8 },
    pickTitle: { fontSize: 15, fontFamily: FONT.bold },
    pickMeta: { fontSize: 13, fontFamily: FONT.medium, marginTop: 2 },
    pickPrice: { fontSize: 15, fontFamily: FONT.heavy },
    pickCheck: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
