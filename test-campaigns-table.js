// Test if campaigns table exists and RLS policies are working
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCampaignsTable() {
  console.log('🔍 Testing Campaigns Table...\n');

  try {
    // Test 1: Check if table exists by querying it
    console.log('1️⃣ Checking if campaigns table exists...');
    const { data: campaigns, error: selectError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('❌ Table does not exist or cannot be accessed!');
      console.error('Error:', selectError.message);
      console.log('\n💡 Solution: You need to run the SQL migration in Supabase Dashboard');
      console.log('   Go to: https://eclpduejlabiazblkvgh.supabase.co/project/eclpduejlabiazblkvgh/editor/sql');
      console.log('   Then copy/paste the contents of: supabase/migrations/20251030000002_create_campaigns_table.sql');
      return;
    }

    console.log('✅ Table exists!');
    console.log(`   Found ${campaigns?.length || 0} campaigns\n`);

    // Test 2: Check if storage bucket exists
    console.log('2️⃣ Checking if campaign-images bucket exists...');
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (bucketError) {
      console.error('❌ Cannot access storage:', bucketError.message);
    } else {
      const campaignBucket = buckets?.find(b => b.id === 'campaign-images');
      if (campaignBucket) {
        console.log('✅ Storage bucket exists!');
        console.log(`   Public: ${campaignBucket.public}\n`);
      } else {
        console.error('❌ campaign-images bucket not found!');
        console.log('   Available buckets:', buckets?.map(b => b.id).join(', '));
        console.log('\n💡 Solution: Run the SQL migration to create the bucket\n');
      }
    }

    // Test 3: Try to insert a test campaign
    console.log('3️⃣ Testing campaign creation...');
    const testCampaign = {
      title: 'Test Campaign',
      description: 'This is a test campaign to verify the setup',
      target_amount: 1000,
      raised_amount: 0,
      category: 'infrastructure',
      end_date: '2025-12-31',
      image_urls: ['https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800'],
      status: 'active',
    };

    const { data: newCampaign, error: insertError } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Cannot insert campaign!');
      console.error('Error:', insertError.message);
      console.log('\n💡 This might be an RLS (Row Level Security) policy issue');
      console.log('   Solution: Update the RLS policy to allow anonymous inserts\n');
    } else {
      console.log('✅ Test campaign created successfully!');
      console.log('   Campaign ID:', newCampaign.id);
      
      // Clean up - delete the test campaign
      await supabase
        .from('campaigns')
        .delete()
        .eq('id', newCampaign.id);
      console.log('   (Test campaign cleaned up)\n');
    }

    console.log('🎉 All tests completed!\n');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the test
testCampaignsTable();
