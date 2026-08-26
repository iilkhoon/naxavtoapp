import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, useWindowDimensions
} from 'react-native';
import {
  Plus, Car, Users, User, AlertTriangle, DollarSign,
  Calendar, Search, ChevronRight, CreditCard,
  TrendingUp, Clock, CheckCircle, XCircle, Eye, Phone,
  FileText, BarChart3, RefreshCw, Hash, Percent
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

type LoanAccount = {
  id: string;
  customer_name: string;
  customer_surname: string;
  customer_fin: string;
  customer_phone: string;
  customer_unique_id: string;
  customer_father_name: string;
  customer_birth_date: string;
  customer_id_card: string;
  car_brand: string;
  car_model: string;
  car_year: number;
  car_plate: string;
  sale_type: string;
  total_price: number;
  down_payment: number;
  loan_amount: number;
  interest_rate: number;
  duration_months: number;
  monthly_payment: number;
  status: string;
  notes: string;
  has_purchase_price: boolean;
  purchase_price: number;
  profit: number;
  created_at: string;
};

type DashboardStats = {
  totalSold: number;
  activeLoans: number;
  overdueTotal: number;
  thisMonthPayments: number;
  expectedPayments: number;
  completedLoans: number;
};

export default function AdminLoansWeb() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isWide = width > 900;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [schedules, setSchedules] = useState<Record<string, any[]>>({});
  const [stats, setStats] = useState<DashboardStats>({
    totalSold: 0, activeLoans: 0, overdueTotal: 0,
    thisMonthPayments: 0, expectedPayments: 0, completedLoans: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'loans' | 'users' | 'overdue' | 'reports'>('dashboard');
  const [overdueItems, setOverdueItems] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      await supabase.rpc('update_overdue_payments');

      const { data: loansData } = await supabase
        .from('loan_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      setLoans(loansData || []);

      const activeLoanIds = (loansData || []).filter(l => l.status === 'active').map(l => l.id);
      if (activeLoanIds.length > 0) {
        const { data: allSchedules } = await supabase
          .from('loan_schedule')
          .select('loan_id, status, due_date')
          .in('loan_id', activeLoanIds)
          .eq('status', 'overdue');
          
        const grouped: Record<string, any[]> = {};
        (allSchedules || []).forEach(s => {
          if (!grouped[s.loan_id]) grouped[s.loan_id] = [];
          grouped[s.loan_id].push(s);
        });
        setSchedules(grouped);
      } else {
        setSchedules({});
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const [
        { count: totalSold },
        { count: activeLoans },
        { count: completedLoans },
        { data: overdueSchedule },
        { data: thisMonthPaid },
        { data: expectedData },
        { data: overdueList }
      ] = await Promise.all([
        supabase.from('loan_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('loan_accounts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('loan_accounts').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('loan_schedule').select('amount').eq('status', 'overdue'),
        supabase.from('loan_payments').select('amount').eq('status', 'paid')
          .gte('payment_date', monthStart).lte('payment_date', monthEnd),
        supabase.from('loan_schedule').select('amount').eq('status', 'pending')
          .gte('due_date', monthStart).lte('due_date', monthEnd),
        supabase.from('loan_schedule').select('*, loan_accounts(*)').eq('status', 'overdue').order('due_date'),
      ]);

      const overdueTotal = (overdueSchedule || []).reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const monthPaid = (thisMonthPaid || []).reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const expected = (expectedData || []).reduce((sum: number, s: any) => sum + Number(s.amount), 0);

      setStats({ totalSold: totalSold || 0, activeLoans: activeLoans || 0, overdueTotal, thisMonthPayments: monthPaid, expectedPayments: expected, completedLoans: completedLoans || 0 });
      setOverdueItems(overdueList || []);
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const filteredLoans = loans.filter(l => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return l.customer_name.toLowerCase().includes(q) || l.customer_surname.toLowerCase().includes(q) ||
      l.customer_phone.includes(q) || l.car_brand.toLowerCase().includes(q) || l.car_model.toLowerCase().includes(q) ||
      (l.customer_fin && l.customer_fin.toLowerCase().includes(q)) || (l.car_plate && l.car_plate.toLowerCase().includes(q));
  });

  const formatPrice = (n: number) => n.toLocaleString('az-AZ', { minimumFractionDigits: 0 });
  const getStatusColor = (s: string) => ({ active: '#007AFF', completed: '#34C759', defaulted: '#FF3B30', cancelled: '#8E8E93' }[s] || colors.textSecondary);
  const getStatusText = (s: string) => ({ active: 'Aktiv', completed: 'Bağlanıb', defaulted: 'Defolt', cancelled: 'Ləğv' }[s] || s);

  const totalLoanAmount = loans.reduce((s, l) => s + Number(l.loan_amount), 0);
  const totalDownPayment = loans.reduce((s, l) => s + Number(l.down_payment), 0);
  const totalSaleValue = loans.reduce((s, l) => s + Number(l.total_price), 0);
  const cashSales = loans.filter(l => l.sale_type === 'cash');
  const creditSales = loans.filter(l => l.sale_type === 'credit');

  const StatCard = ({ icon: Icon, label, value, color, suffix = '' }: any) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '15' }]}>
        <Icon size={22} color={color} />
      </View>
      <View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}{suffix}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Kredit Paneli</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Kreditlə satış idarəetmə sistemi</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.refreshBtn, { borderColor: colors.border }]} onPress={fetchData}>
            <RefreshCw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/admin/loan-create' as any)}
          >
            <Plus size={18} color="#FFF" />
            <Text style={styles.createBtnText}>Yeni Satış</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'loans', label: 'Kreditlər', icon: CreditCard },
          { id: 'users', label: 'İstifadəçilər', icon: Users },
          { id: 'overdue', label: `Gecikmələr (${overdueItems.length})`, icon: AlertTriangle },
          { id: 'reports', label: 'Hesabatlar', icon: FileText },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <tab.icon size={16} color={activeTab === tab.id ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : colors.textSecondary },
              activeTab === tab.id && { fontFamily: 'RethinkSans_700Bold' }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 80, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <View>
              <View style={[styles.statsGrid, isWide && styles.statsGridWide]}>
                <StatCard icon={Car} label="Satılan maşın" value={stats.totalSold} color="#AF52DE" />
                <StatCard icon={CreditCard} label="Aktiv kredit" value={stats.activeLoans} color="#007AFF" />
                <StatCard icon={AlertTriangle} label="Gecikmiş cəmi" value={formatPrice(stats.overdueTotal)} color="#FF3B30" suffix=" ₼" />
                <StatCard icon={TrendingUp} label="Bu ay gəlir" value={formatPrice(stats.thisMonthPayments)} color="#34C759" suffix=" ₼" />
                <StatCard icon={Clock} label="Gözlənilən" value={formatPrice(stats.expectedPayments)} color="#FF9500" suffix=" ₼" />
                <StatCard icon={CheckCircle} label="Bağlanan" value={stats.completedLoans} color="#5856D6" />
              </View>

              {/* Recent Loans Table */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Son Kreditlər</Text>
              <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 2 }]}>Müştəri</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 2 }]}>Maşın</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Kredit</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Aylıq</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Status</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, width: 40 }]}></Text>
                </View>
                {loans.slice(0, 10).map(loan => (
                  <TouchableOpacity
                    key={loan.id}
                    style={[styles.tableRow, { borderBottomColor: colors.border }]}
                    onPress={() => router.push(`/admin/loan-detail?id=${loan.id}` as any)}
                  >
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.td, { color: colors.text, fontFamily: 'RethinkSans_600SemiBold' }]}>{loan.customer_name} {loan.customer_surname}</Text>
                      <Text style={[styles.tdSub, { color: colors.textSecondary }]}>{loan.customer_phone}</Text>
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.td, { color: colors.text }]}>{loan.car_brand} {loan.car_model}</Text>
                      <Text style={[styles.tdSub, { color: colors.textSecondary }]}>{loan.car_year}{loan.car_plate ? ` • ${loan.car_plate}` : ''}</Text>
                    </View>
                    <Text style={[styles.td, { flex: 1, color: colors.text }]}>{formatPrice(loan.loan_amount)} ₼</Text>
                    <Text style={[styles.td, { flex: 1, color: colors.text }]}>{formatPrice(loan.monthly_payment)} ₼</Text>
                    <View style={{ flex: 1 }}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>{getStatusText(loan.status)}</Text>
                      </View>
                    </View>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Loans Tab */}
          {activeTab === 'loans' && (
            <View>
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Ad, telefon, FIN, marka ilə axtar..."
                  placeholderTextColor={colors.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 2 }]}>Müştəri</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 2 }]}>Maşın</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Qiymət</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>İlkin</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Kredit</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 0.7 }]}>Faiz</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 0.7 }]}>Müddət</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Aylıq</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Status</Text>
                  <Text style={[styles.th, { color: colors.textSecondary, width: 40 }]}></Text>
                </View>
                {filteredLoans.map(loan => (
                  <TouchableOpacity
                    key={loan.id}
                    style={[styles.tableRow, { borderBottomColor: colors.border }]}
                    onPress={() => router.push(`/admin/loan-detail?id=${loan.id}` as any)}
                  >
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.td, { color: colors.text, fontFamily: 'RethinkSans_600SemiBold' }]}>{loan.customer_name} {loan.customer_surname}</Text>
                      <Text style={[styles.tdSub, { color: colors.textSecondary }]}>{loan.customer_phone}</Text>
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.td, { color: colors.text }]}>{loan.car_brand} {loan.car_model}</Text>
                      <Text style={[styles.tdSub, { color: colors.textSecondary }]}>{loan.car_year}</Text>
                    </View>
                    <Text style={[styles.td, { flex: 1, color: colors.text }]}>{formatPrice(loan.total_price)} ₼</Text>
                    <Text style={[styles.td, { flex: 1, color: '#34C759' }]}>{formatPrice(loan.down_payment)} ₼</Text>
                    <Text style={[styles.td, { flex: 1, color: '#007AFF', fontFamily: 'RethinkSans_700Bold' }]}>{formatPrice(loan.loan_amount)} ₼</Text>
                    <Text style={[styles.td, { flex: 0.7, color: loan.interest_rate > 0 ? '#FF9500' : colors.textSecondary }]}>{loan.interest_rate}%</Text>
                    <Text style={[styles.td, { flex: 0.7, color: colors.text }]}>{loan.duration_months} ay</Text>
                    <Text style={[styles.td, { flex: 1, color: colors.text, fontFamily: 'RethinkSans_700Bold' }]}>{formatPrice(loan.monthly_payment)} ₼</Text>
                    <View style={{ flex: 1 }}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>{getStatusText(loan.status)}</Text>
                      </View>
                    </View>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <ChevronRight size={16} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))}
                {filteredLoans.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_500Medium' }}>Kredit tapılmadı</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Overdue Tab */}
          {activeTab === 'overdue' && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Gecikmiş Ödənişlər</Text>
              {overdueItems.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <CheckCircle size={48} color="#34C759" />
                  <Text style={[styles.emptyText, { color: colors.text }]}>Gecikmiş ödəniş yoxdur! 🎉</Text>
                </View>
              ) : (
                <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.th, { color: colors.textSecondary, flex: 2 }]}>Müştəri</Text>
                    <Text style={[styles.th, { color: colors.textSecondary, flex: 2 }]}>Maşın</Text>
                    <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Hissə</Text>
                    <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Məbləğ</Text>
                    <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Tarix</Text>
                    <Text style={[styles.th, { color: colors.textSecondary, flex: 1 }]}>Gecikib</Text>
                  </View>
                  {overdueItems.map((item: any) => {
                    const daysLate = Math.floor((Date.now() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24));
                    const loan = item.loan_accounts;
                    return (
                      <View key={item.id} style={[styles.tableRow, { borderBottomColor: colors.border, backgroundColor: 'rgba(255,59,48,0.03)' }]}>
                        <View style={{ flex: 2 }}>
                          <Text style={[styles.td, { color: colors.text, fontFamily: 'RethinkSans_600SemiBold' }]}>{loan?.customer_name} {loan?.customer_surname}</Text>
                          <Text style={[styles.tdSub, { color: colors.textSecondary }]}>{loan?.customer_phone}</Text>
                        </View>
                        <Text style={[styles.td, { flex: 2, color: colors.text }]}>{loan?.car_brand} {loan?.car_model}</Text>
                        <Text style={[styles.td, { flex: 1, color: colors.text }]}>#{item.installment_number}</Text>
                        <Text style={[styles.td, { flex: 1, color: '#FF3B30', fontFamily: 'RethinkSans_700Bold' }]}>{Number(item.amount).toLocaleString('az-AZ')} ₼</Text>
                        <Text style={[styles.td, { flex: 1, color: colors.textSecondary }]}>{formatDate(item.due_date)}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={styles.daysLateBadge}>
                            <Text style={styles.daysLateText}>{daysLate} gün</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Users Tab (Aktiv İstifadəçilər) */}
          {activeTab === 'users' && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>👥 Aktiv İstifadəçilər</Text>
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Search size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Ad, FIN, telefon ilə axtar..."
                  placeholderTextColor={colors.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Unique Users from Loans */}
              {(() => {
                const uniqueUsers = new Map<string, LoanAccount[]>();
                loans.forEach(loan => {
                  const key = loan.customer_fin || `${loan.customer_name}_${loan.customer_surname}`;
                  if (!uniqueUsers.has(key)) uniqueUsers.set(key, []);
                  uniqueUsers.get(key)!.push(loan);
                });

                const filteredUsers = Array.from(uniqueUsers.entries()).filter(([key, userLoans]) => {
                  const q = searchQuery.toLowerCase();
                  if (!q) return true;
                  const first = userLoans[0];
                  return first.customer_name.toLowerCase().includes(q) ||
                    first.customer_surname.toLowerCase().includes(q) ||
                    first.customer_phone.includes(q) ||
                    (first.customer_fin && first.customer_fin.toLowerCase().includes(q)) ||
                    (first.customer_unique_id && first.customer_unique_id.toLowerCase().includes(q));
                });

                return (
                  <View style={{ gap: 16 }}>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_500Medium', marginBottom: 8 }}>
                      Toplam: {filteredUsers.length} müştəri, {loans.length} kredit
                    </Text>
                    {filteredUsers.map(([key, userLoans]) => {
                      const user = userLoans[0];
                      const activeCount = userLoans.filter(l => l.status === 'active').length;
                      const totalDebt = userLoans.reduce((s, l) => s + Number(l.loan_amount), 0);
                      const totalProfit = userLoans.reduce((s, l) => s + Number(l.profit || 0), 0);
                      return (
                        <View key={key} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                          <View style={styles.userCardHeader}>
                            <View style={[styles.userAvatar, { backgroundColor: isDark ? '#1c2a3d' : '#EFF6FF' }]}>
                              <User size={24} color="#007AFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.userName, { color: colors.text }]}>{user.customer_name} {user.customer_surname}</Text>
                              {user.customer_unique_id && (
                                <Text style={[styles.userUniqueId, { color: colors.primary }]}>#{user.customer_unique_id}</Text>
                              )}
                              <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                                {user.customer_fin && <Text style={[styles.userDetail, { color: colors.textSecondary }]}>FIN: {user.customer_fin}</Text>}
                                <Text style={[styles.userDetail, { color: colors.textSecondary }]}>📞 {user.customer_phone}</Text>
                                {user.customer_birth_date && <Text style={[styles.userDetail, { color: colors.textSecondary }]}>🎂 {formatDate(user.customer_birth_date)}</Text>}
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <View style={[styles.userStatBadge, { backgroundColor: activeCount > 0 ? '#007AFF15' : '#34C75915' }]}>
                                <Text style={[styles.userStatText, { color: activeCount > 0 ? '#007AFF' : '#34C759' }]}>
                                  {activeCount > 0 ? `${activeCount} aktiv kredit` : 'Bağlanıb'}
                                </Text>
                              </View>
                              {totalProfit > 0 && (
                                <Text style={{ color: '#34C759', fontSize: 12, fontFamily: 'RethinkSans_700Bold' }}>+{totalProfit.toLocaleString('az-AZ')} ₼ mənfəət</Text>
                              )}
                            </View>
                          </View>

                          {/* User's Loans */}
                          <View style={[styles.userLoansGrid, { borderTopColor: colors.border }]}>
                            {userLoans.map(loan => (
                              <TouchableOpacity
                                key={loan.id}
                                style={[styles.userLoanItem, { backgroundColor: isDark ? '#1a1a1e' : '#F8F8FA', borderColor: colors.border }]}
                                onPress={() => router.push(`/admin/loan-detail?id=${loan.id}` as any)}
                              >
                                <View style={styles.userLoanRow}>
                                  <Car size={16} color={colors.textSecondary} />
                                  <Text style={[styles.userLoanCar, { color: colors.text }]}>{loan.car_brand} {loan.car_model} ({loan.car_year})</Text>
                                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '15' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>{getStatusText(loan.status)}</Text>
                                  </View>
                                </View>
                                <View style={styles.userLoanRow}>
                                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'RethinkSans_500Medium' }}>
                                    Kredit: {formatPrice(loan.loan_amount)} ₼ • Aylıq: {formatPrice(loan.monthly_payment)} ₼
                                    {loan.interest_rate > 0 ? ` • ${loan.interest_rate}%` : ''}
                                  </Text>
                                  <ChevronRight size={14} color={colors.textSecondary} />
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          )}


          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 20 }}>
              <View style={[styles.reportCard, { backgroundColor: colors.card, flex: 1 }]}>
                <Text style={[styles.reportTitle, { color: colors.text }]}>💰 Maliyyə Xülasəsi</Text>
                {[
                  { l: 'Toplam satış dəyəri', v: `${totalSaleValue.toLocaleString('az-AZ')} ₼` },
                  { l: 'Toplam ilkin ödənişlər', v: `${totalDownPayment.toLocaleString('az-AZ')} ₼`, c: '#34C759' },
                  { l: 'Toplam kredit məbləği', v: `${totalLoanAmount.toLocaleString('az-AZ')} ₼`, c: '#007AFF' },
                  { l: 'Bu ay gəlir', v: `${stats.thisMonthPayments.toLocaleString('az-AZ')} ₼`, c: '#34C759' },
                  { l: 'Gecikmiş toplam', v: `${stats.overdueTotal.toLocaleString('az-AZ')} ₼`, c: '#FF3B30' },
                ].map((r, i) => (
                  <View key={i} style={[styles.reportRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>{r.l}</Text>
                    <Text style={[styles.reportValue, { color: r.c || colors.text }]}>{r.v}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.reportCard, { backgroundColor: colors.card, flex: 1 }]}>
                <Text style={[styles.reportTitle, { color: colors.text }]}>📋 Satış Statistikası</Text>
                {[
                  { l: 'Nağd satışlar', v: cashSales.length },
                  { l: 'Kreditlə satışlar', v: creditSales.length },
                  { l: 'Aktiv kreditlər', v: stats.activeLoans, c: '#007AFF' },
                  { l: 'Bağlanmış kreditlər', v: stats.completedLoans, c: '#34C759' },
                ].map((r, i) => (
                  <View key={i} style={[styles.reportRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>{r.l}</Text>
                    <Text style={[styles.reportValue, { color: r.c || colors.text }]}>{r.v}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, paddingBottom: 80 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  pageTitle: { fontSize: 28, fontFamily: 'RethinkSans_800ExtraBold' },
  pageSubtitle: { fontSize: 14, fontFamily: 'RethinkSans_500Medium', marginTop: 4 },
  refreshBtn: { padding: 10, borderRadius: 12, borderWidth: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  createBtnText: { color: '#FFF', fontFamily: 'RethinkSans_700Bold', fontSize: 14 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 28, gap: 4 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16 },
  tabText: { fontSize: 14, fontFamily: 'RethinkSans_500Medium' },
  sectionTitle: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 16, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 28 },
  statsGridWide: {},
  statCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    minWidth: 220, flex: 1, borderRadius: 16, padding: 20, borderWidth: 1,
  },
  statIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: 'RethinkSans_800ExtraBold' },
  statLabel: { fontSize: 13, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'RethinkSans_500Medium', outlineStyle: 'none' as any },
  table: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  th: { fontSize: 12, fontFamily: 'RethinkSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  td: { fontSize: 14, fontFamily: 'RethinkSans_500Medium' },
  tdSub: { fontSize: 12, fontFamily: 'RethinkSans_400Regular', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
  daysLateBadge: { backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  daysLateText: { color: '#FFF', fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
  emptyCard: { borderRadius: 16, padding: 60, alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },
  reportCard: { borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  reportTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold', marginBottom: 16 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  reportLabel: { fontSize: 14, fontFamily: 'RethinkSans_500Medium' },
  reportValue: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  // Users Tab
  userCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  userAvatar: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 17, fontFamily: 'RethinkSans_700Bold' },
  userUniqueId: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold', marginTop: 1 },
  userDetail: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
  userStatBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  userStatText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
  userLoansGrid: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 8 },
  userLoanItem: { padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  userLoanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  userLoanCar: { flex: 1, fontSize: 14, fontFamily: 'RethinkSans_600SemiBold' },
});
