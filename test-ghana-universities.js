// Test script to verify Ghana universities can be inserted
const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

console.log('Testing Ghana Universities Database...\n');

async function testUniversitiesQuery() {
  try {
    console.log('1. Checking if Universities category exists...');
    const response = await fetch(`${supabaseUrl}/rest/v1/products_services?select=*&category_name=eq.Universities&limit=5`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log(`✅ Found ${data.length} universities in database`);
      
      if (data.length > 0) {
        console.log('\n📚 Sample University:');
        console.log('   Name:', data[0].title);
        console.log('   Location:', data[0].location || 'N/A');
        console.log('   Description:', data[0].description?.substring(0, 100) + '...');
      } else {
        console.log('\n⚠️  No universities found. You need to run GHANA_UNIVERSITIES_DATA.sql');
        console.log('   Go to Supabase SQL Editor and run the SQL file to add Ghana universities.');
      }
      
      return true;
    } else {
      const error = await response.json();
      console.log(`❌ Query failed: ${error.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function testEducationColumns() {
  try {
    console.log('\n2. Verifying education columns exist...');
    const response = await fetch(`${supabaseUrl}/rest/v1/products_services?select=deadline_date,application_url,location,eligibility_criteria,contact_email&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (response.status === 200) {
      console.log('✅ Education columns are available');
      return true;
    } else {
      console.log('❌ Education columns missing');
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking columns: ${error.message}`);
    return false;
  }
}

(async () => {
  const columnsOk = await testEducationColumns();
  const universitiesOk = await testUniversitiesQuery();
  
  console.log('\n' + '='.repeat(50));
  if (columnsOk && universitiesOk) {
    console.log('✅ DATABASE READY! Universities will display in your app.');
  } else {
    console.log('⚠️  SETUP REQUIRED:');
    if (!columnsOk) {
      console.log('   1. Run CREATE_EDUCATION_TABLES.sql in Supabase');
    }
    if (!universitiesOk) {
      console.log('   2. Run GHANA_UNIVERSITIES_DATA.sql in Supabase');
    }
  }
  console.log('='.repeat(50));
})();
