-- =====================================================
-- COURSES DATA
-- Sample data for academic courses and programs
-- =====================================================

-- Insert Courses data into products_services table
INSERT INTO products_services (
  title,
  description,
  category_name,
  duration,
  location,
  image_url,
  is_approved,
  created_at
) VALUES
(
  'BSc Computer Science',
  'Comprehensive 4-year degree program covering software engineering, data structures, algorithms, AI, and machine learning. Includes practical projects and industry internships.',
  'Courses',
  '4 Years',
  'University of Ghana, Legon',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
  true,
  NOW()
),
(
  'Medicine & Surgery (MBChB)',
  ' 6-year medical degree program training future doctors. Combines theoretical knowledge with clinical practice. Includes rotations in major hospitals across Ghana.',
  'Courses',
  '6 Years',
  'University of Ghana Medical School',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
  true,
  NOW()
),
(
  'BSc Electrical Engineering',
  'Four-year engineering program focusing on power systems, electronics, telecommunications, and control systems. ABET accredited program.',
  'Courses',
  '4 Years',
  'KNUST, Kumasi',
  'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
  true,
  NOW()
),
(
  'Bachelor of Law (LLB)',
  'Comprehensive law degree covering constitutional law, criminal law, contract law, and legal practice. Prepares students for the bar examination.',
  'Courses',
  '4 Years',
  'University of Ghana Law School',
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
  true,
  NOW()
),
(
  'BSc Business Administration',
  'Dynamic business program covering management, marketing, finance, and entrepreneurship. Includes case studies and business simulations.',
  'Courses',
  '4 Years',
  'University of Cape Coast',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
  true,
  NOW()
),
(
  'BSc Nursing',
  'Professional nursing program combining classroom instruction with clinical experience. Prepares graduates for nursing practice and licensure examination.',
  'Courses',
  '4 Years',
  'KNUST, Kumasi',
  'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800',
  true,
  NOW()
),
(
  'BA Economics',
  'Rigorous economics program covering micro and macro economics, econometrics, and development economics. Strong focus on data analysis.',
  'Courses',
  '4 Years',
  'University of Ghana, Legon',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
  true,
  NOW()
),
(
  'BSc Architecture',
  'Creative architecture program blending art, science, and technology. Students learn design, construction, and sustainable building practices.',
  'Courses',
  '5 Years',
  'KNUST, Kumasi',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800',
  true,
  NOW()
),
(
  'BSc Pharmacy',
  'Professional pharmacy program covering pharmaceutical sciences, drug formulation, and clinical pharmacy. Prepares for pharmacist licensure.',
  'Courses',
  '5 Years',
  'KNUST, Kumasi',
  'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800',
  true,
  NOW()
),
(
  'BA Communication Studies',
  'Comprehensive media and communication program covering journalism, public relations, digital media, and broadcasting.',
  'Courses',
  '4 Years',
  'University of Ghana, Legon',
  'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800',
  true,
  NOW()
),
(
  'BSc Agricultural Science',
  'Modern agriculture program covering crop production, soil science, agribusiness, and sustainable farming practices.',
  'Courses',
  '4 Years',
  'University of Cape Coast',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800',
  true,
  NOW()
),
(
  'BSc Biochemistry',
  'Advanced science program exploring molecular biology, genetics, and chemical processes in living organisms. Research-focused curriculum.',
  'Courses',
  '4 Years',
  'University of Ghana, Legon',
  'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
  true,
  NOW()
);

-- Add comment
COMMENT ON TABLE products_services IS 'Extended to include academic Courses and Programs';
