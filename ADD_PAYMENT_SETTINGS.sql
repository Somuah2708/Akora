-- ADD_PAYMENT_SETTINGS.sql
-- Add payment settings configurations for multiple mobile money providers

-- Insert new payment configuration keys with default values
INSERT INTO public.admin_configs (config_key, config_value, description) VALUES
  ('enable_bank_transfer', 'true', 'Enable/disable bank transfer payments'),
  ('enable_mtn', 'false', 'Enable/disable MTN Mobile Money'),
  ('mtn_number', '', 'MTN Mobile Money number'),
  ('mtn_name', '', 'Name on MTN Mobile Money account'),
  ('enable_vodafone', 'false', 'Enable/disable Vodafone Cash'),
  ('vodafone_number', '', 'Vodafone Cash number'),
  ('vodafone_name', '', 'Name on Vodafone Cash account'),
  ('enable_airteltigo', 'false', 'Enable/disable AirtelTigo Money'),
  ('airteltigo_number', '', 'AirtelTigo Money number'),
  ('airteltigo_name', '', 'Name on AirtelTigo Money account')
ON CONFLICT (config_key) DO NOTHING;

-- Migrate existing momo settings to MTN if they exist
UPDATE public.admin_configs 
SET config_key = 'mtn_number'
WHERE config_key = 'momo_number' 
  AND NOT EXISTS (SELECT 1 FROM public.admin_configs WHERE config_key = 'mtn_number');

UPDATE public.admin_configs 
SET config_key = 'mtn_name'
WHERE config_key = 'momo_name' 
  AND NOT EXISTS (SELECT 1 FROM public.admin_configs WHERE config_key = 'mtn_name');

-- If old momo settings exist, enable MTN by default
UPDATE public.admin_configs 
SET config_value = 'true'
WHERE config_key = 'enable_mtn' 
  AND EXISTS (
    SELECT 1 FROM public.admin_configs 
    WHERE config_key = 'momo_network' AND config_value = 'MTN'
  );

-- Ensure bank details exist with defaults if not already set
INSERT INTO public.admin_configs (config_key, config_value, description) VALUES
  ('bank_name', 'GCB Bank Limited', 'Bank name for transfers'),
  ('bank_account_name', 'School Alumni Association', 'Name on bank account'),
  ('bank_account_number', '0000000000', 'Bank account number'),
  ('bank_branch', 'Main Branch', 'Bank branch location')
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = CASE 
    WHEN public.admin_configs.config_value = '' THEN EXCLUDED.config_value 
    ELSE public.admin_configs.config_value 
  END;

-- Comment
COMMENT ON TABLE public.admin_configs IS 'Admin configuration settings including flexible payment provider options';

-- Display current payment settings
SELECT config_key, config_value, description 
FROM public.admin_configs 
WHERE config_key LIKE '%bank%' 
   OR config_key LIKE '%mtn%' 
   OR config_key LIKE '%vodafone%' 
   OR config_key LIKE '%airteltigo%'
   OR config_key LIKE '%enable_%'
ORDER BY config_key;
