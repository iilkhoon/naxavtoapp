import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Stat, Card, Button, GroupCaption, Loading, useWebTokens, useBreakpoints, FONT, formatMoney } from '../../components/web/WebKit';
import { AdminPage, DataTable, CellText } from '../../components/web/AdminKit';

type Stats = {
    totalUsers: number; carsToday: number; platesToday: number;
    activeCars: number; pendingCars: number; vipCars: number; urgentCars: number;
    activePlates: number; pendingPlates: number; vipPlates: number;
    topListings: any[]; days: { key: string; label: string; count: number }[];
};

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const WEEKDAYS = ['B.', 'B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.'];

export default function WebAdminStatistics() {
    const router = useRouter();
    const t = useWebTokens();
    const { isMobile } = useBreakpoints();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 6);
            const head = { count: 'exact' as const, head: true };

            const [
                users, actCars, penCars, vipCars, urgCars, todayCars,
                actPlates, penPlates, vipPlates, todayPlates, top, recent,
            ] = await Promise.all([
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
                supabase.from('listings').select('id, short_id, make, model, year, price, currency, views, status').order('views', { ascending: false }).limit(5),
                supabase.from('listings').select('created_at').gte('created_at', weekAgo.toISOString()),
            ]);

            const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekAgo);
                d.setDate(d.getDate() + i);
                return { key: dayKey(d), label: i === 6 ? 'Bu gün' : `${WEEKDAYS[d.getDay()]} ${d.getDate()}`, count: 0 };
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
            setLoading(false);
        }
    }, [showToast]);

    useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

    const row = (children: React.ReactNode) => <View style={[styles.row, isMobile && { flexWrap: 'wrap' }]}>{children}</View>;
    const max = Math.max(1, ...(stats?.days.map((d) => d.count) || [0]));

    return (
        <AdminPage
            title="Statistika"
            subtitle="Saytın və tətbiqin ümumi göstəriciləri"
            actions={<Button variant="secondary" size="sm" title="Yenilə" loading={loading && !!stats} icon={<RefreshCw size={14} color={t.text} />} onPress={fetchStats} />}
        >
            {!stats ? <Loading /> : (
                <>
                    <GroupCaption>Bu gün</GroupCaption>
                    {row(<>
                        <Stat label="Yeni avtomobil elanı" value={String(stats.carsToday)} />
                        <Stat label="Yeni nömrə elanı" value={String(stats.platesToday)} />
                        <Stat label="Qeydiyyatlı istifadəçi" value={String(stats.totalUsers)} />
                    </>)}

                    <GroupCaption style={styles.caption}>Avtomobil elanları</GroupCaption>
                    {row(<>
                        <Stat label="Aktiv" value={String(stats.activeCars)} />
                        <Stat label="Təsdiq gözləyir" value={String(stats.pendingCars)} tone={stats.pendingCars ? t.warning : undefined} />
                        <Stat label="VIP" value={String(stats.vipCars)} />
                        <Stat label="Təcili" value={String(stats.urgentCars)} />
                    </>)}

                    <GroupCaption style={styles.caption}>Nömrə elanları</GroupCaption>
                    {row(<>
                        <Stat label="Aktiv" value={String(stats.activePlates)} />
                        <Stat label="Təsdiq gözləyir" value={String(stats.pendingPlates)} tone={stats.pendingPlates ? t.warning : undefined} />
                        <Stat label="VIP" value={String(stats.vipPlates)} />
                    </>)}

                    <GroupCaption style={styles.caption}>Son 7 gün · yeni elanlar</GroupCaption>
                    <Card padding={isMobile ? 16 : 24}>
                        <View style={styles.chart}>
                            {stats.days.map((d, i) => (
                                <View key={d.key} style={styles.barCol}>
                                    <Text style={[styles.barValue, { color: d.count ? t.text : t.textTertiary }]}>{d.count}</Text>
                                    <View style={[styles.barTrack, { backgroundColor: t.fill }]}>
                                        <View style={[styles.bar, { height: `${(d.count / max) * 100}%` as any, backgroundColor: i === 6 ? t.accent : t.text }]} />
                                    </View>
                                    <Text style={[styles.barLabel, { color: t.textSecondary }]} numberOfLines={1}>{d.label}</Text>
                                </View>
                            ))}
                        </View>
                    </Card>

                    <GroupCaption style={styles.caption}>Ən çox baxılan elanlar</GroupCaption>
                    <DataTable
                        data={stats.topListings}
                        keyExtractor={(c) => c.id}
                        onRowPress={(c) => router.push(`/listing/${c.short_id || c.id}` as any)}
                        columns={[
                            { key: 'n', title: '#', width: 24, render: (_c, i) => <Text style={[styles.rank, { color: t.textSecondary }]}>{i + 1}</Text> },
                            { key: 'car', title: 'Elan', flex: 2, render: (c) => <CellText title={`${c.make} ${c.model}`} subtitle={c.year ? String(c.year) : undefined} /> },
                            { key: 'price', title: 'Qiymət', flex: 1, align: 'right', hideOnMobile: true, render: (c) => <CellText title={formatMoney(c.price, c.currency)} /> },
                            { key: 'views', title: 'Baxış', flex: 1, align: 'right', render: (c) => <CellText title={`${c.views || 0}`} strong /> },
                        ]}
                    />
                </>
            )}
        </AdminPage>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 12 },
    caption: { marginTop: 28 },
    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 220 },
    barCol: { flex: 1, alignItems: 'center', height: '100%', gap: 6 },
    barValue: { fontSize: 12, fontFamily: FONT.semibold },
    barTrack: { flex: 1, width: '100%', maxWidth: 44, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
    bar: { width: '100%', borderRadius: 8, minHeight: 2 },
    barLabel: { fontSize: 11, fontFamily: FONT.medium },
    rank: { fontSize: 14, fontFamily: FONT.semibold },
});
