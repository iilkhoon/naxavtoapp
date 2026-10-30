import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, CreditCard, RefreshCw, CheckCircle, Shield, AlertTriangle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Segmented, Stat, Button, Badge, Card, EmptyState, Loading, GroupCaption, useWebTokens, useBreakpoints, FONT, formatMoney,
} from '../../components/web/WebKit';
import { AdminPage, Toolbar, SearchField, DataTable, CellText } from '../../components/web/AdminKit';
import { isAutoRisky, isManualRisky, setCustomerRisky } from '../../utils/loanRisk';

type LoanAccount = {
  id: string;
  customer_name: string;
  customer_surname: string;
  customer_fin: string;
  customer_phone: string;
  customer_unique_id: string;
  customer_birth_date: string;
  car_brand: string;
  car_model: string;
  car_year: number;
  car_plate: string;
  sale_type: string;
  total_price: number;
  down_payment: number;
  loan_amount: number;
  interest_rate: number;
  duration_months: number;
  monthly_payment: number;
  status: string;
  profit: number;
  notes: string;
  created_at: string;
};

type Tab = 'dashboard' | 'loans' | 'customers' | 'overdue' | 'reports';

const STATUS: Record<string, { label: string; tone: 'blue' | 'success' | 'accent' | 'neutral' }> = {
  active: { label: 'Aktiv', tone: 'blue' },
  completed: { label: 'Bağlanıb', tone: 'success' },
  defaulted: { label: 'Defolt', tone: 'accent' },
  cancelled: { label: 'Ləğv', tone: 'neutral' },
};
const statusBadge = (s: string) => <Badge label={STATUS[s]?.label || s} tone={STATUS[s]?.tone || 'neutral'} />;

const matches = (l: LoanAccount, q: string) =>
  [l.customer_name, l.customer_surname, l.customer_phone, l.car_brand, l.car_model, l.customer_fin, l.car_plate, l.customer_unique_id]
    .some((v) => v && String(v).toLowerCase().includes(q));

export default function AdminLoansWeb() {
  const router = useRouter();
  const t = useWebTokens();
  const { isTablet } = useBreakpoints();
  const { showToast } = useToast();
  const { hasModule, loading: authLoading } = useAuth();
  const isSuperAdmin = hasModule('finance');

  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [stats, setStats] = useState({ totalSold: 0, activeLoans: 0, overdueTotal: 0, thisMonthPayments: 0, expectedPayments: 0, completedLoans: 0 });
  const [overdueItems, setOverdueItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [riskBusy, setRiskBusy] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      await supabase.rpc('update_overdue_payments');
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const head = { count: 'exact' as const, head: true };

      const [loansRes, totalSold, activeLoans, completedLoans, overdueSchedule, thisMonthPaid, expectedData, overdueList] = await Promise.all([
        supabase.from('loan_accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('loan_accounts').select('id', head),
        supabase.from('loan_accounts').select('id', head).eq('status', 'active'),
        supabase.from('loan_accounts').select('id', head).eq('status', 'completed'),
        supabase.from('loan_schedule').select('amount').eq('status', 'overdue'),
        supabase.from('loan_payments').select('amount').eq('status', 'paid').gte('payment_date', monthStart).lte('payment_date', monthEnd),
        supabase.from('loan_schedule').select('amount').eq('status', 'pending').gte('due_date', monthStart).lte('due_date', monthEnd),
        supabase.from('loan_schedule').select('*, loan_accounts(*)').eq('status', 'overdue').order('due_date'),
      ]);
      if (loansRes.error) throw loansRes.error;

      const sum = (rows: any[] | null) => (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      setLoans(loansRes.data || []);
      setStats({
        totalSold: totalSold.count || 0,
        activeLoans: activeLoans.count || 0,
        completedLoans: completedLoans.count || 0,
        overdueTotal: sum(overdueSchedule.data),
        thisMonthPayments: sum(thisMonthPaid.data),
        expectedPayments: sum(expectedData.data),
      });
      setOverdueItems(overdueList.data || []);
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (!authLoading && !isSuperAdmin) {
    return (
      <AdminPage title="Kredit paneli">
        <Card><EmptyState icon={<Shield size={28} color={t.textSecondary} />} title="Giriş yoxdur" subtitle="Kredit panelinə icazəniz yoxdur." /></Card>
      </AdminPage>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredLoans = q ? loans.filter((l) => matches(l, q)) : loans;
  const openLoan = (loan: LoanAccount) => router.push(`/admin/loan-detail?id=${loan.id}` as any);

  const overdueByLoan = overdueItems.reduce((map: Record<string, any[]>, s: any) => {
    (map[s.loan_id] = map[s.loan_id] || []).push(s);
    return map;
  }, {});

  const toggleRisk = async (key: string, list: LoanAccount[], manual: boolean) => {
    setRiskBusy(key);
    try {
      await setCustomerRisky(list, !manual);
      showToast(manual ? 'Risk işarəsi götürüldü' : 'Müştəri riskli kimi işarələndi', 'success');
      await fetchData();
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setRiskBusy(null);
    }
  };

  // Customers grouped by FIN (or name when FIN is missing)
  const customers = Array.from(
    loans.reduce((map, loan) => {
      const key = loan.customer_fin || `${loan.customer_name}_${loan.customer_surname}`;
      map.set(key, [...(map.get(key) || []), loan]);
      return map;
    }, new Map<string, LoanAccount[]>())
  ).filter(([, list]) => !q || matches(list[0], q));

  const loanColumns = [
    { key: 'client', title: 'Müştəri', flex: 2, render: (l: LoanAccount) => <CellText title={`${l.customer_name} ${l.customer_surname}`} subtitle={l.customer_phone} /> },
    { key: 'car', title: 'Avtomobil', flex: 2, hideOnMobile: true, render: (l: LoanAccount) => <CellText title={`${l.car_brand} ${l.car_model}`} subtitle={[l.car_year, l.car_plate].filter(Boolean).join(' · ')} /> },
    { key: 'amount', title: 'Kredit', flex: 1.2, align: 'right' as const, hideOnMobile: true, render: (l: LoanAccount) => <CellText title={formatMoney(l.loan_amount)} subtitle={l.interest_rate > 0 ? `${l.interest_rate}% · ${l.duration_months} ay` : `${l.duration_months} ay`} /> },
    { key: 'monthly', title: 'Aylıq', flex: 1, align: 'right' as const, render: (l: LoanAccount) => <CellText title={formatMoney(l.monthly_payment)} strong /> },
    { key: 'status', title: 'Status', flex: 1, align: 'right' as const, render: (l: LoanAccount) => statusBadge(l.status) },
  ];

  const totalSaleValue = loans.reduce((s, l) => s + Number(l.total_price || 0), 0);
  const totalDownPayment = loans.reduce((s, l) => s + Number(l.down_payment || 0), 0);
  const totalLoanAmount = loans.reduce((s, l) => s + Number(l.loan_amount || 0), 0);

  const reportCard = (title: string, rows: { l: string; v: string; c?: string }[]) => (
    <View style={{ flex: 1, minWidth: 280 }}>
      <GroupCaption>{title}</GroupCaption>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <View key={r.l} style={[styles.reportRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline }]}>
            <Text style={[styles.reportLabel, { color: t.textSecondary }]}>{r.l}</Text>
            <Text style={[styles.reportValue, { color: r.c || t.text }]}>{r.v}</Text>
          </View>
        ))}
      </Card>
    </View>
  );

  return (
    <AdminPage
      title="Kredit paneli"
      subtitle="Kreditlə və nağd satışların idarəsi"
      actions={
        <>
          <Button variant="secondary" size="sm" title="Yenilə" icon={<RefreshCw size={14} color={t.text} />} onPress={fetchData} />
          <Button size="sm" title="Yeni satış" icon={<Plus size={15} color="#FFF" />} onPress={() => router.push('/admin/loan-create' as any)} />
        </>
      }
    >
      <Toolbar>
        <Segmented<Tab>
          options={[
            { value: 'dashboard', label: 'İcmal' },
            { value: 'loans', label: 'Kreditlər', count: loans.length },
            { value: 'customers', label: 'Müştərilər' },
            { value: 'overdue', label: 'Gecikmələr', count: overdueItems.length },
            { value: 'reports', label: 'Hesabat' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
        {(activeTab === 'loans' || activeTab === 'customers') && (
          <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Ad, telefon, FİN, marka və ya nömrə" />
        )}
      </Toolbar>

      {loading ? <Loading /> : (
        <>
          {activeTab === 'dashboard' && (
            <>
              <View style={styles.stats}>
                <Stat label="Satılan avtomobil" value={String(stats.totalSold)} />
                <Stat label="Aktiv kredit" value={String(stats.activeLoans)} />
                <Stat label="Bağlanan kredit" value={String(stats.completedLoans)} />
              </View>
              <View style={[styles.stats, { marginTop: 12 }]}>
                <Stat label="Bu ay daxil olub" value={formatMoney(stats.thisMonthPayments)} tone={t.success} />
                <Stat label="Bu ay gözlənilir" value={formatMoney(stats.expectedPayments)} />
                <Stat label="Gecikmiş cəmi" value={formatMoney(stats.overdueTotal)} tone={stats.overdueTotal ? t.accent : undefined} />
              </View>
              <GroupCaption style={{ marginTop: 28 }}>Son kreditlər</GroupCaption>
              <DataTable data={loans.slice(0, 10)} keyExtractor={(l) => l.id} onRowPress={openLoan} columns={loanColumns} emptyTitle="Hələ satış yoxdur" />
            </>
          )}

          {activeTab === 'loans' && (
            <DataTable
              data={filteredLoans}
              keyExtractor={(l) => l.id}
              onRowPress={openLoan}
              emptyIcon={<CreditCard size={28} color={t.textSecondary} />}
              emptyTitle="Kredit tapılmadı"
              columns={[
                ...loanColumns.slice(0, 2),
                { key: 'price', title: 'Qiymət', flex: 1, align: 'right' as const, hideOnMobile: true, render: (l: LoanAccount) => <CellText title={formatMoney(l.total_price)} subtitle={`İlkin ${formatMoney(l.down_payment)}`} /> },
                ...loanColumns.slice(2),
              ]}
            />
          )}

          {activeTab === 'customers' && (
            customers.length === 0 ? <Card><EmptyState title="Müştəri tapılmadı" /></Card> : (
              <View style={{ gap: 16 }}>
                <Text style={[styles.meta, { color: t.textSecondary }]}>{customers.length} müştəri · {loans.length} kredit</Text>
                {customers.map(([key, list]) => {
                  const c = list[0];
                  const active = list.filter((l) => l.status === 'active').length;
                  const profit = list.reduce((s, l) => s + Number(l.profit || 0), 0);
                  const manual = isManualRisky(list);
                  const auto = isAutoRisky(list, overdueByLoan);
                  return (
                    <Card key={key} padding={0} style={{ overflow: 'hidden' }}>
                      <View style={styles.customerHead}>
                        <View style={[styles.avatar, { backgroundColor: t.fill }]}>
                          <Text style={[styles.avatarText, { color: t.text }]}>{(c.customer_name || '?').charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.customerName, { color: t.text }]}>{c.customer_name} {c.customer_surname}{c.customer_unique_id ? <Text style={{ color: t.textSecondary }}>  #{c.customer_unique_id}</Text> : null}</Text>
                          <Text style={[styles.meta, { color: t.textSecondary }]}>
                            {[c.customer_fin && `FİN ${c.customer_fin}`, c.customer_phone, c.customer_birth_date && formatDate(c.customer_birth_date)].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Badge label={active ? `${active} aktiv kredit` : 'Bağlanıb'} tone={active ? 'blue' : 'success'} />
                          {profit > 0 && <Text style={[styles.meta, { color: t.success }]}>+{formatMoney(profit)} mənfəət</Text>}
                        </View>
                      </View>
                      <View style={[styles.riskRow, { borderTopColor: t.hairline }, (manual || auto) && { backgroundColor: t.accentSoft }]}>
                        <AlertTriangle size={15} color={manual || auto ? t.accent : t.textSecondary} />
                        <Text style={[styles.riskText, { color: manual || auto ? t.accent : t.textSecondary }]}>
                          {auto ? '30+ gün gecikmə — riskli' : manual ? 'Riskli kimi işarələnib' : 'Risk yoxdur'}
                        </Text>
                        <Button variant="plain" size="sm" title={manual ? 'İşarəni götür' : 'Riskli et'} loading={riskBusy === key} onPress={() => toggleRisk(key, list, manual)} />
                      </View>
                      {list.map((loan) => (
                        <TouchableOpacity key={loan.id} onPress={() => openLoan(loan)} style={[styles.customerLoan, { borderTopColor: t.hairline }]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <CellText title={`${loan.car_brand} ${loan.car_model}${loan.car_year ? `, ${loan.car_year}` : ''}`} subtitle={`Kredit ${formatMoney(loan.loan_amount)} · aylıq ${formatMoney(loan.monthly_payment)}`} />
                          </View>
                          {statusBadge(loan.status)}
                          <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </Card>
                  );
                })}
              </View>
            )
          )}

          {activeTab === 'overdue' && (
            <DataTable
              data={overdueItems}
              keyExtractor={(i) => i.id}
              onRowPress={(i) => i.loan_accounts && openLoan(i.loan_accounts)}
              emptyIcon={<CheckCircle size={28} color={t.success} />}
              emptyTitle="Gecikmiş ödəniş yoxdur"
              columns={[
                { key: 'client', title: 'Müştəri', flex: 2, render: (i) => <CellText title={`${i.loan_accounts?.customer_name || ''} ${i.loan_accounts?.customer_surname || ''}`} subtitle={i.loan_accounts?.customer_phone} /> },
                { key: 'car', title: 'Avtomobil', flex: 2, hideOnMobile: true, render: (i) => <CellText title={`${i.loan_accounts?.car_brand || ''} ${i.loan_accounts?.car_model || ''}`} /> },
                { key: 'n', title: 'Hissə', flex: 0.6, hideOnMobile: true, render: (i) => <CellText title={`${i.installment_number}`} /> },
                { key: 'amount', title: 'Məbləğ', flex: 1, align: 'right', render: (i) => <CellText title={formatMoney(i.amount)} strong /> },
                { key: 'due', title: 'Tarix', flex: 1, align: 'right', hideOnMobile: true, render: (i) => <CellText title={formatDate(i.due_date)} /> },
                { key: 'late', title: 'Gecikmə', flex: 1, align: 'right', render: (i) => <Badge label={`${Math.max(0, Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000))} gün`} tone="accent" /> },
              ]}
            />
          )}

          {activeTab === 'reports' && (
            <View style={[styles.reports, isTablet && { flexDirection: 'column' }]}>
              {reportCard('Maliyyə', [
                { l: 'Ümumi satış dəyəri', v: formatMoney(totalSaleValue) },
                { l: 'İlkin ödənişlər', v: formatMoney(totalDownPayment) },
                { l: 'Kredit məbləği', v: formatMoney(totalLoanAmount) },
                { l: 'Bu ay daxil olub', v: formatMoney(stats.thisMonthPayments), c: t.success },
                { l: 'Gecikmiş cəmi', v: formatMoney(stats.overdueTotal), c: stats.overdueTotal ? t.accent : undefined },
              ])}
              {reportCard('Satışlar', [
                { l: 'Nağd satış', v: String(loans.filter((l) => l.sale_type === 'cash').length) },
                { l: 'Kreditlə satış', v: String(loans.filter((l) => l.sale_type === 'credit').length) },
                { l: 'Aktiv kredit', v: String(stats.activeLoans) },
                { l: 'Bağlanmış kredit', v: String(stats.completedLoans) },
              ])}
            </View>
          )}
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  meta: { fontSize: 13, fontFamily: FONT.regular, marginTop: 2 },
  customerHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontFamily: FONT.bold },
  customerName: { fontSize: 16, fontFamily: FONT.semibold },
  customerLoan: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, cursor: 'pointer' as any },
  chevron: { fontSize: 20, fontFamily: FONT.medium },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 8, minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth },
  riskText: { flex: 1, fontSize: 13, fontFamily: FONT.semibold },
  reports: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, minHeight: 48 },
  reportLabel: { fontSize: 14, fontFamily: FONT.regular },
  reportValue: { fontSize: 15, fontFamily: FONT.semibold },
});
