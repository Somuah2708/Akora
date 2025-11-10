# Quick Start: Trending Articles Setup

## Step 1: Database Setup (5 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `CREATE_TRENDING_ARTICLES_TABLE.sql`
3. Run the script
4. Verify: Check that `trending_articles` table exists with 3 sample articles

## Step 2: Test the Feature (2 minutes)

### As Admin:
1. Open app → Home tab
2. Look for "Trending" section at top
3. You should see a blue "+ Add" button
4. Tap it to create your first article
5. Fill in:
   - Upload an image
   - Title: "Welcome to Trending Articles"
   - Summary: "Test article for the new trending feature"
   - Category: Alumni News
   - Article Content: "This is a test article to verify everything works!"
   - Toggle "Featured" ON
6. Tap "Publish Article"
7. Go back to Home - your article should appear in the carousel
8. Tap the card to read the full article

### As Regular User:
1. Log in with a non-admin account
2. Go to Home tab
3. You should see trending cards but NO "+ Add" button
4. Tap any card to read
5. Verify you cannot edit/delete

## Step 3: Customize (Optional)

### Upload Better Images:
- Use 16:9 aspect ratio (recommended: 1920x1080 or 1280x720)
- High quality, bright, relevant photos
- Unsplash.com is great for free images

### Write Engaging Content:
- **Title:** Short, catchy, specific (under 60 chars ideal)
- **Summary:** One sentence hook that makes people want to read
- **Article:** Break into short paragraphs, use conversational tone

### Categories:
- **📰 Alumni News:** General updates, newsletters, announcements
- **🎉 Events:** Homecoming, reunions, gatherings
- **🏆 Achievements:** Awards, milestones, success stories
- **📢 Announcements:** Important notices, deadlines

## Troubleshooting

### Can't see "+ Add" button?
Check in Supabase: `profiles` table → your user → `is_admin = true` or `role = 'admin'`

### Image upload fails?
1. Check Supabase Storage → Buckets → `trending-articles` exists
2. Verify bucket is public
3. Check RLS policies allow admin uploads

### Articles don't appear?
1. Check: `is_active = true` in database
2. Check: `is_featured = true` in database
3. Refresh the home screen (pull down)

### Can't edit/delete?
Make sure you're logged in as admin

## What You Built

✅ **Home Screen Trending Section** with admin controls
✅ **Create Article Screen** - beautiful form with image upload
✅ **Edit Article Screen** - modify existing articles
✅ **Article Reader Screen** - full professional article view
✅ **Database & Storage** - secure, scalable backend
✅ **Admin Controls** - edit/delete via long-press menu

## File Locations

```
/app/
  ├── (tabs)/
  │   └── index.tsx          ← Home screen (modified)
  ├── trending-create/
  │   └── index.tsx          ← Create article screen (new)
  ├── trending-edit/
  │   └── [id].tsx           ← Edit article screen (new)
  └── trending-article/
      └── [id].tsx           ← Article reader (new)

/lib/
  └── supabase.ts            ← Added TrendingArticle type

CREATE_TRENDING_ARTICLES_TABLE.sql  ← Database migration
TRENDING_ARTICLES_COMPLETE.md       ← Full documentation
```

## Next Steps

1. ✅ Run the SQL migration
2. ✅ Test creating an article
3. ✅ Test viewing as non-admin
4. ✅ Create 3-5 real articles with good content
5. ✅ Share with your alumni community!

## Support

If you encounter issues:
1. Check console logs for errors
2. Verify database setup completed successfully
3. Ensure user is admin in profiles table
4. Review `TRENDING_ARTICLES_COMPLETE.md` for detailed docs

---

**Estimated Setup Time:** 10-15 minutes total
**Difficulty:** Easy - just run SQL and test
**Result:** Professional trending articles system ready to use! 🎉
