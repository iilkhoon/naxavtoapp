/*
  # Add Seller Name and VIN Code

  ## Query Description: 
  This migration adds 'seller_name' and 'vin_code' columns to the 'listings' table to support more detailed listing information.
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: public.listings
  - New Columns: 
    - seller_name (text, nullable)
    - vin_code (text, nullable)
*/

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS seller_name text,
ADD COLUMN IF NOT EXISTS vin_code text;
