// Test Education Tables in Supabase
const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

console.log('Testing Education System Tables...\n');

const tables = [
  'scholarship_applications',
  'education_bookmarks',
  'education_notifications',
  'alumni_mentors',
  'mentorship_sessions'
];

async function testTable(tableName) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (response.status === 200) {
      console.log(`✅ ${tableName}: EXISTS and accessible`);
      return true;
    } else {
      const error = await response.json();
      console.log(`❌ ${tableName}: ${error.message || 'Not accessible'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${tableName}: ${error.message}`);
    return false;
  }
}

async function testProductsServicesColumns() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/products_services?select=deadline_date,application_url,eligibility_criteria,location,funding_amount&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (response.status === 200) {
      console.log(`✅ products_services: Education columns added successfully`);
      return true;
    } else {
      const error = await response.json();
      console.log(`❌ products_services: ${error.message || 'Education columns missing'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ products_services: ${error.message}`);
    return false;
  }
}

(async () => {
  console.log('1. Checking products_services table extensions...');
  await testProductsServicesColumns();
  
  console.log('\n2. Checking new education tables...');
  let allSuccess = true;
  for (const table of tables) {
    const success = await testTable(table);
    if (!success) allSuccess = false;
  }
  
  if (allSuccess) {
    console.log('\n🎉 ALL EDUCATION TABLES ARE WORKING!');
    console.log('Your education system is fully functional and ready to use!');
  } else {
    console.log('\n⚠️  Some tables are missing or not accessible.');
    console.log('Please make sure you ran the CREATE_EDUCATION_TABLES.sql file in Supabase SQL Editor.');
  }
})();
