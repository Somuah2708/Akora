-- =====================================================
-- GHANA UNIVERSITIES DATA
-- Insert comprehensive university information
-- =====================================================

-- Note: Replace 'YOUR_USER_ID_HERE' with your actual user ID from Supabase Auth
-- You can get it from: Supabase Dashboard > Authentication > Users > Copy your user ID
-- Or use this query to get the first user: SELECT id FROM auth.users LIMIT 1;

-- Insert Ghanaian Universities into products_services table
INSERT INTO products_services (
  user_id,
  title,
  description,
  category_name,
  image_url,
  location,
  application_url,
  contact_email,
  eligibility_criteria,
  price,
  is_approved,
  created_at
) VALUES 
-- Public Universities
(
  (SELECT id FROM auth.users LIMIT 1),
  'University of Ghana',
  'The premier university in Ghana, established in 1948. Offers undergraduate and postgraduate programs across various disciplines including Sciences, Arts, Business, Law, and Engineering. Known for excellence in research and academic innovation.',
  'Universities',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
  'Legon, Accra, Ghana',
  'https://www.ug.edu.gh/admissions',
  'info@ug.edu.gh',
  'WASSCE/SSSCE with minimum grade requirements. International qualifications accepted. Mature students with relevant work experience considered.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Kwame Nkrumah University of Science and Technology (KNUST)',
  'Leading science and technology university in Ghana, established in 1952. Specializes in Engineering, Science, Agriculture, Health Sciences, Architecture, and Business. Largest university in Ghana by student population.',
  'Universities',
  'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800',
  'Kumasi, Ghana',
  'https://www.knust.edu.gh/admissions',
  'admissions@knust.edu.gh',
  'WASSCE/SSSCE with passes in relevant subjects. Strong emphasis on mathematics and sciences for technical programs. Mature entry available.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'University of Cape Coast (UCC)',
  'Established in 1962, UCC is renowned for teacher education and training. Offers comprehensive programs in Education, Sciences, Arts, Business, and Agriculture. Beautiful coastal campus with modern facilities.',
  'Universities',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  'Cape Coast, Central Region, Ghana',
  'https://www.ucc.edu.gh/admissions',
  'info@ucc.edu.gh',
  'WASSCE/SSSCE with minimum aggregate. Teacher training programs require specific subject combinations. Distance learning options available.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'University for Development Studies (UDS)',
  'Multi-campus university established in 1992, focusing on developmental studies. Campuses in Tamale, Wa, and Navrongo. Strong emphasis on agriculture, health sciences, and community development.',
  'Universities',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
  'Tamale, Northern Region, Ghana',
  'https://www.uds.edu.gh/admissions',
  'admissions@uds.edu.gh',
  'WASSCE/SSSCE qualification. Third Trimester Field Practical Programme (TTFPP) required for all students. Special consideration for Northern Ghana applicants.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'University of Education, Winneba (UEW)',
  'Premier teacher education university in Ghana, established in 1992. Multiple campuses specializing in education, creative arts, business, and agricultural sciences. Strong focus on practical teacher training.',
  'Universities',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
  'Winneba, Central Region, Ghana',
  'https://www.uew.edu.gh/admissions',
  'info@uew.edu.gh',
  'WASSCE/SSSCE with relevant passes. Education programs require specific subject passes. Diploma holders can apply for top-up programs.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'University of Mines and Technology (UMaT)',
  'Specialized university established in 2004, focusing on mining, minerals, oil and gas, environmental sciences, and related engineering disciplines. State-of-the-art facilities and industry partnerships.',
  'Universities',
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
  'Tarkwa, Western Region, Ghana',
  'https://www.umat.edu.gh/admissions',
  'admissions@umat.edu.gh',
  'WASSCE/SSSCE with strong mathematics and science background. Engineering programs require physics and mathematics. Industry experience valued.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Ghana Institute of Management and Public Administration (GIMPA)',
  'Premier business and public administration institution, established in 1961. Offers undergraduate and postgraduate programs in Business, Law, Public Administration, Technology, and Governance.',
  'Universities',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
  'Greenhill, Accra, Ghana',
  'https://www.gimpa.edu.gh/admissions',
  'admissions@gimpa.edu.gh',
  'WASSCE/SSSCE for undergraduate. Professional qualifications accepted. Working professionals and mature students welcome. Strong emphasis on practical management skills.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'University of Health and Allied Sciences (UHAS)',
  'Established in 2011, specializing in health sciences and allied health professions. Modern medical facilities and teaching hospital. Programs in Medicine, Nursing, Public Health, and Allied Health Sciences.',
  'Universities',
  'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800',
  'Ho, Volta Region, Ghana',
  'https://www.uhas.edu.gh/admissions',
  'info@uhas.edu.gh',
  'WASSCE/SSSCE with strong science background. Medical programs require Biology, Chemistry, Physics, and Mathematics. Competitive entry based on merit.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'C.K. Tedam University of Technology and Applied Sciences',
  'Newest public university, established in 2016 (formerly University College of Agriculture). Focus on technology, agriculture, and applied sciences. Modern campus with research facilities.',
  'Universities',
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800',
  'Navrongo, Upper East Region, Ghana',
  'https://www.cktutas.edu.gh/admissions',
  'admissions@cktutas.edu.gh',
  'WASSCE/SSSCE qualification. Focus on science and agriculture programs. Special programs for rural development and sustainable agriculture.',
  0,
  true,
  NOW()
),

-- Private Universities
(
  (SELECT id FROM auth.users LIMIT 1),
  'Ashesi University',
  'Leading private liberal arts university, established in 2002. Known for excellence in Computer Science, Business, Engineering, and Liberal Arts. Strong emphasis on ethics, leadership, and entrepreneurship. Beautiful campus in Berekuso.',
  'Universities',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
  'Berekuso, Eastern Region, Ghana',
  'https://www.ashesi.edu.gh/admissions',
  'admissions@ashesi.edu.gh',
  'WASSCE/SSSCE with excellent grades. Strong academic record required. Scholarship opportunities available. International students welcome. SAT/ACT scores considered.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Central University',
  'Premier private university, established in 1988. Multiple campuses across Ghana. Programs in Business, IT, Theology, Law, Education, and Sciences. Strong Christian values and academic excellence.',
  'Universities',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  'Miotso, Greater Accra, Ghana',
  'https://www.central.edu.gh/admissions',
  'admissions@central.edu.gh',
  'WASSCE/SSSCE or equivalent. Mature students accepted. Distance learning programs available. Flexible payment plans offered.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'University of Ghana Medical School Teaching Hospital',
  'Premier medical training institution affiliated with University of Ghana. Comprehensive medical education with clinical training at Korle Bu Teaching Hospital. Produces highly skilled medical professionals.',
  'Universities',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
  'Korle Bu, Accra, Ghana',
  'https://www.sms.ug.edu.gh/admissions',
  'admissions@sms.ug.edu.gh',
  'Exceptional WASSCE results required with A\'s in Biology, Chemistry, Physics, and Mathematics. Extremely competitive admission. Interview required.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Academic City University College',
  'Modern private university established in 2016, focusing on STEM education. Programs in Engineering, Business, Computer Science, and Arts. Partnership with leading international institutions.',
  'Universities',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
  'East Legon, Accra, Ghana',
  'https://www.acity.edu.gh/admissions',
  'admissions@acity.edu.gh',
  'WASSCE/SSSCE with good grades. Strong focus on technology and innovation. Coding bootcamps and professional development programs available.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Presbyterian University of Ghana',
  'Private university established in 2003, affiliated with the Presbyterian Church. Programs in Business, Sciences, Education, Theology, and Health Sciences. Multiple campuses with modern facilities.',
  'Universities',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800',
  'Abetifi, Eastern Region, Ghana',
  'https://www.presbyuniversity.edu.gh/admissions',
  'admissions@presbyuniversity.edu.gh',
  'WASSCE/SSSCE qualification. Christian ethos with academic excellence. Distance education available. Affordable tuition with scholarship opportunities.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Valley View University',
  'Seventh-day Adventist university established in 1979. Programs in Business, IT, Theology, Health Sciences, and Agriculture. Multiple campuses emphasizing holistic education.',
  'Universities',
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800',
  'Oyibi, Greater Accra, Ghana',
  'https://www.vvu.edu.gh/admissions',
  'admissions@vvu.edu.gh',
  'WASSCE/SSSCE or equivalent. Christian values integrated with academic programs. Affordable fees with payment plans. Rural and urban campuses.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Ghana Technology University College (GTUC)',
  'Leading private ICT-focused institution, established in 2005. Specializes in Computer Science, Information Technology, Business IT, and Digital Media. Industry partnerships and practical training.',
  'Universities',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
  'Tesano, Accra, Ghana',
  'https://www.gtuc.edu.gh/admissions',
  'admissions@gtuc.edu.gh',
  'WASSCE/SSSCE with mathematics. IT certifications and professional courses available. Strong industry connections for internships and employment.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Regent University College of Science and Technology',
  'Private university established in 2003, chartered in 2016. Programs in Business, IT, Nursing, Physician Assistant Studies, and Liberal Arts. Modern campus with state-of-the-art facilities.',
  'Universities',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  'Dansoman, Accra, Ghana',
  'https://www.regentghana.net/admissions',
  'admissions@regentghana.net',
  'WASSCE/SSSCE with good passes. Healthcare programs require strong science background. International partnerships for exchange programs.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Methodist University College Ghana',
  'Private Methodist university established in 2000. Programs in Business, ICT, Theology, Education, and Social Sciences. Emphasis on moral values and academic excellence.',
  'Universities',
  'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800',
  'Dansoman, Accra, Ghana',
  'https://www.mucg.edu.gh/admissions',
  'admissions@mucg.edu.gh',
  'WASSCE/SSSCE qualification. Methodist ethos with quality education. Affordable tuition fees. Distance learning options available.',
  0,
  true,
  NOW()
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Lancaster University Ghana',
  'Branch campus of UK''s Lancaster University, established in 2020. Offers internationally recognized degrees in Business, Computer Science, and Liberal Arts. British university experience in Ghana.',
  'Universities',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=800',
  'East Legon, Accra, Ghana',
  'https://www.lancaster.edu.gh/admissions',
  'admissions@lancaster.edu.gh',
  'WASSCE/SSSCE with excellent grades. International qualifications accepted. Same standards as Lancaster UK. Scholarship opportunities for exceptional students.',
  0,
  true,
  NOW()
);

-- Update with additional metadata
COMMENT ON TABLE products_services IS 'Stores all products, services, and educational opportunities including universities';

