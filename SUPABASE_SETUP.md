# Supabase Setup Guide for Posts Functionality

This guide will help you set up all the database tables needed for your Instagram-like posts feature.

## What Tables Will Be Created

1. **profiles** - User profiles with avatar, bio, username
2. **posts** - User posts with content and images
3. **post_likes** - Track which users liked which posts
4. **post_comments** - Comments on posts (supports nested replies)
5. **post_bookmarks** - Bookmarked posts per user
6. **post_shares** - Track post shares

Plus helper functions to get counts and check user interactions.

## Option 1: Apply via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20251227000001_complete_posts_setup.sql`
5. Paste into the SQL editor
6. Click **Run** button

That's it! All tables will be created.

## Option 2: Apply via Supabase CLI

### Step 1: Install Supabase CLI (if not already installed)

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### Step 2: Link to Your Project

```bash
# Navigate to your project directory
cd /Users/user/Downloads/Akora

# Login to Supabase
supabase login

# Link your project (you'll need your project ref from the dashboard)
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Apply All Migrations

```bash
# Push all migrations to your database
supabase db push

# OR apply them remotely
supabase db remote commit
```

## Verify Tables Were Created

After applying the migration, verify in Supabase Dashboard:

1. Go to **Table Editor** in left sidebar
2. You should see these tables:
   - profiles
   - posts
   - post_likes
   - post_comments
   - post_bookmarks
   - post_shares

## Sample Data

The migration includes sample data (3 users and 5 posts) that will be inserted automatically if your tables are empty. This is perfect for testing!

Sample users:
- john_doe - Photographer
- jane_smith - Artist  
- alex_wilson - Food blogger

## Next Steps

After tables are created, you need to update your React Native app to fetch real data:

1. Enable Supabase auth (currently mocked)
2. Update `app/(tabs)/index.tsx` to fetch posts from database
3. Connect like/comment/bookmark buttons to Supabase functions

## Troubleshooting

### Error: "relation already exists"
This is fine! It means some tables were already created by previous migrations. The `IF NOT EXISTS` checks will skip those.

### Error: "permission denied"
Make sure you're running the SQL with sufficient permissions. In Supabase Dashboard, use the SQL Editor as an admin.

### Error: "could not find project ref"
When using CLI, you need to link your project first with `supabase link`.

## Security (Row Level Security)

All tables have RLS (Row Level Security) enabled with these policies:

- **Posts**: Anyone can view, only owners can edit/delete
- **Likes**: Anyone can view, only authenticated users can like
- **Comments**: Anyone can view, only owners can edit/delete
- **Bookmarks**: Only owner can view their bookmarks
- **Shares**: Anyone can view shares

This ensures data security while allowing social features to work!
