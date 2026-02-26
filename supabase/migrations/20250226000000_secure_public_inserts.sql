-- Drop existing insert policies that are too permissive
drop policy if exists "Public insert listings" on public.listings;
drop policy if exists "Public insert plates" on public.plates;
drop policy if exists "Anyone can insert a listing" on public.listings;

-- Create new restrictive policies for listings

-- Allow public to insert listings ONLY IF they set the status to 'pending'
create policy "Public insert pending listings only"
on public.listings for insert
with check (
    -- If user is authenticated (admin), allow any status
    (auth.role() = 'authenticated') 
    OR 
    -- If user is anonymous, force status to be 'pending'
    (auth.role() = 'anon' AND status = 'pending')
);

-- Note: The "Admins full access listings" policy already exists and covers the authenticated case, 
-- but we include the check here anyway for completeness on the insert action itself.

-- Create new restrictive policies for plates

-- Allow public to insert plates ONLY IF they set the status to 'pending'
create policy "Public insert pending plates only"
on public.plates for insert
with check (
    -- If user is authenticated (admin), allow any status
    (auth.role() = 'authenticated') 
    OR 
    -- If user is anonymous, force status to be 'pending'
    (auth.role() = 'anon' AND status = 'pending')
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
