-- =====================================================
-- STUDY RESOURCES DATA
-- Sample data for educational materials and resources
-- =====================================================

-- Insert Study Resources data into products_services table
INSERT INTO products_services (
  title,
  description,
  category_name,
  price,
  image_url,
  is_approved,
  created_at
) VALUES
(
  'Complete WASSCE Mathematics Past Questions (2015-2024)',
  'Comprehensive collection of past WASSCE Mathematics questions with detailed solutions. Includes core and elective mathematics. Digital PDF format with printable worksheets.',
  'Study Resources',
  '50',
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800',
  true,
  NOW()
),
(
  'Physics Notes - SHS 1 to SHS 3 Complete',
  'Well-organized physics notes covering mechanics, electricity, waves, and modern physics. Includes diagrams, formulas, and practice problems. Perfect for exam preparation.',
  'Study Resources',
  '35',
  'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800',
  true,
  NOW()
),
(
  'Chemistry Practical Guide & Lab Reports',
  'Complete guide to chemistry practicals with sample lab reports, safety procedures, and experiment walkthroughs. Covers all SHS chemistry experiments.',
  'Study Resources',
  '40',
  'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=800',
  true,
  NOW()
),
(
  'English Language Essay Writing Masterclass',
  'Comprehensive guide to writing excellent essays for WASSCE. Includes sample essays, grammar rules, and vocabulary enhancement. Free resource for all students.',
  'Study Resources',
  '0',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
  true,
  NOW()
),
(
  'Biology Diagrams & Illustrations Pack',
  'High-quality labeled diagrams for all biology topics. Perfect for visual learners. Includes plant biology, human anatomy, genetics, and ecology diagrams.',
  'Study Resources',
  '25',
  'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800',
  true,
  NOW()
),
(
  'Economics Notes - Micro & Macro Complete',
  'Detailed economics notes covering microeconomics and macroeconomics. Includes case studies, graphs, and real-world examples. Ideal for business students.',
  'Study Resources',
  '30',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  true,
  NOW()
),
(
  'Free WASSCE Revision Timetable & Study Planner',
  'Professionally designed study timetable and planner. Helps organize your revision schedule effectively. Digital download - completely free!',
  'Study Resources',
  '0',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800',
  true,
  NOW()
),
(
  'Geography Map Reading & Interpretation Guide',
  'Complete guide to topographic maps, statistical diagrams, and geographical data interpretation. Essential for geography students.',
  'Study Resources',
  '28',
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800',
  true,
  NOW()
),
(
  'History Essay Questions & Model Answers',
  'Collection of likely history essay questions with model answers. Covers Ghanaian history, African history, and world history topics.',
  'Study Resources',
  '32',
  'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800',
  true,
  NOW()
),
(
  'Elective Mathematics Formula Sheet & Tips',
  'Comprehensive formula sheet for elective mathematics. Includes trigonometry, calculus, and statistics formulas with usage tips and examples.',
  'Study Resources',
  '20',
  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
  true,
  NOW()
),
(
  'French Language Learning Pack - Basic to Advanced',
  'Complete French learning materials with audio files, vocabulary lists, and grammar exercises. Perfect for WASSCE French preparation.',
  'Study Resources',
  '45',
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=800',
  true,
  NOW()
),
(
  'ICT Programming Notes - Python & JavaScript',
  'Beginner-friendly programming notes for ICT students. Covers Python and JavaScript basics with practical coding examples and projects.',
  'Study Resources',
  '38',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800',
  true,
  NOW()
);

-- Add comment
COMMENT ON TABLE products_services IS 'Extended to include Study Resources for educational materials';
