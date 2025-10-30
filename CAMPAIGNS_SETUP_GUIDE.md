# Campaigns System Setup Guide

This guide explains how to set up the campaigns database table in Supabase and use the new campaign management features.

## What's New

### 1. **Campaigns Table in Supabase**
All campaigns are now stored in the database instead of being hardcoded. This allows:
- Users to create their own campaigns
- Campaigns to persist across app restarts
- Real-time campaign updates
- Proper tracking of donations per campaign

### 2. **Category-Specific Pages**
Each category (Infrastructure, Scholarships, Research, Community) now has its own dedicated page showing only campaigns in that category.

### 3. **Campaign Creation with Image Upload**
Users can create campaigns with:
- Title and description
- Funding goal and end date
- Category selection
- Up to 10 photos uploaded to Supabase Storage

## Setup Instructions

### Step 1: Apply the Database Migration

You need to run the SQL migration to create the campaigns table and storage bucket.

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20251030000002_create_campaigns_table.sql`
4. Paste into the SQL Editor and click "Run"

**Option B: Using Supabase CLI**
```bash
# Make sure you're in the project directory
cd "c:\Users\nicol\Downloads\Akora"

# Apply the migration
npx supabase db push
```

### Step 2: Verify the Setup

After running the migration, verify that:

1. **campaigns table exists** with these columns:
   - id (UUID, primary key)
   - title (TEXT)
   - description (TEXT)
   - target_amount (DECIMAL)
   - raised_amount (DECIMAL)
   - category (TEXT: infrastructure, scholarships, research, community)
   - end_date (DATE)
   - image_urls (TEXT[])
   - created_by (UUID)
   - status (TEXT: active, completed, cancelled)
   - created_at, updated_at (TIMESTAMPTZ)

2. **campaign-images storage bucket** exists and is public

3. **Sample campaigns** are inserted (4 campaigns, one in each category)

### Step 3: Test the Features

1. **View Campaigns**
   - Open the Donations tab
   - You should see the Featured Campaigns section populated with campaigns from the database
   - Loading indicator should appear while fetching

2. **Browse by Category**
   - Scroll to "Ways to Give" section
   - Tap any category card (Infrastructure, Scholarships, Research, Community)
   - Should navigate to a page showing only campaigns in that category
   - Each category page has its own color theme

3. **Create a Campaign**
   - Scroll to the bottom of the Donations page
   - Tap "Create Campaign" button
   - Fill in all required fields:
     * Campaign Title
     * Description
     * Funding Goal (amount)
     * Category (dropdown)
     * End Date
     * At least 1 photo (up to 10)
   - Tap "Submit Campaign"
   - New campaign should appear immediately in the appropriate category

4. **Make a Donation**
   - Tap "Donate Now" on any campaign
   - Campaign raised amount and progress bar should update after donation

## Database Schema

### campaigns table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  raised_amount DECIMAL(12, 2) DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('infrastructure', 'scholarships', 'research', 'community')),
  end_date DATE NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

1. **Anyone can view active campaigns** (no authentication required)
2. **Authenticated users can create campaigns**
3. **Users can only update their own campaigns**

### Storage Bucket

- **Bucket name:** campaign-images
- **Public access:** Yes (images are publicly viewable)
- **Policies:**
  - Anyone can view images
  - Authenticated users can upload images

## How It Works

### Campaign Creation Flow
1. User fills out campaign form
2. App uploads selected images to `campaign-images` storage bucket
3. Gets public URLs for uploaded images
4. Inserts campaign record into database with image URLs
5. Refreshes campaign list to show new campaign

### Campaign Display Flow
1. App fetches campaigns from database on load
2. Transforms data to match UI format
3. Calculates progress percentage and days left
4. Displays in Featured Campaigns section (all categories)
5. Category pages filter to show only relevant campaigns

### Donation Flow
1. User selects campaign and amount
2. Donation is recorded in donations table with campaign_id
3. Campaign's raised_amount is updated
4. Progress bar automatically reflects new amount

## Troubleshooting

### Migration fails
- Check Supabase project is running
- Verify you have proper permissions
- Check SQL Editor for specific error messages

### Images don't upload
- Verify campaign-images bucket exists
- Check bucket is set to public
- Verify storage policies are in place

### Campaigns don't appear
- Check browser console for errors
- Verify RLS policies allow SELECT on campaigns
- Ensure sample campaigns were inserted

### Category pages show 404
- Make sure `app/donation/category/_layout.tsx` exists
- Verify `app/donation/category/[category].tsx` exists
- Restart the Expo development server

## Files Modified

### New Files Created
- `supabase/migrations/20251030000002_create_campaigns_table.sql` - Campaigns table migration
- `supabase/migrations/20251030000003_create_donors_table.sql` - Donors table migration
- `app/donation/category/[category].tsx` - Category detail page
- `app/donation/category/_layout.tsx` - Category route layout

### Files Updated
- `app/donation/index.tsx`
  - Added campaign fetching from Supabase
  - Updated campaign creation to save to database
  - Changed category cards to navigate instead of filter
  - Removed hardcoded FEATURED_CAMPAIGNS array
  
- `app/donation/all-campaigns.tsx`
  - Added campaign fetching from Supabase
  - Added loading state with spinner
  - Added empty state when no campaigns found
  - Updated donation flow to update campaign raised_amount
  - Automatic refresh after donations
  - Removed hardcoded ALL_CAMPAIGNS array
  - Search now works with database campaigns

## Next Steps

You may want to:
- Add campaign approval workflow (admin reviews before going live)
- Add ability to edit/delete campaigns
- Add search functionality across all campaigns
- Add campaign categories management in admin panel
- Add campaign analytics (views, click-through rate, etc.)
- Add social sharing for campaigns
- Add email notifications for campaign updates
