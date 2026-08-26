import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, TextInput, Modal, RefreshControl, Alert,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import {
  ArrowLeft, Car, Phone, CreditCard, Calendar, User, CheckCircle,
  Clock, AlertTriangle, Plus, DollarSign, Hash, FileText,
  ChevronDown, ChevronUp, Edit3, Trash2
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoanDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loan, setLoan] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSchedule, setShowSchedule] = useState(true);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'schedule' | 'any_date' | 'out_of_schedule'>('schedule');
  const [customInstallment, setCustomInstallment] = useState<any>(null);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      await supabase.rpc('update_overdue_payments');

      const [
        { data: loanData },
        { data: scheduleData },
        { data: paymentsData }
      ] = await Promise.all([
        supabase.from('loan_accounts').select('*').eq('id', id).single(),
        supabase.from('loan_schedule').select('*').eq('loan_id', id).order('installment_number'),
        supabase.from('loan_payments').select('*').eq('loan_id', id).order('created_at', { ascending: false }),
      ]);

      setLoan(loanData);
      setSchedule(scheduleData || []);
      setPayments(paymentsData || []);
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (id) fetchData();
  }, [id]));

  const totalPaid = schedule.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
  const totalRemaining = loan ? Number(loan.loan_amount) * (1 + Number(loan.interest_rate) / 100) - totalPaid : 0;
  const paidCount = schedule.filter((s: any) => s.status === 'paid').length;
  const overdueCount = schedule.filter((s: any) => s.status === 'overdue').length;
  const nextPayment = schedule.find((s: any) => s.status === 'pending' || s.status === 'overdue');

  // Out of schedule live calculation helper
  const getOutofSchedulePreview = () => {
    const unpaid = schedule.filter((s: any) => s.status !== 'paid');
    const N = unpaid.length;
    const P_remaining = unpaid.reduce((sum: number, s: any) => sum + Number(s.principal || 0), 0);
    const O = Number(payAmount) || 0;
    const P_new = Math.max(0, P_remaining - O);
    const NewInterest = P_new * (Number(loan.interest_rate) / 100) * (N / 12);
    const NewMonthlyPayment = N > 0 ? Math.round(((P_new + NewInterest) / N) * 100) / 100 : 0;
    
    return {
      N,
      P_remaining,
      P_new,
      NewInterest,
      NewMonthlyPayment
    };
  };

  const handlePayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      showToast('Məbləğ daxil edin', 'error');
      return;
    }

    setSaving(true);
    try {
      if (paymentType === 'out_of_schedule') {
        const unpaid = schedule.filter((s: any) => s.status !== 'paid');
        const N = unpaid.length;
        if (N === 0) {
          showToast('Hesablanacaq ödənilməmiş hissə tapılmadı', 'error');
          setSaving(false);
          return;
        }

        const P_remaining = unpaid.reduce((sum: number, s: any) => sum + Number(s.principal || 0), 0);
        const O = Number(payAmount);

        if (O > P_remaining) {
          showToast(`Ödənilən məbləğ qalan əsas borcdan (${P_remaining} ₼) çox ola bilməz.`, 'error');
          setSaving(false);
          return;
        }

        const P_new = Math.max(0, P_remaining - O);
        const NewInterest = P_new * (Number(loan.interest_rate) / 100) * (N / 12);
        const NewMonthlyPayment = Math.round(((P_new + NewInterest) / N) * 100) / 100;

        const richNote = `[CƏDVƏLDƏN KƏNAR] Yeni aylıq: ${NewMonthlyPayment} ₼. Qalan əsas borc: ${P_new.toFixed(2)} ₼. Yeni faiz: ${NewInterest.toFixed(2)} ₼.${payNote ? ' Qeyd: ' + payNote : ''}`;

        // 1. Create payment record
        const { data: payment, error: payError } = await supabase
          .from('loan_payments')
          .insert({
            loan_id: id,
            amount: O,
            payment_date: new Date().toISOString().split('T')[0],
            status: 'paid',
            payment_method: payMethod,
            note: richNote,
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (payError) throw payError;

        // 2. Update loan account's monthly payment
        const { error: loanUpdateError } = await supabase
          .from('loan_accounts')
          .update({
            monthly_payment: NewMonthlyPayment,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (loanUpdateError) throw loanUpdateError;

        // 3. Update future installments in loan_schedule
        const newPrincipalPerMonth = Math.round((P_new / N) * 100) / 100;
        const newInterestPerMonth = Math.round((NewInterest / N) * 100) / 100;

        for (let s of unpaid) {
          const { error: sError } = await supabase
            .from('loan_schedule')
            .update({
              amount: NewMonthlyPayment,
              principal: newPrincipalPerMonth,
              interest: newInterestPerMonth,
              paid_amount: 0,
              status: 'pending',
              paid_at: null,
            })
            .eq('id', s.id);
          
          if (sError) throw sError;
        }

        if (P_new <= 0) {
          await supabase
            .from('loan_accounts')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', id);
        }

        showToast('Cədvəldən kənar ödəniş uğurla tamamlandı və gələcək faizlər yenidən hesablandı!', 'success');
      } else {
        let targetInstallment = null;
        if (paymentType === 'schedule') {
          targetInstallment = schedule.find((s: any) => s.status !== 'paid');
        } else {
          targetInstallment = customInstallment;
        }

        if (!targetInstallment) {
          showToast('Ödəniş ediləcək ödənilməmiş hissə tapılmadı', 'error');
          setSaving(false);
          return;
        }

        // Create payment record
        const { data: payment, error: payError } = await supabase
          .from('loan_payments')
          .insert({
            loan_id: id,
            amount: Number(payAmount),
            payment_date: new Date().toISOString().split('T')[0],
            due_date: targetInstallment.due_date,
            status: 'paid',
            payment_method: payMethod,
            note: payNote || null,
            paid_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (payError) throw payError;

        const newPaidAmount = Number(targetInstallment.paid_amount || 0) + Number(payAmount);
        const isFullyPaid = newPaidAmount >= Number(targetInstallment.amount);

        await supabase
          .from('loan_schedule')
          .update({
            status: isFullyPaid ? 'paid' : 'partial',
            paid_amount: newPaidAmount,
            paid_at: isFullyPaid ? new Date().toISOString() : null,
            payment_id: payment.id,
          })
          .eq('id', targetInstallment.id);

        const { data: remaining } = await supabase
          .from('loan_schedule')
          .select('id')
          .eq('loan_id', id)
          .in('status', ['pending', 'overdue', 'partial']);

        if (!remaining || remaining.length === 0) {
          await supabase
            .from('loan_accounts')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', id);
        }

        const pushTokenMatch = loan.notes?.match(/\[PUSH_TOKEN:(ExponentPushToken\[.*?\])\]/);
        if (pushTokenMatch && pushTokenMatch[1]) {
          try {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: pushTokenMatch[1],
                sound: 'default',
                title: "✅ Ödənişiniz təsdiqləndi!",
                body: `Sizin ${payAmount} ₼ məbləğində ödənişiniz sistemə daxil edildi. Təşəkkür edirik!`,
              }),
            });
          } catch (pushErr) {
            console.error("Failed to send push:", pushErr);
          }
        }

        showToast(`Ödəniş Hissə #${targetInstallment.installment_number} üçün uğurla qeydə alındı!`, 'success');
      }

      setShowPaymentModal(false);
      setPayAmount('');
      setPayNote('');
      setSelectedInstallment(null);
      setCustomInstallment(null);
      fetchData();
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLoan = () => {
    Alert.alert(
      'Krediti Sil',
      'Bu krediti və ona aid olan bütün ödənişləri, cədvəlləri tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.',
      [
        { text: 'Ləğv Et', style: 'cancel' },
        { 
          text: 'Bəli, Sil', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              // 1. Delete payments
              await supabase.from('loan_payments').delete().eq('loan_id', id);
              // 2. Delete schedule
              await supabase.from('loan_schedule').delete().eq('loan_id', id);
              // 3. Delete account
              const { error } = await supabase.from('loan_accounts').delete().eq('id', id);
              
              if (error) throw error;
              
              showToast('Kredit başarıyla silindi', 'success');
              router.replace('/admin/loans');
            } catch (e: any) {
              showToast('Xəta: ' + e.message, 'error');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={18} color="#34C759" />;
      case 'overdue': return <AlertTriangle size={18} color="#FF3B30" />;
      case 'partial': return <Clock size={18} color="#FF9500" />;
      default: return <Clock size={18} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#34C759';
      case 'overdue': return '#FF3B30';
      case 'partial': return '#FF9500';
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödənilib';
      case 'overdue': return 'Gecikib';
      case 'partial': return 'Qismən';
      default: return 'Gözləyir';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Kredit tapılmadı</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kredit Detalları</Text>
        <TouchableOpacity onPress={handleDeleteLoan} style={styles.deleteBtn}>
          <Trash2 size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >
        {/* Customer & Car Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.infoHeader}>
            <View style={[styles.customerAvatar, { backgroundColor: colors.primary + '18' }]}>
              <User size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customerName, { color: colors.text }]}>
                {loan.customer_surname} {loan.customer_name} {loan.customer_father_name || ''}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {loan.customer_father_name ? `Ata adı: ${loan.customer_father_name}` : 'Müştəri Kartı'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { borderColor: colors.border }]} />

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>FIN Kod:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>{loan.customer_fin || '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Ş.V. Seriya №:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>{loan.customer_id_card || '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Doğum Tarixi:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>
                {loan.customer_birth_date ? formatDate(loan.customer_birth_date) : '—'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Kreditə Başlama:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>
                {loan.created_at ? formatDate(loan.created_at) : '—'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Kreditin Bitmə:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>
                {schedule.length > 0 ? formatDate(schedule[schedule.length - 1].due_date) : '—'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Telefon 1:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>{loan.customer_phone || '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Telefon 2:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>{loan.customer_phone_2 || '—'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Telefon 3:</Text>
              <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>{loan.customer_phone_3 || '—'}</Text>
            </View>
          </View>

          <View style={[styles.divider, { borderColor: colors.border }]} />

          <View style={styles.carInfo}>
            <Car size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.carTitle, { color: colors.text }]}>
                {loan.car_brand} {loan.car_model} ({loan.car_year})
              </Text>
              {loan.car_plate && (
                <Text style={[styles.carPlate, { color: colors.textSecondary }]}>Nömrə: {loan.car_plate}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Finance Overview */}
        <View style={[styles.financeCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.financeTitle, { color: colors.text }]}>💰 Maliyyə Məlumatları</Text>
          
          <View style={styles.financeGrid}>
            <View style={[styles.financeItem, { backgroundColor: isDark ? '#1a2332' : '#EFF6FF' }]}>
              <Text style={[styles.financeItemLabel, { color: colors.textSecondary }]}>Ümumi qiymət</Text>
              <Text style={[styles.financeItemValue, { color: colors.text }]}>{Number(loan.total_price).toLocaleString('az-AZ')} ₼</Text>
            </View>
            <View style={[styles.financeItem, { backgroundColor: isDark ? '#1a2e1a' : '#F0FFF0' }]}>
              <Text style={[styles.financeItemLabel, { color: colors.textSecondary }]}>İlkin ödəniş</Text>
              <Text style={[styles.financeItemValue, { color: '#34C759' }]}>{Number(loan.down_payment).toLocaleString('az-AZ')} ₼</Text>
            </View>
            <View style={[styles.financeItem, { backgroundColor: isDark ? '#2a1a2e' : '#FFF0F5' }]}>
              <Text style={[styles.financeItemLabel, { color: colors.textSecondary }]}>Kredit məbləği</Text>
              <Text style={[styles.financeItemValue, { color: '#AF52DE' }]}>{Number(loan.loan_amount).toLocaleString('az-AZ')} ₼</Text>
            </View>
            <View style={[styles.financeItem, { backgroundColor: isDark ? '#2e2a1a' : '#FFFDF0' }]}>
              <Text style={[styles.financeItemLabel, { color: colors.textSecondary }]}>Faiz dərəcəsi</Text>
              <Text style={[styles.financeItemValue, { color: '#FF9500' }]}>{loan.interest_rate}%</Text>
            </View>
          </View>

          <View style={[styles.divider, { borderColor: colors.border }]} />

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Ödənilən: {paidCount}/{schedule.length} hissə</Text>
              <Text style={[styles.progressValue, { color: '#34C759' }]}>{totalPaid.toLocaleString('az-AZ')} ₼</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${schedule.length > 0 ? (paidCount / schedule.length) * 100 : 0}%`, backgroundColor: '#34C759' }]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Qalan borc:</Text>
              <Text style={[styles.progressValue, { color: '#FF3B30' }]}>{Math.max(0, totalRemaining).toLocaleString('az-AZ', { minimumFractionDigits: 2 })} ₼</Text>
            </View>
          </View>
        </View>

        {/* Next Payment Alert */}
        {nextPayment && loan.status !== 'completed' && (
          <View style={[styles.nextPaymentCard, {
            backgroundColor: nextPayment.status === 'overdue' ? 'rgba(255,59,48,0.08)' : 'rgba(0,122,255,0.08)',
            borderColor: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF',
          }]}>
            <View style={styles.nextPaymentContent}>
              <Calendar size={20} color={nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.nextPaymentTitle, { color: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF' }]}>
                  {nextPayment.status === 'overdue' ? '⚠️ Gecikmiş Ödəniş' : '📅 Növbəti Ödəniş'}
                </Text>
                <Text style={[styles.nextPaymentAmount, { color: colors.text }]}>
                  {Number(nextPayment.amount).toLocaleString('az-AZ')} ₼ – {formatDate(nextPayment.due_date, { showMonthName: true })}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.payNowBtn, { backgroundColor: nextPayment.status === 'overdue' ? '#FF3B30' : '#007AFF' }]}
              onPress={() => {
                setPaymentType('schedule');
                const target = schedule.find((s: any) => s.status !== 'paid') || nextPayment;
                setSelectedInstallment(target);
                if (target) setPayAmount(String(Number(target.amount) - Number(target.paid_amount || 0)));
                setShowPaymentModal(true);
              }}
            >
              <Text style={styles.payNowBtnText}>Ödəniş Et</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Overdue Count */}
        {overdueCount > 0 && (
          <View style={[styles.overdueAlert, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
            <AlertTriangle size={20} color="#FF3B30" />
            <Text style={styles.overdueAlertText}>{overdueCount} ödəniş gecikib!</Text>
          </View>
        )}

        {/* Add Payment Stacked Buttons */}
        {loan.status !== 'completed' && (
          <View style={{ gap: 10, marginTop: 8, marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.addPaymentBtn, { backgroundColor: '#34C759', marginTop: 0 }]}
              onPress={() => {
                setPaymentType('schedule');
                const target = schedule.find((s: any) => s.status !== 'paid') || nextPayment;
                setSelectedInstallment(target);
                if (target) setPayAmount(String(Number(target.amount) - Number(target.paid_amount || 0)));
                setShowPaymentModal(true);
              }}
            >
              <Calendar size={20} color="#FFF" />
              <Text style={styles.addPaymentBtnText}>Cədvəl üzrə ödəniş</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addPaymentBtn, { backgroundColor: '#007AFF', marginTop: 0 }]}
              onPress={() => {
                setPaymentType('any_date');
                const target = schedule.find((s: any) => s.status !== 'paid') || nextPayment;
                setSelectedInstallment(target);
                setCustomInstallment(target);
                if (target) setPayAmount(String(Number(target.amount) - Number(target.paid_amount || 0)));
                setShowPaymentModal(true);
              }}
            >
              <CreditCard size={20} color="#FFF" />
              <Text style={styles.addPaymentBtnText}>İstənilən tarix üçün ödəniş</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addPaymentBtn, { backgroundColor: '#AF52DE', marginTop: 0 }]}
              onPress={() => {
                setPaymentType('out_of_schedule');
                setSelectedInstallment(null);
                setPayAmount('');
                setPayNote('');
                setShowPaymentModal(true);
              }}
            >
              <DollarSign size={20} color="#FFF" />
              <Text style={styles.addPaymentBtnText}>Cədvəldən kənar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Schedule */}
        <TouchableOpacity
          style={[styles.scheduleHeader, { backgroundColor: colors.card }]}
          onPress={() => setShowSchedule(!showSchedule)}
        >
          <Text style={[styles.scheduleTitle, { color: colors.text }]}>📋 Ödəniş Cədvəli</Text>
          {showSchedule ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
        </TouchableOpacity>

        {showSchedule && (
          <View style={{ gap: 8, marginBottom: 20 }}>
            {schedule.map((item: any) => {
              const daysLate = item.status === 'overdue'
                ? Math.floor((Date.now() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.scheduleItem,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    item.status === 'overdue' && { borderColor: '#FF3B30', borderLeftWidth: 4 }
                  ]}
                  onPress={() => {
                    if (item.status !== 'paid') {
                      setPaymentType('any_date');
                      setSelectedInstallment(item);
                      setCustomInstallment(item);
                      setPayAmount(String(Number(item.amount) - Number(item.paid_amount || 0)));
                      setShowPaymentModal(true);
                    }
                  }}
                  disabled={item.status === 'paid'}
                >
                  <View style={styles.scheduleItemLeft}>
                    {getStatusIcon(item.status)}
                    <View>
                      <Text style={[styles.scheduleInstNum, { color: colors.text }]}>Hissə #{item.installment_number}</Text>
                      <Text style={[styles.scheduleDueDate, { color: colors.textSecondary }]}>
                        {formatDate(item.due_date)}
                        {daysLate > 0 && <Text style={{ color: '#FF3B30' }}> • {daysLate} gün gecikib</Text>}
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
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📜 Ödəniş Tarixçəsi</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {payments.map((p: any) => (
                <View key={p.id} style={[styles.paymentHistoryItem, { backgroundColor: colors.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentHistoryAmount, { color: '#34C759' }]}>
                      +{Number(p.amount).toLocaleString('az-AZ')} ₼
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'RethinkSans_400Regular' }}>
                      {formatDate(p.created_at)} • {p.payment_method === 'cash' ? 'Nağd' : p.payment_method === 'card' ? 'Kart' : 'Transfer'}
                    </Text>
                    {p.note && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{p.note}</Text>}
                  </View>
                  <CheckCircle size={18} color="#34C759" />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Dəyişiklik Tarixçəsi Log (Mobile) */}
        {payments.filter((p: any) => p.note && p.note.includes('[CƏDVƏLDƏN KƏNAR]')).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📜 Dəyişiklik Tarixçəsi (Log)</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {payments.filter((p: any) => p.note && p.note.includes('[CƏDVƏLDƏN KƏNAR]')).map((p: any) => {
                const cleanNote = p.note.replace('[CƏDVƏLDƏN KƏNAR] ', '');
                return (
                  <View key={p.id} style={[styles.paymentHistoryItem, { backgroundColor: colors.card, flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                      <Text style={[styles.paymentHistoryAmount, { color: '#AF52DE' }]}>
                        {Number(p.amount).toLocaleString('az-AZ')} ₼
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {formatDate(p.created_at)}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'RethinkSans_400Regular' }}>
                      {cleanNote}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlayInner}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHandle} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {paymentType === 'schedule' ? '💳 Cədvəl üzrə ödəniş' : paymentType === 'any_date' ? '📅 İstənilən tarix üçün ödəniş' : '💸 Cədvəldən kənar ödəniş'}
                </Text>
                
                {paymentType !== 'out_of_schedule' && selectedInstallment && (
                  <View style={[styles.modalInstallmentInfo, { backgroundColor: isDark ? '#1a2332' : '#EFF6FF', marginBottom: 12 }]}>
                    <Text style={{ color: colors.textSecondary, fontFamily: 'RethinkSans_500Medium' }}>
                      Hissə #{selectedInstallment.installment_number} • {formatDate(selectedInstallment.due_date)}
                    </Text>
                    <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 16 }}>
                      {Number(selectedInstallment.amount).toLocaleString('az-AZ')} ₼
                    </Text>
                  </View>
                )}

                {paymentType === 'any_date' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.modalLabel, { color: colors.text, marginBottom: 6 }]}>Hissə Seçin</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      {schedule.filter((s: any) => s.status !== 'paid').map((s: any) => {
                        const isSelected = customInstallment?.id === s.id;
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: isSelected ? '#007AFF' : colors.border,
                              backgroundColor: isSelected ? '#007AFF15' : colors.inputBackground,
                              marginRight: 8
                            }}
                            onPress={() => {
                              setCustomInstallment(s);
                              setSelectedInstallment(s);
                              setPayAmount(String(Number(s.amount) - Number(s.paid_amount || 0)));
                            }}
                          >
                            <Text style={{
                              color: isSelected ? '#007AFF' : colors.text,
                              fontFamily: 'RethinkSans_700Bold',
                              fontSize: 12
                            }}>
                              #{s.installment_number} ({Number(s.amount).toLocaleString('az-AZ')} ₼)
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {paymentType === 'out_of_schedule' && (
                  <View style={{
                    backgroundColor: isDark ? 'rgba(175, 82, 222, 0.08)' : '#F9F5FF',
                    borderColor: '#AF52DE',
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    gap: 8
                  }}>
                    <Text style={{ fontFamily: 'RethinkSans_700Bold', color: '#AF52DE', fontSize: 13, marginBottom: 2 }}>
                      📊 Yenidən Hesablama Ön Baxış
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Qalan Əsas Borc:</Text>
                      <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 12 }}>
                        {getOutofSchedulePreview().P_remaining.toLocaleString('az-AZ')} ₼
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Dəf edilən Məbləğ:</Text>
                      <Text style={{ color: '#FF3B30', fontFamily: 'RethinkSans_700Bold', fontSize: 12 }}>
                        -{Number(payAmount || 0).toLocaleString('az-AZ')} ₼
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Yeni Qalan Əsas Borc:</Text>
                      <Text style={{ color: '#34C759', fontFamily: 'RethinkSans_700Bold', fontSize: 12 }}>
                        {getOutofSchedulePreview().P_new.toLocaleString('az-AZ')} ₼
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Yeni Qalan Faiz:</Text>
                      <Text style={{ color: '#FF9500', fontFamily: 'RethinkSans_700Bold', fontSize: 12 }}>
                        {getOutofSchedulePreview().NewInterest.toLocaleString('az-AZ', { maximumFractionDigits: 2 })} ₼
                      </Text>
                    </View>
                    <View style={{ height: 1, borderColor: colors.border, borderBottomWidth: 1, marginVertical: 2 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontFamily: 'RethinkSans_700Bold', fontSize: 13 }}>Yeni Aylıq Ödəniş:</Text>
                      <Text style={{ color: colors.primary, fontFamily: 'RethinkSans_800ExtraBold', fontSize: 15 }}>
                        {getOutofSchedulePreview().NewMonthlyPayment.toLocaleString('az-AZ')} ₼ / ay
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 }}>
                      * Qalan {getOutofSchedulePreview().N} ödənilməmiş ay üzrə yenidən bölüşdürüləcək.
                    </Text>
                  </View>
                )}

                <Text style={[styles.modalLabel, { color: colors.text }]}>
                  {paymentType === 'out_of_schedule' ? 'Ödənilən Məbləğ (₼) (Əsas borcdan çıxılan)' : 'Məbləğ (₼)'}
                </Text>
                <View style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <DollarSign size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.modalInputText, { color: colors.text }]}
                    value={payAmount}
                    onChangeText={setPayAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    returnKeyType="done"
                  />
                </View>

                <Text style={[styles.modalLabel, { color: colors.text }]}>Ödəniş Üsulu</Text>
                <View style={styles.methodToggle}>
                  {[
                    { key: 'cash', label: 'Nağd', icon: DollarSign },
                    { key: 'card', label: 'Kart', icon: CreditCard },
                    { key: 'transfer', label: 'Transfer', icon: FileText }
                  ].map(m => (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.methodBtn,
                        { backgroundColor: payMethod === m.key ? colors.primary : colors.inputBackground, borderColor: colors.border }
                      ]}
                      onPress={() => setPayMethod(m.key as any)}
                    >
                      <m.icon size={14} color={payMethod === m.key ? '#FFF' : colors.textSecondary} />
                      <Text style={[styles.methodBtnText, { color: payMethod === m.key ? '#FFF' : colors.text }]}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.modalLabel, { color: colors.text }]}>Qeyd (istəyə bağlı)</Text>
                <View style={[styles.modalInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.modalInputText, { color: colors.text }]}
                    value={payNote}
                    onChangeText={setPayNote}
                    placeholder={paymentType === 'out_of_schedule' ? 'Məs. Əsas borcun qismən bağlanması...' : 'Qeyd...'}
                    placeholderTextColor={colors.placeholder}
                    returnKeyType="done"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                    onPress={() => { setShowPaymentModal(false); setSelectedInstallment(null); setCustomInstallment(null); }}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.text }]}>Ləğv Et</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                    onPress={handlePayment}
                    disabled={saving}
                  >
                    <Text style={styles.modalSaveText}>{saving ? 'Saxlanılır...' : 'Ödə'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: Platform.OS === 'android' ? 10 : 0, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 16, marginTop: 8 },
  infoCard: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  customerAvatar: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  customerName: { fontSize: 18, fontFamily: 'RethinkSans_700Bold' },
  customerDetail: { fontSize: 13, fontFamily: 'RethinkSans_500Medium' },
  divider: { borderBottomWidth: 1, marginVertical: 16 },
  carInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  carTitle: { fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },
  carPlate: { fontSize: 13, fontFamily: 'RethinkSans_400Regular', marginTop: 2 },
  financeCard: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  financeTitle: { fontSize: 17, fontFamily: 'RethinkSans_700Bold', marginBottom: 16 },
  financeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  financeItem: { width: '47%' as any, borderRadius: 14, padding: 14 },
  financeItemLabel: { fontSize: 12, fontFamily: 'RethinkSans_500Medium', marginBottom: 4 },
  financeItemValue: { fontSize: 17, fontFamily: 'RethinkSans_800ExtraBold' },
  progressSection: { marginTop: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontFamily: 'RethinkSans_500Medium' },
  progressValue: { fontSize: 14, fontFamily: 'RethinkSans_700Bold' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  nextPaymentCard: {
    borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1,
  },
  nextPaymentContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  nextPaymentTitle: { fontSize: 14, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
  nextPaymentAmount: { fontSize: 16, fontFamily: 'RethinkSans_600SemiBold' },
  payNowBtn: { padding: 12, borderRadius: 12, alignItems: 'center' },
  payNowBtnText: { color: '#FFF', fontFamily: 'RethinkSans_700Bold', fontSize: 15 },
  overdueAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderRadius: 12, marginBottom: 16,
  },
  overdueAlertText: { color: '#FF3B30', fontFamily: 'RethinkSans_700Bold', fontSize: 14 },
  scheduleHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  scheduleTitle: { fontSize: 16, fontFamily: 'RethinkSans_700Bold' },
  scheduleItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  scheduleItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleInstNum: { fontSize: 14, fontFamily: 'RethinkSans_700Bold' },
  scheduleDueDate: { fontSize: 12, fontFamily: 'RethinkSans_400Regular', marginTop: 2 },
  scheduleItemRight: { alignItems: 'flex-end' },
  scheduleAmount: { fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
  scheduleStatus: { fontSize: 11, fontFamily: 'RethinkSans_600SemiBold', marginTop: 2 },
  paymentHistoryItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  paymentHistoryAmount: { fontSize: 16, fontFamily: 'RethinkSans_700Bold', marginBottom: 2 },
  addPaymentBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 18, borderRadius: 16, gap: 10, marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  addPaymentBtnText: { color: '#FFF', fontSize: 17, fontFamily: 'RethinkSans_700Bold' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2,
    alignSelf: 'center', marginBottom: 20, marginTop: -8
  },
  modalTitle: { fontSize: 20, fontFamily: 'RethinkSans_800ExtraBold', marginBottom: 20 },
  modalInstallmentInfo: { padding: 14, borderRadius: 12, marginBottom: 16 },
  modalLabel: { fontSize: 14, fontFamily: 'RethinkSans_600SemiBold', marginBottom: 8 },
  modalInput: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1, gap: 10, marginBottom: 16,
  },
  modalInputText: { flex: 1, fontSize: 16, fontFamily: 'RethinkSans_500Medium' },
  methodToggle: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  methodBtnText: { fontSize: 13, fontFamily: 'RethinkSans_600SemiBold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  modalCancelText: { fontSize: 15, fontFamily: 'RethinkSans_600SemiBold' },
  modalSaveBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center' },
  modalSaveText: { color: '#FFF', fontSize: 15, fontFamily: 'RethinkSans_700Bold' },
});
