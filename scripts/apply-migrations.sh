#!/bin/bash

# Apply Supabase migrations for posts and chat system
# This script applies both SQL migrations via Supabase Dashboard instructions

set -e

echo "🚀 Supabase Migration Helper"
echo "============================"
echo ""
echo "This will help you apply 2 migrations to your Supabase database:"
echo "  1. Posts system (profiles, posts, likes, comments, bookmarks)"
echo "  2. Chat system (chats, messages, participants)"
echo ""
echo "📋 Method 1: Supabase Dashboard (Easiest)"
echo "  1. Open: https://app.supabase.com"
echo "  2. Select your project: eclpduejlabiazblkvgh"
echo "  3. Go to: SQL Editor → New Query"
echo "  4. Copy & paste migration 1, then click Run"
echo "  5. Copy & paste migration 2, then click Run"
echo ""
echo "📄 Migration files:"
echo "  - supabase/migrations/20251227000001_complete_posts_setup.sql"
echo "  - supabase/migrations/20251227000002_create_chat_system.sql"
echo ""
echo "Press Enter to open migration files in your editor..."
read

# Open migration files in default editor
if command -v code &> /dev/null; then
    echo "Opening in VS Code..."
    code supabase/migrations/20251227000001_complete_posts_setup.sql
    code supabase/migrations/20251227000002_create_chat_system.sql
elif command -v open &> /dev/null; then
    echo "Opening files..."
    open supabase/migrations/20251227000001_complete_posts_setup.sql
    open supabase/migrations/20251227000002_create_chat_system.sql
else
    echo "Files location:"
    echo "  $(pwd)/supabase/migrations/20251227000001_complete_posts_setup.sql"
    echo "  $(pwd)/supabase/migrations/20251227000002_create_chat_system.sql"
fi

echo ""
echo "📋 Method 2: Supabase CLI (Alternative)"
echo "  If you have Supabase CLI installed:"
echo "  $ supabase login"
echo "  $ supabase link --project-ref eclpduejlabiazblkvgh"
echo "  $ supabase db push"
echo ""
echo "✅ After applying migrations:"
echo "  1. Run: npx expo start"
echo "  2. Open the Chat tab"
echo "  3. You should see sample chats and messages!"
echo ""
