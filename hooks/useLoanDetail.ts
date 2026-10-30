import { useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { haptics } from '../utils/haptics';

export type PaymentType = 'schedule' | 'any_date' | 'out_of_schedule';

/**
 * Data and actions of the admin loan detail screen (shared by
 * app/admin/loan-detail.tsx and app/admin/loan-detail.web.tsx).
 * Payments: next instalment, a chosen instalment, or an out-of-schedule
 * principal payment that re-spreads the rest over the remaining months.
 */
export function useLoanDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loan, setLoan] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('schedule');
  const [customInstallment, setCustomInstallment] = useState<any>(null);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [payNote, setPayNote] = useState('');
  // Late fee entered by hand; posted to the cash book as its own row
  const [payPenalty, setPayPenalty] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
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
    }
  }, [id, showToast]);

  useFocusEffect(useCallback(() => {
    if (id) fetchData();
  }, [id, fetchData]));

  const totalPaid = schedule.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
  const totalRemaining = schedule.reduce((sum: number, s: any) => sum + Math.max(0, Number(s.amount) - Number(s.paid_amount || 0)), 0);
  const paidCount = schedule.filter((s: any) => s.status === 'paid').length;
  const overdueCount = schedule.filter((s: any) => s.status === 'overdue').length;
  const nextPayment = schedule.find((s: any) => s.status === 'pending' || s.status === 'overdue');

  // Out of schedule live calculation helper
  const getOutofSchedulePreview = () => {
    const unpaid = schedule.filter((s: any) => s.status !== 'paid');
    const N = unpaid.length;
    // Same as record_loan_payment: partial payments already reduce the principal
    const P_remaining = unpaid.reduce((sum: number, s: any) => sum + Number(s.principal || 0) - Number(s.paid_amount || 0), 0);
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
    const target = paymentType === 'schedule'
      ? schedule.find((s: any) => s.status !== 'paid')
      : paymentType === 'any_date' ? customInstallment : null;
    if (paymentType !== 'out_of_schedule' && !target) {
      showToast('Ödəniş ediləcək ödənilməmiş hissə tapılmadı', 'error');
      return;
    }

    setSaving(true);
    try {
      // Payment, instalment(s), loan status and the cash book in one transaction
      const { error } = await supabase.rpc('record_loan_payment', {
        p_loan_id: id,
        p_amount: Number(payAmount),
        p_mode: paymentType,
        p_schedule_id: paymentType === 'any_date' ? target.id : null,
        p_method: payMethod,
        p_penalty: Number(payPenalty.replace(',', '.')) || 0,
        p_note: payNote || null,
      });
      if (error) throw error;

      if (paymentType === 'out_of_schedule') {
        showToast('Cədvəldən kənar ödəniş uğurla tamamlandı və gələcək faizlər yenidən hesablandı!', 'success');
      } else {
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
        showToast(`Ödəniş Hissə #${target.installment_number} üçün uğurla qeydə alındı!`, 'success');
      }

      haptics.success();
      setShowPaymentModal(false);
      setPayAmount('');
      setPayPenalty('');
      setPayNote('');
      setSelectedInstallment(null);
      setCustomInstallment(null);
      fetchData();
    } catch (e: any) {
      haptics.error();
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLoan = async () => {
    setConfirmDelete(false);
    setSaving(true);
    try {
      // Instalments point at payments, so unlink before deleting; cash book rows stay
      const steps = [
        await supabase.from('loan_schedule').update({ payment_id: null }).eq('loan_id', id),
        await supabase.from('loan_payments').delete().eq('loan_id', id),
        await supabase.from('loan_schedule').delete().eq('loan_id', id),
      ];
      const failed = steps.find((r) => r.error);
      if (failed?.error) throw failed.error;
      const { error } = await supabase.from('loan_accounts').delete().eq('id', id);
      
      if (error) throw error;
      
      showToast('Kredit uğurla silindi', 'success');
      haptics.success();
      router.replace('/admin/loans' as any);
    } catch (e: any) {
      haptics.error();
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    id, loading, loan, schedule, payments, fetchData,
    totalPaid, totalRemaining, paidCount, overdueCount, nextPayment,
    showPaymentModal, setShowPaymentModal, selectedInstallment, setSelectedInstallment,
    paymentType, setPaymentType, customInstallment, setCustomInstallment,
    payAmount, setPayAmount, payMethod, setPayMethod, payNote, setPayNote, payPenalty, setPayPenalty,
    saving, confirmDelete, setConfirmDelete,
    getOutofSchedulePreview, handlePayment, handleDeleteLoan,
  };
}
