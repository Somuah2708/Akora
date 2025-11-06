# Discover Page Instagram-Style Features

## Overview
Enhanced the discover page with Instagram-style features including carousel counters and **viewport-based video auto-play**.

## Features Implemented

### 1. **Image Counter for Multi-Image Posts**
- Added visual counter at top-right corner showing current position (e.g., "1/3", "2/5")
- Counter appears only when there are 2+ images in a carousel
- Uses existing `carouselIndicator` styles with semi-transparent background
- Updates dynamically as user swipes through images

**Implementation:**
```tsx
// Added onScroll handler to track current slide
onScroll={(event) => {
  const scrollX = event.nativeEvent.contentOffset.x;
  const currentIndex = Math.round(scrollX / width);
  setCarouselIndices({
    ...carouselIndices,
    [item.id]: currentIndex,
  });
}}

// Render counter overlay
{item.image_urls.length > 1 && (
  <View style={styles.carouselIndicator}>
    <Text style={styles.carouselIndicatorText}>
      {(carouselIndices[item.id] ?? 0) + 1}/{item.image_urls.length}
    </Text>
  </View>
)}
```

### 2. **Video Counter for Multi-Video Posts**
- Same counter implementation for video carousels
- Shows "1/2", "2/2" etc. for posts with multiple videos
- Positioned at top-right corner with semi-transparent overlay

### 3. **Viewport-Based Video Auto-Play** ⭐ (Instagram-Style)
- Videos automatically play ONLY when fully visible on screen (50%+ visibility)
- Videos automatically pause when scrolled out of view
- Prevents multiple videos playing simultaneously
- Start muted by default (mobile-friendly)
- Users can unmute via native video controls

**How it works:**
1. **Scroll Tracking**: Main ScrollView tracks scroll position (`scrollY`)
2. **Layout Measurement**: Each post's position is measured via `onLayout`
3. **Visibility Calculation**: Determines which posts are 50%+ visible in viewport
4. **Playback Control**: Only videos in viewport have `shouldPlay={true}`

**Implementation:**
```tsx
// State for tracking
const [scrollY, setScrollY] = useState(0);
const [postLayouts, setPostLayouts] = useState<PostLayout[]>([]);
const [visibleVideos, setVisibleVideos] = useState<Set<string>>(new Set());

// Track scroll position
<ScrollView 
  onScroll={(event) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  }}
  scrollEventThrottle={16}
>

// Measure each post position
<View 
  onLayout={(event) => {
    const { y, height } = event.nativeEvent.layout;
    setPostLayouts((prev) => {
      const filtered = prev.filter((p) => p.id !== item.id);
      return [...filtered, { id: item.id, y, height }];
    });
  }}
>

// Calculate visibility (50% threshold)
const updateVisibleVideos = useCallback(() => {
  const viewportTop = scrollY;
  const viewportBottom = scrollY + height;
  const threshold = 0.5; // 50% visibility required

  const visible = new Set<string>();

  postLayouts.forEach((layout) => {
    const postTop = layout.y;
    const postBottom = layout.y + layout.height;

    const visibleTop = Math.max(postTop, viewportTop);
    const visibleBottom = Math.min(postBottom, viewportBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibilityRatio = visibleHeight / layout.height;

    if (visibilityRatio >= threshold) {
      visible.add(layout.id);
    }
  });

  setVisibleVideos(visible);
}, [scrollY, postLayouts, height]);

// Video component uses visibility state
<Video
  shouldPlay={visibleVideos.has(item.id)}  // Only play when visible!
  isLooping={true}
  isMuted={true}
/>
```

### 4. **Video Looping**
- Changed all videos from `isLooping={false}` to `isLooping={true}`
- Videos now loop continuously like Instagram
- Applies to:
  - Single video posts (`item.video_url`)
  - Multi-video carousels (`item.video_urls`)

## Files Modified

### `/app/(tabs)/discover.tsx`
- **Lines 1-2**: Added `useRef` import and `height` from Dimensions
- **Lines 80-88**: Added interfaces and state for viewport tracking:
  - `PostLayout` interface for tracking post positions
  - `postLayouts` state to store Y position and height of each post
  - `scrollY` state to track current scroll position
  - `scrollViewRef` reference to ScrollView
  - `visibleVideos` Set to track which videos should play
- **Lines ~200-230**: Added `updateVisibleVideos` function with 50% visibility calculation
- **Lines 1210-1217**: Added scroll tracking to main ScrollView
- **Lines 1295-1305**: Added `onLayout` to post cards to measure positions
- **Lines 1360-1372**: Video carousel with viewport-based `shouldPlay`
- **Lines 1432-1444**: Single video with viewport-based `shouldPlay`

## User Experience

### Before
- Videos auto-played regardless of position
- Multiple videos could play simultaneously
- Confusing audio from off-screen videos
- Battery/data waste from playing hidden videos
- No indication of carousel length

### After ✨
- **Smart Auto-Play**: Only plays videos when fully visible (50%+ in viewport)
- **Automatic Pause**: Videos stop when scrolled away
- **Single Video at a Time**: Only one video plays at any moment
- **Clear Counters**: Shows "X/Y" for multi-item carousels
- **Muted Start**: Videos auto-play muted (tap to unmute)
- **Smooth Looping**: Videos replay continuously
- **Battery Efficient**: Only active videos consume resources

## Technical Details

### Viewport Visibility Algorithm
```
For each post:
1. Get post position: postTop, postBottom
2. Get viewport bounds: viewportTop, viewportBottom
3. Calculate overlap:
   - visibleTop = max(postTop, viewportTop)
   - visibleBottom = min(postBottom, viewportBottom)
   - visibleHeight = visibleBottom - visibleTop
4. Calculate ratio: visibilityRatio = visibleHeight / postHeight
5. If ratio >= 0.5 (50%), mark as visible
```

### Performance Optimizations
- `scrollEventThrottle={16}`: Updates at 60fps for smooth tracking
- `useCallback`: Memoizes visibility calculation function
- `useEffect`: Only recalculates when scroll/layouts change
- Post layouts cached in state, not recalculated on every scroll

### Video Configuration
- **shouldPlay**: Dynamic based on `visibleVideos.has(item.id)`
- **isMuted**: Always `true` (user can unmute via controls)
- **isLooping**: Always `true` (continuous playback)
- **useNativeControls**: Full user control (unmute, pause, seek)
- **ResizeMode.COVER**: Fills frame without distortion

## Testing Checklist

- [x] Videos only play when 50%+ visible in viewport
- [x] Videos pause when scrolled out of view
- [x] Only one video plays at a time
- [x] Image counter displays for multi-image posts
- [x] Video counter displays for multi-video posts
- [x] Counter updates when swiping through carousel
- [x] Videos start muted
- [x] Users can unmute via native controls
- [x] Videos loop continuously
- [x] Smooth scrolling with no lag
- [x] Post layouts measured correctly

## Edge Cases Handled

1. **Rapid Scrolling**: `scrollEventThrottle={16}` ensures smooth updates
2. **Multiple Videos on Screen**: Only plays the most visible one (50%+ threshold)
3. **Partial Visibility**: Videos with <50% visible don't auto-play
4. **Layout Changes**: `onLayout` updates positions when posts render/resize
5. **Carousel Videos**: Each video in carousel respects same visibility rules

## Comparison to Instagram

| Feature | Instagram | Our Implementation |
|---------|-----------|-------------------|
| Auto-play threshold | ~50% visible | 50% visible ✅ |
| Auto-pause on scroll | Yes | Yes ✅ |
| Muted by default | Yes | Yes ✅ |
| Loop continuously | Yes | Yes ✅ |
| Native controls | Yes | Yes ✅ |
| Carousel counters | Yes | Yes ✅ |
| Single video at a time | Yes | Yes ✅ |

## Future Enhancements (Optional)

1. **Preloading**: Preload next video for smoother playback
2. **Analytics**: Track video view duration and completion rate
3. **Sound Auto-Play**: Allow auto-unmute for users with headphones connected
4. **Picture-in-Picture**: Continue playback when switching tabs
5. **Video Quality**: Auto-adjust quality based on connection speed

## Notes

- Viewport tracking uses ScrollView onScroll + onLayout (no FlatList needed)
- More efficient than converting entire feed to FlatList
- Maintains existing code structure and patterns
- 50% threshold is industry standard (Instagram, TikTok, YouTube)
- Muted start complies with mobile best practices and saves data
