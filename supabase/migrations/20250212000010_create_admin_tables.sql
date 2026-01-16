-- 1. App Settings (Contact info, etc.)
create table if not exists public.app_settings (
  key text primary key,
  value text,
  label text
);

-- Insert default settings
insert into public.app_settings (key, value, label) values
('phone', '+994501234567', 'Əlaqə Nömrəsi'),
('email', 'info@naxavto.az', 'Email Ünvanı'),
('whatsapp', 'https://wa.me/994501234567', 'WhatsApp Linki'),
('instagram', 'https://instagram.com/naxavto', 'Instagram Linki'),
('facebook', 'https://facebook.com', 'Facebook Linki'),
('website', 'https://naxavto.az', 'Vebsayt Linki'),
('address', 'Naxçıvan ş., Heydər Əliyev pr. 15', 'Ünvan')
on conflict (key) do nothing;

-- 2. Dynamic Features Tables
create table if not exists public.body_types (id serial primary key, name text unique);
create table if not exists public.colors (id serial primary key, name text unique, hex text);
create table if not exists public.gearboxes (id serial primary key, name text unique);
create table if not exists public.transmissions (id serial primary key, name text unique);
create table if not exists public.markets (id serial primary key, name text unique);

-- Insert default data for Body Types
insert into public.body_types (name) values 
('Sedan'), ('SUV'), ('Kupe'), ('Hetçbek'), ('Universal'), ('Kabriolet'), ('Pikap'), ('Mikroavtobus'), ('Motosiklet')
on conflict (name) do nothing;

-- Insert default data for Colors
insert into public.colors (name, hex) values 
('Ağ', '#FFFFFF'), ('Qara', '#000000'), ('Gümüşü', '#C0C0C0'), ('Boz', '#808080'), 
('Qırmızı', '#FF0000'), ('Göy', '#0000FF'), ('Yaşıl', '#008000'), ('Sarı', '#FFFF00'), 
('Qızılı', '#FFD700'), ('Narıncı', '#FFA500'), ('Qəhvəyi', '#A52A2A')
on conflict (name) do nothing;

-- Insert default data for Gearboxes
insert into public.gearboxes (name) values ('Avtomat'), ('Mexanika'), ('Robot'), ('Variator')
on conflict (name) do nothing;

-- Insert default data for Transmissions
insert into public.transmissions (name) values ('Ön'), ('Arxa'), ('Tam')
on conflict (name) do nothing;

-- Insert default data for Markets
insert into public.markets (name) values ('Avropa'), ('Amerika'), ('Dubay'), ('Koreya'), ('Yaponiya'), ('Rəsmi diler'), ('Digər')
on conflict (name) do nothing;

-- Enable RLS
alter table public.app_settings enable row level security;
alter table public.body_types enable row level security;
alter table public.colors enable row level security;
alter table public.gearboxes enable row level security;
alter table public.transmissions enable row level security;
alter table public.markets enable row level security;

-- Policies (Public Read, Admin Write)
-- For simplicity in this demo, we allow authenticated users to write. 
-- In production, you'd check for specific admin roles.

create policy "Public read settings" on public.app_settings for select using (true);
create policy "Auth update settings" on public.app_settings for update using (auth.role() = 'authenticated');

create policy "Public read body_types" on public.body_types for select using (true);
create policy "Auth all body_types" on public.body_types for all using (auth.role() = 'authenticated');

create policy "Public read colors" on public.colors for select using (true);
create policy "Auth all colors" on public.colors for all using (auth.role() = 'authenticated');

create policy "Public read gearboxes" on public.gearboxes for select using (true);
create policy "Auth all gearboxes" on public.gearboxes for all using (auth.role() = 'authenticated');

create policy "Public read transmissions" on public.transmissions for select using (true);
create policy "Auth all transmissions" on public.transmissions for all using (auth.role() = 'authenticated');

create policy "Public read markets" on public.markets for select using (true);
create policy "Auth all markets" on public.markets for all using (auth.role() = 'authenticated');
