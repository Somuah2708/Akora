#!/usr/bin/env node

/**
 * Apply Supabase migrations for posts and chat system
 * 
 * This script applies both migrations to your Supabase database:
 * 1. Posts system (profiles, posts, likes, comments, bookmarks, shares)
 * 2. Chat system (chats, chat_participants, messages)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Read migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const postsMigration = fs.readFileSync(
  path.join(migrationsDir, '20251227000001_complete_posts_setup.sql'),
  'utf8'
);
const chatMigration = fs.readFileSync(
  path.join(migrationsDir, '20251227000002_create_chat_system.sql'),
  'utf8'
);

// Function to execute SQL via Supabase REST API
async function executeSql(sql, migrationName) {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);
    
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Applied: ${migrationName}`);
          resolve(responseData);
        } else {
          console.error(`❌ Failed to apply ${migrationName}`);
          console.error(`Status: ${res.statusCode}`);
          console.error(`Response: ${responseData}`);
          reject(new Error(`Failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error applying ${migrationName}:`, error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Main execution
async function applyMigrations() {
  console.log('🚀 Applying Supabase migrations...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);

  try {
    console.log('📦 Migration 1/2: Posts system...');
    await executeSql(postsMigration, 'Posts setup');
    
    console.log('📦 Migration 2/2: Chat system...');
    await executeSql(chatMigration, 'Chat system');
    
    console.log('\n✅ All migrations applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Visit Supabase Dashboard → Table Editor');
    console.log('  2. Verify tables: profiles, posts, chats, chat_participants, messages');
    console.log('  3. Check sample data in profiles and posts tables');
    console.log('  4. Run: npx expo start');
    console.log('  5. Open Chat tab to see sample chats\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n🔧 Manual option:');
    console.log('  1. Go to: https://app.supabase.com');
    console.log('  2. Open SQL Editor → New Query');
    console.log('  3. Copy contents of supabase/migrations/20251227000001_complete_posts_setup.sql');
    console.log('  4. Paste and click Run');
    console.log('  5. Repeat for supabase/migrations/20251227000002_create_chat_system.sql\n');
    process.exit(1);
  }
}

applyMigrations();
