/*
  # Storage Security Policies
  
  Description: Configures the 'images' bucket and sets up RLS policies to allow image uploads and viewing.
  
  ## Query Description:
  1. Ensures 'images' bucket exists.
  2. Enables RLS on storage.objects.
  3. Adds policy for Public Read Access (so users can see car photos).
  4. Adds policy for Public Upload Access (so users can upload photos when creating a listing).
  
  ## Risks:
  - Public upload allows anyone to upload files to the 'images' bucket. This is acceptable for a demo/MVP but should be restricted to authenticated users in production.
*/

-- 1. Ensure the 'images' bucket exists and is public
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- 2. Enable RLS on the objects table (standard security practice)
alter table storage.objects enable row level security;

-- 3. Create Policy: Allow Public Read Access
-- Drop if exists to avoid conflicts during re-runs
drop policy if exists "Public Access" on storage.objects;

create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'images' );

-- 4. Create Policy: Allow Public Uploads
-- We use public uploads here because the "Add Listing" screen is accessible to guest users.
-- If we restricted this to 'authenticated', guest users would get a 403 error.
drop policy if exists "Public Uploads" on storage.objects;

create policy "Public Uploads"
on storage.objects for insert
with check ( bucket_id = 'images' );

-- 5. Optional: Allow users to update/delete their own uploads (if needed later)
-- For now, we just need Insert and Select.
