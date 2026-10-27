// Finance section content shared by the web page and the app screen:
// overview, cash book, car deals, debts, loans, and payroll.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Plus, Minus, Ban, Car, Wrench, Tag, Banknote, Percent, ChevronLeft, ChevronRight, Landmark, HandCoins, Wallet, LayoutDashboard, Users,
} from 'lucide-react-native';
import { Segmented, Stat, Button, Badge, Card, useWebTokens, FONT, GroupCaption } from '../web/WebKit';
import { Toolbar, SearchField, DataTable, CellText, IconAction } from '../web/AdminKit';
import { FinanceFormSheet } from './FinanceFormSheet';
import {
  useFinance, FinanceForm, CashTx, money, dayLabel, monthLabel, shiftMonth, methodLabel, today,
} from '../../lib/finance';
import { useToast } from '../../contexts/ToastContext';

export type FinanceTab = 'overview' | 'cash' | 'cars' | 'debts' | 'loans' | 'payroll';

export const FINANCE_TABS: { value: FinanceTab; label: string; icon: any }[] = [
  { value: 'overview', label: 'İcmal', icon: LayoutDashboard },
  { value: 'cash', label: 'Kassa', icon: Wallet },
  { value: 'cars', label: 'Alış-satış', icon: Car },
  { value: 'debts', label: 'Borclar', icon: HandCoins },
  { value: 'loans', label: 'Kreditlər', icon: Landmark },
  { value: 'payroll', label: 'Maaşlar', icon: Users },
];

// Section switcher: icon + label buttons that scroll sideways on narrow screens
function TabBar({ value, onChange }: { value: FinanceTab; onChange: (t: FinanceTab) => void }) {
  const t = useWebTokens();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={{ flexGrow: 0 }}>
      {FINANCE_TABS.map(({ value: v, label, icon: Icon }) => {
        const active = v === value;
        const fg = active ? '#FFFFFF' : t.text;
        return (
          <TouchableOpacity
            key={v}
            role="tab"
            aria-selected={active}
            activeOpacity={0.8}
            onPress={() => onChange(v)}
            style={[
              styles.tab,
              active ? { backgroundColor: t.accent, borderColor: t.accent } : { backgroundColor: t.surface, borderColor: t.hairline },
              { cursor: 'pointer' } as any,
            ]}
          >
            <Icon size={16} color={active ? fg : t.textSecondary} strokeWidth={2.2} />
            <Text style={[styles.tabText, { color: fg }]} numberOfLines={1}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const plus = (v: number | string) => (Number(v) > 0 ? `+${money(v)}` : money(v));

const Row = ({ children }: { children: React.ReactNode }) => <View style={styles.row}>{children}</View>;

function Amount({ tx }: { tx: CashTx }) {
  const t = useWebTokens();
  const voided = !!tx.voided_at;
  return (
    <Text style={[styles.amount, { color: voided ? t.textTertiary : tx.direction === 'in' ? t.success : t.text }, voided && { textDecorationLine: 'line-through' }]}>
      {tx.direction === 'in' ? '+' : '−'}{money(tx.amount)}
    </Text>
  );
}

export function FinancePanel({ tab, onTab }: { tab: FinanceTab; onTab: (t: FinanceTab) => void }) {
  const t = useWebTokens();
  const router = useRouter();
  const { showToast } = useToast();
  const f = useFinance();
  const [form, setForm] = useState<FinanceForm | null>(null);
  const [cashFilter, setCashFilter] = useState<'all' | 'in' | 'out' | 'void'>('all');
  const [query, setQuery] = useState('');
  const [carFilter, setCarFilter] = useState<'in_stock' | 'sold'>('in_stock');
  const [debtFilter, setDebtFilter] = useState<'given' | 'taken'>('given');
  const [loanFilter, setLoanFilter] = useState<'bank' | 'customer'>('bank');

  const reload = useCallback(() => {
    f.load().catch((e: any) => showToast('Xəta: ' + e.message, 'error'));
  }, [f.load, showToast]);
  useFocusEffect(reload);

  const done = () => { setForm(null); reload(); };
  const open = (fm: FinanceForm) => setForm(fm);

  const txColumns = (withActions: boolean) => [
    { key: 'date', title: 'Tarix', width: 92, render: (x: CashTx) => <CellText title={dayLabel(x.occurred_on)} subtitle={methodLabel(x.method)} /> },
    {
      key: 'what', title: 'Əməliyyat', flex: 2,
      render: (x: CashTx) => <CellText title={f.categoryName(x.category_id)} subtitle={x.voided_at ? `Ləğv: ${x.void_reason || ''}` : x.description || undefined} />,
    },
    { key: 'who', title: 'Kim', flex: 1, hideOnMobile: true, render: (x: CashTx) => <CellText title={x.counterparty || '—'} /> },
    { key: 'amount', title: 'Məbləğ', width: 130, align: 'right' as const, render: (x: CashTx) => <Amount tx={x} /> },
    ...(withActions ? [{
      key: 'act', title: '', width: 44, align: 'right' as const,
      render: (x: CashTx) => x.voided_at ? null : <IconAction icon={Ban} label="Ləğv et" onPress={() => open(f.forms.void(x))} />,
    }] : []),
  ];

  const q = query.trim().toLowerCase();
  const filteredTx = f.transactions.filter((x) => {
    if (cashFilter === 'void' ? !x.voided_at : cashFilter !== 'all' && (x.direction !== cashFilter || x.voided_at)) return false;
    if (!q) return true;
    return [f.categoryName(x.category_id), x.description, x.counterparty, String(x.amount)].some((v) => v && v.toLowerCase().includes(q));
  });

  const sum = (rows: any[], key: string) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
  const stock = f.cars.filter((c) => c.status === 'in_stock');
  const sold = f.cars.filter((c) => c.status === 'sold');
  const thisMonth = today().slice(0, 7);
  const monthProfit = sum(sold.filter((c) => (c.sold_on || '').startsWith(thisMonth)), 'profit');
  const openDebts = f.debts.filter((d) => d.status === 'open');
  const owedToUs = sum(openDebts.filter((d) => d.direction === 'given'), 'remaining');
  const weOwe = sum(openDebts.filter((d) => d.direction === 'taken'), 'remaining');
  const bankRemaining = sum(f.bankLoans.filter((b) => b.status === 'active'), 'remaining');
  const salaryLeft = sum(f.payrollRows, 'remaining');

  return (
    <View style={{ gap: 20 }}>
      <TabBar value={tab} onChange={onTab} />

      {tab === 'overview' && (
        <>
          <Row>
            <Stat label="Kassa balansı" value={money(f.balance.balance)} hint={`Nağd ${money(f.balance.cash)} · Kart ${money(f.balance.card)} · Köçürmə ${money(f.balance.transfer)}`} />
            <Stat label="Bu gün mədaxil" value={plus(f.todaySum.total_in)} hint={`Xərc ${money(f.todaySum.total_out)}`} tone={Number(f.todaySum.total_in) > 0 ? t.success : undefined} />
            <Stat label="Bu ay mədaxil" value={plus(f.monthSum.total_in)} hint={`Xərc ${money(f.monthSum.total_out)}`} tone={Number(f.monthSum.total_in) > 0 ? t.success : undefined} />
          </Row>
          <Row>
            <Stat label="Anbarda maşın" value={String(stock.length)} hint={`Alış dəyəri ${money(sum(stock, 'buy_price'))}`} />
            <Stat label="Bu ay satışdan mənfəət" value={money(monthProfit)} tone={monthProfit < 0 ? t.accent : undefined} />
            <Stat label="Bizə borclar" value={money(owedToUs)} hint={`Bizim borc ${money(weOwe)} · Bank ${money(bankRemaining)}`} />
            <Stat label="Bu ay maaş qalığı" value={money(salaryLeft)} hint={monthLabel(f.period)} />
          </Row>
          <View style={styles.actions}>
            <Button title="Mədaxil" icon={<Plus size={16} color="#FFF" />} onPress={() => open(f.forms.cash('in'))} />
            <Button title="Xərc" variant="dark" icon={<Minus size={16} color={t.isDark ? '#000' : '#FFF'} />} onPress={() => open(f.forms.cash('out'))} />
            <Button title="Maşın aldım" variant="secondary" icon={<Car size={16} color={t.text} />} onPress={() => open(f.forms.buyCar())} />
            <Button title="Avans ver" variant="secondary" icon={<HandCoins size={16} color={t.text} />} onPress={() => onTab('payroll')} />
          </View>
          <GroupCaption>Son əməliyyatlar</GroupCaption>
          <DataTable columns={txColumns(false)} data={f.transactions.slice(0, 10)} keyExtractor={(x) => x.id} loading={f.loading}
            emptyTitle="Hələ əməliyyat yoxdur" emptySubtitle="İlk gün kassadakı pulu “Açılış qalığı” kimi mədaxil edin." />
        </>
      )}

      {tab === 'cash' && (
        <>
          <Row>
            <Stat label="Balans" value={money(f.balance.balance)} />
            <Stat label="Nağd" value={money(f.balance.cash)} />
            <Stat label="Kart" value={money(f.balance.card)} />
            <Stat label="Köçürmə" value={money(f.balance.transfer)} />
          </Row>
          <Toolbar>
            <Segmented
              options={[{ value: 'all', label: 'Hamısı' }, { value: 'in', label: 'Mədaxil' }, { value: 'out', label: 'Xərc' }, { value: 'void', label: 'Ləğv' }]}
              value={cashFilter} onChange={setCashFilter}
            />
            <SearchField value={query} onChangeText={setQuery} placeholder="Kateqoriya, açıqlama, məbləğ" />
            <Button size="sm" title="Mədaxil" icon={<Plus size={14} color="#FFF" />} onPress={() => open(f.forms.cash('in'))} />
            <Button size="sm" title="Xərc" variant="dark" icon={<Minus size={14} color={t.isDark ? '#000' : '#FFF'} />} onPress={() => open(f.forms.cash('out'))} />
            <Button size="sm" title="Kateqoriya" variant="secondary" icon={<Tag size={14} color={t.text} />} onPress={() => open(f.forms.category(cashFilter === 'in' ? 'in' : 'out'))} />
          </Toolbar>
          <DataTable columns={txColumns(true)} data={filteredTx} keyExtractor={(x) => x.id} loading={f.loading} emptyTitle="Əməliyyat yoxdur" />
        </>
      )}

      {tab === 'cars' && (
        <>
          <Row>
            <Stat label="Anbarda" value={String(stock.length)} hint={money(sum(stock, 'buy_price'))} />
            <Stat label="Satılıb" value={String(sold.length)} />
            <Stat label="Ümumi mənfəət" value={money(sum(sold, 'profit'))} />
            <Stat label="Bu ay mənfəət" value={money(monthProfit)} />
          </Row>
          <Toolbar>
            <Segmented options={[{ value: 'in_stock', label: 'Anbarda', count: stock.length }, { value: 'sold', label: 'Satılıb', count: sold.length }]} value={carFilter} onChange={setCarFilter} />
            <View style={{ flex: 1 }} />
            <Button size="sm" title="Maşın aldım" icon={<Plus size={14} color="#FFF" />} onPress={() => open(f.forms.buyCar())} />
          </Toolbar>
          <DataTable
            data={carFilter === 'in_stock' ? stock : sold}
            keyExtractor={(c) => c.id}
            loading={f.loading}
            emptyTitle={carFilter === 'in_stock' ? 'Anbarda maşın yoxdur' : 'Satış yoxdur'}
            columns={[
              { key: 'car', title: 'Avtomobil', flex: 2, render: (c) => <CellText title={`${c.brand} ${c.model}${c.year ? ` ${c.year}` : ''}`} subtitle={[c.plate, c.seller_name].filter(Boolean).join(' · ') || undefined} /> },
              { key: 'bought', title: 'Alış', flex: 1, render: (c) => <CellText title={money(c.buy_price)} subtitle={dayLabel(c.bought_on)} /> },
              { key: 'costs', title: 'Xərc', width: 100, hideOnMobile: true, render: (c) => <CellText title={money(c.costs)} /> },
              carFilter === 'sold'
                ? { key: 'sold', title: 'Satış', flex: 1, render: (c) => <CellText title={money(c.sell_price)} subtitle={`${dayLabel(c.sold_on)} · ${c.sale_type === 'credit' ? 'Kredit' : 'Nağd'}`} /> }
                : { key: 'days', title: 'Gün', width: 70, hideOnMobile: true, render: (c) => <CellText title={String(c.days_in_stock)} /> },
              carFilter === 'sold'
                ? { key: 'profit', title: 'Mənfəət', width: 110, align: 'right', render: (c) => <Text style={[styles.amount, { color: Number(c.profit) < 0 ? t.accent : t.success }]}>{money(c.profit)}</Text> }
                : {
                  key: 'act', title: '', width: 84, align: 'right', render: (c) => (
                    <View style={styles.iconRow}>
                      <IconAction icon={Wrench} label="Xərc yaz" onPress={() => open(f.forms.carCost(c))} />
                      <IconAction icon={Banknote} label="Satdım" tone="success" onPress={() => open(f.forms.sellCar(c))} />
                    </View>
                  ),
                },
            ]}
          />
          <Text style={[styles.note, { color: t.textSecondary }]}>Səhv yazılmış alış və ya satışı Kassa bölməsində əməliyyatı ləğv edərək geri qaytarın.</Text>
        </>
      )}

      {tab === 'debts' && (
        <>
          <Row>
            <Stat label="Bizə borclar" value={money(owedToUs)} tone={t.success} />
            <Stat label="Bizim borclar" value={money(weOwe)} />
          </Row>
          <Toolbar>
            <Segmented options={[{ value: 'given', label: 'Verdiyim borclar' }, { value: 'taken', label: 'Aldığım borclar' }]} value={debtFilter} onChange={setDebtFilter} />
            <View style={{ flex: 1 }} />
            <Button size="sm" title={debtFilter === 'given' ? 'Borc verdim' : 'Borc aldım'} icon={<Plus size={14} color="#FFF" />} onPress={() => open(f.forms.debt(debtFilter))} />
          </Toolbar>
          <DataTable
            data={f.debts.filter((d) => d.direction === debtFilter)}
            keyExtractor={(d) => d.id}
            loading={f.loading}
            emptyTitle="Borc yoxdur"
            columns={[
              { key: 'who', title: 'Şəxs', flex: 2, render: (d) => <CellText title={d.person_name} subtitle={d.person_phone || d.note || undefined} /> },
              { key: 'amount', title: 'Məbləğ', flex: 1, render: (d) => <CellText title={money(d.amount)} subtitle={dayLabel(d.started_on)} /> },
              { key: 'paid', title: 'Qaytarılıb', flex: 1, hideOnMobile: true, render: (d) => <CellText title={money(d.paid)} /> },
              { key: 'left', title: 'Qalıq', flex: 1, render: (d) => <CellText title={money(d.remaining)} strong subtitle={d.due_on ? `Son: ${dayLabel(d.due_on)}` : undefined} /> },
              {
                key: 'status', title: '', width: 120, align: 'right', render: (d) => d.status === 'open'
                  ? (d.due_on && d.due_on < today()
                    ? <View style={styles.iconRow}><Badge label="Gecikir" tone="accent" /><IconAction icon={Banknote} label="Ödəniş" tone="success" onPress={() => open(f.forms.payDebt(d))} /></View>
                    : <IconAction icon={Banknote} label="Ödəniş" tone="success" onPress={() => open(f.forms.payDebt(d))} />)
                  : <Badge label="Bağlanıb" tone="success" />,
              },
            ]}
          />
        </>
      )}

      {tab === 'loans' && (
        <>
          <Toolbar>
            <Segmented options={[{ value: 'bank', label: 'Bank kreditləri' }, { value: 'customer', label: 'Müştəri kreditləri' }]} value={loanFilter} onChange={setLoanFilter} />
            <View style={{ flex: 1 }} />
            {loanFilter === 'bank' && <Button size="sm" title="Bank krediti" icon={<Plus size={14} color="#FFF" />} onPress={() => open(f.forms.bankLoan())} />}
          </Toolbar>
          {loanFilter === 'bank' ? (
            <>
              <Row>
                <Stat label="Banka qalıq borc" value={money(bankRemaining)} />
                <Stat label="Bu ay ödəniləcək" value={money(sum(f.bankLoans.filter((b) => (b.next_due_on || '').startsWith(thisMonth)), 'next_due_amount'))} />
              </Row>
              <DataTable
                data={f.bankLoans}
                keyExtractor={(b) => b.id}
                loading={f.loading}
                emptyTitle="Bank krediti yoxdur"
                emptyIcon={<Landmark size={28} color={t.textSecondary} />}
                columns={[
                  { key: 'bank', title: 'Bank', flex: 2, render: (b) => <CellText title={b.bank_name} subtitle={[b.contract_no, b.purpose].filter(Boolean).join(' · ') || undefined} /> },
                  { key: 'principal', title: 'Məbləğ', flex: 1, hideOnMobile: true, render: (b) => <CellText title={money(b.principal)} subtitle={`${b.term_months} ay · ${b.interest_rate}%`} /> },
                  { key: 'monthly', title: 'Aylıq', flex: 1, hideOnMobile: true, render: (b) => <CellText title={money(b.monthly_payment)} /> },
                  { key: 'left', title: 'Qalıq', flex: 1, render: (b) => <CellText title={money(b.remaining)} strong subtitle={`Ödənib ${money(b.paid)}`} /> },
                  { key: 'next', title: 'Növbəti', flex: 1, render: (b) => <CellText title={b.next_due_on ? dayLabel(b.next_due_on) : '—'} subtitle={b.next_due_amount ? money(b.next_due_amount) : undefined} /> },
                  {
                    key: 'act', title: '', width: 120, align: 'right', render: (b) => b.status === 'active' ? (
                      <View style={styles.iconRow}>
                        {b.overdue_count > 0 && <Badge label={`${b.overdue_count} gecikmə`} tone="accent" />}
                        <IconAction icon={Banknote} label="Ödəniş" tone="success" onPress={() => open(f.forms.payBank(b))} />
                      </View>
                    ) : <Badge label="Bağlanıb" tone="success" />,
                  },
                ]}
              />
            </>
          ) : (
            <Card>
              <View style={{ gap: 12, alignItems: 'flex-start' }}>
                <Text style={[styles.cardTitle, { color: t.text }]}>Müştərilərin bizə olan kreditləri</Text>
                <Text style={[styles.note, { color: t.textSecondary }]}>
                  Kredit və nağd satışlar, ödəniş qrafiki, gecikmələr. Ödəniş qəbul edəndə pul avtomatik kassaya düşür, cərimə ayrıca yazılır.
                </Text>
                <View style={styles.actions}>
                  <Button title="Kredit paneli" icon={<Wallet size={16} color="#FFF" />} onPress={() => router.push('/admin/loans' as any)} />
                  <Button title="Yeni kredit" variant="secondary" icon={<Plus size={16} color={t.text} />} onPress={() => router.push('/admin/loan-create' as any)} />
                </View>
              </View>
            </Card>
          )}
        </>
      )}

      {tab === 'payroll' && (
        <>
          <Toolbar>
            <View style={styles.month}>
              <IconAction icon={ChevronLeft} label="Əvvəlki ay" onPress={() => f.changePeriod(shiftMonth(f.period, -1))} />
              <Text style={[styles.cardTitle, { color: t.text, minWidth: 130, textAlign: 'center' }]}>{monthLabel(f.period)}</Text>
              <IconAction icon={ChevronRight} label="Növbəti ay" onPress={() => f.changePeriod(shiftMonth(f.period, 1))} />
            </View>
            <View style={{ flex: 1 }} />
            <Button size="sm" title="İşçi əlavə et" icon={<Plus size={14} color="#FFF" />} onPress={() => open(f.forms.employee())} />
          </Toolbar>
          <Row>
            <Stat label="Hesablanıb" value={money(sum(f.payrollRows, 'total'))} />
            <Stat label="Avans verilib" value={money(sum(f.payrollRows, 'advances'))} />
            <Stat label="Maaş verilib" value={money(sum(f.payrollRows, 'salary_paid'))} />
            <Stat label="Qalıq" value={money(salaryLeft)} tone={salaryLeft > 0 ? t.warning : t.success} />
          </Row>
          <DataTable
            data={f.payrollRows}
            keyExtractor={(r) => r.employee_id}
            loading={f.loading}
            emptyTitle="İşçi yoxdur"
            emptySubtitle="“İşçi əlavə et” ilə maaşı və maaş gününü yazın."
            columns={[
              {
                key: 'who', title: 'İşçi', flex: 2, render: (r) => (
                  <TouchableOpacity onPress={() => open(f.forms.employee(r.employee))} style={{ maxWidth: '100%' }}>
                    <CellText title={r.full_name} subtitle={[r.position, `Maaş günü: ${r.employee.pay_day}`, !r.employee.is_active && 'Çıxıb'].filter(Boolean).join(' · ')} />
                  </TouchableOpacity>
                ),
              },
              {
                key: 'total', title: 'Maaş', flex: 1, render: (r) => (
                  <CellText title={money(r.total)} subtitle={Number(r.bonus_percent) || Number(r.bonus_amount)
                    ? `${money(r.base_salary)}${Number(r.bonus_percent) ? ` + ${r.bonus_percent}%` : ''}${Number(r.bonus_amount) ? ` + ${money(r.bonus_amount)}` : ''}`
                    : undefined} />
                ),
              },
              { key: 'adv', title: 'Avans', flex: 1, hideOnMobile: true, render: (r) => <CellText title={money(r.advances)} /> },
              { key: 'paid', title: 'Verilən maaş', flex: 1, hideOnMobile: true, render: (r) => <CellText title={money(r.salary_paid)} /> },
              { key: 'left', title: 'Qalıq', flex: 1, render: (r) => <Text style={[styles.amount, { color: Number(r.remaining) > 0 ? t.text : t.success }]}>{money(r.remaining)}</Text> },
              {
                key: 'act', title: '', width: 132, align: 'right', render: (r) => (
                  <View style={styles.iconRow}>
                    <IconAction icon={HandCoins} label="Avans ver" onPress={() => open(f.forms.paySalary(r, 'advance'))} disabled={Number(r.remaining) <= 0} />
                    <IconAction icon={Banknote} label="Maaşı ver" tone="success" onPress={() => open(f.forms.paySalary(r, 'salary'))} disabled={Number(r.remaining) <= 0} />
                    <IconAction icon={Percent} label="Faiz / bonus" tone="blue" onPress={() => open(f.forms.payroll(r))} />
                  </View>
                ),
              },
            ]}
          />
          <Text style={[styles.note, { color: t.textSecondary }]}>
            Avans və maaş kassadan çıxılır və ayın maaşından düşülür. Səhv yazılanı Kassa bölməsində ləğv edin. İşçinin adına basaraq maaşını və ya maaş gününü dəyişin.
          </Text>
        </>
      )}

      <FinanceFormSheet form={form} onClose={() => setForm(null)} onDone={done} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  tabText: { fontSize: 14, fontFamily: FONT.semibold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amount: { fontSize: 14, fontFamily: FONT.bold },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { fontSize: 13, fontFamily: FONT.regular, lineHeight: 18 },
  cardTitle: { fontSize: 16, fontFamily: FONT.bold },
  month: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
