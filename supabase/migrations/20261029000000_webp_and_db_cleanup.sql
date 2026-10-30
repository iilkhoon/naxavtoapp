-- =============================================================================
-- Migration: 20261029000000_webp_and_db_cleanup.sql
-- Purpose:
--   1. Grant admins UPDATE and DELETE permissions on storage.objects ('images' bucket)
--      so old JPEG/PNG files and deleted listing photos can be removed cleanly.
--   2. Clean up accumulated database bloat:
--      - Empty chats with 0 messages
--      - Duplicate or invalid push_tokens
--      - Empty app_settings rows
--      - Unused legacy tables (comments, car_features_options)
--   3. Provide public.cleanup_database_and_storage() RPC for 1-click admin maintenance.
-- =============================================================================

-- 1. STORAGE POLICIES FOR ADMINS (UPDATE & DELETE)
drop policy if exists "Admins update images" on storage.objects;
create policy "Admins update images"
  on storage.objects for update
  using (bucket_id = 'images' and public.is_admin())
  with check (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins delete images" on storage.objects;
create policy "Admins delete images"
  on storage.objects for delete
  using (bucket_id = 'images' and public.is_admin());

-- 2. IMMEDIATE DATABASE CLEANUP
-- 2a. Delete empty chats (chats with 0 messages)
delete from public.chats c
where not exists (
  select 1 from public.messages m where m.chat_id = c.id
);

-- 2b. Clean invalid and duplicate device push tokens
delete from public.push_tokens
where token is null
   or (token not like 'ExponentPushToken[%' and token not like 'ExpoPushToken[%');

delete from public.push_tokens p
using (
  select token,
         row_number() over (partition by device_id order by created_at desc) as rn
  from public.push_tokens
  where device_id is not null
) dup
where p.token = dup.token
  and dup.rn > 1;

-- 2c. Reset stale active_chat_id references on push_tokens
update public.push_tokens p
set is_watching_chat = false,
    active_chat_id = null
where active_chat_id is not null
  and not exists (
    select 1 from public.chats c where c.id = p.active_chat_id
  );

-- 2d. Remove empty setting rows
delete from public.app_settings
where coalesce(btrim(value), '') = '';

-- 2e. Drop unused legacy tables
drop table if exists public.comments cascade;
drop table if exists public.car_features_options cascade;

-- 3. ADMIN MAINTENANCE RPC
create or replace function public.cleanup_database_and_storage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_chats integer := 0;
  v_deleted_tokens integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  with del_chats as (
    delete from public.chats c
    where not exists (
      select 1 from public.messages m where m.chat_id = c.id
    )
    returning 1
  )
  select count(*) into v_deleted_chats from del_chats;

  with del_tokens as (
    delete from public.push_tokens p
    using (
      select token,
             row_number() over (partition by device_id order by created_at desc) as rn
      from public.push_tokens
      where device_id is not null
    ) dup
    where p.token = dup.token
      and dup.rn > 1
    returning 1
  )
  select count(*) into v_deleted_tokens from del_tokens;

  delete from public.app_settings
  where coalesce(btrim(value), '') = '';

  return jsonb_build_object(
    'deleted_empty_chats', v_deleted_chats,
    'deleted_duplicate_tokens', v_deleted_tokens
  );
end;
$$;

revoke all on function public.cleanup_database_and_storage() from public;
grant execute on function public.cleanup_database_and_storage() to authenticated;

notify pgrst, 'reload schema';

