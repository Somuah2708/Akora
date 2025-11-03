# 🚀 EmailJS Setup Instructions

## ✅ Package Installed!
The `@emailjs/browser` package is now installed and the code is ready to use.

## 📝 Quick Setup (5-10 minutes)

### Step 1: Sign Up for EmailJS
1. Go to **https://www.emailjs.com/**
2. Click **"Sign Up"** (or use Google sign-in for fastest setup)
3. Verify your email address

### Step 2: Create Email Service
1. In EmailJS dashboard, click **"Add New Service"**
2. Choose **"Gmail"** (easiest option)
3. Click **"Connect Account"** and authorize EmailJS
4. Copy your **Service ID** (looks like: `service_abc123`)

### Step 3: Create Email Template
1. Click **"Email Templates"** → **"Create New Template"**
2. Set Template Name: `event_registration_notification`
3. Fill in the template:

**To Email:** `{{to_email}}`

**Subject:**
```
🎉 New Registration for {{event_title}}
```

**Content:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #4169E1;">🎉 New Event Registration!</h2>
  
  <p>Great news! Someone has registered for your event.</p>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Event Details:</h3>
    <ul style="list-style: none; padding: 0;">
      <li><strong>📅 Event:</strong> {{event_title}}</li>
      <li><strong>📆 Date:</strong> {{event_date}}</li>
      <li><strong>🕐 Time:</strong> {{event_time}}</li>
      <li><strong>📍 Location:</strong> {{event_location}}</li>
    </ul>
  </div>
  
  <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Registrant Information:</h3>
    <ul style="list-style: none; padding: 0;">
      <li><strong>👤 Name:</strong> {{from_name}}</li>
      <li><strong>📧 Email:</strong> {{from_email}}</li>
      <li><strong>📱 Phone:</strong> {{phone_number}}</li>
      <li><strong>🎫 Tickets:</strong> {{ticket_quantity}}</li>
      <li><strong>💬 Notes:</strong> {{additional_notes}}</li>
    </ul>
  </div>
  
  <p>You can contact them at <a href="mailto:{{from_email}}">{{from_email}}</a> or call {{phone_number}}.</p>
  
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    This is an automated notification from your event registration system.
  </p>
</div>
```

4. Click **"Save"**
5. Copy your **Template ID** (looks like: `template_xyz789`)

### Step 4: Get Your Public Key
1. Go to **"Account"** → **"General"**
2. Find your **Public Key** (looks like: `ABCdefGHIjklMNO`)
3. Copy it

### Step 5: Update Your App
Open `app/event-registration/[id].tsx` and find these lines near the top:

```typescript
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';      // ← Replace this
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';    // ← Replace this
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';      // ← Replace this
```

Replace with your actual values:
```typescript
const EMAILJS_SERVICE_ID = 'service_abc123';      // Your Service ID
const EMAILJS_TEMPLATE_ID = 'template_xyz789';    // Your Template ID
const EMAILJS_PUBLIC_KEY = 'ABCdefGHIjklMNO';     // Your Public Key
```

### Step 6: Test It!
1. Create a test event with YOUR email as the contact email
2. Register for that event
3. Check your email inbox
4. 🎉 You should receive the registration notification!

## 🔍 Troubleshooting

### "Email not received?"
- ✅ Check spam/junk folder
- ✅ Verify service is connected in EmailJS dashboard
- ✅ Check browser/app console for error messages
- ✅ Make sure you updated all 3 credentials (Service ID, Template ID, Public Key)
- ✅ Ensure the event has a valid contact email

### "Getting errors in console?"
- If you see: `⚠️ EmailJS not configured yet!`
  - You need to update the 3 credentials in the code
- If you see: `❌ Error sending email`
  - Check that your EmailJS service is active
  - Verify your API limits (free tier: 200 emails/month)

### "Want to use a different email service?"
No problem! The code structure supports:
- Resend (see EMAIL_NOTIFICATION_SETUP.md)
- SendGrid (see EMAIL_NOTIFICATION_SETUP.md)
- Supabase Edge Functions (see EMAIL_NOTIFICATION_SETUP.md)

## 📊 Free Tier Limits
- **200 emails per month** (free)
- Upgrade to paid for more: $15/month = 1,000 emails

## 🎯 What Happens Now?

### Before Setup:
- ✅ Registration works
- ✅ Success message shows
- ❌ No email sent (only logs to console)

### After Setup (5 min):
- ✅ Registration works
- ✅ Success message shows
- ✅ **Email sent to event creator!** 📧

## 🔐 Security Note
Your Public Key is safe to use in frontend code - it's designed for client-side use. However, for production apps, consider using environment variables:

```typescript
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'fallback_key';
```

---

**Total Setup Time**: ~10 minutes  
**Difficulty**: Easy ⭐  
**Cost**: Free (200 emails/month)

Need help? Check the full guide in `EMAILJS_QUICK_SETUP.md`
