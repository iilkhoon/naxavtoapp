import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, TextInput, Alert, Modal, RefreshControl
} from 'react-native';
import {
  ArrowLeft, Plus, Car, Users, User, AlertTriangle, DollarSign,
  Calendar, Search, Filter, ChevronRight, CreditCard,
  TrendingUp, Clock, CheckCircle, XCircle, Eye, Phone,
  FileText, BarChart3, RefreshCw
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

type LoanAccount = {
  id: string;
  customer_name: string;
  customer_surname: string;
  customer_fin: string;
  customer_phone: string;
  customer_unique_id: string;
  customer_father_name: string;
  customer_birth_date: string;
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

export default function AdminLoans() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
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

  const fetchData = async () => {
    try {
      // Update overdue payments
      await supabase.rpc('update_overdue_payments');

      // Fetch all loans
      const { data: loansData, error: loansError } = await supabase
        .from('loan_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (loansError) throw loansError;
      setLoans(loansData || []);

      // Fetch overdue schedules for active loans to determine auto-risk
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

      // Fetch stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const [
        { count: totalSold },
        { count: activeLoans },
        { count: completedLoans },
        { data: overdueSchedule },
        { data: thisMonthPaid },
        { data: expectedData }
      ] = await Promise.all([
        supabase.from('loan_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('loan_accounts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('loan_accounts').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('loan_schedule').select('amount').eq('status', 'overdue'),
        supabase.from('loan_payments').select('amount').eq('status', 'paid')
          .gte('payment_date', monthStart).lte('payment_date', monthEnd),
        supabase.from('loan_schedule').select('amount').eq('status', 'pending')
          .gte('due_date', monthStart).lte('due_date', monthEnd),
      ]);

      const overdueTotal = (overdueSchedule || []).reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const monthPaid = (thisMonthPaid || []).reduce((sum: number, s: any) => sum + Number(s.amount), 0);
      const expected = (expectedData || []).reduce((sum: number, s: any) => sum + Number(s.amount), 0);

      setStats({
        totalSold: totalSold || 0,
        activeLoans: activeLoans || 0,
        overdueTotal,
        thisMonthPayments: monthPaid,
        expectedPayments: expected,
        completedLoans: completedLoans || 0,
      });
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchData();
  }, []));

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredLoans = loans.filter(l => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      l.customer_name.toLowerCase().includes(q) ||
      l.customer_surname.toLowerCase().includes(q) ||
      l.customer_phone.includes(q) ||
      l.car_brand.toLowerCase().includes(q) ||
      l.car_model.toLowerCase().includes(q) ||
      (l.customer_fin && l.customer_fin.toLowerCase().includes(q)) ||
      (l.car_plate && l.car_plate.toLowerCase().includes(q))
    );
  });

  const overdueLoans = loans.filter(l => l.status === 'active');

  const formatPrice = (n: number) => n.toLocaleString('az-AZ', { minimumFractionDigits: 0 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#007AFF';
      case 'completed': return '#34C759';
      case 'defaulted': return '#FF3B30';
      case 'cancelled': return '#8E8E93';
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'completed': return 'Bağlanıb';
      case 'defaulted': return 'Defolt';
      case 'cancelled': return 'Ləğv';
      default: return status;
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, suffix = '' }: any) => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 400 }}
      style={[styles.statCard, { backgroundColor: colors.card }]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: color + '18' }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}{suffix}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </MotiView>
  );

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <TouchableOpacity
      style={[
        styles.tabBtn,
        activeTab === id && { backgroundColor: colors.primary + '18', borderColor: colors.primary }
      ]}
      onPress={() => setActiveTab(id)}
    >
      <Icon size={16} color={activeTab === id ? colors.primary : colors.textSecondary} />
      <Text style={[
        styles.tabBtnText,
        { color: activeTab === id ? colors.primary : colors.textSecondary },
        activeTab === id && { fontFamily: 'RethinkSans_700Bold' }
      ]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderDashboard = () => (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Ümumi Göstəricilər</Text>
      <View style={styles.statsGrid}>
        <StatCard icon={Car} label="Satılan maşın" value={stats.totalSold} color="#AF52DE" />
        <StatCard icon={CreditCard} label="Aktiv kredit" value={stats.activeLoans} color="#007AFF" />
        <StatCard icon={AlertTriangle} label="Gecikmiş" value={formatPrice(stats.overdueTotal)} color="#FF3B30" suffix=" ₼" />
        <StatCard icon={TrendingUp} label="Bu ay gəlir" value={formatPrice(stats.thisMonthPayments)} color="#34C759" suffix=" ₼" />
        <StatCard icon={Clock} label="Gözlənilən" value={formatPrice(stats.expectedPayments)} color="#FF9500" suffix=" ₼" />
        <StatCard icon={CheckCircle} label="Bağlanan" value={stats.completedLoans} color="#5856D6" />
      </View>

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Sürətli Əməliyyatlar</Text>
      <TouchableOpacity
        style={[styles.quickAction, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/admin/loan-create' as any)}
      >
        <Plus size={20} color="#FFF" />
        <Text style={styles.quickActionText}>Yeni Satış / Kredit Yarat</Text>
      </TouchableOpacity>

      {/* Recent loans */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Son Kreditlər</Text>
      {loans.slice(0, 5).map(loan => renderLoanCard(loan))}
    </View>
  );

  const renderLoanCard = (loan: LoanAccount) => (
    <TouchableOpacity
      key={loan.id}
      style={[styles.loanCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/admin/loan-detail?id=${loan.id}` as any)}
    >
      <View style={styles.loanCardHeader}>
        <View style={styles.loanCardLeft}>
          <View style={[styles.carBadge, { backgroundColor: colors.primary + '15' }]}>
            <Car size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.loanCustomer, { color: colors.text }]}>
              {loan.customer_name} {loan.customer_surname}
            </Text>
            <Text style={[styles.loanCar, { color: colors.textSecondary }]}>
              {loan.car_brand} {loan.car_model} ({loan.car_year})
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '18' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
            {getStatusText(loan.status)}
          </Text>
        </View>
      </View>

      <View style={styles.loanCardBody}>
        <View style={styles.loanStat}>
          <Text style={[styles.loanStatLabel, { color: colors.textSecondary }]}>Kredit</Text>
          <Text style={[styles.loanStatValue, { color: colors.text }]}>{formatPrice(loan.loan_amount)} ₼</Text>
        </View>
        <View style={styles.loanStat}>
          <Text style={[styles.loanStatLabel, { color: colors.textSecondary }]}>Aylıq</Text>
          <Text style={[styles.loanStatValue, { color: colors.text }]}>{formatPrice(loan.monthly_payment)} ₼</Text>
        </View>
        <View style={styles.loanStat}>
          <Text style={[styles.loanStatLabel, { color: colors.textSecondary }]}>Müddət</Text>
          <Text style={[styles.loanStatValue, { color: colors.text }]}>{loan.duration_months} ay</Text>
        </View>
        {loan.interest_rate > 0 && (
          <View style={styles.loanStat}>
            <Text style={[styles.loanStatLabel, { color: colors.textSecondary }]}>Faiz</Text>
            <Text style={[styles.loanStatValue, { color: '#FF9500' }]}>{loan.interest_rate}%</Text>
          </View>
        )}
      </View>

      <View style={styles.loanCardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Phone size={14} color={colors.textSecondary} />
          <Text style={[styles.loanPhone, { color: colors.textSecondary }]}>{loan.customer_phone}</Text>
        </View>
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  const renderLoans = () => (
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

      <TouchableOpacity
        style={[styles.quickAction, { backgroundColor: colors.primary, marginBottom: 20 }]}
        onPress={() => router.push('/admin/loan-create' as any)}
      >
        <Plus size={20} color="#FFF" />
        <Text style={styles.quickActionText}>Yeni Satış / Kredit Yarat</Text>
      </TouchableOpacity>

      {filteredLoans.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Heç bir kredit tapılmadı</Text>
        </View>
      ) : (
        filteredLoans.map(loan => renderLoanCard(loan))
      )}
    </View>
  );

  const renderOverdue = () => {
    return (
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>⚠️ Gecikmiş Ödənişlər</Text>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          Bu bölmədə gecikmiş ödənişi olan kreditlər göstərilir.
        </Text>
        <OverdueList colors={colors} />
      </View>
    );
  };

  const renderReports = () => (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Hesabatlar</Text>
      <ReportsSection colors={colors} stats={stats} loans={loans} />
    </View>
  );

  const renderUsers = () => {
    // Group by FIN
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
        (first.customer_unique_id && first.customer_unique_id.toLowerCase().includes(q));
    });

    const toggleRiskyCustomer = async (finKey: string, isCurrentlyRisky: boolean, userLoans: any[]) => {
      setToggleLoading(finKey);
      try {
        const { error } = await supabase.from('loan_accounts').update({
          notes: isCurrentlyRisky 
            ? (userLoans[0].notes || '').replace('[RISKLI]', '').trim()
            : `[RISKLI]\n${userLoans[0].notes || ''}`.trim()
        }).in('id', userLoans.map(l => l.id));
        
        if (error) throw error;
        await fetchData();
        showToast(isCurrentlyRisky ? 'Riskli statusu silindi' : 'Müştəri riskli olaraq işarələndi', 'success');
      } catch (err: any) {
        showToast('Xəta: ' + err.message, 'error');
      } finally {
        setToggleLoading(null);
      }
    };

    return (
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
        <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_500Medium', marginBottom: 16 }}>
          Toplam: {filteredUsers.length} müştəri, {loans.length} kredit
        </Text>

        {filteredUsers.map(([key, userLoans]) => {
          const u = userLoans[0];
          const activeCount = userLoans.filter(l => l.status === 'active').length;
          const totalProfit = userLoans.reduce((s, l) => s + Number(l.profit || 0), 0);
          return (
            <View key={key} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.userCardHeader}>
                <View style={[styles.userAvatar, { backgroundColor: isDark ? '#1c2a3d' : '#EFF6FF' }]}>
                  <User size={22} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>{u.customer_name} {u.customer_surname}</Text>
                  {u.customer_unique_id && (
                    <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'RethinkSans_600SemiBold', marginTop: 1 }}>#{u.customer_unique_id}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    {u.customer_fin && <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>FIN: {u.customer_fin}</Text>}
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_500Medium' }}>📞 {u.customer_phone}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.statusBadge, { backgroundColor: activeCount > 0 ? '#007AFF18' : '#34C75918' }]}>
                    <Text style={[styles.statusText, { color: activeCount > 0 ? '#007AFF' : '#34C759' }]}>
                      {activeCount > 0 ? `${activeCount} aktiv` : 'Bağlanıb'}
                    </Text>
                  </View>
                  {totalProfit > 0 && (
                    <Text style={{ color: '#34C759', fontSize: 11, fontFamily: 'RethinkSans_700Bold' }}>+{totalProfit.toLocaleString('az-AZ')} ₼</Text>
                  )}
                </View>
              </View>

              {/* Risky Check */}
              {(() => {
                const isManualRisky = userLoans.some(l => l.notes && l.notes.includes('[RISKLI]'));
                const isAutoRisky = userLoans.some(l => {
                  const s = schedules[l.id] || [];
                  return s.some((item: any) => {
                    if (item.status === 'overdue' && item.due_date) {
                      const daysLate = Math.floor((Date.now() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24));
                      return daysLate > 30;
                    }
                    return false;
                  });
                });
                const isRisky = isManualRisky || isAutoRisky;

                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isRisky ? 'rgba(255,59,48,0.06)' : colors.background, padding: 10, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: isRisky ? 'rgba(255,59,48,0.2)' : colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} color={isRisky ? '#FF3B30' : colors.textSecondary} />
                      <Text style={{ color: isRisky ? '#FF3B30' : colors.textSecondary, fontFamily: 'RethinkSans_600SemiBold', fontSize: 13 }}>
                        {isRisky ? (isAutoRisky ? 'Avto Riskli (30+ gün gecikmə)' : 'Riskli olaraq işarələnib') : 'Risk dərəcəsi normal'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={toggleLoading === key}
                      onPress={() => toggleRiskyCustomer(key, isManualRisky, userLoans)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: isManualRisky ? '#FF3B3015' : colors.card, borderWidth: 1, borderColor: isManualRisky ? '#FF3B30' : colors.border }}
                    >
                      {toggleLoading === key ? (
                        <ActivityIndicator size="small" color="#FF3B30" />
                      ) : (
                        <Text style={{ color: isManualRisky ? '#FF3B30' : colors.text, fontSize: 12, fontFamily: 'RethinkSans_600SemiBold' }}>
                          {isManualRisky ? 'Riski Sil' : 'Riskli Et'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })()}

              {/* User's Loans */}
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 }}>
                {userLoans.map(loan => (
                  <TouchableOpacity
                    key={loan.id}
                    style={[styles.userLoanItem, { backgroundColor: isDark ? '#1a1a1e' : '#F8F8FA', borderColor: colors.border }]}
                    onPress={() => router.push(`/admin/loan-detail?id=${loan.id}` as any)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Car size={14} color={colors.textSecondary} />
                      <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'RethinkSans_600SemiBold', flex: 1 }}>
                        {loan.car_brand} {loan.car_model} ({loan.car_year})
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '15' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>{getStatusText(loan.status)}</Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'RethinkSans_400Regular', marginTop: 4 }}>
                      Kredit: {formatPrice(loan.loan_amount)} ₼ • Aylıq: {formatPrice(loan.monthly_payment)} ₼{loan.interest_rate > 0 ? ` • ${loan.interest_rate}%` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kredit Paneli</Text>
        <TouchableOpacity onPress={fetchData} style={styles.backBtn}>
          <RefreshCw size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          <TabButton id="dashboard" label="Dashboard" icon={BarChart3} />
          <TabButton id="loans" label="Kreditlər" icon={CreditCard} />
          <TabButton id="users" label="İstifadəçilər" icon={Users} />
          <TabButton id="overdue" label="Gecikmələr" icon={AlertTriangle} />
          <TabButton id="reports" label="Hesabatlar" icon={FileText} />
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'loans' && renderLoans()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'overdue' && renderOverdue()}
            {activeTab === 'reports' && renderReports()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Overdue List Component
function OverdueList({ colors }: { colors: any }) {
  const [overdueItems, setOverdueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchOverdue();
  }, []);

  const fetchOverdue = async () => {
    const { data } = await supabase
      .from('loan_schedule')
      .select('*, loan_accounts(*)')
      .eq('status', 'overdue')
      .order('due_date', { ascending: true });
    setOverdueItems(data || []);
    setLoading(false);
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />;

  if (overdueItems.length === 0) {
    return (
      <View style={styles.emptyState}>
        <CheckCircle size={48} color="#34C759" />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Gecikmiş ödəniş yoxdur! 🎉</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {overdueItems.map((item: any) => {
        const daysLate = Math.floor((Date.now() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24));
        const loan = item.loan_accounts;
        return (
          <View key={item.id} style={[styles.overdueCard, { backgroundColor: 'rgba(255,59,48,0.06)', borderColor: '#FF3B30' }]}>
            <View style={styles.overdueHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.overdueCustomer, { color: colors.text }]}>
                  {loan?.customer_name} {loan?.customer_surname}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'RethinkSans_500Medium' }}>
                  {loan?.car_brand} {loan?.car_model} • Hissə #{item.installment_number}
                </Text>
              </View>
              <View style={styles.daysLateBadge}>
                <Text style={styles.daysLateText}>{daysLate} gün gecikib</Text>
              </View>
            </View>
            <View style={styles.overdueBody}>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 18 }}>
                {Number(item.amount).toLocaleString('az-AZ')} ₼
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'RethinkSans_400Regular' }}>
                Tarix: {formatDate(item.due_date)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Reports Section Component
function ReportsSection({ colors, stats, loans }: { colors: any; stats: DashboardStats; loans: LoanAccount[] }) {
  const totalLoanAmount = loans.reduce((sum, l) => sum + Number(l.loan_amount), 0);
  const totalDownPayment = loans.reduce((sum, l) => sum + Number(l.down_payment), 0);
  const cashSales = loans.filter(l => l.sale_type === 'cash');
  const creditSales = loans.filter(l => l.sale_type === 'credit');

  const ReportRow = ({ label, value, color }: any) => (
    <View style={[styles.reportRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.reportValue, { color: color || colors.text }]}>{value}</Text>
    </View>
  );

  return (
    <View style={{ gap: 20 }}>
      <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.reportCardTitle, { color: colors.text }]}>💰 Maliyyə Xülasəsi</Text>
        <ReportRow label="Toplam satış dəyəri" value={`${loans.reduce((s, l) => s + Number(l.total_price), 0).toLocaleString('az-AZ')} ₼`} />
        <ReportRow label="Toplam ilkin ödənişlər" value={`${totalDownPayment.toLocaleString('az-AZ')} ₼`} color="#34C759" />
        <ReportRow label="Toplam kredit məbləği" value={`${totalLoanAmount.toLocaleString('az-AZ')} ₼`} color="#007AFF" />
        <ReportRow label="Bu ay gəlir" value={`${stats.thisMonthPayments.toLocaleString('az-AZ')} ₼`} color="#34C759" />
        <ReportRow label="Gecikmiş toplam" value={`${stats.overdueTotal.toLocaleString('az-AZ')} ₼`} color="#FF3B30" />
      </View>

      <View style={[styles.reportCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.reportCardTitle, { color: colors.text }]}>📋 Satış Statistikası</Text>
        <ReportRow label="Nağd satışlar" value={cashSales.length} />
        <ReportRow label="Kreditlə satışlar" value={creditSales.length} />
        <ReportRow label="Aktiv kreditlər" value={stats.activeLoans} color="#007AFF" />
        <ReportRow label="Bağlanmış kreditlər" value={stats.completedLoans} color="#34C759" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: Platform.OS === 'android' ? 10 : 0, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  tabs: { borderBottomWidth: 1, paddingVertical: 8 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'transparent',
  },
  tabBtnText: { fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  loadingWrap: { paddingTop: 100, alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 16 },
  sectionDesc: { fontSize: 14, fontFamily: 'RethinkSans_400Regular', marginBottom: 16, marginTop: -8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%' as any, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  quickActionText: { color: '#FFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
    borderWidth: 1, gap: 10, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'RethinkSans_500Medium' },
  loanCard: {
    borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  loanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  loanCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  carBadge: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  loanCustomer: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
  loanCar: { fontSize: 13, fontFamily: 'RethinkSans_500Medium' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
  loanCardBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 14 },
  loanStat: {},
  loanStatLabel: { fontSize: 11, fontFamily: 'RethinkSans_500Medium', marginBottom: 2 },
  loanStatValue: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  loanCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  loanPhone: { fontSize: 13, fontFamily: 'RethinkSans_500Medium' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },
  overdueCard: { borderRadius: 16, padding: 16, borderWidth: 1, borderLeftWidth: 4 },
  overdueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  overdueCustomer: { fontSize: 15, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
  daysLateBadge: { backgroundColor: '#FF3B30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  daysLateText: { color: '#FFF', fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
  overdueBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  reportCardTitle: { fontSize: 17, fontFamily: 'RethinkSans_700Bold', marginBottom: 16 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  reportLabel: { fontSize: 14, fontFamily: 'RethinkSans_500Medium' },
  reportValue: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  // Users
  userCard: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1 },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  userLoanItem: { padding: 10, borderRadius: 12, borderWidth: 1 },
});
