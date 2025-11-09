# Quick Start Guide: Creating Mixed Media Posts

## What Changed?

### Before ❌
- Could only select ONE image or video at a time
- Had to repeatedly tap "Add Media" to add more items
- Confusing whether mixing images and videos was allowed

### After ✅
- Can select MULTIPLE images and videos at once
- Mix images and videos in the same selection
- Clear messaging: "Mix images and videos in one post"
- Helpful celebration alert when mixing media types

## How to Use

### Step 1: Start Creating a Post
- **Home Feed**: Tap the floating "+" button (admins only)
- **Discover Feed**: Tap the camera icon in the header

### Step 2: Select Media
1. Tap "Add Photos & Videos"
2. Your photo library opens
3. Select multiple items:
   - Tap first image/video
   - Keep tapping to add more (up to 20 total)
   - Can mix images and videos freely!

### Step 3: Edit & Post
1. First selected item opens in editor
   - **Images**: Crop, rotate
   - **Videos**: Trim, mute
2. Other items added automatically
3. Review your mixed media preview
4. Write your caption
5. Tap "Post" to share!

## Tips

💡 **Pro Tip**: Select your most important image/video first - it will open in the editor

💡 **Mix Freely**: You can have 5 images + 3 videos in one post

💡 **Edit Later**: Tap any media item in the preview to edit it

💡 **Remove Items**: Tap the X button on any preview to remove it

## Example Use Cases

### Travel Post
- 10 photos from your trip
- 2 short video clips
- All in one post!

### Event Coverage
- Key moment photos
- Behind-the-scenes video
- Mixed chronologically

### Tutorial/How-To
- Step-by-step images
- Final result video
- All together

## Technical Limits

- **Maximum Items**: 20 per post
- **Video Size**: ~80MB per video
- **Supported Types**: JPEG, PNG, MP4, MOV

## Troubleshooting

**Q: I can only select one item**
A: Make sure you're on the latest version. The update enables multi-selection.

**Q: Videos won't upload**
A: Check video size (should be under 80MB). Try trimming in the editor.

**Q: Mixed media post not displaying correctly**
A: Both Home and Discover feeds support mixed media. Swipe left/right to see all items.

## What Happens Behind the Scenes

1. **Selection**: Native OS photo picker allows multi-select
2. **Processing**: First item editable, others queued
3. **Upload**: All media uploaded to Supabase Storage
4. **Storage**: Saved as `media_items` array in database
5. **Display**: Rendered as swipeable carousel in feeds

---

**Enjoy creating rich, multimedia posts! 🎉📸🎥**
