-- SEED_EXAMPLE_DONORS.sql
-- Creates example donors with approved donations to test the All Donors screen
-- Run this AFTER you have seeded campaigns and have real user profiles

-- Note: Replace the user_id values below with actual user IDs from your profiles table
-- You can get real user IDs by running: SELECT id, full_name FROM profiles LIMIT 10;

-- Example donations from different users (replace with real user IDs)
INSERT INTO donations (
  user_id,
  campaign_id,
  amount,
  payment_method,
  payment_reference,
  receipt_url,
  donor_message,
  is_anonymous,
  status,
  admin_notes,
  created_at
) VALUES
-- Donor 1: Multiple donations (will be top donor)
(
  'YOUR_USER_ID_1', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 0),
  5000.00,
  'bank_transfer',
  'BT-2024-001',
  'https://example.com/receipt1.jpg',
  'Happy to support the library renovation!',
  false,
  'approved',
  'Receipt verified - Bank Transfer confirmed',
  NOW() - INTERVAL '30 days'
),
(
  'YOUR_USER_ID_1', -- Same donor, second donation
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 1),
  3000.00,
  'mobile_money',
  'MM-2024-002',
  'https://example.com/receipt2.jpg',
  'For the scholarship fund',
  false,
  'approved',
  'MoMo transaction verified',
  NOW() - INTERVAL '15 days'
),
(
  'YOUR_USER_ID_1', -- Same donor, third donation
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 2),
  2000.00,
  'bank_transfer',
  'BT-2024-003',
  'https://example.com/receipt3.jpg',
  null,
  false,
  'approved',
  'Receipt verified',
  NOW() - INTERVAL '5 days'
),

-- Donor 2: Two donations
(
  'YOUR_USER_ID_2', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 0),
  4000.00,
  'mobile_money',
  'MM-2024-004',
  'https://example.com/receipt4.jpg',
  'Proud alumnus!',
  false,
  'approved',
  'Payment confirmed',
  NOW() - INTERVAL '25 days'
),
(
  'YOUR_USER_ID_2', -- Same donor, second donation
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 3),
  1500.00,
  'bank_transfer',
  'BT-2024-005',
  'https://example.com/receipt5.jpg',
  null,
  false,
  'approved',
  'Receipt verified',
  NOW() - INTERVAL '10 days'
),

-- Donor 3: One donation
(
  'YOUR_USER_ID_3', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 1),
  3500.00,
  'bank_transfer',
  'BT-2024-006',
  'https://example.com/receipt6.jpg',
  'Great initiative!',
  false,
  'approved',
  'Bank transfer confirmed',
  NOW() - INTERVAL '20 days'
),

-- Donor 4: One donation
(
  'YOUR_USER_ID_4', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 2),
  2500.00,
  'mobile_money',
  'MM-2024-007',
  'https://example.com/receipt7.jpg',
  null,
  false,
  'approved',
  'MoMo verified',
  NOW() - INTERVAL '18 days'
),

-- Donor 5: Anonymous donor (one donation)
(
  'YOUR_USER_ID_5', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 0),
  1000.00,
  'bank_transfer',
  'BT-2024-008',
  'https://example.com/receipt8.jpg',
  'Wish to remain anonymous',
  true, -- Anonymous
  'approved',
  'Receipt verified',
  NOW() - INTERVAL '12 days'
),

-- Donor 6: One donation
(
  'YOUR_USER_ID_6', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 4),
  5000.00,
  'bank_transfer',
  'BT-2024-009',
  'https://example.com/receipt9.jpg',
  'Love Achimota!',
  false,
  'approved',
  'Large donation verified',
  NOW() - INTERVAL '8 days'
),

-- Donor 7: Anonymous donor (one donation)
(
  'YOUR_USER_ID_7', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 3),
  500.00,
  'mobile_money',
  'MM-2024-010',
  'https://example.com/receipt10.jpg',
  null,
  true, -- Anonymous
  'approved',
  'Payment confirmed',
  NOW() - INTERVAL '6 days'
),

-- Donor 8: One donation
(
  'YOUR_USER_ID_8', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 1),
  2000.00,
  'bank_transfer',
  'BT-2024-011',
  'https://example.com/receipt11.jpg',
  'Happy to help!',
  false,
  'approved',
  'Receipt verified',
  NOW() - INTERVAL '4 days'
),

-- A few pending donations (won't show in donors list)
(
  'YOUR_USER_ID_9', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 0),
  750.00,
  'mobile_money',
  'MM-2024-012',
  'https://example.com/receipt12.jpg',
  null,
  false,
  'pending',
  null,
  NOW() - INTERVAL '1 day'
),
(
  'YOUR_USER_ID_10', -- Replace with real user ID
  (SELECT id FROM donation_campaigns LIMIT 1 OFFSET 2),
  1200.00,
  'bank_transfer',
  'BT-2024-013',
  'https://example.com/receipt13.jpg',
  'Looking forward to approval',
  false,
  'pending',
  null,
  NOW() - INTERVAL '2 hours'
);

-- Verify the donors
SELECT 
  d.user_id,
  p.full_name,
  d.is_anonymous,
  COUNT(*) as donation_count,
  SUM(d.amount) as total_donated,
  MIN(d.created_at) as first_donation_date
FROM donations d
LEFT JOIN profiles p ON d.user_id = p.id
WHERE d.status = 'approved'
GROUP BY d.user_id, p.full_name, d.is_anonymous
ORDER BY donation_count DESC, total_donated DESC;
