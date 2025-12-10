-- ========================================
-- DROP ALL EXISTING DONATION TABLES & DEPENDENCIES
-- ========================================

-- Drop tables first (with CASCADE to remove all dependencies including triggers, policies, etc.)
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS donation_campaigns CASCADE;
DROP TABLE IF EXISTS donor_tiers CASCADE;

-- Drop functions (if they exist independently)
DROP FUNCTION IF EXISTS update_campaign_amount() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ========================================
-- CREATE FRESH DONATION TABLES
-- ========================================

-- Create donation campaigns table
CREATE TABLE donation_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  campaign_image TEXT,
  category TEXT NOT NULL CHECK (category IN ('Infrastructure', 'Scholarship', 'Equipment', 'Emergency', 'Sports', 'Technology', 'Library', 'Other')),
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  donors_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create donations table
CREATE TABLE donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES donation_campaigns(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'GHS',
  payment_proof_url TEXT,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'mobile_money', 'card', 'cash', 'other')),
  is_anonymous BOOLEAN DEFAULT FALSE,
  donor_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create donor recognition tiers table
CREATE TABLE donor_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_amount DECIMAL(12, 2) NOT NULL,
  badge_color TEXT,
  badge_icon TEXT,
  benefits TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default donor tiers
INSERT INTO donor_tiers (name, min_amount, badge_color, badge_icon, benefits, display_order)
VALUES
  ('Bronze Supporter', 100, '#CD7F32', '🥉', ARRAY['Recognition on donor wall', 'Thank you email'], 1),
  ('Silver Patron', 500, '#C0C0C0', '🥈', ARRAY['Recognition on donor wall', 'Quarterly newsletter', 'Certificate of appreciation'], 2),
  ('Gold Benefactor', 1000, '#FFD700', '🥇', ARRAY['Recognition on donor wall', 'Quarterly newsletter', 'Certificate of appreciation', 'Name on dedicated plaque'], 3),
  ('Platinum Champion', 5000, '#E5E4E2', '💎', ARRAY['All Gold benefits', 'Invitation to annual donor appreciation event', 'Personal thank you from principal'], 4),
  ('Diamond Legacy', 10000, '#B9F2FF', '👑', ARRAY['All Platinum benefits', 'Permanent recognition on campus', 'Naming opportunity for major projects'], 5);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON donation_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON donation_campaigns(created_at DESC);

-- Enable Row Level Security
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_tiers ENABLE ROW LEVEL SECURITY;

-- Policies for donation_campaigns
CREATE POLICY "Anyone can view active campaigns"
  ON donation_campaigns FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage campaigns"
  ON donation_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policies for donations
CREATE POLICY "Users can view their own donations"
  ON donations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all donations"
  ON donations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can create donations"
  ON donations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update donation status"
  ON donations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policies for donor_tiers
CREATE POLICY "Anyone can view donor tiers"
  ON donor_tiers FOR SELECT
  USING (true);

-- Function to update campaign amount when donation is approved
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE donation_campaigns
    SET 
      current_amount = current_amount + NEW.amount,
      donors_count = donors_count + 1,
      updated_at = NOW()
    WHERE id = NEW.campaign_id;
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE donation_campaigns
    SET 
      current_amount = GREATEST(current_amount - NEW.amount, 0),
      donors_count = GREATEST(donors_count - 1, 0),
      updated_at = NOW()
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update campaign amounts
CREATE TRIGGER update_campaign_on_donation_approval
  AFTER INSERT OR UPDATE OF status ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_amount();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_donation_campaigns_updated_at
  BEFORE UPDATE ON donation_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ Donation tables successfully dropped and recreated!';
  RAISE NOTICE '📊 Tables created: donation_campaigns, donations, donor_tiers';
  RAISE NOTICE '🔒 RLS policies applied';
  RAISE NOTICE '⚡ Triggers and functions configured';
  RAISE NOTICE '🏆 5 donor tiers inserted';
END $$;
