import { supabase, type ProductService, type Profile } from './supabase';

// Sample products data for demo purposes (75 items across 25 categories)
export const SAMPLE_PRODUCTS = [
  // Business Services - 3 items
  { id: 'sample-1', title: 'Business Consulting & Strategy', description: 'Expert business consulting for startups and SMEs', price: 250, category_name: 'Business Services', image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800', rating: '4.9', reviews: 127 },
  { id: 'sample-2', title: 'Digital Marketing Services', description: 'Social media management and online marketing', price: 180, category_name: 'Business Services', image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', rating: '4.8', reviews: 95 },
  { id: 'sample-3', title: 'Financial Planning & Advisory', description: 'Professional financial planning and investment advice', price: 300, category_name: 'Business Services', image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800', rating: '4.9', reviews: 143 },
  // Education & Tutoring - 3 items
  { id: 'sample-4', title: 'Mathematics Tutoring', description: 'High school and university level math tutoring', price: 80, category_name: 'Education & Tutoring', image_url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800', rating: '4.9', reviews: 156 },
  { id: 'sample-5', title: 'English Language Tutoring', description: 'English lessons for all proficiency levels', price: 70, category_name: 'Education & Tutoring', image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', rating: '4.8', reviews: 132 },
  { id: 'sample-6', title: 'Computer Programming Lessons', description: 'Learn Python, JavaScript, and web development', price: 120, category_name: 'Education & Tutoring', image_url: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800', rating: '4.9', reviews: 189 },
  // Technical Services - 3 items
  { id: 'sample-7', title: 'Web Development Services', description: 'Custom websites and web applications', price: 350, category_name: 'Technical Services', image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800', rating: '4.9', reviews: 203 },
  { id: 'sample-8', title: 'IT Support & Maintenance', description: 'Computer repair and technical support', price: 100, category_name: 'Technical Services', image_url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800', rating: '4.7', reviews: 87 },
  { id: 'sample-9', title: 'Mobile App Development', description: 'iOS and Android app development', price: 450, category_name: 'Technical Services', image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800', rating: '4.9', reviews: 167 },
  // Creative & Design - 3 items
  { id: 'sample-10', title: 'Graphic Design Services', description: 'Logo design, branding, and visual identity', price: 150, category_name: 'Creative & Design', image_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800', rating: '4.8', reviews: 145 },
  { id: 'sample-11', title: 'Video Production & Editing', description: 'Professional video editing and production', price: 200, category_name: 'Creative & Design', image_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800', rating: '4.9', reviews: 112 },
  { id: 'sample-12', title: 'UI/UX Design', description: 'User interface and experience design', price: 180, category_name: 'Creative & Design', image_url: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=800', rating: '4.9', reviews: 178 },
  // Food & Catering - 3 items
  { id: 'sample-13', title: 'Event Catering Services', description: 'Professional catering for all occasions', price: 500, category_name: 'Food & Catering', image_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800', rating: '4.8', reviews: 94 },
  { id: 'sample-14', title: 'Cake Baking & Decoration', description: 'Custom cakes for weddings and events', price: 150, category_name: 'Food & Catering', image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800', rating: '4.9', reviews: 167 },
  { id: 'sample-15', title: 'Personal Chef Services', description: 'Private chef for meals and events', price: 300, category_name: 'Food & Catering', image_url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800', rating: '4.9', reviews: 134 },
  // Healthcare - 3 items
  { id: 'sample-16', title: 'Physiotherapy Services', description: 'Physical therapy and rehabilitation', price: 120, category_name: 'Healthcare', image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', rating: '4.9', reviews: 156 },
  { id: 'sample-17', title: 'Nutrition Consultation', description: 'Personalized diet and nutrition plans', price: 100, category_name: 'Healthcare', image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800', rating: '4.8', reviews: 123 },
  { id: 'sample-18', title: 'Mental Health Counseling', description: 'Professional counseling and therapy', price: 150, category_name: 'Healthcare', image_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800', rating: '4.9', reviews: 189 },
  // Publishing - 3 items
  { id: 'sample-19', title: 'Content Writing Services', description: 'Blog posts, articles, and copywriting', price: 80, category_name: 'Publishing', image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800', rating: '4.8', reviews: 145 },
  { id: 'sample-20', title: 'Book Editing & Proofreading', description: 'Professional editing for manuscripts', price: 120, category_name: 'Publishing', image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800', rating: '4.9', reviews: 112 },
  { id: 'sample-21', title: 'Translation Services', description: 'Document translation in multiple languages', price: 90, category_name: 'Publishing', image_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800', rating: '4.8', reviews: 98 },
  // Photography - 3 items
  { id: 'sample-22', title: 'Event Photography', description: 'Professional photography for weddings and events', price: 400, category_name: 'Photography', image_url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800', rating: '4.9', reviews: 178 },
  { id: 'sample-23', title: 'Portrait Photography', description: 'Studio and outdoor portrait sessions', price: 150, category_name: 'Photography', image_url: 'https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=800', rating: '4.8', reviews: 134 },
  { id: 'sample-24', title: 'Product Photography', description: 'Commercial product photography for businesses', price: 200, category_name: 'Photography', image_url: 'https://images.unsplash.com/photo-1505739998589-00fc191ce01d?w=800', rating: '4.9', reviews: 156 },
  // Home Services - 3 items
  { id: 'sample-25', title: 'House Cleaning Services', description: 'Professional residential cleaning', price: 120, category_name: 'Home Services', image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800', rating: '4.8', reviews: 142 },
  { id: 'sample-26', title: 'Plumbing Services', description: 'Expert plumbing repairs and installations', price: 150, category_name: 'Home Services', image_url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800', rating: '4.9', reviews: 167 },
  { id: 'sample-27', title: 'Electrical Services', description: 'Licensed electrician for home repairs', price: 160, category_name: 'Home Services', image_url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800', rating: '4.9', reviews: 134 },
  // Automotive - 3 items
  { id: 'sample-28', title: 'Auto Repair Services', description: 'Complete car repair and maintenance', price: 200, category_name: 'Automotive', image_url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800', rating: '4.8', reviews: 198 },
  { id: 'sample-29', title: 'Car Detailing', description: 'Professional car cleaning and detailing', price: 100, category_name: 'Automotive', image_url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800', rating: '4.9', reviews: 156 },
  { id: 'sample-30', title: 'Mobile Mechanic', description: 'On-site car repair and diagnostics', price: 180, category_name: 'Automotive', image_url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800', rating: '4.8', reviews: 123 },
  // Fashion & Beauty - 3 items
  { id: 'sample-31', title: 'Personal Styling', description: 'Fashion consulting and wardrobe styling', price: 130, category_name: 'Fashion & Beauty', image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800', rating: '4.9', reviews: 145 },
  { id: 'sample-32', title: 'Makeup Artist', description: 'Professional makeup for events and weddings', price: 150, category_name: 'Fashion & Beauty', image_url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800', rating: '4.9', reviews: 189 },
  { id: 'sample-33', title: 'Tailoring & Alterations', description: 'Custom tailoring and clothing alterations', price: 80, category_name: 'Fashion & Beauty', image_url: 'https://images.unsplash.com/photo-1558769132-cb1aea3c184e?w=800', rating: '4.8', reviews: 167 },
  // Fitness & Sports - 3 items
  { id: 'sample-34', title: 'Personal Training', description: 'One-on-one fitness training sessions', price: 100, category_name: 'Fitness & Sports', image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800', rating: '4.9', reviews: 178 },
  { id: 'sample-35', title: 'Yoga Instruction', description: 'Private and group yoga classes', price: 70, category_name: 'Fitness & Sports', image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800', rating: '4.8', reviews: 156 },
  { id: 'sample-36', title: 'Sports Coaching', description: 'Professional coaching for various sports', price: 90, category_name: 'Fitness & Sports', image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800', rating: '4.9', reviews: 143 },
  // Hair & Salon - 3 items
  { id: 'sample-37', title: 'Hair Styling Services', description: 'Professional hair cutting and styling', price: 60, category_name: 'Hair & Salon', image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800', rating: '4.9', reviews: 234 },
  { id: 'sample-38', title: 'Hair Coloring', description: 'Expert hair coloring and highlights', price: 120, category_name: 'Hair & Salon', image_url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800', rating: '4.8', reviews: 189 },
  { id: 'sample-39', title: 'Manicure & Pedicure', description: 'Nail care and beauty treatments', price: 50, category_name: 'Hair & Salon', image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800', rating: '4.9', reviews: 198 },
  // Pet Care - 3 items
  { id: 'sample-40', title: 'Dog Walking Services', description: 'Professional dog walking and exercise', price: 40, category_name: 'Pet Care', image_url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800', rating: '4.9', reviews: 167 },
  { id: 'sample-41', title: 'Pet Grooming', description: 'Complete pet grooming and bathing', price: 80, category_name: 'Pet Care', image_url: 'https://images.unsplash.com/photo-1585559700398-1385b3a8aeb6?w=800', rating: '4.8', reviews: 145 },
  { id: 'sample-42', title: 'Pet Sitting', description: 'In-home pet care and sitting services', price: 60, category_name: 'Pet Care', image_url: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800', rating: '4.9', reviews: 178 },
  // Entertainment - 3 items
  { id: 'sample-43', title: 'DJ Services', description: 'Professional DJ for events and parties', price: 350, category_name: 'Entertainment', image_url: 'https://images.unsplash.com/photo-1571266028243-d220c4f1d5b2?w=800', rating: '4.9', reviews: 189 },
  { id: 'sample-44', title: 'Live Band Performance', description: 'Live music for weddings and events', price: 600, category_name: 'Entertainment', image_url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800', rating: '4.9', reviews: 156 },
  { id: 'sample-45', title: 'MC & Host Services', description: 'Professional event hosting and emceeing', price: 250, category_name: 'Entertainment', image_url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800', rating: '4.8', reviews: 134 },
  // Construction - 3 items
  { id: 'sample-46', title: 'General Contracting', description: 'Home renovation and construction services', price: 500, category_name: 'Construction', image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', rating: '4.9', reviews: 167 },
  { id: 'sample-47', title: 'Painting Services', description: 'Interior and exterior painting', price: 180, category_name: 'Construction', image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800', rating: '4.8', reviews: 145 },
  { id: 'sample-48', title: 'Carpentry Services', description: 'Custom woodwork and furniture building', price: 220, category_name: 'Construction', image_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800', rating: '4.9', reviews: 178 },
  // Electronics - 3 items
  { id: 'sample-49', title: 'Wireless Earbuds', description: 'Premium noise-canceling wireless earbuds', price: 450, category_name: 'Electronics', image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800', rating: '4.8', reviews: 234 },
  { id: 'sample-50', title: 'Smart Watch', description: 'Fitness tracking smartwatch with heart rate monitor', price: 650, category_name: 'Electronics', image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', rating: '4.9', reviews: 189 },
  { id: 'sample-51', title: 'Bluetooth Speaker', description: 'Portable waterproof bluetooth speaker', price: 280, category_name: 'Electronics', image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800', rating: '4.7', reviews: 156 },
  // Furniture - 3 items
  { id: 'sample-52', title: 'Office Chair', description: 'Ergonomic office chair with lumbar support', price: 850, category_name: 'Furniture', image_url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800', rating: '4.9', reviews: 167 },
  { id: 'sample-53', title: 'Coffee Table', description: 'Modern wooden coffee table', price: 1200, category_name: 'Furniture', image_url: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800', rating: '4.8', reviews: 143 },
  { id: 'sample-54', title: 'Bookshelf', description: '5-tier wooden bookshelf for home or office', price: 680, category_name: 'Furniture', image_url: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800', rating: '4.8', reviews: 128 },
  // Clothing & Apparel - 3 items
  { id: 'sample-55', title: 'African Print Dress', description: 'Beautiful ankara dress with modern design', price: 180, category_name: 'Clothing & Apparel', image_url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800', rating: '4.9', reviews: 201 },
  { id: 'sample-56', title: 'Men\'s Casual Shirt', description: 'Cotton casual shirt for everyday wear', price: 120, category_name: 'Clothing & Apparel', image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800', rating: '4.7', reviews: 178 },
  { id: 'sample-57', title: 'Sneakers', description: 'Comfortable sports sneakers for daily use', price: 250, category_name: 'Clothing & Apparel', image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800', rating: '4.8', reviews: 223 },
  // Watches & Jewelry - 3 items
  { id: 'sample-58', title: 'Gold Necklace', description: 'Elegant 18k gold necklace', price: 1500, category_name: 'Watches & Jewelry', image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800', rating: '4.9', reviews: 145 },
  { id: 'sample-59', title: 'Men\'s Wristwatch', description: 'Classic leather strap wristwatch', price: 850, category_name: 'Watches & Jewelry', image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800', rating: '4.8', reviews: 167 },
  { id: 'sample-60', title: 'Silver Earrings', description: 'Sterling silver hoop earrings', price: 320, category_name: 'Watches & Jewelry', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800', rating: '4.9', reviews: 189 },
  // Bags & Accessories - 3 items
  { id: 'sample-61', title: 'Leather Backpack', description: 'Genuine leather backpack for work or travel', price: 680, category_name: 'Bags & Accessories', image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', rating: '4.9', reviews: 198 },
  { id: 'sample-62', title: 'Women\'s Handbag', description: 'Stylish designer handbag', price: 950, category_name: 'Bags & Accessories', image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800', rating: '4.8', reviews: 167 },
  { id: 'sample-63', title: 'Sunglasses', description: 'UV protection sunglasses with polarized lenses', price: 180, category_name: 'Bags & Accessories', image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800', rating: '4.7', reviews: 134 },
  // Books & Stationery - 3 items
  { id: 'sample-64', title: 'African Literature Collection', description: 'Set of classic African novels', price: 150, category_name: 'Books & Stationery', image_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800', rating: '4.9', reviews: 201 },
  { id: 'sample-65', title: 'Notebook Set', description: 'Premium leather-bound notebooks for journaling', price: 80, category_name: 'Books & Stationery', image_url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800', rating: '4.8', reviews: 156 },
  { id: 'sample-66', title: 'Art Supplies Kit', description: 'Complete drawing and painting supplies', price: 220, category_name: 'Books & Stationery', image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800', rating: '4.9', reviews: 178 },
  // Beauty Products - 3 items
  { id: 'sample-67', title: 'Natural Skincare Set', description: 'Organic skincare products for all skin types', price: 380, category_name: 'Beauty Products', image_url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800', rating: '4.9', reviews: 234 },
  { id: 'sample-68', title: 'Shea Butter Cream', description: 'Pure Ghanaian shea butter moisturizer', price: 120, category_name: 'Beauty Products', image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800', rating: '4.9', reviews: 289 },
  { id: 'sample-69', title: 'Hair Care Bundle', description: 'Natural hair care products for African hair', price: 280, category_name: 'Beauty Products', image_url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=800', rating: '4.8', reviews: 212 },
  // Baby & Kids - 3 items
  { id: 'sample-70', title: 'Baby Clothes Set', description: 'Soft cotton baby clothes 0-12 months', price: 180, category_name: 'Baby & Kids', image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', rating: '4.9', reviews: 167 },
  { id: 'sample-71', title: 'Educational Toys', description: 'Learning toys for toddlers and kids', price: 150, category_name: 'Baby & Kids', image_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800', rating: '4.8', reviews: 145 },
  { id: 'sample-72', title: 'Baby Stroller', description: 'Lightweight foldable baby stroller', price: 950, category_name: 'Baby & Kids', image_url: 'https://images.unsplash.com/photo-1588362951121-3ee319b018b2?w=800', rating: '4.9', reviews: 178 },
  // Kitchen & Dining - 3 items
  { id: 'sample-73', title: 'Cookware Set', description: 'Non-stick pots and pans set', price: 480, category_name: 'Kitchen & Dining', image_url: 'https://images.unsplash.com/photo-1584990347449-39db9e54e4b3?w=800', rating: '4.8', reviews: 198 },
  { id: 'sample-74', title: 'Dinner Plate Set', description: 'Ceramic dinner plates for 6 people', price: 320, category_name: 'Kitchen & Dining', image_url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800', rating: '4.7', reviews: 134 },
  { id: 'sample-75', title: 'Blender', description: 'High-speed blender for smoothies and cooking', price: 380, category_name: 'Kitchen & Dining', image_url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800', rating: '4.9', reviews: 223 },
];

export interface ProductServiceWithUser extends ProductService {
  user: Profile;
  rating?: number;
  reviews?: number;
  isBookmarked?: boolean;
}

export interface ServiceReview {
  id: string;
  product_service_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Profile;
}

/**
 * Fetch all products/services with user profiles and ratings
 */
export async function fetchAllProducts(): Promise<ProductServiceWithUser[]> {
  try {
    // Fetch products
    const { data: productsData, error: productsError } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (productsError) throw productsError;
    if (!productsData || productsData.length === 0) return [];

    // Fetch user profiles
    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    // Fetch ratings for all products
    const productIds = productsData.map(p => p.id);
    const { data: ratingsData } = await supabase
      .rpc('get_service_rating_stats', { service_id: productIds[0] });

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5, // Will be replaced with actual ratings
      reviews: 0,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(category: string): Promise<ProductServiceWithUser[]> {
  try {
    const { data: productsData, error: productsError } = await supabase
      .from('products_services')
      .select('*')
      .eq('category_name', category)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (productsError) throw productsError;
    if (!productsData || productsData.length === 0) return [];

    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5,
      reviews: 0,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
}

/**
 * Fetch featured products/services
 */
export async function fetchFeaturedProducts(): Promise<ProductServiceWithUser[]> {
  try {
    const { data: productsData, error } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_featured', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!productsData || productsData.length === 0) return [];

    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5,
      reviews: 0,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}

/**
 * Create a new product/service listing
 */
export async function createListing(
  userId: string,
  data: {
    title: string;
    description: string;
    price: number;
    imageUrl?: string;
    category: string;
  }
) {
  try {
    // Create listing - users have unlimited listings
    const { data: listing, error } = await supabase
      .from('products_services')
      .insert({
        user_id: userId,
        title: data.title,
        description: data.description,
        price: data.price,
        image_url: data.imageUrl,
        category_name: data.category,
        is_approved: true, // Auto-approve for now
      })
      .select()
      .single();

    if (error) throw error;
    return listing;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
}

/**
 * Update a product/service listing
 */
export async function updateListing(
  listingId: string,
  userId: string,
  data: Partial<{
    title: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string;
  }>
) {
  try {
    const { data: listing, error } = await supabase
      .from('products_services')
      .update({
        title: data.title,
        description: data.description,
        price: data.price,
        image_url: data.imageUrl,
        category_name: data.category,
      })
      .eq('id', listingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return listing;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
}

/**
 * Delete a product/service listing
 */
export async function deleteListing(listingId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('products_services')
      .delete()
      .eq('id', listingId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}

/**
 * Add a review for a product/service
 */
export async function addReview(
  productId: string,
  userId: string,
  rating: number,
  comment?: string
) {
  try {
    const { data, error } = await supabase
      .from('service_reviews')
      .insert({
        product_service_id: productId,
        user_id: userId,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
}

/**
 * Fetch reviews for a product/service
 */
export async function fetchReviews(productId: string): Promise<ServiceReview[]> {
  try {
    const { data, error } = await supabase
      .from('service_reviews')
      .select('*, user:profiles(id, username, full_name, avatar_url)')
      .eq('product_service_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Toggle bookmark for a product/service
 */
export async function toggleBookmark(productId: string, userId: string): Promise<boolean> {
  try {
    // Check if already bookmarked
    const { data: existing } = await supabase
      .from('service_bookmarks')
      .select('id')
      .eq('product_service_id', productId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Remove bookmark
      await supabase
        .from('service_bookmarks')
        .delete()
        .eq('id', existing.id);
      return false;
    } else {
      // Add bookmark
      await supabase
        .from('service_bookmarks')
        .insert({
          product_service_id: productId,
          user_id: userId,
        });
      return true;
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
}

/**
 * Check if user has bookmarked a product
 */
export async function isBookmarked(productId: string, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('service_bookmarks')
      .select('id')
      .eq('product_service_id', productId)
      .eq('user_id', userId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Fetch user's bookmarked products
 */
export async function fetchBookmarkedProducts(userId: string): Promise<ProductServiceWithUser[]> {
  try {
    const { data: bookmarks, error } = await supabase
      .from('service_bookmarks')
      .select('product_service_id')
      .eq('user_id', userId);

    if (error) throw error;
    if (!bookmarks || bookmarks.length === 0) return [];

    const productIds = bookmarks.map(b => b.product_service_id);
    const { data: productsData } = await supabase
      .from('products_services')
      .select('*')
      .in('id', productIds);

    if (!productsData) return [];

    const userIds = [...new Set(productsData.map(p => p.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

    return productsData.map(item => ({
      ...item,
      user: profilesMap.get(item.user_id) as Profile,
      rating: 4.5,
      reviews: 0,
      isBookmarked: true,
    })).filter(item => item.user);
  } catch (error) {
    console.error('Error fetching bookmarked products:', error);
    return [];
  }
}
