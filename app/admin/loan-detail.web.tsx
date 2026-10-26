import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Calendar, AlertTriangle, Trash2, ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Card, Button, Badge, Stat, Segmented, TextField, EmptyState, Loading, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney,
} from '../../components/web/WebKit';
import { AdminPage, DataTable, CellText } from '../../components/web/AdminKit';
import { visibleNotes } from '../../utils/loanRisk';
import { useLoanDetail, PaymentType } from '../../hooks/useLoanDetail';

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
  const router = useRouter();
  const t = useWebTokens();
  const { isMobile, isTablet } = useBreakpoints();
  const {
    loading, loan, schedule, payments, fetchData,
    totalPaid, totalRemaining, paidCount, overdueCount, nextPayment,
    showPaymentModal, setShowPaymentModal, selectedInstallment, setSelectedInstallment,
    paymentType, setPaymentType, customInstallment, setCustomInstallment,
    payAmount, setPayAmount, payMethod, setPayMethod, payNote, setPayNote,
    saving, confirmDelete, setConfirmDelete,
    getOutofSchedulePreview, handlePayment, handleDeleteLoan,
  } = useLoanDetail();

  const back = (
    <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin/loans' as any))} style={styles.back}>
      <ChevronLeft size={18} color={t.accent} />
      <Text style={[styles.backText, { color: t.accent }]}>Kredit paneli</Text>
    </TouchableOpacity>
  );

  if (loading) return <AdminPage title="Kredit"><Loading /></AdminPage>;
  if (!loan) {
    return (
      <AdminPage title="Kredit">
        {back}
        <Card><EmptyState title="Kredit tapılmadı" subtitle="Silinmiş ola bilər." /></Card>
      </AdminPage>
    );
  }

  const unpaid = schedule.filter((s: any) => s.status !== 'paid');
  const remainingOf = (s: any) => Math.max(0, Number(s.amount) - Number(s.paid_amount || 0));
  const lastDue = schedule.length > 0 ? schedule[schedule.length - 1].due_date : null;
  const preview = paymentType === 'out_of_schedule' ? getOutofSchedulePreview() : null;
  const overdueNext = nextPayment?.status === 'overdue';
  const progress = schedule.length > 0 ? (paidCount / schedule.length) * 100 : 0;

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

  const info = (rows: { l: string; v?: string | null; c?: string }[]) => (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <View key={r.l} style={[styles.infoRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
          <Text style={[styles.infoLabel, { color: t.textSecondary }]}>{r.l}</Text>
          <Text selectable style={[styles.infoValue, { color: r.c || t.text }]} numberOfLines={1}>{r.v || '—'}</Text>
        </View>
      ))}
    </Card>
  );

  const recalcLog = payments.filter((p: any) => p.note && p.note.includes('[CƏDVƏLDƏN KƏNAR]'));
  const methodLabel = (m: string) => (m === 'cash' ? 'Nağd' : m === 'card' ? 'Kart' : 'Köçürmə');

  return (
    <AdminPage
      title={`${loan.customer_name} ${loan.customer_surname}`}
      subtitle={`${loan.car_brand} ${loan.car_model}${loan.car_year ? `, ${loan.car_year}` : ''}${loan.customer_unique_id ? ` · Müştəri #${loan.customer_unique_id}` : ''}`}
      maxWidth={1160}
      actions={
        <>
          <Badge label={LOAN_STATUS[loan.status]?.label || loan.status} tone={LOAN_STATUS[loan.status]?.tone || 'neutral'} />
          <Button variant="secondary" size="sm" title="Yenilə" icon={<RefreshCw size={14} color={t.text} />} onPress={fetchData} />
          <Button variant="destructive" size="sm" title="Sil" icon={<Trash2 size={14} color={t.accent} />} onPress={() => setConfirmDelete(true)} />
        </>
      }
    >
      {back}

      <View style={[styles.layout, isTablet && { flexDirection: 'column' }]}>
        {/* Customer & loan facts */}
        <View style={[styles.side, isTablet && { width: '100%' }]}>
          <GroupCaption>Müştəri</GroupCaption>
          {info([
            { l: 'Ad, soyad', v: `${loan.customer_surname} ${loan.customer_name}` },
            { l: 'Ata adı', v: loan.customer_father_name },
            { l: 'FİN kod', v: loan.customer_fin },
            { l: 'Ş.V. seriya', v: loan.customer_id_card },
            { l: 'Doğum tarixi', v: loan.customer_birth_date ? formatDate(loan.customer_birth_date) : null },
            { l: 'Telefon', v: loan.customer_phone },
            ...(loan.customer_phone_2 ? [{ l: 'Telefon 2', v: loan.customer_phone_2 }] : []),
            ...(loan.customer_phone_3 ? [{ l: 'Telefon 3', v: loan.customer_phone_3 }] : []),
          ])}

          <GroupCaption style={{ marginTop: 24 }}>Kredit</GroupCaption>
          {info([
            { l: 'Avtomobil', v: `${loan.car_brand} ${loan.car_model}` },
            { l: 'Nömrə', v: loan.car_plate },
            { l: 'Satış qiyməti', v: formatMoney(loan.total_price) },
            { l: 'İlkin ödəniş', v: formatMoney(loan.down_payment) },
            { l: 'Kredit məbləği', v: formatMoney(loan.loan_amount) },
            { l: 'Faiz', v: `${loan.interest_rate}%` },
            { l: 'Aylıq ödəniş', v: money2(Number(loan.monthly_payment)) },
            { l: 'Başlama', v: loan.created_at ? formatDate(loan.created_at) : null },
            { l: 'Bitmə', v: lastDue ? formatDate(lastDue) : null },
            ...(loan.has_purchase_price ? [{ l: 'Mənfəət', v: formatMoney(loan.profit), c: Number(loan.profit) >= 0 ? t.success : t.accent }] : []),
          ])}
          {!!visibleNotes(loan.notes) && (
            <>
              <GroupCaption style={{ marginTop: 24 }}>Qeyd</GroupCaption>
              <Card><Text style={[styles.noteText, { color: t.text }]}>{visibleNotes(loan.notes)}</Text></Card>
            </>
          )}
        </View>

        {/* Payments */}
        <View style={{ flex: 1, minWidth: 0, gap: 20, width: isTablet ? '100%' : undefined }}>
          <View style={[styles.stats, isMobile && { flexWrap: 'wrap' }]}>
            <Stat label="Ödənilib" value={money2(totalPaid)} tone={t.success} />
            <Stat label="Qalan borc" value={money2(Math.max(0, totalRemaining))} tone={totalRemaining > 0 ? t.text : t.success} />
            <Stat label="Hissələr" value={`${paidCount} / ${schedule.length}`} hint={overdueCount ? `${overdueCount} gecikmiş` : undefined} tone={overdueCount ? t.accent : undefined} />
          </View>

          <View style={[styles.progressTrack, { backgroundColor: t.fill }]}>
            <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: t.success }]} />
          </View>

          {nextPayment && loan.status !== 'completed' && (
            <Card style={[styles.next, { borderColor: overdueNext ? t.accent : t.hairline }]} padding={18}>
              {overdueNext ? <AlertTriangle size={20} color={t.accent} /> : <Calendar size={20} color={t.text} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.nextTitle, { color: overdueNext ? t.accent : t.text }]}>
                  {overdueNext ? 'Gecikmiş ödəniş' : 'Növbəti ödəniş'} · hissə {nextPayment.installment_number}
                </Text>
                <Text style={[styles.nextSub, { color: t.textSecondary }]}>
                  {money2(remainingOf(nextPayment))} — {formatDate(nextPayment.due_date, { showMonthName: true })} tarixinədək
                </Text>
              </View>
              <Button title="Ödəniş qəbul et" onPress={() => openPayment('schedule')} />
            </Card>
          )}

          <View>
            <View style={styles.captionRow}>
              <GroupCaption style={{ marginBottom: 0 }}>Ödəniş planı</GroupCaption>
              {loan.status !== 'completed' && unpaid.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" title="Seçilmiş hissəyə" onPress={() => openPayment('any_date')} />
                  <Button variant="secondary" size="sm" title="Cədvəldən kənar" onPress={() => openPayment('out_of_schedule')} />
                </View>
              )}
            </View>
            <DataTable
              data={schedule}
              keyExtractor={(s) => s.id}
              onRowPress={loan.status !== 'completed' ? (s) => s.status !== 'paid' && openPayment('any_date', s) : undefined}
              emptyTitle="Ödəniş planı yoxdur"
              emptySubtitle={loan.sale_type === 'cash' ? 'Nağd satış üçün cədvəl yaradılmır.' : undefined}
              columns={[
                { key: 'n', title: 'Hissə', width: 56, render: (s) => <CellText title={`${s.installment_number}`} /> },
                { key: 'due', title: 'Tarix', flex: 1.2, render: (s) => <CellText title={formatDate(s.due_date)} /> },
                {
                  key: 'amount', title: 'Məbləğ', flex: 1.4, align: 'right', render: (s) => (
                    <CellText title={money2(Number(s.amount))} subtitle={Number(s.paid_amount) > 0 && s.status !== 'paid' ? `${money2(Number(s.paid_amount))} ödənilib` : undefined} />
                  ),
                },
                { key: 'status', title: 'Status', flex: 1.2, align: 'right', render: (s) => <Badge label={SCHEDULE_STATUS[s.status]?.label || 'Gözləyir'} tone={SCHEDULE_STATUS[s.status]?.tone || 'neutral'} /> },
                {
                  key: 'late', title: 'Gecikmə', flex: 1, align: 'right', hideOnMobile: true, render: (s) => {
                    const late = s.status === 'overdue' ? Math.floor((Date.now() - new Date(s.due_date).getTime()) / 86400000) : 0;
                    return <Text style={[styles.late, { color: late > 0 ? t.accent : t.textTertiary }]}>{late > 0 ? `${late} gün` : '—'}</Text>;
                  },
                },
              ]}
            />
          </View>

          {payments.length > 0 && (
            <View>
              <GroupCaption>Ödəniş tarixçəsi</GroupCaption>
              <DataTable
                data={payments}
                keyExtractor={(p) => p.id}
                columns={[
                  { key: 'amount', title: 'Məbləğ', flex: 1, render: (p) => <Text style={[styles.paid, { color: t.success }]}>+{money2(Number(p.amount))}</Text> },
                  { key: 'date', title: 'Tarix', flex: 1, render: (p) => <CellText title={formatDate(p.paid_at || p.created_at)} /> },
                  { key: 'method', title: 'Üsul', flex: 0.8, hideOnMobile: true, render: (p) => <CellText title={methodLabel(p.payment_method)} /> },
                  { key: 'note', title: 'Qeyd', flex: 2, hideOnMobile: true, render: (p) => <CellText title={(p.note || '—').replace('[CƏDVƏLDƏN KƏNAR] ', 'Yenidən hesablama · ')} /> },
                ]}
              />
            </View>
          )}

          {recalcLog.length > 0 && (
            <View>
              <GroupCaption>Yenidən hesablamalar</GroupCaption>
              <Card padding={0} style={{ overflow: 'hidden' }}>
                {recalcLog.map((p: any, i: number) => (
                  <View key={p.id} style={[styles.logRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
                    <Text style={[styles.logAmount, { color: t.text }]}>{money2(Number(p.amount))} · {formatDate(p.created_at)}</Text>
                    <Text style={[styles.logText, { color: t.textSecondary }]}>{p.note.replace('[CƏDVƏLDƏN KƏNAR] ', '')}</Text>
                  </View>
                ))}
              </Card>
            </View>
          )}
        </View>
      </View>

      {/* Payment sheet */}
      {showPaymentModal && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closePayment} accessibilityLabel="Bağla" />
          <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.hairline }]}>
            <Text style={[styles.sheetTitle, { color: t.text }]}>Ödəniş qəbul et</Text>
            <Segmented<PaymentType>
              options={[
                { value: 'schedule', label: 'Növbəti hissə' },
                { value: 'any_date', label: 'Seçilmiş hissə' },
                { value: 'out_of_schedule', label: 'Cədvəldən kənar' },
              ]}
              value={paymentType}
              onChange={(v) => openPayment(v, v === 'any_date' ? customInstallment || selectedInstallment : undefined)}
              fullWidth
              style={{ marginBottom: 16 }}
            />

            {paymentType === 'schedule' && selectedInstallment && (
              <View style={[styles.box, { backgroundColor: t.fill }]}>
                <Text style={[styles.boxLabel, { color: t.textSecondary }]}>Hissə {selectedInstallment.installment_number} · {formatDate(selectedInstallment.due_date)}</Text>
                <Text style={[styles.boxValue, { color: t.text }]}>{money2(remainingOf(selectedInstallment))}</Text>
              </View>
            )}

            {paymentType === 'any_date' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { color: t.textSecondary }]}>Hissə</Text>
                <ScrollView style={{ maxHeight: 132 }} contentContainerStyle={styles.chips}>
                  {unpaid.map((s: any) => {
                    const active = customInstallment?.id === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => { setCustomInstallment(s); setSelectedInstallment(s); setPayAmount(String(remainingOf(s))); }}
                        style={[styles.chip, active ? { backgroundColor: t.isDark ? '#F5F5F7' : '#1D1D1F' } : { backgroundColor: t.fill }]}
                      >
                        <Text style={[styles.chipText, { color: active ? (t.isDark ? '#000' : '#FFF') : t.text }]}>
                          {s.installment_number} · {formatDate(s.due_date)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {preview && (
              <View style={[styles.box, { backgroundColor: t.fill, gap: 6 }]}>
                {[
                  { l: 'Qalan əsas borc', v: money2(preview.P_remaining) },
                  { l: 'Ödənilən', v: `−${money2(Number(payAmount) || 0)}` },
                  { l: 'Yeni əsas borc', v: money2(preview.P_new) },
                  { l: 'Yeni faiz', v: money2(preview.NewInterest) },
                ].map((r) => (
                  <View key={r.l} style={styles.boxRow}>
                    <Text style={[styles.boxLabel, { color: t.textSecondary }]}>{r.l}</Text>
                    <Text style={[styles.boxLabel, { color: t.text, fontFamily: FONT.semibold }]}>{r.v}</Text>
                  </View>
                ))}
                <View style={[styles.boxRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline, paddingTop: 8, marginTop: 2 }]}>
                  <Text style={[styles.boxLabel, { color: t.text, fontFamily: FONT.semibold }]}>Yeni aylıq ödəniş</Text>
                  <Text style={[styles.boxValue, { color: t.text, fontSize: 17 }]}>{money2(preview.NewMonthlyPayment)}</Text>
                </View>
                <Text style={[styles.hint, { color: t.textTertiary }]}>Qalan {preview.N} ödənilməmiş ay üzrə yenidən bölünəcək.</Text>
              </View>
            )}

            <View style={{ gap: 14 }}>
              <TextField
                label={paymentType === 'out_of_schedule' ? 'Əsas borcdan çıxılan məbləğ (₼)' : 'Məbləğ (₼)'}
                value={payAmount}
                onChangeText={(v) => setPayAmount(v.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
              />
              <View>
                <Text style={[styles.label, { color: t.textSecondary }]}>Ödəniş üsulu</Text>
                <Segmented<'cash' | 'card' | 'transfer'>
                  options={[{ value: 'cash', label: 'Nağd' }, { value: 'card', label: 'Kart' }, { value: 'transfer', label: 'Köçürmə' }]}
                  value={payMethod}
                  onChange={setPayMethod}
                  fullWidth
                />
              </View>
              <TextField label="Qeyd" value={payNote} onChangeText={setPayNote} placeholder="İstəyə bağlı" />
            </View>

            <View style={styles.sheetActions}>
              <Button variant="secondary" title="Ləğv et" onPress={closePayment} style={{ flex: 1 }} />
              <Button title="Ödənişi qeyd et" loading={saving} onPress={handlePayment} style={{ flex: 1.4 }} />
            </View>
          </View>
        </View>
      )}

      <ConfirmModal
        visible={confirmDelete}
        title="Krediti silmək?"
        message="Kredit, ödəniş cədvəli və bütün ödənişlər birdəfəlik silinəcək."
        onConfirm={handleDeleteLoan}
        onCancel={() => setConfirmDelete(false)}
        confirmText="Sil"
        cancelText="Ləğv et"
        isDestructive
      />
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: -12, marginBottom: 20, marginLeft: -4, cursor: 'pointer' as any },
  backText: { fontSize: 15, fontFamily: FONT.medium },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  side: { width: 340 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 44 },
  infoLabel: { fontSize: 14, fontFamily: FONT.regular },
  infoValue: { fontSize: 14, fontFamily: FONT.semibold, flexShrink: 1, textAlign: 'right' },
  noteText: { fontSize: 14, lineHeight: 21, fontFamily: FONT.regular },
  stats: { flexDirection: 'row', gap: 12 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  nextTitle: { fontSize: 15, fontFamily: FONT.semibold },
  nextSub: { fontSize: 14, fontFamily: FONT.regular, marginTop: 2 },
  captionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' },
  late: { fontSize: 13, fontFamily: FONT.semibold },
  paid: { fontSize: 14, fontFamily: FONT.bold },
  logRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  logAmount: { fontSize: 14, fontFamily: FONT.semibold },
  logText: { fontSize: 13, fontFamily: FONT.regular, lineHeight: 19 },
  overlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '92%' as any, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 22, overflow: 'scroll' as any, boxShadow: '0px 24px 64px rgba(0,0,0,0.25)' as any },
  sheetTitle: { fontSize: 20, fontFamily: FONT.bold, marginBottom: 14 },
  box: { borderRadius: 12, padding: 14, marginBottom: 16 },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boxLabel: { fontSize: 13, fontFamily: FONT.regular },
  boxValue: { fontSize: 20, fontFamily: FONT.heavy, marginTop: 2 },
  hint: { fontSize: 12, fontFamily: FONT.regular, marginTop: 4 },
  label: { fontSize: 13, fontFamily: FONT.semibold, marginBottom: 6, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, height: 30, borderRadius: 8, justifyContent: 'center', cursor: 'pointer' as any },
  chipText: { fontSize: 12, fontFamily: FONT.semibold },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
