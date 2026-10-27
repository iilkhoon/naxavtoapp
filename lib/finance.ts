// Finance section (superadmin only): data loading and the forms behind every
// action. The web page (app/admin/finance.web.tsx) and the app screen
// (app/admin/finance.tsx) render the same forms; all money moves through the
// RPCs in supabase/migrations/20261027000000_finance_section.sql.
import { useCallback, useState } from 'react';
import { supabase } from './supabase';

export type Method = 'cash' | 'card' | 'transfer';
export const METHODS: { value: Method; label: string }[] = [
  { value: 'cash', label: 'Nağd' },
  { value: 'card', label: 'Kart' },
  { value: 'transfer', label: 'Köçürmə' },
];
export const methodLabel = (m: string) => METHODS.find((x) => x.value === m)?.label || m;

export type Category = { id: string; code: string | null; name: string; direction: 'in' | 'out'; sort: number };
export type CashTx = {
  id: string; direction: 'in' | 'out'; amount: number; method: Method; category_id: string; occurred_on: string;
  description: string | null; counterparty: string | null; voided_at: string | null; void_reason: string | null; created_at: string;
};

// Categories posted by their own flows (cars, debts, loans, salary); the plain
// income/expense form offers the rest.
const FLOW_CODES = new Set([
  'car_sale', 'down_payment', 'loan_payment', 'penalty', 'debt_return', 'debt_taken', 'bank_loan_in',
  'car_purchase', 'car_cost', 'bank_loan_payment', 'debt_given', 'debt_repay', 'salary', 'salary_advance',
]);

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const monthStart = (iso = today()) => `${iso.slice(0, 7)}-01`;
export const shiftMonth = (period: string, delta: number) => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
export const monthLabel = (period: string) => `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;
export const dayLabel = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '—');

/** 1 250.50 ₼ (kopecks only when there are any) */
export const money = (v: number | string | null | undefined) => {
  const n = Number(v) || 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const s = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (dec === '00' ? '' : `.${dec}`);
  return `${n < 0 ? '−' : ''}${s} ₼`;
};

/* ─── Forms ───────────────────────────────────────────────── */

export type FieldType = 'text' | 'money' | 'number' | 'date' | 'phone' | 'select' | 'multiline';
export type FormField = {
  key: string; label: string; type: FieldType; required?: boolean; placeholder?: string; hint?: string;
  options?: { value: string; label: string }[];
};
export type FinanceForm = {
  title: string;
  subtitle?: string;
  submitLabel: string;
  destructive?: boolean;
  fields: FormField[];
  initial?: Record<string, string>;
  submit: (v: Record<string, string>) => Promise<unknown>;
  success: string;
};

const num = (v?: string) => {
  const s = (v || '').replace(/\s/g, '').replace(',', '.');
  return s === '' ? null : Number(s);
};
const str = (v?: string) => (v && v.trim() ? v.trim() : null);

/** Required fields and numbers; returns the first problem or null */
export function validateForm(form: FinanceForm, v: Record<string, string>) {
  for (const f of form.fields) {
    const raw = (v[f.key] || '').trim();
    if (f.required && !raw) return f.type === 'select' ? `${f.label} seçin` : `${f.label} daxil edin`;
    if (raw && (f.type === 'money' || f.type === 'number')) {
      const n = num(raw);
      if (n == null || Number.isNaN(n) || n < 0) return `${f.label}: düzgün rəqəm yazın`;
    }
    if (raw && f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${f.label}: tarixi İİİİ-AA-GG kimi yazın`;
  }
  return null;
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

const methodField: FormField = { key: 'method', label: 'Ödəniş üsulu', type: 'select', options: METHODS };
const dateField = (label = 'Tarix'): FormField => ({ key: 'date', label, type: 'date', required: true });
const noteField: FormField = { key: 'note', label: 'Qeyd', type: 'multiline' };
const base = () => ({ method: 'cash', date: today() });

export type FinanceData = ReturnType<typeof useFinance>;

export function useFinance() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [balance, setBalance] = useState({ balance: 0, cash: 0, card: 0, transfer: 0 });
  const [todaySum, setTodaySum] = useState({ total_in: 0, total_out: 0 });
  const [monthSum, setMonthSum] = useState({ total_in: 0, total_out: 0 });
  const [transactions, setTransactions] = useState<CashTx[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [bankLoans, setBankLoans] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [period, setPeriod] = useState(monthStart());

  const load = useCallback(async (p = period) => {
    try {
      await supabase.rpc('update_overdue_payments');
      const now = today();
      const [cat, bal, daySum, mSum, tx, car, debt, bank, emp, pay] = await Promise.all([
        supabase.from('finance_categories').select('id, code, name, direction, sort').eq('is_active', true).order('sort'),
        supabase.from('cash_balance').select('*').single(),
        supabase.rpc('cash_summary', { p_from: now, p_to: now }),
        supabase.rpc('cash_summary', { p_from: monthStart(now), p_to: now }),
        supabase.from('cash_transactions').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(500),
        supabase.from('car_deal_summary').select('*').neq('status', 'cancelled').order('bought_on', { ascending: false }),
        supabase.from('debt_balances').select('*').neq('status', 'cancelled').order('started_on', { ascending: false }),
        supabase.from('bank_loan_balances').select('*').neq('status', 'cancelled').order('started_on', { ascending: false }),
        supabase.from('employees').select('*').order('full_name'),
        supabase.from('payroll_balances').select('*').eq('period', p),
      ]);
      const failed = [cat, bal, daySum, mSum, tx, car, debt, bank, emp, pay].find((r) => r.error);
      if (failed?.error) throw failed.error;
      setCategories(cat.data || []);
      setBalance(bal.data || { balance: 0, cash: 0, card: 0, transfer: 0 });
      setTodaySum((daySum.data as any)?.[0] || { total_in: 0, total_out: 0 });
      setMonthSum((mSum.data as any)?.[0] || { total_in: 0, total_out: 0 });
      setTransactions(tx.data || []);
      setCars(car.data || []);
      setDebts(debt.data || []);
      setBankLoans(bank.data || []);
      setEmployees(emp.data || []);
      setPayroll(pay.data || []);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // load depends on period, so the screen's focus effect refetches
  const changePeriod = (p: string) => setPeriod(p);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '—';
  const categoryCode = (id: string) => categories.find((c) => c.id === id)?.code || null;
  const manualCategories = (direction: 'in' | 'out') =>
    categories.filter((c) => c.direction === direction && !(c.code && FLOW_CODES.has(c.code)));

  // Months without a payroll row yet still show every active employee
  const payrollRows = employees.filter((e) => e.is_active || payroll.some((p) => p.employee_id === e.id)).map((e) => {
    const row = payroll.find((p) => p.employee_id === e.id);
    if (row) return { ...row, employee: e };
    return {
      id: null, employee_id: e.id, employee: e, period, full_name: e.full_name, position: e.position,
      base_salary: e.base_salary, bonus_percent: 0, bonus_amount: 0, percent_amount: 0, total: e.base_salary,
      advances: 0, salary_paid: 0, paid: 0, remaining: e.base_salary, due_on: null,
    };
  });

  /* Forms */

  const forms = {
    cash: (direction: 'in' | 'out'): FinanceForm => ({
      title: direction === 'in' ? 'Mədaxil' : 'Xərc',
      submitLabel: 'Yadda saxla',
      fields: [
        { key: 'category', label: 'Kateqoriya', type: 'select', required: true, options: manualCategories(direction).map((c) => ({ value: c.id, label: c.name })) },
        { key: 'amount', label: 'Məbləğ (₼)', type: 'money', required: true },
        methodField,
        dateField(),
        { key: 'counterparty', label: direction === 'in' ? 'Kimdən' : 'Kimə', type: 'text' },
        { key: 'description', label: 'Açıqlama', type: 'multiline' },
      ],
      // Empty cash book: the first income is usually the opening balance
      initial: {
        ...base(),
        category: direction === 'out'
          ? manualCategories('out').find((c) => c.code === 'utilities')?.id || ''
          : manualCategories('in').find((c) => c.code === (transactions.length ? 'other_in' : 'opening'))?.id || '',
      },
      submit: async (v) => {
        const { error } = await supabase.from('cash_transactions').insert({
          direction, amount: num(v.amount), method: v.method, category_id: v.category, occurred_on: v.date,
          counterparty: str(v.counterparty), description: str(v.description),
        });
        if (error) throw error;
      },
      success: direction === 'in' ? 'Mədaxil yazıldı' : 'Xərc yazıldı',
    }),

    category: (direction: 'in' | 'out'): FinanceForm => ({
      title: direction === 'in' ? 'Yeni mədaxil kateqoriyası' : 'Yeni xərc kateqoriyası',
      submitLabel: 'Əlavə et',
      fields: [{ key: 'name', label: 'Ad', type: 'text', required: true }],
      submit: async (v) => {
        const { error } = await supabase.from('finance_categories').insert({ name: v.name.trim(), direction, sort: 200 });
        if (error) throw error;
      },
      success: 'Kateqoriya əlavə olundu',
    }),

    void: (tx: CashTx): FinanceForm => ({
      title: 'Əməliyyatı ləğv et',
      subtitle: `${categoryName(tx.category_id)} · ${money(tx.amount)} · ${dayLabel(tx.occurred_on)}. Əməliyyat silinmir, ləğv olunmuş kimi qalır; bağlı kredit, maşın, borc və ya maaş da geri qaytarılır.`,
      submitLabel: 'Ləğv et',
      destructive: true,
      fields: [{ key: 'reason', label: 'Səbəb', type: 'text', required: true }],
      submit: (v) => rpc('void_cash_transaction', { p_id: tx.id, p_reason: v.reason }),
      success: 'Əməliyyat ləğv olundu',
    }),

    buyCar: (): FinanceForm => ({
      title: 'Avtomobil alışı',
      submitLabel: 'Alışı yaz',
      fields: [
        { key: 'brand', label: 'Marka', type: 'text', required: true },
        { key: 'model', label: 'Model', type: 'text', required: true },
        { key: 'year', label: 'İl', type: 'number' },
        { key: 'plate', label: 'Nömrə', type: 'text', placeholder: '10-AA-100' },
        { key: 'price', label: 'Alış qiyməti (₼)', type: 'money', required: true },
        { key: 'seller', label: 'Satıcı', type: 'text' },
        { key: 'phone', label: 'Satıcının telefonu', type: 'phone' },
        methodField, dateField(), noteField,
      ],
      initial: base(),
      submit: (v) => rpc('buy_car', {
        p_brand: v.brand, p_model: v.model, p_buy_price: num(v.price), p_year: num(v.year), p_plate: str(v.plate),
        p_seller_name: str(v.seller), p_seller_phone: str(v.phone), p_method: v.method, p_bought_on: v.date, p_note: str(v.note),
      }),
      success: 'Alış yazıldı, məbləğ kassadan çıxıldı',
    }),

    sellCar: (deal: any): FinanceForm => ({
      title: `Satış: ${deal.brand} ${deal.model}`,
      subtitle: `Alış qiyməti ${money(deal.buy_price)}, xərclər ${money(deal.costs)}`,
      submitLabel: 'Satışı yaz',
      fields: [
        { key: 'price', label: 'Satış qiyməti (₼)', type: 'money', required: true },
        { key: 'saleType', label: 'Satış növü', type: 'select', options: [{ value: 'cash', label: 'Nağd' }, { value: 'credit', label: 'Kredit' }] },
        { key: 'received', label: 'Bu gün alınan (₼)', type: 'money', required: true, hint: 'Nağd satışda tam məbləğ, kreditdə ilkin ödəniş' },
        { key: 'buyer', label: 'Alıcı', type: 'text' },
        { key: 'phone', label: 'Alıcının telefonu', type: 'phone' },
        methodField, dateField(),
      ],
      initial: { ...base(), saleType: 'cash' },
      submit: (v) => rpc('sell_car', {
        p_deal_id: deal.id, p_sell_price: num(v.price), p_received: num(v.received), p_sale_type: v.saleType,
        p_buyer_name: str(v.buyer), p_buyer_phone: str(v.phone), p_method: v.method, p_sold_on: v.date,
      }),
      success: 'Satış yazıldı',
    }),

    carCost: (deal: any): FinanceForm => ({
      title: `Xərc: ${deal.brand} ${deal.model}`,
      subtitle: 'Təmir, sənəd, yuma və s. Mənfəətdən çıxılır.',
      submitLabel: 'Xərci yaz',
      fields: [{ key: 'amount', label: 'Məbləğ (₼)', type: 'money', required: true }, { key: 'description', label: 'Nə üçün', type: 'text', required: true }, methodField, dateField()],
      initial: base(),
      submit: async (v) => {
        const cat = categories.find((c) => c.code === 'car_cost');
        const { error } = await supabase.from('cash_transactions').insert({
          direction: 'out', amount: num(v.amount), method: v.method, category_id: cat?.id, occurred_on: v.date,
          description: str(v.description), car_deal_id: deal.id,
        });
        if (error) throw error;
      },
      success: 'Xərc yazıldı',
    }),

    debt: (direction: 'given' | 'taken'): FinanceForm => ({
      title: direction === 'given' ? 'Borc verdim' : 'Borc aldım',
      submitLabel: 'Yaz',
      fields: [
        { key: 'person', label: 'Şəxs', type: 'text', required: true },
        { key: 'phone', label: 'Telefon', type: 'phone' },
        { key: 'amount', label: 'Məbləğ (₼)', type: 'money', required: true },
        { key: 'due', label: 'Qaytarılma tarixi', type: 'date' },
        { key: 'throughCash', label: 'Pul bu gün kassadan keçir?', type: 'select', options: [{ value: 'yes', label: 'Bəli' }, { value: 'no', label: 'Xeyr, köhnə borcdur' }] },
        methodField, dateField(), noteField,
      ],
      initial: { ...base(), throughCash: 'yes' },
      submit: (v) => rpc('create_debt', {
        p_direction: direction, p_person_name: v.person, p_amount: num(v.amount), p_person_phone: str(v.phone),
        p_due_on: str(v.due), p_note: str(v.note), p_through_cash: v.throughCash !== 'no', p_method: v.method, p_started_on: v.date,
      }),
      success: 'Borc yazıldı',
    }),

    payDebt: (debt: any): FinanceForm => ({
      title: debt.direction === 'given' ? `${debt.person_name} qaytarır` : `${debt.person_name}-ə qaytarıram`,
      subtitle: `Qalıq ${money(debt.remaining)}`,
      submitLabel: 'Yaz',
      fields: [{ key: 'amount', label: 'Məbləğ (₼)', type: 'money', required: true }, methodField, dateField(), noteField],
      initial: { ...base(), amount: String(debt.remaining) },
      submit: (v) => rpc('pay_debt', { p_debt_id: debt.id, p_amount: num(v.amount), p_method: v.method, p_note: str(v.note), p_paid_on: v.date }),
      success: 'Ödəniş yazıldı',
    }),

    bankLoan: (): FinanceForm => ({
      title: 'Bank krediti',
      subtitle: 'Şirkətin banka olan krediti. Qrafik aylıq ödənişə görə yaradılır.',
      submitLabel: 'Əlavə et',
      fields: [
        { key: 'bank', label: 'Bank', type: 'text', required: true },
        { key: 'contract', label: 'Müqavilə №', type: 'text' },
        { key: 'principal', label: 'Kredit məbləği (₼)', type: 'money', required: true },
        { key: 'rate', label: 'İllik faiz (%)', type: 'number' },
        { key: 'term', label: 'Müddət (ay)', type: 'number', required: true },
        { key: 'monthly', label: 'Aylıq ödəniş (₼)', type: 'money', required: true },
        { key: 'firstDue', label: 'İlk ödəniş tarixi', type: 'date', required: true },
        { key: 'purpose', label: 'Məqsəd', type: 'text' },
        { key: 'toCash', label: 'Pul kassaya daxil olsun?', type: 'select', options: [{ value: 'no', label: 'Xeyr' }, { value: 'yes', label: 'Bəli' }] },
        methodField, dateField('Kreditin tarixi'), noteField,
      ],
      initial: { ...base(), toCash: 'no', method: 'transfer' },
      submit: (v) => rpc('create_bank_loan', {
        p_bank_name: v.bank, p_principal: num(v.principal), p_term_months: num(v.term), p_monthly_payment: num(v.monthly),
        p_first_due_on: v.firstDue, p_interest_rate: num(v.rate) ?? 0, p_contract_no: str(v.contract), p_purpose: str(v.purpose),
        p_received_to_cash: v.toCash === 'yes', p_method: v.method, p_started_on: v.date, p_note: str(v.note),
      }),
      success: 'Bank krediti əlavə olundu',
    }),

    payBank: (loan: any): FinanceForm => ({
      title: `${loan.bank_name}: ödəniş`,
      subtitle: loan.next_due_on ? `Növbəti: ${dayLabel(loan.next_due_on)} · ${money(loan.next_due_amount)}` : undefined,
      submitLabel: 'Ödənişi yaz',
      fields: [{ key: 'amount', label: 'Məbləğ (₼)', type: 'money', required: true }, methodField, dateField(), noteField],
      initial: { ...base(), method: 'transfer', amount: loan.next_due_amount ? String(loan.next_due_amount) : '' },
      submit: (v) => rpc('pay_bank_installment', { p_bank_loan_id: loan.id, p_amount: num(v.amount), p_method: v.method, p_note: str(v.note), p_paid_on: v.date }),
      success: 'Bank ödənişi yazıldı',
    }),

    employee: (e?: any): FinanceForm => ({
      title: e ? e.full_name : 'Yeni işçi',
      submitLabel: e ? 'Yadda saxla' : 'Əlavə et',
      fields: [
        { key: 'name', label: 'Ad, soyad', type: 'text', required: true },
        { key: 'position', label: 'Vəzifə', type: 'text' },
        { key: 'phone', label: 'Telefon', type: 'phone' },
        { key: 'salary', label: 'Aylıq maaş (₼)', type: 'money', required: true },
        { key: 'payDay', label: 'Maaş günü (ayın neçəsi)', type: 'number', required: true },
        { key: 'active', label: 'Status', type: 'select', options: [{ value: 'yes', label: 'İşləyir' }, { value: 'no', label: 'Çıxıb' }] },
        noteField,
      ],
      initial: e
        ? { name: e.full_name, position: e.position || '', phone: e.phone || '', salary: String(e.base_salary), payDay: String(e.pay_day), active: e.is_active ? 'yes' : 'no', note: e.note || '' }
        : { payDay: '1', active: 'yes' },
      submit: async (v) => {
        const payDay = num(v.payDay) || 1;
        if (payDay < 1 || payDay > 31) throw new Error('Maaş günü 1–31 arası olmalıdır');
        const row = {
          full_name: v.name.trim(), position: str(v.position), phone: str(v.phone), base_salary: num(v.salary),
          pay_day: Math.round(payDay), is_active: v.active !== 'no', note: str(v.note), updated_at: new Date().toISOString(),
        };
        const { error } = e ? await supabase.from('employees').update(row).eq('id', e.id) : await supabase.from('employees').insert(row);
        if (error) throw error;
      },
      success: e ? 'İşçi yeniləndi' : 'İşçi əlavə olundu',
    }),

    payroll: (row: any): FinanceForm => ({
      title: `${row.full_name}: ${monthLabel(row.period)}`,
      subtitle: 'Bu ayın maaşı. Faiz əsas maaşın üzərinə gəlir.',
      submitLabel: 'Yadda saxla',
      fields: [
        { key: 'base', label: 'Əsas maaş (₼)', type: 'money', required: true },
        { key: 'percent', label: 'Əlavə faiz (%)', type: 'number', hint: 'Məs. 10 yazsanız maaşa 10% əlavə olunur' },
        { key: 'bonus', label: 'Əlavə məbləğ / bonus (₼)', type: 'money' },
        noteField,
      ],
      initial: { base: String(row.base_salary), percent: String(row.bonus_percent || 0), bonus: String(row.bonus_amount || 0), note: row.note || '' },
      submit: (v) => rpc('set_payroll', {
        p_employee_id: row.employee_id, p_period: row.period, p_base_salary: num(v.base),
        p_bonus_percent: num(v.percent) ?? 0, p_bonus_amount: num(v.bonus) ?? 0, p_note: str(v.note),
      }),
      success: 'Maaş yeniləndi',
    }),

    paySalary: (row: any, kind: 'advance' | 'salary'): FinanceForm => ({
      title: kind === 'advance' ? `Avans: ${row.full_name}` : `Maaş: ${row.full_name}`,
      subtitle: `${monthLabel(row.period)} · cəmi ${money(row.total)}, verilib ${money(row.paid)}, qalıb ${money(row.remaining)}`,
      submitLabel: kind === 'advance' ? 'Avansı yaz' : 'Maaşı yaz',
      fields: [{ key: 'amount', label: 'Məbləğ (₼)', type: 'money', required: true }, methodField, dateField(), noteField],
      initial: { ...base(), amount: kind === 'salary' ? String(row.remaining) : '' },
      submit: (v) => rpc('pay_salary', {
        p_employee_id: row.employee_id, p_amount: num(v.amount), p_kind: kind, p_period: row.period,
        p_method: v.method, p_note: str(v.note), p_paid_on: v.date,
      }),
      success: kind === 'advance' ? 'Avans yazıldı' : 'Maaş yazıldı',
    }),
  };

  return {
    loading, load, categories, balance, todaySum, monthSum, transactions, cars, debts, bankLoans, employees, payroll,
    payrollRows, period, changePeriod, categoryName, categoryCode, forms,
  };
}
