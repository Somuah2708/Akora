-- Insert Sample Documents for OAA Secretariat Document Center
-- This file creates sample documents for each category to test the system

INSERT INTO public.secretariat_documents (
  user_id,
  title,
  description,
  category,
  document_type,
  file_url,
  file_name,
  file_size,
  uploader_name,
  uploader_title,
  uploader_email,
  tags,
  version,
  is_public,
  is_approved,
  upload_date,
  created_at
) VALUES
-- 1. Forms - Alumni Registration
(
  (SELECT id FROM auth.users LIMIT 1),
  'Alumni Registration Form 2025',
  'Official registration form for all alumni. Required for database updates and event participation.',
  'Forms',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'alumni_registration_2025.pdf',
  524288,
  'Ms. Grace Owusu',
  'Administrative Officer',
  'admin@oaa.edu',
  '["registration", "2025", "alumni", "required"]',
  '2.0',
  true,
  true,
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),

-- 2. Reports - Annual Report
(
  (SELECT id FROM auth.users LIMIT 1),
  'OAA Annual Report 2024',
  'Comprehensive report covering all activities, finances, and achievements of the Old Achimotans Association for the year 2024.',
  'Reports',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'oaa_annual_report_2024.pdf',
  2097152,
  'Dr. Kwame Mensah',
  'Secretary General',
  'secretary@oaa.edu',
  '["annual", "report", "2024", "financial", "achievements"]',
  '1.0',
  true,
  true,
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks'
),

-- 3. Policies - Code of Conduct
(
  (SELECT id FROM auth.users LIMIT 1),
  'Alumni Code of Conduct and Ethics',
  'Official code of conduct governing all alumni members. Outlines expected behavior, ethical standards, and disciplinary procedures.',
  'Policies',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'code_of_conduct.pdf',
  1048576,
  'Prof. Emmanuel Asare',
  'Ethics Committee Chair',
  'ethics@oaa.edu',
  '["policy", "ethics", "conduct", "rules"]',
  '3.1',
  true,
  true,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 month'
),

-- 4. Minutes - Executive Meeting
(
  (SELECT id FROM auth.users LIMIT 1),
  'Executive Committee Meeting Minutes - October 2025',
  'Minutes from the Executive Committee meeting held on October 15, 2025. Covers budget approvals, event planning, and strategic initiatives.',
  'Minutes',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'exec_meeting_oct_2025.pdf',
  786432,
  'Sarah Mensah',
  'Recording Secretary',
  'recording@oaa.edu',
  '["minutes", "executive", "october", "2025"]',
  '1.0',
  true,
  true,
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
),

-- 5. Financial - Budget 2026
(
  (SELECT id FROM auth.users LIMIT 1),
  'Approved Budget for Fiscal Year 2026',
  'Detailed budget allocation for all OAA activities in 2026. Includes income projections, expense categories, and capital projects.',
  'Financial',
  'xlsx',
  'https://www.africau.edu/images/default/sample.pdf',
  'budget_2026.xlsx',
  1572864,
  'Mr. Kofi Boateng',
  'Treasurer',
  'treasurer@oaa.edu',
  '["budget", "2026", "financial", "approved"]',
  '1.0',
  true,
  true,
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
),

-- 6. Academic - Scholarship Guidelines
(
  (SELECT id FROM auth.users LIMIT 1),
  'OAA Excellence Scholarship Application Guidelines',
  'Complete guide for applying to the OAA Excellence Scholarship program. Includes eligibility criteria, application process, and selection timeline.',
  'Academic',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'scholarship_guidelines.pdf',
  655360,
  'Prof. Elizabeth Osei',
  'Academic Affairs Director',
  'academic@oaa.edu',
  '["scholarship", "academic", "guidelines", "application"]',
  '2.3',
  true,
  true,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),

-- 7. Legal - Constitution
(
  (SELECT id FROM auth.users LIMIT 1),
  'Old Achimotans Association Constitution (Amended 2024)',
  'Official constitution of the OAA as amended and ratified at the Annual General Meeting 2024. Contains all bylaws, rules, and organizational structure.',
  'Legal',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'oaa_constitution_2024.pdf',
  3145728,
  'Lawyer Ama Asantewaa',
  'Legal Advisor',
  'legal@oaa.edu',
  '["constitution", "bylaws", "legal", "2024", "amended"]',
  '4.0',
  true,
  true,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '2 months'
),

-- 8. Newsletters - October 2025
(
  (SELECT id FROM auth.users LIMIT 1),
  'Achimotan Newsletter - October 2025 Edition',
  'Monthly newsletter featuring alumni news, upcoming events, member spotlights, and school updates.',
  'Newsletters',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'newsletter_oct_2025.pdf',
  4194304,
  'Grace Mensah',
  'Newsletter Editor',
  'newsletter@oaa.edu',
  '["newsletter", "october", "2025", "monthly"]',
  '1.0',
  true,
  true,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
),

-- 9. Guidelines - Event Planning
(
  (SELECT id FROM auth.users LIMIT 1),
  'Alumni Event Planning and Execution Guidelines',
  'Step-by-step guide for organizing alumni events. Covers budgeting, venue selection, marketing, logistics, and post-event evaluation.',
  'Guidelines',
  'docx',
  'https://www.africau.edu/images/default/sample.pdf',
  'event_planning_guide.docx',
  917504,
  'Ama Asantewaa',
  'Events Coordinator',
  'events@oaa.edu',
  '["events", "planning", "guidelines", "howto"]',
  '1.5',
  true,
  true,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 month'
),

-- 10. Templates - Meeting Agenda
(
  (SELECT id FROM auth.users LIMIT 1),
  'Standard Meeting Agenda Template',
  'Template for creating meeting agendas for all OAA committees and chapters. Ensures consistency and completeness.',
  'Templates',
  'docx',
  'https://www.africau.edu/images/default/sample.pdf',
  'meeting_agenda_template.docx',
  262144,
  'Sarah Mensah',
  'Administrative Assistant',
  'admin@oaa.edu',
  '["template", "meeting", "agenda"]',
  '1.0',
  true,
  true,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '2 months'
),

-- 11. Forms - Donation Form
(
  (SELECT id FROM auth.users LIMIT 1),
  'Charitable Donation Form',
  'Form for making tax-deductible donations to OAA projects. Includes payment methods and tax receipt request.',
  'Forms',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'donation_form.pdf',
  327680,
  'Mr. Kofi Boateng',
  'Fundraising Director',
  'fundraising@oaa.edu',
  '["donation", "form", "tax", "charity"]',
  '1.2',
  true,
  true,
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
),

-- 12. Other - Membership Directory
(
  (SELECT id FROM auth.users LIMIT 1),
  'Alumni Directory 2025 (Public Version)',
  'Searchable directory of all consenting alumni members. Includes basic contact information and professional details.',
  'Other',
  'pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'alumni_directory_2025.pdf',
  5242880,
  'IT Department',
  'Database Administrator',
  'it@oaa.edu',
  '["directory", "contact", "2025", "members"]',
  '1.0',
  true,
  true,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
);

-- Update engagement metrics for realistic data
UPDATE public.secretariat_documents SET view_count = 245, download_count = 89 WHERE title LIKE '%Registration Form%';
UPDATE public.secretariat_documents SET view_count = 567, download_count = 234 WHERE title LIKE '%Annual Report%';
UPDATE public.secretariat_documents SET view_count = 189, download_count = 67 WHERE title LIKE '%Code of Conduct%';
UPDATE public.secretariat_documents SET view_count = 123, download_count = 45 WHERE title LIKE '%Meeting Minutes%';
UPDATE public.secretariat_documents SET view_count = 334, download_count = 156 WHERE title LIKE '%Budget%';
UPDATE public.secretariat_documents SET view_count = 456, download_count = 178 WHERE title LIKE '%Scholarship%';
UPDATE public.secretariat_documents SET view_count = 678, download_count = 234 WHERE title LIKE '%Constitution%';
UPDATE public.secretariat_documents SET view_count = 398, download_count = 167 WHERE title LIKE '%Newsletter%';
UPDATE public.secretariat_documents SET view_count = 278, download_count = 98 WHERE title LIKE '%Event Planning%';
UPDATE public.secretariat_documents SET view_count = 145, download_count = 76 WHERE title LIKE '%Agenda Template%';
UPDATE public.secretariat_documents SET view_count = 289, download_count = 123 WHERE title LIKE '%Donation Form%';
UPDATE public.secretariat_documents SET view_count = 512, download_count = 201 WHERE title LIKE '%Directory%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully inserted 12 sample documents across all categories!';
  RAISE NOTICE 'Categories covered: Forms, Reports, Policies, Minutes, Financial, Academic, Legal, Newsletters, Guidelines, Templates, Other';
  RAISE NOTICE 'Total file types: PDF (9), DOCX (2), XLSX (1)';
END $$;
