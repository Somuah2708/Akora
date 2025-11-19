# Cover Image Upload Feature - OAA Chapters

## Overview
Users can now change the main cover image (hero image) of an OAA chapter when in edit mode.

## How It Works

### User Flow
1. Open a chapter to view its details modal
2. Click the **Edit** button (top-right)
3. A **"Change Cover"** button appears in the center of the hero image
4. Click **"Change Cover"** to select a new image from device
5. Image is uploaded to Supabase storage and preview updates immediately
6. Click **Save** to persist the change

### Technical Implementation

#### Components Added
- **pickAndUploadCoverImage()**: Handles permission request, image picker launch, and upload initiation
- **uploadCoverImageToStorage()**: Manages the actual upload to Supabase storage and state updates
- **Change Cover Button**: Positioned in hero gradient overlay, visible only in edit mode

#### Image Upload Process
1. Validates edit mode and chapter data
2. Requests photo library permissions
3. Launches image picker with 16:9 aspect ratio editing
4. Converts image to ArrayBuffer (React Native compatible)
5. Uploads to `chapter-images` bucket at path: `chapters/{chapter_id}/cover-{timestamp}.{ext}`
6. Gets public URL and updates both `editedChapter` and `selectedChapter` for immediate preview
7. Persists to database when user clicks Save

#### Key Features
- **Immediate Preview**: Cover image updates in UI before saving
- **Image Cropping**: User can crop image to 16:9 aspect ratio during selection
- **Permission Handling**: Requests and validates photo library access
- **Error Handling**: Comprehensive alerts for bucket issues, permissions, network errors
- **Loading State**: Shows ActivityIndicator during upload
- **Validation**: Ensures edit mode is active and chapter data exists

## Storage Details

### Bucket Configuration
- **Bucket Name**: `chapter-images`
- **Max File Size**: 10MB
- **Allowed Types**: Images (jpg, png, etc.)
- **Path Structure**: `chapters/{chapter_id}/cover-{timestamp}.{ext}`

### Policies Required
```sql
-- Public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chapter-images');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chapter-images');
```

## Code Locations

### Main Functions
- **pickAndUploadCoverImage**: Lines ~632-668 in `app/chapters/index.tsx`
- **uploadCoverImageToStorage**: Lines ~670-763 in `app/chapters/index.tsx`

### UI Components
- **Change Cover Button**: Lines ~917-929 in `app/chapters/index.tsx`
- **Button Styles**: Lines ~2168-2177 in `app/chapters/index.tsx`

## Database Schema

### Table: circles
```sql
image_url TEXT  -- Stores the public URL of the cover image
```

When saved, the new cover image URL is stored in the `image_url` field of the `circles` table.

## Testing Checklist

### Pre-Testing Setup
- [ ] Storage bucket `chapter-images` exists
- [ ] RLS policies are configured
- [ ] User has authenticated session

### Test Cases
1. **Permission Flow**
   - [ ] Clicking "Change Cover" without prior permission shows permission alert
   - [ ] Granting permission allows image picker to open
   - [ ] Denying permission shows appropriate error message

2. **Image Selection**
   - [ ] Image picker opens successfully
   - [ ] Can select image from photo library
   - [ ] Can crop image to 16:9 aspect ratio
   - [ ] Canceling picker doesn't cause errors

3. **Upload Process**
   - [ ] Image uploads successfully
   - [ ] Loading indicator shows during upload
   - [ ] Success alert appears after upload
   - [ ] Preview updates immediately

4. **Edit Mode Validation**
   - [ ] Button only visible in edit mode
   - [ ] Cannot upload when not in edit mode
   - [ ] Upload works after entering edit mode

5. **Persistence**
   - [ ] Cover image persists after clicking Save
   - [ ] New cover shows after closing and reopening modal
   - [ ] Cover image URL saved correctly in database

6. **Error Handling**
   - [ ] Appropriate error if bucket doesn't exist
   - [ ] Network errors handled gracefully
   - [ ] Large file size errors caught

## Troubleshooting

### Button Not Visible
- Ensure you're in edit mode (click Edit button first)
- Check that hero section is rendering properly

### Upload Fails
- Verify storage bucket exists: Run `CREATE_CHAPTER_IMAGES_BUCKET.sql`
- Check RLS policies are configured correctly
- Ensure user is authenticated
- Check console logs for specific error messages

### Preview Doesn't Update
- Verify `setSelectedChapter` is updating `image_url` field
- Check that Image component is using `selectedChapter.image_url`

### Image Not Persisting After Save
- Check `handleSaveChapter` includes `image_url` in update
- Verify database update succeeds (check console logs)
- Confirm `editedChapter.image_url` has correct value

## Console Logs

Look for these indicators during upload:
- 📤 Starting cover image upload...
- 📍 File path: chapters/{id}/cover-{timestamp}.{ext}
- 📦 File size: X bytes
- ✅ Cover image uploaded successfully
- 🔗 Public URL: https://...
- ✅ Cover image updated

## Related Files
- `CREATE_CHAPTER_IMAGES_BUCKET.sql` - Storage bucket setup
- `PHOTO_UPLOAD_TROUBLESHOOTING.md` - Gallery upload debugging guide (similar concepts apply)
- `CHAPTER_EDIT_SAVE_GUIDE.md` - General edit/save documentation
