# Status Bar Scrim System - Usage Guide

## Overview
This app now has a global Instagram-style status bar scrim system that applies to every screen automatically.

## Architecture

### 1. Components Created

#### `StatusBarScrim.tsx`
A translucent overlay that sits at the top of the screen covering the status bar area.

**Features:**
- Respects safe area insets (notches, dynamic islands)
- Auto-adjusts for dark/light mode
- Stays fixed during scrolling
- Allows touches to pass through (`pointerEvents="none"`)

**Props:**
```tsx
interface StatusBarScrimProps {
  backgroundColor?: string;  // Custom color (default: auto dark/light)
  extraHeight?: number;      // Additional height beyond status bar
  mode?: 'light' | 'dark' | 'auto';  // Color mode override
}
```

#### `AppLayout.tsx`
Global wrapper that provides edge-to-edge UI with automatic scrim injection.

**Features:**
- Sets status bar to translucent on Android
- Wraps all screens automatically
- Provides scrim configuration options

**Props:**
```tsx
interface AppLayoutProps {
  children: ReactNode;
  showScrim?: boolean;           // Toggle scrim (default: true)
  scrimColor?: string;           // Custom scrim color
  scrimExtraHeight?: number;     // Extra scrim height
  scrimMode?: 'light' | 'dark' | 'auto';  // Color mode
}
```

### 2. Integration

The system is integrated at the root level in `app/_layout.tsx`:

```tsx
<AppLayout>
  <Stack screenOptions={{ headerShown: false }}>
    {/* All your screens */}
  </Stack>
  <StatusBar style="light" />
</AppLayout>
```

## How to Use

### For Most Screens (Automatic)
**You don't need to do anything!** The scrim is automatically applied to all screens.

Just ensure your scrollable content uses safe area insets:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function MyScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView>
      {/* Header with proper top padding */}
      <View style={{ paddingTop: insets.top + 16 }}>
        <Text>My Header</Text>
      </View>
      
      {/* Rest of content */}
    </ScrollView>
  );
}
```

### Customizing the Scrim on Specific Screens

If you need custom scrim behavior on a specific screen, you can:

1. **Option 1: Use AppLayout props**
```tsx
// In your screen file
<AppLayout scrimColor="rgba(0, 0, 0, 0.5)" scrimExtraHeight={20}>
  {/* Your screen content */}
</AppLayout>
```

2. **Option 2: Import StatusBarScrim directly**
```tsx
import { StatusBarScrim } from '@/components/StatusBarScrim';

function MyCustomScreen() {
  return (
    <View>
      {/* Your content */}
      <StatusBarScrim mode="dark" extraHeight={10} />
    </View>
  );
}
```

### Disabling the Scrim on a Specific Screen

```tsx
<AppLayout showScrim={false}>
  {/* Your screen without scrim */}
</AppLayout>
```

## Default Behavior

### Status Bar
- **Style:** `light` (white icons)
- **Translucent:** Yes (on Android)
- **Background:** Transparent

### Scrim Colors
- **Light Mode:** `rgba(0, 0, 0, 0.3)` - Dark translucent
- **Dark Mode:** `rgba(255, 255, 255, 0.1)` - Light translucent

### Z-Index
- **Scrim:** 9999 (always on top)
- **Content:** Scrolls behind the scrim

## Examples

### Example 1: Standard Screen (Home/Discover)
```tsx
function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView>
      <View style={{ paddingTop: insets.top + 16, backgroundColor: '#0F172A' }}>
        <Text style={{ color: '#FFFFFF' }}>Akora</Text>
      </View>
      {/* Rest of content scrolls behind scrim */}
    </ScrollView>
  );
}
```

### Example 2: Custom Scrim Color
```tsx
function CustomScreen() {
  return (
    <>
      <ScrollView>
        {/* Your content */}
      </ScrollView>
      <StatusBarScrim backgroundColor="rgba(255, 0, 0, 0.2)" />
    </>
  );
}
```

### Example 3: Dark Mode Handling
The scrim automatically adjusts based on system color scheme:
- Light mode → Dark scrim (for readability on light backgrounds)
- Dark mode → Light scrim (subtle overlay on dark backgrounds)

You can override this:
```tsx
<StatusBarScrim mode="dark" /> {/* Always use dark scrim */}
```

## Platform Differences

### iOS
- Uses `SafeAreaInsets.top` for notch/dynamic island
- Status bar height varies by device
- Scrim automatically adjusts

### Android
- Uses `StatusBar.currentHeight`
- Translucent status bar enabled globally
- Works with gesture navigation

## Tips & Best Practices

1. **Always use `useSafeAreaInsets()`** for top padding on headers
2. **Keep status bar style "light"** for best contrast with the scrim
3. **Don't add extra top padding** - the scrim handles it
4. **Test on both iOS and Android** - especially devices with notches
5. **Use dark backgrounds for headers** when using light status bar icons

## Troubleshooting

### Scrim not visible
- Check if `showScrim={false}` is set
- Verify `AppLayout` is wrapping your navigation
- Ensure status bar style is set to "light"

### Content hidden behind scrim
- Add proper `paddingTop: insets.top + [extraPadding]` to your header
- Verify `SafeAreaProvider` is wrapping the app

### Wrong scrim color
- Override with `scrimColor` or `mode` props
- Check system color scheme settings

## Implementation Details

### Why Fixed Position?
The scrim uses `position: 'absolute'` with `zIndex: 9999` to:
- Stay fixed during scrolling
- Appear on top of all content
- Allow content to scroll behind it (Instagram-style)

### Why pointerEvents="none"?
Allows touches to pass through the scrim to interactive elements beneath it (like header buttons).

### Why Auto Color Mode?
Different content backgrounds require different scrim opacity:
- Light backgrounds → Dark scrim (better contrast)
- Dark backgrounds → Light scrim (subtle overlay)

The system automatically detects the color scheme and adjusts.
