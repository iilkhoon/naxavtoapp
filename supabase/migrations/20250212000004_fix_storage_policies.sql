/*
# Fix Storage Permissions
This migration fixes the previous error by removing the command that required admin privileges.
It sets up the 'images' bucket and allows public access for reading and uploading images.

## Metadata:
- Schema-Category: "Safe"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true
*/

-- 1. Create the 'images' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- 2. Allow Public Read Access (View images)
-- We drop it first to avoid "policy already exists" errors
drop policy if exists "Public Access" on storage.objects;

create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'images' );

-- 3. Allow Public Upload Access (Upload images)
-- Note: We are allowing 'public' (anon) uploads so you can test the "Add Listing" feature 
-- without needing to force a login check in the code yet.
drop policy if exists "Public Uploads" on storage.objects;
drop policy if exists "Authenticated Uploads" on storage.objects; -- Remove the old one if it exists

create policy "Public Uploads"
on storage.objects for insert
with check ( bucket_id = 'images' );
