-- Create a unique index on the plates table to prevent duplicate license plates
-- The constraint only applies to plates that are pending or approved.
-- If a plate is rejected or deleted (if soft deletes were implemented), it won't conflict.

create unique index unique_active_plates 
on public.plates (region, series, number) 
where status in ('pending', 'approved');

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
