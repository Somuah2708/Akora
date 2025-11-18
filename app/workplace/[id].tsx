import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Alert, Dimensions } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect, useState } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Wallet, Building2, Calendar, ExternalLink, Briefcase, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

interface JobDetails {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  applicationLink: string;
  type: string;
  imageUrl?: string;
  postedDate?: string;
  requirements?: string[];
  images?: string[];
}

// Sample data for demonstration (matching the workplace index data)
const SAMPLE_JOBS: { [key: string]: JobDetails } = {
  '1': {
    id: '1',
    title: 'Software Engineer',
    company: 'TechCorp Ghana',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$3,000 - $5,000/month',
    description: 'We are seeking an experienced Software Engineer to join our growing team. You will be responsible for developing and maintaining web applications using modern technologies. This is a great opportunity to work on challenging projects and grow your career in a dynamic environment.\n\nResponsibilities:\n• Develop and maintain web applications\n• Collaborate with cross-functional teams\n• Write clean, maintainable code\n• Participate in code reviews\n• Stay up-to-date with emerging technologies',
    applicationLink: 'https://techcorp.gh/careers/software-engineer',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['3+ years experience', 'React Native', 'Node.js', 'TypeScript', 'Git'],
    images: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=800&auto=format&fit=crop&q=60',
    ],
  },
  '2': {
    id: '2',
    title: 'Marketing Intern',
    company: 'Global Media Ltd',
    location: 'Kumasi, Ghana',
    type: 'Internships',
    salary: '$500/month',
    description: 'Join our dynamic marketing team as an intern and gain hands-on experience in digital marketing, content creation, and campaign management. This is a perfect opportunity for students or recent graduates looking to kickstart their marketing career.\n\nWhat you\'ll learn:\n• Social media marketing\n• Content creation and copywriting\n• Marketing analytics\n• Campaign management\n• Brand development',
    applicationLink: 'https://globalmedia.com/careers/marketing-intern',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Final year student', 'Marketing major', 'Creative mindset', 'Good communication', 'Social media savvy'],
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=800&auto=format&fit=crop&q=60',
    ],
  },
  '3': {
    id: '3',
    title: 'Remote Frontend Developer',
    company: 'Digital Solutions',
    location: 'Remote',
    type: 'Remote Work',
    salary: '$2,500 - $4,000/month',
    description: 'We are looking for a talented Frontend Developer to work remotely on exciting projects for international clients. You will build responsive and performant web applications using the latest frontend technologies.\n\nKey Responsibilities:\n• Build responsive web applications\n• Optimize application performance\n• Work with design teams\n• Implement new features\n• Maintain code quality',
    applicationLink: 'https://digitalsolutions.io/apply/frontend',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['React', 'TypeScript', '2+ years experience', 'CSS/Tailwind', 'REST APIs'],
    images: [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=800&auto=format&fit=crop&q=60',
    ],
  },
  '4': {
    id: '4',
    title: 'Data Analyst',
    company: 'FinTech Solutions',
    location: 'Tema, Ghana',
    type: 'Full Time Jobs',
    salary: '$2,000 - $3,500/month',
    description: 'We are seeking a skilled Data Analyst to join our fintech team. You will analyze financial data, create reports, and provide insights to drive business decisions. This role requires strong analytical skills and proficiency in data visualization tools.\n\nKey Responsibilities:\n• Analyze large datasets\n• Create data visualizations and dashboards\n• Generate business insights\n• Collaborate with stakeholders\n• Present findings to management',
    applicationLink: 'https://fintechsolutions.com/careers/data-analyst',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['SQL', 'Python/R', 'Excel', 'Data visualization', '2+ years experience'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1551836022000 + i * 500}-4c4c79ecde51?w=800&auto=format&fit=crop&q=60`),
  },
  '5': {
    id: '5',
    title: 'Part-Time Graphic Designer',
    company: 'Media House',
    location: 'Accra, Ghana',
    type: 'Part Time',
    salary: '$800/month',
    description: 'Looking for a creative part-time graphic designer to create visual content for our media company. You\'ll work on diverse projects including social media graphics, marketing materials, and brand assets.\n\nWhat you\'ll do:\n• Design social media content\n• Create marketing materials\n• Develop brand assets\n• Edit photos and videos\n• Collaborate with marketing team',
    applicationLink: 'https://mediahouse.com/apply/designer',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Adobe Creative Suite', 'Portfolio', 'Creative thinking', 'Time management', 'Flexible schedule'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1626785774000 + i * 500}-4b799315345d?w=800&auto=format&fit=crop&q=60`),
  },
  '6': {
    id: '6',
    title: 'Community Volunteer Coordinator',
    company: 'Hope Foundation',
    location: 'Kumasi, Ghana',
    type: 'Volunteering',
    description: 'Join our team as a volunteer coordinator and help organize community development programs. You\'ll work with local communities to implement education, health, and empowerment initiatives. This is a meaningful opportunity to make a real difference.\n\nResponsibilities:\n• Coordinate volunteer activities\n• Organize community events\n• Manage outreach programs\n• Build community relationships\n• Track program impact',
    applicationLink: 'https://hopefoundation.org/volunteer/coordinator',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Passion for community work', 'Good communication', 'Weekend availability', 'Team player', 'Organizational skills'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1559027615000 + i * 500}-cd4628902d4a?w=800&auto=format&fit=crop&q=60`),
  },
  '7': {
    id: '7',
    title: 'National Service - IT Support',
    company: 'National Communications Authority',
    location: 'Accra, Ghana',
    type: 'National Service',
    salary: 'Government Allowance',
    description: 'Join the National Communications Authority for your national service posting. Provide IT support, maintain systems, and assist with technology projects. This is an excellent opportunity to gain professional experience in a government institution.\n\nDuties:\n• Provide technical support\n• Maintain IT systems\n• Assist with software deployment\n• Document IT procedures\n• Support staff with tech issues',
    applicationLink: 'https://nca.gov.gh/national-service/it-support',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['IT background', 'Service placement', 'Available for 1 year', 'Problem-solving skills', 'Customer service'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1573164713000 + i * 500}-8665fc963095?w=800&auto=format&fit=crop&q=60`),
  },
  '8': {
    id: '8',
    title: 'Part-Time Content Writer',
    company: 'Creative Studios',
    location: 'Accra, Ghana',
    type: 'Part Time',
    salary: '$600/month',
    description: 'We\'re looking for a talented content writer to create engaging articles, blog posts, and website copy. Work flexible hours and contribute to diverse content projects for our clients.\n\nWhat you\'ll create:\n• Blog posts and articles\n• Website copy\n• Social media content\n• Marketing materials\n• Product descriptions',
    applicationLink: 'https://creativestudios.com/jobs/content-writer',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Good writing skills', 'Flexible hours', 'Portfolio required', 'SEO knowledge', 'Research skills'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1455390582000 + i * 500}-044cdead277a?w=800&auto=format&fit=crop&q=60`),
  },
  '9': {
    id: '9',
    title: 'Volunteer Community Organizer',
    company: 'Youth Impact Foundation',
    location: 'Kumasi, Ghana',
    type: 'Volunteering',
    description: 'Be part of meaningful change as a volunteer community organizer. Help plan and execute youth empowerment programs, community clean-ups, and educational initiatives. Make a lasting impact in your community.\n\nYour role:\n• Organize youth programs\n• Plan community events\n• Mobilize volunteers\n• Coordinate with local leaders\n• Track program outcomes',
    applicationLink: 'https://youthimpact.org/volunteer',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Passion for community work', 'Good communication', 'Weekend availability', 'Leadership skills', 'Enthusiasm'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1559027615000 + i * 600}-cd4628902d4a?w=800&auto=format&fit=crop&q=60`),
  },
  '10': {
    id: '10',
    title: 'Senior Accountant',
    company: 'Finance Group Ltd',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$4,000 - $6,000/month',
    description: 'Seeking an experienced Senior Accountant to manage financial operations and reporting. You\'ll oversee accounting processes, prepare financial statements, and ensure regulatory compliance.\n\nKey duties:\n• Prepare financial statements\n• Manage accounting team\n• Ensure tax compliance\n• Conduct financial analysis\n• Implement internal controls',
    applicationLink: 'https://financegroup.com/careers/senior-accountant',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['CPA/ACCA', '5+ years experience', 'ERP knowledge', 'Leadership skills', 'Analytical thinking'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1554224311000 + i * 500}-beee2f770c4f?w=800&auto=format&fit=crop&q=60`),
  },
  '11': {
    id: '11',
    title: 'Engineering Intern',
    company: 'Tech Manufacturing Co',
    location: 'Tema, Ghana',
    type: 'Internships',
    salary: '$400/month',
    description: 'Join our engineering team as an intern and gain practical experience in manufacturing processes. Work on real projects, learn from experienced engineers, and develop your technical skills.\n\nLearning opportunities:\n• Manufacturing processes\n• Quality control\n• Equipment maintenance\n• Technical documentation\n• Project management',
    applicationLink: 'https://techmanufacturing.com/internship',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Engineering student', '3rd/4th year', 'Available 6 months', 'Technical aptitude', 'Team player'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1581092795000 + i * 500}-fd1ca04f0952?w=800&auto=format&fit=crop&q=60`),
  },
  '12': {
    id: '12',
    title: 'Remote Customer Support',
    company: 'E-Commerce Platform',
    location: 'Remote',
    type: 'Remote Work',
    salary: '$1,200 - $1,800/month',
    description: 'Provide excellent customer support for our growing e-commerce platform. Work remotely and help customers with inquiries, resolve issues, and ensure customer satisfaction.\n\nResponsibilities:\n• Answer customer inquiries\n• Resolve complaints\n• Process orders and returns\n• Maintain customer records\n• Provide product information',
    applicationLink: 'https://ecommerceplatform.com/jobs/support',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Customer service experience', 'Good communication', 'Problem-solving', 'Computer skills', 'Patience'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1553877522000 + i * 500}-43269d4ea984?w=800&auto=format&fit=crop&q=60`),
  },
  '13': {
    id: '13',
    title: 'National Service - Healthcare',
    company: 'Ghana Health Service',
    location: 'Various Hospitals',
    type: 'National Service',
    description: 'Complete your national service in the healthcare sector. Support medical staff, assist with patient care, and gain valuable experience in a hospital environment.\n\nDuties:\n• Assist medical staff\n• Support patient care\n• Maintain medical records\n• Help with health education\n• Participate in community outreach',
    applicationLink: 'https://ghs.gov.gh/national-service',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Health-related education', 'Service placement', '1-year commitment', 'Compassion', 'Teamwork'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1584982751000 + i * 500}-97dcc096659c?w=800&auto=format&fit=crop&q=60`),
  },
  '14': {
    id: '14',
    title: 'Part-Time Sales Assistant',
    company: 'Retail Store',
    location: 'Accra Mall',
    type: 'Part Time',
    salary: '$500/month',
    description: 'Join our retail team as a part-time sales assistant. Help customers, process transactions, and maintain store presentation. Flexible hours available.\n\nDuties:\n• Assist customers\n• Process sales\n• Maintain store displays\n• Handle inventory\n• Provide product information',
    applicationLink: 'https://retailstore.com/jobs/sales-assistant',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Customer service skills', 'Flexible availability', 'Positive attitude', 'Sales experience preferred', 'Reliable'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1441986300000 + i * 500}-64674bd600d8?w=800&auto=format&fit=crop&q=60`),
  },
  '15': {
    id: '15',
    title: 'Volunteer Teaching Assistant',
    company: 'Education For All',
    location: 'Rural Communities',
    type: 'Volunteering',
    description: 'Make a difference in rural education as a volunteer teaching assistant. Support teachers, tutor students, and help improve educational outcomes in underserved communities.\n\nYour impact:\n• Assist classroom teachers\n• Tutor struggling students\n• Develop learning materials\n• Organize educational activities\n• Mentor students',
    applicationLink: 'https://educationforall.org/volunteer/teaching',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Passion for education', 'Good with children', 'Patient', 'Reliable transport', 'Weekend commitment'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1503676260000 + i * 500}-1c00da094a0b?w=800&auto=format&fit=crop&q=60`),
  },
  '16': {
    id: '16',
    title: 'HR Intern',
    company: 'Corporate Solutions',
    location: 'Accra, Ghana',
    type: 'Internships',
    salary: '$450/month',
    description: 'Gain practical HR experience with our corporate team. Learn recruitment, employee relations, training coordination, and HR administration.\n\nLearning areas:\n• Recruitment and onboarding\n• Employee records management\n• Training coordination\n• HR policy implementation\n• Performance management support',
    applicationLink: 'https://corporatesolutions.com/internships/hr',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['HR/Business student', 'Good interpersonal skills', 'Organized', 'Confidentiality', 'MS Office'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1521737604000 + i * 500}-d14cc237f11d?w=800&auto=format&fit=crop&q=60`),
  },
  '17': {
    id: '17',
    title: 'Project Manager',
    company: 'Construction Ltd',
    location: 'Tema, Ghana',
    type: 'Full Time Jobs',
    salary: '$3,500 - $5,500/month',
    description: 'Lead construction projects from planning to completion. Manage teams, budgets, and timelines while ensuring quality and safety standards.\n\nKey responsibilities:\n• Plan and schedule projects\n• Manage project budgets\n• Coordinate construction teams\n• Ensure safety compliance\n• Report to stakeholders',
    applicationLink: 'https://constructionltd.com/careers/project-manager',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Construction management degree', '5+ years experience', 'PMP certification preferred', 'Leadership', 'Problem-solving'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1507537297000 + i * 500}-24a1c029d3ca?w=800&auto=format&fit=crop&q=60`),
  },
  '18': {
    id: '18',
    title: 'Remote Digital Marketer',
    company: 'Marketing Agency',
    location: 'Remote',
    type: 'Remote Work',
    salary: '$1,800 - $2,500/month',
    description: 'Join our digital marketing team and work remotely on campaigns for diverse clients. Create and manage digital marketing strategies across multiple platforms.\n\nWhat you\'ll do:\n• Develop marketing strategies\n• Manage social media campaigns\n• Create content calendars\n• Analyze campaign performance\n• Optimize ad spending',
    applicationLink: 'https://marketingagency.com/remote/digital-marketer',
    postedDate: new Date().toLocaleDateString(),
    requirements: ['Digital marketing experience', 'Social media expertise', 'Google Ads/Facebook Ads', 'Analytics', 'Creative thinking'],
    images: Array.from({ length: 20 }, (_, i) => `https://images.unsplash.com/photo-${1460925895000 + i * 500}-afdab827c52f?w=800&auto=format&fit=crop&q=60`),
  },
};

// Similar jobs for recommendations
const SIMILAR_JOBS = [
  {
    id: '4',
    title: 'Data Analyst',
    company: 'FinTech Solutions',
    location: 'Tema, Ghana',
    type: 'Full Time Jobs',
    salary: '$2,000 - $3,500/month',
    image: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '5',
    title: 'Product Design Intern',
    company: 'Creative Hub',
    location: 'Remote',
    type: 'Internships',
    salary: '$800/month',
    image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=60',
  },
  {
    id: '6',
    title: 'Business Development',
    company: 'Growth Partners',
    location: 'Accra, Ghana',
    type: 'Full Time Jobs',
    salary: '$1,500 - $2,500/month',
    image: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&auto=format&fit=crop&q=60',
  },
];

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      console.log('[JobDetails] Fetching job with id:', id);
      
      // First check if it's a sample job
      if (SAMPLE_JOBS[id as string]) {
        setJob(SAMPLE_JOBS[id as string]);
        setLoading(false);
        return;
      }
      
      // Otherwise fetch from database
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('id', id)
        .eq('listing_type', 'job') // Only fetch job listings
        .single();

      if (error) throw error;

      if (data) {
        // Parse the description to extract company, location, description, and application link
        const descParts = data.description.split(' | ');
        const company = descParts[0] || 'Company';
        const location = descParts[1] || 'Location';
        const description = descParts[2] || data.description;
        
        // Extract application link
        let applicationLink = '';
        if (descParts[3] && descParts[3].includes('Application Link:')) {
          applicationLink = descParts[3].replace('Application Link:', '').trim();
        }

        // Parse images from image_url (which is stored as JSON array)
        let images: string[] = [];
        if (data.image_url) {
          try {
            if (data.image_url.startsWith('[')) {
              // It's a JSON array
              const parsed = JSON.parse(data.image_url);
              images = Array.isArray(parsed) ? parsed : [data.image_url];
            } else {
              // It's a single URL
              images = [data.image_url];
            }
          } catch (e) {
            console.log('Failed to parse image_url, using as single URL');
            images = [data.image_url];
          }
        }
        
        // If no images, use placeholder
        if (images.length === 0) {
          images = Array.from({ length: 20 }, (_, i) => 
            `https://images.unsplash.com/photo-${1486406146926 + i * 1000}?w=800&auto=format&fit=crop&q=60`
          );
        }

        setJob({
          id: data.id,
          title: data.title,
          company,
          location,
          salary: data.price ? `$${data.price}/month` : undefined,
          description,
          applicationLink,
          type: data.category_name || 'Full Time Jobs',
          imageUrl: images[0], // First image as main image
          postedDate: new Date(data.created_at).toLocaleDateString(),
          images,
        });
      }
    } catch (error) {
      console.error('[JobDetails] Error fetching job:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyNow = async () => {
    if (!job?.applicationLink) {
      Alert.alert('No Application Link', 'This job does not have an application link available.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(job.applicationLink);
      if (canOpen) {
        await Linking.openURL(job.applicationLink);
      } else {
        Alert.alert('Invalid Link', 'Unable to open the application link.');
      }
    } catch (error) {
      console.error('[JobDetails] Error opening link:', error);
      Alert.alert('Error', 'Failed to open application link.');
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Briefcase size={64} color="#CBD5E1" />
          <Text style={{ marginTop: 24, fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#666666' }}>
            Job not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Job Image */}
        {(job.imageUrl || job.images?.[0]) && (
          <Image source={{ uri: job.imageUrl || job.images?.[0] }} style={styles.mainImage} />
        )}

        {/* Job Header */}
        <View style={styles.jobHeader}>
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>{job.type}</Text>
          </View>
          <Text style={styles.jobTitle}>{job.title}</Text>
        </View>

        {/* Company Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Building2 size={20} color="#666666" />
            <Text style={styles.infoText}>{job.company}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={20} color="#666666" />
            <Text style={styles.infoText}>{job.location}</Text>
          </View>
          {job.salary && (
            <View style={styles.infoRow}>
              <Wallet size={20} color="#666666" />
              <Text style={styles.infoText}>{job.salary}</Text>
            </View>
          )}
          {job.postedDate && (
            <View style={styles.infoRow}>
              <Calendar size={20} color="#666666" />
              <Text style={styles.infoText}>Posted on {job.postedDate}</Text>
            </View>
          )}
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapPlaceholder}>
            <MapPin size={48} color="#CBD5E1" />
            <Text style={styles.mapText}>{job.location}</Text>
            <Text style={styles.mapSubtext}>Map view coming soon</Text>
          </View>
        </View>

        {/* Job Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.descriptionText}>{job.description}</Text>
        </View>

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.requirementsList}>
              {job.requirements.map((req, index) => (
                <View key={index} style={styles.requirementItem}>
                  <View style={styles.requirementDot} />
                  <Text style={styles.requirementText}>{req}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Company Images Gallery */}
        {job.images && job.images.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Gallery</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContainer}
            >
              {job.images.map((img, index) => (
                <Image key={index} source={{ uri: img }} style={styles.galleryImage} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Application Link */}
        {job.applicationLink && (
          <View style={styles.applicationLinkSection}>
            <Text style={styles.sectionTitle}>Application Link</Text>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleApplyNow}
            >
              <ExternalLink size={16} color="#4169E1" />
              <Text style={styles.linkButtonText} numberOfLines={1}>
                {job.applicationLink}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Similar Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Similar Opportunities</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.similarJobsContainer}
          >
            {SIMILAR_JOBS.map((similarJob) => (
              <TouchableOpacity 
                key={similarJob.id} 
                style={styles.similarJobCard}
                onPress={() => router.push(`/workplace/${similarJob.id}` as any)}
              >
                <Image source={{ uri: similarJob.image }} style={styles.similarJobImage} />
                <View style={styles.similarJobInfo}>
                  <Text style={styles.similarJobTitle} numberOfLines={2}>{similarJob.title}</Text>
                  <Text style={styles.similarJobCompany} numberOfLines={1}>{similarJob.company}</Text>
                  <View style={styles.similarJobDetails}>
                    <MapPin size={12} color="#666666" />
                    <Text style={styles.similarJobLocation} numberOfLines={1}>{similarJob.location}</Text>
                  </View>
                  <Text style={styles.similarJobSalary}>{similarJob.salary}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Apply Button at Bottom */}
      {job.applicationLink && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyNow}>
            <Text style={styles.applyButtonText}>Apply Now</Text>
            <ExternalLink size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  content: {
    flex: 1,
  },
  mainImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F8F9FA',
  },
  jobHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  typeTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
  },
  jobTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  infoSection: {
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  mapSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  mapText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
  },
  requirementsList: {
    gap: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4169E1',
    marginTop: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 24,
  },
  galleryContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  galleryImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginRight: 12,
  },
  applicationLinkSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4169E1',
  },
  similarJobsContainer: {
    paddingVertical: 8,
    gap: 16,
  },
  similarJobCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  similarJobImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F8F9FA',
  },
  similarJobInfo: {
    padding: 12,
    gap: 6,
  },
  similarJobTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000000',
  },
  similarJobCompany: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  similarJobDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  similarJobLocation: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  similarJobSalary: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4169E1',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4169E1',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
