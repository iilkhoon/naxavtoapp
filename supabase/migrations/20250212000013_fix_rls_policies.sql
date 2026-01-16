-- Drop existing policies to start fresh and avoid conflicts
drop policy if exists "Public listings are viewable by everyone" on public.listings;
drop policy if exists "Users can insert their own listings" on public.listings;
drop policy if exists "Users can update their own listings" on public.listings;
drop policy if exists "Users can delete their own listings" on public.listings;
drop policy if exists "Public view approved listings" on public.listings;
drop policy if exists "Public insert listings" on public.listings;
drop policy if exists "Admins full access listings" on public.listings;

drop policy if exists "Public plates are viewable by everyone." on public.plates;
drop policy if exists "Users can insert their own plates." on public.plates;
drop policy if exists "Users can update their own plates." on public.plates;
drop policy if exists "Users can delete their own plates." on public.plates;
drop policy if exists "Public view approved plates" on public.plates;
drop policy if exists "Public insert plates" on public.plates;
drop policy if exists "Admins full access plates" on public.plates;

-- Enable RLS
alter table public.listings enable row level security;
alter table public.plates enable row level security;

-- LISTINGS POLICIES

-- 1. Allow Public (Anon + Auth) to VIEW only APPROVED listings
create policy "Public view approved listings"
on public.listings for select
using (status = 'approved');

-- 2. Allow Public (Anon + Auth) to INSERT listings (for posting ads)
create policy "Public insert listings"
on public.listings for insert
with check (true);

-- 3. Allow Authenticated Users (Admins) to DO EVERYTHING (View Pending, Edit, Delete)
create policy "Admins full access listings"
on public.listings for all
to authenticated
using (true)
with check (true);


-- PLATES POLICIES

-- 1. Allow Public (Anon + Auth) to VIEW only APPROVED plates
create policy "Public view approved plates"
on public.plates for select
using (status = 'approved');

-- 2. Allow Public (Anon + Auth) to INSERT plates
create policy "Public insert plates"
on public.plates for insert
with check (true);

-- 3. Allow Authenticated Users (Admins) to DO EVERYTHING
create policy "Admins full access plates"
on public.plates for all
to authenticated
using (true)
with check (true);
