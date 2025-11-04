const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Supabase credentials from environment or config
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting announcements system migration...\n');

    // Read the SQL files
    const createTableSQL = fs.readFileSync(
      path.join(__dirname, 'CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql'),
      'utf8'
    );

    const insertSamplesSQL = fs.readFileSync(
      path.join(__dirname, 'INSERT_SAMPLE_ANNOUNCEMENTS.sql'),
      'utf8'
    );

    // Step 1: Create tables and functions
    console.log('📋 Step 1: Creating tables, indexes, and functions...');
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (createError) {
      // If rpc doesn't work, try direct execution (note: this might not work with all SQL)
      console.log('⚠️  RPC method not available, you need to run the SQL manually in Supabase Dashboard');
      console.log('\n📝 Instructions:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql');
      console.log('4. Click Run');
      console.log('5. Then copy and paste the contents of INSERT_SAMPLE_ANNOUNCEMENTS.sql');
      console.log('6. Click Run again');
      console.log('\nSQL files are ready in your project directory!');
      return;
    }

    console.log('✅ Tables created successfully!\n');

    // Step 2: Insert sample data
    console.log('📋 Step 2: Inserting sample announcements...');
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql: insertSamplesSQL
    });

    if (insertError) {
      console.error('❌ Error inserting samples:', insertError.message);
      console.log('\n📝 You can insert samples manually using the Supabase Dashboard');
      return;
    }

    console.log('✅ Sample data inserted successfully!\n');

    // Verify the data
    console.log('📋 Step 3: Verifying installation...');
    const { data, error: queryError } = await supabase
      .from('secretariat_announcements')
      .select('id, title, category, priority')
      .limit(5);

    if (queryError) {
      console.error('❌ Error verifying:', queryError.message);
      return;
    }

    console.log('✅ Verification successful!');
    console.log(`📊 Found ${data?.length || 0} announcements\n`);

    if (data && data.length > 0) {
      console.log('Sample announcements:');
      data.forEach((ann, index) => {
        console.log(`${index + 1}. [${ann.priority.toUpperCase()}] ${ann.title}`);
        console.log(`   Category: ${ann.category}\n`);
      });
    }

    console.log('🎉 Migration completed successfully!');
    console.log('\n✨ You can now use the announcements system in your app!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  }
}

// Run the migration
runMigration();
