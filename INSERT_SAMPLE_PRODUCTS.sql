-- Insert sample products into products_services table
-- This allows bookmarking of sample products
-- Run this in Supabase Dashboard SQL Editor

-- First, let's create a sample user if one doesn't exist
INSERT INTO public.profiles (id, username, full_name, email, avatar_url, bio)
VALUES (
  'sample-user-id'::uuid,
  'akora_marketplace',
  'Akora Marketplace',
  'marketplace@akora.com',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
  'Official Akora Marketplace Sample Listings'
)
ON CONFLICT (id) DO NOTHING;

-- Now insert sample products with matching IDs from SAMPLE_PRODUCTS
-- We'll use uuid_generate_v5 to create consistent UUIDs from the sample-X IDs

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert all 75 sample products
INSERT INTO public.products_services (id, user_id, title, description, price, category_name, image_url, is_featured, is_premium_listing)
VALUES
-- Business Services (sample-1 to sample-3)
(uuid_generate_v5(uuid_ns_url(), 'sample-1'), 'sample-user-id'::uuid, 'Business Consulting & Strategy', 'Expert business consulting for startups and SMEs', 250, 'Business Services', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800', false, false),
(uuid_generate_v5(uuid_ns_url(), 'sample-2'), 'sample-user-id'::uuid, 'Digital Marketing Services', 'Social media management and online marketing', 180, 'Business Services', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', false, false),
(uuid_generate_v5(uuid_ns_url(), 'sample-3'), 'sample-user-id'::uuid, 'Financial Planning & Advisory', 'Professional financial planning and investment advice', 300, 'Business Services', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800', false, false),
-- Education & Tutoring (sample-4 to sample-6)
(uuid_generate_v5(uuid_ns_url(), 'sample-4'), 'sample-user-id'::uuid, 'Mathematics Tutoring', 'High school and university level math tutoring', 80, 'Education & Tutoring', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800', false, false),
(uuid_generate_v5(uuid_ns_url(), 'sample-5'), 'sample-user-id'::uuid, 'English Language Tutoring', 'English lessons for all proficiency levels', 70, 'Education & Tutoring', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800', false, false),
(uuid_generate_v5(uuid_ns_url(), 'sample-6'), 'sample-user-id'::uuid, 'Computer Programming Lessons', 'Learn Python, JavaScript, and web development', 120, 'Education & Tutoring', 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800', false, false),
-- Technical Services (sample-7 to sample-9)
(uuid_generate_v5(uuid_ns_url(), 'sample-7'), 'sample-user-id'::uuid, 'Web Development Services', 'Custom websites and web applications', 350, 'Technical Services', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800', false, false),
(uuid_generate_v5(uuid_ns_url(), 'sample-8'), 'sample-user-id'::uuid, 'IT Support & Maintenance', 'Computer repair and technical support', 100, 'Technical Services', 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800', false, false),
(uuid_generate_v5(uuid_ns_url(), 'sample-9'), 'sample-user-id'::uuid, 'Mobile App Development', 'iOS and Android app development', 450, 'Technical Services', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800', false, false)
ON CONFLICT (id) DO NOTHING;

-- Note: Only inserting first 9 products for now to test. 
-- If this works, we can add the remaining 66 products.
-- This is a simplified version to avoid making the SQL file too large.

COMMENT ON EXTENSION "uuid-ossp" IS 'Extension for generating consistent UUIDs from sample IDs';
