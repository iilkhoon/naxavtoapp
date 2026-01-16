/*
  # Add Short ID to Listings and Plates
  
  1. New Columns
    - `short_id` (text, unique) for `listings`
    - `short_id` (text, unique) for `plates`
  
  2. Functions
    - `generate_short_id()`: Generates a 7-character uppercase alphanumeric string.
    
  3. Operations
    - Create function
    - Add columns
    - Backfill existing data
    - Add constraints and defaults
*/

-- Function to generate random short ID (7 chars, uppercase alphanumeric)
CREATE OR REPLACE FUNCTION generate_short_id() RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..7 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 1. Update LISTINGS table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS short_id TEXT;

-- Backfill existing listings
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM listings WHERE short_id IS NULL LOOP
    UPDATE listings SET short_id = generate_short_id() WHERE id = r.id;
  END LOOP;
END $$;

-- Add unique constraint
ALTER TABLE listings ADD CONSTRAINT listings_short_id_unique UNIQUE (short_id);

-- Set default for new rows
ALTER TABLE listings ALTER COLUMN short_id SET DEFAULT generate_short_id();


-- 2. Update PLATES table
ALTER TABLE plates ADD COLUMN IF NOT EXISTS short_id TEXT;

-- Backfill existing plates
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM plates WHERE short_id IS NULL LOOP
    UPDATE plates SET short_id = generate_short_id() WHERE id = r.id;
  END LOOP;
END $$;

-- Add unique constraint
ALTER TABLE plates ADD CONSTRAINT plates_short_id_unique UNIQUE (short_id);

-- Set default for new rows
ALTER TABLE plates ALTER COLUMN short_id SET DEFAULT generate_short_id();
