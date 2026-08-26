import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Platform, RefreshControl, TextInput, useWindowDimensions
} from 'react-native';
import {
  ArrowLeft, Car, Calendar, CreditCard, CheckCircle,
  Clock, AlertTriangle, ChevronDown, ChevronUp, DollarSign,
  Hash, Shield, User, LogOut, Phone
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { formatDate } from '../lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDIT_SESSION_KEY = 'nax_credit_session';

export default function MyLoans() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { width: windowWidth } = useWindowDimensions();

  const isLargeScreen = windowWidth > 992;
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finCode, setFinCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [loans, setLoans] = useState<any[]>([]);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, any[]>>({});
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  const checkSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem(CREDIT_SESSION_KEY);
      if (sessionData) {
        const { fin, birth } = JSON.parse(sessionData);
        setFinCode(fin);
        setBirthDate(birth);
        setIsLoggedIn(true);
        await fetchLoans(fin, birth);
      } else {
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchLoans = async (fin?: string, birth?: string) => {
    const targetFin = fin || finCode;
    const targetBirth = birth || birthDate;

    if (!targetFin || !targetBirth) {
      setLoading(false);
      return;
    }

    try {
      const { data: loansData, error } = await supabase
        .from('loan_accounts')
        .select('*')
        .ilike('customer_fin', targetFin.toUpperCase())
        .eq('customer_birth_date', targetBirth)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!loansData || loansData.length === 0) {
        setLoans([]);
        setSchedules({});
        setCustomerInfo(null);
        setIsLoggedIn(false);
        await AsyncStorage.removeItem(CREDIT_SESSION_KEY);
        return;
      }

      setLoans(loansData);
      setCustomerInfo({
        name: loansData[0].customer_name,
        surname: loansData[0].customer_surname,
        fin: loansData[0].customer_fin,
        phone: loansData[0].customer_phone,
        uniqueId: loansData[0].customer_unique_id,
      });

      // Fetch schedules
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
    } catch (e: any) {
      console.error('Error fetching loans:', e);
      if (showToast) showToast('Xəta baş verdi', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogin = async () => {
    if (finCode.length < 5) {
      showToast('FIN kod minimum 5 simvol olmalıdır', 'error');
      return;
    }
    if (!birthDate || birthDate.length !== 10) {
      showToast('Doğum tarixini DD.MM.YYYY formatında daxil edin', 'error');
      return;
    }

    setLoginLoading(true);
    try {
      const parts = birthDate.split('.');
      const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

      const { data, error } = await supabase
        .from('loan_accounts')
        .select('id')
        .ilike('customer_fin', finCode.toUpperCase())
        .eq('customer_birth_date', formattedDate);

      if (error) throw error;

      if (!data || data.length === 0) {
        showToast('Bu FIN kod və doğum tarixi ilə kredit tapılmadı', 'error');
        setLoginLoading(false);
        return;
      }

      await AsyncStorage.setItem(CREDIT_SESSION_KEY, JSON.stringify({
        fin: finCode.toUpperCase(),
        birth: formattedDate
      }));

      setIsLoggedIn(true);
      await fetchLoans(finCode.toUpperCase(), formattedDate);
      showToast('Uğurla daxil oldunuz!', 'success');
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(CREDIT_SESSION_KEY);
    setIsLoggedIn(false);
    setLoans([]);
    setSchedules({});
    setCustomerInfo(null);
    setFinCode('');
    setBirthDate('');
  };

  const handleFinInput = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 7) setFinCode(cleaned);
  };

  const handleBirthInput = (text: string) => {
    const nums = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (nums.length > 0) formatted += nums.substring(0, 2);
    if (nums.length > 2) formatted += '.' + nums.substring(2, 4);
    if (nums.length > 4) formatted += '.' + nums.substring(4, 8);
    setBirthDate(formatted);
  };

  useFocusEffect(useCallback(() => {
    checkSession();
  }, []));

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background blobs for premium glassmorphism */}
      <View style={[styles.ambientBlob1, { backgroundColor: colors.primary + '1a' }]} />
      <View style={[styles.ambientBlob2, { backgroundColor: '#007AFF12' }]} />

      {!isLoggedIn ? (
        <ScrollView
          contentContainerStyle={styles.loginScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: 30 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={[styles.loginContainer, {
              backgroundColor: isDark ? 'rgba(20, 24, 33, 0.75)' : 'rgba(255, 255, 255, 0.82)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            }]}
          >
            <TouchableOpacity onPress={() => router.back()} style={[styles.webBackBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <ArrowLeft size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={[styles.loginIconWrap, { backgroundColor: colors.primary + '18' }]}>
              <CreditCard size={40} color={colors.primary} />
            </View>

            <Text style={[styles.loginTitle, { color: colors.text }]}>Kredit Hesabım</Text>
            <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
              FIN kodunuz və doğum tarixiniz ilə kredit məlumatlarınıza baxın
            </Text>

            <View style={styles.loginCard}>
              <View style={styles.loginField}>
                <Text style={[styles.loginLabel, { color: colors.text }]}>
                  <Hash size={14} color={colors.primary} /> FIN Kod
                </Text>
                <View style={[styles.loginInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.loginInputText, { color: colors.text }]}
                    value={finCode}
                    onChangeText={handleFinInput}
                    placeholder="Məs: 1A2B3C4"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                  <View style={[styles.charCounter, { backgroundColor: isDark ? '#333' : '#EAEAEA' }]}>
                    <Text style={[styles.charCounterText, { color: colors.textSecondary }]}>{finCode.length}/7</Text>
                  </View>
                </View>
              </View>

              <View style={styles.loginField}>
                <Text style={[styles.loginLabel, { color: colors.text }]}>
                  <Calendar size={14} color={colors.primary} /> Doğum Tarixi
                </Text>
                <View style={[styles.loginInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.loginInputText, { color: colors.text }]}
                    value={birthDate}
                    onChangeText={handleBirthInput}
                    placeholder="GG.AA.İİİİ"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: loginLoading ? 0.6 : 1 }]}
                onPress={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Shield size={18} color="#FFF" />
                    <Text style={styles.loginBtnText}>Daxil Ol</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(28, 42, 61, 0.3)' : 'rgba(239, 246, 255, 0.45)' }]}>
              <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
                🔒 Şəxsi məlumatlarınız şifrələnərək tam təhlükəsiz saxlanılır. FIN kodunuz yalnız kredit hesabınızı yoxlamaq üçündür.
              </Text>
            </View>
          </MotiView>
        </ScrollView>
      ) : (
        <View style={styles.dashboardWrapper}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ArrowLeft size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={[styles.avatarBox, { backgroundColor: colors.primary + '15' }]}>
                <User size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>Kredit Kabineti</Text>
                <Text style={[styles.headerName, { color: colors.text }]}>
                  {customerInfo?.name} {customerInfo?.surname}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.08)' : '#FFF0F0' }]}
              onPress={handleLogout}
            >
              <LogOut size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>

          {/* Grid Layout Body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoans(); }} tintColor={colors.primary} />}
          >
            {loans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Car size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Kredit Tapılmadı</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Sizin adınıza aktiv kredit tapılmadı. Kredit ödənişi varsa, əlaqə bölməsindən bizə yazın.
                </Text>
              </View>
            ) : isLargeScreen ? (
              /* =================== DESKTOP VIEW =================== */
              <View style={styles.dashboardGrid}>
                {/* Left Column / Sidebar */}
                <View style={styles.sidebar}>
                  {/* Profile Summary Card */}
                  <MotiView
                    from={{ opacity: 0, translateX: -20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                    style={[styles.sidebarCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.profileHeader}>
                      <View style={[styles.profileAvatar, { backgroundColor: colors.primary + '20' }]}>
                        <User size={30} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[styles.profileName, { color: colors.text }]}>{customerInfo?.name} {customerInfo?.surname}</Text>
                        <Text style={[styles.profileMeta, { color: colors.textSecondary }]}>Müştəri Kabineti</Text>
                      </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.profileDetails}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>FIN Kod:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{customerInfo?.fin}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Telefon:</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{customerInfo?.phone}</Text>
                      </View>
                      {customerInfo?.uniqueId && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Müştəri ID:</Text>
                          <Text style={[styles.detailValue, { color: colors.primary }]}>#{customerInfo?.uniqueId}</Text>
                        </View>
                      )}
                    </View>
                  </MotiView>

                  {/* Summary Metric Cards */}
                  {loans.map((loan) => {
                    const loanSchedule = schedules[loan.id] || [];
                    const totalPaid = loanSchedule.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
                    const totalWithInterest = Number(loan.loan_amount) * (1 + Number(loan.interest_rate) / 100);
                    const totalRemaining = Math.max(0, totalWithInterest - totalPaid);
                    const paidCount = loanSchedule.filter((s: any) => s.status === 'paid').length;
                    const progressPercent = loanSchedule.length > 0 ? (paidCount / loanSchedule.length) * 100 : 0;
                    const overdueCount = loanSchedule.filter((s: any) => s.status === 'overdue').length;

                    return (
                      <MotiView
                        key={`summary-${loan.id}`}
                        from={{ opacity: 0, translateX: -20 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        transition={{ delay: 100, type: 'timing', duration: 400 }}
                        style={styles.summaryContainer}
                      >
                        {overdueCount > 0 && (
                          <View style={[styles.overdueBadgeCard, { backgroundColor: 'rgba(255, 59, 48, 0.08)', borderColor: 'rgba(255, 59, 48, 0.15)' }]}>
                            <AlertTriangle size={18} color="#FF3B30" />
                            <Text style={styles.overdueBadgeCardText}>{overdueCount} gecikmiş ödənişiniz var!</Text>
                          </View>
                        )}

                        <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.08)' : '#F2FBF4', borderColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)', borderWidth: 1 }]}>
                          <View style={styles.metricHeader}>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Cəmi Ödənilən</Text>
                            <CheckCircle size={16} color="#34C759" />
                          </View>
                          <Text style={[styles.metricValue, { color: '#34C759' }]}>{totalPaid.toLocaleString('az-AZ')} ₼</Text>
                        </View>

                        <View style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.08)' : '#FFF5F5', borderColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.1)', borderWidth: 1 }]}>
                          <View style={styles.metricHeader}>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Qalan Borc</Text>
                            <AlertTriangle size={16} color="#FF3B30" />
                          </View>
                          <Text style={[styles.metricValue, { color: '#FF3B30' }]}>{totalRemaining.toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</Text>
                        </View>

                        {/* Overall Progress */}
                        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                          <Text style={[styles.metricLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Ödəniş Proqresi</Text>
                          <View style={styles.progressRow}>
                            <View style={[styles.sidebarProgressTrack, { backgroundColor: colors.border }]}>
                              <View style={[styles.sidebarProgressFill, { width: `${progressPercent}%`, backgroundColor: '#34C759' }]} />
                            </View>
                            <Text style={[styles.progressPercentText, { color: colors.primary }]}>{Math.round(progressPercent)}%</Text>
                          </View>
                          <Text style={[styles.progressInstallmentsText, { color: colors.textSecondary }]}>{paidCount} / {loanSchedule.length} hissə tamamlanıb</Text>
                        </View>
                      </MotiView>
                    );
                  })}

                  {/* Help Desk box in sidebar */}
                  <View style={[styles.helpDeskCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC', borderColor: colors.border, borderWidth: 1 }]}>
                    <Phone size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.helpTitle, { color: colors.text }]}>Dəstək və Kömək</Text>
                      <Text style={[styles.helpDesc, { color: colors.textSecondary }]}>Ödənişlər, gecikmələr və ya kredit müqaviləsi ilə bağlı hər hansı sualınız olarsa, bizim əlaqə komandamız sizə yardım etməyə hazırdır.</Text>
                    </View>
                  </View>
                </View>

                {/* Right Column / Main Area */}
                <View style={styles.mainContent}>
                  {loans.map((loan, idx) => {
                    const loanSchedule = schedules[loan.id] || [];
                    const paidCount = loanSchedule.filter((s: any) => s.status === 'paid').length;
                    const nextPayment = loanSchedule.find((s: any) => s.status === 'pending' || s.status === 'overdue');
                    const progressPercent = loanSchedule.length > 0 ? (paidCount / loanSchedule.length) * 100 : 0;
                    const totalPaid = loanSchedule.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
                    const totalWithInterest = Number(loan.loan_amount) * (1 + Number(loan.interest_rate) / 100);
                    const totalRemaining = Math.max(0, totalWithInterest - totalPaid);

                    return (
                      <MotiView
                        key={`main-${loan.id}`}
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 150 + idx * 50, type: 'timing', duration: 400 }}
                        style={[styles.mainLoanCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
                      >
                        {/* Car Overview Header */}
                        <View style={styles.mainLoanHeader}>
                          <View style={[styles.mainCarIconWrap, { backgroundColor: colors.primary + '15' }]}>
                            <Car size={26} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={styles.carNameRow}>
                              <Text style={[styles.mainCarName, { color: colors.text }]}>{loan.car_brand} {loan.car_model}</Text>
                              <View style={[styles.plateBadge, { backgroundColor: isDark ? '#333' : '#F1F5F9', borderColor: colors.border, borderWidth: 1 }]}>
                                <Text style={[styles.plateText, { color: colors.text }]}>{loan.car_plate || 'NÖMRƏSİZ'}</Text>
                              </View>
                            </View>
                            <Text style={[styles.mainCarMeta, { color: colors.textSecondary }]}>İstehsal ili: {loan.car_year}</Text>
                          </View>
                          <View style={[styles.loanStatusBadge, { backgroundColor: getStatusColor(loan.status) + '15' }]}>
                            <Text style={[styles.loanStatusText, { color: getStatusColor(loan.status) }]}>
                              {getStatusText(loan.status)}
                            </Text>
                          </View>
                        </View>

                        {/* Specs Grid */}
                        <View style={[styles.specsGrid, { borderColor: colors.border }]}>
                          <View style={styles.specsItem}>
                            <Text style={[styles.specsLabel, { color: colors.textSecondary }]}>Maşının Qiyməti</Text>
                            <Text style={[styles.specsValue, { color: colors.text }]}>{Number(loan.total_price).toLocaleString('az-AZ')} ₼</Text>
                          </View>
                          <View style={styles.specsItem}>
                            <Text style={[styles.specsLabel, { color: colors.textSecondary }]}>İlkin Ödəniş</Text>
                            <Text style={[styles.specsValue, { color: '#34C759' }]}>{Number(loan.down_payment).toLocaleString('az-AZ')} ₼</Text>
                          </View>
                          <View style={styles.specsItem}>
                            <Text style={[styles.specsLabel, { color: colors.textSecondary }]}>Aylıq Ödəniş</Text>
                            <Text style={[styles.specsValue, { color: colors.primary }]}>{Number(loan.monthly_payment).toLocaleString('az-AZ')} ₼</Text>
                          </View>
                          <View style={styles.specsItem}>
                            <Text style={[styles.specsLabel, { color: colors.textSecondary }]}>İllik Faiz Dərəcəsi</Text>
                            <Text style={[styles.specsValue, { color: '#FF9500' }]}>{loan.interest_rate}%</Text>
                          </View>
                        </View>

                        {/* Next Payment Panel */}
                        {nextPayment && loan.status === 'active' && (
                          <View style={[styles.nextPaymentPanel, {
                            backgroundColor: nextPayment.status === 'overdue' ? 'rgba(255,59,48,0.04)' : 'rgba(0,122,255,0.03)',
                            borderColor: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF',
                            borderWidth: 1,
                          }]}>
                            <Calendar size={20} color={nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF'} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.nextPaymentPanelLabel, { color: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF' }]}>
                                {nextPayment.status === 'overdue' ? '⚠️ Gecikmiş Ödəniş Bildirişi' : '📅 Növbəti Ödəniş Cədvəli'}
                              </Text>
                              <Text style={[styles.nextPaymentPanelValue, { color: colors.text }]}>
                                {Number(nextPayment.amount).toLocaleString('az-AZ')} ₼ məbləğində ödənişiniz **{formatDate(nextPayment.due_date)}** tarixinədək tamamlanmalıdır.
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Payment Table */}
                        <View style={styles.tableContainer}>
                          <Text style={[styles.tableTitle, { color: colors.text }]}>💳 Ödəniş Planı və Tarixçəsi</Text>
                          <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.tableHeaderCell, { flex: 1, color: colors.textSecondary }]}>Hissə</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 2, color: colors.textSecondary }]}>Ödəniş Tarixi</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 2, color: colors.textSecondary }]}>Məbləğ</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 2, color: colors.textSecondary }]}>Status</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5, color: colors.textSecondary, textAlign: 'right' }]}>Gecikmə</Text>
                          </View>

                          {loanSchedule.map((item: any, rowIdx) => {
                            const daysLate = item.status === 'overdue'
                              ? Math.floor((Date.now() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))
                              : 0;

                            const rowBg = item.status === 'paid'
                              ? (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)')
                              : item.status === 'overdue'
                                ? 'rgba(255,59,48,0.03)'
                                : (rowIdx % 2 === 0 ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)') : 'transparent');

                            return (
                              <View
                                key={item.id}
                                style={[styles.tableRow, {
                                  backgroundColor: rowBg,
                                  borderBottomColor: colors.border,
                                  opacity: item.status === 'paid' ? 0.7 : 1,
                                }]}
                              >
                                <Text style={[styles.tableCell, { flex: 1, color: colors.text, fontFamily: 'RethinkSans_700Bold' }]}>#{item.installment_number}</Text>
                                <Text style={[styles.tableCell, { flex: 2, color: colors.text }]}>{formatDate(item.due_date)}</Text>
                                <Text style={[styles.tableCell, { flex: 2, color: getStatusColor(item.status), fontFamily: 'RethinkSans_700Bold' }]}>{Number(item.amount).toLocaleString('az-AZ')} ₼</Text>
                                 <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  {getStatusIcon(item.status)}
                                  <Text style={{ color: getStatusColor(item.status), fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' }}>
                                    {getStatusText(item.status)}
                                  </Text>
                                </View>
                                <Text style={[styles.tableCell, { flex: 1.5, color: '#FF3B30', textAlign: 'right', fontFamily: 'RethinkSans_600SemiBold' }]}>
                                  {daysLate > 0 ? `${daysLate} gün` : '—'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </MotiView>
                    );
                  })}
                </View>
              </View>
            ) : (
              /* =================== TABLET & MOBILE VIEW =================== */
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
                    <View style={[styles.loanCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
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
                        <View style={[styles.finItem, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.08)' : '#F2FBF4' }]}>
                          <Text style={[styles.finItemLabel, { color: colors.textSecondary }]}>Ödənilən</Text>
                          <Text style={[styles.finItemValue, { color: '#34C759' }]}>
                            {totalPaid.toLocaleString('az-AZ')} ₼
                          </Text>
                        </View>
                        <View style={[styles.finItem, { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.08)' : '#FFF5F5' }]}>
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
                          backgroundColor: nextPayment.status === 'overdue' ? 'rgba(255,59,48,0.05)' : 'rgba(0,122,255,0.04)',
                          borderColor: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF',
                          borderWidth: 1,
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
                                  item.status === 'overdue' && { backgroundColor: 'rgba(255,59,48,0.04)', borderColor: '#FF3B30', borderLeftWidth: 3 },
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
                                      {daysLate > 0 && <Text style={{ color: '#FF3B30' }}> • {daysLate} gün gecikir</Text>}
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  // Ambient glow backgrounds
  ambientBlob1: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    top: -100,
    left: -150,
    filter: 'blur(130px)' as any,
    opacity: 0.8,
    zIndex: 0,
  },
  ambientBlob2: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    bottom: -150,
    right: -150,
    filter: 'blur(160px)' as any,
    opacity: 0.75,
    zIndex: 0,
  },

  // LOGIN SCREEN
  loginScroll: { 
    flexGrow: 1, 
    padding: 32, 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: 1,
  },
  loginContainer: { 
    width: '100%', 
    maxWidth: 460, 
    alignItems: 'center',
    borderRadius: 28,
    padding: 36,
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      } as any,
    }),
  },
  webBackBtn: { 
    position: 'absolute', 
    left: 24, 
    top: 24, 
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginIconWrap: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24,
    marginTop: 10,
  },
  loginTitle: { 
    fontSize: 26, 
    fontFamily: 'RethinkSans_800ExtraBold', 
    marginBottom: 10,
    textAlign: 'center',
  },
  loginSubtitle: { 
    fontSize: 15, 
    fontFamily: 'RethinkSans_400Regular', 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 32, 
    paddingHorizontal: 10,
  },
  loginCard: { 
    width: '100%', 
    gap: 20,
  },
  loginField: { 
    width: '100%',
  },
  loginLabel: { 
    fontSize: 14, 
    fontFamily: 'RethinkSans_700Bold', 
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loginInput: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderRadius: 16, 
    borderWidth: 1, 
    gap: 12,
  },
  loginInputText: { 
    flex: 1, 
    fontSize: 16, 
    fontFamily: 'RethinkSans_700Bold', 
    letterSpacing: 1.5,
    outlineStyle: 'none' as any,
  },
  charCounter: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
  },
  charCounterText: { 
    fontSize: 11, 
    fontFamily: 'RethinkSans_600SemiBold',
  },
  loginBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: '100%', 
    padding: 18, 
    borderRadius: 16, 
    gap: 10, 
    marginTop: 10,
    boxShadow: '0 8px 24px rgba(255, 59, 48, 0.25)',
  },
  loginBtnText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontFamily: 'RethinkSans_700Bold',
  },
  infoBox: { 
    width: '100%', 
    padding: 16, 
    borderRadius: 16, 
    marginTop: 28,
  },
  infoBoxText: { 
    fontSize: 13, 
    fontFamily: 'RethinkSans_500Medium', 
    lineHeight: 20, 
    textAlign: 'center',
  },

  // LOGGED IN DASHBOARD
  dashboardWrapper: {
    flex: 1,
    zIndex: 1,
  },
  header: { 
    paddingVertical: 20, 
    paddingHorizontal: 32, 
    borderBottomWidth: 1, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16,
  },
  avatarBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  headerGreeting: { 
    fontSize: 12, 
    fontFamily: 'RethinkSans_500Medium', 
    marginBottom: 2,
  },
  headerName: { 
    fontSize: 16, 
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  logoutBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  
  scrollContent: { 
    padding: 32, 
    paddingBottom: 100,
  },
  emptyContainer: { 
    alignItems: 'center', 
    paddingTop: 100, 
    gap: 20,
  },
  emptyTitle: { 
    fontSize: 20, 
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  emptyDesc: { 
    fontSize: 15, 
    fontFamily: 'RethinkSans_400Regular', 
    textAlign: 'center', 
    lineHeight: 22, 
    paddingHorizontal: 20,
    maxWidth: 500,
  },

  /* =================== DESKTOP LAYOUT STYLES =================== */
  dashboardGrid: {
    flexDirection: 'row',
    gap: 32,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  sidebar: {
    width: 360,
    gap: 24,
  },
  sidebarCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 17,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  profileMeta: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },
  profileDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'RethinkSans_500Medium',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
  },
  summaryContainer: {
    gap: 16,
  },
  overdueBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  overdueBadgeCardText: {
    color: '#FF3B30',
    fontFamily: 'RethinkSans_700Bold',
    fontSize: 14,
  },
  metricCard: {
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'RethinkSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sidebarProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 14,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  progressInstallmentsText: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: 8,
  },
  helpDeskCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    gap: 14,
  },
  helpTitle: {
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 4,
  },
  helpDesc: {
    fontSize: 12,
    fontFamily: 'RethinkSans_400Regular',
    lineHeight: 18,
  },

  // Main area
  mainContent: {
    flex: 1,
    gap: 24,
  },
  mainLoanCard: {
    borderRadius: 28,
    padding: 28,
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.05)',
  },
  mainLoanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 24,
  },
  mainCarIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainCarName: {
    fontSize: 20,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  plateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  plateText: {
    fontSize: 11,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  mainCarMeta: {
    fontSize: 13,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: 4,
  },
  loanStatusBadge: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12,
  },
  loanStatusText: { 
    fontSize: 13, 
    fontFamily: 'RethinkSans_700Bold',
  },

  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  specsItem: {
    width: '25%',
    paddingRight: 10,
  },
  specsLabel: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
    marginBottom: 6,
  },
  specsValue: {
    fontSize: 18,
    fontFamily: 'RethinkSans_800ExtraBold',
  },

  nextPaymentPanel: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    borderRadius: 20,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  nextPaymentPanelLabel: {
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 6,
  },
  nextPaymentPanelValue: {
    fontSize: 14,
    fontFamily: 'RethinkSans_500Medium',
    lineHeight: 20,
  },

  // Payment Schedule Data Table (Web Desktop UI)
  tableContainer: {
    marginTop: 10,
  },
  tableTitle: {
    fontSize: 16,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
  },
  tableHeaderCell: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 14,
    fontFamily: 'RethinkSans_500Medium',
  },


  /* =================== TABLET & MOBILE FALLBACK STYLES =================== */
  loanCard: {
    borderRadius: 24, 
    padding: 22, 
    marginBottom: 20,
    boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
  },
  loanHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14, 
    marginBottom: 18,
  },
  carIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  carName: { 
    fontSize: 18, 
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  carYear: { 
    fontSize: 13, 
    fontFamily: 'RethinkSans_500Medium', 
    marginTop: 2,
  },
  financeSummary: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 18,
  },
  finItem: { 
    flex: 1, 
    borderRadius: 16, 
    padding: 16, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  finItemLabel: { 
    fontSize: 12, 
    fontFamily: 'RethinkSans_500Medium', 
    marginBottom: 6,
  },
  finItemValue: { 
    fontSize: 18, 
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  progressSection: { 
    marginBottom: 18,
  },
  progressHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8,
  },
  progressText: { 
    fontSize: 13, 
    fontFamily: 'RethinkSans_500Medium',
  },
  progressPercent: { 
    fontSize: 13, 
    fontFamily: 'RethinkSans_700Bold',
  },
  progressBar: { 
    height: 8, 
    borderRadius: 4, 
    overflow: 'hidden',
  },
  progressFill: { 
    height: '100%', 
    borderRadius: 4,
  },
  overdueWarning: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 14,
  },
  overdueWarningText: { 
    color: '#FF3B30', 
    fontFamily: 'RethinkSans_700Bold', 
    fontSize: 13,
  },
  nextPayment: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 16,
  },
  nextPaymentLabel: { 
    fontSize: 13, 
    fontFamily: 'RethinkSans_600SemiBold', 
    marginBottom: 4,
  },
  nextPaymentValue: { 
    fontSize: 15, 
    fontFamily: 'RethinkSans_700Bold',
  },
  toggleSchedule: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 16, 
    borderTopWidth: 1,
  },
  toggleScheduleText: { 
    fontSize: 14, 
    fontFamily: 'RethinkSans_700Bold',
  },
  scheduleList: { 
    gap: 8, 
    marginTop: 14,
  },
  scheduleItem: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1,
  },
  scheduleItemLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  scheduleInstNum: { 
    fontSize: 14, 
    fontFamily: 'RethinkSans_700Bold',
  },
  scheduleDueDate: { 
    fontSize: 12, 
    fontFamily: 'RethinkSans_400Regular', 
    marginTop: 2,
  },
  scheduleItemRight: { 
    alignItems: 'flex-end',
  },
  scheduleAmount: { 
    fontSize: 15, 
    fontFamily: 'RethinkSans_700Bold',
  },
  scheduleStatus: { 
    fontSize: 11, 
    fontFamily: 'RethinkSans_600SemiBold', 
    marginTop: 2,
  },
  backBtn: { 
    padding: 6,
  },
});
