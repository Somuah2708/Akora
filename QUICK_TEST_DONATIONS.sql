-- QUICK_TEST_DONATIONS.sql
-- Quick test data for the donations table - uses your actual user ID

-- First, let's get your user ID from profiles table (copy the id from the result)
SELECT id, full_name, email, avatar_url
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- After you get your user ID from above, replace 'YOUR_USER_ID_HERE' below with your actual ID

-- Insert test donations (replace YOUR_USER_ID_HERE with your actual user ID)
INSERT INTO donations (
  user_id,
  campaign_id,
  amount,
  payment_method,
  payment_proof_url,
  donor_message,
  is_anonymous,
  status,
  admin_notes,
  created_at
) VALUES
-- Your first donation - APPROVED
(
  'YOUR_USER_ID_HERE',
  (SELECT id FROM donation_campaigns ORDER BY created_at LIMIT 1),
  5000.00,
  'bank_transfer',
  'https://via.placeholder.com/300',
  'Happy to support Achimota!',
  false,
  'approved',
  'Test donation - approved',
  NOW() - INTERVAL '10 days'
),
-- Your second donation - APPROVED
(
  'YOUR_USER_ID_HERE',
  (SELECT id FROM donation_campaigns ORDER BY created_at LIMIT 1 OFFSET 1),
  3000.00,
  'mobile_money',
  'https://via.placeholder.com/300',
  'For the scholarship fund',
  false,
  'approved',
  'Test donation - approved',
  NOW() - INTERVAL '5 days'
),
-- Your third donation - PENDING
(
  'YOUR_USER_ID_HERE',
  (SELECT id FROM donation_campaigns ORDER BY created_at LIMIT 1 OFFSET 2),
  2000.00,
  'bank_transfer',
  'https://via.placeholder.com/300',
  'Another contribution',
  false,
  'pending',
  NULL,
  NOW() - INTERVAL '1 day'
),
-- Anonymous donation - APPROVED
(
  'YOUR_USER_ID_HERE',
  (SELECT id FROM donation_campaigns ORDER BY created_at LIMIT 1),
  1500.00,
  'mobile_money',
  'https://via.placeholder.com/300',
  'Wish to remain anonymous',
  true,
  'approved',
  'Anonymous donor - approved',
  NOW() - INTERVAL '3 days'
);

-- Verify the donations were created
SELECT 
  d.id,
  d.amount,
  d.status,
  d.is_anonymous,
  d.created_at,
  dc.title as campaign_title,
  p.full_name as donor_name
FROM donations d
LEFT JOIN donation_campaigns dc ON d.campaign_id = dc.id
LEFT JOIN profiles p ON d.user_id = p.id
ORDER BY d.created_at DESC
LIMIT 10;

-- Check the stats
SELECT 
  COUNT(*) as total_donations,
  COUNT(DISTINCT user_id) as unique_donors,
  SUM(amount) as total_amount,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  SUM(amount) FILTER (WHERE status = 'approved') as approved_total
FROM donations;
