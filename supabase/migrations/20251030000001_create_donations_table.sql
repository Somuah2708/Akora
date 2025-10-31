-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  campaign_id text NOT NULL,
  campaign_title text NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('mobile-money', 'card', 'bank')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  donor_name text,
  donor_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_campaign_id ON public.donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own donations"
  ON public.donations
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert donations"
  ON public.donations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own donations"
  ON public.donations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_donations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donations_updated_at();
