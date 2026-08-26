import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Platform, RefreshControl
} from 'react-native';
import {
  ArrowLeft, Car, Calendar, CreditCard, CheckCircle,
  Clock, AlertTriangle, ChevronDown, ChevronUp, DollarSign
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

export default function MyLoans() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loans, setLoans] = useState<any[]>([]);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, any[]>>({});

  const fetchLoans = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      // First check if user has loans by phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', session.user.id)
        .single();

      let loansData: any[] = [];

      // Try by user_id first
      const { data: byUserId } = await supabase
        .from('loan_accounts')
        .select('*')
        .eq('customer_user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (byUserId && byUserId.length > 0) {
        loansData = byUserId;
      } else if (profile?.phone) {
        // Try by phone number
        const { data: byPhone } = await supabase
          .from('loan_accounts')
          .select('*')
          .eq('customer_phone', profile.phone)
          .order('created_at', { ascending: false });
        loansData = byPhone || [];
      }

      setLoans(loansData);

      // Fetch schedules for all loans
      if (loansData.length > 0) {
        const loanIds = loansData.map(l => l.id);
        const { data: allSchedules } = await supabase
          .from('loan_schedule')
          .select('*')
          .in('loan_id', loanIds)
          .order('installment_number');

        const grouped: Record<string, any[]> = {};
        (allSchedules || []).forEach((s: any) => {
          if (!grouped[s.loan_id]) grouped[s.loan_id] = [];
          grouped[s.loan_id].push(s);
        });
        setSchedules(grouped);
      }
    } catch (e: any) {
      console.error('Error fetching loans:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchLoans();
  }, [session?.user?.id]));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#34C759';
      case 'overdue': return '#FF3B30';
      case 'partial': return '#FF9500';
      case 'active': return '#007AFF';
      case 'completed': return '#34C759';
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödənilib ✓';
      case 'overdue': return 'Gecikib ⚠️';
      case 'partial': return 'Qismən';
      case 'pending': return 'Gözləyir';
      case 'active': return 'Aktiv';
      case 'completed': return 'Kredit bağlanmışdır';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} color="#34C759" />;
      case 'overdue': return <AlertTriangle size={16} color="#FF3B30" />;
      case 'partial': return <Clock size={16} color="#FF9500" />;
      default: return <Clock size={16} color={colors.textSecondary} />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kreditlərim</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoans(); }} tintColor={colors.primary} />}
      >
        {!session ? (
          <View style={styles.emptyContainer}>
            <CreditCard size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Giriş Tələb Olunur</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Kredit məlumatlarınızı görmək üçün hesabınıza daxil olun.
            </Text>
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/auth/login' as any)}
            >
              <Text style={styles.loginBtnText}>Giriş Et</Text>
            </TouchableOpacity>
          </View>
        ) : loans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 500 }}
            >
              <Car size={64} color={colors.textSecondary} />
            </MotiView>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Kredit Tapılmadı</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Sizin adınıza aktiv kredit tapılmadı. Kredit ödənişi varsa, əlaqə bölməsindən bizə yazın.
            </Text>
          </View>
        ) : (
          loans.map((loan, index) => {
            const loanSchedule = schedules[loan.id] || [];
            const totalPaid = loanSchedule.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
            const totalWithInterest = Number(loan.loan_amount) * (1 + Number(loan.interest_rate) / 100);
            const totalRemaining = Math.max(0, totalWithInterest - totalPaid);
            const paidCount = loanSchedule.filter((s: any) => s.status === 'paid').length;
            const overdueCount = loanSchedule.filter((s: any) => s.status === 'overdue').length;
            const nextPayment = loanSchedule.find((s: any) => s.status === 'pending' || s.status === 'overdue');
            const isExpanded = expandedLoan === loan.id;
            const progressPercent = loanSchedule.length > 0 ? (paidCount / loanSchedule.length) * 100 : 0;

            return (
              <MotiView
                key={loan.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 100, type: 'timing', duration: 400 }}
              >
                <View style={[styles.loanCard, { backgroundColor: colors.card }]}>
                  {/* Car Header */}
                  <View style={styles.loanHeader}>
                    <View style={[styles.carIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Car size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.carName, { color: colors.text }]}>
                        {loan.car_brand} {loan.car_model}
                      </Text>
                      <Text style={[styles.carYear, { color: colors.textSecondary }]}>
                        {loan.car_year}{loan.car_plate ? ` • ${loan.car_plate}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.loanStatusBadge, { backgroundColor: getStatusColor(loan.status) + '15' }]}>
                      <Text style={[styles.loanStatusText, { color: getStatusColor(loan.status) }]}>
                        {getStatusText(loan.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Financial Summary */}
                  <View style={styles.financeSummary}>
                    <View style={[styles.finItem, { backgroundColor: isDark ? '#1a2e1a' : '#F0FFF0' }]}>
                      <Text style={[styles.finItemLabel, { color: colors.textSecondary }]}>Ödənilən</Text>
                      <Text style={[styles.finItemValue, { color: '#34C759' }]}>
                        {totalPaid.toLocaleString('az-AZ')} ₼
                      </Text>
                    </View>
                    <View style={[styles.finItem, { backgroundColor: isDark ? '#2e1a1a' : '#FFF0F0' }]}>
                      <Text style={[styles.finItemLabel, { color: colors.textSecondary }]}>Qalan borc</Text>
                      <Text style={[styles.finItemValue, { color: '#FF3B30' }]}>
                        {totalRemaining.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼
                      </Text>
                    </View>
                  </View>

                  {/* Progress */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        {paidCount}/{loanSchedule.length} hissə ödənilib
                      </Text>
                      <Text style={[styles.progressPercent, { color: colors.primary }]}>
                        {Math.round(progressPercent)}%
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: '#34C759' }]} />
                    </View>
                  </View>

                  {/* Overdue Warning */}
                  {overdueCount > 0 && (
                    <View style={[styles.overdueWarning, { backgroundColor: 'rgba(255,59,48,0.08)' }]}>
                      <AlertTriangle size={16} color="#FF3B30" />
                      <Text style={styles.overdueWarningText}>
                        {overdueCount} ödəniş gecikib!
                      </Text>
                    </View>
                  )}

                  {/* Next Payment */}
                  {nextPayment && loan.status === 'active' && (
                    <View style={[styles.nextPayment, {
                      backgroundColor: nextPayment.status === 'overdue' ? 'rgba(255,59,48,0.06)' : 'rgba(0,122,255,0.06)',
                      borderColor: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF',
                    }]}>
                      <Calendar size={18} color={nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF'} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.nextPaymentLabel, { color: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF' }]}>
                          {nextPayment.status === 'overdue' ? '⚠️ Gecikmiş ödəniş' : '📅 Növbəti ödəniş'}
                        </Text>
                        <Text style={[styles.nextPaymentValue, { color: colors.text }]}>
                          {Number(nextPayment.amount).toLocaleString('az-AZ')} ₼ – {formatDate(nextPayment.due_date)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Toggle Schedule */}
                  <TouchableOpacity
                    style={[styles.toggleSchedule, { borderTopColor: colors.border }]}
                    onPress={() => setExpandedLoan(isExpanded ? null : loan.id)}
                  >
                    <Text style={[styles.toggleScheduleText, { color: colors.primary }]}>
                      💳 Ödəniş Planı
                    </Text>
                    {isExpanded ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
                  </TouchableOpacity>

                  {/* Schedule Items */}
                  {isExpanded && (
                    <View style={styles.scheduleList}>
                      {loanSchedule.map((item: any) => {
                        const daysLate = item.status === 'overdue'
                          ? Math.floor((Date.now() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))
                          : 0;

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.scheduleItem,
                              { backgroundColor: isDark ? '#1a1a1e' : '#F8F8FA', borderColor: colors.border },
                              item.status === 'overdue' && { backgroundColor: 'rgba(255,59,48,0.05)', borderColor: '#FF3B30', borderLeftWidth: 3 },
                              item.status === 'paid' && { opacity: 0.7 }
                            ]}
                          >
                            <View style={styles.scheduleItemLeft}>
                              {getStatusIcon(item.status)}
                              <View>
                                <Text style={[styles.scheduleInstNum, { color: colors.text }]}>
                                  Hissə #{item.installment_number}
                                </Text>
                                <Text style={[styles.scheduleDueDate, { color: colors.textSecondary }]}>
                                  {formatDate(item.due_date)}
                                  {daysLate > 0 && <Text style={{ color: '#FF3B30' }}> • {daysLate} gün</Text>}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.scheduleItemRight}>
                              <Text style={[styles.scheduleAmount, { color: getStatusColor(item.status) }]}>
                                {Number(item.amount).toLocaleString('az-AZ')} ₼
                              </Text>
                              <Text style={[styles.scheduleStatus, { color: getStatusColor(item.status) }]}>
                                {getStatusText(item.status)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </MotiView>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: Platform.OS === 'android' ? 10 : 0, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyTitle: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold' },
  emptyDesc: { fontSize: 15, fontFamily: 'RethinkSans_400Regular', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  loginBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  loginBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'RethinkSans_700Bold' },

  loanCard: {
    borderRadius: 24, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  loanHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  carIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  carName: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold' },
  carYear: { fontSize: 13, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },
  loanStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  loanStatusText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },

  financeSummary: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  finItem: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  finItemLabel: { fontSize: 12, fontFamily: 'RethinkSans_500Medium', marginBottom: 4 },
  finItemValue: { fontSize: 17, fontFamily: 'RethinkSans_800ExtraBold' },

  progressSection: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, fontFamily: 'RethinkSans_500Medium' },
  progressPercent: { fontSize: 13, fontFamily: 'RethinkSans_700Bold' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  overdueWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, marginBottom: 12,
  },
  overdueWarningText: { color: '#FF3B30', fontFamily: 'RethinkSans_700Bold', fontSize: 13 },

  nextPayment: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12,
  },
  nextPaymentLabel: { fontSize: 13, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 2 },
  nextPaymentValue: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },

  toggleSchedule: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1,
  },
  toggleScheduleText: { fontSize: 14, fontFamily: 'RethinkSans_700Bold' },

  scheduleList: { gap: 6, marginTop: 12 },
  scheduleItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  scheduleItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleInstNum: { fontSize: 13, fontFamily: 'RethinkSans_700Bold' },
  scheduleDueDate: { fontSize: 11, fontFamily: 'RethinkSans_400Regular', marginTop: 1 },
  scheduleItemRight: { alignItems: 'flex-end' },
  scheduleAmount: { fontSize: 14, fontFamily: 'RethinkSans_700Bold' },
  scheduleStatus: { fontSize: 10, fontFamily: 'RethinkSans_600SemiBold', marginTop: 1 },
});
