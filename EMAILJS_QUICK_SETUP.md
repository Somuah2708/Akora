# Quick Email Setup - EmailJS (No Backend Required!)

## Why EmailJS?
- ✅ Works directly from React Native (no backend needed)
- ✅ Free tier: 200 emails/month
- ✅ Setup in 5 minutes
- ✅ No credit card required

## Setup Steps

### 1. Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Click "Sign Up" (use your Google account for quick signup)
3. Verify your email

### 2. Create Email Service
1. In EmailJS dashboard, click "Add New Service"
2. Choose your email provider (Gmail recommended):
   - Select "Gmail"
   - Click "Connect Account"
   - Allow EmailJS to send emails from your Gmail
3. Note your **Service ID** (e.g., `service_abc123`)

### 3. Create Email Template
1. Click "Email Templates" → "Create New Template"
2. Set Template Name: `event_registration_notification`
3. Replace template content with:

**Subject:**
```
New Registration for {{event_title}}
```

**Content (HTML):**
```html
<h2>🎉 New Event Registration!</h2>

<p>Great news! Someone has registered for your event.</p>

<h3>Event Details:</h3>
<ul>
  <li><strong>Event:</strong> {{event_title}}</li>
  <li><strong>Date:</strong> {{event_date}}</li>
  <li><strong>Time:</strong> {{event_time}}</li>
  <li><strong>Location:</strong> {{event_location}}</li>
</ul>

<h3>Registrant Information:</h3>
<ul>
  <li><strong>Name:</strong> {{from_name}}</li>
  <li><strong>Email:</strong> {{from_email}}</li>
  <li><strong>Phone:</strong> {{phone_number}}</li>
  <li><strong>Tickets:</strong> {{ticket_quantity}}</li>
  {{#additional_notes}}
  <li><strong>Notes:</strong> {{additional_notes}}</li>
  {{/additional_notes}}
</ul>

<p>You can contact them at <a href="mailto:{{from_email}}">{{from_email}}</a> or {{phone_number}}.</p>

<hr>
<p style="color: #666; font-size: 12px;">This is an automated notification from your event registration system.</p>
```

4. Click "Save"
5. Note your **Template ID** (e.g., `template_xyz789`)

### 4. Get Your Public Key
1. Go to "Account" → "General"
2. Find your **Public Key** (e.g., `ABCdefGHIjklMNO`)
3. Copy it

### 5. Install EmailJS in Your App

Run in terminal:
```bash
npm install @emailjs/browser
```

### 6. Update event-registration/[id].tsx

Replace the TODO section with this code:

```typescript
import emailjs from '@emailjs/browser';

// At the top of the file, after imports:
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';  // e.g., 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // e.g., 'template_xyz789'
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';   // e.g., 'ABCdefGHIjklMNO'

// Then in handleSubmitRegistration, replace the email section:
if (creatorEmail) {
  try {
    console.log('Sending email to:', creatorEmail);
    
    const emailParams = {
      to_email: creatorEmail,
      from_name: fullName.trim(),
      from_email: email.trim(),
      event_title: event?.title || 'Your Event',
      event_date: event?.date || '',
      event_time: event?.time || '',
      event_location: event?.location || '',
      ticket_quantity: ticketQuantity,
      phone_number: phoneNumber.trim(),
      additional_notes: additionalNotes.trim() || '',
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      emailParams,
      EMAILJS_PUBLIC_KEY
    );
    
    console.log('✅ Email sent successfully to:', creatorEmail);
  } catch (emailError) {
    console.error('❌ Error sending email:', emailError);
    // Don't fail registration if email fails
  }
}
```

### 7. Test It!

1. Create a test event with YOUR email as contact email
2. Register for the event
3. Check your inbox - you should receive the notification!

## Alternative: Use Environment Variables (Recommended)

Instead of hardcoding keys, use environment variables:

1. Create `.env` file (already exists):
```env
EMAILJS_SERVICE_ID=service_abc123
EMAILJS_TEMPLATE_ID=template_xyz789
EMAILJS_PUBLIC_KEY=ABCdefGHIjklMNO
```

2. Use in code:
```typescript
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || '';
```

## Troubleshooting

### Email not received?
- Check spam/junk folder
- Verify service is connected in EmailJS dashboard
- Check console for error messages
- Ensure creator email is valid in event data

### Rate Limits?
- Free tier: 200 emails/month
- Upgrade to paid plan if needed ($15/month for 1000 emails)

### Want to test without real emails?
Use a test email service like:
- https://mailtrap.io (fake SMTP for testing)
- Create a test Gmail account

## Complete Code Example

Here's the complete updated `handleSubmitRegistration` function:

```typescript
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = 'service_abc123';  // Replace with your IDs
const EMAILJS_TEMPLATE_ID = 'template_xyz789';
const EMAILJS_PUBLIC_KEY = 'ABCdefGHIjklMNO';

const handleSubmitRegistration = async () => {
  if (!validateForm()) {
    Alert.alert('Validation Error', 'Please correct the errors in the form');
    return;
  }

  if (!user?.id) {
    Alert.alert('Login Required', 'Please login to register for events');
    return;
  }

  setSubmitting(true);

  try {
    // Get event creator's email
    const { data: eventData, error: eventError } = await supabase
      .from('products_services')
      .select('description, user_id')
      .eq('id', eventId)
      .single();

    let creatorEmail = '';
    if (eventData && !eventError) {
      try {
        const parsedData = JSON.parse(eventData.description);
        creatorEmail = parsedData.contactEmail || '';
      } catch (parseError) {
        console.log('Could not parse event description');
      }
    }

    // Registration data
    const registrationData = {
      event_id: eventId,
      user_id: user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone_number: phoneNumber.trim(),
      ticket_quantity: parseInt(ticketQuantity),
      additional_notes: additionalNotes.trim() || null,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    };

    console.log('Registration data:', registrationData);

    // Send email to event creator
    if (creatorEmail) {
      try {
        const emailParams = {
          to_email: creatorEmail,
          from_name: fullName.trim(),
          from_email: email.trim(),
          event_title: event?.title || 'Your Event',
          event_date: event?.date || '',
          event_time: event?.time || '',
          event_location: event?.location || '',
          ticket_quantity: ticketQuantity.toString(),
          phone_number: phoneNumber.trim(),
          additional_notes: additionalNotes.trim() || 'None provided',
        };

        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          emailParams,
          EMAILJS_PUBLIC_KEY
        );

        console.log('✅ Email sent to:', creatorEmail);
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    }

    // Show success message
    const isWeb = typeof window !== 'undefined';
    
    if (isWeb) {
      window.alert(
        `Success! You've registered for ${event?.title}.\n\n` +
        `Confirmation has been sent to ${email}.` +
        (creatorEmail ? `\nThe event organizer has been notified at ${creatorEmail}.` : '') +
        `\nTickets: ${ticketQuantity}`
      );
      router.back();
    } else {
      Alert.alert(
        'Registration Successful!',
        `You've registered for ${event?.title}.\n\n` +
        `Confirmation has been sent to ${email}.` +
        (creatorEmail ? `\nThe event organizer has been notified at ${creatorEmail}.` : '') +
        `\nTickets: ${ticketQuantity}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  } catch (error: any) {
    console.error('Error:', error);
    Alert.alert('Error', 'Failed to submit registration. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

## Next Steps

1. ✅ Sign up for EmailJS
2. ✅ Create email service
3. ✅ Create email template
4. ✅ Install package: `npm install @emailjs/browser`
5. ✅ Update code with your IDs
6. ✅ Test with your own email
7. 🎉 Emails working!

Takes about 10 minutes total setup time!
