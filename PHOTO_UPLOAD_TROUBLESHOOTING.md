# Photo Upload Troubleshooting Guide - OAA Chapters

## Issue: Photo upload not working in OAA Chapters Gallery

### Quick Fixes

#### 1. **Storage Bucket Setup** (Most Common Issue)
The `chapter-images` storage bucket must exist in Supabase.

**Solution:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file `CREATE_CHAPTER_IMAGES_BUCKET.sql` from the project root
4. Copy and paste the entire SQL into the editor
5. Click "Run" to execute

**Verify it worked:**
```sql
SELECT * FROM storage.buckets WHERE id = 'chapter-images';
```
You should see one row with the bucket details.

#### 2. **Check Edit Mode**
Photos can only be uploaded when editing a chapter.

**Steps:**
1. Open a chapter from the list
2. Click the Edit button (pencil icon) in the top-right
3. Now click "Upload" in the Photo Gallery section

#### 3. **Check Permissions**
The app needs permission to access your photo library.

**On First Use:**
- When you click "Upload", a permission dialog will appear
- Click "Allow" or "OK"

**If Denied:**
- iOS: Settings > Akora > Photos > Allow Access
- Android: Settings > Apps > Akora > Permissions > Storage/Photos > Allow

---

## Detailed Debugging

### Step 1: Check Console Logs
Open your terminal/console and look for these messages when uploading:

**Successful Upload:**
```
📤 Starting image upload...
📍 File path: chapters/[id]/[filename].jpg
📍 URI: file://...
📤 Uploading to chapter-images bucket...
📦 File size: 123456 bytes
✅ Image uploaded successfully: chapters/[id]/[filename].jpg
🔗 Public URL: https://...
✅ Gallery updated with new image
```

**Common Errors:**

#### Error: "Bucket not found"
```
❌ Upload error: { message: "Bucket not found" }
```
**Fix:** Run the `CREATE_CHAPTER_IMAGES_BUCKET.sql` migration

#### Error: "Policy violation" or "Permission denied"
```
❌ Upload error: { message: "new row violates row-level security policy" }
```
**Fix:** Check that storage policies are set up correctly
```sql
-- Run this to check policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%chapter%';
```

#### Error: "Network request failed"
```
❌ Error uploading image: Network request failed
```
**Fix:** Check your internet connection and Supabase URL configuration

---

### Step 2: Verify Storage Configuration

**Check Supabase Configuration:**
1. Go to Supabase Dashboard > Settings > API
2. Verify your project URL and anon key match what's in your app

**Check Storage Policies:**
Go to Supabase Dashboard > Storage > Policies

You should see these policies for `chapter-images`:
- ✅ "Authenticated users can upload chapter images" (INSERT)
- ✅ "Chapter images are publicly accessible" (SELECT)
- ✅ "Users can delete their own chapter images" (DELETE)
- ✅ "Chapter creators can update their images" (UPDATE)

---

### Step 3: Test with Manual Upload

**Test storage directly in Supabase:**
1. Go to Supabase Dashboard > Storage
2. Click on `chapter-images` bucket
3. Try uploading a file manually
4. If this fails, the bucket/policies aren't set up correctly

---

### Step 4: Check File Size Limits

**Current Limit:** 10MB per image

**Check image size:**
- iOS: Photos app > Select image > Details
- Android: Gallery > Select image > Details/Info

**If too large:**
- The image picker has `quality: 0.8` which should compress
- For very large images, try selecting a smaller one

---

### Step 5: Network Debugging

**Check Supabase Storage Status:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM storage.buckets WHERE id = 'chapter-images';

-- Check if you can see uploaded files
SELECT * FROM storage.objects 
WHERE bucket_id = 'chapter-images' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Common Error Messages & Solutions

### "Not in Edit Mode"
**Message:** "Please click the Edit button first."
**Fix:** Click the Edit button (pencil icon) before trying to upload

### "Chapter data not loaded"
**Message:** "Chapter data not loaded. Please try again."
**Fix:** Close the chapter modal and reopen it, then try editing again

### "Permission Required"
**Message:** "Please allow access to your photo library to upload images."
**Fix:** Go to device settings and enable photo library access for Akora

### "Storage Not Configured"
**Message:** "The chapter-images storage bucket needs to be created."
**Fix:** Run `CREATE_CHAPTER_IMAGES_BUCKET.sql` in Supabase SQL Editor

### "Failed to read the image file"
**Message:** "Failed to read the image file. Please try selecting another image."
**Fix:** Try a different image, or restart the app

---

## Testing Checklist

Use this checklist to verify everything works:

- [ ] Storage bucket `chapter-images` exists
- [ ] Storage policies are configured
- [ ] Can open a chapter from the list
- [ ] Can click Edit button successfully
- [ ] "Upload" button is visible in Photo Gallery section
- [ ] Clicking "Upload" opens photo picker
- [ ] Can select an image from device
- [ ] Upload progress indicator appears
- [ ] Success message appears after upload
- [ ] Image preview appears in gallery edit view
- [ ] Clicking Save persists the gallery
- [ ] After saving, image appears in view mode
- [ ] Image loads and displays correctly

---

## Advanced Debugging

### Enable Detailed Logging

Check the console for these log entries:

```javascript
// When picking image
console.log('📸 Image picker result:', result);

// When uploading
console.log('📤 Starting image upload...');
console.log('📍 File path:', filePath);
console.log('📍 URI:', uri);
console.log('📦 File size:', arrayBuffer.byteLength, 'bytes');

// When upload completes
console.log('✅ Image uploaded successfully:', data.path);
console.log('🔗 Public URL:', publicUrl);
console.log('✅ Gallery updated with new image');
```

### Check ArrayBuffer Conversion

If images aren't uploading, the issue might be with ArrayBuffer conversion:

**Test:**
```javascript
// Add this temporarily in uploadImageToStorage
console.log('Blob type:', blob.type);
console.log('Blob size:', blob.size);
console.log('ArrayBuffer size:', arrayBuffer.byteLength);
```

**Expected:**
- Blob type should be `image/jpeg`, `image/png`, etc.
- Blob size should match ArrayBuffer size
- Both should be > 0

---

## Still Having Issues?

If you've tried all the above and it's still not working:

1. **Check Expo version compatibility**
   ```bash
   npx expo-doctor
   ```

2. **Check expo-image-picker installation**
   ```bash
   npm list expo-image-picker
   ```
   Should show version 14.x or higher

3. **Clear cache and rebuild**
   ```bash
   npx expo start -c
   ```

4. **Check Supabase client version**
   ```bash
   npm list @supabase/supabase-js
   ```
   Should show version 2.x

5. **Test with a fresh chapter**
   - Create a brand new chapter
   - Try uploading to that chapter
   - If it works, the issue might be with existing chapter data

---

## Contact Support

If none of these solutions work, gather this information:

1. Console error messages (full stack trace)
2. Supabase project URL (without keys!)
3. Device/platform (iOS/Android/Web)
4. Expo SDK version
5. Steps to reproduce the issue

Include these in your support request for faster resolution.
