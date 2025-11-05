# OAA Secretariat Announcements - Complete Feature Implementation

## 🎉 Latest Updates - Gallery Upload & Comment Interactions

### ✨ New Features Added

#### 1. **Gallery Image Upload (Up to 20 Images)**
- ✅ Integrated `expo-image-picker` for device gallery access
- ✅ Users can pick multiple images from their device (up to 20)
- ✅ Two upload methods:
  - **Gallery Picker**: Select images from device camera roll
  - **URL Input**: Enter image URLs manually
- ✅ Image selection respects the 20-image limit
- ✅ Permission handling for media library access
- ✅ Grid preview of all selected images
- ✅ Remove individual images from selection

#### 2. **Comment Like System**
- ✅ Users can like any comment
- ✅ Like count displayed on each comment
- ✅ Visual feedback when liked (blue thumb icon)
- ✅ Toggle like/unlike functionality
- ✅ Real-time count updates

#### 3. **Comment Delete Functionality**
- ✅ Users can delete their own comments
- ✅ Delete button only visible on user's own comments
- ✅ Confirmation dialog before deletion
- ✅ Auto-refresh after deletion to update counts

---

## 📁 Files Created/Updated

### New SQL Files

#### **ADD_COMMENT_LIKES_TABLE.sql** *(NEW)*
Creates the complete comment like system:
- **Table**: `announcement_comment_likes`
  - Stores likes on comments
  - Enforces one like per user per comment (UNIQUE constraint)
  - Foreign keys to `announcement_comments` and `auth.users`
  
- **Column Added**: `like_count` to `announcement_comments`
  - Tracks total likes per comment
  - Auto-updated via triggers

- **Trigger**: `trigger_update_comment_like_count`
  - Increments/decrements like_count on INSERT/DELETE
  - Uses `update_comment_like_count()` function

- **RLS Policies**:
  - Users can view all comment likes
  - Users can only like/unlike as themselves
  - Users can delete their own comment likes
  
- **Delete Policy** for `announcement_comments`:
  - Users can delete their own comments
  - Enforced via RLS

### Updated React Native Files

#### **app/secretariat/announcements/create.tsx**
Enhanced with gallery picker:

**New Imports**:
```typescript
import * as ImagePicker from 'expo-image-picker';
import { Link as LinkIcon } from 'lucide-react-native';
```

**New State**:
- `showUrlInput` - Toggle URL input form

**New Functions**:
- `handlePickImages()` - Opens device gallery picker
  - Requests media library permissions
  - Allows multiple image selection
  - Respects 20-image limit
  - Handles remaining slots calculation
  - Converts selected assets to image objects

**UI Updates**:
- **Image Source Buttons**:
  - "Pick from Gallery" - Opens image picker
  - "Add URL" - Toggles URL input form
- **Conditional URL Input**: Only shows when toggled
- **Image Counter**: Shows "X/20 images added"
- **New Styles**:
  - `imageSourceButtons` - Container for picker buttons
  - `imageSourceButton` - Individual button style
  - `imageSourceButtonText` - Button text style

#### **app/secretariat/announcements/[id].tsx**
Enhanced with comment interactions:

**New Imports**:
```typescript
import { Trash2, ThumbsUp } from 'lucide-react-native';
```

**Updated Interface**:
```typescript
interface Comment {
  like_count: number;
  is_liked?: boolean;
  // ... existing fields
}
```

**New Functions**:
1. `handleDeleteComment(commentId, userId)`:
   - Validates user owns comment
   - Shows confirmation dialog
   - Deletes comment from database
   - Refreshes comments and announcement

2. `handleToggleCommentLike(commentId, isLiked)`:
   - Toggles like/unlike on comment
   - Updates `announcement_comment_likes` table
   - Refreshes comments to show updated counts

**Updated Functions**:
- `loadComments()`:
  - Now loads `like_count` from database
  - Checks if current user liked each comment
  - Sets `is_liked` boolean for each comment

**UI Updates**:
- **Delete Button**: 
  - Only visible on user's own comments
  - Trash icon in top-right of comment card
  
- **Comment Actions Bar**:
  - Like button with thumbs-up icon
  - Shows "Like" or like count
  - Blue when liked, gray when not
  
**New Styles**:
- `deleteButton` - Trash icon button
- `commentActions` - Actions bar container
- `commentLikeButton` - Like button style
- `commentLikeText` - Like text/count style
- `commentLikeTextActive` - Liked state text color

---

## 🗄️ Database Schema Updates

### New Table: `announcement_comment_likes`

```sql
CREATE TABLE announcement_comment_likes (
  id UUID PRIMARY KEY,
  comment_id UUID REFERENCES announcement_comments(id),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ,
  UNIQUE(comment_id, user_id)  -- One like per user per comment
);
```

### Updated Table: `announcement_comments`

```sql
ALTER TABLE announcement_comments 
ADD COLUMN like_count INTEGER DEFAULT 0;
```

### Database Triggers

**Automatic Like Count Updates**:
- When a user likes a comment → `like_count + 1`
- When a user unlikes a comment → `like_count - 1`
- Handled by `update_comment_like_count()` function

---

## 🎨 User Experience Flow

### Creating Announcements with Images

1. **User opens create announcement page**
2. **Scrolls to Images section**
3. **Chooses upload method**:
   - **Option A**: Tap "Pick from Gallery"
     - System requests photo library permission (first time)
     - Device gallery opens
     - User selects up to 20 images
     - Selected images appear in preview grid
   - **Option B**: Tap "Add URL"
     - URL input form appears
     - User enters image URL
     - Optional: Add caption
     - Tap "Add Image" button
     - Image added to preview grid
4. **User can**:
   - Remove any image by tapping X button
   - Add more images (mix of gallery + URL)
   - See counter showing X/20 images
5. **Fill remaining form fields** (title, content, etc.)
6. **Submit announcement**

### Interacting with Comments

#### Viewing Comments:
- Comments sorted newest first
- Each shows: author name, timestamp, content, like count

#### Liking Comments:
1. Tap thumbs-up icon on any comment
2. Icon turns blue and count increments
3. Tap again to unlike (icon grays, count decrements)

#### Deleting Own Comments:
1. See trash icon on own comments only
2. Tap trash icon
3. Confirmation dialog: "Are you sure?"
4. Tap "Delete" to confirm
5. Comment removed and count updated

#### Adding Comments:
1. Scroll to bottom of announcement
2. Type in comment input field
3. Tap send button (paper plane icon)
4. Comment posted and appears at top of list

---

## 🚀 Deployment Instructions

### For New Deployments
1. Run `CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql`
2. Run `ADD_COMMENT_LIKES_TABLE.sql`
3. Run `INSERT_SAMPLE_ANNOUNCEMENTS.sql`
4. Deploy React Native app updates
5. Test image picker permissions on device/simulator

### For Existing Deployments
1. Run `ADD_IMAGES_TO_ANNOUNCEMENTS.sql` (if not already run)
2. Run `ADD_COMMENT_LIKES_TABLE.sql` ← **NEW**
3. Deploy React Native app updates
4. Ensure users re-login to refresh permissions

### iOS Permissions (Info.plist)
Ensure these keys exist:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to upload images for announcements.</string>
```

### Android Permissions (app.json)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES"
      ]
    }
  }
}
```

---

## 🔧 Technical Implementation Details

### Image Picker Configuration

```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true,
  quality: 0.8,  // Compress to 80% quality
  selectionLimit: remainingSlots,  // Dynamic based on current count
});
```

### Permission Handling

```typescript
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

if (status !== 'granted') {
  Alert.alert('Permission Required', 'Please allow access...');
  return;
}
```

### Comment Like Toggle Logic

```typescript
if (isLiked) {
  // Unlike: Delete from announcement_comment_likes
  await supabase
    .from('announcement_comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', user.id);
} else {
  // Like: Insert into announcement_comment_likes
  await supabase
    .from('announcement_comment_likes')
    .insert([{ comment_id: commentId, user_id: user.id }]);
}
```

### Comment Deletion with Cascade

- Deleting a comment automatically removes all its likes
- Handled by `ON DELETE CASCADE` in foreign key
- Trigger updates announcement comment count

---

## 📊 Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| **Image Upload** | URL only | Gallery + URL |
| **Max Images** | 1 | 20 |
| **Image Selection** | Manual URL entry | Native device picker |
| **Comment Likes** | ❌ None | ✅ Like/Unlike with count |
| **Comment Delete** | ❌ None | ✅ Delete own comments |
| **Comment Interactions** | View only | Like, Delete, Reply-ready |
| **Permission Handling** | N/A | Auto-request on first use |

---

## 🎯 Metrics & Counts

All metrics are now **accurate and real-time**:

### Announcement Level:
- ✅ **View Count**: Unique views per user (via RPC function)
- ✅ **Like Count**: Total likes (via trigger)
- ✅ **Comment Count**: Total comments (via trigger)

### Comment Level:
- ✅ **Like Count**: Total likes on comment (via trigger)
- ✅ **Is Liked**: Per-user like status

### Auto-Update Triggers:
- Like/unlike announcement → Updates `announcement_likes` count
- Add/delete comment → Updates `comment_count`
- Like/unlike comment → Updates comment `like_count`

---

## 🐛 Known Limitations & Future Enhancements

### Current Limitations:

1. **Image Storage**: 
   - Gallery images use local URIs (not uploaded to cloud)
   - **Production**: Need to upload to Supabase Storage or Cloudinary
   - **Workaround**: Images stored locally, may not persist across sessions

2. **No Image Preview Before Selection**:
   - Native picker doesn't support preview
   - **Future**: Add custom gallery UI with previews

3. **Comment Replies**:
   - Comments are flat (no threading)
   - **Future**: Add reply/thread functionality

4. **Comment Editing**:
   - Users cannot edit comments after posting
   - **Future**: Add edit functionality with "edited" label

### Planned Enhancements:

1. **Cloud Image Upload**:
   - Integrate Supabase Storage
   - Upload gallery images to permanent storage
   - Generate public URLs for sharing

2. **Image Compression**:
   - Use `expo-image-manipulator` to compress before upload
   - Reduce storage and bandwidth usage

3. **Comment Notifications**:
   - Push notification when someone comments
   - Email notification for liked comments

4. **Comment Reactions**:
   - Expand beyond "like" to emoji reactions
   - 👍 ❤️ 😂 😮 😢 🎉

5. **Comment Sorting**:
   - Sort by newest/oldest
   - Sort by most liked ("Top Comments")

6. **Load More Comments**:
   - Pagination for announcements with many comments
   - Load 10 at a time, "Load More" button

---

## 📱 Testing Checklist

### Image Upload Testing:
- [ ] Gallery picker opens on "Pick from Gallery" tap
- [ ] Permission dialog shows on first use
- [ ] Can select up to 20 images from gallery
- [ ] Can mix gallery images and URL images
- [ ] Counter shows correct count (X/20)
- [ ] Can remove individual images
- [ ] Cannot add more than 20 images
- [ ] Selected images preview correctly

### Comment Like Testing:
- [ ] Like button visible on all comments
- [ ] Like count shows correctly
- [ ] Liking a comment increments count
- [ ] Unliking a comment decrements count
- [ ] Like status persists after refresh
- [ ] Icon changes color when liked

### Comment Delete Testing:
- [ ] Delete button only on own comments
- [ ] Delete button hidden on others' comments
- [ ] Confirmation dialog shows on delete
- [ ] Deleting removes comment from list
- [ ] Comment count updates after delete
- [ ] Cannot delete others' comments

### Permission Testing:
- [ ] iOS: Permission dialog shows with custom message
- [ ] Android: Permission dialog shows
- [ ] Denying permission shows error alert
- [ ] Re-requesting permission works after denial

---

## 🔒 Security Considerations

### Row Level Security (RLS):
- ✅ Users can only like as themselves
- ✅ Users can only delete their own comments
- ✅ Users can only unlike their own likes
- ✅ All users can view comments and likes (read-only)

### Validation:
- Frontend validates:
  - User ownership before delete
  - 20-image limit
  - Empty comment prevention
  
- Backend enforces:
  - RLS policies
  - Foreign key constraints
  - UNIQUE constraints (one like per user per comment)

---

## 📞 Support & Troubleshooting

### Common Issues:

**1. Gallery Picker Not Opening**
- Check device permissions in Settings
- Ensure `expo-image-picker` is installed
- Restart app after granting permissions

**2. Like Count Not Updating**
- Verify `ADD_COMMENT_LIKES_TABLE.sql` was run
- Check trigger was created successfully
- Refresh the page/list

**3. Cannot Delete Comment**
- Verify you are the comment author
- Check RLS policy is enabled
- Ensure user is authenticated

**4. Images Not Showing**
- Gallery images only work during session
- Need cloud upload for persistence
- URLs must be publicly accessible

---

## 📈 Performance Optimization

### Current Optimizations:
- Image quality set to 0.8 (80%) for smaller file sizes
- Single query loads comments with user data
- Batch permission check for all comments
- Optimistic UI updates for likes

### Future Optimizations:
- Lazy load comments (pagination)
- Cache user data to reduce queries
- Debounce like button to prevent spam
- Use React.memo for comment cards

---

**Last Updated**: December 2024  
**Version**: 3.0.0  
**Contributors**: AI Assistant

---

## 🎓 Usage Examples

### Example 1: Creating Announcement with Gallery Images

```typescript
// User flow:
1. Tap "Create Announcement"
2. Fill in title: "Annual Alumni Gala 2024"
3. Tap "Pick from Gallery"
4. Select 5 event photos
5. Tap "Add URL" for event poster
6. Submit announcement
// Result: Announcement created with 6 images
```

### Example 2: Liking and Deleting Comments

```typescript
// User A posts comment: "Great event!"
// User B likes the comment (count: 1)
// User C likes the comment (count: 2)
// User B unlikes the comment (count: 1)
// User A deletes their own comment
// Result: Comment and all likes removed
```

---

## 🔮 Roadmap

### Short Term (Next Sprint):
- [ ] Cloud image upload integration
- [ ] Image compression before upload
- [ ] Comment edit functionality

### Medium Term:
- [ ] Comment threading/replies
- [ ] Emoji reactions on comments
- [ ] Push notifications for comments

### Long Term:
- [ ] Video upload support
- [ ] Live comment updates (real-time)
- [ ] Advanced moderation tools
- [ ] Analytics dashboard

