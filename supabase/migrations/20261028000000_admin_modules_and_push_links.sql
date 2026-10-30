-- Admin users with per-module access, and links for push notifications.
--
-- profiles.modules lists the admin panel sections an admin may open
-- (statistics, listings, finance, applications, chats, notifications, banners,
-- competitions, settings, catalog). Superadmins always see everything; an admin
-- with modules = null (created before this migration) also keeps full access.

alter table public.profiles add column if not exists modules text[];

create or replace function public.has_module(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (is_superadmin = true
        or (role = 'admin' and (modules is null or p_module = any(modules))))
  );
$$;

revoke all on function public.has_module(text) from public, anon;
grant execute on function public.has_module(text) to authenticated;

-- Finance and loan RPCs share this gate; the "finance" module opens both
create or replace function public.finance_require_superadmin()
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not public.has_module('finance') then
    raise exception 'Finans bölməsinə icazə yoxdur' using errcode = '42501';
  end if;
end;
$$;

-- Same switch for the finance and loan table policies
do $$
declare
  pol record;
  cond text := 'public.has_module(''finance'')';
begin
  for pol in
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public'
      and tablename in ('cash_transactions', 'cash_closings', 'finance_categories', 'car_deals', 'debts',
                        'bank_loans', 'bank_loan_schedule', 'employees', 'payroll',
                        'loan_accounts', 'loan_payments', 'loan_schedule')
      and (qual like '%is_superadmin()%' or with_check like '%is_superadmin()%')
  loop
    if pol.cmd = 'INSERT' then
      execute format('alter policy %I on public.%I with check (%s)', pol.policyname, pol.tablename, cond);
    elsif pol.cmd in ('SELECT', 'DELETE') then
      execute format('alter policy %I on public.%I using (%s)', pol.policyname, pol.tablename, cond);
    else
      execute format('alter policy %I on public.%I using (%s) with check (%s)', pol.policyname, pol.tablename, cond, cond);
    end if;
  end loop;
end;
$$;

-- API callers may not change their own role, superadmin flag or modules
create or replace function public.protect_profile_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') or public.is_superadmin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.is_superadmin := false;
    new.modules := null;
  else
    new.role := old.role;
    new.is_superadmin := old.is_superadmin;
    new.modules := old.modules;
  end if;
  return new;
end;
$$;

-- Called by the superadmin right after creating the auth user (or to edit an
-- existing admin). Confirms the email so the account can sign in at once.
create or replace function public.admin_save_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_modules text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed text[] := array['statistics', 'listings', 'finance', 'applications', 'chats',
                          'notifications', 'banners', 'competitions', 'settings', 'catalog'];
  clean text[];
begin
  if not public.is_superadmin() then
    raise exception 'Yalnız superadmin istifadəçi yarada bilər' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Öz hesabınızın icazələrini dəyişə bilməzsiniz';
  end if;

  select coalesce(array_agg(distinct m), '{}') into clean
  from unnest(coalesce(p_modules, '{}')) m
  where m = any(allowed);

  if exists (select 1 from public.profiles where id = p_user_id and is_superadmin) then
    raise exception 'Superadminin icazələri dəyişdirilmir';
  end if;

  insert into public.profiles (id, email, full_name, role, is_superadmin, modules)
  values (p_user_id, p_email, coalesce(nullif(trim(p_full_name), ''), split_part(p_email, '@', 1)), 'admin', false, clean)
  on conflict (id) do update
    set role = 'admin',
        modules = clean,
        full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
        email = coalesce(public.profiles.email, excluded.email);

  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now())
   where id = p_user_id;
end;
$$;

revoke all on function public.admin_save_user(uuid, text, text, text[]) from public, anon;
grant execute on function public.admin_save_user(uuid, text, text, text[]) to authenticated;

-- History of sent pushes remembers what a notification opened
alter table public.sent_notifications add column if not exists kind text;
alter table public.sent_notifications add column if not exists url text;
