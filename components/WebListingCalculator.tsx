import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    useWindowDimensions
} from 'react-native';
import { Banknote, CreditCard, Calendar, Percent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface WebListingCalculatorProps {
    initialPrice: number | string;
}

export const WebListingCalculator = ({ initialPrice }: WebListingCalculatorProps) => {
    const { colors, isDark } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [price, setPrice] = useState(initialPrice?.toString() || '');
    const [initialPayment, setInitialPayment] = useState('');
    const [rate, setRate] = useState('21');
    const [months, setMonths] = useState('36');

    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);
    const [totalPayment, setTotalPayment] = useState(0);
    const [principalAmount, setPrincipalAmount] = useState(0);

    useEffect(() => {
        if (initialPrice && !price) {
            setPrice(initialPrice.toString());
        }
    }, [initialPrice]);

    useEffect(() => { calculateLoan(); }, [price, initialPayment, rate, months]);

    const calculateLoan = () => {
        const p = parseFloat(price) || 0;
        const down = parseFloat(initialPayment) || 0;
        const r = parseFloat(rate) || 0;
        const n = parseFloat(months) || 0;
        const principal = Math.max(0, p - down);
        setPrincipalAmount(principal);

        if (principal <= 0 || n <= 0) {
            setMonthlyPayment(0);
            setTotalInterest(0);
            setTotalPayment(0);
            return;
        }

        if (r === 0) {
            setMonthlyPayment(principal / n);
            setTotalPayment(principal);
            setTotalInterest(0);
        } else {
            const mr = r / 12 / 100;
            const monthly = principal * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
            setMonthlyPayment(monthly);
            setTotalPayment(monthly * n);
            setTotalInterest(monthly * n - principal);
        }
    };

    const predefinedMonths = ['12', '24', '36', '48', '60'];

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Kredit Hesablayıcı</Text>

            <View style={styles.inputsCol}>
                {/* Price */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Avtomobilin Qiyməti (₼)</Text>
                    <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: colors.border }]}>
                        <Banknote size={16} color={colors.textSecondary} />
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

                {/* Down Payment */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>İlkin Ödəniş (₼)</Text>
                    <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: colors.border }]}>
                        <CreditCard size={16} color={colors.textSecondary} />
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

                {/* Row for Rate & Months */}
                <View style={[styles.row, { gap: 12 }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>İllik Faiz (%)</Text>
                        <View style={[styles.inputWrap, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', borderColor: colors.border }]}>
                            <Percent size={16} color={colors.textSecondary} />
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
                            <Calendar size={16} color={colors.textSecondary} />
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
                <View style={{ marginTop: 4 }}>
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
                                <Text style={[styles.pillText, { color: months === m ? '#FFF' : colors.text }]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            {/* Results */}
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
                        <Text style={styles.summaryLabel}>Kredit Məbləği</Text>
                        <Text style={styles.summaryValue}>{principalAmount.toLocaleString()} ₼</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Ümumi Faiz</Text>
                        <Text style={styles.summaryValue}>{totalInterest.toFixed(0)} ₼</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        gap: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_800ExtraBold',
    },
    inputsCol: {
        gap: 16,
    },
    row: {
        flexDirection: 'row',
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontFamily: 'RethinkSans_500Medium',
        marginBottom: 6,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 12,
        height: 48,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'RethinkSans_600SemiBold',
        outlineStyle: 'none',
    } as any,
    pillRow: {
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'space-between',
    },
    pill: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
    },
    pillText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
    },
    // Result card
    resultCard: {
        borderRadius: 16,
        padding: 20,
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        marginTop: 4,
    },
    resultLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 4,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginBottom: 16,
    },
    amountText: {
        color: '#FFF',
        fontSize: 36,
        fontFamily: 'RethinkSans_800ExtraBold',
        lineHeight: 44,
    },
    currencyText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 20,
        fontFamily: 'RethinkSans_600SemiBold',
        marginTop: 4,
        marginLeft: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontFamily: 'RethinkSans_500Medium',
        marginBottom: 4,
    },
    summaryValue: {
        color: '#FFF',
        fontSize: 13,
        fontFamily: 'RethinkSans_700Bold',
    },
});
