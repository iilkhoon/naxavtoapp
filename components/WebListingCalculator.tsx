import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Card, Segmented, useWebTokens, FONT, formatMoney } from './web/WebKit';

interface WebListingCalculatorProps {
    initialPrice: number | string;
    onApplyCredit?: () => void;
}

const TERMS = ['12', '24', '36', '48', '60'] as const;
type Term = typeof TERMS[number];
const DOWN_PERCENTS = [20, 30, 40, 50] as const;

// Compact monthly-payment estimate shown on credit listings (web)
export const WebListingCalculator = ({ initialPrice, onApplyCredit }: WebListingCalculatorProps) => {
    const t = useWebTokens();
    const price = Number(initialPrice) || 0;
    const [down, setDown] = useState(() => (price > 0 ? String(Math.round(price * 0.3)) : ''));
    const [rate, setRate] = useState('21');
    const [months, setMonths] = useState<Term>('36');

    const downNum = parseFloat(down) || 0;
    const principal = Math.max(0, price - downNum);

    const monthly = useMemo(() => {
        const n = Number(months);
        const r = parseFloat(rate) || 0;
        if (principal <= 0) return 0;
        if (r === 0) return principal / n;
        const mr = r / 12 / 100;
        return principal * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    }, [principal, rate, months]);

    const applyPercent = (pct: number) => {
        if (price <= 0) return;
        setDown(String(Math.round((price * pct) / 100)));
    };

    const row = (label: string, value: string, onChange: (v: string) => void, suffix: string) => (
        <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={t.placeholder}
                keyboardType="numeric"
                accessibilityLabel={label}
                style={[styles.input, { color: t.text }]}
            />
            <Text style={[styles.suffix, { color: t.textSecondary }]}>{suffix}</Text>
        </View>
    );

    return (
        <Card padding={20}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: t.text }]}>Kredit hesablaması</Text>
                {price > 0 && (
                    <Text style={[styles.loanHint, { color: t.textSecondary }]}>
                        Kredit: {formatMoney(principal)}
                    </Text>
                )}
            </View>
            <Text style={[styles.label, { color: t.textSecondary }]}>Təxmini aylıq ödəniş</Text>
            <Text style={[styles.value, { color: t.text }]}>{formatMoney(monthly)}</Text>

            {price > 0 && (
                <View style={styles.pctRow}>
                    {DOWN_PERCENTS.map((pct) => {
                        const targetDown = Math.round((price * pct) / 100);
                        const active = Math.abs(downNum - targetDown) < 5;
                        return (
                            <TouchableOpacity
                                key={pct}
                                onPress={() => applyPercent(pct)}
                                style={[
                                    styles.pctChip,
                                    {
                                        backgroundColor: active ? t.accent : t.fill,
                                        borderColor: active ? t.accent : t.hairline,
                                    },
                                ]}
                            >
                                <Text style={[styles.pctText, { color: active ? '#FFF' : t.textSecondary }]}>
                                    İlkin {pct}%
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            <View style={[styles.group, { backgroundColor: t.fill }]}>
                {row('İlkin ödəniş', down, setDown, '₼')}
                <View style={[styles.sep, { backgroundColor: t.hairline }]} />
                {row('İllik faiz', rate, setRate, '%')}
            </View>
            <Segmented
                options={TERMS.map((m) => ({ value: m, label: `${m} ay` }))}
                value={months}
                onChange={setMonths}
                fullWidth
                style={{ marginTop: 12 }}
            />
            {onApplyCredit && (
                <TouchableOpacity
                    onPress={onApplyCredit}
                    style={[styles.applyBtn, { backgroundColor: t.accent }]}
                    activeOpacity={0.85}
                >
                    <Text style={styles.applyBtnText}>Bu şərtlərlə müraciət et</Text>
                </TouchableOpacity>
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 17, fontFamily: FONT.bold },
    loanHint: { fontSize: 12, fontFamily: FONT.semibold },
    label: { fontSize: 13, fontFamily: FONT.medium },
    value: { fontSize: 34, fontFamily: FONT.heavy, letterSpacing: -1, marginBottom: 14 },
    pctRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    pctChip: {
        flex: 1,
        height: 28,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer' as any,
    },
    pctText: { fontSize: 11, fontFamily: FONT.semibold },
    group: { borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', height: 46, paddingHorizontal: 14, gap: 8 },
    rowLabel: { flex: 1, fontSize: 14, fontFamily: FONT.semibold },
    input: { width: 110, height: '100%', textAlign: 'right', fontSize: 15, fontFamily: FONT.semibold, padding: 0, outlineStyle: 'none' } as any,
    suffix: { width: 16, fontSize: 14, fontFamily: FONT.medium },
    sep: { height: StyleSheet.hairlineWidth, marginLeft: 14 },
    applyBtn: {
        marginTop: 12,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer' as any,
    },
    applyBtnText: { color: '#FFF', fontSize: 14, fontFamily: FONT.semibold },
});
