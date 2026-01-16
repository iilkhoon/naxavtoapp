/*
  # Clean All Listings
  Removes all data from listings, plates, and comments tables.

  ## Query Description: This operation will DELETE ALL listings, plates, and comments. Backup recommended if you want to keep data.
  
  ## Metadata:
  - Schema-Category: "Dangerous"
  - Impact-Level: "High"
  - Requires-Backup: true
  - Reversible: false
  
  ## Structure Details:
  - Truncates public.listings
  - Truncates public.plates
  - Truncates public.comments
*/

TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.listings CASCADE;
TRUNCATE TABLE public.plates CASCADE;
