-- Create plates table
create table public.plates (
  id uuid default gen_random_uuid() primary key,
  region text not null, -- e.g. "90"
  series text not null, -- e.g. "ZJ"
  number text not null, -- e.g. "019"
  price numeric not null,
  currency text default 'AZN',
  description text,
  seller_name text,
  contact_phone text,
  is_vip boolean default false,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id)
);

-- Enable RLS
alter table public.plates enable row level security;

-- Policies
create policy "Plates are viewable by everyone" 
  on public.plates for select using (true);

create policy "Users can insert their own plates" 
  on public.plates for insert 
  to authenticated 
  with check (auth.uid() = user_id);

-- Insert dummy data for testing
insert into public.plates (region, series, number, price, description, is_vip)
values 
('90', 'XX', '100', 15000, 'Təcili satılır', true),
('99', 'AA', '999', 25000, 'Qızıl nömrə', true),
('10', 'OO', '007', 50000, 'James Bond', true),
('77', 'DD', '777', 12000, 'Yaxşı nömrə', false),
('90', 'ZJ', '019', 2500, 'Şəkildəki nömrə', false);
