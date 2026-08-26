-- Add is_urgent column to listings table
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false;
