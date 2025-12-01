# Complete Sentry Error Monitoring Guide

## 🎯 What Sentry Now Catches

Your app now has **comprehensive error tracking** that catches:

### ✅ Automatic Error Capture

1. **React Component Errors**
   - Component crashes
   - Rendering errors
   - Lifecycle errors
   - Shows user-friendly error screen

2. **Global JavaScript Errors**
   - Unhandled exceptions
   - Runtime errors
   - Type errors
   - Reference errors

3. **Promise Rejections**
   - Unhandled async/await errors
   - Failed API calls
   - Async operation failures

4. **Console Errors**
   - All `console.error()` calls
   - Warnings containing error patterns
   - Failed operations logged to console

5. **Network Errors**
   - Failed HTTP requests
   - 500+ server errors
   - Timeout errors
   - Connection failures

6. **Media Upload Errors** (Already integrated)
   - Camera access failures
   - Gallery permission errors
   - Upload failures with file context
   - Document picker errors
   - Voice recording errors

7. **Native Crashes**
   - iOS native crashes
   - Android native crashes
   - Bridge communication errors

8. **Performance Issues**
   - Slow screens
   - Long API calls
   - Navigation delays

## 📊 How to View Errors in Sentry

### Quick Access
Open your Sentry dashboard:
```
https://ceit.sentry.io/issues/?project=4510459892531280
```

### Dashboard Sections

**1. Issues Tab (Main)**
- See all errors in real-time
- Filter by:
  - Platform (iOS/Android)
  - Environment (dev/production)
  - User
  - Date range
  - Error type

**2. Each Error Shows:**
- ✅ Full stack trace (exact line that failed)
- ✅ User info (ID, email, device)
- ✅ Breadcrumbs (what user did before error)
- ✅ Device info (iOS version, model, memory)
- ✅ App version & environment
- ✅ Number of users affected
- ✅ Frequency (how often it occurs)
- ✅ Video replay (if error occurred during session replay)

**3. Click "Replay" to Watch**
- See exactly what the user did
- Watch their screen recording
- See every tap, scroll, navigation
- Understand the context

## 🚀 Testing Your Setup

### Test 1: Trigger a Simple Error
Add this button temporarily to any screen:

```typescript
import * as Sentry from '@sentry/react-native';
import { Button, Alert } from 'react-native';

<Button 
  title="🧪 Test Sentry" 
  onPress={() => {
    Sentry.captureException(new Error('Test error from my device!'));
    Alert.alert('Sent!', 'Check Sentry dashboard in 5 seconds');
  }}
/>
```

**Expected**: Error appears in Sentry within 5-10 seconds

### Test 2: Trigger a Component Error
```typescript
<Button 
  title="💥 Crash Test" 
  onPress={() => {
    throw new Error('Component crash test!');
  }}
/>
```

**Expected**: 
- User sees error screen with "Try Again" button
- Error reported to Sentry with component stack

### Test 3: Trigger a Network Error
```typescript
<Button 
  title="🌐 Network Test" 
  onPress={async () => {
    try {
      await fetch('https://invalid-url-that-does-not-exist.com/api');
    } catch (error) {
      console.error('Network failed:', error);
    }
  }}
/>
```

**Expected**: Network error captured and reported to Sentry

### Test 4: Trigger Upload Error
- Try uploading a file larger than 10MB
- Try using camera without permissions
- Try uploading while offline

**Expected**: All media errors reported with context (file size, platform, etc.)

## 🔍 Using Sentry with GitHub Copilot

### Workflow for Debugging

**Step 1: See Error in Sentry**
1. Get notification email (set up alerts)
2. Or check dashboard daily
3. Click on the error

**Step 2: Copy Error Details**
Copy these from Sentry:
- Error message
- Stack trace (most important!)
- Platform (iOS/Android)
- User actions (breadcrumbs)
- Any custom context

**Step 3: Ask Copilot**

```
Me: I'm seeing this error in Sentry:

Error: Cannot read property 'uri' of undefined
Platform: iOS 17.0
File: lib/media.ts:245

Stack Trace:
at uploadMedia (lib/media.ts:245:20)
at handlePickPhotos (app/chat/direct/[id].tsx:520:15)

Breadcrumbs:
1. User tapped "Pick Photo" button
2. Gallery opened successfully  
3. Photo selected
4. Upload started
5. Error occurred

Context:
- fileSize: undefined
- Platform: iOS
- User: user_abc123

What's causing this and how do I fix it?
```

**Step 4: Copilot Analyzes**
Copilot will:
- Read the stack trace
- Identify the exact problem
- Suggest a fix
- Show you the code to change

**Step 5: Apply Fix**
- Make the code change
- Test it
- Deploy
- Mark as "Resolved" in Sentry

## 📧 Set Up Email Alerts

1. Go to [Settings → Alerts](https://ceit.sentry.io/alerts/)
2. Create alert for "New Issues"
3. Set conditions:
   - First seen error
   - Error spike (10x increase)
   - Specific error types
4. Get email instantly when errors occur

## 🎯 Priority Errors to Fix First

In Sentry, look for:

**1. High Frequency**
- Errors affecting many users
- Happening repeatedly

**2. Fatal Errors**
- App crashes
- Login failures
- Payment failures

**3. Recent Regressions**
- New errors after deployment
- Spike in existing errors

## 📱 Real-World Usage

### Example 1: Media Upload Failing
**Sentry shows:**
```
Error: Upload failed - Network request failed
Function: uploadMedia
Platform: iOS
File: 8MB image
User: user_123
Times: 5 times in last hour
```

**Ask Copilot:**
"Why is uploadMedia failing on iOS for 8MB images? Sentry shows 'Network request failed'"

**Copilot suggests:**
"8MB might exceed upload timeout. Add compression or increase timeout..."

### Example 2: App Crashing on Startup
**Sentry shows:**
```
Error: TypeError: Cannot read property 'id' of null
Platform: Android
File: app/_layout.tsx:85
Users affected: 15
```

**Ask Copilot:**
"App crashing on Android startup. Stack trace shows null user.id at _layout.tsx:85"

**Copilot suggests:**
"Add null check before accessing user.id..."

### Example 3: Silent Failures
**Sentry shows console errors:**
```
Warning: Failed to mark message as read
Error: Supabase error: Row level security policy violated
Platform: iOS
```

**Even though user didn't report it!**

## 🛠️ Advanced Features

### Add Custom Context
```typescript
import * as Sentry from '@sentry/react-native';

// Before an operation
Sentry.setContext('upload', {
  fileSize: 1024000,
  fileName: 'photo.jpg',
  compressionEnabled: true,
});

// Then if error occurs, Sentry includes this context
```

### Add Breadcrumbs for Debugging
```typescript
import { addDebugBreadcrumb } from '@/lib/globalErrorHandler';

addDebugBreadcrumb('User started uploading photo', {
  fileSize: 1024000,
  compressed: true,
});
```

### Manually Report Errors
```typescript
import { reportError } from '@/lib/globalErrorHandler';

try {
  // risky operation
} catch (error) {
  reportError(error as Error, {
    operation: 'uploadPhoto',
    userId: user.id,
  }, 'error');
}
```

## 📈 Monitor Health

### Daily Routine
1. Check Sentry dashboard
2. Look for new errors
3. Check error trends
4. Fix high-priority issues

### Weekly Review
1. Check performance metrics
2. Review most common errors
3. Update error priorities
4. Plan fixes for next sprint

## 🎓 Error Categories in Your App

### Critical (Fix ASAP)
- App crashes
- Login/auth failures
- Message send failures
- Media upload failures

### High Priority
- Performance issues
- Network errors
- Permission errors

### Medium Priority
- UI glitches
- Non-critical warnings

### Low Priority
- Console warnings
- Development-only errors

## 🔒 Privacy Note

**What Sentry Collects:**
- Error messages & stack traces
- User ID & email (for debugging)
- Device info (model, OS version)
- App version
- Breadcrumbs (user actions)

**What Sentry Does NOT Collect:**
- Passwords
- Message content
- Media files
- Personal conversations
- Payment info

## ✅ Success Checklist

- [ ] Sentry dashboard accessible
- [ ] Test error sent successfully
- [ ] Email alerts configured
- [ ] Error Boundary working (shows error screen)
- [ ] Global handlers catching console errors
- [ ] Network errors being tracked
- [ ] Media errors reporting with context
- [ ] Session Replay recording errors
- [ ] GitHub Copilot workflow tested

## 🎯 Next Steps

1. **Restart your app**: `npx expo start -c`
2. **Trigger test error**: Use test button
3. **Check Sentry**: Error should appear in 5 seconds
4. **Copy error to Copilot**: Test debugging workflow
5. **Set up alerts**: Get notified of new errors
6. **Monitor daily**: Make it a habit

---

**Your app now catches EVERY error automatically!** 🎉

No more mystery bugs. No more "I don't see the error in terminal". Sentry sees everything.

When you ask Copilot "Debug this error", just paste from Sentry and get instant fixes!
