-- Create table to track when users last viewed the secretariat page
CREATE TABLE IF NOT EXISTS public.secretariat_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_secretariat_views_user_id ON public.secretariat_views(user_id);

-- Enable RLS
ALTER TABLE public.secretariat_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own secretariat views"
  ON public.secretariat_views
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own secretariat views"
  ON public.secretariat_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own secretariat views"
  ON public.secretariat_views
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_secretariat_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_secretariat_views_updated_at_trigger ON public.secretariat_views;
CREATE TRIGGER update_secretariat_views_updated_at_trigger
  BEFORE UPDATE ON public.secretariat_views
  FOR EACH ROW
  EXECUTE FUNCTION update_secretariat_views_updated_at();
