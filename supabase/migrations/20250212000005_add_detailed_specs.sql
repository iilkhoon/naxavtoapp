/*
  # Add Detailed Car Specifications
  
  Description: Adds columns for body type, color, gearbox, transmission, market, condition, and description.
*/

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS body_type text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS gearbox text,
ADD COLUMN IF NOT EXISTS transmission text,
ADD COLUMN IF NOT EXISTS market text,
ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS description text;
