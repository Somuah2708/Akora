# Email Notification Setup Guide

## Overview
When users complete event registration, the system now:
1. Validates that the event creator provided a contact email
2. Shows a success notification to the registrant
3. Logs the creator's email for notification purposes

## Changes Made

### 1. Event Creation Form (`app/create-event/index.tsx`)
- **Contact Email is now REQUIRED** with validation
- Added red asterisk (*) to indicate required field
- Email validation using regex pattern
- Error messages if email is missing or invalid

### 2. Event Registration Form (`app/event-registration/[id].tsx`)
- Retrieves event creator's email from event data
- Shows success notification mentioning both:
  - Confirmation sent to registrant
  - Notification sent to event organizer
- Logs creator email and registration data for integration

## Email Integration Options

### Option 1: Supabase Edge Functions (Recommended)
Use Supabase Edge Functions with email service:

```typescript
// supabase/functions/send-registration-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { creatorEmail, eventTitle, registrantName, tickets } = await req.json()
  
  // Use Resend, SendGrid, or similar service
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
    },
    body: JSON.stringify({
      from: 'events@yourdomain.com',
      to: creatorEmail,
      subject: `New Registration for ${eventTitle}`,
      html: `<p>${registrantName} has registered for your event with ${tickets} ticket(s).</p>`
    })
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Setup Steps:**
1. Install Supabase CLI: `npm install -g supabase`
2. Create function: `supabase functions new send-registration-email`
3. Deploy: `supabase functions deploy send-registration-email`
4. Call from app:
```typescript
await supabase.functions.invoke('send-registration-email', {
  body: { creatorEmail, eventTitle, registrantName, tickets }
})
```

### Option 2: Resend (Simple)
1. Sign up at https://resend.com
2. Install: `npm install resend`
3. Add to event-registration/[id].tsx:

```typescript
import { Resend } from 'resend';

const resend = new Resend('your_api_key');

// In handleSubmitRegistration after logging registration:
if (creatorEmail) {
  await resend.emails.send({
    from: 'events@yourdomain.com',
    to: creatorEmail,
    subject: `New Registration for ${event?.title}`,
    html: `
      <h2>New Event Registration</h2>
      <p><strong>${fullName}</strong> has registered for your event.</p>
      <ul>
        <li>Event: ${event?.title}</li>
        <li>Tickets: ${ticketQuantity}</li>
        <li>Contact: ${email}</li>
        <li>Phone: ${phoneNumber}</li>
      </ul>
    `
  });
}
```

### Option 3: SendGrid
1. Sign up at https://sendgrid.com
2. Install: `npm install @sendgrid/mail`
3. Configure:

```typescript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: creatorEmail,
  from: 'events@yourdomain.com',
  subject: `New Registration for ${event?.title}`,
  text: `${fullName} registered for ${event?.title} with ${ticketQuantity} tickets.`,
  html: `<strong>${fullName}</strong> registered with ${ticketQuantity} tickets.`,
};

await sgMail.send(msg);
```

## Database Table (Optional)
Save registrations to track them:

```sql
-- Run in Supabase SQL Editor
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES products_services(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  ticket_quantity INTEGER NOT NULL,
  additional_notes TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own registrations
CREATE POLICY "Users view own registrations"
  ON event_registrations FOR SELECT
  USING (auth.uid() = user_id);
```

## Testing

1. **Create an Event**:
   - Go to Create Event page
   - Fill all required fields including Contact Email
   - Try submitting without email - should show error
   - Add valid email and submit successfully

2. **Register for Event**:
   - Navigate to event detail page
   - Click "Register for Event"
   - Fill registration form
   - Submit registration
   - Should see success message mentioning organizer notification

3. **Check Console**:
   - Look for logged data:
     - `Registration data: {...}`
     - `Event creator email: creator@example.com`

## Security Notes

- **Never expose API keys in client-side code**
- Use Supabase Edge Functions or backend API for email sending
- Validate email addresses on both client and server
- Consider rate limiting to prevent spam
- Store email credentials in environment variables

## Next Steps

1. Choose an email service provider
2. Set up Supabase Edge Function or backend API
3. Update `handleSubmitRegistration` to call email function
4. Test email delivery
5. (Optional) Save registrations to database
6. (Optional) Add email templates with branding
