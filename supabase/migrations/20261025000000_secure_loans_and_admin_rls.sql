-- Security hardening
--  1. is_admin() / is_superadmin() helpers based on public.profiles
--  2. Loan data is no longer readable by anon; customers use FIN + birth date RPCs
--  3. "authenticated = admin" policies replaced with real admin checks
--  4. Only superadmins can change profiles.role / profiles.is_superadmin

-- =========================================================
-- 1. HELPERS
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'admin' or is_superadmin = true)
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_superadmin = true
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_superadmin() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_superadmin() to anon, authenticated;

-- Drops every existing policy on a table, so we start from a known state
-- (some policies on these tables were created from the dashboard).
create or replace function pg_temp.drop_all_policies(tbl text)
returns void
language plpgsql
as $$
declare
  pol record;
begin
  if to_regclass('public.' || tbl) is null then
    return;
  end if;
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = tbl
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
  end loop;
  execute format('alter table public.%I enable row level security', tbl);
end;
$$;

-- =========================================================
-- 2. LOANS
-- =========================================================

select pg_temp.drop_all_policies('loan_accounts');
select pg_temp.drop_all_policies('loan_schedule');
select pg_temp.drop_all_policies('loan_payments');

create policy "Admins manage loan_accounts" on public.loan_accounts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage loan_schedule" on public.loan_schedule
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage loan_payments" on public.loan_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- Signed-in customers linked to a loan (customer_user_id) can read their own data
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'loan_accounts' and column_name = 'customer_user_id'
  ) then
    create policy "Customers read own loan_accounts" on public.loan_accounts
      for select to authenticated
      using (customer_user_id = auth.uid());

    create policy "Customers read own loan_schedule" on public.loan_schedule
      for select to authenticated
      using (loan_id in (select id from public.loan_accounts where customer_user_id = auth.uid()));

    create policy "Customers read own loan_payments" on public.loan_payments
      for select to authenticated
      using (loan_id in (select id from public.loan_accounts where customer_user_id = auth.uid()));
  end if;
end;
$$;

-- FIN + birth date lookup. Exact match only (the old client query used ilike,
-- which accepted '%' wildcards).
create or replace function public.get_customer_loans(p_fin text, p_birth text)
returns setof public.loan_accounts
language sql
stable
security definer
set search_path = public
as $$
  select l.*
  from public.loan_accounts l
  where length(btrim(coalesce(p_fin, ''))) >= 5
    and upper(l.customer_fin) = upper(btrim(p_fin))
    and l.customer_birth_date::text = p_birth
  order by l.created_at desc;
$$;

create or replace function public.get_customer_loan_schedule(p_fin text, p_birth text)
returns setof public.loan_schedule
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from public.loan_schedule s
  where s.loan_id in (select id from public.get_customer_loans(p_fin, p_birth))
  order by s.installment_number;
$$;

-- Stores the customer's Expo push token in loan_accounts.notes
-- (same [PUSH_TOKEN:...] format the app wrote before).
create or replace function public.register_loan_push_token(p_fin text, p_birth text, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^ExponentPushToken\[[^\]]+\]$' then
    raise exception 'Invalid push token';
  end if;

  update public.loan_accounts l
  set notes = btrim(
    regexp_replace(coalesce(l.notes, ''), '\[PUSH_TOKEN:ExponentPushToken\[[^\]]*\]\]', '', 'g')
    || E'\n[PUSH_TOKEN:' || p_token || ']',
    E' \n'
  )
  where l.id in (select id from public.get_customer_loans(p_fin, p_birth))
    and position('[PUSH_TOKEN:' || p_token || ']' in coalesce(l.notes, '')) = 0;
end;
$$;

revoke all on function public.get_customer_loans(text, text) from public;
revoke all on function public.get_customer_loan_schedule(text, text) from public;
revoke all on function public.register_loan_push_token(text, text, text) from public;
grant execute on function public.get_customer_loans(text, text) to anon, authenticated;
grant execute on function public.get_customer_loan_schedule(text, text) to anon, authenticated;
grant execute on function public.register_loan_push_token(text, text, text) to anon, authenticated;

-- =========================================================
-- 3. CREDIT APPLICATIONS
-- =========================================================

select pg_temp.drop_all_policies('credit_applications');

create policy "Anyone submits pending applications" on public.credit_applications
  for insert
  with check (
    public.is_admin()
    or (status = 'pending' and (account_id is null or account_id = auth.uid()))
  );

create policy "Admins manage credit_applications" on public.credit_applications
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- 4. LISTINGS & PLATES
-- =========================================================

select pg_temp.drop_all_policies('listings');
select pg_temp.drop_all_policies('plates');

create policy "Public view approved listings" on public.listings
  for select using (status = 'approved' or public.is_admin());

create policy "Public insert pending listings" on public.listings
  for insert with check (status = 'pending' or public.is_admin());

create policy "Admins update listings" on public.listings
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete listings" on public.listings
  for delete using (public.is_admin());

create policy "Public view approved plates" on public.plates
  for select using (status = 'approved' or public.is_admin());

create policy "Public insert pending plates" on public.plates
  for insert with check (status = 'pending' or public.is_admin());

create policy "Admins update plates" on public.plates
  for update using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete plates" on public.plates
  for delete using (public.is_admin());

-- =========================================================
-- 5. SETTINGS & LOOKUP TABLES: public read, admin write
-- =========================================================

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'app_settings', 'brands', 'models', 'body_types', 'colors', 'gearboxes',
    'transmissions', 'markets', 'car_features', 'car_features_options', 'fuel_types'
  ]
  loop
    if to_regclass('public.' || tbl) is not null then
      perform pg_temp.drop_all_policies(tbl);
      execute format('create policy "Public read %s" on public.%I for select using (true)', tbl, tbl);
      execute format(
        'create policy "Admins manage %s" on public.%I for all using (public.is_admin()) with check (public.is_admin())',
        tbl, tbl
      );
    end if;
  end loop;
end;
$$;

-- =========================================================
-- 6. CHATS: admin policies used auth.role() = 'authenticated'
-- =========================================================

drop policy if exists "Admins can view and update all chats" on public.chats;
create policy "Admins can view and update all chats" on public.chats
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage all messages" on public.messages;
create policy "Admins can manage all messages" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- 7. PROFILES: role fields can only be changed by a superadmin
-- =========================================================

-- API requests (anon/authenticated) may not grant themselves a role.
-- service_role, the SQL editor and auth triggers are not affected.
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
  else
    new.role := old.role;
    new.is_superadmin := old.is_superadmin;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_roles on public.profiles;
create trigger protect_profile_roles
  before insert or update on public.profiles
  for each row execute function public.protect_profile_roles();

-- Used by the "Admin İstifadəçilər" screen after creating the auth user
create or replace function public.set_admin_role(p_user_id uuid, p_email text, p_is_superadmin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Only superadmins can create admins';
  end if;

  insert into public.profiles (id, email, full_name, role, is_superadmin)
  values (p_user_id, p_email, split_part(p_email, '@', 1), 'admin', coalesce(p_is_superadmin, false))
  on conflict (id) do update
    set role = 'admin',
        is_superadmin = coalesce(p_is_superadmin, false),
        email = coalesce(public.profiles.email, excluded.email);
end;
$$;

revoke all on function public.set_admin_role(uuid, text, boolean) from public;
grant execute on function public.set_admin_role(uuid, text, boolean) to authenticated;

-- Sign-up trigger copied role / is_superadmin from raw_user_meta_data, which the
-- caller of auth.signUp() controls: anyone could register as superadmin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email, is_superadmin)
  values (new.id, new.raw_user_meta_data->>'full_name', 'user', new.email, false);
  return new;
end;
$$;

-- Owners keep their own select/update policies; admins can list users and
-- superadmins can change other profiles (user-detail screen).
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "Superadmins update profiles" on public.profiles;
create policy "Superadmins update profiles" on public.profiles
  for update using (public.is_superadmin()) with check (public.is_superadmin());

-- =========================================================
-- 8. ACCOUNTS: was readable and updatable by anyone
-- =========================================================

select pg_temp.drop_all_policies('accounts');

create policy "Users read own account" on public.accounts
  for select using (id = auth.uid() or public.is_admin());

create policy "Users insert own account" on public.accounts
  for insert with check (id = auth.uid() or public.is_admin());

create policy "Users update own account" on public.accounts
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- =========================================================
-- 9. COMPETITIONS
-- =========================================================

select pg_temp.drop_all_policies('competitions');
select pg_temp.drop_all_policies('competition_participants');

create policy "Competitions are viewable by everyone" on public.competitions
  for select using (true);

create policy "Admins manage competitions" on public.competitions
  for all using (public.is_admin()) with check (public.is_admin());

-- Participants hold names and phone numbers: only admins and the participant read them
create policy "Anyone can join a competition" on public.competition_participants
  for insert with check (
    public.is_admin()
    or (coalesce(is_winner, false) = false and (user_id is null or user_id = auth.uid()))
  );

create policy "Users read own participation" on public.competition_participants
  for select using (user_id = auth.uid() or public.is_admin());

create policy "Admins manage participants" on public.competition_participants
  for all using (public.is_admin()) with check (public.is_admin());

-- Home screen only needs the count
create or replace function public.get_competition_participant_count(p_competition_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.competition_participants where competition_id = p_competition_id;
$$;

grant execute on function public.get_competition_participant_count(uuid) to anon, authenticated;

-- =========================================================
-- 10. SENT NOTIFICATIONS: only admins send
-- =========================================================

drop policy if exists "Enable insert for authenticated users only" on public.sent_notifications;
create policy "Admins insert sent_notifications" on public.sent_notifications
  for insert with check (public.is_admin());

-- =========================================================
-- 11. VIEW COUNTERS: run as definer so anon visitors can still count views
-- (listings/plates have no public update policy)
-- =========================================================

create or replace function public.increment_listing_views(row_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings set views = coalesce(views, 0) + 1 where id = row_id and status = 'approved';
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'plates' and column_name = 'views'
  ) then
    execute $f$
      create or replace function public.increment_plate_views(row_id uuid)
      returns void
      language sql
      security definer
      set search_path = public
      as $body$
        update public.plates set views = coalesce(views, 0) + 1 where id = row_id and status = 'approved';
      $body$
    $f$;
  end if;
end;
$$;

-- =========================================================
-- 12. ADVISOR FIXES: trigger functions are not RPCs; pin search_path
-- =========================================================

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.on_chat_message_inserted() from public, anon, authenticated;
revoke execute on function public.update_overdue_payments() from public, anon;

alter function public.generate_short_id() set search_path = public;
alter function public.generate_loan_unique_id() set search_path = public;
alter function public.update_chat_updated_at() set search_path = public;
alter function public.update_overdue_payments() set search_path = public;
alter function public.on_chat_message_inserted() set search_path = public, extensions;

notify pgrst, 'reload schema';
