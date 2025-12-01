# Sentry Integration Guide for Akora

## Overview
Sentry is now integrated into the Akora app to help you debug errors quickly and track issues in production. All errors from media uploads, camera/gallery access, and other critical functions are automatically reported to Sentry.

## Setup Instructions

### 1. Create a Sentry Account
1. Go to [sentry.io](https://sentry.io)
2. Sign up for a free account (or use GitHub/Google login)
3. Create a new project:
   - Select **React Native** as the platform
   - Name your project (e.g., "Akora Mobile")
   - Click **Create Project**

### 2. Get Your DSN
After creating the project, Sentry will show you a **DSN (Data Source Name)**. It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7654321
```

Copy this DSN.

### 3. Configure Your App
Open `lib/sentry.ts` and replace the placeholder DSN:

```typescript
dsn: 'YOUR_SENTRY_DSN_HERE', // Replace with your actual DSN
```

With your actual DSN:

```typescript
dsn: 'https://abc123def456@o123456.ingest.sentry.io/7654321',
```

### 4. Test the Integration
Run your app and trigger an error intentionally. For example:
- Try uploading a very large file (it will fail and report to Sentry)
- Try accessing camera without permissions

Check your Sentry dashboard at [sentry.io](https://sentry.io) - you should see the error appear within seconds.

## What's Being Tracked

### Automatic Error Tracking
Sentry automatically captures:
- ✅ Camera permission errors
- ✅ Gallery/photo library errors
- ✅ Document picker errors
- ✅ Media upload failures (with file info)
- ✅ Document upload failures
- ✅ Voice recording errors
- ✅ App crashes and unhandled exceptions
- ✅ Network errors
- ✅ JavaScript errors

### User Context
When a user logs in, Sentry automatically tracks:
- User ID
- User email
- Platform (iOS/Android)
- App version
- Device info

### Performance Monitoring
- Screen load times
- Network request duration
- App startup time
- Navigation performance

## Using Sentry in Your Code

### Manually Capture Errors
```typescript
import { captureException, captureMessage, addBreadcrumb } from '@/lib/sentry';

try {
  // Your code
} catch (error) {
  captureException(error as Error, {
    function: 'myFunction',
    customData: 'some value'
  });
}
```

### Add Breadcrumbs (Debug Trail)
```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb({
  category: 'upload',
  message: 'User started uploading photo',
  level: 'info',
  data: { fileSize: 1024000 }
});
```

### Capture Messages (Non-Errors)
```typescript
import { captureMessage } from '@/lib/sentry';

captureMessage('User completed onboarding', 'info');
```

## Viewing Errors in Sentry Dashboard

### Real-Time Error Monitoring
1. Go to [sentry.io](https://sentry.io)
2. Click on your project (Akora Mobile)
3. You'll see all errors in real-time

### Error Details Include:
- **Stack trace** - exact line of code that failed
- **User info** - who experienced the error
- **Device info** - iOS/Android, version, model
- **Breadcrumbs** - what the user did before the error
- **Environment** - development or production
- **Frequency** - how many times it happened

### Debugging with Sentry
When you see an error:
1. Click on it to see full details
2. Check the **stack trace** to find the exact line
3. Review **breadcrumbs** to understand user actions
4. See **context** (user ID, platform, file info, etc.)
5. Mark as **resolved** after fixing

### Email Alerts
Sentry can email you when:
- New errors occur
- Errors spike suddenly
- Critical errors happen

Configure this in: **Settings → Alerts**

## Privacy & Data

### What Sentry Collects:
- Error messages and stack traces
- User ID and email (for debugging)
- Device and platform info
- App version and environment
- File names/sizes (not actual file contents)

### What Sentry Does NOT Collect:
- User passwords
- Message content
- Media files
- Personal conversations
- Payment information

### Production vs Development
- **Development**: All errors logged (100% sample rate)
- **Production**: 20% of transactions sampled (to reduce costs)

You can adjust this in `lib/sentry.ts`:
```typescript
tracesSampleRate: __DEV__ ? 1.0 : 0.2, // Change 0.2 to higher for more coverage
```

## Cost & Limits

### Free Tier Includes:
- 5,000 errors/month
- 10,000 performance events/month
- 30-day data retention
- Unlimited team members

### If You Exceed Limits:
Sentry will stop accepting new events but won't break your app. Upgrade to paid plan or wait for next month's reset.

## Advanced Features

### Release Tracking
Track which app version has errors:
```typescript
Sentry.init({
  release: '1.0.0', // Add your app version
});
```

### Source Maps
Upload source maps to see readable stack traces (not minified):
```bash
npx sentry-cli releases files <VERSION> upload-sourcemaps ./dist
```

### Custom Tags
Filter errors by custom tags:
```typescript
import { setTag } from '@/lib/sentry';

setTag('subscription', 'premium');
setTag('feature', 'chat');
```

### Performance Tracing
Monitor slow operations:
```typescript
import * as Sentry from '@sentry/react-native';

const transaction = Sentry.startTransaction({ name: 'uploadPhoto' });
// ... your upload code ...
transaction.finish();
```

## GitHub Copilot Integration

When you ask Copilot about errors:
1. Open Sentry dashboard
2. Copy the error details or stack trace
3. Paste in Copilot chat: "Debug this error: [paste error]"
4. Copilot will analyze and suggest fixes

Example:
```
User: I'm seeing this error in Sentry:
TypeError: Cannot read property 'uri' of undefined
at uploadMedia (lib/media.ts:245)

Copilot: [analyzes and suggests fix]
```

## Troubleshooting

### Errors Not Appearing in Sentry
1. Check DSN is correct in `lib/sentry.ts`
2. Make sure app is connected to internet
3. Check Sentry quota hasn't been exceeded
4. Verify project is active in Sentry dashboard

### Too Many Errors
1. Filter noise in Sentry: **Settings → Inbound Filters**
2. Ignore specific errors
3. Reduce sample rate for less critical errors

### Testing Sentry Integration
Add this test button temporarily:
```typescript
import { captureMessage } from '@/lib/sentry';

<Button 
  title="Test Sentry" 
  onPress={() => captureMessage('Test from Akora app', 'info')}
/>
```

## Next Steps

1. ✅ Add your Sentry DSN to `lib/sentry.ts`
2. ✅ Test by triggering an error
3. ✅ Check Sentry dashboard for the error
4. ✅ Set up email alerts
5. ✅ Monitor errors regularly

## Support

- Sentry Docs: https://docs.sentry.io/platforms/react-native/
- Sentry Status: https://status.sentry.io/
- Community: https://discord.gg/sentry

---

**Your app now automatically reports errors to Sentry!** Just add your DSN and start debugging faster. 🚀
