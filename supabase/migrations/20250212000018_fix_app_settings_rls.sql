-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can do everything on app_settings" ON public.app_settings;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create a comprehensive policy for admins (authenticated users)
-- This allows SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Admins can manage app_settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow public read access (so users can see contact info)
CREATE POLICY "Public can read app_settings"
ON public.app_settings
FOR SELECT
TO anon
USING (true);
