CREATE TABLE IF NOT EXISTS public.admin_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'debt_given', 'debt_taken')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'AZN',
  person_name TEXT,
  car_info TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can manage admin_expenses" ON public.admin_expenses;

CREATE POLICY "Superadmins can manage admin_expenses" ON public.admin_expenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_superadmin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.is_superadmin = true)
    )
  );
