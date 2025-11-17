-- Create event_settings table for admin configuration
-- This table stores package pricing and payment information

CREATE TABLE IF NOT EXISTS public.event_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Insert default settings
INSERT INTO public.event_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings (needed for displaying payment info)
CREATE POLICY "Anyone can read event settings"
  ON public.event_settings
  FOR SELECT
  USING (true);

-- Policy: Only admins can update settings
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

-- Create function to get current settings
CREATE OR REPLACE FUNCTION get_event_settings()
RETURNS TABLE (
  basic_price NUMERIC,
  standard_price NUMERIC,
  priority_price NUMERIC,
  premium_price NUMERIC,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  momo_network TEXT,
  momo_number TEXT,
  momo_account_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.basic_price,
    es.standard_price,
    es.priority_price,
    es.premium_price,
    es.bank_name,
    es.bank_account_name,
    es.bank_account_number,
    es.momo_network,
    es.momo_number,
    es.momo_account_name
  FROM public.event_settings es
  LIMIT 1;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.event_settings TO authenticated;
GRANT UPDATE ON public.event_settings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Event settings table created successfully!';
  RAISE NOTICE '📝 Admins can now configure package prices and payment details';
  RAISE NOTICE '🔐 RLS policies are enabled for security';
END $$;
