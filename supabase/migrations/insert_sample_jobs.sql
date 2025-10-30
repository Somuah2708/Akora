-- Insert sample jobs data
-- Note: user_id is set to NULL for sample data. You may want to update these with actual user IDs later.

INSERT INTO public.jobs (user_id, title, company, location, job_type, salary, description, requirements, image_url, is_featured, is_approved) VALUES
-- Featured Jobs
(NULL, 'Software Engineer', 'TechCorp Ghana', 'Accra, Ghana', 'Full Time', '$3,000 - $5,000/month', 'Join our team as a Software Engineer working on cutting-edge mobile applications.', '3+ years experience, React Native, Node.js', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60', true, true),

(NULL, 'Marketing Intern', 'Global Media Ltd', 'Kumasi, Ghana', 'Internships', '$500/month', 'Great opportunity for final year marketing students to gain real-world experience.', 'Final year student, Marketing major, Creative mindset', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60', true, true),

(NULL, 'Remote Frontend Developer', 'Digital Solutions', 'Remote', 'Remote Work', '$2,500 - $4,000/month', 'Work remotely as a frontend developer building modern web applications.', 'React, TypeScript, 2+ years experience', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60', true, true),

(NULL, 'National Service - IT Support', 'National Communications Authority', 'Accra, Ghana', 'National Service', 'Government Allowance', 'IT Support role for national service personnel.', 'IT background, Service placement, Available for 1 year', 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&auto=format&fit=crop&q=60', true, true),

(NULL, 'Part-Time Content Writer', 'Creative Studios', 'Accra, Ghana', 'Part Time', '$600/month', 'Create engaging content for our digital platforms on a flexible schedule.', 'Good writing skills, Flexible hours, Portfolio required', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=60', true, true),

(NULL, 'Volunteer Community Organizer', 'Youth Impact Foundation', 'Kumasi, Ghana', 'Volunteering', NULL, 'Help organize community events and youth programs.', 'Passion for community work, Good communication, Weekend availability', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60', true, true),

(NULL, 'Senior Accountant', 'Finance Group Ltd', 'Accra, Ghana', 'Full Time', '$4,000 - $6,000/month', 'Senior accounting position with growth opportunities.', 'CPA/ACCA, 5+ years experience, ERP knowledge', 'https://images.unsplash.com/photo-1554224311-beee2f770c4f?w=800&auto=format&fit=crop&q=60', true, true),

(NULL, 'Engineering Intern', 'Tech Manufacturing Co', 'Tema, Ghana', 'Internships', '$400/month', '6-month internship program for engineering students.', 'Engineering student, 3rd/4th year, Available 6 months', 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800&auto=format&fit=crop&q=60', true, true),

-- Recent Opportunities (non-featured)
(NULL, 'National Service - Teaching', 'Ministry of Education', 'Various Locations', 'National Service', NULL, 'Teaching positions available for national service personnel across Ghana.', 'Education background, Teaching certificate preferred', 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Data Analyst', 'FinTech Solutions', 'Tema, Ghana', 'Full Time', '$2,000 - $3,500/month', 'Analyze financial data and create insights for business decisions.', 'SQL, Python, Data visualization tools', 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Product Design Intern', 'Creative Hub', 'Remote', 'Internships', '$800/month', 'Learn product design from experienced designers while working remotely.', 'Design portfolio, Figma/Adobe XD, Creative thinking', 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Business Development', 'Growth Partners', 'Accra, Ghana', 'Full Time', '$1,500 - $2,500/month', 'Drive business growth through strategic partnerships and sales.', 'Sales experience, Communication skills, Target-driven', 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Part-Time Graphic Designer', 'Media House', 'Accra, Ghana', 'Part Time', '$800/month', 'Create visual content for social media and marketing campaigns.', 'Adobe Creative Suite, Portfolio, Flexible schedule', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Community Volunteer Coordinator', 'Hope Foundation', 'Kumasi, Ghana', 'Volunteering', NULL, 'Coordinate volunteer activities and community outreach programs.', 'Organizational skills, Community engagement experience', 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Remote Customer Support', 'E-Commerce Platform', 'Remote', 'Remote Work', '$1,200 - $1,800/month', 'Provide excellent customer service for our e-commerce platform.', 'Customer service experience, Good communication, Problem-solving', 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'National Service - Healthcare', 'Ghana Health Service', 'Various Hospitals', 'National Service', 'Government Allowance', 'Healthcare support roles in hospitals across Ghana.', 'Health-related qualification, Service placement required', 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Part-Time Sales Assistant', 'Retail Store', 'Accra Mall', 'Part Time', '$500/month', 'Assist customers and manage retail operations part-time.', 'Retail experience preferred, Customer-focused, Weekends available', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Volunteer Teaching Assistant', 'Education For All', 'Rural Communities', 'Volunteering', NULL, 'Help teachers in rural schools provide quality education.', 'Passion for education, Patience, Basic teaching skills', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'HR Intern', 'Corporate Solutions', 'Accra, Ghana', 'Internships', '$450/month', 'Learn HR practices including recruitment, onboarding, and employee relations.', 'HR or Business student, Good interpersonal skills', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Project Manager', 'Construction Ltd', 'Tema, Ghana', 'Full Time', '$3,500 - $5,500/month', 'Manage construction projects from inception to completion.', 'PMP/PRINCE2, 5+ years construction, Leadership skills', 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800&auto=format&fit=crop&q=60', false, true),

(NULL, 'Remote Digital Marketer', 'Marketing Agency', 'Remote', 'Remote Work', '$1,800 - $2,500/month', 'Plan and execute digital marketing campaigns for various clients.', 'SEO/SEM, Social media marketing, Analytics tools', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60', false, true);
