#!/usr/bin/env node

/**
 * Apply Supabase Migrations Script
 * 
 * This script applies migration files to your Supabase database.
 * It reads SQL files and executes them in order.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = 'https://eclpduejlabiazblkvgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjbHBkdWVqbGFiaWF6YmxrdmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODgyODUsImV4cCI6MjA3NzA2NDI4NX0.Xizb8FBaNcb2spI4e9ybgDf-UesxKyubdeP_ddLpTeI';

// Migration files in order
const MIGRATIONS = [
  '20251227000001_complete_posts_setup.sql',
  '20251227000002_create_chat_system.sql',
  '20251227000003_marketplace_enhancements.sql'
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'eclpduejlabiazblkvgh.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function applyMigration(filename) {
  const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  
  log(`\n📄 Reading migration: ${filename}`, colors.cyan);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Migration file not found: ${filepath}`);
  }
  
  const sql = fs.readFileSync(filepath, 'utf8');
  log(`   Size: ${(sql.length / 1024).toFixed(2)} KB`, colors.blue);
  
  log(`   Executing...`, colors.yellow);
  
  try {
    await executeSql(sql);
    log(`   ✅ Successfully applied!`, colors.green);
    return true;
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, colors.red);
    throw error;
  }
}

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  🚀 Applying Supabase Migrations', colors.bright);
  log('='.repeat(60), colors.bright);
  
  log(`\n🔗 Supabase URL: ${SUPABASE_URL}`, colors.blue);
  log(`📦 Migrations to apply: ${MIGRATIONS.length}`, colors.blue);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of MIGRATIONS) {
    try {
      await applyMigration(migration);
      successCount++;
    } catch (error) {
      failCount++;
      log(`\n⚠️  Failed to apply ${migration}`, colors.red);
      log(`   You may need to apply this manually via Supabase Dashboard`, colors.yellow);
      log(`   Error: ${error.message}`, colors.red);
    }
  }
  
  log('\n' + '='.repeat(60), colors.bright);
  log(`  📊 Summary`, colors.bright);
  log('='.repeat(60), colors.bright);
  log(`  ✅ Successful: ${successCount}`, colors.green);
  log(`  ❌ Failed: ${failCount}`, colors.red);
  
  if (failCount > 0) {
    log('\n📝 Manual Application Instructions:', colors.yellow);
    log('1. Go to: https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql/new', colors.cyan);
    log('2. Copy the SQL from the failed migration file(s)', colors.cyan);
    log('3. Paste and run it in the SQL Editor', colors.cyan);
    log('4. Verify the tables were created successfully\n', colors.cyan);
  } else {
    log('\n🎉 All migrations applied successfully!', colors.green);
    log('\n📝 Next Steps:', colors.cyan);
    log('1. Verify tables exist in Supabase Dashboard', colors.blue);
    log('2. Check sample data was inserted', colors.blue);
    log('3. Test the app functionality\n', colors.blue);
  }
}

// Run the script
main().catch(error => {
  log('\n❌ Fatal error:', colors.red);
  log(error.message, colors.red);
  process.exit(1);
});
