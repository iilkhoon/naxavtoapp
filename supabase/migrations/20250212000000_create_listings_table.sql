/*
  # Create Listings Table
  Creates a table to store car advertisements.

  ## Query Description:
  1. Creates 'listings' table with fields for car details (make, model, price, etc.)
  2. Enables RLS (Row Level Security)
  3. Adds policies for public read access and public insert access (for demo purposes)

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  - Table: listings
  - Columns: id, title, price, make, model, year, mileage, engine, location, image_url, is_credit, is_barter, is_vip, created_at
*/

create table if not exists public.listings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  price numeric not null,
  currency text default 'AZN',
  make text not null,
  model text not null,
  year integer not null,
  mileage integer not null,
  engine text not null,
  location text not null,
  image_url text,
  is_credit boolean default false,
  is_barter boolean default false,
  is_vip boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.listings enable row level security;

-- Allow everyone to read listings
create policy "Public listings are viewable by everyone"
  on public.listings for select
  using (true);

-- Allow everyone to insert listings (For this demo app)
create policy "Anyone can insert a listing"
  on public.listings for insert
  with check (true);
