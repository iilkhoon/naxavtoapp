-- Add images array column to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

-- Update the existing rows to populate images array from the single image_url if needed
UPDATE public.listings 
SET images = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (images IS NULL OR images = '{}');
