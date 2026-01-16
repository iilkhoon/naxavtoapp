/*
  # Create Models Table
  Creates a table for car models linked to brands.

  ## Query Description:
  1. Creates 'models' table with foreign key to 'brands'
  2. Enables RLS (Row Level Security)
  3. Adds policies for public read access and authenticated insert/delete access
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: models
  - Columns: id, created_at, name, brand_id
  
  ## Security Implications:
  - Public can read models
  - Only authenticated users (admins) can modify
*/

create table if not exists public.models (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  brand_id uuid not null references public.brands (id) on delete cascade,
  constraint models_pkey primary key (id)
);

-- Enable RLS
alter table public.models enable row level security;

-- Policies
create policy "Enable read access for all users" 
on public.models for select 
using (true);

create policy "Enable insert for authenticated users only" 
on public.models for insert 
with check (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only" 
on public.models for delete 
using (auth.role() = 'authenticated');
