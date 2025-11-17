# Email Templates for Mentorship System

This document contains professional email templates for the Alumni Mentorship System.

## Implementation Options

### Option 1: Supabase Edge Functions (Recommended)
Use Supabase Edge Functions with Resend, SendGrid, or Mailgun for sending emails.

### Option 2: Third-party Service
Integrate with services like SendGrid, Mailgun, or AWS SES.

---

## Template 1: New Mentor Request Notification

**Trigger:** When a mentee submits a request to a mentor  
**Recipient:** Mentor  
**Subject:** New Mentorship Request from {mentee_name}

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4169E1 0%, #10B981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
    .button { display: inline-block; background: #4169E1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    .info-box { background: #F3F4F6; padding: 15px; border-left: 4px solid #4169E1; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 New Mentorship Request</h1>
    </div>
    <div class="content">
      <p>Dear {mentor_name},</p>
      
      <p>You have received a new mentorship request from <strong>{mentee_name}</strong>!</p>
      
      <div class="info-box">
        <strong>Request Details:</strong><br>
        <strong>From:</strong> {mentee_name}<br>
        <strong>Email:</strong> {mentee_email}<br>
        <strong>Phone:</strong> {mentee_phone}<br>
        <strong>Status:</strong> {mentee_status}<br>
        <strong>Areas of Interest:</strong> {selected_areas}<br>
      </div>
      
      <p><strong>Their Message:</strong></p>
      <p style="font-style: italic; padding: 15px; background: #FAFAFA; border-radius: 6px;">"{message}"</p>
      
      <p>Please log in to your mentor dashboard to review and respond to this request.</p>
      
      <center>
        <a href="{dashboard_url}" class="button">View Request in Dashboard</a>
      </center>
      
      <p>Thank you for being a mentor and helping shape the next generation!</p>
      
      <p>Best regards,<br>
      <strong>Akora Alumni Mentorship Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Akora Alumni Mentorship System.<br>
      If you have questions, please contact us at support@akora.edu</p>
    </div>
  </div>
</body>
</html>
```

---

## Template 2: Request Accepted

**Trigger:** When a mentor accepts a mentorship request  
**Recipient:** Mentee  
**Subject:** ✅ Your Mentorship Request Has Been Accepted!

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10B981 0%, #16A34A 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
    .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    .success-box { background: #D1FAE5; padding: 15px; border-left: 4px solid #10B981; margin: 20px 0; }
    .contact-box { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations!</h1>
      <p style="font-size: 18px; margin: 10px 0 0 0;">Your Mentorship Request Has Been Accepted</p>
    </div>
    <div class="content">
      <p>Dear {mentee_name},</p>
      
      <div class="success-box">
        <strong>Great news!</strong> {mentor_name} has accepted your mentorship request!
      </div>
      
      <p><strong>Mentor's Response:</strong></p>
      <p style="font-style: italic; padding: 15px; background: #FAFAFA; border-radius: 6px;">"{mentor_response}"</p>
      
      <div class="contact-box">
        <strong>📞 Mentor Contact Information:</strong><br><br>
        <strong>Name:</strong> {mentor_name}<br>
        <strong>Title:</strong> {mentor_title}<br>
        <strong>Company:</strong> {mentor_company}<br>
        <strong>Email:</strong> <a href="mailto:{mentor_email}">{mentor_email}</a><br>
        <strong>Phone:</strong> <a href="tel:{mentor_phone}">{mentor_phone}</a><br>
        {#if mentor_linkedin}<strong>LinkedIn:</strong> <a href="{mentor_linkedin}">View Profile</a><br>{/if}
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Reach out to your mentor via email or phone</li>
        <li>Schedule your first meeting</li>
        <li>Prepare questions and goals for your mentorship</li>
        <li>Mark the session as completed after your mentorship concludes</li>
      </ol>
      
      <center>
        <a href="{my_requests_url}" class="button">View My Requests</a>
      </center>
      
      <p>We wish you a productive and enriching mentorship experience!</p>
      
      <p>Best regards,<br>
      <strong>Akora Alumni Mentorship Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Akora Alumni Mentorship System.<br>
      If you have questions, please contact us at support@akora.edu</p>
    </div>
  </div>
</body>
</html>
```

---

## Template 3: Request Declined

**Trigger:** When a mentor declines a mentorship request  
**Recipient:** Mentee  
**Subject:** Update on Your Mentorship Request

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
    .button { display: inline-block; background: #4169E1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    .info-box { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Update on Your Mentorship Request</h1>
    </div>
    <div class="content">
      <p>Dear {mentee_name},</p>
      
      <p>Thank you for your interest in connecting with {mentor_name} for mentorship.</p>
      
      <div class="info-box">
        Unfortunately, {mentor_name} is unable to accept your mentorship request at this time.
      </div>
      
      <p><strong>Mentor's Message:</strong></p>
      <p style="font-style: italic; padding: 15px; background: #FAFAFA; border-radius: 6px;">"{mentor_response}"</p>
      
      <p><strong>Don't be discouraged!</strong> Here are some next steps:</p>
      <ul>
        <li>Browse other mentors in our directory who match your interests</li>
        <li>Consider mentors with similar expertise but different availability</li>
        <li>Reach out to multiple mentors to increase your chances</li>
        <li>Update your request message to be more specific about your goals</li>
      </ul>
      
      <center>
        <a href="{mentors_directory_url}" class="button">Browse Other Mentors</a>
      </center>
      
      <p>Remember, finding the right mentor is a journey. Keep trying!</p>
      
      <p>Best regards,<br>
      <strong>Akora Alumni Mentorship Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Akora Alumni Mentorship System.<br>
      If you have questions, please contact us at support@akora.edu</p>
    </div>
  </div>
</body>
</html>
```

---

## Template 4: Mentorship Completed

**Trigger:** When a mentee marks a mentorship as completed  
**Recipient:** Mentor  
**Subject:** 🎓 Mentorship Session Completed - Thank You!

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
    .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    .celebration { background: #EDE9FE; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Thank You for Mentoring!</h1>
    </div>
    <div class="content">
      <p>Dear {mentor_name},</p>
      
      <div class="celebration">
        <h2 style="color: #8B5CF6; margin: 0 0 10px 0;">Mentorship Completed!</h2>
        <p style="margin: 0;">Your mentee, <strong>{mentee_name}</strong>, has marked your mentorship session as completed.</p>
      </div>
      
      <p>Thank you for taking the time to guide and support {mentee_name}. Your contribution makes a real difference in shaping the next generation of professionals.</p>
      
      <p><strong>Session Details:</strong></p>
      <ul>
        <li><strong>Mentee:</strong> {mentee_name}</li>
        <li><strong>Duration:</strong> {session_duration}</li>
        <li><strong>Areas Covered:</strong> {expertise_areas}</li>
      </ul>
      
      <p>Your mentee may leave a rating and review about their experience. This feedback helps us improve the mentorship program and helps future mentees find the right mentor.</p>
      
      <center>
        <a href="{dashboard_url}" class="button">View Dashboard</a>
      </center>
      
      <p>We hope you'll continue to share your expertise with more mentees in the future!</p>
      
      <p>With gratitude,<br>
      <strong>Akora Alumni Mentorship Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Akora Alumni Mentorship System.<br>
      If you have questions, please contact us at support@akora.edu</p>
    </div>
  </div>
</body>
</html>
```

---

## Template 5: Mentor Application Approved

**Trigger:** When admin approves a mentor application  
**Recipient:** Applicant  
**Subject:** 🎉 Congratulations! Your Mentor Application Has Been Approved

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
    .button { display: inline-block; background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    .welcome-box { background: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .steps { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="font-size: 32px; margin: 0;">🎉 Welcome to the Team!</h1>
      <p style="font-size: 18px; margin: 10px 0 0 0;">You're Now an Official Akora Mentor</p>
    </div>
    <div class="content">
      <p>Dear {applicant_name},</p>
      
      <div class="welcome-box">
        <h2 style="color: #059669; margin: 0 0 10px 0;">Congratulations!</h2>
        <p style="margin: 0;">Your application to become an Akora Alumni Mentor has been <strong>approved</strong>! We're excited to have you join our mentorship community.</p>
      </div>
      
      <p>As an approved mentor, you can now:</p>
      <ul>
        <li>✅ Appear in the mentors directory for students to discover</li>
        <li>✅ Receive mentorship requests from students and young professionals</li>
        <li>✅ Accept or decline requests based on your availability</li>
        <li>✅ Track your mentorship activity through your dashboard</li>
        <li>✅ Build a profile with ratings and reviews</li>
      </ul>
      
      <div class="steps">
        <strong>📋 Next Steps:</strong>
        <ol>
          <li>Log in to access your mentor dashboard</li>
          <li>Review and update your mentor profile if needed</li>
          <li>Set your availability and preferred meeting formats</li>
          <li>Wait for mentorship requests to arrive</li>
          <li>Respond promptly to requests (within 48 hours recommended)</li>
        </ol>
      </div>
      
      <center>
        <a href="{dashboard_url}" class="button">Go to Mentor Dashboard</a>
      </center>
      
      <p><strong>Mentorship Guidelines:</strong></p>
      <ul>
        <li>Respond to requests within 48 hours when possible</li>
        <li>Be professional and respectful in all communications</li>
        <li>Provide constructive feedback and guidance</li>
        <li>Maintain confidentiality of mentee information</li>
        <li>Report any issues to the admin team</li>
      </ul>
      
      <p>Thank you for volunteering your time and expertise to help the next generation succeed!</p>
      
      <p>Best regards,<br>
      <strong>Akora Alumni Mentorship Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Akora Alumni Mentorship System.<br>
      If you have questions, please contact us at support@akora.edu</p>
    </div>
  </div>
</body>
</html>
```

---

## Template 6: Mentor Application Rejected

**Trigger:** When admin rejects a mentor application  
**Recipient:** Applicant  
**Subject:** Update on Your Mentor Application

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
    .button { display: inline-block; background: #4169E1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    .info-box { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Mentor Application Update</h1>
    </div>
    <div class="content">
      <p>Dear {applicant_name},</p>
      
      <p>Thank you for your interest in becoming an Akora Alumni Mentor and for taking the time to submit your application.</p>
      
      <div class="info-box">
        After careful review, we are unable to approve your mentor application at this time.
      </div>
      
      <p>This decision may be due to various factors, including:</p>
      <ul>
        <li>Current capacity of mentors in your expertise area</li>
        <li>Alignment with program requirements</li>
        <li>Available time commitments needed</li>
      </ul>
      
      <p><strong>You're still welcome to:</strong></p>
      <ul>
        <li>Participate in alumni events and networking opportunities</li>
        <li>Connect with current mentors in the community</li>
        <li>Reapply in the future (we recommend waiting 6 months)</li>
        <li>Explore other ways to give back to the community</li>
      </ul>
      
      <p>If you have questions about this decision or would like feedback on your application, please don't hesitate to contact our admin team.</p>
      
      <center>
        <a href="{contact_url}" class="button">Contact Admin Team</a>
      </center>
      
      <p>We appreciate your interest in supporting our students and alumni community.</p>
      
      <p>Best regards,<br>
      <strong>Akora Alumni Mentorship Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Akora Alumni Mentorship System.<br>
      If you have questions, please contact us at support@akora.edu</p>
    </div>
  </div>
</body>
</html>
```

---

## Template 7: Request for Rating (Follow-up)

**Trigger:** 24 hours after mentorship marked as completed (if no rating yet)  
**Recipient:** Mentee  
**Subject:** How was your mentorship experience with {mentor_name}?

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
    .button { display: inline-block; background: #F59E0B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6B7280; font-size: 14px; }
    .stars { font-size: 32px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⭐ Rate Your Mentorship Experience</h1>
    </div>
    <div class="content">
      <p>Hi {mentee_name},</p>
      
      <p>We hope you had a great mentorship experience with <strong>{mentor_name}</strong>!</p>
      
      <div class="stars">⭐⭐⭐⭐⭐</div>
      
      <p>Your feedback is valuable and helps us:</p>
      <ul>
        <li>Recognize excellent mentors</li>
        <li>Help future mentees choose the right mentor</li>
        <li>Improve our mentorship program</li>
        <li>Build a stronger alumni community</li>
      </ul>
      
      <p>It only takes 1 minute to rate your experience!</p>
      
      <center>
        <a href="{rating_url}" class="button">Leave a Rating & Review</a>
      </center>
      
      <p style="font-size: 14px; color: #6B7280;">You can rate from 1-5 stars and optionally add a written review.</p>
      
      <p>Thank you for participating in our mentorship program!</p>
      
      <p>Best regards,<br>
      <strong>Akora Alumni Mentorship Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated reminder. If you've already left a rating, please ignore this email.<br>
      Questions? Contact us at support@akora.edu</p>
    </div>
  </div>
</body>
</html>
```

---

## Implementation Guide

### Using Supabase Edge Functions

1. **Create Edge Function:**
```bash
supabase functions new send-email
```

2. **Example Edge Function (Deno):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { to, subject, template, data } = await req.json()
  
  // Render template with data
  const html = renderTemplate(template, data)
  
  // Send email via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Akora Mentorship <mentorship@akora.edu>',
      to: [to],
      subject: subject,
      html: html
    })
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

3. **Call from Frontend:**
```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'mentor@example.com',
    subject: 'New Mentorship Request',
    template: 'new-request',
    data: {
      mentor_name: 'John Doe',
      mentee_name: 'Jane Smith',
      // ... other variables
    }
  }
})
```

### Environment Variables Needed
- `RESEND_API_KEY` or `SENDGRID_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_URL` (for links in emails)

---

## Testing Checklist

- [ ] Test all template variables render correctly
- [ ] Verify email delivery in development
- [ ] Check mobile responsiveness
- [ ] Test all links work correctly
- [ ] Verify spam score (use mail-tester.com)
- [ ] Test unsubscribe functionality (if added)
- [ ] Check rendering in Gmail, Outlook, Apple Mail
- [ ] Verify sender reputation
