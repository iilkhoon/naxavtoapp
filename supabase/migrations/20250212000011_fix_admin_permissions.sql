-- Avtomobil elanları (listings) üçün icazələri yenilə
alter table public.listings enable row level security;

-- Köhnə məhdudlaşdırıcı siyasətləri sil
drop policy if exists "Public listings are viewable by everyone." on public.listings;
drop policy if exists "Users can insert their own listings." on public.listings;
drop policy if exists "Users can update their own listings." on public.listings;
drop policy if exists "Users can delete their own listings." on public.listings;
drop policy if exists "Public view" on public.listings;
drop policy if exists "Authenticated admin full access" on public.listings;

-- Yeni siyasətlər:
-- 1. Hər kəs elanları görə bilər
create policy "Public view"
on public.listings for select
using (true);

-- 2. Giriş etmiş istifadəçilər (Adminlər) hər şeyi edə bilər (Silmək, Dəyişmək, Əlavə etmək)
create policy "Authenticated admin full access"
on public.listings for all
to authenticated
using (true)
with check (true);


-- Nömrə elanları (plates) üçün icazələri yenilə
alter table public.plates enable row level security;

-- Köhnə siyasətləri sil
drop policy if exists "Public plates are viewable by everyone." on public.plates;
drop policy if exists "Users can insert their own plates." on public.plates;
drop policy if exists "Users can update their own plates." on public.plates;
drop policy if exists "Users can delete their own plates." on public.plates;
drop policy if exists "Public view plates" on public.plates;
drop policy if exists "Authenticated admin full access plates" on public.plates;

-- Yeni siyasətlər:
create policy "Public view plates"
on public.plates for select
using (true);

create policy "Authenticated admin full access plates"
on public.plates for all
to authenticated
using (true)
with check (true);
