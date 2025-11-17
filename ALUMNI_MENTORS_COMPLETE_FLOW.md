# 🎓 Alumni Mentors System - Complete Flow Guide

## 📋 Overview

The Alumni Mentors system allows:
- **Alumni** to volunteer as mentors
- **Anyone** (students, professionals, career changers) to request mentorship
- **Mentors** to accept/decline requests through their dashboard
- **Mentees** to view their request status and mentor contact info when accepted

---

## 🔄 Complete User Flows

### Flow 1: Volunteer as a Mentor (Alumni)

1. **Navigate**: Help → Schools/Scholarships → Alumni Mentors tab
2. **Click**: Green "Volunteer" button
3. **Fill Form**:
   - Personal Info (name, email, phone)
   - Professional Background (title, company, industry, years)
   - Education (graduation year, degree)
   - Mentorship Details (expertise, availability, formats, days)
   - Motivation (why mentor, what you offer)
4. **Submit**: Application goes to `mentor_applications` table with status "pending"
5. **Admin Reviews**: Admin approves → creates entry in `alumni_mentors` table with status "approved"
6. **Result**: Mentor appears in public mentors list

**Database**: `mentor_applications` → (admin approval) → `alumni_mentors`

---

### Flow 2: Request Mentorship (Anyone)

1. **Navigate**: Help → Schools/Scholarships → Alumni Mentors tab
2. **Browse**: See all approved mentors with their expertise
3. **Click**: Any mentor card to view full profile
4. **Review**: Mentor's bio, expertise, availability, philosophy
5. **Click**: "Request Mentorship (Free)" button
6. **Fill Form**:
   - Your name
   - Email
   - Phone (optional)
   - Current Status (Student, Young Professional, Career Changer, etc.)
   - Areas of interest (select from mentor's expertise)
   - Message explaining why you're reaching out
7. **Submit**: Request saved to `mentor_requests` table with status "pending"
8. **Wait**: Mentor receives notification and reviews request

**Database**: `mentor_requests` (status: pending)

---

### Flow 3: Mentor Reviews Requests (Mentor Dashboard)

1. **Navigate**: Help → Schools/Scholarships → Alumni Mentors tab
2. **Click**: Purple mentor dashboard icon (Users icon)
3. **System Checks**: Verifies user's email matches an approved mentor
4. **Dashboard Shows**:
   - Tabs: Pending / Accepted / All
   - Request cards with mentee info
   - Each card shows:
     - Mentee name and status
     - Areas of interest
     - Their message
     - Request date

5. **Mentor Actions**:
   
   **Option A: Accept Request**
   - Click "Respond to Request"
   - (Optional) Add personal message
   - Click "✓ Accept"
   - **Result**:
     - Request status → "accepted"
     - Mentee receives mentor's contact info (email, phone)
     - Mentor response saved
   
   **Option B: Decline Request**
   - Click "Respond to Request"
   - (Optional) Add reason
   - Click "Decline"
   - Confirm decline
   - **Result**:
     - Request status → "declined"
     - Mentee sees declined status with reason (if provided)

6. **After Acceptance**:
   - Request moves to "Accepted" tab
   - Mentee contact info visible to mentor
   - Can mark as "Completed" when mentorship ends

**Database**: Updates `mentor_requests.status` to "accepted" or "declined"

---

### Flow 4: Mentee Checks Request Status

1. **Navigate**: Help → Schools/Scholarships → Alumni Mentors tab
2. **Click**: Blue "My Requests" button
3. **See All Requests**:
   
   **If Pending**:
   - Yellow badge: "pending"
   - Message: "Waiting for mentor response..."
   - No contact info yet
   
   **If Accepted** ✅:
   - Green badge: "accepted"
   - Shows mentor's response message
   - **Reveals mentor contact info**:
     - Email (clickable to open mail app)
     - Phone (clickable to call)
   - Green highlighted box with contact details
   
   **If Declined**:
   - Red badge: "declined"
   - Shows mentor's reason (if provided)
   - Can request another mentor
   
   **If Completed**:
   - Purple badge: "completed"
   - Mentorship successfully finished

**Database**: Reads from `mentor_requests` joined with `alumni_mentors`

---

## 🗂️ Database Tables

### 1. `alumni_mentors` (Approved Mentors)
```sql
Columns:
- id (UUID)
- full_name, email, phone
- current_title, company, industry
- graduation_year, degree
- expertise_areas (array)
- available_hours, meeting_formats, preferred_days
- short_bio, detailed_bio, mentorship_philosophy
- status (pending/approved/rejected/inactive)
- application_type (admin_added/self_applied)
```

### 2. `mentor_applications` (Volunteer Applications)
```sql
Columns:
- id (UUID)
- user_id (who applied)
- full_name, email, phone
- current_title, company, industry
- graduation_year, degree
- expertise_areas (array)
- why_mentor, what_offer
- status (pending/approved/rejected)
```

### 3. `mentor_requests` (Mentorship Requests)
```sql
Columns:
- id (UUID)
- mentor_id (which mentor)
- mentee_id (who's requesting)
- mentee_name, mentee_email, mentee_phone
- current_status (Student, Professional, etc.)
- areas_of_interest (array)
- message
- status (pending/accepted/declined/completed)
- mentor_response
```

---

## 🔐 Security (RLS Policies)

### alumni_mentors:
- ✅ **Anyone** can view approved mentors
- ✅ **Admins** can view all, insert, update, delete

### mentor_applications:
- ✅ **Authenticated users** can submit applications
- ✅ **Users** can view their own applications
- ✅ **Admins** can view and update all

### mentor_requests:
- ✅ **Authenticated users** can submit requests
- ✅ **Users** can view their own requests
- ✅ **Mentors** can view requests sent to them (matches email)
- ✅ **Mentors** can update their requests (accept/decline)
- ✅ **Admins** can view and update all

---

## 🚀 Setup Instructions

### Step 1: Run Database Setup
In Supabase SQL Editor, run:
```sql
-- Drop and recreate (if updating structure)
DROP TABLE IF EXISTS public.mentor_requests CASCADE;
DROP TABLE IF EXISTS public.mentor_applications CASCADE;
DROP TABLE IF EXISTS public.alumni_mentors CASCADE;
```

Then run the full `CREATE_ALUMNI_MENTORS_SYSTEM.sql` script.

### Step 2: Add Mentor Dashboard Policies
Run `ADD_MENTOR_DASHBOARD_POLICIES.sql` to enable mentors to view and update their requests.

### Step 3: Test the System

**Test as Mentee:**
1. Go to Alumni Mentors tab
2. Click Dr. Kwame Mensah (sample mentor)
3. Fill request form
4. Submit
5. Click "My Requests" → should see pending request

**Test as Mentor:**
1. Sign in with email that matches a mentor (e.g., kwame.mensah@example.com)
2. Go to Alumni Mentors tab
3. Click purple mentor dashboard icon
4. Should see pending request
5. Accept it
6. Check "My Requests" as mentee → should see accepted with contact info

---

## 📱 UI Components

### Navigation Points:
1. **Alumni Mentors Tab**: Help → Schools/Scholarships → Alumni Mentors
2. **Volunteer Button**: Green button with "+" icon
3. **My Requests Button**: Blue button with FileText icon
4. **Mentor Dashboard Button**: Purple button with Users icon

### Screens:
1. `/education` - Main education screen with Alumni Mentors tab
2. `/education/volunteer-mentor` - Volunteer application form
3. `/education/mentor/[id]` - Individual mentor profile with request form
4. `/mentor-dashboard` - Mentor's dashboard to manage requests
5. `/my-mentorship-requests` - User's view of their sent requests

---

## 🎨 Status Colors

| Status | Color | Badge |
|--------|-------|-------|
| Pending | Yellow (#fef3c7) | ⏳ |
| Accepted | Green (#d1fae5) | ✅ |
| Declined | Red (#fee2e2) | ❌ |
| Completed | Purple (#e0e7ff) | ✓ |

---

## 📊 Admin Tasks

### Approve Volunteer Applications:
```sql
-- View pending applications
SELECT * FROM mentor_applications WHERE status = 'pending';

-- Approve an application (create mentor entry)
INSERT INTO alumni_mentors (
  full_name, email, phone, current_title, company,
  graduation_year, degree, expertise_areas, available_hours,
  meeting_formats, short_bio, status, application_type
)
SELECT 
  full_name, email, phone, current_title, company,
  graduation_year, degree, expertise_areas, available_hours,
  meeting_formats, 
  why_mentor as short_bio,
  'approved' as status,
  'self_applied' as application_type
FROM mentor_applications
WHERE id = 'application-id-here';

-- Update application status
UPDATE mentor_applications
SET status = 'approved', reviewed_by = 'admin-user-id'
WHERE id = 'application-id-here';
```

### View All Requests:
```sql
SELECT 
  mr.mentee_name,
  mr.mentee_email,
  mr.status,
  am.full_name as mentor_name,
  mr.created_at
FROM mentor_requests mr
JOIN alumni_mentors am ON mr.mentor_id = am.id
ORDER BY mr.created_at DESC;
```

### Manually Add a Mentor:
```sql
INSERT INTO alumni_mentors (
  full_name, email, current_title, company, industry,
  expertise_areas, available_hours, meeting_formats,
  short_bio, status, application_type
) VALUES (
  'Jane Doe',
  'jane@example.com',
  'Senior Engineer at Tech Co',
  'Tech Co',
  'Technology',
  ARRAY['Career Guidance', 'Technical Skills'],
  '5 hours/month',
  ARRAY['Video Call', 'Email'],
  'Experienced engineer passionate about mentoring',
  'approved',
  'admin_added'
);
```

---

## ✅ Testing Checklist

- [ ] Run database setup scripts successfully
- [ ] Sample mentors (Dr. Kwame Mensah, Ama Asante) appear in mentors tab
- [ ] Volunteer button works, form submits successfully
- [ ] Can view individual mentor profile
- [ ] Can submit mentorship request from profile page
- [ ] "My Requests" button shows submitted requests with pending status
- [ ] Mentor dashboard icon works (if user is a mentor)
- [ ] Mentor can see requests in dashboard
- [ ] Mentor can accept request
- [ ] Mentee sees accepted request with contact info revealed
- [ ] Mentor can decline request
- [ ] Mentee sees declined request with reason
- [ ] Can mark request as completed

---

## 🎯 Key Features

### For Mentees (Anyone):
- ✅ Browse approved mentors with expertise badges
- ✅ View detailed mentor profiles
- ✅ Request mentorship with personalized message
- ✅ Track all sent requests in one place
- ✅ Get mentor contact info when accepted
- ✅ See acceptance/decline reasons

### For Mentors (Alumni):
- ✅ Volunteer through simple application form
- ✅ Access dedicated mentor dashboard
- ✅ View all requests (pending/accepted/all)
- ✅ Accept or decline with optional message
- ✅ See mentee contact info for accepted requests
- ✅ Mark mentorships as completed
- ✅ Track mentoring history

### For Admins:
- ✅ Review volunteer applications
- ✅ Approve/reject mentors
- ✅ Manually add mentors
- ✅ View all requests across system
- ✅ Full database access via SQL

---

## 🔮 Future Enhancements (Optional)

1. **Email Notifications**: Auto-email mentors when they receive requests
2. **Admin Panel UI**: Build screens for approving applications (no SQL needed)
3. **Mentor Analytics**: Track total mentees, response time, completion rate
4. **Ratings System**: Let mentees rate their experience
5. **Calendar Integration**: Schedule mentorship sessions directly
6. **Chat Feature**: In-app messaging between mentor and mentee
7. **Mentor Availability Calendar**: Block out unavailable times
8. **Automated Reminders**: Follow-up on pending requests
9. **Success Stories**: Showcase completed mentorships
10. **Match Suggestions**: AI-powered mentor recommendations

---

## 🆘 Troubleshooting

### "Column status does not exist"
- Run the DROP TABLE commands, then full CREATE script
- Ensure you're dropping in correct order (requests → applications → mentors)

### "Not a registered mentor" error
- Check your user's email matches an entry in `alumni_mentors` table
- Verify mentor status is 'approved'

### Can't see requests in mentor dashboard
- Run `ADD_MENTOR_DASHBOARD_POLICIES.sql` to add mentor viewing policies
- Verify mentor's email in `alumni_mentors` matches their profile email

### Mentee can't see contact info
- Check request status is 'accepted' (not 'pending')
- Verify mentor has email/phone in their `alumni_mentors` record

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Verify RLS policies are active
3. Confirm user authentication is working
4. Test with sample mentors first
5. Check browser console for frontend errors

---

**System Status**: ✅ Fully Implemented & Ready for Testing
**Database**: 3 tables, 15 RLS policies, 7 indexes
**Screens**: 5 screens (main tab + 4 dedicated screens)
**Features**: Complete mentor-mentee matching system with dashboard

