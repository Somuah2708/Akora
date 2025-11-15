-- CREATE_ADMIN_CONFIGS_TABLE.sql
-- Admin configuration table for managing pricing, instructions, and settings

-- Create admin_configs table
CREATE TABLE IF NOT EXISTS public.admin_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on config_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_configs_key ON public.admin_configs(config_key);

-- Enable RLS
ALTER TABLE public.admin_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_configs_select" ON public.admin_configs;
DROP POLICY IF EXISTS "admin_configs_insert" ON public.admin_configs;
DROP POLICY IF EXISTS "admin_configs_update" ON public.admin_configs;
DROP POLICY IF EXISTS "admin_configs_delete" ON public.admin_configs;

-- Admins can read all configs
CREATE POLICY "admin_configs_select" ON public.admin_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- Admins can insert configs
CREATE POLICY "admin_configs_insert" ON public.admin_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- Admins can update configs
CREATE POLICY "admin_configs_update" ON public.admin_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- Admins can delete configs
CREATE POLICY "admin_configs_delete" ON public.admin_configs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND (p.is_admin = true OR p.role = 'admin' OR p.role = 'staff')
    )
  );

-- Insert default configurations
INSERT INTO public.admin_configs (config_key, config_value, description) VALUES
  ('transcript_official_price', '50', 'Price for official transcript requests in GHS'),
  ('transcript_unofficial_price', '0', 'Price for unofficial transcript requests in GHS'),
  ('wassce_certificate_price', '40', 'Price for WASSCE certificate requests in GHS'),
  ('proficiency_test_price', '35', 'Price for proficiency test requests in GHS'),
  ('recommendation_price', '0', 'Price for recommendation letter requests in GHS'),
  ('payment_instructions', 'Send payment via Mobile Money or Bank Transfer. Upload proof after payment.', 'Instructions shown to users for payment'),
  ('processing_time_transcript', '3-5 business days', 'Expected processing time for transcripts'),
  ('processing_time_wassce', '3-5 business days', 'Expected processing time for WASSCE certificates'),
  ('processing_time_proficiency', '2-3 business days', 'Expected processing time for proficiency tests'),
  ('admin_email', 'admin@school.edu', 'Email for urgent inquiries'),
  ('admin_phone', '+233XXXXXXXXX', 'Phone number for urgent inquiries'),
  ('momo_number', '0241234567', 'Mobile Money number for payments'),
  ('momo_name', 'School Bursar', 'Name on Mobile Money account'),
  ('momo_network', 'MTN', 'Mobile Money network (MTN, Vodafone, AirtelTigo)'),
  ('bank_name', 'GCB Bank', 'Bank name for transfers'),
  ('bank_account_number', '1234567890', 'Bank account number'),
  ('bank_account_name', 'School Account', 'Name on bank account'),
  ('bank_branch', 'Accra Main Branch', 'Bank branch location')
ON CONFLICT (config_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.admin_configs IS 'Admin configuration settings for academic requests pricing, instructions, and contact info';
