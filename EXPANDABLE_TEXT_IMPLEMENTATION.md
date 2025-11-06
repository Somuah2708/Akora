# Instagram-Style Expandable Text Implementation

## Overview
Implemented Instagram-style "more" and "less" buttons for long captions and comments across the app. Text now collapses to 2-3 lines with a "more" button to expand, and a "less" button to collapse back.

## New Component

### `ExpandableText.tsx`
Reusable component that automatically detects text overflow and shows expand/collapse controls.

**Features:**
- Auto-detects if text exceeds specified line limit
- Shows "more" button only when text is truncated
- Expands to show full text when tapped
- Shows "less" button when expanded
- Supports custom styling for text, username, and buttons
- Configurable line limit (default: 2 lines)

**Props:**
```tsx
interface ExpandableTextProps {
  text: string;              // The main text content
  numberOfLines?: number;    // Line limit before truncation (default: 2)
  style?: any;              // Style for main text
  usernameStyle?: any;      // Style for username (bold)
  username?: string;         // Optional username prefix
  moreTextStyle?: any;      // Style for "more" button
  lessTextStyle?: any;      // Style for "less" button
}
```

**Usage Example:**
```tsx
<ExpandableText
  text="This is a very long caption that will be truncated..."
  username="John Doe"
  numberOfLines={2}
  style={styles.captionText}
  usernameStyle={styles.username}
/>
```

## Files Modified

### 1. `/components/ExpandableText.tsx` (NEW)
- Created reusable expandable text component
- Uses `onTextLayout` to detect overflow
- Handles expand/collapse state internally

### 2. `/app/(tabs)/discover.tsx`
- **Line 14**: Added ExpandableText import
- **Lines ~1495-1505**: Replaced static caption with ExpandableText component
  - Set to 2 lines initially
  - Shows username in bold followed by caption text
  - Only renders if description exists

**Before:**
```tsx
<View style={styles.postCaption}>
  <Text style={styles.postCaptionText}>
    <Text style={styles.postCaptionUsername}>
      {item.author?.full_name || 'Anonymous'}
    </Text>
    {' '}{item.description}
  </Text>
</View>
```

**After:**
```tsx
{item.description && (
  <View style={styles.postCaption}>
    <ExpandableText
      text={item.description}
      username={item.author?.full_name || 'Anonymous'}
      numberOfLines={2}
      style={styles.postCaptionText}
      usernameStyle={styles.postCaptionUsername}
    />
  </View>
)}
```

### 3. `/app/(tabs)/index.tsx` (Home Feed)
- **Line 11**: Added ExpandableText import
- **Lines ~925-935**: Replaced static caption with ExpandableText component
  - Set to 2 lines initially
  - Shows username in bold followed by post content
  - Only renders if content exists

### 4. `/app/post-comments/[postId].tsx` (Comments Screen)
- **Line 9**: Added ExpandableText import
- **Lines ~240-250**: Replaced static comment text with ExpandableText component
  - Set to 3 lines for comments (slightly more than captions)
  - No username prefix (shown separately in header)

**Before:**
```tsx
<Text style={styles.commentText}>{comment.content}</Text>
```

**After:**
```tsx
<ExpandableText
  text={comment.content}
  numberOfLines={3}
  style={styles.commentText}
/>
```

### 5. `/app/post/[id].tsx` (Post Detail)
- **Line 8**: Added ExpandableText import
- **Lines ~215-225**: Replaced static caption with ExpandableText component
  - Set to 3 lines initially
  - Shows username in bold followed by post content

## User Experience

### Before
- Captions and comments displayed in full length
- Long text stretched entire screen vertically
- Hard to scan through posts quickly
- Overwhelming for long-form content

### After ✨
- **Captions**: Collapsed to 2 lines with "more" button
- **Comments**: Collapsed to 3 lines with "more" button
- **Tap "more"**: Expands to show full text
- **Tap "less"**: Collapses back to original state
- Clean, Instagram-like reading experience
- Easy to scan through content

## Line Limits by Context

| Screen | Element | Lines | Reasoning |
|--------|---------|-------|-----------|
| Discover Feed | Caption | 2 | Quick scanning, many posts |
| Home Feed | Caption | 2 | Quick scanning, many posts |
| Post Detail | Caption | 3 | More focus, single post |
| Comments | Comment | 3 | Comments often longer |

## Technical Details

### Overflow Detection
```tsx
const onTextLayout = (e: any) => {
  if (!expanded && e.nativeEvent.lines.length > numberOfLines) {
    setShowMore(true);  // Text overflows, show "more" button
  }
};
```

### Conditional Rendering
- "more" button only shows if text exceeds line limit
- "less" button only shows when expanded
- Username rendered inline with text when provided

### State Management
- `expanded`: Boolean tracking expand/collapse state
- `showMore`: Boolean tracking if overflow was detected
- Both managed internally by component

## Styling

### More/Less Buttons
```tsx
{
  color: '#64748B',        // Gray color
  fontSize: 14,
  fontFamily: 'Inter-Regular',
  marginTop: 2,
}
```

- Positioned below text
- Subtle gray color (not too prominent)
- Touchable with visual feedback
- Consistent across all screens

## Testing Checklist

- [x] Short captions (< 2 lines) don't show "more" button
- [x] Long captions show "more" button
- [x] Tapping "more" expands full text
- [x] Expanded text shows "less" button
- [x] Tapping "less" collapses back to 2 lines
- [x] Username displays in bold before caption
- [x] Works in discover feed
- [x] Works in home feed
- [x] Works in post detail screen
- [x] Works in comments screen
- [x] Styling matches existing design

## Edge Cases Handled

1. **No username**: Component works without username prop
2. **Very short text**: No "more" button appears
3. **Empty text**: Component handles gracefully
4. **Null/undefined**: Conditional rendering prevents errors
5. **Rapid tapping**: State updates smoothly

## Benefits

1. **Improved Readability**: Easier to scan multiple posts
2. **Clean UI**: Less vertical scrolling required
3. **User Control**: Readers choose what to expand
4. **Instagram-like**: Familiar UX pattern
5. **Reusable**: Single component for all text expansion needs
6. **Performance**: Only renders visible content initially

## Future Enhancements (Optional)

1. **Link Detection**: Highlight and make URLs tappable
2. **Mention Detection**: Highlight @mentions
3. **Hashtag Detection**: Highlight #hashtags
4. **Read More Animation**: Smooth expand/collapse transition
5. **Character Counter**: Show "X more characters" instead of just "more"
6. **Accessibility**: Add screen reader support

## Notes

- Component uses native `onTextLayout` for accurate line counting
- No external dependencies required
- Works with all React Native Text styling
- Compatible with custom fonts (Inter family used)
- Minimal performance impact (only measures on first render)
