import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { CreditCard, CheckCircle, Clock, AlertTriangle, Calendar, LogOut, Shield, Car } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../lib/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebHeader } from '../components/WebHeader.web';
import { WebFooter } from '../components/WebFooter.web';
import { SeoHead } from '../components/web/SeoHead';
import {
  WebScreen, LargeTitle, Card, Button, Badge, EmptyState, Loading, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney,
} from '../components/web/WebKit';

const CREDIT_SESSION_KEY = 'nax_credit_session';

const money2 = (n: number) => `${n.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

// Per-loan figures shared by the summary and the schedule
const loanFigures = (schedule: any[]) => {
  const totalPaid = schedule.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
  // What is still due on the schedule (interest depends on the term, so derive it from the rows)
  const totalRemaining = schedule.reduce((sum: number, s: any) => sum + Math.max(0, Number(s.amount) - Number(s.paid_amount || 0)), 0);
  const paidCount = schedule.filter((s: any) => s.status === 'paid').length;
  return {
    totalPaid,
    totalRemaining,
    paidCount,
    overdueCount: schedule.filter((s: any) => s.status === 'overdue').length,
    nextPayment: schedule.find((s: any) => s.status === 'pending' || s.status === 'overdue'),
    progress: schedule.length > 0 ? (paidCount / schedule.length) * 100 : 0,
  };
};

const daysLate = (item: any) =>
  item.status === 'overdue' ? Math.floor((Date.now() - new Date(item.due_date).getTime()) / 86400000) : 0;

export default function MyLoans() {
  const router = useRouter();
  const t = useWebTokens();
  const { width: windowWidth, isMobile } = useBreakpoints();
  const { showToast } = useToast();

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
        .rpc('get_customer_loans', { p_fin: targetFin.toUpperCase(), p_birth: targetBirth });

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
      const { data: allSchedules } = await supabase
        .rpc('get_customer_loan_schedule', { p_fin: targetFin.toUpperCase(), p_birth: targetBirth });

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
        .rpc('get_customer_loans', { p_fin: finCode.toUpperCase(), p_birth: formattedDate });

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
      default: return t.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödənilib';
      case 'overdue': return 'Gecikib';
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
      default: return <Clock size={16} color={t.textSecondary} />;
    }
  };

  const renderLogin = () => (
    <View style={[styles.loginWrap, isMobile && { paddingTop: 0 }]}>
      {/* Apple Wallet style card */}
      <View style={styles.walletCard}>
        <View style={styles.walletTop}>
          <Text style={styles.walletBrand}>Naxçıvan Avto</Text>
          <CreditCard size={24} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={styles.walletNumber}>
          •••• •••• •••• {finCode.length > 0 ? finCode.slice(-4).padStart(4, '•') : '••••'}
        </Text>
        <View style={styles.walletBottom}>
          <View>
            <Text style={styles.walletCaption}>Kredit hesabı</Text>
            <Text style={styles.walletValue}>Ödəniş cədvəli və qalıq</Text>
          </View>
          <View style={styles.walletChip} />
        </View>
      </View>

      <Text style={[styles.loginTitle, { color: t.text }]}>Kredit hesabım</Text>
      <Text style={[styles.loginSubtitle, { color: t.textSecondary }]}>
        FİN kodunuz və doğum tarixinizlə daxil olub kreditlərinizi, ödəniş cədvəlinizi izləyin.
      </Text>

      <View style={[styles.loginGroup, { backgroundColor: t.surface, borderColor: t.hairline, boxShadow: t.shadow } as any]}>
        <View style={styles.loginRow}>
          <Text style={[styles.loginRowLabel, { color: t.text }]}>FİN kod</Text>
          <TextInput
            style={[styles.loginRowInput, { color: t.text }]}
            value={finCode}
            onChangeText={handleFinInput}
            placeholder="7ABC123"
            placeholderTextColor={t.placeholder}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            accessibilityLabel="FİN kod"
          />
          <Text style={[styles.loginCounter, { color: finCode.length === 7 ? t.success : t.textTertiary }]}>{finCode.length}/7</Text>
        </View>
        <View style={[styles.loginSeparator, { backgroundColor: t.hairline }]} />
        <View style={styles.loginRow}>
          <Text style={[styles.loginRowLabel, { color: t.text }]}>Doğum tarixi</Text>
          <TextInput
            style={[styles.loginRowInput, { color: t.text }]}
            value={birthDate}
            onChangeText={handleBirthInput}
            placeholder="GG.AA.İİİİ"
            placeholderTextColor={t.placeholder}
            keyboardType="number-pad"
            maxLength={10}
            onSubmitEditing={handleLogin}
            accessibilityLabel="Doğum tarixi"
          />
        </View>
      </View>

      <Button title="Daxil ol" size="lg" fullWidth loading={loginLoading} onPress={handleLogin} style={{ marginTop: 20 }} />

      <View style={styles.loginNote}>
        <Shield size={13} color={t.textSecondary} />
        <Text style={[styles.loginNoteText, { color: t.textSecondary }]}>
          Məlumatlarınız yalnız kreditinizi tapmaq üçün istifadə olunur
        </Text>
      </View>
    </View>
  );

  const renderSchedule = (loanSchedule: any[]) => (
    <View>
      {!isMobile && (
        <View style={[styles.tableHead, { borderBottomColor: t.hairline }]}>
          <Text style={[styles.th, { flex: 0.7, color: t.textSecondary }]}>Hissə</Text>
          <Text style={[styles.th, { flex: 1.5, color: t.textSecondary }]}>Tarix</Text>
          <Text style={[styles.th, { flex: 1.5, color: t.textSecondary }]}>Məbləğ</Text>
          <Text style={[styles.th, { flex: 1.5, color: t.textSecondary }]}>Status</Text>
          <Text style={[styles.th, { flex: 1, color: t.textSecondary, textAlign: 'right' }]}>Gecikmə</Text>
        </View>
      )}
      {loanSchedule.map((item: any, i: number) => {
        const late = daysLate(item);
        const color = getStatusColor(item.status);
        return isMobile ? (
          <View key={item.id} style={[styles.scheduleRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
            {getStatusIcon(item.status)}
            <View style={{ flex: 1 }}>
              <Text style={[styles.td, { color: t.text, fontFamily: FONT.semibold }]}>Hissə {item.installment_number}</Text>
              <Text style={[styles.tdSmall, { color: t.textSecondary }]}>
                {formatDate(item.due_date)}{late > 0 && <Text style={{ color: t.accent }}> · {late} gün gecikir</Text>}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.td, { color: t.text, fontFamily: FONT.bold }]}>{formatMoney(item.amount)}</Text>
              <Text style={[styles.tdSmall, { color }]}>{getStatusText(item.status)}</Text>
            </View>
          </View>
        ) : (
          <View key={item.id} style={[styles.tableRow, { borderBottomColor: t.hairline }, item.status === 'overdue' && { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.td, { flex: 0.7, color: t.textSecondary }]}>{item.installment_number}</Text>
            <Text style={[styles.td, { flex: 1.5, color: t.text }]}>{formatDate(item.due_date)}</Text>
            <Text style={[styles.td, { flex: 1.5, color: t.text, fontFamily: FONT.bold }]}>{formatMoney(item.amount)}</Text>
            <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {getStatusIcon(item.status)}
              <Text style={[styles.td, { color }]}>{getStatusText(item.status)}</Text>
            </View>
            <Text style={[styles.td, { flex: 1, textAlign: 'right', color: late > 0 ? t.accent : t.textTertiary }]}>{late > 0 ? `${late} gün` : '—'}</Text>
          </View>
        );
      })}
    </View>
  );

  const renderLoan = (loan: any) => {
    const loanSchedule = schedules[loan.id] || [];
    const f = loanFigures(loanSchedule);
    const expanded = isLargeScreen || expandedLoan === loan.id;
    const overdueNext = f.nextPayment?.status === 'overdue';

    return (
      <Card key={loan.id} padding={0} style={{ overflow: 'hidden', marginBottom: 20 }}>
        <View style={[styles.loanHead, isMobile && { padding: 18 }]}>
          <View style={[styles.carIcon, { backgroundColor: t.fill }]}>
            <Car size={22} color={t.text} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.carName, { color: t.text }]} numberOfLines={1}>{loan.car_brand} {loan.car_model}</Text>
            <Text style={[styles.carMeta, { color: t.textSecondary }]}>
              {[loan.car_year, loan.car_plate].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Badge
            label={getStatusText(loan.status)}
            tone={loan.status === 'active' ? 'blue' : loan.status === 'completed' ? 'success' : loan.status === 'overdue' ? 'accent' : 'neutral'}
          />
        </View>

        <View style={[styles.figures, { borderColor: t.hairline }, isMobile && { flexWrap: 'wrap' }]}>
          {[
            { label: 'Ödənilib', value: money2(f.totalPaid), color: t.success },
            { label: 'Qalan borc', value: money2(f.totalRemaining), color: t.text },
            { label: 'Aylıq ödəniş', value: formatMoney(loan.monthly_payment), color: t.text },
            { label: 'Faiz', value: `${loan.interest_rate}%`, color: t.text },
          ].map((fig, i) => (
            <View key={fig.label} style={[styles.figure, isMobile && { minWidth: '50%' as any }, i > 0 && !isMobile && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.hairline }]}>
              <Text style={[styles.figureLabel, { color: t.textSecondary }]}>{fig.label}</Text>
              <Text style={[styles.figureValue, { color: fig.color }]} numberOfLines={1}>{fig.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.progressWrap, isMobile && { paddingHorizontal: 18 }]}>
          <View style={styles.progressHead}>
            <Text style={[styles.progressText, { color: t.textSecondary }]}>{f.paidCount} / {loanSchedule.length} hissə ödənilib</Text>
            <Text style={[styles.progressText, { color: t.text, fontFamily: FONT.bold }]}>{Math.round(f.progress)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: t.fill }]}>
            <View style={[styles.progressFill, { width: `${f.progress}%` as any, backgroundColor: t.success }]} />
          </View>
        </View>

        {f.nextPayment && loan.status === 'active' && (
          <View style={[styles.notice, { backgroundColor: overdueNext ? t.accentSoft : t.fill }, isMobile && { marginHorizontal: 18 }]}>
            {overdueNext ? <AlertTriangle size={18} color={t.accent} /> : <Calendar size={18} color={t.text} />}
            <Text style={[styles.noticeText, { color: t.text }]}>
              <Text style={{ fontFamily: FONT.bold, color: overdueNext ? t.accent : t.text }}>
                {overdueNext ? 'Gecikmiş ödəniş: ' : 'Növbəti ödəniş: '}
              </Text>
              {formatMoney(f.nextPayment.amount)} — {formatDate(f.nextPayment.due_date)} tarixinədək
              {f.overdueCount > 1 ? ` · cəmi ${f.overdueCount} gecikmə` : ''}
            </Text>
          </View>
        )}

        {!isLargeScreen && (
          <TouchableOpacity
            onPress={() => setExpandedLoan(expanded ? null : loan.id)}
            style={[styles.toggle, { borderTopColor: t.hairline }]}
          >
            <Text style={[styles.toggleText, { color: t.accent }]}>{expanded ? 'Ödəniş planını gizlət' : 'Ödəniş planını göstər'}</Text>
          </TouchableOpacity>
        )}

        {expanded && (
          <View style={[styles.scheduleWrap, { borderTopColor: t.hairline }, isMobile && { paddingHorizontal: 18 }]}>
            {isLargeScreen && <GroupCaption style={{ marginLeft: 0, marginTop: 4 }}>Ödəniş planı</GroupCaption>}
            {renderSchedule(loanSchedule)}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <WebHeader />
      <WebScreen footer={<WebFooter />} maxWidth={isLoggedIn ? 1040 : 520}>
        <SeoHead title="Kredit hesabım" path="/my-loans" />
        {loading ? (
          <Loading />
        ) : !isLoggedIn ? (
          renderLogin()
        ) : (
          <>
            <LargeTitle
              eyebrow="Kredit hesabım"
              title={[customerInfo?.name, customerInfo?.surname].filter(Boolean).join(' ') || 'Kreditlərim'}
              subtitle={[customerInfo?.fin && `FİN ${customerInfo.fin}`, customerInfo?.phone, customerInfo?.uniqueId && `Müştəri #${customerInfo.uniqueId}`].filter(Boolean).join(' · ')}
              right={
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button variant="secondary" size="sm" title="Yenilə" loading={refreshing} onPress={() => { setRefreshing(true); fetchLoans(); }} />
                  <Button variant="destructive" size="sm" title="Çıxış" icon={<LogOut size={14} color={t.accent} />} onPress={handleLogout} />
                </View>
              }
            />
            {loans.length === 0 ? (
              <EmptyState
                icon={<Car size={30} color={t.textSecondary} />}
                title="Kredit tapılmadı"
                subtitle="Adınıza aktiv kredit tapılmadı. Sualınız varsa, əlaqə bölməsindən bizə yazın."
                action={<Button variant="secondary" title="Əlaqə" onPress={() => router.push('/contact' as any)} />}
              />
            ) : (
              loans.map(renderLoan)
            )}
          </>
        )}
      </WebScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  loginWrap: { alignItems: 'center', paddingTop: 16 },
  walletCard: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: 1.586,
    borderRadius: 20,
    padding: 22,
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    marginBottom: 32,
    boxShadow: '0px 20px 40px rgba(0,0,0,0.25)' as any,
  },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletBrand: { color: '#FFF', fontSize: 18, fontFamily: FONT.heavy, letterSpacing: 0.2 },
  walletNumber: { color: 'rgba(255,255,255,0.92)', fontSize: 20, fontFamily: FONT.semibold, letterSpacing: 2 },
  walletBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  walletCaption: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.6 },
  walletValue: { color: '#FFF', fontSize: 14, fontFamily: FONT.semibold, marginTop: 2 },
  walletChip: { width: 38, height: 28, borderRadius: 6, backgroundColor: '#FF3B30' },
  loginTitle: { fontSize: 32, fontFamily: FONT.heavy, letterSpacing: -0.8, textAlign: 'center' },
  loginSubtitle: { fontSize: 15, lineHeight: 22, fontFamily: FONT.regular, textAlign: 'center', marginTop: 8, maxWidth: 400 },
  loginGroup: { width: '100%', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginTop: 24 },
  loginRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 },
  loginRowLabel: { width: 120, flexShrink: 0, fontSize: 15, fontFamily: FONT.semibold },
  loginRowInput: { flex: 1, height: '100%', fontSize: 16, fontFamily: FONT.medium, padding: 0, outlineStyle: 'none' } as any,
  loginCounter: { fontSize: 12, fontFamily: FONT.semibold, marginLeft: 8 },
  loginSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  loginNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  loginNoteText: { fontSize: 12, fontFamily: FONT.medium, flexShrink: 1 },

  loanHead: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 24 },
  carIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  carName: { fontSize: 20, fontFamily: FONT.bold, letterSpacing: -0.3 },
  carMeta: { fontSize: 14, fontFamily: FONT.regular, marginTop: 2 },
  figures: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  figure: { flex: 1, paddingVertical: 16, paddingHorizontal: 20 },
  figureLabel: { fontSize: 12, fontFamily: FONT.medium, marginBottom: 4 },
  figureValue: { fontSize: 20, fontFamily: FONT.heavy, letterSpacing: -0.4 },
  progressWrap: { paddingHorizontal: 24, paddingTop: 18 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 13, fontFamily: FONT.medium },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 24, marginTop: 18, padding: 14, borderRadius: 12 },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: FONT.regular },
  toggle: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 18, paddingVertical: 14, alignItems: 'center', cursor: 'pointer' as any },
  toggleText: { fontSize: 15, fontFamily: FONT.semibold },
  scheduleWrap: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth },
  tableHead: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { fontSize: 12, fontFamily: FONT.semibold },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  td: { fontSize: 14, fontFamily: FONT.medium },
  tdSmall: { fontSize: 12, fontFamily: FONT.medium, marginTop: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
