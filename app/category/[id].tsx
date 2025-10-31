import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useState, useCallback } from 'react';
import { SplashScreen, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, Heart, Briefcase, GraduationCap, Wrench, Palette, Coffee, Stethoscope, Book, Camera, Home, Car, Shirt, Dumbbell, Scissors, PawPrint, Music, Hammer, Smartphone, Sofa, ShoppingCart, Watch, Backpack, Sparkles, Baby, Utensils } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, type ProductService, type Profile } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const CATEGORIES = [
  { id: '1', name: 'Business Services', icon: Briefcase },
  { id: '2', name: 'Education & Tutoring', icon: GraduationCap },
  { id: '3', name: 'Technical Services', icon: Wrench },
  { id: '4', name: 'Creative & Design', icon: Palette },
  { id: '5', name: 'Food & Catering', icon: Coffee },
  { id: '6', name: 'Healthcare', icon: Stethoscope },
  { id: '7', name: 'Publishing', icon: Book },
  { id: '8', name: 'Photography', icon: Camera },
  { id: '9', name: 'Home Services', icon: Home },
  { id: '10', name: 'Automotive', icon: Car },
  { id: '11', name: 'Fashion & Beauty', icon: Shirt },
  { id: '12', name: 'Fitness & Sports', icon: Dumbbell },
  { id: '13', name: 'Hair & Salon', icon: Scissors },
  { id: '14', name: 'Pet Care', icon: PawPrint },
  { id: '15', name: 'Entertainment', icon: Music },
  { id: '16', name: 'Construction', icon: Hammer },
  { id: '17', name: 'Electronics', icon: Smartphone },
  { id: '18', name: 'Furniture', icon: Sofa },
  { id: '19', name: 'Clothing & Apparel', icon: ShoppingCart },
  { id: '20', name: 'Watches & Jewelry', icon: Watch },
  { id: '21', name: 'Bags & Accessories', icon: Backpack },
  { id: '22', name: 'Books & Stationery', icon: Book },
  { id: '23', name: 'Beauty Products', icon: Sparkles },
  { id: '24', name: 'Baby & Kids', icon: Baby },
  { id: '25', name: 'Kitchen & Dining', icon: Utensils },
];

// Sample products for each category (same as in services page)
const SAMPLE_PRODUCTS = [
  // Business Services
  {
    id: 'sample-1',
    title: 'Business Consulting & Strategy',
    description: 'Expert business consulting for startups and SMEs',
    price: 250,
    category_name: 'Business Services',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
    rating: '4.9',
    reviews: 127,
  },
  {
    id: 'sample-2',
    title: 'Digital Marketing Services',
    description: 'Social media management and online marketing',
    price: 180,
    category_name: 'Business Services',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    rating: '4.8',
    reviews: 95,
  },
  {
    id: 'sample-3',
    title: 'Financial Planning & Advisory',
    description: 'Professional financial planning and investment advice',
    price: 300,
    category_name: 'Business Services',
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    rating: '4.9',
    reviews: 143,
  },
  // Education & Tutoring
  {
    id: 'sample-4',
    title: 'Mathematics Tutoring',
    description: 'High school and university level math tutoring',
    price: 80,
    category_name: 'Education & Tutoring',
    image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800',
    rating: '4.9',
    reviews: 156,
  },
  {
    id: 'sample-5',
    title: 'English Language Tutoring',
    description: 'English lessons for all proficiency levels',
    price: 70,
    category_name: 'Education & Tutoring',
    image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    rating: '4.8',
    reviews: 132,
  },
  {
    id: 'sample-6',
    title: 'Computer Programming Lessons',
    description: 'Learn Python, JavaScript, and web development',
    price: 120,
    category_name: 'Education & Tutoring',
    image_url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
    rating: '4.9',
    reviews: 189,
  },
  // Technical Services
  {
    id: 'sample-7',
    title: 'Web Development Services',
    description: 'Custom websites and web applications',
    price: 500,
    category_name: 'Technical Services',
    image_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    rating: '4.9',
    reviews: 178,
  },
  {
    id: 'sample-8',
    title: 'Mobile App Development',
    description: 'iOS and Android app development',
    price: 800,
    category_name: 'Technical Services',
    image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800',
    rating: '4.8',
    reviews: 145,
  },
  {
    id: 'sample-9',
    title: 'IT Support & Maintenance',
    description: 'Computer repair and technical support',
    price: 100,
    category_name: 'Technical Services',
    image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
    rating: '4.7',
    reviews: 167,
  },
  // Creative & Design
  {
    id: 'sample-10',
    title: 'Graphic Design Services',
    description: 'Logo design, branding, and visual identity',
    price: 200,
    category_name: 'Creative & Design',
    image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800',
    rating: '4.9',
    reviews: 198,
  },
  {
    id: 'sample-11',
    title: 'Video Editing',
    description: 'Professional video editing for businesses',
    price: 350,
    category_name: 'Creative & Design',
    image_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
    rating: '4.8',
    reviews: 134,
  },
  {
    id: 'sample-12',
    title: 'Content Writing',
    description: 'Blog posts, articles, and copywriting',
    price: 150,
    category_name: 'Creative & Design',
    image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
    rating: '4.9',
    reviews: 156,
  },
  // Food & Catering
  {
    id: 'sample-13',
    title: 'Catering Services',
    description: 'Professional catering for events and parties',
    price: 450,
    category_name: 'Food & Catering',
    image_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
    rating: '4.9',
    reviews: 223,
  },
  {
    id: 'sample-14',
    title: 'Personal Chef Services',
    description: 'Private chef for home cooking',
    price: 300,
    category_name: 'Food & Catering',
    image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
    rating: '4.8',
    reviews: 167,
  },
  {
    id: 'sample-15',
    title: 'Meal Prep Services',
    description: 'Weekly meal preparation and delivery',
    price: 200,
    category_name: 'Food & Catering',
    image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    rating: '4.8',
    reviews: 189,
  },
  // Healthcare
  {
    id: 'sample-16',
    title: 'Nursing Services',
    description: 'Home nursing and patient care',
    price: 180,
    category_name: 'Healthcare',
    image_url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800',
    rating: '4.9',
    reviews: 178,
  },
  {
    id: 'sample-17',
    title: 'Physical Therapy',
    description: 'Rehabilitation and physical therapy services',
    price: 150,
    category_name: 'Healthcare',
    image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
    rating: '4.8',
    reviews: 145,
  },
  {
    id: 'sample-18',
    title: 'Nutrition Consulting',
    description: 'Personalized diet and nutrition plans',
    price: 120,
    category_name: 'Healthcare',
    image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
    rating: '4.9',
    reviews: 201,
  },
  // Publishing
  {
    id: 'sample-19',
    title: 'Self-Publishing Services',
    description: 'Complete book publishing and distribution',
    price: 400,
    category_name: 'Publishing',
    image_url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800',
    rating: '4.8',
    reviews: 123,
  },
  {
    id: 'sample-20',
    title: 'Book Editing',
    description: 'Professional manuscript editing and proofreading',
    price: 120,
    category_name: 'Publishing',
    image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    rating: '4.9',
    reviews: 167,
  },
  {
    id: 'sample-21',
    title: 'Translation Services',
    description: 'Document translation in multiple languages',
    price: 90,
    category_name: 'Publishing',
    image_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800',
    rating: '4.7',
    reviews: 134,
  },
  // Photography
  {
    id: 'sample-22',
    title: 'Event Photography',
    description: 'Professional photography for weddings and events',
    price: 400,
    category_name: 'Photography',
    image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
    rating: '4.9',
    reviews: 189,
  },
  {
    id: 'sample-23',
    title: 'Portrait Photography',
    description: 'Studio and outdoor portrait sessions',
    price: 150,
    category_name: 'Photography',
    image_url: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800',
    rating: '4.8',
    reviews: 145,
  },
  {
    id: 'sample-24',
    title: 'Product Photography',
    description: 'Commercial product photography for businesses',
    price: 200,
    category_name: 'Photography',
    image_url: 'https://images.unsplash.com/photo-1505739998589-00fc191ce01d?w=800',
    rating: '4.9',
    reviews: 156,
  },
  // Home Services
  {
    id: 'sample-25',
    title: 'House Cleaning Services',
    description: 'Professional residential cleaning',
    price: 120,
    category_name: 'Home Services',
    image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
    rating: '4.8',
    reviews: 142,
  },
  {
    id: 'sample-26',
    title: 'Plumbing Services',
    description: 'Expert plumbing repairs and installations',
    price: 150,
    category_name: 'Home Services',
    image_url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800',
    rating: '4.9',
    reviews: 167,
  },
  {
    id: 'sample-27',
    title: 'Electrical Services',
    description: 'Licensed electrician for home repairs',
    price: 160,
    category_name: 'Home Services',
    image_url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
    rating: '4.9',
    reviews: 134,
  },
  // Automotive
  {
    id: 'sample-28',
    title: 'Auto Repair Services',
    description: 'Complete car repair and maintenance',
    price: 200,
    category_name: 'Automotive',
    image_url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800',
    rating: '4.8',
    reviews: 198,
  },
  {
    id: 'sample-29',
    title: 'Car Detailing',
    description: 'Professional car cleaning and detailing',
    price: 100,
    category_name: 'Automotive',
    image_url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800',
    rating: '4.9',
    reviews: 156,
  },
  {
    id: 'sample-30',
    title: 'Mobile Mechanic',
    description: 'On-site car repair and diagnostics',
    price: 180,
    category_name: 'Automotive',
    image_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800',
    rating: '4.8',
    reviews: 123,
  },
  // Fashion & Beauty
  {
    id: 'sample-31',
    title: 'Personal Styling',
    description: 'Fashion consulting and wardrobe styling',
    price: 130,
    category_name: 'Fashion & Beauty',
    image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    rating: '4.9',
    reviews: 145,
  },
  {
    id: 'sample-32',
    title: 'Makeup Artist',
    description: 'Professional makeup for events and weddings',
    price: 150,
    category_name: 'Fashion & Beauty',
    image_url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    rating: '4.9',
    reviews: 189,
  },
  {
    id: 'sample-33',
    title: 'Tailoring & Alterations',
    description: 'Custom tailoring and clothing alterations',
    price: 80,
    category_name: 'Fashion & Beauty',
    image_url: 'https://images.unsplash.com/photo-1558769132-cb1aea3c184e?w=800',
    rating: '4.8',
    reviews: 167,
  },
  // Fitness & Sports
  {
    id: 'sample-34',
    title: 'Personal Training',
    description: 'One-on-one fitness training sessions',
    price: 100,
    category_name: 'Fitness & Sports',
    image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    rating: '4.9',
    reviews: 178,
  },
  {
    id: 'sample-35',
    title: 'Yoga Instruction',
    description: 'Private and group yoga classes',
    price: 70,
    category_name: 'Fitness & Sports',
    image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    rating: '4.8',
    reviews: 156,
  },
  {
    id: 'sample-36',
    title: 'Sports Coaching',
    description: 'Professional coaching for various sports',
    price: 90,
    category_name: 'Fitness & Sports',
    image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
    rating: '4.9',
    reviews: 143,
  },
  // Hair & Salon
  {
    id: 'sample-37',
    title: 'Hair Styling Services',
    description: 'Professional hair cutting and styling',
    price: 60,
    category_name: 'Hair & Salon',
    image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    rating: '4.9',
    reviews: 234,
  },
  {
    id: 'sample-38',
    title: 'Hair Coloring',
    description: 'Expert hair coloring and highlights',
    price: 120,
    category_name: 'Hair & Salon',
    image_url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800',
    rating: '4.8',
    reviews: 189,
  },
  {
    id: 'sample-39',
    title: 'Manicure & Pedicure',
    description: 'Nail care and beauty treatments',
    price: 50,
    category_name: 'Hair & Salon',
    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    rating: '4.9',
    reviews: 198,
  },
  // Pet Care
  {
    id: 'sample-40',
    title: 'Dog Walking Services',
    description: 'Professional dog walking and exercise',
    price: 40,
    category_name: 'Pet Care',
    image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800',
    rating: '4.9',
    reviews: 167,
  },
  {
    id: 'sample-41',
    title: 'Pet Grooming',
    description: 'Complete pet grooming and bathing',
    price: 80,
    category_name: 'Pet Care',
    image_url: 'https://images.unsplash.com/photo-1585559700398-1385b3a8aeb6?w=800',
    rating: '4.8',
    reviews: 145,
  },
  {
    id: 'sample-42',
    title: 'Pet Sitting',
    description: 'In-home pet care and sitting services',
    price: 60,
    category_name: 'Pet Care',
    image_url: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800',
    rating: '4.9',
    reviews: 178,
  },
  // Entertainment
  {
    id: 'sample-43',
    title: 'DJ Services',
    description: 'Professional DJ for events and parties',
    price: 350,
    category_name: 'Entertainment',
    image_url: 'https://images.unsplash.com/photo-1571266028243-d220c4f1d5b2?w=800',
    rating: '4.9',
    reviews: 189,
  },
  {
    id: 'sample-44',
    title: 'Live Band Performance',
    description: 'Live music for weddings and events',
    price: 600,
    category_name: 'Entertainment',
    image_url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
    rating: '4.9',
    reviews: 156,
  },
  {
    id: 'sample-45',
    title: 'MC & Host Services',
    description: 'Professional event hosting and emceeing',
    price: 250,
    category_name: 'Entertainment',
    image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
    rating: '4.8',
    reviews: 134,
  },
  // Construction
  {
    id: 'sample-46',
    title: 'General Contracting',
    description: 'Home renovation and construction services',
    price: 500,
    category_name: 'Construction',
    image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800',
    rating: '4.9',
    reviews: 167,
  },
  {
    id: 'sample-47',
    title: 'Painting Services',
    description: 'Interior and exterior painting',
    price: 180,
    category_name: 'Construction',
    image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800',
    rating: '4.8',
    reviews: 145,
  },
  {
    id: 'sample-48',
    title: 'Carpentry Services',
    description: 'Custom woodwork and furniture building',
    price: 220,
    category_name: 'Construction',
    image_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800',
    rating: '4.9',
    reviews: 178,
  },
  // Electronics
  {
    id: 'sample-49',
    title: 'Wireless Earbuds',
    description: 'Premium noise-canceling wireless earbuds',
    price: 450,
    category_name: 'Electronics',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800',
    rating: '4.8',
    reviews: 234,
  },
  {
    id: 'sample-50',
    title: 'Smart Watch',
    description: 'Fitness tracking smartwatch with heart rate monitor',
    price: 650,
    category_name: 'Electronics',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    rating: '4.9',
    reviews: 189,
  },
  {
    id: 'sample-51',
    title: 'Bluetooth Speaker',
    description: 'Portable waterproof bluetooth speaker',
    price: 280,
    category_name: 'Electronics',
    image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    rating: '4.7',
    reviews: 156,
  },
  // Furniture
  {
    id: 'sample-52',
    title: 'Office Chair',
    description: 'Ergonomic office chair with lumbar support',
    price: 850,
    category_name: 'Furniture',
    image_url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800',
    rating: '4.9',
    reviews: 167,
  },
  {
    id: 'sample-53',
    title: 'Coffee Table',
    description: 'Modern wooden coffee table',
    price: 1200,
    category_name: 'Furniture',
    image_url: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800',
    rating: '4.8',
    reviews: 143,
  },
  {
    id: 'sample-54',
    title: 'Bookshelf',
    description: '5-tier wooden bookshelf for home or office',
    price: 680,
    category_name: 'Furniture',
    image_url: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800',
    rating: '4.8',
    reviews: 128,
  },
  // Clothing & Apparel
  {
    id: 'sample-55',
    title: 'African Print Dress',
    description: 'Beautiful ankara dress with modern design',
    price: 180,
    category_name: 'Clothing & Apparel',
    image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800',
    rating: '4.9',
    reviews: 201,
  },
  {
    id: 'sample-56',
    title: 'Men\'s Casual Shirt',
    description: 'Cotton casual shirt for everyday wear',
    price: 120,
    category_name: 'Clothing & Apparel',
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
    rating: '4.7',
    reviews: 178,
  },
  {
    id: 'sample-57',
    title: 'Sneakers',
    description: 'Comfortable sports sneakers for daily use',
    price: 250,
    category_name: 'Clothing & Apparel',
    image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
    rating: '4.8',
    reviews: 223,
  },
  // Watches & Jewelry
  {
    id: 'sample-58',
    title: 'Gold Necklace',
    description: 'Elegant 18k gold necklace',
    price: 1500,
    category_name: 'Watches & Jewelry',
    image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    rating: '4.9',
    reviews: 145,
  },
  {
    id: 'sample-59',
    title: 'Men\'s Wristwatch',
    description: 'Classic leather strap wristwatch',
    price: 850,
    category_name: 'Watches & Jewelry',
    image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
    rating: '4.8',
    reviews: 167,
  },
  {
    id: 'sample-60',
    title: 'Silver Earrings',
    description: 'Sterling silver hoop earrings',
    price: 320,
    category_name: 'Watches & Jewelry',
    image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    rating: '4.9',
    reviews: 189,
  },
  // Bags & Accessories
  {
    id: 'sample-61',
    title: 'Leather Backpack',
    description: 'Genuine leather backpack for work or travel',
    price: 680,
    category_name: 'Bags & Accessories',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    rating: '4.9',
    reviews: 198,
  },
  {
    id: 'sample-62',
    title: 'Women\'s Handbag',
    description: 'Stylish designer handbag',
    price: 950,
    category_name: 'Bags & Accessories',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    rating: '4.8',
    reviews: 167,
  },
  {
    id: 'sample-63',
    title: 'Sunglasses',
    description: 'UV protection sunglasses with polarized lenses',
    price: 180,
    category_name: 'Bags & Accessories',
    image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800',
    rating: '4.7',
    reviews: 134,
  },
  // Books & Stationery
  {
    id: 'sample-64',
    title: 'African Literature Collection',
    description: 'Set of classic African novels',
    price: 150,
    category_name: 'Books & Stationery',
    image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
    rating: '4.9',
    reviews: 201,
  },
  {
    id: 'sample-65',
    title: 'Notebook Set',
    description: 'Premium leather-bound notebooks for journaling',
    price: 80,
    category_name: 'Books & Stationery',
    image_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800',
    rating: '4.8',
    reviews: 156,
  },
  {
    id: 'sample-66',
    title: 'Art Supplies Kit',
    description: 'Complete drawing and painting supplies',
    price: 220,
    category_name: 'Books & Stationery',
    image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800',
    rating: '4.9',
    reviews: 178,
  },
  // Beauty Products
  {
    id: 'sample-67',
    title: 'Natural Skincare Set',
    description: 'Organic skincare products for all skin types',
    price: 380,
    category_name: 'Beauty Products',
    image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800',
    rating: '4.9',
    reviews: 234,
  },
  {
    id: 'sample-68',
    title: 'Shea Butter Cream',
    description: 'Pure Ghanaian shea butter moisturizer',
    price: 120,
    category_name: 'Beauty Products',
    image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
    rating: '4.9',
    reviews: 289,
  },
  {
    id: 'sample-69',
    title: 'Hair Care Bundle',
    description: 'Natural hair care products for African hair',
    price: 280,
    category_name: 'Beauty Products',
    image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=800',
    rating: '4.8',
    reviews: 212,
  },
  // Baby & Kids
  {
    id: 'sample-70',
    title: 'Baby Clothes Set',
    description: 'Soft cotton baby clothes 0-12 months',
    price: 180,
    category_name: 'Baby & Kids',
    image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    rating: '4.9',
    reviews: 167,
  },
  {
    id: 'sample-71',
    title: 'Educational Toys',
    description: 'Learning toys for toddlers and kids',
    price: 150,
    category_name: 'Baby & Kids',
    image_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800',
    rating: '4.8',
    reviews: 145,
  },
  {
    id: 'sample-72',
    title: 'Baby Stroller',
    description: 'Lightweight foldable baby stroller',
    price: 950,
    category_name: 'Baby & Kids',
    image_url: 'https://images.unsplash.com/photo-1588362951121-3ee319b018b2?w=800',
    rating: '4.9',
    reviews: 178,
  },
  // Kitchen & Dining
  {
    id: 'sample-73',
    title: 'Cookware Set',
    description: 'Non-stick pots and pans set',
    price: 480,
    category_name: 'Kitchen & Dining',
    image_url: 'https://images.unsplash.com/photo-1584990347449-39db9e54e4b3?w=800',
    rating: '4.8',
    reviews: 198,
  },
  {
    id: 'sample-74',
    title: 'Dinner Plate Set',
    description: 'Ceramic dinner plates for 6 people',
    price: 320,
    category_name: 'Kitchen & Dining',
    image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
    rating: '4.7',
    reviews: 134,
  },
  {
    id: 'sample-75',
    title: 'Blender',
    description: 'High-speed blender for smoothies and cooking',
    price: 380,
    category_name: 'Kitchen & Dining',
    image_url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800',
    rating: '4.9',
    reviews: 223,
  },
];

interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: string;
  reviews?: number;
}

export default function CategoryScreen() {
  const router = useRouter();
  const { id: categoryId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [products, setProducts] = useState<ProductServiceWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedItems, setBookmarkedItems] = useState<Set<string>>(new Set());

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Get current category
  const currentCategory = CATEGORIES.find(cat => cat.id === categoryId);
  const CategoryIcon = currentCategory?.icon || Briefcase;

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('service_bookmarks')
        .select('service_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const bookmarkedSet = new Set(data?.map(b => b.service_id) || []);
      setBookmarkedItems(bookmarkedSet);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  }, [user]);

  const fetchCategoryProducts = useCallback(async () => {
    try {
      setLoading(true);

      // Create sample user profile
      const sampleUser: Profile = {
        id: 'sample-user',
        username: 'akora_demo',
        full_name: 'Akora Demo',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Filter sample products for this category
      const categorySampleProducts = SAMPLE_PRODUCTS
        .filter(product => product.category_name === currentCategory?.name)
        .map(product => ({
          ...product,
          user_id: sampleUser.id,
          category_name: product.category_name,
          is_featured: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: sampleUser,
        })) as ProductServiceWithUser[];

      try {
        // Try to fetch from database
        const { data: dbProducts, error } = await supabase
          .from('products_services')
          .select(`
            *,
            user:profiles(*)
          `)
          .eq('category_name', currentCategory?.name || '');

        if (error) throw error;

        const productsWithUser = (dbProducts || []).map(product => ({
          ...product,
          user: product.user as unknown as Profile,
          rating: product.rating?.toString() || '4.5',
          reviews: product.reviews || 0,
        })) as ProductServiceWithUser[];

        // Combine database products with sample products
        const allProducts = [...productsWithUser, ...categorySampleProducts];
        setProducts(allProducts);
      } catch (dbError) {
        console.log('Database fetch failed, using sample products only:', dbError);
        setProducts(categorySampleProducts);
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentCategory]);

  const toggleBookmark = async (productId: string) => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to bookmark items');
      return;
    }

    try {
      if (bookmarkedItems.has(productId)) {
        // Remove bookmark
        const { error } = await supabase
          .from('service_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('service_id', productId);

        if (error) throw error;

        setBookmarkedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('service_bookmarks')
          .insert({
            user_id: user.id,
            service_id: productId,
          });

        if (error) throw error;

        setBookmarkedItems(prev => new Set([...prev, productId]));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  useEffect(() => {
    fetchCategoryProducts();
    fetchBookmarks();
  }, [fetchCategoryProducts, fetchBookmarks]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4169E1', '#1E40AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <CategoryIcon size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>{currentCategory?.name || 'Category'}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.headerSubtitle}>
          {products.length} {products.length === 1 ? 'item' : 'items'} available
        </Text>
      </LinearGradient>

      {/* Products Grid */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4169E1" />
            <Text style={styles.loadingText}>Loading {currentCategory?.name}...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CategoryIcon size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyText}>
              Check back later for {currentCategory?.name} products and services
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                <Image 
                  source={{ 
                    uri: product.image_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60' 
                  }} 
                  style={styles.productImage} 
                />
                <TouchableOpacity
                  style={styles.favoriteIcon}
                  onPress={() => toggleBookmark(product.id)}
                  activeOpacity={0.7}
                >
                  <Heart 
                    size={20} 
                    color={bookmarkedItems.has(product.id) ? '#EF4444' : '#FFFFFF'} 
                    fill={bookmarkedItems.has(product.id) ? '#EF4444' : 'none'}
                    strokeWidth={2.5}
                  />
                </TouchableOpacity>
                <View style={styles.productContent}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.title}
                  </Text>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={styles.productFooter}>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#FFB800" fill="#FFB800" />
                      <Text style={styles.rating}>{product.rating}</Text>
                      <Text style={styles.reviews}>({product.reviews})</Text>
                    </View>
                    <Text style={styles.price}>₵{product.price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 20,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  productContent: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  reviews: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  price: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#4169E1',
  },
});
