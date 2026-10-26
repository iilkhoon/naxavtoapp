import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Card, Segmented, useWebTokens, FONT, formatMoney } from './web/WebKit';

interface WebListingCalculatorProps {
    initialPrice: number | string;
}

const TERMS = ['12', '24', '36', '48', '60'] as const;
type Term = typeof TERMS[number];

// Compact monthly-payment estimate shown on credit listings (web)
export const WebListingCalculator = ({ initialPrice }: WebListingCalculatorProps) => {
    const t = useWebTokens();
    const price = Number(initialPrice) || 0;
    const [down, setDown] = useState('');
    const [rate, setRate] = useState('21');
    const [months, setMonths] = useState<Term>('36');

    const monthly = useMemo(() => {
        const principal = Math.max(0, price - (parseFloat(down) || 0));
        const n = Number(months);
        const r = parseFloat(rate) || 0;
        if (principal <= 0) return 0;
        if (r === 0) return principal / n;
        const mr = r / 12 / 100;
        return principal * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
    }, [price, down, rate, months]);

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
            <Text style={[styles.title, { color: t.text }]}>Kredit hesablaması</Text>
            <Text style={[styles.label, { color: t.textSecondary }]}>Aylıq ödəniş</Text>
            <Text style={[styles.value, { color: t.text }]}>{formatMoney(monthly)}</Text>

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
        </Card>
    );
};

const styles = StyleSheet.create({
    title: { fontSize: 17, fontFamily: FONT.bold, marginBottom: 12 },
    label: { fontSize: 13, fontFamily: FONT.medium },
    value: { fontSize: 34, fontFamily: FONT.heavy, letterSpacing: -1, marginBottom: 16 },
    group: { borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', height: 46, paddingHorizontal: 14, gap: 8 },
    rowLabel: { flex: 1, fontSize: 14, fontFamily: FONT.semibold },
    input: { width: 110, height: '100%', textAlign: 'right', fontSize: 15, fontFamily: FONT.semibold, padding: 0, outlineStyle: 'none' } as any,
    suffix: { width: 16, fontSize: 14, fontFamily: FONT.medium },
    sep: { height: StyleSheet.hairlineWidth, marginLeft: 14 },
});
