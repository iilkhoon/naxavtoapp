import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, RefreshControl, Linking,
  KeyboardAvoidingView
} from 'react-native';
import {
  CreditCard, Calendar, Hash, Car, CheckCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, LogOut, Plus,
  Phone, User, FileText, Send, Shield, Briefcase, DollarSign,
  Fingerprint, CheckCircle2, Sparkles, ChevronRight, AlertCircle
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { formatDate } from '../../lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

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
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { session } = useAuth();

  // Active top tab: 'apply' (Kreditə Müraciət) vs 'account' (Kredit Hesabım)
  const [activeTab, setActiveTab] = useState<'apply' | 'account'>('apply');

  // Application Form States
  const [appFullName, setAppFullName] = useState('');
  const [appFatherName, setAppFatherName] = useState('');
  const [appFinCode, setAppFinCode] = useState('');
  const [appBirthDate, setAppBirthDate] = useState('');
  const [appWorkplace, setAppWorkplace] = useState('');
  const [appMonthlyIncome, setAppMonthlyIncome] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appErrorMessage, setAppErrorMessage] = useState<string | null>(null);
  const [appSubmitting, setAppSubmitting] = useState(false);
  const [appSubmitted, setAppSubmitted] = useState(false);

  // Loan Account (Existing Client) States
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

  // Auto-fill account details if logged in
  useEffect(() => {
    const fetchAuthAccount = async () => {
      if (session?.user?.id) {
        try {
          const { data } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (data) {
            if (data.full_name && !appFullName) setAppFullName(data.full_name);
            if (data.phone && !appPhone) setAppPhone(data.phone);
          }
        } catch (e) {
          console.log(e);
        }
      }
    };
    fetchAuthAccount();
  }, [session]);

  // Check saved session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const savedSession = await AsyncStorage.getItem(CREDIT_SESSION_KEY);
      if (savedSession) {
        const { fin, birth } = JSON.parse(savedSession);
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
      if ((window as any).notifInterval) {
        clearInterval((window as any).notifInterval);
      }
      await Notifications.cancelAllScheduledNotificationsAsync();

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
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

      let pushToken = '';
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenData.data;
      } catch (tokenErr) {
        console.log("Push token error", tokenErr);
      }

      if (pushToken && loansData.length > 0) {
        for (const loan of loansData) {
          let currentNotes = loan.notes || '';
          if (!currentNotes.includes(`[PUSH_TOKEN:${pushToken}]`)) {
            currentNotes = currentNotes.replace(/\[PUSH_TOKEN:ExponentPushToken\[.*?\]\]/g, '').trim();
            currentNotes = `${currentNotes}\n[PUSH_TOKEN:${pushToken}]`.trim();
            supabase.from('loan_accounts').update({ notes: currentNotes }).eq('id', loan.id).then();
          }
        }
      }

      let overdueAmount = 0;
      let nextDueAmount = 0;
      let isOverdue = false;
      let isDueToday = false;

      const todayStr = new Date().toISOString().split('T')[0];

      Object.values(allSchedules).forEach((loanSchedule) => {
        const overdues = loanSchedule.filter((s: any) => s.status === 'overdue');
        if (overdues.length > 0) {
          isOverdue = true;
          overdues.forEach((s: any) => overdueAmount += (Number(s.amount) - Number(s.paid_amount || 0)));
        }

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

        const triggerHours = [10, 14, 18];
        
        for (const hour of triggerHours) {
          await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true },
            trigger: { hour, minute: 0, repeats: true } as any, 
          });
        }
      }
    } catch (err) {
      console.log('Setup Notifications Error:', err);
    }
  };

  // =================== APPLY FOR CREDIT HANDLER ===================
  const handleApplySubmit = async () => {
    setAppErrorMessage(null);

    if (!appFullName.trim()) {
      setAppErrorMessage('Lütfən ad və soyadınızı daxil edin');
      return;
    }
    if (!appFinCode.trim()) {
      setAppErrorMessage('Lütfən FİN kodunuzu daxil edin');
      return;
    }
    if (!appPhone.trim()) {
      setAppErrorMessage('Lütfən əlaqə üçün mobil nömrənizi daxil edin');
      return;
    }

    setAppSubmitting(true);

    try {
      // Parse birth date flexibly
      let dbBirthDate: string | null = null;
      if (appBirthDate.trim()) {
        const cleaned = appBirthDate.trim().replace(/[^0-9]/g, '');
        if (cleaned.length === 8) {
          const day = cleaned.substring(0, 2);
          const month = cleaned.substring(2, 4);
          const year = cleaned.substring(4, 8);
          dbBirthDate = `${year}-${month}-${day}`;
        } else {
          const parts = appBirthDate.trim().replace(/[\/\-]/g, '.').split('.');
          if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
            dbBirthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      let parsedIncome: number | null = null;
      if (appMonthlyIncome.trim()) {
        const inc = parseFloat(appMonthlyIncome.replace(',', '.').trim());
        if (!isNaN(inc)) parsedIncome = inc;
      }

      const insertData = {
        full_name: appFullName.trim(),
        father_name: appFatherName.trim() || null,
        fin_code: appFinCode.trim().toUpperCase(),
        birth_date: dbBirthDate,
        workplace: appWorkplace.trim() || null,
        monthly_income: parsedIncome,
        phone: appPhone.trim(),
        status: 'pending',
        account_id: session?.user?.id || null,
        car_id: null
      };

      console.log('[Credit Tab] Submitting application to Supabase:', insertData);

      const { data, error } = await supabase
        .from('credit_applications')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[Credit Tab] Supabase insert error:', error);
        throw error;
      }

      console.log('[Credit Tab] Inserted successfully:', data);

      setAppSubmitted(true);
      showToast('Kredit müraciətiniz uğurla qəbul edildi!', 'success');

      // Clear fields
      setAppFullName('');
      setAppFatherName('');
      setAppFinCode('');
      setAppBirthDate('');
      setAppWorkplace('');
      setAppMonthlyIncome('');
      setAppPhone('');
      setAppErrorMessage(null);

    } catch (e: any) {
      console.error('Credit Application Submit Error:', e);
      const msg = e?.message || 'Xəta baş verdi. Xahiş edirik yenidən cəhd edin.';
      setAppErrorMessage(msg);
      showToast('Müraciət xətası: ' + msg, 'error');
    } finally {
      setAppSubmitting(false);
    }
  };

  // Formatting helpers
  const handleAppFinChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7);
    setAppFinCode(cleaned);
  };

  const handleAppBirthChange = (text: string) => {
    const nums = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (nums.length > 0) formatted += nums.substring(0, 2);
    if (nums.length > 2) formatted += '.' + nums.substring(2, 4);
    if (nums.length > 4) formatted += '.' + nums.substring(4, 8);
    setAppBirthDate(formatted);
  };

  // =================== EXISTING LOANS LOGIN ===================
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
        showToast('Bu FIN kod və doğum tarixi ilə aktiv kredit tapılmadı', 'error');
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
    if ((window as any).notifInterval) clearInterval((window as any).notifInterval);
    setIsLoggedIn(false);
    setLoans([]);
    setSchedules({});
    setCustomerInfo(null);
    setFinCode('');
    setBirthDate('');
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={[styles.mainHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.mainHeaderTitle, { color: colors.text }]}>Kredit Mərkəzi</Text>
          <Text style={[styles.mainHeaderSubtitle, { color: colors.textSecondary }]}>Naxçıvan Avto Kredit Xidmətləri</Text>
        </View>
        <TouchableOpacity 
          style={[styles.calcHeaderBtn, { backgroundColor: `${colors.primary}15` }]}
          onPress={() => router.push('/calculator' as any)}
        >
          <Text style={{ color: colors.primary, fontSize: 13, fontFamily: 'RethinkSans_700Bold' }}>Hesabla 📊</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Tab Switcher */}
      <View style={styles.tabSwitcherWrap}>
        <View style={[styles.tabSwitcher, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'apply' && [styles.tabBtnActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('apply')}
          >
            <Send size={15} color={activeTab === 'apply' ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[
              styles.tabBtnText,
              { color: activeTab === 'apply' ? '#FFF' : colors.textSecondary },
              activeTab === 'apply' && { fontFamily: 'RethinkSans_700Bold' }
            ]}>
              Kreditə Müraciət
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'account' && [styles.tabBtnActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('account')}
          >
            <CreditCard size={15} color={activeTab === 'account' ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[
              styles.tabBtnText,
              { color: activeTab === 'account' ? '#FFF' : colors.textSecondary },
              activeTab === 'account' && { fontFamily: 'RethinkSans_700Bold' }
            ]}>
              Kredit Hesabım
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===================== TAB 1: APPLY FOR CREDIT ===================== */}
      {activeTab === 'apply' && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Banner Promo */}
            <LinearGradient
              colors={[colors.primary, '#FF9500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoCard}
            >
              <View style={styles.promoIcon}>
                <Sparkles size={24} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoTitle}>Sürətli və Sərfəli Avto Kredit</Text>
                <Text style={styles.promoDesc}>
                  Yalnız şəxsiyyət vəsiqəsi ilə 15 dəqiqə ərzində müraciət edin.
                </Text>
              </View>
            </LinearGradient>

            {appSubmitted ? (
              <MotiView 
                from={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                style={[styles.successBox, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.successIconWrap}>
                  <CheckCircle2 size={60} color="#34C759" />
                </View>
                <Text style={[styles.successTitle, { color: colors.text }]}>Müraciətiniz Qəbul Olundu!</Text>
                <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                  Kredit mütəxəssislərimiz müraciətinizi nəzərdən keçirib tezliklə sizinlə əlaqə saxlayacaqlar.
                </Text>
                <TouchableOpacity
                  style={[styles.newAppBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setAppSubmitted(false)}
                >
                  <Text style={styles.newAppBtnText}>Yeni Müraciət Et</Text>
                </TouchableOpacity>
              </MotiView>
            ) : (
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.formTitle, { color: colors.text }]}>Müraciət Formu</Text>
                <Text style={[styles.formSub, { color: colors.textSecondary }]}>Məlumatlarınızı daxil edin</Text>

                {/* Error Banner */}
                {appErrorMessage && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={18} color="#FF3B30" style={{ marginRight: 8 }} />
                    <Text style={styles.errorText}>{appErrorMessage}</Text>
                  </View>
                )}

                {/* Ad Soyad */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Ad və Soyad *</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={appFullName}
                      onChangeText={(t) => { setAppErrorMessage(null); setAppFullName(t); }}
                      placeholder="Məs: İlkin Rzayev"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* Ata adı */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Ata adı</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={appFatherName}
                      onChangeText={setAppFatherName}
                      placeholder="Məs: Əli oğlu"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* FIN Kod & Doğum Tarixi */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>FİN Kod *</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Fingerprint size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={appFinCode}
                        onChangeText={handleAppFinChange}
                        autoCapitalize="characters"
                        maxLength={7}
                        placeholder="7ABC123"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Doğum Tarixi</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Calendar size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={appBirthDate}
                        onChangeText={handleAppBirthChange}
                        placeholder="GG.AA.YYYY"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="numeric"
                        maxLength={10}
                      />
                    </View>
                  </View>
                </View>

                {/* Mobil Nömrə */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Mobil Nömrə *</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Phone size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={appPhone}
                      onChangeText={setAppPhone}
                      placeholder="Məs: +994 50 123 45 67"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* İş Yeri */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>İş Yeri / Fəaliyyət Sahəsi</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Briefcase size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={appWorkplace}
                      onChangeText={setAppWorkplace}
                      placeholder="Məs: Naxçıvan MMC"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* Aylıq Qazanc */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Aylıq Qazanc (₼)</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <DollarSign size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={appMonthlyIncome}
                      onChangeText={setAppMonthlyIncome}
                      placeholder="Məs: 1200"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleApplySubmit}
                  disabled={appSubmitting}
                  style={{ marginTop: 10 }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.primary, '#FF9500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    {appSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Send size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.submitBtnText}>Müraciəti Göndər</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Features Info */}
            <View style={styles.infoRowGrid}>
              <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.featureEmoji}>⚡</Text>
                <Text style={[styles.featureTitle, { color: colors.text }]}>15 Dəqiqəyə Cavab</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Müraciətiniz operativ yoxlanılır</Text>
              </View>

              <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.featureEmoji}>📄</Text>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Tək Şəxsiyyət Vəsiqəsi</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Əlavə arayış tələb olunmur</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ===================== TAB 2: MY LOAN ACCOUNT ===================== */}
      {activeTab === 'account' && (
        !isLoggedIn ? (
          <ScrollView
            contentContainerStyle={styles.loginScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.loginContainer}
            >
              <View style={[styles.loginIconWrap, { backgroundColor: colors.primary + '15' }]}>
                <CreditCard size={44} color={colors.primary} />
              </View>

              <Text style={[styles.loginTitle, { color: colors.text }]}>Kredit Hesabım</Text>
              <Text style={[styles.loginSubtitle, { color: colors.textSecondary }]}>
                Aktiv kreditlərinizə və ödəniş cədvəlinizə baxmaq üçün FİN kodunuz və doğum tarixinizlə daxil olun.
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
                    onChangeText={(val) => {
                      const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      if (cleaned.length <= 7) setFinCode(cleaned);
                    }}
                    placeholder="Məs: 7ABC123"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="characters"
                    maxLength={7}
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
                    onChangeText={(val) => {
                      const nums = val.replace(/[^0-9]/g, '');
                      let formatted = '';
                      if (nums.length > 0) formatted += nums.substring(0, 2);
                      if (nums.length > 2) formatted += '.' + nums.substring(2, 4);
                      if (nums.length > 4) formatted += '.' + nums.substring(4, 8);
                      setBirthDate(formatted);
                    }}
                    placeholder="GG.AA.YYYY"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                    maxLength={10}
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
            </MotiView>
          </ScrollView>
        ) : (
          /* Logged In Dashboard */
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.dashScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchLoans(finCode, birthDate);
                }}
                tintColor={colors.primary}
              />
            }
          >
            {/* User Greeting & Logout */}
            <View style={[styles.userBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.userBarLeft}>
                <View style={[styles.avatarCircle, { backgroundColor: `${colors.primary}15` }]}>
                  <User size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.userGreeting, { color: colors.text }]}>
                    {customerInfo?.name} {customerInfo?.surname}
                  </Text>
                  <Text style={[styles.userFin, { color: colors.textSecondary }]}>
                    FİN: {customerInfo?.fin}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={18} color="#FF3B30" />
              </TouchableOpacity>
            </View>

            {loans.length === 0 ? (
              <View style={styles.emptyLoans}>
                <Car size={56} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.text }]}>Aktiv kredit tapılmadı</Text>
              </View>
            ) : (
              loans.map((loan, idx) => {
                const sched = schedules[loan.id] || [];
                const paidCount = sched.filter(s => s.status === 'paid').length;
                const overdueCount = sched.filter(s => s.status === 'overdue').length;
                const isExpanded = expandedLoan === loan.id;

                return (
                  <View key={loan.id} style={[styles.loanCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.loanHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.loanCarName, { color: colors.text }]}>
                          🚗 {loan.car_brand} {loan.car_model} ({loan.car_year})
                        </Text>
                        <Text style={[styles.loanAmountText, { color: colors.primary }]}>
                          Aylıq: {Number(loan.monthly_payment).toLocaleString()} ₼
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '15' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(loan.status) }]}>
                          {getStatusText(loan.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.loanProgressRow}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        Ödənilmiş hissə: {paidCount} / {sched.length}
                      </Text>
                      {overdueCount > 0 && (
                        <Text style={styles.overdueWarning}>
                          ⚠️ {overdueCount} gecikmə
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity 
                      style={[styles.toggleSchedBtn, { borderTopColor: colors.border }]}
                      onPress={() => setExpandedLoan(isExpanded ? null : loan.id)}
                    >
                      <Text style={[styles.toggleSchedText, { color: colors.primary }]}>
                        {isExpanded ? 'Ödəniş Planını Gizlə' : 'Ödəniş Planına Bax'}
                      </Text>
                      {isExpanded ? <ChevronUp size={16} color={colors.primary} /> : <ChevronDown size={16} color={colors.primary} />}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.schedList}>
                        {sched.map((item) => (
                          <View key={item.id} style={[styles.schedItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                            <View style={styles.schedItemLeft}>
                              {getStatusIcon(item.status)}
                              <View style={{ marginLeft: 8 }}>
                                <Text style={[styles.schedNum, { color: colors.text }]}>Hissə #{item.installment_number}</Text>
                                <Text style={[styles.schedDate, { color: colors.textSecondary }]}>{formatDate(item.due_date)}</Text>
                              </View>
                            </View>
                            <Text style={[styles.schedAmount, { color: getStatusColor(item.status) }]}>
                              {Number(item.amount).toLocaleString()} ₼
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mainHeaderTitle: {
    fontSize: 20,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  mainHeaderSubtitle: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: 2,
  },
  calcHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tabSwitcherWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoTitle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  promoDesc: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: 2,
    opacity: 0.9,
  },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
    flex: 1,
  },
  formTitle: {
    fontSize: 17,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  formSub: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: -8,
    marginBottom: 4,
  },
  inputGroup: {
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: 'RethinkSans_600SemiBold',
    marginBottom: 4,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
  },
  successBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52,199,89,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: 'RethinkSans_800ExtraBold',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    fontFamily: 'RethinkSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  newAppBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newAppBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
  },
  infoRowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: 'RethinkSans_400Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Login & Dashboard styles
  loginScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  loginContainer: {
    alignItems: 'center',
  },
  loginIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 22,
    fontFamily: 'RethinkSans_800ExtraBold',
    marginBottom: 6,
  },
  loginSubtitle: {
    fontSize: 13,
    fontFamily: 'RethinkSans_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  loginField: {
    width: '100%',
    marginBottom: 16,
  },
  loginLabel: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
    marginBottom: 6,
  },
  loginInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  loginInputText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
    letterSpacing: 1,
  },
  charCounter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
  },
  dashScroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 60,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  userBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userGreeting: {
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
  },
  userFin: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
  },
  logoutBtn: {
    padding: 8,
  },
  emptyLoans: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
  loanCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loanCarName: {
    fontSize: 16,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  loanAmountText: {
    fontSize: 14,
    fontFamily: 'RethinkSans_700Bold',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'RethinkSans_700Bold',
  },
  loanProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
  },
  overdueWarning: {
    fontSize: 12,
    color: '#FF3B30',
    fontFamily: 'RethinkSans_700Bold',
  },
  toggleSchedBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  toggleSchedText: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
  schedList: {
    gap: 6,
    marginTop: 6,
  },
  schedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  schedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schedNum: {
    fontSize: 12,
    fontFamily: 'RethinkSans_700Bold',
  },
  schedDate: {
    fontSize: 11,
    fontFamily: 'RethinkSans_400Regular',
  },
  schedAmount: {
    fontSize: 13,
    fontFamily: 'RethinkSans_700Bold',
  },
});
