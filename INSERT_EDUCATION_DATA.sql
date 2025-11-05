-- =====================================================
-- INSERT SAMPLE EDUCATION DATA
-- For all new education tabs
-- NOTE: Replace 'YOUR_USER_ID_HERE' with an actual user UUID from auth.users
-- Or run: SELECT id FROM auth.users LIMIT 1; to get a user ID
-- =====================================================

-- ============ ALUMNI MENTORS ============
INSERT INTO products_services (
  user_id,
  title, 
  description, 
  category_name, 
  image_url, 
  location,
  is_approved,
  price
) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Dr. Kwame Mensah',
  'Lecturer in Computer Science at KNUST. Specialized in AI and Machine Learning. Available to mentor students interested in tech careers. Over 15 years teaching experience.',
  'Alumni Mentors',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  'Kumasi, Ghana',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Prof. Akosua Dartey',
  'Dean of Business School at University of Ghana. Expert in entrepreneurship and startup development. Passionate about mentoring young business minds.',
  'Alumni Mentors',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
  'Accra, Ghana',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Eng. Yaw Boateng',
  'Civil Engineering lecturer at KNUST. 20+ years industry experience. Helps students with engineering projects and career guidance.',
  'Alumni Mentors',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
  'Kumasi, Ghana',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Dr. Ama Serwaa',
  'Medical Doctor and lecturer at UG Medical School. Specialized in Public Health. Mentors pre-med and medical students.',
  'Alumni Mentors',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800',
  'Accra, Ghana',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Mr. Kofi Asante',
  'Economics lecturer at University of Cape Coast. Former World Bank consultant. Guides students in economics and development studies.',
  'Alumni Mentors',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
  'Cape Coast, Ghana',
  true,
  0;

-- ============ STUDY RESOURCES ============
INSERT INTO products_services (
  user_id,
  title, 
  description, 
  category_name, 
  image_url,
  price,
  is_approved
) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'WASSCE Past Questions 2020-2024',
  'Complete collection of West African Senior School Certificate Examination past questions with detailed solutions. Covers all core subjects including Mathematics, English, Science, and Social Studies.',
  'Study Resources',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
  50,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'University Entrance Exam Guide',
  'Comprehensive guide for university entrance examinations in Ghana. Includes practice tests, study tips, and exam strategies for KNUST, UG, and UCC entrance exams.',
  'Study Resources',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
  0,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Engineering Mathematics Notes',
  'Detailed lecture notes for Engineering Mathematics I & II. Covers calculus, linear algebra, differential equations with worked examples.',
  'Study Resources',
  'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800',
  30,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Medical School Study Pack',
  'Essential study materials for medical students. Includes anatomy diagrams, physiology notes, and pharmacology summaries.',
  'Study Resources',
  'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
  80,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Business Studies Complete Notes',
  'Full semester notes for Business Administration students. Covers accounting, marketing, management, and business law.',
  'Study Resources',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
  0,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Computer Science Programming Bundle',
  'Code examples and tutorials for C++, Java, Python, and Data Structures. Perfect for CS students.',
  'Study Resources',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800',
  45,
  true;

-- ============ COURSES & PROGRAMS ============
INSERT INTO products_services (
  user_id,
  title, 
  description, 
  category_name, 
  image_url,
  price,
  is_approved
) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Web Development Bootcamp - 12 weeks',
  'Learn HTML, CSS, JavaScript, React, and Node.js in 12 weeks. Build real-world projects and get job-ready skills for tech industry.',
  'Courses',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
  1200,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Digital Marketing Masterclass - 8 weeks',
  'Complete digital marketing course covering SEO, social media marketing, content marketing, and analytics. Perfect for entrepreneurs.',
  'Courses',
  'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c293?w=800',
  800,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Data Science with Python - 10 weeks',
  'Master data analysis, visualization, and machine learning with Python. Includes pandas, NumPy, and scikit-learn.',
  'Courses',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
  1500,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Graphic Design Fundamentals - 6 weeks',
  'Learn Adobe Photoshop, Illustrator, and InDesign. Create logos, posters, and digital designs professionally.',
  'Courses',
  'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800',
  600,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Business English Course - 4 weeks',
  'Improve your professional English skills for workplace communication, presentations, and business writing.',
  'Courses',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800',
  400,
  true
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Mobile App Development - 14 weeks',
  'Build iOS and Android apps using React Native. Learn mobile UI/UX design and app deployment.',
  'Courses',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800',
  1800,
  true;

-- ============ STUDY GROUPS ============
INSERT INTO products_services (
  user_id,
  title, 
  description, 
  category_name, 
  image_url,
  is_approved,
  price
) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Medical Students Study Circle - 24 members',
  'Weekly study sessions for medical students. We cover anatomy, physiology, and clinical cases together. Meet every Saturday at UG Medical School Library.',
  'Study Groups',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Engineering Math Group - 18 members',
  'Collaborative learning for Engineering Mathematics. Solve problems together and share solutions. Online and in-person sessions available.',
  'Study Groups',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Business Case Study Group - 15 members',
  'Analyze real business cases together. Perfect for MBA and Business Admin students. Meet Wednesdays 5PM.',
  'Study Groups',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Computer Science Coding Club - 32 members',
  'Practice coding challenges, work on projects together, and prepare for tech interviews. All levels welcome!',
  'Study Groups',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Law Students Discussion Forum - 12 members',
  'Discuss legal cases, prepare for moot courts, and study for exams together. Meets twice weekly.',
  'Study Groups',
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'WASSCE Preparation Group - 28 members',
  'SHS students preparing for WASSCE. Study all core subjects together with past questions and group revision.',
  'Study Groups',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
  true,
  0;

-- ============ EDUCATIONAL EVENTS ============
INSERT INTO products_services (
  user_id,
  title, 
  description, 
  category_name, 
  image_url,
  is_approved,
  price
) 
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'University Fair 2025 - Jan 15 @ Accra Intl Conference Centre',
  'Meet representatives from top Ghanaian universities. Learn about programs, admission requirements, and scholarships. Free admission! January 15, 2025 at 9:00 AM.',
  'Educational Events',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Career Guidance Workshop - Jan 22 @ KNUST Great Hall',
  'Expert career counselors will help you choose the right career path. Includes aptitude tests and one-on-one sessions. January 22, 2025 at 2:00 PM in Kumasi.',
  'Educational Events',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
  true,
  20
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Tech Talk: AI in Education - Feb 5 @ UG Accra',
  'Learn how Artificial Intelligence is transforming education. Guest speakers from Google and Microsoft. February 5, 2025 at 10:00 AM at University of Ghana.',
  'Educational Events',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Study Abroad Information Session - Feb 12 @ British Council',
  'Learn about studying abroad opportunities, scholarships, and application process for international universities. February 12, 2025 at 3:00 PM at British Council, Accra.',
  'Educational Events',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  true,
  0
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Medical School Admission Seminar - Feb 18 @ Korle Bu',
  'Tips and strategies for getting into medical school. Hear from current medical students and admission officers. February 18, 2025 at 1:00 PM at UG Medical School, Korle Bu.',
  'Educational Events',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
  true,
  15
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Entrepreneurship Bootcamp - Mar 1 @ Ashesi University',
  'Learn how to start and grow your business while in school. Pitch your ideas and network with investors. March 1, 2025 at 9:00 AM at Ashesi University, Berekuso.',
  'Educational Events',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
  true,
  50
UNION ALL
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Research Methods Workshop - Mar 8 @ UCC Cape Coast',
  'Learn research methodology, data collection, and analysis. For undergraduate and graduate students. March 8, 2025 at 10:00 AM at UCC Main Campus, Cape Coast.',
  'Educational Events',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
  true,
  25;

-- Add comment
COMMENT ON TABLE products_services IS 'Extended to include Alumni Mentors, Study Resources, Courses, Study Groups, and Educational Events';
