-- =====================================================
-- EDUCATIONAL EVENTS DATA
-- Sample data for workshops, seminars, and events
-- =====================================================

-- Insert Educational Events data into products_services table
INSERT INTO products_services (
  title,
  description,
  category_name,
  event_date,
  location,
  image_url,
  is_approved,
  created_at
) VALUES
(
  'University Application Workshop 2025',
  'Comprehensive workshop covering university application processes, essay writing, recommendation letters, and interview preparation. Free event with lunch provided.',
  'Educational Events',
  '2025-01-15 09:00:00',
  'Accra International Conference Centre',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  true,
  NOW()
),
(
  'STEM Careers Expo Ghana 2025',
  'Meet professionals from various STEM fields. Interactive exhibits, career talks, and networking opportunities. Perfect for students exploring science and engineering careers.',
  'Educational Events',
  '2025-01-20 10:00:00',
  'KNUST Campus, Kumasi',
  'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800',
  true,
  NOW()
),
(
  'Scholarship Opportunities Seminar',
  'Learn about available scholarships for Ghanaian students - local and international. Application tips from successful scholarship recipients. Q&A session included.',
  'Educational Events',
  '2025-01-25 14:00:00',
  'University of Ghana, Legon',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  true,
  NOW()
),
(
  'Effective Study Techniques Masterclass',
  'Workshop on proven study methods including active recall, spaced repetition, and time management. Led by educational psychologists and top students.',
  'Educational Events',
  '2025-02-01 15:00:00',
  'Accra Academy Hall',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
  true,
  NOW()
),
(
  'Medical School Entrance Exam Bootcamp',
  'Intensive 2-day preparation bootcamp for medical school entrance exams. Covers biology, chemistry, and aptitude tests. Limited slots available.',
  'Educational Events',
  '2025-02-10 08:00:00',
  'Achimota School',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
  true,
  NOW()
),
(
  'Tech Career Fair - Meet Top Tech Companies',
  'Connect with leading tech companies hiring interns and entry-level positions. Bring your CV! Companies include Google, Microsoft, and local startups.',
  'Educational Events',
  '2025-02-14 10:00:00',
  'Accra Digital Centre',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  true,
  NOW()
),
(
  'WASSCE Mathematics Marathon',
  'All-day mathematics revision session covering all topics in WASSCE syllabus. Past questions walkthrough and problem-solving strategies.',
  'Educational Events',
  '2025-02-18 09:00:00',
  'Presbyterian Boys Secondary School',
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800',
  true,
  NOW()
),
(
  'Future Leaders Summit 2025',
  'Youth leadership conference featuring inspiring speakers, panel discussions, and networking. Free registration for high school students.',
  'Educational Events',
  '2025-02-22 08:00:00',
  'National Theatre, Accra',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
  true,
  NOW()
),
(
  'Creative Writing Workshop with Published Authors',
  'Interactive writing workshop with acclaimed Ghanaian authors. Learn storytelling techniques, character development, and get feedback on your work.',
  'Educational Events',
  '2025-03-01 14:00:00',
  'Writers Project Ghana, Accra',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
  true,
  NOW()
),
(
  'Engineering Design Challenge Competition',
  'Team-based engineering competition where students solve real-world problems. Cash prizes and internship opportunities for winners.',
  'Educational Events',
  '2025-03-08 09:00:00',
  'KNUST Engineering Block',
  'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800',
  true,
  NOW()
),
(
  'Study Abroad Fair - European & American Universities',
  'Meet representatives from universities in USA, UK, Canada, and Europe. Learn about programs, admission requirements, and financial aid.',
  'Educational Events',
  '2025-03-15 10:00:00',
  'Movenpick Ambassador Hotel, Accra',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  true,
  NOW()
),
(
  'Mental Health & Exam Stress Workshop',
  'Learn strategies to manage exam anxiety, maintain mental wellness, and stay motivated. Led by clinical psychologists and counselors.',
  'Educational Events',
  '2025-03-20 15:00:00',
  'University of Ghana Hospital',
  'https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=800',
  true,
  NOW()
),
(
  'Science Fair 2025 - Student Research Showcase',
  'Annual science fair where students present research projects. Open to all high schools. Prizes awarded in various categories.',
  'Educational Events',
  '2025-03-25 09:00:00',
  'Ghana Academy of Arts & Sciences',
  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
  true,
  NOW()
),
(
  'Financial Literacy for Students',
  'Workshop on money management, budgeting, student loans, and financial planning. Essential skills for university life and beyond.',
  'Educational Events',
  '2025-04-05 14:00:00',
  'Bank of Ghana Learning Centre',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
  true,
  NOW()
);

-- Add comment
COMMENT ON TABLE products_services IS 'Extended to include Educational Events for workshops and seminars';
