-- Add status and contact_phone to listings
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Add status and contact_phone to plates
ALTER TABLE public.plates 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Update existing records to 'approved' so current data doesn't disappear
UPDATE public.listings SET status = 'approved' WHERE status IS NULL;
UPDATE public.plates SET status = 'approved' WHERE status IS NULL;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
