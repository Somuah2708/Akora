-- =====================================================
-- STUDY GROUPS DATA
-- Sample data for study groups and peer learning
-- =====================================================

-- Insert Study Groups data into products_services table
INSERT INTO products_services (
  title,
  description,
  category_name,
  member_count,
  image_url,
  is_approved,
  created_at
) VALUES
(
  'WASSCE 2025 Mathematics Study Group',
  'Active study group for students preparing for WASSCE 2025 mathematics. Daily problem-solving sessions, past questions review, and peer tutoring. Meets every Tuesday and Thursday.',
  'Study Groups',
  45,
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
  true,
  NOW()
),
(
  'Science Students Community - Physics & Chemistry',
  'Collaborative learning group for physics and chemistry students. Share notes, discuss complex topics, and prepare for practicals together. WhatsApp group active 24/7.',
  'Study Groups',
  78,
  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
  true,
  NOW()
),
(
  'Medical School Aspirants Circle',
  'Support group for students aspiring to study medicine. Share resources, application tips, scholarship opportunities, and motivation. Includes current med students as mentors.',
  'Study Groups',
  62,
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
  true,
  NOW()
),
(
  'Engineering Study Hub - KNUST Prep',
  'Study group for students preparing for KNUST engineering programs. Focus on math, physics, and technical drawing. Weekly virtual study sessions.',
  'Study Groups',
  54,
  'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800',
  true,
  NOW()
),
(
  'English Literature & Essay Writing Group',
  'Literary discussion and essay writing practice group. Read and analyze literature together, critique each other\'s essays, and improve writing skills.',
  'Study Groups',
  38,
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
  true,
  NOW()
),
(
  'Business Students Network Ghana',
  'Networking and study group for business administration, accounting, and economics students. Share case studies, job opportunities, and business insights.',
  'Study Groups',
  92,
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
  true,
  NOW()
),
(
  'Biology & Life Sciences Study Squad',
  'Interactive study group for biology students covering botany, zoology, genetics, and ecology. Regular quiz competitions and diagram practice sessions.',
  'Study Groups',
  41,
  'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800',
  true,
  NOW()
),
(
  'Law School Prep & Legal Studies Group',
  'Study group for aspiring lawyers and current law students. Discuss legal cases, practice mooting, and prepare for law school entrance exams.',
  'Study Groups',
  29,
  'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800',
  true,
  NOW()
),
(
  'Computer Science & Programming Circle',
  'Tech-focused study group for CS students and coding enthusiasts. Work on projects together, solve coding challenges, and share learning resources.',
  'Study Groups',
  67,
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
  true,
  NOW()
),
(
  'Geography & Environmental Science Group',
  'Study group for geography students focusing on map reading, fieldwork preparation, and environmental issues. Monthly field trips organized.',
  'Study Groups',
  33,
  'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800',
  true,
  NOW()
),
(
  'French Language Learning Collective',
  'Practice French language skills together. Conversation practice, grammar drills, and cultural discussions. All levels welcome from beginners to advanced.',
  'Study Groups',
  26,
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
  true,
  NOW()
),
(
  'SHS 3 Final Year Exam Warriors',
  'Support group specifically for SHS 3 students in their final year. Comprehensive exam preparation across all subjects. Motivation and stress management support.',
  'Study Groups',
  115,
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  true,
  NOW()
);

-- Add comment
COMMENT ON TABLE products_services IS 'Extended to include Study Groups for collaborative learning';
