-- Finance section (superadmin only)
--  1. One cash book: every money movement is a row in cash_transactions.
--     Rows are never deleted; mistakes are voided (storno).
--  2. Car purchases/sales, debts and the company's bank loans post to the cash book.
--  3. Customer loan payments are taken in one transaction (record_loan_payment)
--     instead of several client-side queries, and also post to the cash book.
--  4. Daily cash closing: a closed day can no longer change.
--  5. Loan tables move from is_admin() to is_superadmin().
--  6. Employees and monthly payroll: advances and salary go out of the cash
--     book; a percent bonus can be added to a month.
--  7. admin_expenses (old mobile screen, never used) is dropped.

-- =========================================================
-- 1. CATEGORIES
-- =========================================================

create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  -- System categories are referenced by code from the RPCs below
  code text unique,
  name text not null,
  direction text not null check (direction in ('in', 'out')),
  sort integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.finance_categories (code, name, direction, sort) values
  ('opening',           'Açılış qalığı',               'in',  10),
  ('car_sale',          'Avtomobil satışı',            'in',  20),
  ('down_payment',      'İlkin ödəniş',                'in',  30),
  ('loan_payment',      'Kredit ödənişi',              'in',  40),
  ('penalty',           'Cərimə',                      'in',  50),
  ('debt_return',       'Borcun qaytarılması (bizə)',  'in',  60),
  ('debt_taken',        'Alınan borc',                 'in',  70),
  ('bank_loan_in',      'Bank krediti (daxilolma)',    'in',  80),
  ('other_in',          'Digər mədaxil',               'in',  90),
  ('car_purchase',      'Avtomobil alışı',             'out', 10),
  ('car_cost',          'Avtomobil xərci',             'out', 20),
  ('bank_loan_payment', 'Bank krediti ödənişi',        'out', 30),
  ('debt_given',        'Verilən borc',                'out', 40),
  ('debt_repay',        'Borcun qaytarılması (bizim)', 'out', 50),
  ('utilities',         'Kommunal',                    'out', 60),
  ('rent',              'İcarə',                       'out', 70),
  ('salary',            'Maaş',                        'out', 80),
  ('salary_advance',    'Maaş avansı',                 'out', 85),
  ('fuel',              'Yanacaq',                     'out', 90),
  ('repair',            'Təmir',                       'out', 100),
  ('tax',               'Vergi',                       'out', 110),
  ('ads',               'Reklam',                      'out', 120),
  ('other_out',         'Digər xərc',                  'out', 130)
on conflict (code) do nothing;

create or replace function public.finance_category(p_code text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.finance_categories where code = p_code;
  if v_id is null then
    raise exception 'Kateqoriya tapılmadı: %', p_code;
  end if;
  return v_id;
end;
$$;

-- =========================================================
-- 2. CARS BOUGHT AND SOLD
-- =========================================================

create table if not exists public.car_deals (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  year integer,
  plate text,
  vin text,
  color text,
  bought_on date not null default current_date,
  buy_price numeric(12, 2) not null check (buy_price >= 0),
  seller_name text,
  seller_phone text,
  status text not null default 'in_stock' check (status in ('in_stock', 'sold', 'cancelled')),
  sold_on date,
  sell_price numeric(12, 2) check (sell_price >= 0),
  buyer_name text,
  buyer_phone text,
  sale_type text check (sale_type in ('cash', 'credit')),
  loan_id uuid references public.loan_accounts(id) on delete set null,
  note text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'sold' or (sold_on is not null and sell_price is not null))
);

create index if not exists car_deals_status_idx on public.car_deals (status, bought_on desc);

-- =========================================================
-- 3. DEBTS (given to / taken from people)
-- =========================================================

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('given', 'taken')),
  person_name text not null,
  person_phone text,
  amount numeric(12, 2) not null check (amount > 0),
  started_on date not null default current_date,
  due_on date,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  note text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 4. THE COMPANY'S BANK LOANS
-- =========================================================

create table if not exists public.bank_loans (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  contract_no text,
  purpose text,
  principal numeric(12, 2) not null check (principal > 0),
  interest_rate numeric(6, 2) not null default 0,
  term_months integer not null check (term_months > 0),
  monthly_payment numeric(12, 2) not null check (monthly_payment > 0),
  started_on date not null default current_date,
  status text not null default 'active' check (status in ('active', 'closed', 'cancelled')),
  car_deal_id uuid references public.car_deals(id) on delete set null,
  note text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_loan_schedule (
  id uuid primary key default gen_random_uuid(),
  bank_loan_id uuid not null references public.bank_loans(id) on delete cascade,
  installment_number integer not null,
  due_on date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  paid_amount numeric(12, 2) not null default 0,
  paid_on date,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'overdue')),
  unique (bank_loan_id, installment_number)
);

create index if not exists bank_loan_schedule_due_idx on public.bank_loan_schedule (status, due_on);

-- =========================================================
-- 4b. EMPLOYEES AND PAYROLL
-- =========================================================

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  position text,
  base_salary numeric(12, 2) not null default 0 check (base_salary >= 0),
  -- Day of the month the salary is due (clamped to the month's last day)
  pay_day integer not null default 1 check (pay_day between 1 and 31),
  is_active boolean not null default true,
  note text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per employee and month. Total = base + base x bonus_percent + bonus_amount.
create table if not exists public.payroll (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  period date not null check (extract(day from period) = 1),
  base_salary numeric(12, 2) not null check (base_salary >= 0),
  bonus_percent numeric(6, 2) not null default 0 check (bonus_percent >= 0),
  bonus_amount numeric(12, 2) not null default 0 check (bonus_amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period)
);

-- =========================================================
-- 5. CUSTOMER LOAN PAYMENTS: who took it, which instalment, void
-- =========================================================

alter table public.loan_payments
  add column if not exists created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  add column if not exists schedule_id uuid references public.loan_schedule(id) on delete set null,
  add column if not exists mode text check (mode in ('schedule', 'any_date', 'out_of_schedule')),
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text;

-- =========================================================
-- 6. CASH BOOK
-- =========================================================

create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(12, 2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash', 'card', 'transfer')),
  category_id uuid not null references public.finance_categories(id),
  occurred_on date not null default current_date,
  description text,
  counterparty text,
  loan_id uuid references public.loan_accounts(id) on delete set null,
  loan_payment_id uuid references public.loan_payments(id) on delete set null,
  car_deal_id uuid references public.car_deals(id) on delete set null,
  debt_id uuid references public.debts(id) on delete set null,
  bank_loan_id uuid references public.bank_loans(id) on delete set null,
  bank_installment_id uuid references public.bank_loan_schedule(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  payroll_id uuid references public.payroll(id) on delete set null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text
);

create index if not exists cash_transactions_day_idx on public.cash_transactions (occurred_on desc, created_at desc);
create index if not exists cash_transactions_loan_idx on public.cash_transactions (loan_id) where loan_id is not null;
create index if not exists cash_transactions_deal_idx on public.cash_transactions (car_deal_id) where car_deal_id is not null;
create index if not exists cash_transactions_debt_idx on public.cash_transactions (debt_id) where debt_id is not null;
create index if not exists cash_transactions_bank_idx on public.cash_transactions (bank_loan_id) where bank_loan_id is not null;
create index if not exists cash_transactions_payroll_idx on public.cash_transactions (payroll_id) where payroll_id is not null;

create table if not exists public.cash_closings (
  day date primary key,
  opening numeric(12, 2) not null,
  total_in numeric(12, 2) not null,
  total_out numeric(12, 2) not null,
  expected numeric(12, 2) not null,
  counted numeric(12, 2) not null,
  difference numeric(12, 2) generated always as (counted - expected) stored,
  note text,
  closed_by uuid default auth.uid() references public.profiles(id) on delete set null,
  closed_at timestamptz not null default now()
);

-- Amount, date and direction never change (void and re-enter instead), the
-- category must match the direction, and a closed day is frozen.
create or replace function public.cash_transactions_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_material boolean := true;
begin
  if tg_op = 'UPDATE' then
    if (new.direction, new.amount, new.occurred_on, new.created_at)
       is distinct from (old.direction, old.amount, old.occurred_on, old.created_at) then
      raise exception 'Məbləğ, tarix və istiqamət dəyişdirilə bilməz: əməliyyatı ləğv edib yenisini yazın';
    end if;
    -- Links and authors may only be cleared (on delete set null)
    if (new.loan_id is distinct from old.loan_id and new.loan_id is not null)
       or (new.loan_payment_id is distinct from old.loan_payment_id and new.loan_payment_id is not null)
       or (new.car_deal_id is distinct from old.car_deal_id and new.car_deal_id is not null)
       or (new.debt_id is distinct from old.debt_id and new.debt_id is not null)
       or (new.bank_loan_id is distinct from old.bank_loan_id and new.bank_loan_id is not null)
       or (new.bank_installment_id is distinct from old.bank_installment_id and new.bank_installment_id is not null)
       or (new.employee_id is distinct from old.employee_id and new.employee_id is not null)
       or (new.payroll_id is distinct from old.payroll_id and new.payroll_id is not null)
       or (new.created_by is distinct from old.created_by and new.created_by is not null) then
      raise exception 'Əməliyyatın əlaqələri dəyişdirilə bilməz';
    end if;
    if old.voided_at is not null and new.voided_at is null then
      raise exception 'Ləğv olunmuş əməliyyat bərpa edilə bilməz';
    end if;
    v_material := new.voided_at is distinct from old.voided_at
      or new.category_id is distinct from old.category_id
      or new.method is distinct from old.method;
  end if;

  if tg_op = 'INSERT' or v_material then
    if not exists (select 1 from public.finance_categories where id = new.category_id and direction = new.direction) then
      raise exception 'Kateqoriya əməliyyatın istiqamətinə uyğun deyil';
    end if;
  end if;

  if v_material and exists (select 1 from public.cash_closings where day >= new.occurred_on) then
    raise exception 'Kassa % tarixində bağlanıb', to_char(new.occurred_on, 'DD.MM.YYYY');
  end if;
  return new;
end;
$$;

drop trigger if exists cash_transactions_guard on public.cash_transactions;
create trigger cash_transactions_guard
  before insert or update on public.cash_transactions
  for each row execute function public.cash_transactions_guard();

-- =========================================================
-- 7. VIEWS (security_invoker: RLS of the caller applies)
-- =========================================================

create or replace view public.cash_balance
with (security_invoker = true) as
select
  coalesce(sum(case when direction = 'in' then amount else -amount end), 0)::numeric(12, 2) as balance,
  coalesce(sum(case when method = 'cash' then case when direction = 'in' then amount else -amount end end), 0)::numeric(12, 2) as cash,
  coalesce(sum(case when method = 'card' then case when direction = 'in' then amount else -amount end end), 0)::numeric(12, 2) as card,
  coalesce(sum(case when method = 'transfer' then case when direction = 'in' then amount else -amount end end), 0)::numeric(12, 2) as transfer
from public.cash_transactions
where voided_at is null;

create or replace view public.car_deal_summary
with (security_invoker = true) as
select
  d.*,
  coalesce(c.costs, 0)::numeric(12, 2) as costs,
  case when d.status = 'sold'
    then (d.sell_price - d.buy_price - coalesce(c.costs, 0))::numeric(12, 2)
  end as profit,
  (coalesce(d.sold_on, current_date) - d.bought_on) as days_in_stock
from public.car_deals d
left join lateral (
  select sum(t.amount) as costs
  from public.cash_transactions t
  where t.car_deal_id = d.id
    and t.voided_at is null
    and t.category_id in (select id from public.finance_categories where code = 'car_cost')
) c on true;

create or replace view public.debt_balances
with (security_invoker = true) as
select
  d.*,
  coalesce(p.paid, 0)::numeric(12, 2) as paid,
  greatest(0, d.amount - coalesce(p.paid, 0))::numeric(12, 2) as remaining
from public.debts d
left join lateral (
  select sum(t.amount) as paid
  from public.cash_transactions t
  where t.debt_id = d.id
    and t.voided_at is null
    and t.category_id in (
      select id from public.finance_categories
      where code = case when d.direction = 'given' then 'debt_return' else 'debt_repay' end
    )
) p on true;

create or replace view public.bank_loan_balances
with (security_invoker = true) as
select
  b.*,
  coalesce(s.paid, 0)::numeric(12, 2) as paid,
  coalesce(s.remaining, 0)::numeric(12, 2) as remaining,
  s.next_due_on,
  s.next_due_amount,
  coalesce(s.overdue_count, 0) as overdue_count
from public.bank_loans b
left join lateral (
  select
    sum(paid_amount) as paid,
    sum(greatest(0, amount - paid_amount)) as remaining,
    min(due_on) filter (where status <> 'paid') as next_due_on,
    (array_agg(amount - paid_amount order by due_on) filter (where status <> 'paid'))[1] as next_due_amount,
    count(*) filter (where status = 'overdue') as overdue_count
  from public.bank_loan_schedule
  where bank_loan_id = b.id
) s on true;

create or replace view public.payroll_balances
with (security_invoker = true) as
select
  p.*,
  e.full_name,
  e.position,
  (p.period + (least(e.pay_day, extract(day from (p.period + interval '1 month' - interval '1 day'))::int) - 1))::date as due_on,
  round(p.base_salary * p.bonus_percent / 100, 2)::numeric(12, 2) as percent_amount,
  (p.base_salary + round(p.base_salary * p.bonus_percent / 100, 2) + p.bonus_amount)::numeric(12, 2) as total,
  coalesce(t.advances, 0)::numeric(12, 2) as advances,
  coalesce(t.salary_paid, 0)::numeric(12, 2) as salary_paid,
  (coalesce(t.advances, 0) + coalesce(t.salary_paid, 0))::numeric(12, 2) as paid,
  (p.base_salary + round(p.base_salary * p.bonus_percent / 100, 2) + p.bonus_amount
    - coalesce(t.advances, 0) - coalesce(t.salary_paid, 0))::numeric(12, 2) as remaining
from public.payroll p
join public.employees e on e.id = p.employee_id
left join lateral (
  select
    sum(x.amount) filter (where c.code = 'salary_advance') as advances,
    sum(x.amount) filter (where c.code = 'salary') as salary_paid
  from public.cash_transactions x
  join public.finance_categories c on c.id = x.category_id
  where x.payroll_id = p.id and x.voided_at is null
) t on true;

-- Opening balance, movements and closing balance for a date range
create or replace function public.cash_summary(p_from date, p_to date)
returns table (opening numeric, total_in numeric, total_out numeric, closing numeric)
language sql
stable
set search_path = public
as $$
  with t as (
    select direction, amount, occurred_on from public.cash_transactions where voided_at is null
  )
  select
    coalesce(sum(case when occurred_on < p_from then case when direction = 'in' then amount else -amount end end), 0),
    coalesce(sum(amount) filter (where direction = 'in' and occurred_on between p_from and p_to), 0),
    coalesce(sum(amount) filter (where direction = 'out' and occurred_on between p_from and p_to), 0),
    coalesce(sum(case when occurred_on <= p_to then case when direction = 'in' then amount else -amount end end), 0)
  from t;
$$;

-- =========================================================
-- 8. RLS: superadmins only; finance rows are never deleted
-- =========================================================

do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array[
    'finance_categories', 'car_deals', 'debts', 'bank_loans', 'bank_loan_schedule',
    'cash_transactions', 'cash_closings', 'employees', 'payroll'
  ]
  loop
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
    end loop;
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from anon', tbl);
    execute format('create policy "Superadmins read %s" on public.%I for select to authenticated using (public.is_superadmin())', tbl, tbl);
    -- Closings are written only by close_cash_day / reopen_cash_day
    if tbl <> 'cash_closings' then
      execute format('create policy "Superadmins insert %s" on public.%I for insert to authenticated with check (public.is_superadmin())', tbl, tbl);
      execute format('create policy "Superadmins update %s" on public.%I for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', tbl, tbl);
    end if;
  end loop;
end;
$$;

-- Customer loans: superadmins only (the menu already hides them from admins).
-- The customer read policies from 20261025000000 stay as they are.
drop policy if exists "Admins manage loan_accounts" on public.loan_accounts;
drop policy if exists "Admins manage loan_schedule" on public.loan_schedule;
drop policy if exists "Admins manage loan_payments" on public.loan_payments;

create policy "Superadmins manage loan_accounts" on public.loan_accounts
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "Superadmins manage loan_schedule" on public.loan_schedule
  for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "Superadmins manage loan_payments" on public.loan_payments
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- Old mobile expenses screen, replaced by the cash book (0 rows in prod)
drop table if exists public.admin_expenses;

-- =========================================================
-- 9. RPCs
-- =========================================================

create or replace function public.finance_require_superadmin()
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Yalnız superadmin' using errcode = '42501';
  end if;
end;
$$;

-- Customer loan payment: payment row, instalment(s), loan status and cash book
-- in one transaction. Modes match hooks/useLoanDetail.ts:
--   schedule        next unpaid instalment
--   any_date        the instalment p_schedule_id
--   out_of_schedule principal prepayment; the rest is spread over the unpaid months
-- Penalty (entered by hand) is stored on the payment and posted as its own cash row.
create or replace function public.record_loan_payment(
  p_loan_id uuid,
  p_amount numeric,
  p_mode text default 'schedule',
  p_schedule_id uuid default null,
  p_method text default 'cash',
  p_penalty numeric default 0,
  p_note text default null,
  p_paid_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loan_accounts;
  v_inst public.loan_schedule;
  v_payment_id uuid;
  v_n integer;
  v_principal_left numeric;
  v_principal_new numeric;
  v_interest numeric;
  v_monthly numeric;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_who text;
begin
  perform public.finance_require_superadmin();
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Məbləğ daxil edin';
  end if;
  if coalesce(p_penalty, 0) < 0 then
    raise exception 'Cərimə mənfi ola bilməz';
  end if;
  if p_mode not in ('schedule', 'any_date', 'out_of_schedule') then
    raise exception 'Ödəniş növü düzgün deyil';
  end if;

  select * into v_loan from public.loan_accounts where id = p_loan_id for update;
  if not found then
    raise exception 'Kredit tapılmadı';
  end if;
  if v_loan.status <> 'active' then
    raise exception 'Kredit aktiv deyil';
  end if;
  v_who := btrim(concat_ws(' ', v_loan.customer_name, v_loan.customer_surname));

  if p_mode = 'out_of_schedule' then
    -- Partial payments already made on unpaid instalments reduce the principal
    select count(*), coalesce(sum(principal), 0) - coalesce(sum(paid_amount), 0)
      into v_n, v_principal_left
      from public.loan_schedule
      where loan_id = p_loan_id and status <> 'paid';
    if v_n = 0 then
      raise exception 'Hesablanacaq ödənilməmiş hissə tapılmadı';
    end if;
    if p_amount > v_principal_left then
      raise exception 'Ödənilən məbləğ qalan əsas borcdan (% ₼) çox ola bilməz', round(v_principal_left, 2);
    end if;

    v_principal_new := greatest(0, v_principal_left - p_amount);
    v_interest := v_principal_new * coalesce(v_loan.interest_rate, 0) / 100 * v_n / 12.0;
    v_monthly := round((v_principal_new + v_interest) / v_n, 2);

    insert into public.loan_payments (loan_id, amount, payment_date, status, payment_method, penalty_amount, note, paid_at, mode)
    values (
      p_loan_id, p_amount, p_paid_on, 'paid', p_method, coalesce(p_penalty, 0),
      format('[CƏDVƏLDƏN KƏNAR] Yeni aylıq: %s ₼. Qalan əsas borc: %s ₼. Yeni faiz: %s ₼.',
        v_monthly, round(v_principal_new, 2), round(v_interest, 2)) || coalesce(' Qeyd: ' || v_note, ''),
      now(), p_mode
    )
    returning id into v_payment_id;

    if v_principal_new <= 0 then
      update public.loan_schedule
        set amount = 0, principal = 0, interest = 0, paid_amount = 0, status = 'paid', paid_at = now()
        where loan_id = p_loan_id and status <> 'paid';
    else
      update public.loan_schedule
        set amount = v_monthly,
            principal = round(v_principal_new / v_n, 2),
            interest = round(v_interest / v_n, 2),
            paid_amount = 0,
            status = case when due_date < current_date then 'overdue' else 'pending' end,
            paid_at = null
        where loan_id = p_loan_id and status <> 'paid';
    end if;

    update public.loan_accounts set monthly_payment = v_monthly, updated_at = now() where id = p_loan_id;
  else
    if p_mode = 'schedule' then
      select * into v_inst from public.loan_schedule
        where loan_id = p_loan_id and status <> 'paid'
        order by installment_number limit 1
        for update;
    else
      select * into v_inst from public.loan_schedule
        where id = p_schedule_id and loan_id = p_loan_id
        for update;
    end if;
    if v_inst.id is null then
      raise exception 'Ödəniş ediləcək ödənilməmiş hissə tapılmadı';
    end if;
    if v_inst.status = 'paid' then
      raise exception 'Hissə #% artıq ödənilib', v_inst.installment_number;
    end if;

    insert into public.loan_payments (loan_id, amount, payment_date, due_date, status, payment_method, penalty_amount, note, paid_at, mode, schedule_id)
    values (p_loan_id, p_amount, p_paid_on, v_inst.due_date, 'paid', p_method, coalesce(p_penalty, 0), v_note, now(), p_mode, v_inst.id)
    returning id into v_payment_id;

    update public.loan_schedule
      set paid_amount = coalesce(paid_amount, 0) + p_amount,
          status = case when coalesce(paid_amount, 0) + p_amount >= amount then 'paid' else 'partial' end,
          paid_at = case when coalesce(paid_amount, 0) + p_amount >= amount then now() end,
          payment_id = v_payment_id
      where id = v_inst.id;
  end if;

  if not exists (select 1 from public.loan_schedule where loan_id = p_loan_id and status <> 'paid') then
    update public.loan_accounts set status = 'completed', updated_at = now() where id = p_loan_id;
  end if;

  insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, loan_id, loan_payment_id)
  values ('in', p_amount, p_method, public.finance_category('loan_payment'), p_paid_on,
    'Kredit ödənişi ' || coalesce(v_loan.customer_unique_id, ''), v_who, p_loan_id, v_payment_id);

  if coalesce(p_penalty, 0) > 0 then
    insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, loan_id, loan_payment_id)
    values ('in', p_penalty, p_method, public.finance_category('penalty'), p_paid_on,
      'Gecikmə cəriməsi ' || coalesce(v_loan.customer_unique_id, ''), v_who, p_loan_id, v_payment_id);
  end if;

  return v_payment_id;
end;
$$;

-- Down payment (credit sale) or full price (cash sale) of a loan_accounts row
-- created by loan-create, when the car was not sold through car_deals.
create or replace function public.post_loan_sale_to_cash(
  p_loan_id uuid,
  p_method text default 'cash',
  p_occurred_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loan_accounts;
  v_amount numeric;
  v_id uuid;
begin
  perform public.finance_require_superadmin();
  select * into v_loan from public.loan_accounts where id = p_loan_id;
  if not found then
    raise exception 'Kredit tapılmadı';
  end if;
  if exists (
    select 1 from public.cash_transactions
    where loan_id = p_loan_id and voided_at is null
      and category_id in (public.finance_category('down_payment'), public.finance_category('car_sale'))
  ) then
    raise exception 'Bu satış artıq kassaya yazılıb';
  end if;

  v_amount := case when v_loan.sale_type = 'cash' then v_loan.total_price else v_loan.down_payment end;
  if coalesce(v_amount, 0) <= 0 then
    return null;
  end if;

  insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, loan_id)
  values ('in', v_amount, p_method,
    public.finance_category(case when v_loan.sale_type = 'cash' then 'car_sale' else 'down_payment' end),
    p_occurred_on,
    concat_ws(' ', v_loan.car_brand, v_loan.car_model, v_loan.car_year::text, v_loan.customer_unique_id),
    btrim(concat_ws(' ', v_loan.customer_name, v_loan.customer_surname)),
    p_loan_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.buy_car(
  p_brand text,
  p_model text,
  p_buy_price numeric,
  p_year integer default null,
  p_plate text default null,
  p_vin text default null,
  p_color text default null,
  p_seller_name text default null,
  p_seller_phone text default null,
  p_method text default 'cash',
  p_bought_on date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.finance_require_superadmin();
  if btrim(coalesce(p_brand, '')) = '' or btrim(coalesce(p_model, '')) = '' then
    raise exception 'Marka və model daxil edin';
  end if;
  if coalesce(p_buy_price, -1) < 0 then
    raise exception 'Alış qiymətini daxil edin';
  end if;

  insert into public.car_deals (brand, model, year, plate, vin, color, bought_on, buy_price, seller_name, seller_phone, note)
  values (btrim(p_brand), btrim(p_model), p_year, nullif(upper(btrim(coalesce(p_plate, ''))), ''),
    nullif(upper(btrim(coalesce(p_vin, ''))), ''), p_color, p_bought_on, p_buy_price,
    nullif(btrim(coalesce(p_seller_name, '')), ''), nullif(btrim(coalesce(p_seller_phone, '')), ''), p_note)
  returning id into v_id;

  if p_buy_price > 0 then
    insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, car_deal_id)
    values ('out', p_buy_price, p_method, public.finance_category('car_purchase'), p_bought_on,
      concat_ws(' ', btrim(p_brand), btrim(p_model), p_year::text, upper(p_plate)), p_seller_name, v_id);
  end if;
  return v_id;
end;
$$;

-- p_received: money taken today (the full price for a cash sale, the down
-- payment for a credit sale; the rest comes in through loan payments).
create or replace function public.sell_car(
  p_deal_id uuid,
  p_sell_price numeric,
  p_received numeric,
  p_sale_type text default 'cash',
  p_buyer_name text default null,
  p_buyer_phone text default null,
  p_loan_id uuid default null,
  p_method text default 'cash',
  p_sold_on date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deal public.car_deals;
begin
  perform public.finance_require_superadmin();
  select * into v_deal from public.car_deals where id = p_deal_id for update;
  if not found then
    raise exception 'Avtomobil tapılmadı';
  end if;
  if v_deal.status <> 'in_stock' then
    raise exception 'Avtomobil anbarda deyil';
  end if;
  if coalesce(p_sell_price, -1) < 0 or coalesce(p_received, -1) < 0 or p_received > p_sell_price then
    raise exception 'Satış qiyməti və ya alınan məbləğ düzgün deyil';
  end if;
  if p_sale_type not in ('cash', 'credit') then
    raise exception 'Satış növü düzgün deyil';
  end if;

  update public.car_deals
    set status = 'sold', sold_on = p_sold_on, sell_price = p_sell_price, sale_type = p_sale_type,
        buyer_name = nullif(btrim(coalesce(p_buyer_name, '')), ''),
        buyer_phone = nullif(btrim(coalesce(p_buyer_phone, '')), ''),
        loan_id = p_loan_id, updated_at = now()
    where id = p_deal_id;

  if p_received > 0 then
    insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, car_deal_id, loan_id)
    values ('in', p_received, p_method,
      public.finance_category(case when p_sale_type = 'cash' then 'car_sale' else 'down_payment' end),
      p_sold_on, concat_ws(' ', v_deal.brand, v_deal.model, v_deal.year::text, v_deal.plate), p_buyer_name, p_deal_id, p_loan_id);
  end if;
end;
$$;

-- p_through_cash = false records an old debt without moving money today
create or replace function public.create_debt(
  p_direction text,
  p_person_name text,
  p_amount numeric,
  p_person_phone text default null,
  p_due_on date default null,
  p_note text default null,
  p_through_cash boolean default true,
  p_method text default 'cash',
  p_started_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.finance_require_superadmin();
  if p_direction not in ('given', 'taken') then
    raise exception 'Borc növü düzgün deyil';
  end if;
  if btrim(coalesce(p_person_name, '')) = '' then
    raise exception 'Şəxsin adını daxil edin';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Məbləğ daxil edin';
  end if;

  insert into public.debts (direction, person_name, person_phone, amount, started_on, due_on, note)
  values (p_direction, btrim(p_person_name), nullif(btrim(coalesce(p_person_phone, '')), ''), p_amount, p_started_on, p_due_on, p_note)
  returning id into v_id;

  if p_through_cash then
    insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, debt_id)
    values (case when p_direction = 'given' then 'out' else 'in' end, p_amount, p_method,
      public.finance_category(case when p_direction = 'given' then 'debt_given' else 'debt_taken' end),
      p_started_on, p_note, btrim(p_person_name), v_id);
  end if;
  return v_id;
end;
$$;

create or replace function public.refresh_debt_status(p_debt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.debts d
    set status = case when b.remaining <= 0 then 'closed' else 'open' end, updated_at = now()
    from public.debt_balances b
    where d.id = p_debt_id and b.id = d.id and d.status <> 'cancelled';
end;
$$;

create or replace function public.pay_debt(
  p_debt_id uuid,
  p_amount numeric,
  p_method text default 'cash',
  p_note text default null,
  p_paid_on date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debt record;
begin
  perform public.finance_require_superadmin();
  select * into v_debt from public.debt_balances where id = p_debt_id;
  if not found then
    raise exception 'Borc tapılmadı';
  end if;
  if v_debt.status <> 'open' then
    raise exception 'Borc açıq deyil';
  end if;
  if coalesce(p_amount, 0) <= 0 or p_amount > v_debt.remaining then
    raise exception 'Məbləğ qalan borcdan (% ₼) çox ola bilməz', v_debt.remaining;
  end if;

  insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, debt_id)
  values (case when v_debt.direction = 'given' then 'in' else 'out' end, p_amount, p_method,
    public.finance_category(case when v_debt.direction = 'given' then 'debt_return' else 'debt_repay' end),
    p_paid_on, p_note, v_debt.person_name, p_debt_id);

  perform public.refresh_debt_status(p_debt_id);
end;
$$;

-- Schedule: p_term_months equal payments of p_monthly_payment (as in the bank
-- contract), the first one on p_first_due_on.
create or replace function public.create_bank_loan(
  p_bank_name text,
  p_principal numeric,
  p_term_months integer,
  p_monthly_payment numeric,
  p_first_due_on date,
  p_interest_rate numeric default 0,
  p_contract_no text default null,
  p_purpose text default null,
  p_car_deal_id uuid default null,
  p_note text default null,
  p_received_to_cash boolean default false,
  p_method text default 'transfer',
  p_started_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.finance_require_superadmin();
  if btrim(coalesce(p_bank_name, '')) = '' then
    raise exception 'Bankın adını daxil edin';
  end if;
  if coalesce(p_principal, 0) <= 0 or coalesce(p_term_months, 0) <= 0 or coalesce(p_monthly_payment, 0) <= 0 then
    raise exception 'Məbləğ, müddət və aylıq ödəniş daxil edin';
  end if;
  if p_first_due_on is null then
    raise exception 'İlk ödəniş tarixini daxil edin';
  end if;

  insert into public.bank_loans (bank_name, contract_no, purpose, principal, interest_rate, term_months, monthly_payment, started_on, car_deal_id, note)
  values (btrim(p_bank_name), p_contract_no, p_purpose, p_principal, coalesce(p_interest_rate, 0), p_term_months, p_monthly_payment, p_started_on, p_car_deal_id, p_note)
  returning id into v_id;

  insert into public.bank_loan_schedule (bank_loan_id, installment_number, due_on, amount, status)
  select v_id, i, (p_first_due_on + make_interval(months => i - 1))::date, p_monthly_payment,
    case when (p_first_due_on + make_interval(months => i - 1))::date < current_date then 'overdue' else 'pending' end
  from generate_series(1, p_term_months) as i;

  if p_received_to_cash then
    insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, bank_loan_id)
    values ('in', p_principal, p_method, public.finance_category('bank_loan_in'), p_started_on,
      concat_ws(' ', 'Kredit', p_contract_no), btrim(p_bank_name), v_id);
  end if;
  return v_id;
end;
$$;

create or replace function public.pay_bank_installment(
  p_bank_loan_id uuid,
  p_amount numeric,
  p_installment_id uuid default null,
  p_method text default 'transfer',
  p_note text default null,
  p_paid_on date default current_date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.bank_loans;
  v_inst public.bank_loan_schedule;
begin
  perform public.finance_require_superadmin();
  select * into v_loan from public.bank_loans where id = p_bank_loan_id for update;
  if not found then
    raise exception 'Bank krediti tapılmadı';
  end if;
  if v_loan.status <> 'active' then
    raise exception 'Bank krediti aktiv deyil';
  end if;

  if p_installment_id is null then
    select * into v_inst from public.bank_loan_schedule
      where bank_loan_id = p_bank_loan_id and status <> 'paid'
      order by installment_number limit 1 for update;
  else
    select * into v_inst from public.bank_loan_schedule
      where id = p_installment_id and bank_loan_id = p_bank_loan_id for update;
  end if;
  if v_inst.id is null or v_inst.status = 'paid' then
    raise exception 'Ödəniləcək hissə tapılmadı';
  end if;
  if coalesce(p_amount, 0) <= 0 or p_amount > v_inst.amount - v_inst.paid_amount then
    raise exception 'Məbləğ hissənin qalığından (% ₼) çox ola bilməz', v_inst.amount - v_inst.paid_amount;
  end if;

  update public.bank_loan_schedule
    set paid_amount = paid_amount + p_amount,
        status = case when paid_amount + p_amount >= amount then 'paid' else 'partial' end,
        paid_on = case when paid_amount + p_amount >= amount then p_paid_on end
    where id = v_inst.id;

  insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, bank_loan_id, bank_installment_id)
  values ('out', p_amount, p_method, public.finance_category('bank_loan_payment'), p_paid_on,
    concat_ws(' ', 'Hissə #' || v_inst.installment_number, p_note), v_loan.bank_name, p_bank_loan_id, v_inst.id);

  if not exists (select 1 from public.bank_loan_schedule where bank_loan_id = p_bank_loan_id and status <> 'paid') then
    update public.bank_loans set status = 'closed', updated_at = now() where id = p_bank_loan_id;
  end if;
end;
$$;

-- Month row for an employee, created from the current base salary when missing
create or replace function public.ensure_payroll(p_employee_id uuid, p_period date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', coalesce(p_period, current_date))::date;
  v_id uuid;
begin
  perform public.finance_require_superadmin();
  select id into v_id from public.payroll where employee_id = p_employee_id and period = v_period;
  if v_id is null then
    insert into public.payroll (employee_id, period, base_salary)
    select id, v_period, base_salary from public.employees where id = p_employee_id
    returning id into v_id;
    if v_id is null then
      raise exception 'İşçi tapılmadı';
    end if;
  end if;
  return v_id;
end;
$$;

-- Salary, percent bonus and fixed bonus of one month (null keeps the value)
create or replace function public.set_payroll(
  p_employee_id uuid,
  p_period date,
  p_base_salary numeric default null,
  p_bonus_percent numeric default null,
  p_bonus_amount numeric default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.ensure_payroll(p_employee_id, p_period);
begin
  update public.payroll
    set base_salary = coalesce(p_base_salary, base_salary),
        bonus_percent = coalesce(p_bonus_percent, bonus_percent),
        bonus_amount = coalesce(p_bonus_amount, bonus_amount),
        note = coalesce(p_note, note),
        updated_at = now()
    where id = v_id;
  if (select remaining from public.payroll_balances where id = v_id) < 0 then
    raise exception 'Ödənilmiş məbləğ yeni maaşdan çoxdur';
  end if;
  return v_id;
end;
$$;

-- p_kind: 'advance' (during the month) or 'salary' (the rest on pay day).
-- Both come off the month's total; paying more than what is left is blocked.
create or replace function public.pay_salary(
  p_employee_id uuid,
  p_amount numeric,
  p_kind text default 'advance',
  p_period date default current_date,
  p_method text default 'cash',
  p_note text default null,
  p_paid_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.ensure_payroll(p_employee_id, p_period);
  v_row record;
  v_tx uuid;
begin
  if p_kind not in ('advance', 'salary') then
    raise exception 'Növ advance və ya salary olmalıdır';
  end if;
  select * into v_row from public.payroll_balances where id = v_id;
  if coalesce(p_amount, 0) <= 0 or p_amount > v_row.remaining then
    raise exception 'Məbləğ qalan maaşdan (% ₼) çox ola bilməz', v_row.remaining;
  end if;

  insert into public.cash_transactions (direction, amount, method, category_id, occurred_on, description, counterparty, employee_id, payroll_id)
  values ('out', p_amount, p_method,
    public.finance_category(case when p_kind = 'advance' then 'salary_advance' else 'salary' end),
    p_paid_on, coalesce(nullif(btrim(coalesce(p_note, '')), ''), to_char(v_row.period, 'MM.YYYY')),
    v_row.full_name, p_employee_id, v_id)
  returning id into v_tx;
  return v_tx;
end;
$$;

-- Storno. Reverses what the row did to loans, cars, debts and bank loans.
create or replace function public.void_cash_transaction(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.cash_transactions;
  v_pay public.loan_payments;
  v_code text;
begin
  perform public.finance_require_superadmin();
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'Ləğv səbəbini yazın';
  end if;
  select * into v_tx from public.cash_transactions where id = p_id for update;
  if not found then
    raise exception 'Əməliyyat tapılmadı';
  end if;
  if v_tx.voided_at is not null then
    raise exception 'Əməliyyat artıq ləğv olunub';
  end if;
  select code into v_code from public.finance_categories where id = v_tx.category_id;

  -- Customer loan payment: undo the instalment and void the payment's other rows (penalty)
  if v_tx.loan_payment_id is not null then
    select * into v_pay from public.loan_payments where id = v_tx.loan_payment_id for update;
    if v_pay.mode = 'out_of_schedule' then
      raise exception 'Cədvəldən kənar ödəniş ləğv edilə bilməz: qrafik yenidən hesablanıb';
    end if;
    if v_pay.schedule_id is not null and v_code = 'loan_payment' then
      update public.loan_schedule
        set paid_amount = greatest(0, coalesce(paid_amount, 0) - v_pay.amount),
            status = case
              when greatest(0, coalesce(paid_amount, 0) - v_pay.amount) >= amount then 'paid'
              when greatest(0, coalesce(paid_amount, 0) - v_pay.amount) > 0 then 'partial'
              when due_date < current_date then 'overdue'
              else 'pending'
            end,
            paid_at = case when greatest(0, coalesce(paid_amount, 0) - v_pay.amount) >= amount then paid_at end
        where id = v_pay.schedule_id;
      update public.loan_accounts set status = 'active', updated_at = now()
        where id = v_pay.loan_id and status = 'completed' and sale_type = 'credit';
    end if;
    update public.loan_payments set voided_at = now(), void_reason = btrim(p_reason) where id = v_pay.id;
    update public.cash_transactions
      set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
      where loan_payment_id = v_pay.id and voided_at is null;
    return;
  end if;

  if v_tx.bank_installment_id is not null then
    update public.bank_loan_schedule
      set paid_amount = greatest(0, paid_amount - v_tx.amount),
          status = case
            when greatest(0, paid_amount - v_tx.amount) > 0 then 'partial'
            when due_on < current_date then 'overdue'
            else 'pending'
          end,
          paid_on = null
      where id = v_tx.bank_installment_id;
    update public.bank_loans set status = 'active', updated_at = now()
      where id = v_tx.bank_loan_id and status = 'closed';
  end if;

  if v_tx.car_deal_id is not null then
    if v_code = 'car_purchase' then
      if exists (select 1 from public.car_deals where id = v_tx.car_deal_id and status = 'sold') then
        raise exception 'Satılmış avtomobilin alışı ləğv edilə bilməz: əvvəl satışı ləğv edin';
      end if;
      update public.car_deals set status = 'cancelled', updated_at = now() where id = v_tx.car_deal_id;
    elsif v_code in ('car_sale', 'down_payment') then
      update public.car_deals
        set status = 'in_stock', sold_on = null, sell_price = null, sale_type = null,
            buyer_name = null, buyer_phone = null, loan_id = null, updated_at = now()
        where id = v_tx.car_deal_id and status = 'sold';
    end if;
  end if;

  update public.cash_transactions
    set voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
    where id = p_id;

  if v_tx.debt_id is not null then
    if v_code in ('debt_given', 'debt_taken') then
      update public.debts set status = 'cancelled', updated_at = now() where id = v_tx.debt_id;
    else
      perform public.refresh_debt_status(v_tx.debt_id);
    end if;
  end if;
end;
$$;

-- Closes days in order; opening = balance of everything before the day.
create or replace function public.close_cash_day(p_day date, p_counted numeric, p_note text default null)
returns public.cash_closings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sum record;
  v_row public.cash_closings;
begin
  perform public.finance_require_superadmin();
  if p_day is null or p_day > current_date then
    raise exception 'Gələcək günü bağlamaq olmaz';
  end if;
  if p_counted is null or p_counted < 0 then
    raise exception 'Kassadakı faktiki məbləği daxil edin';
  end if;
  if exists (select 1 from public.cash_closings where day >= p_day) then
    raise exception 'Bu və ya sonrakı gün artıq bağlanıb';
  end if;

  select * into v_sum from public.cash_summary(p_day, p_day);
  insert into public.cash_closings (day, opening, total_in, total_out, expected, counted, note)
  values (p_day, v_sum.opening, v_sum.total_in, v_sum.total_out, v_sum.closing, p_counted, p_note)
  returning * into v_row;
  return v_row;
end;
$$;

-- Only the last closed day can be reopened
create or replace function public.reopen_cash_day(p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.finance_require_superadmin();
  if p_day is distinct from (select max(day) from public.cash_closings) then
    raise exception 'Yalnız son bağlanmış gün açıla bilər';
  end if;
  delete from public.cash_closings where day = p_day;
end;
$$;

-- Overdue: also partly paid instalments, and the company's bank instalments
create or replace function public.update_overdue_payments()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loan_schedule
  set status = 'overdue'
  where status in ('pending', 'partial')
    and due_date < current_date;

  update public.bank_loan_schedule
  set status = 'overdue'
  where status in ('pending', 'partial')
    and due_on < current_date;
end;
$$;

-- =========================================================
-- 10. GRANTS
-- =========================================================

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.finance_category(text)',
    'public.cash_summary(date, date)',
    'public.finance_require_superadmin()',
    'public.record_loan_payment(uuid, numeric, text, uuid, text, numeric, text, date)',
    'public.post_loan_sale_to_cash(uuid, text, date)',
    'public.buy_car(text, text, numeric, integer, text, text, text, text, text, text, date, text)',
    'public.sell_car(uuid, numeric, numeric, text, text, text, uuid, text, date)',
    'public.create_debt(text, text, numeric, text, date, text, boolean, text, date)',
    'public.refresh_debt_status(uuid)',
    'public.pay_debt(uuid, numeric, text, text, date)',
    'public.create_bank_loan(text, numeric, integer, numeric, date, numeric, text, text, uuid, text, boolean, text, date)',
    'public.pay_bank_installment(uuid, numeric, uuid, text, text, date)',
    'public.void_cash_transaction(uuid, text)',
    'public.ensure_payroll(uuid, date)',
    'public.set_payroll(uuid, date, numeric, numeric, numeric, text)',
    'public.pay_salary(uuid, numeric, text, date, text, text, date)',
    'public.close_cash_day(date, numeric, text)',
    'public.reopen_cash_day(date)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end;
$$;

revoke execute on function public.cash_transactions_guard() from public, anon, authenticated;
revoke all on public.cash_balance, public.car_deal_summary, public.debt_balances, public.bank_loan_balances, public.payroll_balances from anon;

notify pgrst, 'reload schema';
