# Alumni Mentors System - Complete Guide

## Overview
Free mentorship program where experienced alumni volunteer to mentor anyone seeking guidance - students, young professionals, career changers, or anyone in the community. Simple, effective, and completely free.

---

## System Features

### For Mentees (Anyone Seeking Guidance)
✅ Browse approved alumni mentors  
✅ Filter by expertise areas  
✅ View mentor profiles (background, expertise, availability)  
✅ Request mentorship from any mentor (free)  
✅ See mentor's contact preferences  

### For Alumni (Volunteers)
✅ Apply to become a mentor (volunteer)  
✅ Specify areas of expertise  
✅ Set availability and meeting preferences  
✅ Receive mentorship requests from students  

### For Admins
✅ Review volunteer applications  
✅ Approve/reject mentor applications  
✅ Manually add mentors (for those contacted directly)  
✅ Edit mentor profiles  
✅ View all mentorship requests  
✅ Manage mentor status (active/inactive)  

---

## Database Tables

### 1. `alumni_mentors`
Stores approved mentors who are actively offering mentorship.

**Key Fields:**
- Basic Info: `full_name`, `email`, `phone`, `profile_photo_url`
- Professional: `current_title`, `company`, `industry`, `years_of_experience`
- Alumni: `graduation_year`, `degree`
- Mentorship: `expertise_areas[]`, `available_hours`, `meeting_formats[]`, `preferred_days[]`
- Bio: `short_bio`, `detailed_bio`, `mentorship_philosophy`
- Status: `status` (pending/approved/rejected/inactive)
- Type: `application_type` (admin_added/self_applied)

### 2. `mentor_applications`
Stores applications from alumni who want to volunteer.

**Key Fields:**
- Applicant info and professional background
- Why they want to mentor (`why_mentor`)
- What they can offer (`what_offer`)
- Status: pending/approved/rejected
- Admin review notes

### 3. `mentor_requests`
Stores mentorship requests from anyone seeking guidance.

**Key Fields:**
- `mentor_id` → which mentor
- `mentee_id` → who is requesting
- `mentee_name`, `mentee_email`, `mentee_phone` → contact info
- `current_status` → Student, Professional, Career Changer, etc.
- `areas_of_interest[]` → what help they need
- `message` → why they're reaching out
- Status: pending/accepted/declined/completed

---

## User Flows

### Flow 1: Anyone Requests Mentorship

1. Person opens **Education → Alumni Mentors** tab
2. Browses list of approved mentors
3. Sees mentor's expertise, availability, company
4. Clicks mentor card → Opens mentor profile
5. Reviews full profile (bio, experience, meeting formats)
6. Clicks **"Request Mentorship (Free)"**
7. Fills out request form:
   - Name, email, phone
   - Current status (Student, Young Professional, Career Changer, etc.)
   - Areas they need help with
   - Personal message
8. Submits request
9. Admin/mentor receives notification
10. Mentor reviews and accepts/declines

### Flow 2: Alumni Volunteers as Mentor

1. Alumni opens **Education → Alumni Mentors** tab
2. Clicks **"Volunteer"** button
3. Opens volunteer application form
4. Fills out:
   - Personal info
   - Professional background (title, company, years)
   - Education (graduation year, degree)
   - Expertise areas (select multiple)
   - Availability (hours/month, formats, days)
   - Why they want to mentor
   - What they can offer
5. Submits application
6. Admin receives notification
7. Admin reviews application
8. If approved → Alumni appears in mentors list
9. Students can now request mentorship from them

### Flow 3: Admin Adds Mentor Directly

1. Admin reaches out to prominent alumni
2. Gets their permission and details
3. Admin creates mentor profile directly in database OR through admin panel
4. Sets `application_type = 'admin_added'`
5. Sets `status = 'approved'`
6. Mentor immediately appears in list
7. Students can request mentorship

---

## Technical Implementation

### Frontend Screens

**1. Education Index (`app/education/index.tsx`)**
- Alumni Mentors tab
- Shows grid of approved mentors
- "Volunteer" button to apply
- Search/filter by expertise

**2. Volunteer Form (`app/education/volunteer-mentor.tsx`)**
- Multi-step application form
- Personal, professional, education sections
- Multi-select expertise areas
- Text areas for motivation

**3. Mentor Profile (`app/education/mentor/[id].tsx`)**
- Full mentor details
- Bio, expertise, availability
- Social links (LinkedIn, website)
- Request mentorship form inline
- Select areas of interest
- Send personalized message

### Backend (Supabase)

**RLS Policies:**
- Anyone can view approved mentors
- Authenticated users can submit applications
- Authenticated users can request mentorship
- Admins can view/edit everything
- Users can view their own applications/requests

**Sample Mentors Included:**
- Dr. Kwame Mensah (CTO, Technology)
- Ama Asante (Managing Partner, Law)

---

## Admin Tasks

### Review Volunteer Application

```sql
-- View pending applications
SELECT * FROM mentor_applications 
WHERE status = 'pending' 
ORDER BY created_at DESC;

-- Approve application (copy to mentors table)
INSERT INTO alumni_mentors (
  full_name, email, phone, current_title, company, 
  industry, years_of_experience, graduation_year, degree,
  expertise_areas, available_hours, meeting_formats, 
  preferred_days, linkedin_url, short_bio, detailed_bio,
  status, application_type, approved_by
)
SELECT 
  full_name, email, phone, current_title, company,
  industry, years_of_experience, graduation_year, degree,
  expertise_areas, available_hours, meeting_formats,
  preferred_days, linkedin_url, 
  why_mentor, what_offer,
  'approved', 'self_applied', auth.uid()
FROM mentor_applications
WHERE id = '<application_id>';

-- Update application status
UPDATE mentor_applications
SET status = 'approved', 
    reviewed_by = auth.uid(),
    reviewed_at = NOW()
WHERE id = '<application_id>';
```

### Manually Add Mentor

```sql
INSERT INTO alumni_mentors (
  full_name, email, phone, profile_photo_url,
  current_title, company, industry, years_of_experience,
  graduation_year, degree,
  expertise_areas, available_hours, 
  meeting_formats, preferred_days,
  linkedin_url, short_bio, detailed_bio, mentorship_philosophy,
  status, application_type
) VALUES (
  'John Doe',
  'john@example.com',
  '+233 XX XXX XXXX',
  'https://...',
  'CEO at Tech Company',
  'Tech Company',
  'Technology',
  20,
  2003,
  'MBA Business Administration',
  ARRAY['Career Guidance', 'Leadership', 'Entrepreneurship'],
  '5 hours/month',
  ARRAY['Video Call', 'Phone'],
  ARRAY['Weekdays', 'Evenings'],
  'https://linkedin.com/in/johndoe',
  'CEO with 20 years experience in tech leadership',
  'Full bio here...',
  'Why I mentor...',
  'approved',
  'admin_added'
);
```

### View Mentorship Requests

```sql
-- All requests
SELECT 
  mr.id,
  m.full_name as mentor_name,
  mr.mentee_name,
  mr.mentee_email,
  mr.current_status,
  mr.areas_of_interest,
  mr.message,
  mr.status,
  mr.created_at
FROM mentor_requests mr
JOIN alumni_mentors m ON mr.mentor_id = m.id
ORDER BY mr.created_at DESC;

-- Pending requests
SELECT * FROM mentor_requests 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

---

### Best Practices

### For Mentors
- Be specific about expertise areas
- Set realistic availability
- Keep bio concise and engaging
- Mention notable achievements
- Be clear about meeting formats

### For Mentees
- Be respectful and professional
- Clearly state your goals
- Explain why you chose this mentor
- Be specific about areas you need help with
- Follow up after meeting

### For Admins
- Verify alumni credentials before approval
- Look for diverse expertise areas
- Prioritize mentors in high-demand fields
- Check for appropriate professional experience
- Ensure bios are well-written

---

### Security & Privacy

✅ RLS policies protect sensitive data  
✅ Users can only see approved mentors  
✅ Mentors don't see mentee requests in database (admin mediates)  
✅ Email/phone only shared when someone requests mentorship  
✅ Admins can review and approve all applications  
✅ Mentors can be set to inactive without deletion

---

## Analytics & Insights

### Useful Queries

```sql
-- Total approved mentors
SELECT COUNT(*) FROM alumni_mentors WHERE status = 'approved';

-- Mentors by industry
SELECT industry, COUNT(*) 
FROM alumni_mentors 
WHERE status = 'approved'
GROUP BY industry;

-- Most requested mentors
SELECT m.full_name, COUNT(mr.id) as request_count
FROM alumni_mentors m
LEFT JOIN mentor_requests mr ON m.id = mr.mentor_id
WHERE m.status = 'approved'
GROUP BY m.id, m.full_name
ORDER BY request_count DESC;

-- Applications pending review
SELECT COUNT(*) FROM mentor_applications WHERE status = 'pending';

-- Expertise areas distribution
SELECT UNNEST(expertise_areas) as area, COUNT(*) 
FROM alumni_mentors 
WHERE status = 'approved'
GROUP BY area
ORDER BY COUNT(*) DESC;
```

---

## Future Enhancements (Optional)

### Phase 2 Ideas
- ⭐ Mentor ratings and reviews
- 💬 In-app messaging between mentor/student
- 📅 Integrated calendar booking
- 🔔 Email notifications for requests
- 📊 Mentor dashboard (view requests, schedule)
- 🎯 Matching algorithm (auto-suggest mentors)
- 📸 Video introductions from mentors
- 🏆 Mentor badges (Top Mentor, Most Active)
- 📈 Impact tracking (students helped, hours given)

### Phase 3 Ideas
- 👥 Group mentorship sessions
- 🎓 Structured mentorship programs (3-month tracks)
- 💼 Career path recommendations
- 📚 Resource library from mentors
- 🤝 Mentor matching events
- 📝 Mentorship logs (track meetings)

---

## Testing Checklist

### Student Experience
- [ ] Can browse mentors list
- [ ] Can search/filter mentors
- [ ] Can view mentor profile
- [ ] Can submit mentorship request
- [ ] Sees success message after submission
- [ ] Request saves to database

### Volunteer Experience
- [ ] Can access volunteer form
- [ ] Can fill out all fields
- [ ] Multi-select works for expertise/formats
- [ ] Can submit application
- [ ] Sees success message
- [ ] Application saves to database

### Admin Tasks
- [ ] Run CREATE_ALUMNI_MENTORS_SYSTEM.sql
- [ ] Verify tables created
- [ ] Verify sample mentors exist
- [ ] Test viewing applications
- [ ] Test approving application
- [ ] Test manually adding mentor

### Data Integrity
- [ ] RLS policies work correctly
- [ ] Non-admins can't see pending mentors
- [ ] Users can only see approved mentors
- [ ] Applications are private to user + admin
- [ ] Requests save with correct foreign keys

---

## Deployment Steps

1. **Run SQL script in Supabase**
   ```
   Run: CREATE_ALUMNI_MENTORS_SYSTEM.sql
   ```

2. **Verify database setup**
   - Check tables exist
   - Verify RLS policies active
   - Test sample mentor appears

3. **Test in app**
   - Open Education → Alumni Mentors tab
   - See sample mentors
   - Click mentor → view profile
   - Click "Volunteer" → fill form

4. **Admin configuration**
   - Set up admin accounts
   - Test application review process
   - Test manually adding mentors

5. **Go live**
   - Announce mentorship program
   - Reach out to alumni to volunteer
   - Monitor applications
   - Approve first batch of mentors

---

## Success Metrics

### Engagement
- Number of active mentors
- Number of mentorship requests per month
- Applications received
- Approval rate

### Quality
- Average response time to requests
- Mentee satisfaction
- Mentor retention rate
- Areas of expertise coverage

### Impact
- People mentored
- Hours of mentorship provided
- Success stories
- Career outcomes

---

## Support & Maintenance

### Regular Tasks
- Review pending applications weekly
- Follow up with inactive mentors
- Check for outdated profiles
- Update expertise categories
- Archive old requests

### Quarterly
- Analyze popular expertise areas
- Recruit mentors in underserved fields
- Survey students for feedback
- Recognize top mentors
- Update sample profiles

---

## Summary

**What You've Built:**
- ✅ Complete mentorship platform
- ✅ Volunteer application system
- ✅ Student request system
- ✅ Admin approval workflow
- ✅ Professional mentor profiles
- ✅ Free for students (always)

**Next Steps:**
1. Run SQL script
2. Test with sample mentors
3. Recruit real alumni volunteers
4. Launch to students
5. Monitor and iterate

**Philosophy:**
Simple, free, and impactful. Alumni give back, anyone seeking guidance gets support, community grows stronger. 💚
