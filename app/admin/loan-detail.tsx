import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, KeyboardAvoidingView, ScrollView, Linking } from 'react-native';
import { Trash2, AlertTriangle, Calendar, Phone } from 'lucide-react-native';
import { formatDate } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useLoanDetail, PaymentType } from '../../hooks/useLoanDetail';
import { visibleNotes } from '../../utils/loanRisk';
import { haptics } from '../../utils/haptics';
import {
  AdminHeader, AdminScroll, Group, GroupRow, FieldRow, Segmented, StatTile, Pill, AdminButton, HeaderAction, EmptyView, LoadingView,
  useAdminColors, money, daysSince, F,
} from '../../components/admin/AdminUI';

const money2 = (n: number) => `${n.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

const LOAN_STATUS: Record<string, { label: string; tone: 'blue' | 'success' | 'accent' | 'neutral' }> = {
  active: { label: 'Aktiv', tone: 'blue' },
  completed: { label: 'Bağlanıb', tone: 'success' },
  defaulted: { label: 'Defolt', tone: 'accent' },
  cancelled: { label: 'Ləğv', tone: 'neutral' },
};
const SCHEDULE_STATUS: Record<string, { label: string; tone: 'success' | 'accent' | 'warning' | 'neutral' }> = {
  paid: { label: 'Ödənilib', tone: 'success' },
  overdue: { label: 'Gecikib', tone: 'accent' },
  partial: { label: 'Qismən', tone: 'warning' },
  pending: { label: 'Gözləyir', tone: 'neutral' },
};

export default function LoanDetail() {
  const c = useAdminColors();
  const {
    loading, loan, schedule, payments,
    totalPaid, totalRemaining, paidCount, overdueCount, nextPayment,
    showPaymentModal, setShowPaymentModal, selectedInstallment, setSelectedInstallment,
    paymentType, setPaymentType, customInstallment, setCustomInstallment,
    payAmount, setPayAmount, payMethod, setPayMethod, payNote, setPayNote, payPenalty, setPayPenalty,
    saving, confirmDelete, setConfirmDelete,
    getOutofSchedulePreview, handlePayment, handleDeleteLoan,
  } = useLoanDetail();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <AdminHeader title="Kredit" backLabel="Kreditlər" />
        <LoadingView />
      </View>
    );
  }
  if (!loan) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <AdminHeader title="Kredit" backLabel="Kreditlər" />
        <EmptyView title="Kredit tapılmadı" />
      </View>
    );
  }

  const unpaid = schedule.filter((s: any) => s.status !== 'paid');
  const remainingOf = (s: any) => Math.max(0, Number(s.amount) - Number(s.paid_amount || 0));
  const overdueNext = nextPayment?.status === 'overdue';
  const preview = paymentType === 'out_of_schedule' ? getOutofSchedulePreview() : null;
  const notes = visibleNotes(loan.notes);

  const openPayment = (type: PaymentType, installment?: any) => {
    setPaymentType(type);
    setPayNote('');
    if (type === 'out_of_schedule') {
      setSelectedInstallment(null);
      setCustomInstallment(null);
      setPayAmount('');
    } else {
      const target = installment || unpaid[0] || nextPayment;
      setSelectedInstallment(target);
      setCustomInstallment(type === 'any_date' ? target : null);
      setPayAmount(target ? String(remainingOf(target)) : '');
    }
    setShowPaymentModal(true);
  };

  const closePayment = () => {
    setShowPaymentModal(false);
    setSelectedInstallment(null);
    setCustomInstallment(null);
  };

  const call = (phone?: string) => phone && Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AdminHeader
        title={`${loan.customer_name} ${loan.customer_surname}`}
        subtitle={`${loan.car_brand} ${loan.car_model}${loan.car_year ? `, ${loan.car_year}` : ''}`}
        backLabel="Kreditlər"
        right={<HeaderAction icon={Trash2} label="Krediti sil" tint={c.primary} onPress={() => setConfirmDelete(true)} />}
      />
      <AdminScroll>
        <View style={styles.row}>
          <StatTile label="Ödənilib" value={money(totalPaid)} tone={c.success} />
          <StatTile label="Qalan borc" value={money(totalRemaining)} />
        </View>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <StatTile label="Hissələr" value={`${paidCount}/${schedule.length}`} />
          <StatTile label="Gecikmə" value={overdueCount} tone={overdueCount ? c.primary : undefined} />
        </View>

        {nextPayment && loan.status !== 'completed' && (
          <View style={[styles.next, { backgroundColor: c.card, borderColor: overdueNext ? c.primary : c.hairline }]}>
            <View style={styles.nextHead}>
              {overdueNext ? <AlertTriangle size={18} color={c.primary} /> : <Calendar size={18} color={c.text} />}
              <View style={{ flex: 1 }}>
                <Text style={[styles.nextTitle, { color: overdueNext ? c.primary : c.text }]}>
                  {overdueNext ? 'Gecikmiş ödəniş' : 'Növbəti ödəniş'} · hissə {nextPayment.installment_number}
                </Text>
                <Text style={[styles.nextSub, { color: c.textSecondary }]}>
                  {money2(remainingOf(nextPayment))} — {formatDate(nextPayment.due_date, { showMonthName: true })}
                </Text>
              </View>
            </View>
            <AdminButton title="Ödəniş qəbul et" onPress={() => openPayment('schedule')} />
          </View>
        )}

        <Group title="Müştəri">
          <GroupRow title="FİN kod" value={loan.customer_fin || '—'} />
          {!!loan.customer_father_name && <GroupRow title="Ata adı" value={loan.customer_father_name} />}
          {!!loan.customer_id_card && <GroupRow title="Ş.V. seriya" value={loan.customer_id_card} />}
          {!!loan.customer_birth_date && <GroupRow title="Doğum tarixi" value={formatDate(loan.customer_birth_date)} />}
          {[loan.customer_phone, loan.customer_phone_2, loan.customer_phone_3].filter(Boolean).map((phone: string, i: number) => (
            <GroupRow key={phone} icon={Phone} tint="#34C759" title={phone} subtitle={i === 0 ? 'Əsas nömrə' : `Nömrə ${i + 1}`} onPress={() => call(phone)} />
          ))}
          {!!loan.customer_unique_id && <GroupRow title="Müştəri ID" value={`#${loan.customer_unique_id}`} />}
        </Group>

        <Group title="Kredit">
          <GroupRow title="Status" right={<Pill label={LOAN_STATUS[loan.status]?.label || loan.status} tone={LOAN_STATUS[loan.status]?.tone || 'neutral'} />} />
          {!!loan.car_plate && <GroupRow title="Nömrə" value={loan.car_plate} />}
          <GroupRow title="Satış qiyməti" value={money(loan.total_price)} />
          <GroupRow title="İlkin ödəniş" value={money(loan.down_payment)} />
          <GroupRow title="Kredit məbləği" value={money(loan.loan_amount)} />
          <GroupRow title="Faiz" value={`${loan.interest_rate}%`} />
          <GroupRow title="Aylıq ödəniş" value={money2(Number(loan.monthly_payment))} />
          <GroupRow title="Başlama" value={formatDate(loan.created_at)} />
          {schedule.length > 0 && <GroupRow title="Bitmə" value={formatDate(schedule[schedule.length - 1].due_date)} />}
          {!!loan.has_purchase_price && <GroupRow title="Mənfəət" value={money(loan.profit)} />}
        </Group>

        {!!notes && (
          <Group title="Qeyd">
            <Text style={[styles.notes, { color: c.text }]}>{notes}</Text>
          </Group>
        )}

        {schedule.length > 0 && (
          <Group
            title="Ödəniş planı"
            footer={loan.status !== 'completed' && unpaid.length > 0 ? 'Hissəyə toxunaraq həmin hissə üçün ödəniş qəbul edin.' : undefined}
          >
            {schedule.map((s: any) => {
              const late = s.status === 'overdue' ? daysSince(s.due_date) : 0;
              return (
                <GroupRow
                  key={s.id}
                  title={`${s.installment_number}. ${formatDate(s.due_date)}`}
                  subtitle={`${money2(Number(s.amount))}${Number(s.paid_amount) > 0 && s.status !== 'paid' ? ` · ${money2(Number(s.paid_amount))} ödənilib` : ''}${late > 0 ? ` · ${late} gün gecikir` : ''}`}
                  right={<Pill label={SCHEDULE_STATUS[s.status]?.label || 'Gözləyir'} tone={SCHEDULE_STATUS[s.status]?.tone || 'neutral'} />}
                  chevron={false}
                  onPress={loan.status !== 'completed' && s.status !== 'paid' ? () => openPayment('any_date', s) : undefined}
                />
              );
            })}
          </Group>
        )}

        {loan.status !== 'completed' && unpaid.length > 0 && (
          <AdminButton title="Cədvəldən kənar ödəniş" variant="secondary" onPress={() => openPayment('out_of_schedule')} style={{ marginBottom: 24 }} />
        )}

        {payments.length > 0 && (
          <Group title="Ödəniş tarixçəsi">
            {payments.map((p: any) => (
              <GroupRow
                key={p.id}
                title={p.voided_at ? `${money2(Number(p.amount))} · Ləğv edilib` : `+${money2(Number(p.amount))}`}
                subtitle={[formatDate(p.paid_at || p.created_at), p.payment_method === 'cash' ? 'Nağd' : p.payment_method === 'card' ? 'Kart' : 'Köçürmə', p.note && p.note.replace('[CƏDVƏLDƏN KƏNAR] ', 'Yenidən hesablama · ')].filter(Boolean).join(' · ')}
              />
            ))}
          </Group>
        )}
      </AdminScroll>

      {/* Payment sheet */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={closePayment}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <AdminHeader title="Ödəniş qəbul et" backLabel="Bağla" onBack={closePayment} modal />
          <AdminScroll>
            <Segmented<PaymentType>
              options={[{ value: 'schedule', label: 'Növbəti' }, { value: 'any_date', label: 'Seçilmiş' }, { value: 'out_of_schedule', label: 'Kənar' }]}
              value={paymentType}
              onChange={(v) => openPayment(v, v === 'any_date' ? customInstallment || selectedInstallment : undefined)}
              style={{ marginBottom: 20 }}
            />

            {paymentType === 'schedule' && selectedInstallment && (
              <Group>
                <GroupRow title={`Hissə ${selectedInstallment.installment_number}`} subtitle={formatDate(selectedInstallment.due_date)} value={money2(remainingOf(selectedInstallment))} />
              </Group>
            )}

            {paymentType === 'any_date' && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.caption, { color: c.textSecondary }]}>HİSSƏ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {unpaid.map((s: any) => {
                    const active = customInstallment?.id === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => { haptics.tap(); setCustomInstallment(s); setSelectedInstallment(s); setPayAmount(String(remainingOf(s))); }}
                        style={[styles.chip, { backgroundColor: active ? (c.isDark ? '#F5F5F7' : '#1D1D1F') : c.fill }]}
                      >
                        <Text style={[styles.chipText, { color: active ? (c.isDark ? '#000' : '#FFF') : c.text }]}>{s.installment_number}</Text>
                        <Text style={[styles.chipSub, { color: active ? (c.isDark ? '#3A3A3C' : '#D1D1D6') : c.textSecondary }]}>{formatDate(s.due_date)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {preview && (
              <Group title="Yenidən hesablama" footer={`Qalan ${preview.N} ödənilməmiş ay üzrə yenidən bölünəcək.`}>
                <GroupRow title="Qalan əsas borc" value={money2(preview.P_remaining)} />
                <GroupRow title="Yeni əsas borc" value={money2(preview.P_new)} />
                <GroupRow title="Yeni faiz" value={money2(preview.NewInterest)} />
                <GroupRow title="Yeni aylıq ödəniş" value={money2(preview.NewMonthlyPayment)} />
              </Group>
            )}

            <Group>
              <FieldRow
                label={paymentType === 'out_of_schedule' ? 'Əsas borcdan' : 'Məbləğ'}
                value={payAmount}
                onChangeText={(v) => setPayAmount(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="₼"
              />
              <FieldRow
                label="Cərimə"
                value={payPenalty}
                onChangeText={(v) => setPayPenalty(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="₼ (istəyə bağlı)"
              />
              <FieldRow label="Qeyd" value={payNote} onChangeText={setPayNote} placeholder="İstəyə bağlı" />
            </Group>

            <Text style={[styles.caption, { color: c.textSecondary }]}>ÖDƏNİŞ ÜSULU</Text>
            <Segmented<'cash' | 'card' | 'transfer'>
              options={[{ value: 'cash', label: 'Nağd' }, { value: 'card', label: 'Kart' }, { value: 'transfer', label: 'Köçürmə' }]}
              value={payMethod}
              onChange={setPayMethod}
              style={{ marginBottom: 24 }}
            />

            <AdminButton title="Ödənişi qeyd et" onPress={handlePayment} loading={saving} />
          </AdminScroll>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={confirmDelete}
        title="Krediti silmək?"
        message="Kredit, ödəniş cədvəli və ödənişlər silinəcək. Kassadakı ödəniş yazıları qalır; pul geri qaytarılıbsa onları Finans → Kassa-da ləğv edin."
        onConfirm={handleDeleteLoan}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Sil"
        cancelText="Ləğv et"
        isDestructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  next: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12, marginBottom: 24 },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextTitle: { fontSize: 15, fontFamily: F.semibold },
  nextSub: { fontSize: 13, fontFamily: F.medium, marginTop: 2 },
  notes: { padding: 16, fontSize: 15, lineHeight: 21, fontFamily: F.regular },
  caption: { fontSize: 13, fontFamily: F.semibold, letterSpacing: 0.4, marginBottom: 8, marginLeft: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: 'center', minWidth: 76 },
  chipText: { fontSize: 16, fontFamily: F.bold },
  chipSub: { fontSize: 11, fontFamily: F.medium, marginTop: 1 },
});
