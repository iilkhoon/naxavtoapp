import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, RefreshControl, Linking
} from 'react-native';
import {
  CreditCard, Calendar, Hash, Car, CheckCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, LogOut, Plus,
  Phone, User, FileText, Send, Shield
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { formatDate } from '../../lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Handle notifications when app is active
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CREDIT_SESSION_KEY = 'nax_credit_session';

export default function CreditScreen() {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [finCode, setFinCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [loans, setLoans] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Record<string, any[]>>({});
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);

  // Check saved session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await AsyncStorage.getItem(CREDIT_SESSION_KEY);
      if (session) {
        const { fin, birth } = JSON.parse(session);
        setFinCode(fin);
        setBirthDate(birth);
        setIsLoggedIn(true);
        await fetchLoans(fin, birth);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async (fin: string, birth: string) => {
    try {
      const { data: loansData, error } = await supabase
        .from('loan_accounts')
        .select('*')
        .ilike('customer_fin', fin)
        .eq('customer_birth_date', birth)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!loansData || loansData.length === 0) {
        setLoans([]);
        setSchedules({});
        setCustomerInfo(null);
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
      const loanIds = loansData.map((l: any) => l.id);
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
      
      // Setup Notifications
      await setupNotifications(loansData, grouped);
      
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const setupNotifications = async (loansData: any[], allSchedules: Record<string, any[]>) => {
    try {
      // Clear previously scheduled test/interval notifications
      if ((window as any).notifInterval) {
        clearInterval((window as any).notifInterval);
      }
      // Clear all OS level scheduled notifications to reset state
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Standart Bildirişlər',
          importance: 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF3B30',
        });
      }

      // Fetch and save Expo Push Token for real push notification
      let pushToken = '';
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenData.data;
      } catch (tokenErr) {
        console.log("Could not get push token for real push", tokenErr);
      }

      if (pushToken && loansData.length > 0) {
        for (const loan of loansData) {
          let currentNotes = loan.notes || '';
          if (!currentNotes.includes(`[PUSH_TOKEN:${pushToken}]`)) {
            currentNotes = currentNotes.replace(/\[PUSH_TOKEN:ExponentPushToken\[.*?\]\]/g, '').trim();
            currentNotes = `${currentNotes}\n[PUSH_TOKEN:${pushToken}]`.trim();
            // Fire and forget updating the token
            supabase.from('loan_accounts').update({ notes: currentNotes }).eq('id', loan.id).then();
          }
        }
      }

      // Find if user has overdue payments or upcoming today
      let overdueAmount = 0;
      let nextDueAmount = 0;
      let isOverdue = false;
      let isDueToday = false;

      const todayStr = new Date().toISOString().split('T')[0];

      Object.values(allSchedules).forEach((loanSchedule) => {
        // Find overdue
        const overdues = loanSchedule.filter((s: any) => s.status === 'overdue');
        if (overdues.length > 0) {
          isOverdue = true;
          overdues.forEach((s: any) => overdueAmount += (Number(s.amount) - Number(s.paid_amount || 0)));
        }

        // Find due today
        const pendings = loanSchedule.filter((s: any) => s.status === 'pending');
        if (pendings.length > 0) {
          const nextPending = pendings[0];
          if (nextPending.due_date && nextPending.due_date.startsWith(todayStr)) {
            isDueToday = true;
            nextDueAmount += (Number(nextPending.amount) - Number(nextPending.paid_amount || 0));
          }
        }
      });

      const shouldAlertDaily = isOverdue || isDueToday;
      const targetAmount = isOverdue ? overdueAmount : nextDueAmount;

      if (shouldAlertDaily && targetAmount > 0) {
        const title = isOverdue ? "⚠️ Ödənişiniz Gecikir!" : "📅 Ödənişin vaxtıdır!";
        const body = isOverdue 
          ? `Sizin ${targetAmount.toLocaleString('az-AZ')} ₼ gecikmiş ödənişiniz var! Xahiş edirik dərhal ödəniş edin.`
          : `Bu gün üçün ${targetAmount.toLocaleString('az-AZ')} ₼ ödənişiniz var. Xahiş edirik ödənişi gecikdirməyin.`;

        // Schedule daily at 10:00, 14:00, 18:00
        const triggerHours = [10, 14, 18];
        
        for (const hour of triggerHours) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              sound: true,
            },
            trigger: { 
              hour, 
              minute: 0, 
              repeats: true 
            } as any, 
          });
        }
        console.log("Scheduled daily alarms for overdue/due today.");
      }
    } catch (err) {
      console.log('Setup Notifications Error:', err);
    }
  };

  // Clean interval on unmount
  useEffect(() => {
    return () => {
      if ((window as any).notifInterval) clearInterval((window as any).notifInterval);
    };
  }, []);

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
      // Convert DD.MM.YYYY to YYYY-MM-DD
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

      // Save session
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
    if ((window as any).notifInterval) clearInterval((window as any).notifInterval);
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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  // =================== LOGIN SCREEN ===================
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.loginScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
            style={styles.loginContainer}
          >
            {/* Logo / Icon */}
            <View style={[styles.loginIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <CreditCard size={48} color={colors.primary} />
            </View>

            <Text style={[styles.loginTitle, { color: colors.text }]}>Kredit Hesabım</Text>
            <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
              FIN kodunuz və doğum tarixiniz ilə kredit məlumatlarınıza baxın
            </Text>

            {/* FIN Code Input */}
            <View style={styles.loginField}>
              <Text style={[styles.loginLabel, { color: colors.text }]}>
                <Hash size={14} color={colors.primary} /> FIN Kod
              </Text>
              <View style={[styles.loginInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.loginInputText, { color: colors.text }]}
                  value={finCode}
                  onChangeText={handleFinInput}
                  placeholder="Məs: 1A2B3C4"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  maxLength={7}
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
                <View style={[styles.charCounter, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                  <Text style={[styles.charCounterText, { color: colors.textSecondary }]}>{finCode.length}/7</Text>
                </View>
              </View>
            </View>

            {/* Birth Date Input */}
            <View style={styles.loginField}>
              <Text style={[styles.loginLabel, { color: colors.text }]}>
                <Calendar size={14} color={colors.primary} /> Doğum Tarixi
              </Text>
              <View style={[styles.loginInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.loginInputText, { color: colors.text }]}
                  value={birthDate}
                  onChangeText={handleBirthInput}
                  placeholder="GG.AA.İİİİ"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                  blurOnSubmit={false}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: loginLoading ? 0.6 : 1 }]}
              onPress={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Shield size={20} color="#FFF" />
                  <Text style={styles.loginBtnText}>Daxil Ol</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? '#1c2a3d' : '#EFF6FF' }]}>
              <Text style={[styles.infoBoxText, { color: colors.textSecondary }]}>
                🔒 Məlumatlarınız təhlükəsizdir. FIN kodunuz yalnız kredit hesabınıza giriş üçün istifadə olunur.
              </Text>
            </View>
          </MotiView>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =================== DASHBOARD (LOGGED IN) ===================
  const totalLoans = loans.length;
  const activeLoans = loans.filter(l => l.status === 'active').length;
  const allScheduleItems = Object.values(schedules).flat();
  const totalPaid = allScheduleItems.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
  const totalDebt = allScheduleItems
    .filter((s: any) => s.status !== 'paid')
    .reduce((sum: number, s: any) => sum + (Number(s.amount) - Number(s.paid_amount || 0)), 0);
  const overdueCount = allScheduleItems.filter((s: any) => s.status === 'overdue').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Premium Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarBox, { backgroundColor: colors.primary + '15' }]}>
            <User size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerGreeting, { color: colors.primary, fontFamily: 'RethinkSans_800ExtraBold', fontSize: 18 }]}>Kredit Hesabım</Text>
            <Text style={[styles.headerName, { color: colors.text, fontSize: 13, fontFamily: 'RethinkSans_600SemiBold', marginTop: 2 }]}>
              {customerInfo?.name} {customerInfo?.surname}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: isDark ? '#2c1c1c' : '#FFF0F0' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.dashScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              const session = { fin: finCode, birth: birthDate };
              fetchLoans(session.fin, session.birth);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Simplified Financial Summary Card */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Maliyyə Xülasəsi</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryVal, { color: '#34C759' }]}>{totalPaid.toLocaleString('az-AZ')} ₼</Text>
              <Text style={[styles.summaryLbl, { color: colors.textSecondary }]}>Ödənilən cəmi</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryVal, { color: '#FF3B30' }]}>{Math.max(0, totalDebt).toLocaleString('az-AZ')} ₼</Text>
              <Text style={[styles.summaryLbl, { color: colors.textSecondary }]}>Qalan borc</Text>
            </View>
          </View>

          {/* Simple Clean Progress Bar */}
          {loans.length > 0 && (() => {
            const loan = loans[0];
            const loanSchedule = schedules[loan.id] || [];
            const paidCount = loanSchedule.filter((s: any) => s.status === 'paid').length;
            const progressPercent = loanSchedule.length > 0 ? (paidCount / loanSchedule.length) * 100 : 0;
            return (
              <View style={styles.summaryProgress}>
                <View style={styles.progressTextRow}>
                  <Text style={[styles.progressLbl, { color: colors.textSecondary }]}>
                    Ödəniş faizi: {Math.round(progressPercent)}%
                  </Text>
                  <Text style={[styles.progressLbl, { color: colors.primary, fontFamily: 'RethinkSans_700Bold' }]}>
                    {paidCount}/{loanSchedule.length} hissə
                  </Text>
                </View>
                <View style={[styles.summaryProgressBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.summaryProgressBarFill, { width: `${progressPercent}%`, backgroundColor: '#34C759' }]} />
                </View>
              </View>
            );
          })()}
        </MotiView>

        {overdueCount > 0 && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[styles.overdueAlert, { backgroundColor: 'rgba(255,59,48,0.08)' }]}
          >
            <AlertTriangle size={18} color="#FF3B30" />
            <Text style={styles.overdueAlertText}>{overdueCount} gecikmiş ödənişiniz var!</Text>
          </MotiView>
        )}

        {/* Loans */}
        {loans.length === 0 ? (
          <View style={styles.emptyLoans}>
            <Car size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Aktiv kredit tapılmadı</Text>
          </View>
        ) : (
          loans.map((loan, index) => {
            const loanSchedule = schedules[loan.id] || [];
            const loanPaid = loanSchedule.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
            const loanTotalWithInterest = Number(loan.loan_amount) * (1 + Number(loan.interest_rate) / 100);
            const loanRemaining = Math.max(0, loanTotalWithInterest - loanPaid);
            const paidCount = loanSchedule.filter((s: any) => s.status === 'paid').length;
            const loanOverdue = loanSchedule.filter((s: any) => s.status === 'overdue').length;
            const nextPayment = loanSchedule.find((s: any) => s.status === 'pending' || s.status === 'overdue');
            const isExpanded = expandedLoan === loan.id;
            const isDetailsExpanded = expandedDetails === loan.id;
            const progressPercent = loanSchedule.length > 0 ? (paidCount / loanSchedule.length) * 100 : 0;
            const maturityDate = loanSchedule.length > 0 ? loanSchedule[loanSchedule.length - 1].due_date : null;

            return (
              <MotiView
                key={loan.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 80, type: 'timing', duration: 400 }}
              >
                <View style={[styles.loanCard, { backgroundColor: colors.card }]}>
                  {/* Car Header */}
                  <View style={styles.loanHeader}>
                    <View style={[styles.carIcon, { backgroundColor: colors.primary + '15' }]}>
                      <Car size={22} color={colors.primary} />
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

                  {/* Clean Spec Summary */}
                  <View style={styles.cleanSpecRow}>
                    <View style={styles.cleanSpecCol}>
                      <Text style={[styles.cleanSpecVal, { color: colors.text }]}>{Number(loan.monthly_payment).toLocaleString('az-AZ')} ₼</Text>
                      <Text style={[styles.cleanSpecLbl, { color: colors.textSecondary }]}>Aylıq Ödəniş</Text>
                    </View>
                    <View style={styles.cleanSpecCol}>
                      <Text style={[styles.cleanSpecVal, { color: colors.text }]}>{paidCount} / {loanSchedule.length}</Text>
                      <Text style={[styles.cleanSpecLbl, { color: colors.textSecondary }]}>Ödənilmiş Hissə</Text>
                    </View>
                  </View>

                  {/* Collapsible Details Toggle */}
                  <TouchableOpacity
                    style={[styles.detailsToggle, { borderTopColor: colors.border }]}
                    onPress={() => setExpandedDetails(isDetailsExpanded ? null : loan.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.detailsToggleText, { color: colors.textSecondary }]}>
                      {isDetailsExpanded ? 'ℹ️ Detalları gizlə' : 'ℹ️ Ətraflı kredit məlumatları'}
                    </Text>
                    {isDetailsExpanded ? <ChevronUp size={16} color={colors.textSecondary} /> : <ChevronDown size={16} color={colors.textSecondary} />}
                  </TouchableOpacity>

                  {isDetailsExpanded && (
                    <MotiView
                      from={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={styles.detailsBox}
                    >
                      <View style={styles.detailRowGrid}>
                        <View style={styles.detailGridCol}>
                          <Text style={[styles.ldLabel, { color: colors.textSecondary }]}>Maşının Qiyməti</Text>
                          <Text style={[styles.ldValue, { color: colors.text }]}>{Number(loan.total_price).toLocaleString('az-AZ')} ₼</Text>
                        </View>
                        <View style={styles.detailGridCol}>
                          <Text style={[styles.ldLabel, { color: colors.textSecondary }]}>İlkin Ödəniş</Text>
                          <Text style={[styles.ldValue, { color: colors.text }]}>{Number(loan.down_payment).toLocaleString('az-AZ')} ₼</Text>
                        </View>
                      </View>
                      <View style={styles.detailRowGrid}>
                        <View style={styles.detailGridCol}>
                          <Text style={[styles.ldLabel, { color: colors.textSecondary }]}>İllik Faiz</Text>
                          <Text style={[styles.ldValue, { color: colors.text }]}>{loan.interest_rate}%</Text>
                        </View>
                        {maturityDate && (
                          <View style={styles.detailGridCol}>
                            <Text style={[styles.ldLabel, { color: colors.textSecondary }]}>Bitmə Tarixi</Text>
                            <Text style={[styles.ldValue, { color: colors.text }]}>{formatDate(maturityDate)}</Text>
                          </View>
                        )}
                      </View>
                    </MotiView>
                  )}

                  {/* Overdue Warning */}
                  {loanOverdue > 0 && (
                    <View style={[styles.loanOverdueWarn, { backgroundColor: 'rgba(255,59,48,0.07)' }]}>
                      <AlertTriangle size={14} color="#FF3B30" />
                      <Text style={styles.loanOverdueText}>{loanOverdue} ödəniş gecikib!</Text>
                    </View>
                  )}

                  {/* Next Payment */}
                  {nextPayment && loan.status === 'active' && (
                    <View style={[styles.nextPayBox, {
                      backgroundColor: nextPayment.status === 'overdue' ? 'rgba(255,59,48,0.06)' : 'rgba(0,122,255,0.06)',
                      borderColor: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF',
                      borderWidth: 1,
                    }]}>
                      <Calendar size={16} color={nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF'} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.nextPayLabel, { color: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF' }]}>
                          {nextPayment.status === 'overdue' ? '⚠️ Gecikmiş' : '📅 Növbəti Ödəniş'}
                        </Text>
                        <Text style={[styles.nextPayValue, { color: colors.text }]}>
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
                    <Text style={[styles.toggleText, { color: colors.primary }]}>💳 Ödəniş Planı</Text>
                    {isExpanded ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
                  </TouchableOpacity>

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
                              styles.schedItem,
                              { backgroundColor: isDark ? '#1a1a1e' : '#F8F8FA', borderColor: colors.border },
                              item.status === 'overdue' && { backgroundColor: 'rgba(255,59,48,0.04)', borderColor: '#FF3B30', borderLeftWidth: 3 },
                              item.status === 'paid' && { opacity: 0.6 }
                            ]}
                          >
                            <View style={styles.schedItemLeft}>
                              {getStatusIcon(item.status)}
                              <View>
                                <Text style={[styles.schedInstNum, { color: colors.text }]}>Hissə #{item.installment_number}</Text>
                                <Text style={[styles.schedDate, { color: colors.textSecondary }]}>
                                  {formatDate(item.due_date)}
                                  {daysLate > 0 && <Text style={{ color: '#FF3B30' }}> • {daysLate} gün gecikir</Text>}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.schedItemRight}>
                              <Text style={[styles.schedAmount, { color: getStatusColor(item.status) }]}>
                                {Number(item.amount).toLocaleString('az-AZ')} ₼
                              </Text>
                              <Text style={[styles.schedStatus, { color: getStatusColor(item.status) }]}>
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

        {/* Contact Info */}
        <View style={[styles.contactCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>📞 Əlaqə</Text>
          <Text style={[styles.contactDesc, { color: colors.textSecondary }]}>
            Ödəniş və ya kredit suallarınız üçün bizimlə əlaqə saxlayın.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // LOGIN STYLES
  loginScroll: { padding: 24, paddingTop: 40, paddingBottom: 120 },
  loginContainer: { alignItems: 'center' },
  loginIconWrap: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  loginTitle: { fontSize: 26, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 10 },
  loginSubtitle: { fontSize: 15, fontFamily: 'RethinkSans_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 },
  loginField: { width: '100%', marginBottom: 20 },
  loginLabel: { fontSize: 14, fontFamily: 'RethinkSans_700Bold', marginBottom: 8 },
  loginInput: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  loginInputText: { flex: 1, fontSize: 18, fontFamily: 'RethinkSans_700Bold', letterSpacing: 2 },
  charCounter: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  charCounterText: { fontSize: 12, fontFamily: 'RethinkSans_600SemiBold' },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: 18, borderRadius: 16, gap: 10, marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  loginBtnText: { color: '#FFF', fontSize: 17, fontFamily: 'RethinkSans_700Bold' },
  infoBox: { width: '100%', padding: 16, borderRadius: 14, marginTop: 24 },
  infoBoxText: { fontSize: 13, fontFamily: 'RethinkSans_500Medium', lineHeight: 20, textAlign: 'center' },
  // DASHBOARD STYLES
  header: { paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerGreeting: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold', color: '#000' },
  headerName: { fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },
  logoutBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dashScroll: { padding: 16, paddingBottom: 120 },
  
  // SIMPLIFIED SUMMARY CARD
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  summaryTitle: { fontSize: 12, fontFamily: 'RethinkSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 36, opacity: 0.5 },
  summaryVal: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold' },
  summaryLbl: { fontSize: 11, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },
  summaryProgress: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 14 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLbl: { fontSize: 12, fontFamily: 'RethinkSans_500Medium' },
  summaryProgressBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  summaryProgressBarFill: { height: '100%', borderRadius: 3 },

  overdueAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginBottom: 16 },
  overdueAlertText: { color: '#FF3B30', fontFamily: 'RethinkSans_700Bold', fontSize: 13 },
  emptyLoans: { alignItems: 'center', paddingTop: 60, gap: 16 },
  emptyText: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },

  // LOAN CARD
  loanCard: { borderRadius: 22, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  loanHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  carIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  carName: { fontSize: 16, fontFamily: 'RethinkSans_800ExtraBold' },
  carYear: { fontSize: 12, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },
  loanStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  loanStatusText: { fontSize: 11, fontFamily: 'RethinkSans_700Bold' },

  // CLEAN SPEC SUMMARY
  cleanSpecRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)', paddingVertical: 14, marginBottom: 4 },
  cleanSpecCol: { flex: 1, alignItems: 'center' },
  cleanSpecVal: { fontSize: 17, fontFamily: 'RethinkSans_800ExtraBold' },
  cleanSpecLbl: { fontSize: 11, fontFamily: 'RethinkSans_500Medium', marginTop: 2 },

  // COLLAPSIBLE DETAILS
  detailsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)', marginBottom: 14 },
  detailsToggleText: { fontSize: 12, fontFamily: 'RethinkSans_700Bold' },
  detailsBox: { paddingHorizontal: 4, paddingBottom: 14, gap: 12 },
  detailRowGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  detailGridCol: { width: '48%' },
  ldLabel: { fontSize: 11, fontFamily: 'RethinkSans_500Medium', marginBottom: 2 },
  ldValue: { fontSize: 14, fontFamily: 'RethinkSans_700Bold' },

  loanOverdueWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: 12 },
  loanOverdueText: { color: '#FF3B30', fontFamily: 'RethinkSans_700Bold', fontSize: 12 },
  nextPayBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, marginBottom: 14 },
  nextPayLabel: { fontSize: 11, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
  nextPayValue: { fontSize: 13, fontFamily: 'RethinkSans_700Bold' },

  toggleSchedule: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1 },
  toggleText: { fontSize: 13, fontFamily: 'RethinkSans_700Bold' },
  scheduleList: { gap: 6, marginTop: 12 },
  schedItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  schedItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  schedInstNum: { fontSize: 13, fontFamily: 'RethinkSans_700Bold' },
  schedDate: { fontSize: 11, fontFamily: 'RethinkSans_400Regular', marginTop: 1 },
  schedItemRight: { alignItems: 'flex-end' },
  schedAmount: { fontSize: 14, fontFamily: 'RethinkSans_700Bold' },
  schedStatus: { fontSize: 10, fontFamily: 'RethinkSans_600SemiBold', marginTop: 1 },

  // CONTACT
  contactCard: { borderRadius: 16, padding: 18, marginBottom: 20 },
  contactTitle: { fontSize: 15, fontFamily: 'RethinkSans_700Bold', marginBottom: 6 },
  contactDesc: { fontSize: 12, fontFamily: 'RethinkSans_400Regular', lineHeight: 18 },
});
