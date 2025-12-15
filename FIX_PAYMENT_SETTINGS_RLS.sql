-- FIX_PAYMENT_SETTINGS_RLS.sql
-- Allow all authenticated users to read payment settings from admin_configs
-- This is necessary so users can see payment information on campaign detail screens

-- Add policy for all users to read payment-related configs
DROP POLICY IF EXISTS "public_payment_configs_select" ON public.admin_configs;

CREATE POLICY "public_payment_configs_select" ON public.admin_configs
  FOR SELECT
  TO authenticated
  USING (
    -- Allow all authenticated users to read payment-related configs
    config_key IN (
      'bank_name',
      'bank_account_name',
      'bank_account_number',
      'bank_branch',
      'enable_bank_transfer',
      'mtn_number',
      'mtn_name',
      'enable_mtn',
      'vodafone_number',
      'vodafone_name',
      'enable_vodafone',
      'airteltigo_number',
      'airteltigo_name',
      'enable_airteltigo'
    )
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'admin_configs'
ORDER BY policyname;

-- Test query (run as regular user to verify access)
-- SELECT config_key, config_value 
-- FROM admin_configs 
-- WHERE config_key IN ('bank_name', 'mtn_number', 'vodafone_number', 'airteltigo_number');
