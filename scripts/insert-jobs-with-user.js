// Get current user and insert sample jobs with that user_id
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Please provide your user credentials to insert jobs under your account:');
console.log('Enter your email:');

// For now, just show that we need a user_id
// You'll need to sign in first or make user_id nullable

console.log('\n⚠️  To insert sample jobs, you need to either:');
console.log('\n1. Run this SQL in Supabase Dashboard to allow NULL user_id:');
console.log('   ALTER TABLE public.jobs ALTER COLUMN user_id DROP NOT NULL;\n');
console.log('2. Or sign in and use your actual user_id\n');
console.log('Recommended: Choose option 1 for sample data');
