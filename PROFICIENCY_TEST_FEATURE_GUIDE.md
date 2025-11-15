# Proficiency Test Feature - Complete Guide

## Overview
Proficiency tests are standardized assessments that measure a student's competency in specific subjects, typically required for:
- University/college admission
- Employment applications
- Professional certification
- Scholarship applications
- Transfer credits

## Fields Required for Proficiency Tests

### Standard Fields (same as transcripts)
- **Full Name**: Student's legal name
- **Class**: Current or previous class/form
- **Graduation Year**: Year of graduation or expected graduation
- **Index Number**: Optional student identifier
- **Phone Number**: Contact number for coordination
- **Purpose**: Why the test is needed
- **Recipient Email**: Where to send results

### Proficiency-Specific Fields
1. **Test Subject** *(required)*
   - Which subject/test is needed
   - Examples: English Language, Mathematics, Science, Social Studies
   - Can be multiple subjects in one request

2. **Test Level** *(required)*
   - **Basic**: Foundational/entry level
   - **Intermediate**: Standard/medium level
   - **Advanced**: Higher level/specialized

3. **Preferred Test Date** *(required)*
   - When the student wants to take the test
   - Can be specific date or timeframe (e.g., "December 2025", "ASAP", "Next available")

## Database Schema

The following fields have been added to the `transcript_requests` table:

```sql
ALTER TABLE public.transcript_requests
ADD COLUMN IF NOT EXISTS test_subject TEXT,
ADD COLUMN IF NOT EXISTS test_level TEXT DEFAULT 'Basic',
ADD COLUMN IF NOT EXISTS preferred_test_date TEXT;
```

These fields are only populated when `request_kind = 'proficiency'`.

## Pricing & Processing

- **Default Price**: GHS 35 (configurable in Admin Settings)
- **Processing Time**: 2-3 business days (configurable in Admin Settings)
- **Payment Methods**: Mobile Money or Bank Transfer (same as other requests)

## User Workflow

1. Navigate to Academic Requests → New Request
2. Select **"Proficiency Test"** tab
3. Fill out all required fields:
   - Personal information
   - Test subject (what subject to be tested on)
   - Test level (Basic/Intermediate/Advanced)
   - Preferred test date
   - Purpose and recipient
4. Make payment (GHS 35) via Mobile Money or Bank Transfer
5. Upload payment proof screenshot
6. Submit request

## Admin Workflow

### Viewing Requests
1. Admin panel automatically shows proficiency test requests
2. Filter by "Proficiency" to see only proficiency tests
3. Each card displays:
   - Student name, class, graduation year
   - Phone number for contact
   - **Subject**: Which test is needed
   - **Level**: Basic/Intermediate/Advanced
   - **Preferred Date**: When student wants to take test

### Processing Steps
1. **Verify Payment**: Check payment proof screenshot
2. **Mark as Processing**: Update status to "processing"
3. **Coordinate Test Date**: Use phone number to schedule actual test date
4. **Administer Test**: Conduct proficiency test
5. **Upload Results**: Add document URL with test results/certificate
6. **Mark as Ready/Delivered**: Student receives notification

## Key Differences from Transcripts

| Feature | Transcript | Proficiency Test |
|---------|-----------|------------------|
| Purpose | Historical record | Current assessment |
| Timeline | Past performance | Future test date |
| Content | All courses/grades | Specific subject only |
| Format | Official document | Test certificate/results |
| Special Fields | Index number | Subject, level, test date |

## Migration Required

**Before using proficiency tests**, run this SQL migration in Supabase:

```bash
File: ADD_PROFICIENCY_TEST_FIELDS.sql
```

This adds the three new columns to support proficiency-specific data.

## Admin Configuration

In **Admin Settings**, the following can be configured:
- **proficiency_test_price**: Cost for proficiency test (default: GHS 35)
- **processing_time_proficiency**: Expected turnaround time (default: 2-3 business days)

## Testing Checklist

- [ ] Run ADD_PROFICIENCY_TEST_FIELDS.sql migration
- [ ] Create proficiency test request as regular user
- [ ] Verify all fields are required (subject, level, date)
- [ ] Upload payment proof
- [ ] Admin can see all proficiency-specific fields
- [ ] Filter by "Proficiency" works in admin panel
- [ ] Update status and verify notifications
- [ ] Upload test results document
- [ ] User can download completed test certificate

## Common Test Subjects

Based on typical high school/alumni requests:
- English Language
- Mathematics (Core/Elective)
- Integrated Science
- Social Studies
- French
- Information & Communication Technology (ICT)
- Business Management
- Technical subjects (varies by school)

## Notes for Implementation

- Proficiency tests use the same `transcript_requests` table with `request_kind = 'proficiency'`
- Three additional fields are conditionally required only for proficiency requests
- Admin can coordinate actual test dates via phone after payment verification
- Test results can be uploaded as PDF certificates via document_url field
- Same notification system as transcripts (status updates trigger notifications)

---

**Implementation Status**: ✅ Complete
- Form fields added
- Database schema updated
- Admin panel displays proficiency details
- Validation includes proficiency-specific checks
- Pricing and settings configured
