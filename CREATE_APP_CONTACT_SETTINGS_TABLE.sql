-- Create app_contact_settings table for managing contact information
-- This allows admins to update contact details from the app

CREATE TABLE IF NOT EXISTS public.app_contact_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  office_hours JSONB NOT NULL DEFAULT '{"weekdays": "Mon - Fri: 8:00 AM - 5:00 PM", "weekends": ""}',
  website TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.app_contact_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read contact settings
CREATE POLICY "Anyone can view contact settings"
  ON public.app_contact_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update contact settings
CREATE POLICY "Only admins can update contact settings"
  ON public.app_contact_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert contact settings
CREATE POLICY "Only admins can insert contact settings"
  ON public.app_contact_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_app_contact_settings_updated_at ON public.app_contact_settings(updated_at DESC);

-- Insert default contact information
INSERT INTO public.app_contact_settings (
  email,
  phone,
  address,
  latitude,
  longitude,
  office_hours,
  website
) VALUES (
  'info@oldakora.org',
  '+256 752 614 088',
  'Plot 123, Old Kampala Road, Kampala',
  0.3136,
  32.5811,
  '{"weekdays": "Mon - Fri: 8:00 AM - 5:00 PM", "weekends": ""}',
  'oldakora.org'
) ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE public.app_contact_settings IS 'Stores contact information that can be managed by admins';
