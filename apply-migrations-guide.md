# Apply Migrations to Supabase

## Quick Steps

1. **Open Supabase Dashboard**
   - URL: https://eclpduejlabiazblkvgh.supabase.co
   - Click "SQL Editor" in left sidebar

2. **Apply Migration 1: Posts System**
   - Open file: `supabase/migrations/20251227000001_complete_posts_setup.sql`
   - Select All (Cmd+A) → Copy (Cmd+C)
   - Paste into SQL Editor
   - Click "Run" or press Cmd+Enter
   - ✅ Should see: "Success. No rows returned"

3. **Apply Migration 2: Chat System**
   - Open file: `supabase/migrations/20251227000002_create_chat_system.sql`
   - Select All → Copy
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Should see: "Success. No rows returned"

4. **Apply Migration 3: Marketplace Enhancements**
   - Open file: `supabase/migrations/20251227000003_marketplace_enhancements.sql`
   - Select All → Copy
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Should see: "Success. No rows returned"

## Verify Tables Created

After running all migrations, go to **Table Editor** and verify these tables exist:

### Posts System
- ✅ profiles (with sample users)
- ✅ posts (with 5 sample posts)
- ✅ post_likes
- ✅ post_comments
- ✅ post_bookmarks
- ✅ post_shares

### Chat System
- ✅ chats (with 3 sample chats)
- ✅ chat_participants
- ✅ messages (with 11 sample messages)

### Marketplace System
- ✅ products_services (should already exist)
- ✅ service_reviews (new - with 2 sample reviews)
- ✅ service_bookmarks (new - with 1 sample bookmark)

## What Gets Created

### Sample Users (3 profiles)
1. john_doe - Photographer
2. jane_smith - Artist  
3. alex_wilson - Food blogger

### Sample Data
- 5 posts with images
- 3 chats (2 direct, 1 group)
- 11 chat messages
- 8+ marketplace listings
- 2 service reviews
- Helper functions for counts and checks

## Next Steps After Migration

Once migrations are applied:
1. Test chat functionality in the app
2. Test posts feed
3. Test marketplace browsing
4. Consider enabling real authentication (see hooks/useAuth.ts)

---

**Need help?** If you see any errors, share the error message and I'll help fix it!
