# Job Approval System Setup Guide

## Overview
This system allows admins to review and approve/decline job postings before they go live. Job creators receive email notifications about the approval status.

## Database Setup

### 1. Run the Migration
Execute the SQL migration file in your Supabase SQL Editor:

```bash
ADD_JOB_APPROVAL_SYSTEM.sql
```

This creates:
- `job_approval_notifications` table - Tracks approval notifications
- `admin_roles` table - Defines who can approve jobs
- Approval columns in `products_services` table
- Database functions for approval workflow
- Triggers for automatic notifications

### 2. Create Admin Users

Add admin users who can approve jobs:

```sql
-- Replace 'USER_ID_HERE' with actual user IDs
INSERT INTO admin_roles (user_id, role, can_approve_jobs, receive_job_notifications, notification_email)
VALUES 
  ('USER_ID_HERE', 'super_admin', true, true, 'admin@example.com'),
  ('USER_ID_HERE', 'approver', true, true, 'approver@example.com');
```

**Admin Roles:**
- `super_admin` - Can manage other admins and approve jobs
- `approver` - Can approve jobs only
- `moderator` - Can moderate content (future use)

### 3. Find User IDs

To get user IDs for admins:

```sql
-- Get user IDs by email
SELECT id, email FROM auth.users WHERE email IN ('admin@example.com', 'approver@example.com');
```

## Features

### For Job Creators

1. **Submit Job** - Jobs are submitted with status `pending`
2. **Email Required** - Email field captures creator's contact for notifications
3. **Automatic Notification** - Admins are notified immediately when job is posted
4. **Status Updates** - Creators receive push notifications and emails when:
   - Job is approved
   - Job is declined (with reason)

### For Admins

1. **Admin Dashboard** - Access via `/admin/job-approvals`
2. **View Pending Jobs** - See all jobs waiting for review
3. **Job Details** - View full job information and all uploaded images
4. **Approve/Decline** - Take action with optional notes
5. **Notification Badge** - See count of pending approvals

## Using the System

### Admin Approval Workflow

1. **Access Admin Panel**
   ```typescript
   router.push('/admin/job-approvals');
   ```

2. **Review Job**
   - View all job details
   - Check uploaded images
   - See creator information

3. **Take Action**
   - Click "Approve" - Job goes live immediately
   - Click "Decline" - Job is rejected with optional reason
   - Add notes to explain decision

4. **Automatic Notifications**
   - Creator receives push notification
   - Email sent to creator's email address
   - Notification includes decision and any notes

### API Functions

#### Get Pending Jobs
```typescript
const { data, error } = await supabase
  .rpc('get_pending_jobs', { p_admin_id: adminUserId });
```

#### Approve Job
```typescript
const { data, error } = await supabase.rpc('approve_job', {
  p_job_id: jobId,
  p_admin_id: adminUserId,
  p_notes: 'Looks good!'
});
```

#### Decline Job
```typescript
const { data, error } = await supabase.rpc('decline_job', {
  p_job_id: jobId,
  p_admin_id: adminUserId,
  p_notes: 'Missing required information'
});
```

#### Get Admin Notification Count
```typescript
const { data: count, error } = await supabase
  .rpc('get_admin_notification_count', { p_admin_id: adminUserId });
```

## Email Configuration

The system logs email notifications that need to be sent. To actually send emails, you'll need to:

### Option 1: Supabase Edge Functions

Create an edge function to send emails:

```typescript
// supabase/functions/send-job-approval-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { jobId, status, creatorEmail, jobTitle, notes } = await req.json()
  
  // Use your email service (SendGrid, Resend, etc.)
  const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: creatorEmail }],
        subject: status === 'approved' ? 'Job Approved!' : 'Job Update',
      }],
      from: { email: 'noreply@yourapp.com' },
      content: [{
        type: 'text/html',
        value: generateEmailHTML(status, jobTitle, notes),
      }],
    }),
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Option 2: Database Trigger

Set up a database trigger to call your email service when notifications are created.

## Testing

### 1. Create Test Admin
```sql
-- Get your test user ID
SELECT id FROM auth.users WHERE email = 'your-test-email@example.com';

-- Add as admin
INSERT INTO admin_roles (user_id, role, can_approve_jobs, receive_job_notifications)
VALUES ('YOUR_USER_ID', 'approver', true, true);
```

### 2. Test Job Submission
1. Log in as regular user
2. Create a job posting with all details
3. Verify job has `approval_status = 'pending'`

### 3. Test Admin Approval
1. Log in as admin user
2. Navigate to `/admin/job-approvals`
3. See the pending job
4. Approve or decline with notes

### 4. Verify Notifications
Check `notification_history` table:
```sql
SELECT * FROM notification_history 
WHERE notification_type IN ('job_approved', 'job_declined', 'new_job_pending')
ORDER BY sent_at DESC;
```

## Monitoring

### Check Pending Jobs Count
```sql
SELECT COUNT(*) FROM products_services 
WHERE approval_status = 'pending';
```

### View Approval History
```sql
SELECT 
  id,
  title,
  approval_status,
  approved_by,
  approved_at,
  approval_notes
FROM products_services
WHERE approval_status IN ('approved', 'declined')
ORDER BY approved_at DESC
LIMIT 20;
```

### Admin Activity
```sql
SELECT 
  ar.user_id,
  au.email,
  COUNT(*) as approvals_count
FROM products_services ps
JOIN admin_roles ar ON ps.approved_by = ar.user_id
JOIN auth.users au ON ar.user_id = au.id
WHERE ps.approved_at > NOW() - INTERVAL '7 days'
GROUP BY ar.user_id, au.email;
```

## Troubleshooting

### Jobs Not Appearing for Approval
- Check if user has admin role: `SELECT * FROM admin_roles WHERE user_id = 'USER_ID'`
- Verify `can_approve_jobs = true`

### Notifications Not Sending
- Check `notification_history` table for errors
- Verify push notification tokens are registered
- Check email configuration

### Permission Errors
- Ensure RLS policies are enabled
- Verify user is in `admin_roles` table
- Check function permissions with `GRANT EXECUTE`

## Security Notes

- Only users in `admin_roles` table can approve jobs
- RLS policies prevent unauthorized access
- All admin actions are logged with user ID and timestamp
- Job creators cannot see who approved/declined their jobs (only receive notification)

## Future Enhancements

- [ ] Bulk approval actions
- [ ] Admin notes history
- [ ] Auto-approval for trusted users
- [ ] Approval workflow with multiple reviewers
- [ ] Analytics dashboard for approval metrics
