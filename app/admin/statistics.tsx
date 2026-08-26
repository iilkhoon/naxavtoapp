import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, TouchableOpacity, Platform
} from 'react-native';
import {
    Users, Car, Hash, Clock, CheckCircle, Star, Zap, Calendar, ArrowLeft, RefreshCw, TrendingUp
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NativeAdminStatistics() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { showToast } = useToast();

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
                <Icon size={22} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Statistika</Text>
                <TouchableOpacity onPress={fetchStats} style={styles.refreshBtn}>
                    <RefreshCw size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <View style={styles.contentWrap}>
                        {/* General Stats */}
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ümumi Məlumatlar</Text>
                        <StatCard label="Qeydiyyatdan keçən istifadəçilər" value={stats.totalUsers} icon={Users} color="#AF52DE" bg={colors.card} />
                        <StatCard label="Bu gün əlavə edilən (Avtomobil)" value={stats.carsToday} icon={Calendar} color="#FF9500" bg={colors.card} />
                        <StatCard label="Bu gün əlavə edilən (Nömrə)" value={stats.platesToday} icon={Calendar} color="#FF9500" bg={colors.card} />

                        {/* Cars Stats */}
                        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Avtomobil Elanları</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.gridColumn}>
                                <StatCard label="Aktiv" value={stats.activeCars} icon={Car} color="#34C759" bg={colors.card} />
                                <StatCard label="VIP" value={stats.vipCars} icon={Star} color="#FFD700" bg={colors.card} />
                            </View>
                            <View style={styles.gridColumn}>
                                <StatCard label="Gözləyən" value={stats.pendingCars} icon={Clock} color="#FF3B30" bg={colors.card} />
                                <StatCard label="Təcili" value={stats.urgentCars} icon={Zap} color="#FF3B30" bg={colors.card} />
                            </View>
                        </View>

                        {/* Plates Stats */}
                        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Nömrə Elanları</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.gridColumn}>
                                <StatCard label="Aktiv" value={stats.activePlates} icon={Hash} color="#34C759" bg={colors.card} />
                                <StatCard label="VIP" value={stats.vipPlates} icon={Star} color="#FFD700" bg={colors.card} />
                            </View>
                            <View style={styles.gridColumn}>
                                <StatCard label="Gözləyən" value={stats.pendingPlates} icon={Clock} color="#FF3B30" bg={colors.card} />
                            </View>
                        </View>

                        {/* Chart Section */}
                        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Son 7 Gün (Yeni Elanlar)</Text>
                        <View
                            style={[styles.chartCard, { backgroundColor: colors.card }]}
                            onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                        >
                            {chartWidth > 0 && stats.chartLabels.length > 0 && (
                                <LineChart
                                    data={{
                                        labels: stats.chartLabels,
                                        datasets: [{ data: stats.chartData.some(d => d > 0) ? stats.chartData : [0, 0, 0, 0, 0, 0, 0] }]
                                    }}
                                    width={chartWidth - 32} // padding inside card
                                    height={220}
                                    yAxisLabel=""
                                    yAxisSuffix=""
                                    chartConfig={{
                                        backgroundColor: colors.card,
                                        backgroundGradientFrom: colors.card,
                                        backgroundGradientTo: colors.card,
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
                        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Ən Çox Baxılanlar (Avto)</Text>
                        <View style={{ flexDirection: 'column', gap: 12 }}>
                            {stats.topListings.map((car: any) => (
                                <View key={car.id} style={[styles.topCarCard, { backgroundColor: colors.card }]}>
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
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'android' ? 10 : 20,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
    },
    refreshBtn: {
        padding: 4,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingWrap: {
        paddingTop: 100,
        alignItems: 'center',
    },
    contentWrap: {
        display: 'flex',
        flexDirection: 'column',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'RethinkSans_700Bold',
        marginBottom: 16,
    },
    statCard: {
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 26,
        fontFamily: 'RethinkSans_800ExtraBold',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'RethinkSans_600SemiBold',
        color: '#8E8E93',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    gridColumn: {
        flex: 1,
    },
    chartCard: {
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        overflow: 'hidden',
    },
    topCarCard: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
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
