import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
    AdminHeader, AdminScroll, Group, GroupRow, StatTile, LoadingView, useAdminColors, money, F,
} from '../../components/admin/AdminUI';

type Stats = {
    totalUsers: number; carsToday: number; platesToday: number;
    activeCars: number; pendingCars: number; vipCars: number; urgentCars: number;
    activePlates: number; pendingPlates: number; vipPlates: number;
    topListings: any[]; days: { key: string; label: string; count: number }[];
};

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const WEEKDAYS = ['B.', 'B.e', 'Ç.a', 'Ç.', 'C.a', 'C.', 'Ş.'];

export default function NativeAdminStatistics() {
    const router = useRouter();
    const c = useAdminColors();
    const { showToast } = useToast();
    const [stats, setStats] = useState<Stats | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 6);
            const head = { count: 'exact' as const, head: true };

            const [users, actCars, penCars, vipCars, urgCars, todayCars, actPlates, penPlates, vipPlates, todayPlates, top, recent] = await Promise.all([
                supabase.from('profiles').select('id', head),
                supabase.from('listings').select('id', head).eq('status', 'approved'),
                supabase.from('listings').select('id', head).eq('status', 'pending'),
                supabase.from('listings').select('id', head).eq('is_vip', true),
                supabase.from('listings').select('id', head).eq('is_urgent', true),
                supabase.from('listings').select('id', head).gte('created_at', today.toISOString()),
                supabase.from('plates').select('id', head).eq('status', 'approved'),
                supabase.from('plates').select('id', head).eq('status', 'pending'),
                supabase.from('plates').select('id', head).eq('is_vip', true),
                supabase.from('plates').select('id', head).gte('created_at', today.toISOString()),
                supabase.from('listings').select('id, short_id, make, model, year, price, currency, views').order('views', { ascending: false }).limit(5),
                supabase.from('listings').select('created_at').gte('created_at', weekAgo.toISOString()),
            ]);

            const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekAgo);
                d.setDate(d.getDate() + i);
                return { key: dayKey(d), label: i === 6 ? 'Bu gün' : WEEKDAYS[d.getDay()], count: 0 };
            });
            (recent.data || []).forEach((row: any) => {
                const slot = days.find((d) => d.key === dayKey(new Date(row.created_at)));
                if (slot) slot.count++;
            });

            setStats({
                totalUsers: users.count || 0,
                activeCars: actCars.count || 0,
                pendingCars: penCars.count || 0,
                vipCars: vipCars.count || 0,
                urgentCars: urgCars.count || 0,
                carsToday: todayCars.count || 0,
                activePlates: actPlates.count || 0,
                pendingPlates: penPlates.count || 0,
                vipPlates: vipPlates.count || 0,
                platesToday: todayPlates.count || 0,
                topListings: top.data || [],
                days,
            });
        } catch (e: any) {
            showToast('Xəta: ' + e.message, 'error');
        } finally {
            setRefreshing(false);
        }
    }, [showToast]);

    useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

    if (!stats) {
        return (
            <View style={{ flex: 1, backgroundColor: c.background }}>
                <AdminHeader title="Statistika" backLabel="Admin" />
                <LoadingView />
            </View>
        );
    }

    const max = Math.max(1, ...stats.days.map((d) => d.count));
    const caption = (text: string) => <Text style={[styles.caption, { color: c.textSecondary }]}>{text}</Text>;

    return (
        <View style={{ flex: 1, backgroundColor: c.background }}>
            <AdminHeader title="Statistika" subtitle="Saytın və tətbiqin göstəriciləri" backLabel="Admin" />
            <AdminScroll refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }}>
                {caption('BU GÜN')}
                <View style={styles.row}>
                    <StatTile label="Yeni avtomobil" value={stats.carsToday} />
                    <StatTile label="Yeni nömrə" value={stats.platesToday} />
                    <StatTile label="İstifadəçi" value={stats.totalUsers} />
                </View>

                {caption('AVTOMOBİL ELANLARI')}
                <View style={styles.row}>
                    <StatTile label="Aktiv" value={stats.activeCars} />
                    <StatTile label="Gözləyir" value={stats.pendingCars} tone={stats.pendingCars ? c.warning : undefined} />
                </View>
                <View style={styles.row}>
                    <StatTile label="VIP" value={stats.vipCars} />
                    <StatTile label="Təcili" value={stats.urgentCars} />
                </View>

                {caption('NÖMRƏ ELANLARI')}
                <View style={styles.row}>
                    <StatTile label="Aktiv" value={stats.activePlates} />
                    <StatTile label="Gözləyir" value={stats.pendingPlates} tone={stats.pendingPlates ? c.warning : undefined} />
                    <StatTile label="VIP" value={stats.vipPlates} />
                </View>

                {caption('SON 7 GÜN · YENİ ELANLAR')}
                <View style={[styles.chart, { backgroundColor: c.card, borderColor: c.hairline }]}>
                    {stats.days.map((d, i) => (
                        <View key={d.key} style={styles.barCol}>
                            <Text style={[styles.barValue, { color: d.count ? c.text : c.tertiary }]}>{d.count}</Text>
                            <View style={[styles.barTrack, { backgroundColor: c.fill }]}>
                                <View style={[styles.bar, { height: `${(d.count / max) * 100}%`, backgroundColor: i === 6 ? c.primary : c.text }]} />
                            </View>
                            <Text style={[styles.barLabel, { color: c.textSecondary }]} numberOfLines={1}>{d.label}</Text>
                        </View>
                    ))}
                </View>

                {stats.topListings.length > 0 && (
                    <Group title="Ən çox baxılan">
                        {stats.topListings.map((car: any, i: number) => (
                            <GroupRow
                                key={car.id}
                                icon={() => <Text style={[styles.rank, { color: c.text }]}>{i + 1}</Text>}
                                title={`${car.make} ${car.model}`}
                                subtitle={`${money(car.price, car.currency)}${car.year ? ` · ${car.year}` : ''}`}
                                value={`${car.views || 0} baxış`}
                                onPress={() => router.push(`/listing/${car.short_id || car.id}` as any)}
                            />
                        ))}
                    </Group>
                )}
            </AdminScroll>
        </View>
    );
}

const styles = StyleSheet.create({
    caption: { fontSize: 13, fontFamily: F.semibold, letterSpacing: 0.4, marginBottom: 8, marginLeft: 16, marginTop: 8 },
    row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 190, padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 24 },
    barCol: { flex: 1, alignItems: 'center', height: '100%', gap: 5 },
    barValue: { fontSize: 11, fontFamily: F.semibold },
    barTrack: { flex: 1, width: '100%', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    bar: { width: '100%', borderRadius: 6, minHeight: 2 },
    barLabel: { fontSize: 10, fontFamily: F.medium },
    rank: { fontSize: 14, fontFamily: F.bold },
});
