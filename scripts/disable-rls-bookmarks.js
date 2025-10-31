// Disable RLS for service_bookmarks table
const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

const sql = `
ALTER TABLE public.service_bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_services DISABLE ROW LEVEL SECURITY;
`;

console.log('Attempting to disable RLS for service_bookmarks...');
console.log('Note: This may require service_role key or manual execution in Supabase Dashboard');
console.log('\nSQL to execute:');
console.log(sql);
console.log('\nPlease run this SQL manually in Supabase Dashboard SQL Editor:');
console.log(`https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql/new`);
