# Camera Freeze Debugging Guide

## Problem
When tapping the camera icon in chat and selecting "Camera", the app freezes on iOS with no error logs.

## Why Sentry Might Not Catch It

### Native Crashes vs JavaScript Errors
Sentry for React Native catches **JavaScript errors**, but camera freezes are usually **native crashes** that happen outside JavaScript's scope:

1. **JavaScript errors** ✅ Caught by Sentry:
   - Unhandled exceptions
   - Promise rejections
   - React component errors
   
2. **Native crashes** ❌ Not caught in Expo Go:
   - Camera permission issues
   - Native module crashes
   - iOS/Android system crashes
   - Memory crashes

## What We Added

### 1. Extensive Breadcrumb Tracking
```typescript
// Before camera launch
Sentry.addBreadcrumb({
  category: 'camera',
  message: '⚠️ ABOUT TO CALL launchCameraAsync',
  level: 'warning'
});
```

**Check Sentry Dashboard**: If app freezes AFTER this breadcrumb appears, it's a **native crash**.

### 2. Detailed Console Logging
```
📷 [takeMedia] Function called
📷 [takeMedia] Checking camera permission...
📷 [takeMedia] Permission result: granted
📷 [takeMedia] ✅ Permission granted, launching camera...
📷 [takeMedia] ⚠️ ABOUT TO CALL launchCameraAsync
```

**Last log before freeze** tells you exactly where crash happens.

### 3. Enhanced Error Context
All errors now include:
- Platform (iOS/Android)
- User ID
- Error code
- Full stack trace

## How to Debug

### Step 1: Watch Terminal Logs
When you tap camera, you should see:
```
🎥 [Camera] User tapped camera button
🎥 [Camera] Calling takeMedia()...
📷 [takeMedia] Function called
📷 [takeMedia] Checking camera permission...
```

**If logs stop** at a certain line → That's where the crash happens!

### Step 2: Check Sentry Breadcrumbs
1. Open Sentry dashboard: https://ceit.sentry.io/issues/?project=4510459892531280
2. Look for latest event (even if no error captured)
3. Check breadcrumbs to see how far execution got:
   - ✅ "User tapped camera button" → Button press registered
   - ✅ "About to launch camera" → Permission granted
   - ❌ No "Camera launched successfully" → **Crashed during launchCameraAsync()**

### Step 3: Common Causes

#### A. Missing Camera Permission (iOS)
**Symptom**: App crashes silently when requesting camera

**Fix**: We already have this in Info.plist:
```xml
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to let you capture photos and videos.</string>
```

**Verify**: 
- Settings → Privacy & Security → Camera → Akora should be listed
- If not listed, permission request never triggered

#### B. Expo Go Limitation
**Symptom**: Camera works in development build but crashes in Expo Go

**Why**: Expo Go has limited native module access on iOS

**Solution**: Build with EAS:
```bash
eas build --platform ios --profile preview
```

#### C. iOS Simulator (No Camera)
**Symptom**: Crashes on simulator but works on device

**Why**: Simulator has no camera hardware

**Solution**: Always test camera on real device

#### D. Memory Pressure
**Symptom**: App freezes after opening camera (before taking photo)

**Why**: Not enough memory for camera preview

**Solution**: Close other apps, restart device

## Testing Checklist

### Real Device (iPhone)
- [ ] Camera permission granted in Settings
- [ ] App not in low memory state
- [ ] Camera works in other apps (Photos app)
- [ ] Check terminal logs when tapping camera
- [ ] Check Sentry breadcrumbs after freeze

### Terminal Output Expected
```
🎥 [Camera] User tapped camera button        ← Button pressed
🎥 [Camera] Calling takeMedia()...           ← Function called
📷 [takeMedia] Function called               ← Entered takeMedia
📷 [takeMedia] Checking camera permission... ← Requesting permission
📷 [takeMedia] Permission result: granted    ← Permission granted
📷 [takeMedia] ✅ Permission granted         ← About to launch
📷 [takeMedia] ✅ launchCameraAsync returned ← Camera opened! ✅
🎥 [Camera] takeMedia() returned: success    ← Photo taken
```

**If logs stop before "launchCameraAsync returned"** → Native crash in camera module

## Next Steps

### If Terminal Shows No Errors
→ This is a **native crash** (outside JavaScript)

**Solutions**:
1. **Build native app** (not Expo Go):
   ```bash
   eas build --platform ios --profile development
   ```
   
2. **Check iOS crash logs**:
   - Xcode → Window → Devices and Simulators
   - Select your device → View Device Logs
   - Look for crash with your app name

3. **Enable Sentry Native Crash Reporting** (requires dev build):
   ```javascript
   Sentry.init({
     enableNative: true,  // Captures native crashes
     enableNativeCrashHandling: true
   });
   ```

### If Sentry Shows Breadcrumbs But No Error
→ App froze after permission granted but before camera opened

**Possible causes**:
- Camera hardware issue
- iOS camera service crashed
- expo-image-picker bug in Expo Go

**Test**:
```typescript
// Try with different options
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images, // Only images
  quality: 0.5,
  allowsEditing: false,
  cameraType: ImagePicker.CameraType.back, // Specify rear camera
});
```

## Sentry Dashboard Tips

### Check These Tabs:
1. **Issues** → Any camera-related errors
2. **Performance** → Look for slow camera operations
3. **Session Replay** → Watch user session before crash (requires dev build)

### Filter for Camera Events:
- Tag: `feature:camera`
- Breadcrumb: `camera`
- Search: `takeMedia` or `launchCameraAsync`

## Important Notes

⚠️ **Expo Go Limitations**:
- Native crashes not caught by Sentry
- Session Replay disabled
- Limited native module access
- Camera might behave differently than production

✅ **For Full Error Tracking**:
Build with EAS:
```bash
# Development build (includes Sentry native SDK)
eas build --platform ios --profile development

# Install on device
eas build:run --platform ios
```

## Current Setup

✅ What's Working:
- JavaScript error tracking
- Breadcrumb logging
- Console error interception
- Network error tracking
- Detailed camera logging

⚠️ What's Limited in Expo Go:
- Native crash detection
- Session replay
- Full stack traces for native crashes

## Contact

If camera still freezes after all debugging:
1. Check terminal logs and note last message
2. Check Sentry breadcrumbs
3. Copy both to GitHub Copilot
4. Ask: "Camera freezes at [last log]. Breadcrumbs show [status]. How to fix?"
