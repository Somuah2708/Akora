// Insert sample jobs into the database
const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

const sampleJobs = [
  // Featured Jobs
  { title: 'Software Engineer', company: 'TechCorp Ghana', location: 'Accra, Ghana', job_type: 'Full Time', salary: '$3,000 - $5,000/month', description: 'Join our team as a Software Engineer working on cutting-edge mobile applications.', requirements: '3+ years experience, React Native, Node.js', image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  { title: 'Marketing Intern', company: 'Global Media Ltd', location: 'Kumasi, Ghana', job_type: 'Internships', salary: '$500/month', description: 'Great opportunity for final year marketing students to gain real-world experience.', requirements: 'Final year student, Marketing major, Creative mindset', image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  { title: 'Remote Frontend Developer', company: 'Digital Solutions', location: 'Remote', job_type: 'Remote Work', salary: '$2,500 - $4,000/month', description: 'Work remotely as a frontend developer building modern web applications.', requirements: 'React, TypeScript, 2+ years experience', image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  { title: 'National Service - IT Support', company: 'National Communications Authority', location: 'Accra, Ghana', job_type: 'National Service', salary: 'Government Allowance', description: 'IT Support role for national service personnel.', requirements: 'IT background, Service placement, Available for 1 year', image_url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  { title: 'Part-Time Content Writer', company: 'Creative Studios', location: 'Accra, Ghana', job_type: 'Part Time', salary: '$600/month', description: 'Create engaging content for our digital platforms on a flexible schedule.', requirements: 'Good writing skills, Flexible hours, Portfolio required', image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  { title: 'Volunteer Community Organizer', company: 'Youth Impact Foundation', location: 'Kumasi, Ghana', job_type: 'Volunteering', salary: 'Volunteer Position', description: 'Help organize community events and youth programs.', requirements: 'Passion for community work, Good communication, Weekend availability', image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  { title: 'Senior Accountant', company: 'Finance Group Ltd', location: 'Accra, Ghana', job_type: 'Full Time', salary: '$4,000 - $6,000/month', description: 'Senior accounting position with growth opportunities.', requirements: 'CPA/ACCA, 5+ years experience, ERP knowledge', image_url: 'https://images.unsplash.com/photo-1554224311-beee2f770c4f?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  { title: 'Engineering Intern', company: 'Tech Manufacturing Co', location: 'Tema, Ghana', job_type: 'Internships', salary: '$400/month', description: '6-month internship program for engineering students.', requirements: 'Engineering student, 3rd/4th year, Available 6 months', image_url: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: true, is_approved: true },
  
  // Recent Opportunities (non-featured)
  { title: 'National Service - Teaching', company: 'Ministry of Education', location: 'Various Locations', job_type: 'National Service', salary: 'Government Allowance', description: 'Teaching positions available for national service personnel across Ghana.', requirements: 'Education background, Teaching certificate preferred', image_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Data Analyst', company: 'FinTech Solutions', location: 'Tema, Ghana', job_type: 'Full Time', salary: '$2,000 - $3,500/month', description: 'Analyze financial data and create insights for business decisions.', requirements: 'SQL, Python, Data visualization tools', image_url: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Product Design Intern', company: 'Creative Hub', location: 'Remote', job_type: 'Internships', salary: '$800/month', description: 'Learn product design from experienced designers while working remotely.', requirements: 'Design portfolio, Figma/Adobe XD, Creative thinking', image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Business Development', company: 'Growth Partners', location: 'Accra, Ghana', job_type: 'Full Time', salary: '$1,500 - $2,500/month', description: 'Drive business growth through strategic partnerships and sales.', requirements: 'Sales experience, Communication skills, Target-driven', image_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Part-Time Graphic Designer', company: 'Media House', location: 'Accra, Ghana', job_type: 'Part Time', salary: '$800/month', description: 'Create visual content for social media and marketing campaigns.', requirements: 'Adobe Creative Suite, Portfolio, Flexible schedule', image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Community Volunteer Coordinator', company: 'Hope Foundation', location: 'Kumasi, Ghana', job_type: 'Volunteering', salary: 'Volunteer Position', description: 'Coordinate volunteer activities and community outreach programs.', requirements: 'Organizational skills, Community engagement experience', image_url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Remote Customer Support', company: 'E-Commerce Platform', location: 'Remote', job_type: 'Remote Work', salary: '$1,200 - $1,800/month', description: 'Provide excellent customer service for our e-commerce platform.', requirements: 'Customer service experience, Good communication, Problem-solving', image_url: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'National Service - Healthcare', company: 'Ghana Health Service', location: 'Various Hospitals', job_type: 'National Service', salary: 'Government Allowance', description: 'Healthcare support roles in hospitals across Ghana.', requirements: 'Health-related qualification, Service placement required', image_url: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Part-Time Sales Assistant', company: 'Retail Store', location: 'Accra Mall', job_type: 'Part Time', salary: '$500/month', description: 'Assist customers and manage retail operations part-time.', requirements: 'Retail experience preferred, Customer-focused, Weekends available', image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Volunteer Teaching Assistant', company: 'Education For All', location: 'Rural Communities', job_type: 'Volunteering', salary: 'Volunteer Position', description: 'Help teachers in rural schools provide quality education.', requirements: 'Passion for education, Patience, Basic teaching skills', image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'HR Intern', company: 'Corporate Solutions', location: 'Accra, Ghana', job_type: 'Internships', salary: '$450/month', description: 'Learn HR practices including recruitment, onboarding, and employee relations.', requirements: 'HR or Business student, Good interpersonal skills', image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Project Manager', company: 'Construction Ltd', location: 'Tema, Ghana', job_type: 'Full Time', salary: '$3,500 - $5,500/month', description: 'Manage construction projects from inception to completion.', requirements: 'PMP/PRINCE2, 5+ years construction, Leadership skills', image_url: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true },
  
  { title: 'Remote Digital Marketer', company: 'Marketing Agency', location: 'Remote', job_type: 'Remote Work', salary: '$1,800 - $2,500/month', description: 'Plan and execute digital marketing campaigns for various clients.', requirements: 'SEO/SEM, Social media marketing, Analytics tools', image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60', application_link: '', is_featured: false, is_approved: true }
];

console.log(`🚀 Inserting ${sampleJobs.length} sample jobs...`);

fetch(`${supabaseUrl}/rest/v1/jobs`, {
  method: 'POST',
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  },
  body: JSON.stringify(sampleJobs)
})
.then(response => {
  if (response.ok) {
    console.log('✅ Successfully inserted all sample jobs!');
    console.log(`📊 ${sampleJobs.length} jobs added to the database`);
  } else {
    return response.text().then(text => {
      console.error('❌ Failed to insert jobs');
      console.error('Status:', response.status);
      console.error('Response:', text);
    });
  }
})
.catch(error => {
  console.error('❌ Error:', error.message);
});
