-- 1. Create Comments Table
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  listing_id uuid references public.listings(id) on delete cascade not null,
  full_name text not null,
  text text not null,
  status text default 'approved' -- Simple moderation if needed later
);

-- Enable RLS for comments
alter table public.comments enable row level security;

-- Allow everyone to read comments
create policy "Comments are viewable by everyone"
  on public.comments for select
  using ( true );

-- Allow everyone to insert comments (Guest allowed)
create policy "Anyone can insert comments"
  on public.comments for insert
  with check ( true );

-- 2. Add Logo URL to Brands
alter table public.brands add column if not exists logo_url text;

-- 3. Seed some logos (Optional - tries to match by name)
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/2048px-BMW.svg.png' where name ilike 'BMW';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/1024px-Mercedes-Logo.svg.png' where name ilike 'Mercedes%';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Audi.svg/2048px-Audi.svg.png' where name ilike 'Audi';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Toyota_Motor_Corporation_Logo.svg/1200px-Toyota_Motor_Corporation_Logo.svg.png' where name ilike 'Toyota';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_Logo_2019.svg/2048px-Volkswagen_Logo_2019.svg.png' where name ilike 'Volkswagen';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Hyundai_Motor_Company_logo.svg/2560px-Hyundai_Motor_Company_logo.svg.png' where name ilike 'Hyundai';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Kia_logo.svg/2560px-Kia_logo.svg.png' where name ilike 'Kia';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Lada-logo.svg/2560px-Lada-logo.svg.png' where name ilike 'Lada';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/dc/d9/Opel_2020.svg/2560px-Opel_2020.svg.png' where name ilike 'Opel';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Porsche_logo.svg/2560px-Porsche_logo.svg.png' where name ilike 'Porsche';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Land_Rover_logo.svg/2560px-Land_Rover_logo.svg.png' where name ilike 'Land Rover';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/2560px-Ford_logo_flat.svg.png' where name ilike 'Ford';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Chevrolet_logo_2013.svg/2560px-Chevrolet_logo_2013.svg.png' where name ilike 'Chevrolet';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Mitsubishi-motors_logo.svg/2560px-Mitsubishi-motors_logo.svg.png' where name ilike 'Mitsubishi';
update public.brands set logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Nissan_logo.svg/2000px-Nissan_logo.svg.png' where name ilike 'Nissan';
