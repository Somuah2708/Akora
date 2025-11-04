-- Insert Sample Announcements for OAA Secretariat
-- This file creates sample announcements for each category to test the system

-- Sample announcements with different categories and priorities
INSERT INTO public.secretariat_announcements (
  user_id,
  title,
  summary,
  content,
  category,
  priority,
  image_url,
  author_name,
  author_title,
  author_email,
  is_published,
  is_approved,
  published_at,
  created_at
) VALUES
-- 1. URGENT - Important Notice
(
  (SELECT id FROM auth.users LIMIT 1),
  'Emergency General Assembly Meeting - All Alumni Required',
  'Mandatory attendance for all alumni members. Critical decisions regarding school future will be discussed.',
  E'<h2>Emergency General Assembly</h2><p>Dear Alumni,</p><p>We are calling for an <strong>emergency general assembly meeting</strong> to discuss critical matters affecting our alma mater.</p><h3>Agenda:</h3><ul><li>Financial sustainability of the school</li><li>Infrastructure development plans</li><li>Alumni contribution initiatives</li><li>Emergency relief fund establishment</li></ul><p><strong>Date:</strong> November 15, 2025<br><strong>Time:</strong> 2:00 PM - 5:00 PM<br><strong>Venue:</strong> Main Auditorium</p><p>Your presence is crucial. Please confirm attendance by November 10th.</p>',
  'Important Notice',
  'urgent',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60',
  'Dr. Kwame Mensah',
  'Secretary General, OAA',
  'secretary@oaa.edu',
  true,
  true,
  NOW(),
  NOW()
),

-- 2. HIGH - Events
(
  (SELECT id FROM auth.users LIMIT 1),
  'Annual Alumni Homecoming 2025 - Registration Now Open',
  'Join us for the biggest alumni reunion of the year! Early bird registration available until November 20th.',
  E'<h2>Welcome Home, Alumni!</h2><p>We are thrilled to announce our <strong>Annual Alumni Homecoming 2025</strong> - a celebration of our shared heritage and continued bonds.</p><h3>Event Highlights:</h3><ul><li>Grand Reunion Dinner & Dance</li><li>Campus Tour & Nostalgia Walk</li><li>Class Reunions (Special focus on 1975, 1985, 1995, 2005, 2015)</li><li>Sports Tournament (Football, Basketball, Volleyball)</li><li>Cultural Night Performance</li><li>Career Networking Session</li></ul><h3>Registration Details:</h3><p><strong>Early Bird (Until Nov 20):</strong> GHS 500<br><strong>Regular (After Nov 20):</strong> GHS 700<br><strong>VIP Package:</strong> GHS 1,200</p><p><strong>Event Dates:</strong> December 15-17, 2025</p><p>Register now and reconnect with old friends, make new connections, and give back to your alma mater!</p>',
  'Events',
  'high',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60',
  'Ama Asantewaa',
  'Events Coordinator',
  'events@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
),

-- 3. NORMAL - General
(
  (SELECT id FROM auth.users LIMIT 1),
  'New Alumni Database System Launch - Update Your Information',
  'We have upgraded our alumni database! Please log in and update your contact information, professional details, and preferences.',
  E'<h2>Modernizing Our Alumni Network</h2><p>Dear Alumni,</p><p>We are excited to announce the launch of our <strong>new and improved Alumni Database System</strong>!</p><h3>New Features:</h3><ul><li>Easy profile management</li><li>Professional networking capabilities</li><li>Job board and career opportunities</li><li>Event registration and ticketing</li><li>Donation tracking and tax receipts</li><li>Directory search with privacy controls</li></ul><h3>Action Required:</h3><p>Please take a few minutes to:</p><ol><li>Log into the new system using your email</li><li>Reset your password if needed</li><li>Update your contact information</li><li>Add your professional details</li><li>Upload a profile photo</li><li>Set your privacy preferences</li></ol><p>This will help us serve you better and keep our community connected!</p>',
  'General',
  'normal',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
  'Kofi Annan',
  'IT Director',
  'it@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- 4. NORMAL - Academic
(
  (SELECT id FROM auth.users LIMIT 1),
  'Scholarship Fund Established for Current Students - Alumni Contributions Welcome',
  'New merit-based scholarship program launched to support academically excellent but financially challenged students.',
  E'<h2>Investing in Future Leaders</h2><p>We are proud to announce the establishment of the <strong>OAA Excellence Scholarship Fund</strong>!</p><h3>Program Overview:</h3><p>This scholarship program aims to support 50 deserving students annually who demonstrate:</p><ul><li>Outstanding academic performance (minimum 3.5 GPA)</li><li>Leadership potential and community service</li><li>Financial need</li><li>Strong moral character</li></ul><h3>Scholarship Benefits:</h3><ul><li>Full tuition coverage for the academic year</li><li>Book allowance of GHS 2,000</li><li>Mentorship from alumni in their field of study</li><li>Internship opportunities through alumni network</li></ul><h3>How Alumni Can Help:</h3><p>We are calling on all alumni to contribute to this worthy cause. Any amount helps:</p><ul><li><strong>Bronze Sponsor:</strong> GHS 1,000 - 4,999</li><li><strong>Silver Sponsor:</strong> GHS 5,000 - 9,999</li><li><strong>Gold Sponsor:</strong> GHS 10,000 - 24,999</li><li><strong>Platinum Sponsor:</strong> GHS 25,000+</li></ul><p>Together, we can change lives and build our nation!</p>',
  'Academic',
  'normal',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=60',
  'Prof. Elizabeth Osei',
  'Academic Affairs Director',
  'academic@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- 5. NORMAL - Alumni Updates
(
  (SELECT id FROM auth.users LIMIT 1),
  'Alumni Spotlight: Dr. Yaw Boateng Named UNESCO Ambassador',
  'Congratulations to our distinguished alumnus Dr. Yaw Boateng (Class of 1998) on his appointment as UNESCO Ambassador for Education in Africa!',
  E'<h2>Making Us Proud!</h2><p>We are delighted to share that our very own <strong>Dr. Yaw Boateng</strong>, Class of 1998, has been appointed as <strong>UNESCO Ambassador for Education in Africa</strong>!</p><h3>About Dr. Boateng:</h3><p>Dr. Boateng graduated with honors from our institution and went on to pursue higher education at Oxford University and Harvard. His career highlights include:</p><ul><li>PhD in International Development from Oxford University</li><li>Former Education Minister in Ghana (2015-2020)</li><li>Founder of "Education for All Ghana" NGO</li><li>Author of 5 books on education policy in developing nations</li><li>Recipient of the African Leadership Award 2022</li></ul><h3>His Message to Current Students:</h3><blockquote>"Never underestimate the foundation you receive at this great institution. The values, discipline, and excellence instilled here have been the bedrock of my success. Dream big, work hard, and always give back to your community."</blockquote><p>Join us in congratulating Dr. Boateng on this well-deserved honor!</p>',
  'Alumni Updates',
  'normal',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&auto=format&fit=crop&q=60',
  'Sarah Mensah',
  'Communications Officer',
  'comms@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),

-- 6. HIGH - Opportunities
(
  (SELECT id FROM auth.users LIMIT 1),
  'Executive Leadership Positions Available - Alumni Encouraged to Apply',
  'Multiple leadership opportunities at partner organizations. Deadline: November 30, 2025.',
  E'<h2>Career Advancement Opportunities</h2><p>We are excited to share several <strong>executive-level positions</strong> available through our alumni network and partner organizations.</p><h3>Available Positions:</h3><h4>1. Chief Financial Officer - TechCorp Ghana</h4><ul><li>Location: Accra</li><li>Salary Range: GHS 180,000 - 240,000/year</li><li>Requirements: MBA/CPA, 10+ years experience</li><li>Deadline: November 25, 2025</li></ul><h4>2. Regional Director - Save the Children West Africa</h4><ul><li>Location: Kumasi (with regional travel)</li><li>Salary: Competitive + benefits</li><li>Requirements: Masters in relevant field, 8+ years NGO experience</li><li>Deadline: November 30, 2025</li></ul><h4>3. Head of Innovation - Ghana Commercial Bank</h4><ul><li>Location: Accra</li><li>Salary Range: GHS 150,000 - 200,000/year</li><li>Requirements: Technology/Business degree, 7+ years fintech experience</li><li>Deadline: December 5, 2025</li></ul><h3>How to Apply:</h3><p>Interested alumni should submit:</p><ul><li>Updated CV/Resume</li><li>Cover letter</li><li>Two professional references</li></ul><p>Email applications to: <strong>careers@oaa.edu</strong> with the position title in the subject line.</p>',
  'Opportunities',
  'high',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop&q=60',
  'Michael Asare',
  'Career Services Director',
  'careers@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),

-- 7. NORMAL - News
(
  (SELECT id FROM auth.users LIMIT 1),
  'School Celebrates 75th Anniversary - Grand Celebrations Planned',
  'Join us in celebrating 75 years of academic excellence and nation-building. Multiple events scheduled throughout the year.',
  E'<h2>75 Years of Excellence!</h2><p>This year marks a monumental milestone - our institution turns <strong>75 years old</strong>!</p><h3>Anniversary Celebration Events:</h3><h4>January 2026:</h4><ul><li>Official Launch Ceremony & Time Capsule</li><li>Founding Fathers Memorial Service</li><li>Historical Exhibition Opening</li></ul><h4>March 2026:</h4><ul><li>Academic Symposium on Education in Ghana</li><li>Inter-House Sports Competition</li><li>Cultural Festival</li></ul><h4>June 2026:</h4><ul><li>Grand Alumni Reunion (All Years)</li><li>Fundraising Gala Dinner</li><li>Awards Night - Honoring Distinguished Alumni</li></ul><h4>September 2026:</h4><ul><li>Thanksgiving Service</li><li>Infrastructure Commissioning</li><li>Closing Ceremony</li></ul><h3>Special Anniversary Projects:</h3><ul><li>New Science & Technology Block construction</li><li>Endowment Fund of GHS 10 million</li><li>75 Full Scholarships for deserving students</li><li>Publication of comprehensive school history book</li></ul><p>More details on each event will be shared soon. Mark your calendars!</p>',
  'News',
  'normal',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=60',
  'Rev. Dr. Emmanuel Osei',
  'Headmaster',
  'headmaster@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
),

-- 8. NORMAL - Resources
(
  (SELECT id FROM auth.users LIMIT 1),
  'Digital Archive of School Publications Now Available Online',
  'Access decades of school magazines, yearbooks, and newsletters from our newly digitized archives.',
  E'<h2>Preserving Our Heritage Digitally</h2><p>We are pleased to announce that our <strong>Digital Heritage Archive</strong> is now live and accessible to all alumni!</p><h3>What''s Available:</h3><ul><li><strong>School Magazines (1950-2024):</strong> Over 500 issues digitized</li><li><strong>Yearbooks (1955-2024):</strong> Complete collection with searchable names</li><li><strong>Newsletters:</strong> Monthly publications from the last 30 years</li><li><strong>Event Programs:</strong> Sports days, speech days, concerts, etc.</li><li><strong>Historical Photographs:</strong> Over 10,000 images catalogued</li><li><strong>Audio Recordings:</strong> School anthems, speeches, performances</li></ul><h3>How to Access:</h3><ol><li>Visit <strong>archive.oaa.edu</strong></li><li>Log in with your alumni credentials</li><li>Browse by year, category, or use the search function</li><li>Download or share memories with classmates</li></ol><h3>Contribute to the Archive:</h3><p>Do you have old photos, videos, or documents? We''d love to add them to our collection! Contact the archives team at <strong>archives@oaa.edu</strong></p><p>Relive your school days and share memories with the next generation!</p>',
  'Resources',
  'normal',
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&auto=format&fit=crop&q=60',
  'Ms. Akua Owusu',
  'Archivist & Librarian',
  'library@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
),

-- 9. NORMAL - General (Recent)
(
  (SELECT id FROM auth.users LIMIT 1),
  'Alumni Monthly Newsletter - November 2025 Edition',
  'Read about recent alumni achievements, upcoming events, school updates, and networking opportunities in this month''s newsletter.',
  E'<h2>November 2025 Alumni Newsletter</h2><h3>In This Issue:</h3><h4>From the Secretary General</h4><p>Dear Alumni, as we approach the end of another remarkable year, I want to take a moment to reflect on our collective achievements...</p><h4>Alumni in the News:</h4><ul><li>Nana Addo Boafo (''92) appointed CEO of Ghana Stock Exchange</li><li>Dr. Akosua Frimpong (''05) published groundbreaking research in Nature</li><li>Kwabena Osei (''88) opened 5th restaurant in Accra</li></ul><h4>School Updates:</h4><ul><li>New computer lab commissioned - 50 state-of-the-art machines</li><li>Football team wins regional championship</li><li>100% WASSCE pass rate for the 5th consecutive year</li></ul><h4>Upcoming Events:</h4><ul><li>Nov 15 - Emergency General Assembly</li><li>Nov 28 - Career Mentoring Day</li><li>Dec 15-17 - Annual Homecoming</li></ul><h4>Networking Corner:</h4><p>Connect with alumni in your field through our new LinkedIn group "OAA Professionals Network"</p><h4>Give Back:</h4><p>This month''s focus: Excellence Scholarship Fund - GHS 150,000 raised so far!</p><p>Thank you for staying connected!</p>',
  'General',
  'normal',
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=60',
  'Grace Mensah',
  'Newsletter Editor',
  'newsletter@oaa.edu',
  true,
  true,
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
);

-- Update view counts and engagement for sample data (making it more realistic)
UPDATE public.secretariat_announcements SET view_count = 342 WHERE title LIKE '%Emergency General Assembly%';
UPDATE public.secretariat_announcements SET view_count = 589 WHERE title LIKE '%Annual Alumni Homecoming%';
UPDATE public.secretariat_announcements SET view_count = 234 WHERE title LIKE '%New Alumni Database%';
UPDATE public.secretariat_announcements SET view_count = 456 WHERE title LIKE '%Scholarship Fund%';
UPDATE public.secretariat_announcements SET view_count = 678 WHERE title LIKE '%Dr. Yaw Boateng%';
UPDATE public.secretariat_announcements SET view_count = 321 WHERE title LIKE '%Executive Leadership%';
UPDATE public.secretariat_announcements SET view_count = 890 WHERE title LIKE '%75th Anniversary%';
UPDATE public.secretariat_announcements SET view_count = 156 WHERE title LIKE '%Digital Archive%';
UPDATE public.secretariat_announcements SET view_count = 412 WHERE title LIKE '%Monthly Newsletter%';

UPDATE public.secretariat_announcements SET like_count = 87 WHERE title LIKE '%Emergency General Assembly%';
UPDATE public.secretariat_announcements SET like_count = 156 WHERE title LIKE '%Annual Alumni Homecoming%';
UPDATE public.secretariat_announcements SET like_count = 43 WHERE title LIKE '%New Alumni Database%';
UPDATE public.secretariat_announcements SET like_count = 134 WHERE title LIKE '%Scholarship Fund%';
UPDATE public.secretariat_announcements SET like_count = 203 WHERE title LIKE '%Dr. Yaw Boateng%';
UPDATE public.secretariat_announcements SET like_count = 76 WHERE title LIKE '%Executive Leadership%';
UPDATE public.secretariat_announcements SET like_count = 298 WHERE title LIKE '%75th Anniversary%';
UPDATE public.secretariat_announcements SET like_count = 45 WHERE title LIKE '%Digital Archive%';
UPDATE public.secretariat_announcements SET like_count = 89 WHERE title LIKE '%Monthly Newsletter%';

UPDATE public.secretariat_announcements SET comment_count = 23 WHERE title LIKE '%Emergency General Assembly%';
UPDATE public.secretariat_announcements SET comment_count = 45 WHERE title LIKE '%Annual Alumni Homecoming%';
UPDATE public.secretariat_announcements SET comment_count = 12 WHERE title LIKE '%New Alumni Database%';
UPDATE public.secretariat_announcements SET comment_count = 34 WHERE title LIKE '%Scholarship Fund%';
UPDATE public.secretariat_announcements SET comment_count = 56 WHERE title LIKE '%Dr. Yaw Boateng%';
UPDATE public.secretariat_announcements SET comment_count = 18 WHERE title LIKE '%Executive Leadership%';
UPDATE public.secretariat_announcements SET comment_count = 78 WHERE title LIKE '%75th Anniversary%';
UPDATE public.secretariat_announcements SET comment_count = 9 WHERE title LIKE '%Digital Archive%';
UPDATE public.secretariat_announcements SET comment_count = 21 WHERE title LIKE '%Monthly Newsletter%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully inserted 9 sample announcements across all categories!';
  RAISE NOTICE 'Categories covered: Important Notice, Events, General, Academic, Alumni Updates, Opportunities, News, Resources';
  RAISE NOTICE 'Priority levels: Urgent (1), High (2), Normal (6)';
END $$;
