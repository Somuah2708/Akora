# Quick Reference: Sentry + GitHub Copilot

## 🚀 Quick Start
1. Get DSN from [sentry.io](https://sentry.io) (create project first)
2. Add to `lib/sentry.ts`: `dsn: 'https://...@sentry.io/...'`
3. Update `app.json` with your org/project names
4. Done! Errors auto-report to Sentry

## 🔍 Debugging with Copilot

### Copy Error from Sentry → Ask Copilot
```
User: Debug this Sentry error:

Error: Cannot read property 'uri' of undefined
File: lib/media.ts:245
Function: uploadMedia
Platform: iOS
User: user_123

Stack Trace:
at uploadMedia (lib/media.ts:245)
at handlePickPhotos (app/chat/direct/[id].tsx:520)

Breadcrumbs:
1. User tapped "Pick Photo"
2. Gallery opened
3. Photo selected
4. Upload started
5. Error occurred
```

Copilot will analyze and suggest fixes!

## 📊 Common Error Patterns

### Media Upload Failures
**Sentry shows:**
```
Upload error: Network request failed
Function: uploadMedia
Platform: iOS
File size: 8MB
```

**Ask Copilot:**
"Why would uploadMedia fail with 'Network request failed' on iOS for 8MB file?"

### Permission Errors
**Sentry shows:**
```
Camera error: User denied permissions
Function: takeMedia
Platform: Android
```

**Ask Copilot:**
"How to handle camera permission denial gracefully in takeMedia?"

### Compression Errors
**Sentry shows:**
```
Error: Image manipulation failed
Function: uploadMedia
Platform: iOS
```

**Ask Copilot:**
"Debug image compression failure in uploadMedia on iOS"

## 🛠️ Useful Sentry Queries

### Filter by Function
```
function:uploadMedia
function:pickDocument
function:takeMedia
```

### Filter by Platform
```
platform:iOS
platform:Android
```

### Filter by User
```
user.id:abc123
```

### Combine Filters
```
function:uploadMedia platform:iOS
```

## 💡 Copilot Prompts for Sentry Errors

### General Debugging
```
"Analyze this Sentry error and suggest fixes: [paste error]"
"Why is [function] failing on [platform]?"
"Explain this stack trace: [paste trace]"
```

### Performance Issues
```
"This function is slow according to Sentry. How to optimize? [paste details]"
"Reduce upload time for uploadMedia showing 30s in Sentry"
```

### User Impact Analysis
```
"How many users are affected by this error? [paste Sentry stats]"
"Should I prioritize fixing this? [paste error frequency]"
```

## 🎯 Best Practices

### 1. Regular Monitoring
- Check Sentry dashboard daily
- Set up email alerts for critical errors
- Review error trends weekly

### 2. Error Context
Always provide Copilot with:
- Error message
- Stack trace
- Platform (iOS/Android)
- Function name
- User context (if relevant)

### 3. Breadcrumbs
Add breadcrumbs for complex flows:
```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb({
  message: 'User started photo upload',
  category: 'upload',
  data: { fileSize: 1024000 }
});
```

### 4. Custom Context
Add context for better debugging:
```typescript
captureException(error, {
  function: 'uploadMedia',
  fileSize: blob.size,
  platform: Platform.OS,
  userId: user.id
});
```

## 🔧 Troubleshooting

### Errors Not in Sentry?
1. Check DSN is correct
2. Verify internet connection
3. Check Sentry quota
4. Test with: `captureMessage('Test', 'info')`

### Too Much Noise?
1. Filter in Sentry settings
2. Ignore known errors
3. Reduce sample rate
4. Add before-send filtering

## 📱 Mobile-Specific Tips

### iOS Issues
- Check Info.plist permissions
- Verify signing certificates
- Test on physical device
- Check iOS version compatibility

### Android Issues
- Check AndroidManifest.xml permissions
- Verify ProGuard rules
- Test on different Android versions
- Check network security config

## 🤖 Copilot Integration Workflow

1. **Error Occurs** → Sentry captures it
2. **Check Sentry** → See error details
3. **Copy to Copilot** → Paste full error + stack trace
4. **Get Fix** → Copilot suggests solution
5. **Implement** → Apply the fix
6. **Verify** → Check Sentry for resolution
7. **Mark Resolved** → Close in Sentry dashboard

## 📈 Metrics to Track

- **Error rate**: Errors per user session
- **Affected users**: How many users hit the error
- **Frequency**: How often it occurs
- **Resolution time**: How fast you fix it
- **Regression**: Does it come back?

## 🎓 Learning from Errors

### Pattern Recognition
Ask Copilot:
```
"I see these 3 related errors in Sentry. What's the root cause?
1. [error 1]
2. [error 2]
3. [error 3]"
```

### Preventive Fixes
```
"Based on this Sentry error, what other similar issues might exist? [paste error]"
```

### Code Quality
```
"Refactor this function to prevent this Sentry error: [paste error + code]"
```

---

**Remember:** Sentry + Copilot = Faster debugging! 🚀
Copy errors from Sentry → Ask Copilot → Get fixes faster!
