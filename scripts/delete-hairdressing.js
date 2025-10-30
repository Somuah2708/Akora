// Script to delete Hairdressing products from database
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteHairdressingProducts() {
  try {
    console.log('Searching for all products and services...');
    
    // First, list ALL products to see what's there
    const { data: allProducts, error: allError } = await supabase
      .from('products_services')
      .select('id, title, category_name, listing_type')
      .is('listing_type', null) // Only non-job listings
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (allError) {
      console.error('Error fetching all products:', allError);
      return;
    }
    
    console.log('\n📋 All Products/Services in database:');
    allProducts.forEach((p, i) => {
      console.log(`${i + 1}. "${p.title}" (ID: ${p.id}, Category: ${p.category_name})`);
    });
    
    // Now search for Hairdressing
    const { data: products, error: searchError } = await supabase
      .from('products_services')
      .select('*')
      .ilike('title', '%hair%');
    
    if (searchError) {
      console.error('Error searching:', searchError);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('\n❌ No products with "hair" in title found');
      return;
    }
    
    console.log(`Found ${products.length} Hairdressing product(s):`);
    products.forEach(p => {
      console.log(`  - ID: ${p.id}, Title: ${p.title}, Category: ${p.category_name}`);
    });
    
    // Delete them
    const { error: deleteError } = await supabase
      .from('products_services')
      .delete()
      .ilike('title', '%hairdressing%');
    
    if (deleteError) {
      console.error('Error deleting:', deleteError);
      return;
    }
    
    console.log('✅ Successfully deleted Hairdressing products!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

deleteHairdressingProducts();
