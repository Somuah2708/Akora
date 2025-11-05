-- =====================================================
-- ALUMNI MENTORS DATA
-- Sample data for alumni mentors and lecturers
-- =====================================================

-- Insert Alumni Mentors data into products_services table
INSERT INTO products_services (
  title,
  description,
  category_name,
  location,
  image_url,
  is_approved,
  created_at
) VALUES
(
  'Dr. Kwame Mensah',
  'Former Head of Mathematics Department at Achimota School. PhD in Applied Mathematics from MIT. Available to mentor students in STEM fields and university applications.',
  'Alumni Mentors',
  'Accra, Ghana',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  true,
  NOW()
),
(
  'Prof. Ama Asante',
  'Alumni of Wesley Girls High School. Professor of Computer Science at University of Ghana. Specializes in AI and Machine Learning. Mentoring in tech careers and scholarship applications.',
  'Alumni Mentors',
  'Legon, Accra',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
  true,
  NOW()
),
(
  'Mr. Kofi Boateng',
  'Prempeh College alumnus. Senior Engineer at Google. BSc from KNUST, MSc from Stanford. Offering guidance on engineering programs and tech industry careers.',
  'Alumni Mentors',
  'Kumasi, Ghana',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
  true,
  NOW()
),
(
  'Dr. Abena Osei',
  'Ghana International School graduate. Medical Doctor and Public Health Specialist. Yale Medical School graduate. Mentoring pre-med students and health science paths.',
  'Alumni Mentors',
  'Accra, Ghana',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
  true,
  NOW()
),
(
  'Ing. Yaw Agyeman',
  'St. Augustine College alumnus. Civil Engineer with 15 years experience. Available for mentorship in engineering and construction management.',
  'Alumni Mentors',
  'Cape Coast, Ghana',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
  true,
  NOW()
),
(
  'Ms. Efua Darko',
  'Wesley Girls High School alumna. International Lawyer specializing in Human Rights. Harvard Law School graduate. Mentoring law students and aspiring lawyers.',
  'Alumni Mentors',
  'Accra, Ghana',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800',
  true,
  NOW()
),
(
  'Dr. Kwabena Frimpong',
  'Opoku Ware School alumnus. Lecturer in Economics at University of Cape Coast. PhD from Oxford. Specializes in development economics and research guidance.',
  'Alumni Mentors',
  'Cape Coast, Ghana',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
  true,
  NOW()
),
(
  'Madam Adjoa Owusu',
  'Former English teacher at Achimota School. 25 years teaching experience. Now educational consultant helping students with university essays and applications.',
  'Alumni Mentors',
  'Accra, Ghana',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800',
  true,
  NOW()
),
(
  'Mr. Emmanuel Ansah',
  'Mfantsipim School alumnus. Chartered Accountant and CFO. ACCA qualified. Available for mentoring in business, finance, and accounting careers.',
  'Alumni Mentors',
  'Takoradi, Ghana',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
  true,
  NOW()
),
(
  'Dr. Akosua Sarpong',
  'Holy Child School alumna. Lecturer in Biology at KNUST. PhD in Molecular Biology from Cambridge. Mentoring science students and research aspirants.',
  'Alumni Mentors',
  'Kumasi, Ghana',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
  true,
  NOW()
);

-- Add comment
COMMENT ON TABLE products_services IS 'Extended to include Alumni Mentors for student guidance and mentorship';
