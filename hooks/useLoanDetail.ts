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

        const { error: scheduleError } = await supabase
          .from('loan_schedule')
          .update({
            status: isFullyPaid ? 'paid' : 'partial',
            paid_amount: newPaidAmount,
            paid_at: isFullyPaid ? new Date().toISOString() : null,
            payment_id: payment.id,
          })
          .eq('id', targetInstallment.id);
        if (scheduleError) throw scheduleError;

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

      haptics.success();
      setShowPaymentModal(false);
      setPayAmount('');
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
      await supabase.from('loan_payments').delete().eq('loan_id', id);
      await supabase.from('loan_schedule').delete().eq('loan_id', id);
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
    payAmount, setPayAmount, payMethod, setPayMethod, payNote, setPayNote,
    saving, confirmDelete, setConfirmDelete,
    getOutofSchedulePreview, handlePayment, handleDeleteLoan,
  };
}
