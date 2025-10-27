// Test Supabase connection - simple fetch test
const supabaseUrl = 'https://eclpduejlabiazblkvgh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);

// Test basic connectivity
fetch(`${supabaseUrl}/rest/v1/`, {
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`
  }
})
.then(response => {
  console.log('✅ Connection successful! Status:', response.status);
  return response.text();
})
.then(text => console.log('Response:', text))
.catch(error => {
  console.error('❌ Connection failed:', error.message);
});

// Test auth endpoint
setTimeout(() => {
  fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: `test${Date.now()}@test.com`,
      password: 'testpass123'
    })
  })
  .then(response => {
    console.log('Auth endpoint status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Auth response:', data);
  })
  .catch(error => {
    console.error('❌ Auth test failed:', error.message);
  });
}, 1000);
