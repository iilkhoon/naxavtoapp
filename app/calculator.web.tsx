import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, useWindowDimensions, Platform
} from 'react-native';
import { RefreshCcw, Banknote, CreditCard, Calendar, Percent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { WebHeader } from '../components/WebHeader.web';
import { WebFooter } from '../components/WebFooter.web';

export default function WebCalculatorScreen() {
    const { colors, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [price, setPrice] = useState('');
    const [initialPayment, setInitialPayment] = useState('');
    const [rate, setRate] = useState('21');
    const [months, setMonths] = useState('36');

    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);
    const [totalPayment, setTotalPayment] = useState(0);
    const [principalAmount, setPrincipalAmount] = useState(0);

    useEffect(() => { calculateLoan(); }, [price, initialPayment, rate, months]);

    const calculateLoan = () => {
        const p = parseFloat(price) || 0;
        const down = parseFloat(initialPayment) || 0;
        const r = parseFloat(rate) || 0;
        const n = parseFloat(months) || 0;
        const principal = Math.max(0, p - down);
        setPrincipalAmount(principal);
        if (principal <= 0 || n <= 0) { setMonthlyPayment(0); setTotalInterest(0); setTotalPayment(0); return; }
        if (r === 0) {
            setMonthlyPayment(principal / n); setTotalPayment(principal); setTotalInterest(0);
        } else {
            const mr = r / 12 / 100;
            const monthly = principal * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
            setMonthlyPayment(monthly); setTotalPayment(monthly * n); setTotalInterest(monthly * n - principal);
        }
    };

    const reset = () => { setPrice(''); setInitialPayment(''); setRate('21'); setMonths('36'); };
    const predefinedMonths = ['12', '24', '36', '48', '60'];
    const total = principalAmount + totalInterest;
    const principalPercent = total > 0 ? (principalAmount / total) * 100 : 0;
    const interestPercent = total > 0 ? (totalInterest / total) * 100 : 0;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, display: 'flex' as any, flexDirection: 'column', minHeight: '100vh' as any }}>
            <WebHeader />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingTop: isMobile ? 60 : 76, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.pageWrap, isMobile && { paddingHorizontal: 16, paddingTop: 24 }]}>
                    {/* Page Header */}
                    <View style={styles.pageHeader}>
                        <Text style={[styles.pageTitle, { color: colors.text }, isMobile && { fontSize: 24 }]}>
                            Kredit Hesablayıcı
                        </Text>
                        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                            Kredit məbləğini, faizi və aylıq ödənişi hesablayın
                        </Text>
                    </View>

                    <View style={[styles.mainLayout, isMobile && { flexDirection: 'column' }]}>
                        {/* LEFT — Inputs */}
                        <View style={[styles.inputsCol, isMobile && { width: '100%' }]}>
                            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.cardTitleRow}>
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Məlumatları Daxil Edin</Text>
                                    <TouchableOpacity onPress={reset} style={[styles.resetBtn, { backgroundColor: colors.primary + '15' }]}>
                                        <RefreshCcw size={16} color={colors.primary} />
                                        <Text style={[styles.resetBtnText, { color: colors.primary }]}>Sıfırla</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Price + Down Payment */}
                                <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Avtomobilin Qiyməti (₼)</Text>
                                        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: colors.border }]}>
                                            <Banknote size={18} color={colors.textSecondary} />
                                            <TextInput
                                                style={[styles.input, { color: colors.text }]}
                                                value={price}
                                                onChangeText={setPrice}
                                                placeholder="0"
                                                placeholderTextColor={colors.textSecondary}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>İlkin Ödəniş (₼)</Text>
                                        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: colors.border }]}>
                                            <CreditCard size={18} color={colors.textSecondary} />
                                            <TextInput
                                                style={[styles.input, { color: colors.text }]}
                                                value={initialPayment}
                                                onChangeText={setInitialPayment}
                                                placeholder="0"
                                                placeholderTextColor={colors.textSecondary}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Rate + Months */}
                                <View style={[styles.row, isMobile && { flexDirection: 'column' }]}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>İllik Faiz (%)</Text>
                                        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: colors.border }]}>
                                            <Percent size={18} color={colors.textSecondary} />
                                            <TextInput
                                                style={[styles.input, { color: colors.text }]}
                                                value={rate}
                                                onChangeText={setRate}
                                                placeholder="0"
                                                placeholderTextColor={colors.textSecondary}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Müddət (Ay)</Text>
                                        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: colors.border }]}>
                                            <Calendar size={18} color={colors.textSecondary} />
                                            <TextInput
                                                style={[styles.input, { color: colors.text }]}
                                                value={months}
                                                onChangeText={setMonths}
                                                placeholder="0"
                                                placeholderTextColor={colors.textSecondary}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Quick month selector */}
                                <View style={{ marginTop: 8 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 10 }]}>Tez Seçim</Text>
                                    <View style={styles.pillRow}>
                                        {predefinedMonths.map((m) => (
                                            <TouchableOpacity
                                                key={m}
                                                style={[
                                                    styles.pill,
                                                    {
                                                        backgroundColor: months === m ? colors.primary : (isDark ? '#2C2C2E' : '#F0F0F5'),
                                                        borderColor: months === m ? colors.primary : colors.border,
                                                    }
                                                ]}
                                                onPress={() => setMonths(m)}
                                            >
                                                <Text style={[styles.pillText, { color: months === m ? '#FFF' : colors.text }]}>{m} ay</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* RIGHT — Results */}
                        <View style={[styles.resultsCol, isMobile && { width: '100%' }]}>
                            {/* Main result card */}
                            <LinearGradient
                                colors={['#FF3B30', '#FF6B35']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.resultCard}
                            >
                                <Text style={styles.resultLabel}>Aylıq Ödəniş</Text>
                                <View style={styles.amountRow}>
                                    <Text style={styles.amountText}>{monthlyPayment.toFixed(0)}</Text>
                                    <Text style={styles.currencyText}>₼</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Əsas Məbləğ</Text>
                                        <Text style={styles.summaryValue}>{principalAmount.toLocaleString()} ₼</Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Faiz Məbləği</Text>
                                        <Text style={styles.summaryValue}>{totalInterest.toFixed(0)} ₼</Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Yekun</Text>
                                        <Text style={styles.summaryValue}>{totalPayment.toFixed(0)} ₼</Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* Visual bar */}
                            {totalPayment > 0 && (
                                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 16 }]}>Bölgü</Text>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barSeg, { flex: principalPercent, backgroundColor: '#34C759' }]} />
                                        <View style={[styles.barSeg, { flex: interestPercent, backgroundColor: '#FF9500' }]} />
                                    </View>
                                    <View style={styles.legendRow}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.dot, { backgroundColor: '#34C759' }]} />
                                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Əsas ({Math.round(principalPercent)}%)</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.dot, { backgroundColor: '#FF9500' }]} />
                                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Faiz ({Math.round(interestPercent)}%)</Text>
                                        </View>
                                    </View>

                                    {/* Breakdown rows */}
                                    <View style={[styles.breakdownRow, { borderTopColor: colors.border, marginTop: 20 }]}>
                                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Avtomobilin Qiyməti</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.text }]}>{parseFloat(price || '0').toLocaleString()} ₼</Text>
                                    </View>
                                    <View style={[styles.breakdownRow, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>İlkin Ödəniş</Text>
                                        <Text style={[styles.breakdownValue, { color: '#34C759' }]}>- {parseFloat(initialPayment || '0').toLocaleString()} ₼</Text>
                                    </View>
                                    <View style={[styles.breakdownRow, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Kredit Məbləği</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.primary }]}>{principalAmount.toLocaleString()} ₼</Text>
                                    </View>
                                    <View style={[styles.breakdownRow, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Ümumi Faiz</Text>
                                        <Text style={[styles.breakdownValue, { color: '#FF9500' }]}>{totalInterest.toFixed(0)} ₼</Text>
                                    </View>
                                    <View style={[styles.breakdownRow, { borderTopColor: colors.border, borderBottomWidth: 0 }]}>
                                        <Text style={[styles.breakdownLabel, { color: colors.text, fontFamily: 'RethinkSans_700Bold' }]}>Ümumi Geri Ödəniş</Text>
                                        <Text style={[styles.breakdownValue, { color: colors.primary, fontFamily: 'RethinkSans_800ExtraBold' }]}>{totalPayment.toFixed(0)} ₼</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <WebFooter />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        maxWidth: 1100,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    pageHeader: {
        marginBottom: 32,
    },
    pageTitle: {
        fontSize: 32,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 15,
        fontFamily: 'RethinkSans_500Medium',
    },
    mainLayout: {
        flexDirection: 'row',
        gap: 28,
        alignItems: 'flex-start',
    },
    inputsCol: {
        flex: 1.1,
        gap: 20,
    },
    resultsCol: {
        flex: 1,
        gap: 20,
        position: 'sticky' as any,
        top: 96,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    cardTitle: {
        fontSize: 17,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    resetBtnText: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
        marginBottom: 8,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 14,
        height: 52,
        paddingHorizontal: 14,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'RethinkSans_600SemiBold',
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 8,
    },
    pill: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    pillText: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    // Result card
    resultCard: {
        borderRadius: 20,
        padding: 28,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    resultLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 8,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginBottom: 24,
    },
    amountText: {
        color: '#FFF',
        fontSize: 56,
        fontFamily: 'RethinkSans_800ExtraBold',
        lineHeight: 64,
    },
    currencyText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 28,
        fontFamily: 'RethinkSans_600SemiBold',
        marginTop: 10,
        marginLeft: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.25)',
        marginBottom: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 11,
        fontFamily: 'RethinkSans_600SemiBold',
        marginBottom: 4,
    },
    summaryValue: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'RethinkSans_700Bold',
    },
    // Bar
    barTrack: {
        height: 10,
        borderRadius: 5,
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: 12,
    },
    barSeg: {
        height: '100%',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    breakdownLabel: {
        fontSize: 13,
        fontFamily: 'RethinkSans_500Medium',
    },
    breakdownValue: {
        fontSize: 14,
        fontFamily: 'RethinkSans_700Bold',
    },
});
