-- Add is_vip column to plates table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plates' AND column_name = 'is_vip') THEN
        ALTER TABLE public.plates ADD COLUMN is_vip boolean DEFAULT false;
    END IF;
END $$;
