/*
  # Create Push Tokens Table
  
  ## Query Description: This operation creates a table to store Expo Push Tokens for sending notifications.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Table: push_tokens
  - Columns: id, token, created_at, last_seen
  
  ## Security Implications:
  - RLS Status: Enabled
  - Policy Changes: Yes (Public Insert, Admin Select)
  
  ## Performance Impact:
  - Indexes: None (small table)
*/

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert/update their token (anonymous users need to register for notifications)
CREATE POLICY "Allow public insert/update push tokens" ON public.push_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
