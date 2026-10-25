-- Supabase grants EXECUTE on new functions to anon by default.
-- set_admin_role already checks is_superadmin(), but anon has no reason to call it;
-- protect_profile_roles is a trigger function and is never an RPC.
revoke execute on function public.set_admin_role(uuid, text, boolean) from anon;
revoke execute on function public.protect_profile_roles() from public, anon, authenticated;
