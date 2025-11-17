# Alumni Mentors - Quick Start

## What Was Built

### 🎯 Core Feature
Free mentorship program where experienced alumni volunteer to mentor anyone seeking guidance (students, professionals, career changers, etc.).

### 📱 User-Facing Screens
1. **Alumni Mentors Tab** (`app/education/index.tsx`)
   - Browse approved mentors
   - See expertise, company, availability
   - "Volunteer" button to apply
   - Click mentor → view full profile

2. **Volunteer Form** (`app/education/volunteer-mentor.tsx`)
   - Alumni can apply to become mentors
   - Professional background
   - Expertise areas (multi-select)
   - Why they want to mentor
   - Meeting preferences

3. **Mentor Profile** (`app/education/mentor/[id].tsx`)
   - Full bio and background
   - Expertise areas with badges
   - Meeting formats and availability
   - LinkedIn/social links
   - **Request Mentorship** form inline
   - Students fill: name, email, areas, message
   - Submit → admin/mentor notified

### 🗄️ Database Tables
1. **alumni_mentors** - Approved mentors (visible to all)
2. **mentor_applications** - Volunteer applications (pending review)
3. **mentor_requests** - Student requests for mentorship

---

## How It Works

### For Anyone Seeking Mentorship
1. Open **Education → Alumni Mentors** tab
2. Browse mentors (free mentorship)
3. Click mentor card → see full profile
4. Click "Request Mentorship (Free)"
5. Fill form (name, status, areas, message) → submit
6. Wait for mentor to review

### For Alumni
1. Open **Education → Alumni Mentors** tab
2. Click green **"Volunteer"** button
3. Fill application form
4. Submit → admin reviews
5. If approved → appear in mentors list

### For Admin
1. Run `CREATE_ALUMNI_MENTORS_SYSTEM.sql` in Supabase
2. Review applications:
   ```sql
   SELECT * FROM mentor_applications WHERE status = 'pending';
   ```
3. Approve → copy to alumni_mentors table
4. Or manually add mentors with INSERT query

---

## Setup Steps

### 1. Database Setup
```bash
# In Supabase SQL Editor:
Run: CREATE_ALUMNI_MENTORS_SYSTEM.sql
```

This creates:
- 3 tables with RLS
- Indexes for performance
- 2 sample mentors (Dr. Kwame Mensah, Ama Asante)

### 2. Test in App
```bash
# Make sure expo is running
npx expo start

# Navigate to:
Education → Alumni Mentors Tab
```

You should see:
- 2 sample mentors
- Green "Volunteer" button
- Info banner about free mentorship

### 3. Test Flows

**Test Mentorship Request:**
1. Click sample mentor card
2. Opens mentor profile
3. Scroll down → "Request Mentorship (Free)"
4. Fill form (enter your status: Student, Professional, etc.) and submit
5. Check database: `SELECT * FROM mentor_requests;`

**Test Volunteer Application:**
1. Click green "Volunteer" button
2. Fill all sections
3. Submit application
4. Check database: `SELECT * FROM mentor_applications;`

---

## Key Features

### ✅ What Works Now
- Browse approved mentors
- View full mentor profiles
- Anyone can request mentorship (free)
- Alumni apply to volunteer
- Admin review applications
- Manually add mentors
- RLS security policies
- Sample data included

### 🚀 Simple & Great
- **No payment system** - completely free
- **No complex matching** - people choose their mentors
- **No scheduling complexity** - handled outside app
- **Volunteer-based** - alumni offer time freely
- **Admin approval** - quality control maintained
- **Open to all** - not limited to students only

---

## Sample Mentors Included

### Dr. Kwame Mensah
- CTO at MTN Ghana
- 15+ years experience
- Expertise: Tech, Leadership, Entrepreneurship
- Available: 5-10 hours/month
- Formats: Video Call, In-Person, Email

### Ama Asante
- Managing Partner, Law Firm
- 12+ years experience
- Expertise: Law, Career, Networking, Public Speaking
- Available: 3-5 hours/month
- Formats: Video Call, Phone

---

## Admin Queries

### View Pending Applications
```sql
SELECT 
  full_name, email, current_title, company,
  expertise_areas, graduation_year,
  created_at
FROM mentor_applications 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Approve Application (Manual)
```sql
-- 1. Copy to mentors table
INSERT INTO alumni_mentors (...)
SELECT ... FROM mentor_applications WHERE id = '...';

-- 2. Update application status
UPDATE mentor_applications
SET status = 'approved', reviewed_by = auth.uid()
WHERE id = '...';
```

### View Mentorship Requests
```sql
SELECT 
  m.full_name as mentor,
  mr.mentee_name,
  mr.current_status,
  mr.areas_of_interest,
  mr.message,
  mr.status,
  mr.created_at
FROM mentor_requests mr
JOIN alumni_mentors m ON mr.mentor_id = m.id
ORDER BY mr.created_at DESC;
```

---

## Testing Checklist

- [ ] Database tables created
- [ ] Sample mentors visible in app
- [ ] Can click mentor → see profile
- [ ] Can submit mentorship request
- [ ] Request saves to database
- [ ] Can access volunteer form
- [ ] Can submit volunteer application
- [ ] Application saves to database
- [ ] RLS policies work (non-admins can't see pending)

---

## File Structure

```
app/education/
├── index.tsx                    # Main education screen (updated)
├── volunteer-mentor.tsx         # Volunteer application form (NEW)
└── mentor/
    └── [id].tsx                 # Mentor profile screen (NEW)

SQL Scripts:
└── CREATE_ALUMNI_MENTORS_SYSTEM.sql  # Complete database setup (NEW)

Documentation:
└── ALUMNI_MENTORS_SYSTEM_GUIDE.md    # Full guide (NEW)
```

---

## What Changed

### education/index.tsx
- Updated `fetchMentors()` to use `alumni_mentors` table
- Enhanced mentor card UI with more details
- Added "Volunteer" button in header
- Added info banner about free mentorship
- Better styling for expertise chips
- Shows company, availability, meeting formats

---

## Next Steps

1. **Run SQL script** in Supabase
2. **Test in app** - see sample mentors
3. **Recruit alumni** - reach out to volunteers
4. **Review applications** - approve first mentors
5. **Launch to students** - announce program
6. **Monitor requests** - facilitate connections

---

## Philosophy

**Simple:** No complex features. Just connect people with mentors.

**Free:** Always free for mentees. Alumni volunteer their time.

**Quality:** Admin reviews ensure credible mentors only.

**Impactful:** Alumni give back, anyone seeking guidance gets support.

---

## Support

For questions or issues, refer to:
- `ALUMNI_MENTORS_SYSTEM_GUIDE.md` (full documentation)
- `CREATE_ALUMNI_MENTORS_SYSTEM.sql` (database setup)

**You're all set!** Run the SQL script and test it out. 🎉
