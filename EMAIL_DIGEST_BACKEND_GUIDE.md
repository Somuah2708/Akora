# Email Digest Backend Implementation Guide

## Overview
This guide covers setting up the backend email sending infrastructure for the Akora email digest system.

---

## Option 1: Supabase Edge Function (Recommended)

### Step 1: Create Edge Function

```bash
# In your project root
supabase functions new send-weekly-digest
```

### Step 2: Implement Edge Function

Create `supabase/functions/send-weekly-digest/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')! // or SendGrid, AWS SES

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    const { digestType } = await req.json()
    
    // Get users who should receive digest
    const { data: users, error: usersError } = await supabase
      .rpc('get_users_for_digest', { p_digest_type: digestType })
    
    if (usersError) throw usersError
    
    console.log(`📧 Sending ${digestType} to ${users?.length || 0} users`)
    
    let sentCount = 0
    let failedCount = 0
    
    for (const user of users || []) {
      try {
        // Get digest data
        const digestFunction = digestType === 'mentor_weekly' 
          ? 'get_mentor_weekly_digest' 
          : 'get_mentee_weekly_digest'
        
        const { data: digestData, error: digestError } = await supabase
          .rpc(digestFunction, { 
            [digestType === 'mentor_weekly' ? 'mentor_user_id' : 'mentee_user_id']: user.user_id 
          })
        
        if (digestError) throw digestError
        
        if (!digestData) {
          console.log(`⚠️ No data for user ${user.email}`)
          continue
        }
        
        // Send email
        await sendDigestEmail(user.email, user.full_name, digestType, digestData)
        
        // Log success
        await supabase.rpc('log_digest_sent', {
          p_user_id: user.user_id,
          p_digest_type: digestType,
          p_email_to: user.email,
          p_status: 'sent',
          p_content_summary: digestData
        })
        
        sentCount++
        console.log(`✅ Sent to ${user.email}`)
      } catch (error) {
        console.error(`❌ Failed for ${user.email}:`, error)
        
        // Log failure
        await supabase.rpc('log_digest_sent', {
          p_user_id: user.user_id,
          p_digest_type: digestType,
          p_email_to: user.email,
          p_status: 'failed',
          p_error_message: error.message
        })
        
        failedCount++
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount,
        total: users?.length || 0
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function sendDigestEmail(
  to: string,
  name: string,
  digestType: string,
  data: any
) {
  const htmlContent = digestType === 'mentor_weekly'
    ? generateMentorDigestHtml(name, data)
    : generateMenteeDigestHtml(name, data)
  
  // Using Resend (https://resend.com)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Akora Alumni Network <noreply@akora.app>',
      to: [to],
      subject: digestType === 'mentor_weekly' 
        ? `📊 Your Weekly Mentor Digest - ${new Date().toLocaleDateString()}`
        : `💡 Your Weekly Mentorship Updates - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Email send failed: ${error}`)
  }
}

function generateMentorDigestHtml(name: string, data: any): string {
  const { mentor_info, pending_requests, week_stats } = data
  
  const requestsHtml = pending_requests.map((req: any) => `
    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #4169E1;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">
        ${req.mentee_name}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
        ${req.message.substring(0, 150)}${req.message.length > 150 ? '...' : ''}
      </p>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        Requested: ${new Date(req.requested_at).toLocaleDateString()}
      </p>
    </div>
  `).join('')
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4169E1 0%, #10B981 100%); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">📊 Weekly Mentor Digest</h1>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
            ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #1f2937; margin: 0 0 24px 0;">
            Hi ${name}! 👋
          </p>
          
          <!-- Stats -->
          <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e40af;">
              📈 This Week's Summary
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #4169E1;">
                  ${week_stats.new_requests || 0}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
                  New Requests
                </p>
              </div>
              <div>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: #10B981;">
                  ${week_stats.new_favorites || 0}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">
                  New Favorites
                </p>
              </div>
            </div>
          </div>
          
          <!-- Pending Requests -->
          ${pending_requests.length > 0 ? `
            <div style="margin-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">
                ⏳ Pending Requests (${pending_requests.length})
              </h2>
              ${requestsHtml}
            </div>
          ` : `
            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <p style="margin: 0; color: #6b7280;">
                ✅ No pending requests - You're all caught up!
              </p>
            </div>
          `}
          
          <!-- CTA -->
          <div style="text-align: center; padding: 24px 0;">
            <a href="https://akora.app/mentor-dashboard" 
               style="display: inline-block; background: #10B981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View Dashboard →
            </a>
          </div>
          
          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
              You're receiving this because you're subscribed to weekly mentor digests.<br>
              <a href="https://akora.app/settings/notification-settings" style="color: #4169E1;">Manage preferences</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateMenteeDigestHtml(name: string, data: any): string {
  const { user_info, my_requests, recommendations } = data
  
  const requestsHtml = my_requests.map((req: any) => `
    <div style="background: #f9fafb; padding: 14px; border-radius: 8px; margin-bottom: 10px;">
      <p style="margin: 0 0 4px 0; font-weight: 600; color: #1f2937;">
        ${req.mentor_name} - ${req.mentor_title}
      </p>
      <p style="margin: 0; font-size: 13px; color: ${
        req.status === 'accepted' ? '#10B981' : 
        req.status === 'pending' ? '#F59E0B' : '#EF4444'
      };">
        Status: ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}
      </p>
    </div>
  `).join('')
  
  const recommendationsHtml = recommendations.map((mentor: any) => `
    <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #1f2937; font-size: 15px;">
        ${mentor.full_name}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">
        ${mentor.current_title}${mentor.company ? ' at ' + mentor.company : ''}
      </p>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${mentor.expertise_areas.slice(0, 3).map((area: string) => 
          `<span style="background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 12px; font-size: 11px;">${area}</span>`
        ).join('')}
      </div>
    </div>
  `).join('')
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">💡 Your Weekly Updates</h1>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
            ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 24px;">
          <p style="font-size: 16px; color: #1f2937; margin: 0 0 24px 0;">
            Hi ${name}! 👋
          </p>
          
          <!-- My Requests -->
          ${my_requests.length > 0 ? `
            <div style="margin-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">
                📋 Your Recent Requests
              </h2>
              ${requestsHtml}
            </div>
          ` : ''}
          
          <!-- Recommendations -->
          ${recommendations.length > 0 ? `
            <div style="margin-bottom: 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">
                ⭐ Recommended Mentors
              </h2>
              ${recommendationsHtml}
            </div>
          ` : ''}
          
          <!-- CTA -->
          <div style="text-align: center; padding: 24px 0;">
            <a href="https://akora.app/education" 
               style="display: inline-block; background: #6366F1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Browse Mentors →
            </a>
          </div>
          
          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
              You're receiving this because you're subscribed to weekly updates.<br>
              <a href="https://akora.app/settings/notification-settings" style="color: #6366F1;">Manage preferences</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}
```

### Step 3: Deploy Edge Function

```bash
supabase functions deploy send-weekly-digest
```

### Step 4: Set Environment Variables

In Supabase Dashboard > Edge Functions > Configuration:
- `RESEND_API_KEY` - Your Resend API key (or SendGrid, AWS SES)

### Step 5: Set Up Cron Job

Use Supabase Cron or external service (GitHub Actions, cron-job.org):

```yaml
# .github/workflows/weekly-digest.yml
name: Send Weekly Digest
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:  # Manual trigger

jobs:
  send-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Send Mentor Digest
        run: |
          curl -X POST "${{ secrets.SUPABASE_FUNCTION_URL }}/send-weekly-digest" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"digestType": "mentor_weekly"}'
      
      - name: Send Mentee Digest
        run: |
          curl -X POST "${{ secrets.SUPABASE_FUNCTION_URL }}/send-weekly-digest" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"digestType": "mentee_weekly"}'
```

---

## Option 2: External Service (Zapier, Make.com)

1. Create webhook endpoint in your service
2. Schedule weekly trigger
3. Call Supabase RPC functions to get users and data
4. Send emails via Gmail, Outlook, or email service
5. Log results back to Supabase

---

## Testing

### Test Digest Generation

```sql
-- Test mentor digest
SELECT get_mentor_weekly_digest('YOUR_MENTOR_USER_ID');

-- Test mentee digest
SELECT get_mentee_weekly_digest('YOUR_USER_ID');
```

### Test Edge Function Locally

```bash
supabase functions serve send-weekly-digest
```

```bash
curl -X POST http://localhost:54321/functions/v1/send-weekly-digest \
  -H "Content-Type: application/json" \
  -d '{"digestType": "mentor_weekly"}'
```

---

## Email Service Providers

### Resend (Recommended)
- Free tier: 100 emails/day
- Best for transactional emails
- Simple API
- https://resend.com

### SendGrid
- Free tier: 100 emails/day
- Enterprise features
- https://sendgrid.com

### AWS SES
- Pay as you go ($0.10 per 1000 emails)
- Requires AWS account
- Most cost-effective at scale

---

## Monitoring

### Check Digest Logs

```sql
-- Recent digest activity
SELECT 
  u.full_name,
  edl.digest_type,
  edl.status,
  edl.sent_at,
  edl.error_message
FROM email_digest_logs edl
JOIN profiles u ON u.id = edl.user_id
ORDER BY edl.sent_at DESC
LIMIT 50;

-- Success rate
SELECT 
  digest_type,
  status,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER (PARTITION BY digest_type) * 100, 2) as percentage
FROM email_digest_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY digest_type, status
ORDER BY digest_type, status;
```

---

## Troubleshooting

### Issue: No users receiving digest
- Check `email_digest_subscriptions` table has records
- Verify `is_enabled = true` and `last_sent_at` is old enough
- Run: `SELECT * FROM get_users_for_digest('mentor_weekly');`

### Issue: Emails not sending
- Verify API key is correct
- Check email service quotas
- Review Edge Function logs in Supabase Dashboard

### Issue: Wrong data in emails
- Test digest functions directly in SQL
- Check mentor/mentee data exists
- Verify date ranges in queries

---

## Next Steps

1. Run `ADD_EMAIL_DIGEST.sql` in Supabase
2. Set up email service account (Resend/SendGrid)
3. Deploy Edge Function
4. Configure cron schedule
5. Test with your account first
6. Monitor logs for the first week
