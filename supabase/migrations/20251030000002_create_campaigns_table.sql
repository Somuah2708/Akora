-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  raised_amount DECIMAL(12, 2) DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('infrastructure', 'scholarships', 'research', 'community')),
  end_date DATE NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active campaigns
CREATE POLICY "Anyone can view active campaigns"
  ON campaigns
  FOR SELECT
  USING (status = 'active');

-- Allow anyone to create campaigns (for testing, can restrict later)
CREATE POLICY "Anyone can create campaigns"
  ON campaigns
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own campaigns
CREATE POLICY "Users can update own campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Create storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view campaign images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'campaign-images');

CREATE POLICY "Anyone can upload campaign images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'campaign-images');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample campaigns
INSERT INTO campaigns (title, description, target_amount, raised_amount, category, end_date, image_urls, status)
VALUES 
  (
    'New Science Laboratory',
    'Help us build a state-of-the-art science laboratory to enhance practical learning for our students.',
    50000,
    32500,
    'infrastructure',
    '2025-12-31',
    ARRAY['https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800'],
    'active'
  ),
  (
    'Student Scholarship Fund',
    'Support deserving students who need financial assistance to continue their education.',
    25000,
    18750,
    'scholarships',
    '2025-11-30',
    ARRAY['https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800'],
    'active'
  ),
  (
    'Research Grant Program',
    'Fund innovative research projects that advance knowledge in critical fields.',
    30000,
    12000,
    'research',
    '2025-12-15',
    ARRAY['https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800'],
    'active'
  ),
  (
    'Community Outreach Initiative',
    'Expand our community programs to reach more underserved populations.',
    15000,
    8500,
    'community',
    '2025-11-20',
    ARRAY['https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800'],
    'active'
  );
