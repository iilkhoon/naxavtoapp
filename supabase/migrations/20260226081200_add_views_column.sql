ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;
ALTER TABLE public.plates ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;
