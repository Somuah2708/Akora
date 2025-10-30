-- Create donors table to track unique donors
CREATE TABLE IF NOT EXISTS public.donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  total_donated DECIMAL(12, 2) DEFAULT 0,
  donation_count INTEGER DEFAULT 0,
  first_donation_date TIMESTAMPTZ,
  last_donation_date TIMESTAMPTZ,
  preferred_payment_method TEXT,
  is_recurring_donor BOOLEAN DEFAULT false,
  recognition_level TEXT CHECK (recognition_level IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  is_anonymous BOOLEAN DEFAULT false,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

-- Create indexes for faster queries
CREATE INDEX idx_donors_user_id ON public.donors(user_id);
CREATE INDEX idx_donors_email ON public.donors(email);
CREATE INDEX idx_donors_total_donated ON public.donors(total_donated DESC);
CREATE INDEX idx_donors_donation_count ON public.donors(donation_count DESC);

-- Enable RLS
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view non-anonymous donors"
  ON public.donors
  FOR SELECT
  USING (is_anonymous = false OR auth.uid() = user_id);

CREATE POLICY "Anyone can create donor profiles"
  ON public.donors
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own donor profile"
  ON public.donors
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update donor statistics when a donation is made
CREATE OR REPLACE FUNCTION update_donor_stats()
RETURNS TRIGGER AS $$
DECLARE
  donor_record RECORD;
BEGIN
  -- Only update if donation is completed
  IF NEW.status = 'completed' THEN
    -- Find or create donor record
    SELECT * INTO donor_record FROM public.donors WHERE email = NEW.donor_email LIMIT 1;
    
    IF NOT FOUND THEN
      -- Create new donor record
      INSERT INTO public.donors (
        user_id,
        name,
        email,
        total_donated,
        donation_count,
        first_donation_date,
        last_donation_date,
        preferred_payment_method
      ) VALUES (
        NEW.user_id,
        NEW.donor_name,
        NEW.donor_email,
        NEW.amount,
        1,
        NEW.created_at,
        NEW.created_at,
        NEW.payment_method
      );
    ELSE
      -- Update existing donor record
      UPDATE public.donors
      SET
        total_donated = total_donated + NEW.amount,
        donation_count = donation_count + 1,
        last_donation_date = NEW.created_at,
        is_recurring_donor = (donation_count + 1) >= 3,
        recognition_level = CASE
          WHEN (total_donated + NEW.amount) >= 100000 THEN 'diamond'
          WHEN (total_donated + NEW.amount) >= 50000 THEN 'platinum'
          WHEN (total_donated + NEW.amount) >= 25000 THEN 'gold'
          WHEN (total_donated + NEW.amount) >= 10000 THEN 'silver'
          WHEN (total_donated + NEW.amount) >= 5000 THEN 'bronze'
          ELSE recognition_level
        END,
        updated_at = NOW()
      WHERE id = donor_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update donor stats after donation
CREATE TRIGGER update_donor_stats_trigger
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donor_stats();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_donors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_donors_updated_at
  BEFORE UPDATE ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION update_donors_updated_at();

-- Create view for donor leaderboard
CREATE OR REPLACE VIEW donor_leaderboard AS
SELECT 
  id,
  name,
  avatar_url,
  total_donated,
  donation_count,
  recognition_level,
  is_recurring_donor,
  last_donation_date
FROM public.donors
WHERE is_anonymous = false
ORDER BY total_donated DESC;

-- Insert some sample donors (optional)
INSERT INTO public.donors (name, email, total_donated, donation_count, recognition_level, first_donation_date, last_donation_date, is_recurring_donor)
VALUES 
  ('John Mensah', 'john.mensah@example.com', 75000, 12, 'platinum', '2025-01-15', '2025-10-20', true),
  ('Grace Asante', 'grace.asante@example.com', 45000, 8, 'gold', '2025-02-10', '2025-10-18', true),
  ('Kwame Osei', 'kwame.osei@example.com', 30000, 5, 'gold', '2025-03-05', '2025-10-15', true),
  ('Abena Boateng', 'abena.boateng@example.com', 18000, 4, 'silver', '2025-04-12', '2025-10-10', false),
  ('Samuel Agyeman', 'samuel.agyeman@example.com', 12000, 3, 'silver', '2025-05-20', '2025-10-05', true)
ON CONFLICT (email) DO NOTHING;
