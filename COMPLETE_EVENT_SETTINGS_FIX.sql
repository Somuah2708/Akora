-- Complete fix for event_settings table
-- This script ensures the table exists, has proper RLS, and is ready to use

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.event_settings (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Package Pricing
  basic_price NUMERIC(10, 2) DEFAULT 0,
  standard_price NUMERIC(10, 2) DEFAULT 50,
  priority_price NUMERIC(10, 2) DEFAULT 150,
  premium_price NUMERIC(10, 2) DEFAULT 300,
  
  -- Bank Details
  bank_name TEXT DEFAULT 'Access Bank',
  bank_account_name TEXT DEFAULT 'Akora Events',
  bank_account_number TEXT DEFAULT '1234567890',
  
  -- MoMo Details
  momo_network TEXT DEFAULT 'MTN',
  momo_number TEXT DEFAULT '0244 123 456',
  momo_account_name TEXT DEFAULT 'Akora Events',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Enable RLS
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies
DROP POLICY IF EXISTS "Anyone can read event settings" ON public.event_settings;
DROP POLICY IF EXISTS "Only admins can insert event settings" ON public.event_settings;
DROP POLICY IF EXISTS "Only admins can update event settings" ON public.event_settings;

-- 4. Create read policy (anyone can read)
CREATE POLICY "Anyone can read event settings"
  ON public.event_settings
  FOR SELECT
  USING (true);

-- 5. Create insert policy (only admins)
CREATE POLICY "Only admins can insert event settings"
  ON public.event_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- 6. Create update policy (only admins)
CREATE POLICY "Only admins can update event settings"
  ON public.event_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- 7. Grant permissions
GRANT SELECT ON public.event_settings TO authenticated;
GRANT INSERT ON public.event_settings TO authenticated;
GRANT UPDATE ON public.event_settings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 8. Insert or update default settings row
INSERT INTO public.event_settings (
  id,
  basic_price,
  standard_price,
  priority_price,
  premium_price,
  bank_name,
  bank_account_name,
  bank_account_number,
  momo_network,
  momo_number,
  momo_account_name
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  0,
  50,
  150,
  300,
  'Access Bank',
  'Akora Events',
  '1234567890',
  'MTN',
  '0244 123 456',
  'Akora Events'
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- 9. Verify setup
DO $$
DECLARE
  row_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check if data exists
  SELECT COUNT(*) INTO row_count FROM public.event_settings;
  RAISE NOTICE '📊 Found % settings rows', row_count;
  
  -- Check if policies exist
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'event_settings';
  RAISE NOTICE '🔐 Found % RLS policies', policy_count;
  
  IF row_count > 0 AND policy_count >= 3 THEN
    RAISE NOTICE '✅ Event settings table is ready!';
  ELSE
    RAISE WARNING '⚠️  Setup may be incomplete. Check manually.';
  END IF;
END $$;
