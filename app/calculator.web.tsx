import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Send, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { WebHeader } from '../components/WebHeader.web';
import { WebFooter } from '../components/WebFooter.web';
import { SeoHead } from '../components/web/SeoHead';
import { CreditApplicationModal } from '../components/CreditApplicationModal';
import {
    WebScreen, LargeTitle, Card, Button, Segmented, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney, WebTokens,
} from '../components/web/WebKit';

const TERMS = ['12', '24', '36', '48', '60'] as const;

// Annuity payment, same formula as the mobile calculator
const calculate = (price: string, down: string, rate: string, months: string) => {
    const p = parseFloat(price) || 0;
    const d = parseFloat(down) || 0;
    const r = parseFloat(rate) || 0;
    const n = parseFloat(months) || 0;
    const principal = Math.max(0, p - d);
    if (principal <= 0 || n <= 0) return { principal, monthly: 0, interest: 0, total: 0 };
    if (r === 0) return { principal, monthly: principal / n, interest: 0, total: principal };
    const mr = r / 12 / 100;
    const monthly = principal * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    return { principal, monthly, interest: monthly * n - principal, total: monthly * n };
};

// Grouped input row, defined outside the screen so the input keeps focus
const InputRow = ({ t, label, suffix, value, onChangeText }: {
    t: WebTokens; label: string; suffix: string; value: string; onChangeText: (v: string) => void;
}) => (
    <View style={styles.inputRow}>
        <Text style={[styles.inputLabel, { color: t.text }]}>{label}</Text>
        <TextInput
            value={value}
            onChangeText={(v) => onChangeText(v.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            placeholderTextColor={t.placeholder}
            keyboardType="numeric"
            accessibilityLabel={label}
            style={[styles.input, { color: t.text }]}
        />
        <Text style={[styles.inputSuffix, { color: t.textSecondary }]}>{suffix}</Text>
    </View>
);

export default function WebCalculatorScreen() {
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile, isTablet } = useBreakpoints();

    const [price, setPrice] = useState('');
    const [initialPayment, setInitialPayment] = useState('');
    const [rate, setRate] = useState('21');
    const [months, setMonths] = useState('36');
    const [showApplyModal, setShowApplyModal] = useState(false);

    const result = useMemo(() => calculate(price, initialPayment, rate, months), [price, initialPayment, rate, months]);
    const principalShare = result.total > 0 ? (result.principal / result.total) * 100 : 0;

    const reset = () => { setPrice(''); setInitialPayment(''); setRate('21'); setMonths('36'); };
    const separator = <View style={[styles.sep, { backgroundColor: t.hairline }]} />;

    return (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
            <WebHeader />
            <WebScreen footer={<WebFooter />} maxWidth={1040}>
                <SeoHead title="Avtomobil krediti kalkulyatoru" description="Aylıq kredit ödənişini hesablayın və Naxçıvan Avto-ya onlayn kredit müraciəti göndərin." path="/calculator" />
                <LargeTitle
                    title="Kredit"
                    subtitle="Aylıq ödənişi hesablayın və bir neçə dəqiqəyə müraciət göndərin."
                    right={
                        <TouchableOpacity onPress={() => router.push('/my-loans' as any)} style={styles.walletLink} accessibilityLabel="Kredit hesabım">
                            <View style={styles.walletMini}>
                                <View style={styles.walletMiniChip} />
                            </View>
                            <View>
                                <Text style={[styles.walletLinkTitle, { color: t.text }]}>Kredit hesabım</Text>
                                <Text style={[styles.walletLinkSub, { color: t.textSecondary }]}>Ödəniş cədvəli və qalıq ›</Text>
                            </View>
                        </TouchableOpacity>
                    }
                />

                <View style={[styles.layout, isTablet && { flexDirection: 'column' }]}>
                    {/* Inputs */}
                    <View style={[{ flex: 1, minWidth: 0 }, isTablet && { width: '100%' }]}>
                        <View style={styles.captionRow}>
                            <GroupCaption style={{ marginBottom: 0 }}>Məlumatlar</GroupCaption>
                            <TouchableOpacity onPress={reset} style={styles.reset}>
                                <RotateCcw size={13} color={t.accent} />
                                <Text style={[styles.resetText, { color: t.accent }]}>Sıfırla</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.hairline, boxShadow: t.shadow } as any]}>
                            <InputRow t={t} label="Avtomobilin qiyməti" suffix="₼" value={price} onChangeText={setPrice} />
                            {separator}
                            <InputRow t={t} label="İlkin ödəniş" suffix="₼" value={initialPayment} onChangeText={setInitialPayment} />
                            {separator}
                            <InputRow t={t} label="İllik faiz" suffix="%" value={rate} onChangeText={setRate} />
                        </View>

                        <GroupCaption style={{ marginTop: 28 }}>Müddət</GroupCaption>
                        <Segmented
                            options={TERMS.map((m) => ({ value: m, label: `${m} ay` }))}
                            value={(TERMS as readonly string[]).includes(months) ? (months as typeof TERMS[number]) : ('' as any)}
                            onChange={setMonths}
                            fullWidth
                        />
                        <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.hairline, marginTop: 12 }]}>
                            <InputRow t={t} label="Başqa müddət" suffix="ay" value={months} onChangeText={setMonths} />
                        </View>
                    </View>

                    {/* Result */}
                    <View style={[{ width: 400 }, isTablet && { width: '100%' }]}>
                        <Card padding={isMobile ? 22 : 28}>
                            <Text style={[styles.resultLabel, { color: t.textSecondary }]}>Aylıq ödəniş</Text>
                            <Text style={[styles.resultValue, { color: t.text }, isMobile && { fontSize: 44 }]} numberOfLines={1}>
                                {formatMoney(result.monthly)}
                            </Text>

                            <View style={[styles.bar, { backgroundColor: t.fill }]}>
                                {result.total > 0 && (
                                    <>
                                        <View style={{ flex: principalShare, backgroundColor: t.text }} />
                                        <View style={{ flex: 100 - principalShare, backgroundColor: t.accent }} />
                                    </>
                                )}
                            </View>
                            <View style={styles.legend}>
                                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: t.text }]} /><Text style={[styles.legendText, { color: t.textSecondary }]}>Əsas məbləğ</Text></View>
                                <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: t.accent }]} /><Text style={[styles.legendText, { color: t.textSecondary }]}>Faiz</Text></View>
                            </View>

                            {[
                                { label: 'Kredit məbləği', value: formatMoney(result.principal) },
                                { label: 'Ümumi faiz', value: formatMoney(result.interest) },
                                { label: 'Ümumi geri ödəniş', value: formatMoney(result.total), strong: true },
                            ].map((row) => (
                                <View key={row.label} style={[styles.breakdown, { borderTopColor: t.hairline }]}>
                                    <Text style={[styles.breakdownLabel, { color: row.strong ? t.text : t.textSecondary }, row.strong && { fontFamily: FONT.semibold }]}>{row.label}</Text>
                                    <Text style={[styles.breakdownValue, { color: t.text }, row.strong && { fontFamily: FONT.heavy }]}>{row.value}</Text>
                                </View>
                            ))}

                            <Button
                                title="Bu şərtlərlə müraciət et"
                                size="lg"
                                fullWidth
                                icon={<Send size={17} color="#FFF" />}
                                onPress={() => setShowApplyModal(true)}
                                style={{ marginTop: 20 }}
                            />
                            <Text style={[styles.note, { color: t.textTertiary }]}>Hesablama təxminidir; yekun şərtlər müraciətdən sonra təsdiqlənir.</Text>
                        </Card>
                    </View>
                </View>
            </WebScreen>

            <CreditApplicationModal
                visible={showApplyModal}
                onClose={() => setShowApplyModal(false)}
                carTitle={price ? `${formatMoney(price)} kredit` : 'Avtomobil krediti'}
                carPrice={parseFloat(price) || undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 32 },
    captionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    reset: { flexDirection: 'row', alignItems: 'center', gap: 4, cursor: 'pointer' as any },
    resetText: { fontSize: 13, fontFamily: FONT.semibold },
    group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
    inputRow: { flexDirection: 'row', alignItems: 'center', height: 54, paddingHorizontal: 16, gap: 12 },
    inputLabel: { flex: 1, fontSize: 15, fontFamily: FONT.semibold },
    input: { width: 140, height: '100%', textAlign: 'right', fontSize: 17, fontFamily: FONT.semibold, padding: 0, outlineStyle: 'none' } as any,
    inputSuffix: { width: 20, fontSize: 15, fontFamily: FONT.medium },
    sep: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
    resultLabel: { fontSize: 14, fontFamily: FONT.medium },
    resultValue: { fontSize: 52, fontFamily: FONT.heavy, letterSpacing: -1.6, marginTop: 4 },
    bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 20 },
    legend: { flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, fontFamily: FONT.medium },
    breakdown: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth },
    breakdownLabel: { fontSize: 15, fontFamily: FONT.regular },
    breakdownValue: { fontSize: 15, fontFamily: FONT.semibold },
    note: { fontSize: 12, fontFamily: FONT.regular, textAlign: 'center', marginTop: 12 },
    walletLink: { flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer' as any },
    walletMini: { width: 56, height: 36, borderRadius: 7, backgroundColor: '#1C1C1E', padding: 6, justifyContent: 'flex-end', alignItems: 'flex-end', boxShadow: '0px 6px 14px rgba(0,0,0,0.2)' as any },
    walletMiniChip: { width: 12, height: 9, borderRadius: 2, backgroundColor: '#FF3B30' },
    walletLinkTitle: { fontSize: 15, fontFamily: FONT.semibold },
    walletLinkSub: { fontSize: 13, fontFamily: FONT.regular },
});
