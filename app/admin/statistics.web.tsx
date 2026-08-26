import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, useWindowDimensions, TouchableOpacity
} from 'react-native';
import {
    Users, Car, Hash, Clock, CheckCircle, Star, Zap, Calendar, RefreshCw, TrendingUp
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';

export default function WebAdminStatistics() {
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [loading, setLoading] = useState(true);
    const [chartWidth, setChartWidth] = useState(0);
    const [stats, setStats] = useState<{
        totalUsers: number;
        carsToday: number;
        platesToday: number;
        activeCars: number;
        pendingCars: number;
        vipCars: number;
        urgentCars: number;
        activePlates: number;
        pendingPlates: number;
        vipPlates: number;
        topListings: any[];
        chartLabels: string[];
        chartData: number[];
    }>({
        totalUsers: 0,
        carsToday: 0,
        platesToday: 0,
        activeCars: 0,
        pendingCars: 0,
        vipCars: 0,
        urgentCars: 0,
        activePlates: 0,
        pendingPlates: 0,
        vipPlates: 0,
        topListings: [],
        chartLabels: [],
        chartData: [],
    });

    const fetchStats = async () => {
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            const d = new Date();
            d.setDate(d.getDate() - 6);
            d.setHours(0, 0, 0, 0);
            const last7DaysISO = d.toISOString();

            // Run queries in parallel for performance
            const [
                { count: users },
                { count: actCars }, { count: penCars }, { count: vipCars }, { count: urgCars }, { count: todayCars },
                { count: actPlates }, { count: penPlates }, { count: vipPlates }, { count: todayPlates },
                { data: topListingsData },
                { data: recentListingsData }
            ] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }),

                supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
                supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_vip', true),
                supabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_urgent', true),
                supabase.from('listings').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),

                supabase.from('plates').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
                supabase.from('plates').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('plates').select('id', { count: 'exact', head: true }).eq('is_vip', true),
                supabase.from('plates').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),

                supabase.from('listings').select('id, make, model, year, price, views, created_at, status').order('views', { ascending: false }).limit(5),
                supabase.from('listings').select('created_at').gte('created_at', last7DaysISO)
            ]);

            const labels: string[] = [];
            const dataMap: Record<string, number> = {};

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const formatted = `${date.getDate()}/${date.getMonth() + 1}`;
                labels.push(formatted);
                dataMap[formatted] = 0;
            }

            recentListingsData?.forEach(item => {
                const date = new Date(item.created_at);
                const formatted = `${date.getDate()}/${date.getMonth() + 1}`;
                if (dataMap[formatted] !== undefined) {
                    dataMap[formatted]++;
                }
            });

            const cData = labels.map(l => dataMap[l]);

            setStats({
                totalUsers: users || 0,
                activeCars: actCars || 0,
                pendingCars: penCars || 0,
                vipCars: vipCars || 0,
                urgentCars: urgCars || 0,
                carsToday: todayCars || 0,
                activePlates: actPlates || 0,
                pendingPlates: penPlates || 0,
                vipPlates: vipPlates || 0,
                platesToday: todayPlates || 0,
                topListings: topListingsData || [],
                chartLabels: labels,
                chartData: cData,
            });

        } catch (e: any) {
            showToast('Xəta: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        fetchStats();
    }, []));

    const StatCard = ({ label, value, icon: Icon, color, bg }: any) => (
        <View style={[styles.statCard, { backgroundColor: bg }]}>
            <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
                <Icon size={24} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View style={[styles.pageWrap, isMobile && { paddingHorizontal: 16 }]}>

                    {/* Header */}
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={[styles.pageTitle, { color: colors.text }]}>Statistika</Text>
                            <Text style={[styles.pageSub, { color: colors.textSecondary }]}>Sistemin ümumi göstəriciləri</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={fetchStats}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <RefreshCw size={18} color={colors.primary} />}
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.contentSections}>

                            {/* General Stats */}
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ümumi Məlumatlar</Text>
                            <View style={[styles.statsGrid, isMobile && { flexDirection: 'column' }]}>
                                <StatCard label="Qeydiyyatdan keçən" value={stats.totalUsers} icon={Users} color="#AF52DE" bg={isDark ? '#1C1C1E' : '#FFF'} />
                                <StatCard label="Bu gün (Avtomobil)" value={stats.carsToday} icon={Calendar} color="#FF9500" bg={isDark ? '#1C1C1E' : '#FFF'} />
                                <StatCard label="Bu gün (Nömrə)" value={stats.platesToday} icon={Calendar} color="#FF9500" bg={isDark ? '#1C1C1E' : '#FFF'} />
                            </View>

                            {/* Cars Stats */}
                            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Avtomobil Elanları</Text>
                            <View style={[styles.statsGrid, isMobile && { flexDirection: 'column' }]}>
                                <StatCard label="Aktiv" value={stats.activeCars} icon={Car} color="#34C759" bg={isDark ? '#1C1C1E' : '#FFF'} />
                                <StatCard label="Gözləyən" value={stats.pendingCars} icon={Clock} color="#FF3B30" bg={isDark ? '#1C1C1E' : '#FFF'} />
                                <StatCard label="VIP" value={stats.vipCars} icon={Star} color="#FFD700" bg={isDark ? '#1C1C1E' : '#FFF'} />
                                <StatCard label="Təcili" value={stats.urgentCars} icon={Zap} color="#FF3B30" bg={isDark ? '#1C1C1E' : '#FFF'} />
                            </View>

                            {/* Plates Stats */}
                            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Nömrə Elanları</Text>
                            <View style={[styles.statsGrid, isMobile && { flexDirection: 'column' }]}>
                                <StatCard label="Aktiv" value={stats.activePlates} icon={Hash} color="#34C759" bg={isDark ? '#1C1C1E' : '#FFF'} />
                                <StatCard label="Gözləyən" value={stats.pendingPlates} icon={Clock} color="#FF3B30" bg={isDark ? '#1C1C1E' : '#FFF'} />
                                <StatCard label="VIP" value={stats.vipPlates} icon={Star} color="#FFD700" bg={isDark ? '#1C1C1E' : '#FFF'} />
                            </View>

                            {/* Chart Section */}
                            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Son 7 Gün (Yeni Elanlar)</Text>
                            <View
                                style={[styles.chartCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}
                                onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                            >
                                {chartWidth > 0 && stats.chartLabels.length > 0 && (
                                    <LineChart
                                        data={{
                                            labels: stats.chartLabels,
                                            datasets: [{ data: stats.chartData.some(d => d > 0) ? stats.chartData : [0, 0, 0, 0, 0, 0, 0] }]
                                        }}
                                        width={chartWidth - 48} // Padding inside card
                                        height={220}
                                        yAxisLabel=""
                                        yAxisSuffix=""
                                        chartConfig={{
                                            backgroundColor: isDark ? '#1C1C1E' : '#FFF',
                                            backgroundGradientFrom: isDark ? '#1C1C1E' : '#FFF',
                                            backgroundGradientTo: isDark ? '#1C1C1E' : '#FFF',
                                            decimalPlaces: 0,
                                            color: (opacity = 1) => `rgba(88, 86, 214, ${opacity})`,
                                            labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                            style: { borderRadius: 16 },
                                            propsForDots: {
                                                r: "4",
                                                strokeWidth: "2",
                                                stroke: colors.primary
                                            }
                                        }}
                                        bezier
                                        style={{ marginVertical: 8, borderRadius: 16 }}
                                    />
                                )}
                            </View>

                            {/* Top Viewed Listings */}
                            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>Ən Çox Baxılanlar (Avto)</Text>
                            <View style={[styles.statsGrid, isMobile && { flexDirection: 'column' }]}>
                                {stats.topListings.map((car: any, index: number) => (
                                    <View key={car.id} style={[styles.topCarCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
                                        <View style={styles.topCarHeader}>
                                            <TrendingUp size={16} color={colors.primary} />
                                            <Text style={[styles.topCarTitle, { color: colors.text }]} numberOfLines={1}>{car.make} {car.model}</Text>
                                        </View>
                                        <View style={styles.topCarDetails}>
                                            <Text style={{ color: colors.textSecondary }}>{car.year} • {car.price} AZN</Text>
                                            <Text style={{ color: car.status === 'approved' ? '#34C759' : '#FF9500' }}>Status: {car.status}</Text>
                                        </View>
                                        <View style={[styles.viewsBadge, { backgroundColor: colors.primary + '20' }]}>
                                            <Text style={[styles.viewsText, { color: colors.primary }]}>{car.views || 0} baxış</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    pageWrap: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 32,
        paddingTop: 32,
        paddingBottom: 40,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    pageTitle: {
        fontSize: 30,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 4,
    },
    pageSub: {
        fontSize: 14,
        fontFamily: 'RethinkSans_500Medium',
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingWrap: {
        paddingTop: 100,
        alignItems: 'center',
    },
    contentSections: {
        display: 'flex',
        flexDirection: 'column',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    statCard: {
        flex: 1,
        minWidth: 200,
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    statIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 32,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        fontFamily: 'RethinkSans_600SemiBold',
        color: '#8E8E93',
    },
    chartCard: {
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    topCarCard: {
        flex: 1,
        minWidth: 260,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        justifyContent: 'space-between',
        gap: 12
    },
    topCarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    topCarTitle: {
        fontSize: 16,
        fontFamily: 'RethinkSans_700Bold',
        flex: 1
    },
    topCarDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    viewsBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start'
    },
    viewsText: {
        fontSize: 12,
        fontFamily: 'RethinkSans_700Bold'
    }
});
