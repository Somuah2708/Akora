# 🛒 Tonaton/Jiji Marketplace - Complete Setup Guide

## ⚠️ CRITICAL: Complete These Steps NOW

You have **3 blockers** preventing listings from working. Follow these steps in order:

---

## 🗄️ Step 1: Add Database Columns (REQUIRED)

### Run `ADD_MARKETPLACE_COLUMNS.sql` in Supabase SQL Editor

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `ADD_MARKETPLACE_COLUMNS.sql`
5. Click **Run**

**What this does:**
- Adds `contact_phone`, `contact_whatsapp` columns for seller contact
- Adds `location_city`, `location_region`, `region_id`, `city_id` for dynamic locations
- Adds `type` column to distinguish products from services
- Adds `image_urls` array for multiple images
- Creates indexes for better performance

**Expected output:**
```
✅ SUCCESS: All marketplace columns added successfully!

📋 Next steps:
1. Run CREATE_LOCATIONS_SYSTEM.sql to enable dynamic location management
2. Test creating a listing in the app
3. Test uploading images with the listing
```

---

## 🗄️ Step 2: Create Dynamic Location System (OPTIONAL but RECOMMENDED)

### Run `CREATE_LOCATIONS_SYSTEM.sql` in Supabase SQL Editor

This enables users to add their own regions/cities when posting items (Tonaton/Jiji feature).

1. In Supabase SQL Editor
2. Click **New Query**
3. Copy and paste the entire contents of `CREATE_LOCATIONS_SYSTEM.sql`
4. Click **Run**

**What this does:**
- Creates `regions` and `cities` tables
- Pre-populates Ghana's 16 regions
- Adds major cities for each region
- Creates RLS policies (public read, authenticated write)
- Sets up foreign keys to `products_services` table

**Expected output:**
```
✅ Successfully created 16 regions
✅ Successfully created 80+ cities
✅ Location system is ready!
```

---

## 📦 Step 3: Create Storage Bucket for Images (REQUIRED)

### Create `product-images` bucket in Supabase Storage

**Current Error:**
```
Bucket not found: product-images
```

**Solution:**

1. Open Supabase Dashboard
2. Go to **Storage** (left sidebar)
3. Click **New bucket**
4. Configure:
   - **Name**: `product-images`
   - **Public bucket**: ✅ **YES** (check this box)
   - **File size limit**: 5 MB (or your preference)
   - **Allowed MIME types**: `image/*`
5. Click **Create bucket**

### Set Storage Policies

After creating the bucket, set up access policies:

1. Click on the `product-images` bucket
2. Go to **Policies** tab
3. Click **New policy**

**Policy 1: Public Read (Anyone can view images)**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

**Policy 2: Authenticated Upload (Logged-in users can upload)**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');
```

**Policy 3: Users can delete their own images**
```sql
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🔄 Step 4: Reload Your App

After completing Steps 1-3, **you MUST reload the app** to get the latest code:

### For Expo Go:
1. In the terminal running `npm start`, press **`r`** to reload
2. Or shake your phone and tap "Reload"

### For Development Build:
1. Close and reopen the app
2. Or force quit and restart

---

## ✅ Step 5: Test the Complete Flow

### Test Creating a Listing

1. **Navigate to Marketplace** → Tap **"+"** button
2. **Upload Images** (3 images recommended)
   - Should upload successfully to `product-images` bucket
3. **Fill in Details**:
   - Title: "iPhone 15 Pro"
   - Description: "Brand new, 256GB"
   - Price: 5000
   - Category: Electronics
   - Type: Product
   - Condition: New
4. **Select Location**:
   - Tap **"Add Location"**
   - Select **Region** (e.g., "Greater Accra")
   - Select **City** (e.g., "Accra")
   - OR tap **"Add your city"** if not listed
5. **Contact Info**:
   - Phone: +233 24 123 4567
   - WhatsApp: +233 24 123 4567
6. **Tap "Post Listing"**

**Expected Result:**
```
✅ "Ad posted" 
✅ "Your listing has been created successfully."
```

---

## 🐛 Troubleshooting

### Error: "Bucket not found"
- **Cause**: Storage bucket `product-images` doesn't exist
- **Fix**: Complete Step 3 above

### Error: "Could not find the 'contact_phone' column"
- **Cause**: Database migration not run
- **Fix**: Run `ADD_MARKETPLACE_COLUMNS.sql` (Step 1)

### Error: "Property 'blob' doesn't exist"
- **Cause**: App hasn't reloaded with new code
- **Fix**: Press **`r`** in terminal or shake phone → "Reload"

### Images upload but don't display
- **Cause**: Storage bucket is private
- **Fix**: Make sure **"Public bucket"** was checked when creating, or update policies

### Location dropdown is empty
- **Cause**: Locations migration not run
- **Fix**: Run `CREATE_LOCATIONS_SYSTEM.sql` (Step 2)

### Can't add new city/region
- **Cause**: RLS policies not set correctly
- **Fix**: Verify policies in Step 2 of `CREATE_LOCATIONS_SYSTEM.sql`

---

## 📊 Verify Everything Works

Run this query in Supabase SQL Editor to check your setup:

```sql
-- Check database columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products_services' 
AND column_name IN (
  'contact_phone', 'contact_whatsapp', 
  'location_city', 'location_region', 
  'region_id', 'city_id', 'type', 'image_urls'
)
ORDER BY column_name;

-- Check regions table
SELECT COUNT(*) as region_count FROM regions;

-- Check cities table
SELECT COUNT(*) as city_count FROM cities;

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'product-images';
```

**Expected Results:**
- ✅ 8 columns returned (all marketplace columns exist)
- ✅ 16 regions
- ✅ 80+ cities
- ✅ 1 bucket (product-images, public = true)

---

## 🎉 Success Checklist

- [ ] Database columns added (`ADD_MARKETPLACE_COLUMNS.sql`)
- [ ] Location system created (`CREATE_LOCATIONS_SYSTEM.sql`)
- [ ] Storage bucket created (`product-images`)
- [ ] Storage policies configured (public read, authenticated write)
- [ ] App reloaded (press `r` or restart)
- [ ] Test listing created successfully
- [ ] Images upload and display correctly
- [ ] Location picker works
- [ ] Contact info saves properly

---

## 🚀 Next Steps After Setup

Once everything works, you can:

1. **Add More Cities**: Users can add cities from the app
2. **Customize Categories**: Edit categories in `create.tsx`
3. **Add Search**: Implement search by location, category, price
4. **Add Filters**: Filter by region, city, price range
5. **Add Favorites**: Let users bookmark listings
6. **Add Chat**: Direct messaging between buyers and sellers

---

## 📝 Files Modified

- ✅ `app/services/create.tsx` - Fixed image upload with FileReader
- ✅ `app/services/index.tsx` - Dynamic location filters
- ✅ `lib/supabase.ts` - Added Region, City types
- 📄 `ADD_MARKETPLACE_COLUMNS.sql` - Database migration (NEW)
- 📄 `CREATE_LOCATIONS_SYSTEM.sql` - Locations migration (EXISTS)
- 📄 `DYNAMIC_LOCATIONS_SETUP_GUIDE.md` - Documentation (EXISTS)

---

## ⚠️ REMEMBER

**You MUST run the SQL migrations in Supabase before the app will work!**

The app code is ready, but the database needs to be updated.

1. **Run SQL** → Step 1 & 2 above
2. **Create Bucket** → Step 3 above
3. **Reload App** → Step 4 above
4. **Test** → Step 5 above

Good luck! 🚀
