-- Sample donation campaigns for Achimota School

INSERT INTO donation_campaigns (
  title, 
  description, 
  goal_amount, 
  current_amount,
  campaign_image,
  category,
  deadline,
  status,
  donors_count
) VALUES
(
  'New Science Laboratory Complex',
  'Help us build a state-of-the-art science laboratory complex with modern equipment for Physics, Chemistry, and Biology. This facility will serve over 2,000 students annually and prepare them for careers in STEM fields. The complex will include 6 fully-equipped labs, prep rooms, and a science resource center.',
  500000.00,
  285000.00,
  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
  'Infrastructure',
  NOW() + INTERVAL '90 days',
  'active',
  147
),
(
  'Full Scholarship Fund 2024',
  'Provide complete 4-year scholarships for 20 academically excellent but financially challenged students. Each scholarship covers tuition, boarding, textbooks, uniforms, and educational supplies. Your contribution ensures no brilliant student is denied education due to financial constraints.',
  200000.00,
  145000.00,
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  'Scholarship',
  NOW() + INTERVAL '120 days',
  'active',
  98
),
(
  'Digital Learning Resources',
  'Equip our school with 200 tablets, 100 laptops, interactive whiteboards, and a school-wide WiFi upgrade. Enable digital literacy and prepare students for the modern workplace. Includes teacher training and learning management system setup.',
  150000.00,
  95000.00,
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800',
  'Technology',
  NOW() + INTERVAL '60 days',
  'active',
  67
),
(
  'Sports Complex Renovation',
  'Renovate our athletics track, basketball courts, football pitch, and build a new multi-purpose sports hall. Support our legacy in sports excellence and student wellness. Facilities will serve students, alumni games, and community events.',
  300000.00,
  120000.00,
  'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800',
  'Sports',
  NOW() + INTERVAL '150 days',
  'active',
  82
),
(
  'Library Expansion & Modernization',
  'Double our library capacity to 50,000 books, create quiet study zones, add 30 computer stations, and digitize our rare book collection. Include comfortable seating, climate control, and extended hours support.',
  120000.00,
  45000.00,
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800',
  'Library',
  NOW() + INTERVAL '100 days',
  'active',
  43
),
(
  'Emergency Student Support Fund',
  'Rapid response fund for students facing unexpected crises - medical emergencies, family hardships, urgent financial needs. Ensure no student drops out due to temporary setbacks. This fund has already helped 35 students this year.',
  50000.00,
  32000.00,
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800',
  'Emergency',
  NOW() + INTERVAL '180 days',
  'active',
  156
),
(
  'Music & Arts Center',
  'Build a dedicated center for music, drama, and visual arts. Include soundproof practice rooms, a 200-seat auditorium, art studios, and instrument storage. Preserve our rich cultural heritage and nurture creative talents.',
  250000.00,
  85000.00,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  'Infrastructure',
  NOW() + INTERVAL '200 days',
  'active',
  58
),
(
  'Teacher Development Program',
  'Fund professional development for 50 teachers - workshops, international conferences, advanced certifications, and subject-specific training. Invest in those who shape our future leaders.',
  80000.00,
  25000.00,
  'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800',
  'Other',
  NOW() + INTERVAL '75 days',
  'active',
  34
);

-- Update the campaigns with realistic created_at dates
UPDATE donation_campaigns 
SET created_at = NOW() - INTERVAL '30 days' * RANDOM()
WHERE created_at IS NOT NULL;
