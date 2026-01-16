/*
  # Create Brands Table
  Creates a table for managing car brands.

  ## Query Description:
  1. Creates 'brands' table with id, name, and created_at
  2. Enables RLS
  3. Adds policies for public read access and authenticated write access
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: brands
  - Columns: id (uuid), name (text), created_at (timestamp)
  
  ## Security Implications:
  - Public can read brands
  - Only authenticated users can insert/delete
*/

create table if not exists public.brands (
  id uuid not null default gen_random_uuid (),
  name text not null,
  created_at timestamp with time zone not null default now(),
  constraint brands_pkey primary key (id),
  constraint brands_name_key unique (name)
);

alter table public.brands enable row level security;

-- Allow everyone to read brands
create policy "Allow public read access"
  on public.brands
  for select
  to public
  using (true);

-- Allow authenticated users to insert brands
create policy "Allow authenticated insert"
  on public.brands
  for insert
  to authenticated
  with check (true);

-- Allow authenticated users to delete brands
create policy "Allow authenticated delete"
  on public.brands
  for delete
  to authenticated
  using (true);
