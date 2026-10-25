-- Snapshot of public.* RLS policies on project cqpsvgahjayvvnbqwdcn, taken 2026-10-25
-- before migration 20261025000000_secure_loans_and_admin_rls.sql.
-- Rollback reference only: several of these policies are insecure (see that migration).

create policy "Allow public read accounts" on public.accounts as PERMISSIVE for SELECT to public using (true);
create policy "Allow user insert own account" on public.accounts as PERMISSIVE for INSERT to public with check (true);
create policy "Allow user update own account" on public.accounts as PERMISSIVE for UPDATE to public using (((auth.uid() = id) OR true));
create policy "Superadmins can manage admin_expenses" on public.admin_expenses as PERMISSIVE for ALL to authenticated using ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.is_superadmin = true)))))) with check ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND ((profiles.role = 'admin'::text) OR (profiles.is_superadmin = true))))));
create policy "Admins can manage app_settings" on public.app_settings as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Auth update settings" on public.app_settings as PERMISSIVE for UPDATE to public using ((auth.role() = 'authenticated'::text));
create policy "Public can read app_settings" on public.app_settings as PERMISSIVE for SELECT to anon using (true);
create policy "Public read settings" on public.app_settings as PERMISSIVE for SELECT to public using (true);
create policy "Auth all body_types" on public.body_types as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Public read body_types" on public.body_types as PERMISSIVE for SELECT to public using (true);
create policy "Allow authenticated delete" on public.brands as PERMISSIVE for DELETE to authenticated using (true);
create policy "Allow authenticated insert" on public.brands as PERMISSIVE for INSERT to authenticated with check (true);
create policy "Allow public read access" on public.brands as PERMISSIVE for SELECT to public using (true);
create policy "Admin all features" on public.car_features as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Public read features" on public.car_features as PERMISSIVE for SELECT to public using (true);
create policy "Admins can delete features." on public.car_features_options as PERMISSIVE for DELETE to public using ((auth.uid() IN ( SELECT users.id FROM auth.users)));
create policy "Admins can insert features." on public.car_features_options as PERMISSIVE for INSERT to public with check ((auth.uid() IN ( SELECT users.id FROM auth.users)));
create policy "Features are viewable by everyone." on public.car_features_options as PERMISSIVE for SELECT to public using (true);
create policy "Admins can view and update all chats" on public.chats as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Anyone can create a chat" on public.chats as PERMISSIVE for INSERT to public with check (true);
create policy "Users can view their own chats" on public.chats as PERMISSIVE for SELECT to public using (true);
create policy "Auth all colors" on public.colors as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Public read colors" on public.colors as PERMISSIVE for SELECT to public using (true);
create policy "Anyone can insert comments" on public.comments as PERMISSIVE for INSERT to public with check (true);
create policy "Comments are viewable by everyone" on public.comments as PERMISSIVE for SELECT to public using (true);
create policy "Anon can insert participation" on public.competition_participants as PERMISSIVE for INSERT to public with check (true);
create policy "Anon can view participations" on public.competition_participants as PERMISSIVE for SELECT to public using (true);
create policy "Any authenticated can update participations for test" on public.competition_participants as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Users can insert their own participation" on public.competition_participants as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "Users can view their own participations" on public.competition_participants as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Admins can manage competitions" on public.competitions as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Competitions are viewable by everyone" on public.competitions as PERMISSIVE for SELECT to public using (true);
create policy "Allow delete credit_applications" on public.credit_applications as PERMISSIVE for DELETE to public using (true);
create policy "Allow insert credit_applications" on public.credit_applications as PERMISSIVE for INSERT to public with check (true);
create policy "Allow select credit_applications" on public.credit_applications as PERMISSIVE for SELECT to public using (true);
create policy "Allow update credit_applications" on public.credit_applications as PERMISSIVE for UPDATE to public using (true);
create policy "Admin all fuel_types" on public.fuel_types as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Public read fuel_types" on public.fuel_types as PERMISSIVE for SELECT to public using (true);
create policy "Auth all gearboxes" on public.gearboxes as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Public read gearboxes" on public.gearboxes as PERMISSIVE for SELECT to public using (true);
create policy "Admins full access listings" on public.listings as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Authenticated admin full access" on public.listings as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Public insert pending listings only" on public.listings as PERMISSIVE for INSERT to public with check (((auth.role() = 'authenticated'::text) OR ((auth.role() = 'anon'::text) AND (status = 'pending'::text))));
create policy "Public view" on public.listings as PERMISSIVE for SELECT to public using (true);
create policy "Public view approved listings" on public.listings as PERMISSIVE for SELECT to public using ((status = 'approved'::text));
create policy "Admins can do everything on loan_accounts" on public.loan_accounts as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Customers can view their own loans" on public.loan_accounts as PERMISSIVE for SELECT to public using ((customer_user_id = auth.uid()));
create policy loan_accounts_public_fin_lookup on public.loan_accounts as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy "Admins can do everything on loan_payments" on public.loan_payments as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Customers can view their own loan payments" on public.loan_payments as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1 FROM loan_accounts WHERE ((loan_accounts.id = loan_payments.loan_id) AND (loan_accounts.customer_user_id = auth.uid())))));
create policy loan_payments_public_fin_lookup on public.loan_payments as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy "Admins can do everything on loan_schedule" on public.loan_schedule as PERMISSIVE for ALL to public using ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Customers can view their own loan schedule" on public.loan_schedule as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1 FROM loan_accounts WHERE ((loan_accounts.id = loan_schedule.loan_id) AND (loan_accounts.customer_user_id = auth.uid())))));
create policy loan_schedule_public_fin_lookup on public.loan_schedule as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy "Auth all markets" on public.markets as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Public read markets" on public.markets as PERMISSIVE for SELECT to public using (true);
create policy "Admins can manage all messages" on public.messages as PERMISSIVE for ALL to authenticated using (true);
create policy "Anyone can insert messages" on public.messages as PERMISSIVE for INSERT to public with check (true);
create policy "Anyone can read messages" on public.messages as PERMISSIVE for SELECT to public using (true);
create policy "Enable delete for authenticated users only" on public.models as PERMISSIVE for DELETE to public using ((auth.role() = 'authenticated'::text));
create policy "Enable insert for authenticated users only" on public.models as PERMISSIVE for INSERT to public with check ((auth.role() = 'authenticated'::text));
create policy "Enable read access for all users" on public.models as PERMISSIVE for SELECT to public using (true);
create policy "Admins full access plates" on public.plates as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Authenticated admin full access plates" on public.plates as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy "Everyone can insert plates" on public.plates as PERMISSIVE for INSERT to public with check (true);
create policy "Plates are viewable by everyone" on public.plates as PERMISSIVE for SELECT to public using (true);
create policy "Public insert pending plates only" on public.plates as PERMISSIVE for INSERT to public with check (((auth.role() = 'authenticated'::text) OR ((auth.role() = 'anon'::text) AND (status = 'pending'::text))));
create policy "Public plates are viewable by everyone" on public.plates as PERMISSIVE for SELECT to public using (true);
create policy "Public view approved plates" on public.plates as PERMISSIVE for SELECT to public using ((status = 'approved'::text));
create policy "Public view plates" on public.plates as PERMISSIVE for SELECT to public using (true);
create policy "Users can delete own plates" on public.plates as PERMISSIVE for DELETE to public using ((auth.uid() = user_id));
create policy "Users can insert their own plates" on public.plates as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = user_id));
create policy "Users can update own plates" on public.plates as PERMISSIVE for UPDATE to public using ((auth.uid() = user_id));
create policy "Profiles are updatable by owner" on public.profiles as PERMISSIVE for UPDATE to public using ((auth.uid() = id));
create policy "Profiles are viewable by owner" on public.profiles as PERMISSIVE for SELECT to public using ((auth.uid() = id));
create policy "Admins can read push tokens" on public.push_tokens as PERMISSIVE for SELECT to public using (true);
create policy "Allow public insert/update push tokens" on public.push_tokens as PERMISSIVE for ALL to public using (true) with check (true);
create policy "Anyone can insert push tokens" on public.push_tokens as PERMISSIVE for INSERT to public with check (true);
create policy "Anyone can update their own token" on public.push_tokens as PERMISSIVE for UPDATE to public using (true);
create policy "Enable insert for everyone" on public.push_tokens as PERMISSIVE for INSERT to public with check (true);
create policy "Enable select for everyone" on public.push_tokens as PERMISSIVE for SELECT to public using (true);
create policy "Enable update for everyone" on public.push_tokens as PERMISSIVE for UPDATE to public using (true);
create policy "Enable insert for authenticated users only" on public.sent_notifications as PERMISSIVE for INSERT to public with check ((auth.role() = 'authenticated'::text));
create policy "Enable read access for all users" on public.sent_notifications as PERMISSIVE for SELECT to public using (true);
create policy "Auth all transmissions" on public.transmissions as PERMISSIVE for ALL to public using ((auth.role() = 'authenticated'::text));
create policy "Public read transmissions" on public.transmissions as PERMISSIVE for SELECT to public using (true);

-- handle_new_user() before the change (copied role/is_superadmin from user metadata):
-- CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
-- BEGIN
--   INSERT INTO public.profiles (id, full_name, role, email, is_superadmin)
--   VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'user'), new.email,
--           COALESCE((new.raw_user_meta_data->>'is_superadmin')::boolean, false));
--   RETURN NEW;
-- END; $function$;
