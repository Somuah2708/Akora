-- Fix RLS policies for event_settings table
-- Add INSERT policy for admins (needed for upsert operations)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only admins can insert event settings" ON public.event_settings;
DROP POLICY IF EXISTS "Only admins can update event settings" ON public.event_settings;

-- Policy: Only admins can insert settings
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

-- Grant INSERT permission
GRANT INSERT ON public.event_settings TO authenticated;

-- Ensure default row exists
INSERT INTO public.event_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Event settings RLS policies fixed!';
  RAISE NOTICE '📝 Admins can now INSERT and UPDATE settings';
END $$;
