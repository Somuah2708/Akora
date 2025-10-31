const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔧 Fixing salary column type...');
console.log('\n⚠️  PLEASE RUN THIS SQL MANUALLY IN SUPABASE DASHBOARD:');
console.log('📝 Go to: https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql/new');
console.log('\n📋 Copy and run this SQL:\n');
console.log('ALTER TABLE public.jobs ALTER COLUMN salary TYPE text USING salary::text;');
console.log('\nAfter running the SQL, press Enter to continue...');

// For now, just show instructions
process.stdin.once('data', () => {
  console.log('✅ Continuing with sample data insertion...');
  process.exit(0);
});
