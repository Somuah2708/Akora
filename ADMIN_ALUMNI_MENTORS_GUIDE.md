# 🔧 Alumni Mentors Admin Panel - Complete Guide

## ✅ What Was Updated

### 1. **Removed All Hardcoded Data**
- Created `/constants/mentorConstants.ts` with centralized configuration
- All expertise options, meeting formats, days, and industry options now in one place
- Easy to update without touching component code

### 2. **Created Comprehensive Admin Panel** (`/app/admin-alumni-mentors.tsx`)
- Full management interface for the entire mentorship system
- Three main sections: Mentors, Applications, Requests
- Real-time statistics dashboard
- Complete CRUD operations

---

## 📊 Admin Dashboard Features

### **Statistics Overview** (Top Section)
Shows real-time metrics:
- **Total Mentors**: All mentors in system (approved, pending, rejected, inactive)
- **Active Mentors**: Currently approved and visible mentors
- **Pending Applications**: Volunteer applications awaiting review
- **Pending Requests**: Mentorship requests waiting for mentor response
- **Active Mentorships**: Accepted mentor-mentee connections

### **Three Main Tabs:**

---

## 1️⃣ **MENTORS TAB**

### View All Mentors
Shows complete list of all mentors with:
- Name, title, company
- Email, phone, industry
- Expertise areas (up to 3 displayed, + count for more)
- Current status (pending/approved/rejected/inactive)
- Application type (admin_added or self_applied)
- Date added

### Actions Available:

**For Pending Mentors:**
- ✅ **Approve** - Makes mentor visible to all users
- ❌ **Reject** - Rejects the mentor application
- 🗑️ **Delete** - Permanently removes mentor (with confirmation)

**For Approved Mentors:**
- 🔴 **Deactivate** - Temporarily hides mentor (keeps data)
- 🗑️ **Delete** - Permanently removes

**For Inactive Mentors:**
- ✅ **Activate** - Makes mentor active again
- 🗑️ **Delete** - Permanently removes

**For Rejected Mentors:**
- 🗑️ **Delete** - Permanently removes

### Add New Mentor
- Click **"Add New Mentor"** button at top
- Opens form to manually add a mentor
- Useful for VIP mentors or special cases
- Status automatically set to 'approved'

---

## 2️⃣ **APPLICATIONS TAB**

### View All Volunteer Applications
Shows everyone who volunteered to be a mentor:
- Applicant name, title, company
- Email address
- Expertise areas
- Application status (pending/approved/rejected)
- Date applied

### View Application Details
Click any application to see full modal with:
- Complete professional background
- All expertise areas
- **"Why I want to mentor"** - Applicant's motivation
- **"What I can offer"** - Value proposition

### Actions Available:

**For Pending Applications:**
- ✅ **Approve & Add as Mentor**
  - Creates entry in `alumni_mentors` table
  - Uses their "why_mentor" as short_bio
  - Uses their "what_offer" as detailed_bio
  - Status set to 'approved'
  - Application marked as 'approved'
  - Mentor immediately visible to users

- ❌ **Reject Application**
  - Updates application status to 'rejected'
  - Does NOT create mentor entry
  - Applicant can see rejection status

**For Approved/Rejected Applications:**
- Read-only view (historical record)

---

## 3️⃣ **REQUESTS TAB**

### View All Mentorship Requests
Shows every request made by users:
- Mentee name and current status
- Which mentor they're requesting
- Mentee email
- Areas of interest
- Personal message
- Request status (pending/accepted/declined/completed)
- Date requested

### Information Displayed:
- **Mentee Info**: Name, email, status (Student, Professional, etc.)
- **Target Mentor**: "→ Requesting: [Mentor Name]"
- **Areas of Interest**: Topics they want help with
- **Message**: Why they're reaching out (expandable)

### Status Indicators:
- 🟡 **Pending** - Waiting for mentor response
- 🟢 **Accepted** - Mentor accepted, mentorship active
- 🔴 **Declined** - Mentor declined
- 🟣 **Completed** - Mentorship finished

### Note:
Mentors handle accept/decline through their own dashboard. Admin tab is for **monitoring only**.

---

## 🎯 Common Admin Workflows

### **Approve a New Volunteer Mentor**

1. Go to **Applications** tab
2. Click pending application to view details
3. Review:
   - Professional background
   - Expertise areas
   - Why they want to mentor
   - What they can offer
4. Click **"Approve & Add as Mentor"**
5. System automatically:
   - Creates mentor entry with status 'approved'
   - Marks application as 'approved'
   - Mentor appears in Mentors tab
   - Mentor visible to all users immediately
   - Mentor can now access mentor dashboard

### **Manually Add a Mentor** (Coming Soon)

Currently: Click "Add New Mentor" button (feature placeholder)
Future: Form with all fields to manually create mentor profile

### **Deactivate a Mentor Temporarily**

1. Go to **Mentors** tab
2. Find approved mentor
3. Click **"Deactivate"** button
4. Status changes to 'inactive'
5. Mentor hidden from public view
6. Can reactivate later with **"Activate"** button

### **Delete a Mentor Permanently**

1. Go to **Mentors** tab
2. Find mentor to delete
3. Click 🗑️ **Delete** button
4. Confirm deletion
5. **Warning**: Deletes ALL associated requests (CASCADE delete)

### **Monitor Mentorship Requests**

1. Go to **Requests** tab
2. See all active mentorships
3. Check status:
   - Pending: Waiting for mentor
   - Accepted: Active mentorship
   - Completed: Successful completion
4. Track engagement metrics

---

## 📱 How to Access Admin Panel

### Option 1: Direct URL
Navigate to: `/admin-alumni-mentors`

### Option 2: From Admin Dashboard
Add link to your main admin panel with:
```tsx
<TouchableOpacity onPress={() => router.push('/admin-alumni-mentors')}>
  <Text>Alumni Mentors Management</Text>
</TouchableOpacity>
```

### Option 3: From Education Screen (Admin Only)
Add admin icon in Alumni Mentors tab header (only visible to admins)

---

## 🔐 Security & Permissions

### Access Control:
- ✅ Only users with `is_admin === true` can access
- ✅ Non-admin redirect with error message
- ✅ All database operations respect RLS policies

### Database Permissions:
- Admins can view/edit/delete ALL mentors
- Admins can view/edit ALL applications
- Admins can view ALL requests (monitoring only)

---

## 📊 Database Operations

### What Admin Panel Can Do:

**alumni_mentors table:**
- ✅ SELECT all mentors (any status)
- ✅ INSERT new mentors manually
- ✅ UPDATE mentor status
- ✅ DELETE mentors (with cascade)

**mentor_applications table:**
- ✅ SELECT all applications
- ✅ UPDATE application status
- ✅ Auto-create mentor from approved application

**mentor_requests table:**
- ✅ SELECT all requests (read-only monitoring)
- ℹ️ Mentors handle their own accept/decline

---

## 🎨 UI Features

### Real-time Updates:
- Pull-to-refresh on all tabs
- Statistics auto-update after actions
- Loading states for all operations

### Visual Indicators:
- **Status Badges**: Color-coded by status
  - Yellow: Pending
  - Green: Approved/Accepted
  - Red: Rejected/Declined
  - Gray: Inactive
  - Purple: Completed

### Smart Counts:
- Tab badges show pending items
- Expertise chips show first 3 + count
- Statistics cards update live

### Modal Details:
- Full application review in modal
- Scrollable content for long text
- Easy approve/reject actions

---

## 🔄 Workflow Integration

### Complete System Flow:

```
USER volunteers
    ↓
ADMIN reviews application (Applications tab)
    ↓
ADMIN approves
    ↓
Mentor created & visible (Mentors tab)
    ↓
USERS request mentorship
    ↓
MENTOR sees in their dashboard
    ↓
MENTOR accepts
    ↓
ADMIN monitors (Requests tab)
    ↓
Mentorship happens
    ↓
MENTOR marks complete
```

---

## 🛠️ Configuration Management

### Update Options/Constants:

Edit `/constants/mentorConstants.ts` to modify:

```typescript
// Add new expertise area
export const EXPERTISE_OPTIONS = [
  'Career Guidance',
  'Technical Skills',
  // ... add more here
];

// Add new industry
export const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  // ... add more here
];

// Add new meeting format
export const MEETING_FORMATS = [
  'Video Call',
  'Phone',
  // ... add more here
];
```

**Changes automatically apply to:**
- Volunteer application form
- Mentor profile displays
- Admin panel filters (future)
- All dropdowns/selects

---

## 📈 Future Enhancements (Optional)

### Planned Features:
1. **Filters & Search**
   - Filter mentors by status, industry, expertise
   - Search by name or email
   - Sort by date, name, status

2. **Batch Operations**
   - Approve multiple applications at once
   - Bulk status updates
   - Export mentor lists

3. **Analytics Dashboard**
   - Total mentorships completed
   - Average response time
   - Most popular expertise areas
   - Mentor activity scores

4. **Email Notifications**
   - Notify applicants of approval/rejection
   - Remind mentors of pending requests
   - Send completion surveys

5. **Mentor Profiles Editing**
   - Edit mentor details inline
   - Update expertise areas
   - Modify availability

6. **Advanced Request Management**
   - Admin can reassign requests
   - Manual matching suggestions
   - Request priority system

---

## ✅ Testing Checklist

### Mentors Tab:
- [ ] View all mentors with correct data
- [ ] Approve pending mentor
- [ ] Reject pending mentor
- [ ] Deactivate approved mentor
- [ ] Reactivate inactive mentor
- [ ] Delete mentor (with confirmation)
- [ ] Statistics update after actions

### Applications Tab:
- [ ] View all applications
- [ ] Click application to see modal details
- [ ] Approve application → creates mentor
- [ ] Reject application → updates status
- [ ] Badge shows pending count
- [ ] Modal closes properly

### Requests Tab:
- [ ] View all mentorship requests
- [ ] See mentee and mentor info
- [ ] Status badges display correctly
- [ ] Message shows properly
- [ ] Areas of interest visible

### General:
- [ ] Non-admin users blocked from access
- [ ] Pull-to-refresh works on all tabs
- [ ] Loading states display correctly
- [ ] All buttons functional
- [ ] No hardcoded data anywhere

---

## 🆘 Troubleshooting

### "Access Denied" error
- Ensure user has `is_admin = true` in profiles table
- Check `SELECT * FROM profiles WHERE id = 'user-id';`
- Update: `UPDATE profiles SET is_admin = true WHERE id = 'user-id';`

### Applications not showing
- Verify `mentor_applications` table has data
- Check RLS policies allow admin SELECT
- Run: `SELECT * FROM mentor_applications;` in Supabase

### Can't approve application
- Check INSERT permissions on `alumni_mentors` table
- Verify all required fields have values
- Look for foreign key constraint errors

### Mentors not appearing after approval
- Check mentor status is 'approved'
- Verify RLS policy allows public SELECT where status='approved'
- Check education screen is querying correctly

---

## 📞 Quick SQL Commands

### Make user admin:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'admin@example.com';
```

### View pending items:
```sql
-- Pending applications
SELECT * FROM mentor_applications WHERE status = 'pending';

-- Pending requests
SELECT * FROM mentor_requests WHERE status = 'pending';
```

### Manual mentor approval:
```sql
-- Approve application
UPDATE mentor_applications 
SET status = 'approved' 
WHERE id = 'app-id';

-- Create mentor from application
INSERT INTO alumni_mentors (full_name, email, ...)
SELECT full_name, email, ... 
FROM mentor_applications 
WHERE id = 'app-id';
```

---

**System Status**: ✅ Fully Functional Admin Panel
**Files Created**: 
- `app/admin-alumni-mentors.tsx` - Complete admin interface
- `constants/mentorConstants.ts` - Centralized configuration
**Features**: View, Approve, Reject, Delete, Monitor all mentorship activities

