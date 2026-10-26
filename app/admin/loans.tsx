import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { haptics } from '../../utils/haptics';
import { isAutoRisky, isManualRisky, setCustomerRisky } from '../../utils/loanRisk';
import {
  AdminHeader, AdminScroll, Group, GroupRow, Chips, SearchBar, StatTile, Pill, HeaderAction, EmptyView, LoadingView, useAdminColors, money, F,
} from '../../components/admin/AdminUI';

type LoanAccount = {
  id: string;
  customer_name: string;
  customer_surname: string;
  customer_fin: string;
  customer_phone: string;
  customer_unique_id: string;
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
  notes: string;
  profit: number;
  created_at: string;
};

type Tab = 'dashboard' | 'loans' | 'customers' | 'overdue' | 'reports';

const STATUS: Record<string, { label: string; tone: 'blue' | 'success' | 'accent' | 'neutral' }> = {
  active: { label: 'Aktiv', tone: 'blue' },
  completed: { label: 'Bağlanıb', tone: 'success' },
  defaulted: { label: 'Defolt', tone: 'accent' },
  cancelled: { label: 'Ləğv', tone: 'neutral' },
};
const statusPill = (s: string) => <Pill label={STATUS[s]?.label || s} tone={STATUS[s]?.tone || 'neutral'} />;

const matches = (l: LoanAccount, q: string) =>
  [l.customer_name, l.customer_surname, l.customer_phone, l.car_brand, l.car_model, l.customer_fin, l.car_plate, l.customer_unique_id]
    .some((v) => v && String(v).toLowerCase().includes(q));

const daysLate = (due: string) => Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / 86400000));

export default function AdminLoans() {
  const router = useRouter();
  const c = useAdminColors();
  const { showToast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riskBusy, setRiskBusy] = useState<string | null>(null);
  const [loans, setLoans] = useState<LoanAccount[]>([]);
  const [overdueByLoan, setOverdueByLoan] = useState<Record<string, any[]>>({});
  const [overdueItems, setOverdueItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSold: 0, activeLoans: 0, completedLoans: 0, overdueTotal: 0, thisMonthPayments: 0, expectedPayments: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const fetchData = useCallback(async () => {
    try {
      await supabase.rpc('update_overdue_payments');
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const head = { count: 'exact' as const, head: true };

      const [loansRes, totalSold, active, completed, overdueList, monthPaid, expected] = await Promise.all([
        supabase.from('loan_accounts').select('*').order('created_at', { ascending: false }),
        supabase.from('loan_accounts').select('id', head),
        supabase.from('loan_accounts').select('id', head).eq('status', 'active'),
        supabase.from('loan_accounts').select('id', head).eq('status', 'completed'),
        supabase.from('loan_schedule').select('*, loan_accounts(*)').eq('status', 'overdue').order('due_date', { ascending: true }),
        supabase.from('loan_payments').select('amount').eq('status', 'paid').gte('payment_date', monthStart).lte('payment_date', monthEnd),
        supabase.from('loan_schedule').select('amount').eq('status', 'pending').gte('due_date', monthStart).lte('due_date', monthEnd),
      ]);
      if (loansRes.error) throw loansRes.error;

      const overdue = overdueList.data || [];
      const grouped: Record<string, any[]> = {};
      overdue.forEach((s: any) => { (grouped[s.loan_id] = grouped[s.loan_id] || []).push(s); });
      const sum = (rows: any[] | null) => (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);

      setLoans(loansRes.data || []);
      setOverdueByLoan(grouped);
      setOverdueItems(overdue);
      setStats({
        totalSold: totalSold.count || 0,
        activeLoans: active.count || 0,
        completedLoans: completed.count || 0,
        overdueTotal: sum(overdue),
        thisMonthPayments: sum(monthPaid.data),
        expectedPayments: sum(expected.data),
      });
    } catch (e: any) {
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useFocusEffect(useCallback(() => {
    if (!authLoading && isSuperAdmin) fetchData();
  }, [authLoading, isSuperAdmin, fetchData]));

  if (!authLoading && !isSuperAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <AdminHeader title="Kredit paneli" backLabel="Admin" />
        <EmptyView title="Giriş yoxdur" subtitle="Kredit panelinə yalnız superadminlər daxil ola bilər." />
      </View>
    );
  }

  const q = searchQuery.trim().toLowerCase();
  const openLoan = (id: string) => router.push(`/admin/loan-detail?id=${id}` as any);

  const customers = Array.from(
    loans.reduce((map, loan) => {
      const key = loan.customer_fin || `${loan.customer_name}_${loan.customer_surname}`;
      map.set(key, [...(map.get(key) || []), loan]);
      return map;
    }, new Map<string, LoanAccount[]>())
  ).filter(([, list]) => !q || matches(list[0], q));

  const toggleRisk = async (key: string, list: LoanAccount[], manual: boolean) => {
    setRiskBusy(key);
    try {
      await setCustomerRisky(list, !manual);
      haptics.success();
      showToast(manual ? 'Risk işarəsi götürüldü' : 'Müştəri riskli kimi işarələndi', 'success');
      await fetchData();
    } catch (e: any) {
      haptics.error();
      showToast('Xəta: ' + e.message, 'error');
    } finally {
      setRiskBusy(null);
    }
  };

  const loanRow = (l: LoanAccount) => (
    <GroupRow
      key={l.id}
      title={`${l.customer_name} ${l.customer_surname}`}
      subtitle={`${l.car_brand} ${l.car_model} · aylıq ${money(l.monthly_payment)}`}
      right={statusPill(l.status)}
      onPress={() => openLoan(l.id)}
    />
  );

  const caption = (text: string) => <Text style={[styles.caption, { color: c.textSecondary }]}>{text}</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AdminHeader
        title="Kredit paneli"
        subtitle="Kreditlə və nağd satışlar"
        backLabel="Admin"
        right={<HeaderAction icon={Plus} label="Yeni satış" onPress={() => router.push('/admin/loan-create' as any)} />}
      />
      <View style={styles.tabs}>
        <Chips<Tab>
          options={[
            { value: 'dashboard', label: 'İcmal' },
            { value: 'loans', label: `Kreditlər · ${loans.length}` },
            { value: 'customers', label: 'Müştərilər' },
            { value: 'overdue', label: `Gecikmələr · ${overdueItems.length}` },
            { value: 'reports', label: 'Hesabat' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {loading ? <LoadingView /> : (
        <AdminScroll refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} contentStyle={{ paddingTop: 8 }}>
          {(activeTab === 'loans' || activeTab === 'customers') && (
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Ad, telefon, FİN, marka" style={{ marginBottom: 16 }} />
          )}

          {activeTab === 'dashboard' && (
            <>
              <View style={styles.row}>
                <StatTile label="Satılıb" value={stats.totalSold} />
                <StatTile label="Aktiv" value={stats.activeLoans} />
                <StatTile label="Bağlanıb" value={stats.completedLoans} />
              </View>
              <View style={styles.row}>
                <StatTile label="Bu ay daxil olub" value={money(stats.thisMonthPayments)} tone={c.success} />
                <StatTile label="Bu ay gözlənilir" value={money(stats.expectedPayments)} />
              </View>
              <View style={[styles.row, { marginBottom: 24 }]}>
                <StatTile label="Gecikmiş cəmi" value={money(stats.overdueTotal)} tone={stats.overdueTotal ? c.primary : undefined} />
              </View>
              {loans.length === 0 ? (
                <EmptyView icon={CreditCard} title="Hələ satış yoxdur" subtitle="Yuxarıdakı + düyməsi ilə ilk satışı əlavə edin." />
              ) : (
                <Group title="Son kreditlər">{loans.slice(0, 8).map(loanRow)}</Group>
              )}
            </>
          )}

          {activeTab === 'loans' && (
            (q ? loans.filter((l) => matches(l, q)) : loans).length === 0
              ? <EmptyView icon={CreditCard} title="Kredit tapılmadı" />
              : <Group>{(q ? loans.filter((l) => matches(l, q)) : loans).map(loanRow)}</Group>
          )}

          {activeTab === 'customers' && (
            customers.length === 0 ? <EmptyView title="Müştəri tapılmadı" /> : (
              <>
                {caption(`${customers.length} MÜŞTƏRİ · ${loans.length} KREDİT`)}
                {customers.map(([key, list]) => {
                  const first = list[0];
                  const manual = isManualRisky(list);
                  const auto = isAutoRisky(list, overdueByLoan);
                  const active = list.filter((l) => l.status === 'active').length;
                  return (
                    <View key={key} style={[styles.customer, { backgroundColor: c.card, borderColor: manual || auto ? c.primary : c.hairline }]}>
                      <View style={styles.customerHead}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.customerName, { color: c.text }]} numberOfLines={1}>{first.customer_name} {first.customer_surname}</Text>
                          <Text style={[styles.customerMeta, { color: c.textSecondary }]} numberOfLines={1}>
                            {[first.customer_unique_id && `#${first.customer_unique_id}`, first.customer_fin && `FİN ${first.customer_fin}`, first.customer_phone].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <Pill label={active ? `${active} aktiv` : 'Bağlanıb'} tone={active ? 'blue' : 'success'} />
                      </View>
                      <View style={[styles.riskRow, { borderTopColor: c.hairline }]}>
                        <AlertTriangle size={15} color={manual || auto ? c.primary : c.textSecondary} />
                        <Text style={[styles.riskText, { color: manual || auto ? c.primary : c.textSecondary }]} numberOfLines={1}>
                          {auto ? '30+ gün gecikmə — riskli' : manual ? 'Riskli kimi işarələnib' : 'Risk yoxdur'}
                        </Text>
                        <TouchableOpacity onPress={() => toggleRisk(key, list, manual)} disabled={riskBusy === key} hitSlop={8}>
                          {riskBusy === key
                            ? <ActivityIndicator size="small" color={c.primary} />
                            : <Text style={[styles.riskAction, { color: c.primary }]}>{manual ? 'İşarəni götür' : 'Riskli et'}</Text>}
                        </TouchableOpacity>
                      </View>
                      {list.map((loan) => (
                        <TouchableOpacity key={loan.id} onPress={() => { haptics.tap(); openLoan(loan.id); }} style={[styles.customerLoan, { borderTopColor: c.hairline }]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.loanTitle, { color: c.text }]} numberOfLines={1}>{loan.car_brand} {loan.car_model}{loan.car_year ? `, ${loan.car_year}` : ''}</Text>
                            <Text style={[styles.customerMeta, { color: c.textSecondary }]}>Kredit {money(loan.loan_amount)} · aylıq {money(loan.monthly_payment)}</Text>
                          </View>
                          {statusPill(loan.status)}
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </>
            )
          )}

          {activeTab === 'overdue' && (
            overdueItems.length === 0 ? <EmptyView icon={CheckCircle} title="Gecikmiş ödəniş yoxdur" /> : (
              <Group footer={`Cəmi ${money(stats.overdueTotal)}`}>
                {overdueItems.map((item) => (
                  <GroupRow
                    key={item.id}
                    title={`${item.loan_accounts?.customer_name || ''} ${item.loan_accounts?.customer_surname || ''}`}
                    subtitle={`${item.loan_accounts?.car_brand || ''} ${item.loan_accounts?.car_model || ''} · hissə ${item.installment_number} · ${formatDate(item.due_date)}`}
                    right={
                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <Text style={[styles.amount, { color: c.text }]}>{money(item.amount)}</Text>
                        <Pill label={`${daysLate(item.due_date)} gün`} tone="accent" />
                      </View>
                    }
                    onPress={item.loan_id ? () => openLoan(item.loan_id) : undefined}
                  />
                ))}
              </Group>
            )
          )}

          {activeTab === 'reports' && (
            <>
              <Group title="Maliyyə">
                <GroupRow title="Ümumi satış dəyəri" value={money(loans.reduce((s, l) => s + Number(l.total_price || 0), 0))} />
                <GroupRow title="İlkin ödənişlər" value={money(loans.reduce((s, l) => s + Number(l.down_payment || 0), 0))} />
                <GroupRow title="Kredit məbləği" value={money(loans.reduce((s, l) => s + Number(l.loan_amount || 0), 0))} />
                <GroupRow title="Bu ay daxil olub" value={money(stats.thisMonthPayments)} />
                <GroupRow title="Gecikmiş cəmi" value={money(stats.overdueTotal)} />
              </Group>
              <Group title="Satışlar">
                <GroupRow title="Nağd satış" value={String(loans.filter((l) => l.sale_type === 'cash').length)} />
                <GroupRow title="Kreditlə satış" value={String(loans.filter((l) => l.sale_type === 'credit').length)} />
                <GroupRow title="Aktiv kredit" value={String(stats.activeLoans)} />
                <GroupRow title="Bağlanmış kredit" value={String(stats.completedLoans)} />
              </Group>
            </>
          )}
        </AdminScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  caption: { fontSize: 13, fontFamily: F.semibold, letterSpacing: 0.4, marginBottom: 8, marginLeft: 16 },
  customer: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 12 },
  customerHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  customerName: { fontSize: 16, fontFamily: F.semibold },
  customerMeta: { fontSize: 12, fontFamily: F.medium, marginTop: 2 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  riskText: { flex: 1, fontSize: 13, fontFamily: F.semibold },
  riskAction: { fontSize: 14, fontFamily: F.semibold },
  customerLoan: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  loanTitle: { fontSize: 14, fontFamily: F.semibold },
  amount: { fontSize: 15, fontFamily: F.bold },
});
