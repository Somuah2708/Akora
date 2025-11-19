# Scholarship Submission System

## Overview
The scholarship submission system allows both alumni and regular users to submit scholarship opportunities for admin review. This helps crowdsource scholarship information and keeps the database up-to-date with community contributions.

## Features

### For Users/Alumni
1. **Submit Scholarships** - Anyone can submit scholarship opportunities
2. **Comprehensive Form** - Includes all relevant scholarship details:
   - Title and description
   - Organization/provider
   - Funding amount and currency
   - Deadline (date or text)
   - Eligibility criteria and level
   - Application links and contact info
   - Scholarship type and fields of study
   - Renewable status and number of awards

3. **Status Tracking** - Submissions show as "pending" until reviewed

### For Admins
1. **Review Dashboard** - Access via `/admin-scholarships`
2. **Filter Options** - View all, pending, approved, or rejected submissions
3. **Search** - Find scholarships by title or organization
4. **Approve/Reject Actions**:
   - Approve: Makes scholarship visible to all users
   - Reject: Hides scholarship with reason for rejection
5. **Statistics** - View counts of pending, approved, rejected, and total submissions

## Database Schema

### scholarship_submissions Table
- **id**: UUID primary key
- **user_id**: Reference to submitter
- **submitted_by_name**: Name of submitter
- **submitted_by_email**: Email of submitter
- **submitted_by_role**: 'admin', 'alumni', or 'user'
- **title**: Scholarship name
- **description**: Full description
- **funding_amount**: Award amount (optional)
- **funding_currency**: 'USD' or 'GHS'
- **deadline_date**: Application deadline (date format)
- **deadline_text**: Freeform deadline text
- **eligibility_criteria**: Who can apply
- **eligibility_level**: Target education level
- **application_url**: Link to apply
- **contact_email**: Contact for questions
- **website_url**: Organization website
- **image_url**: Scholarship image/logo
- **scholarship_type**: Merit-based, Need-based, etc.
- **fields_of_study**: Array of relevant fields
- **status**: 'pending', 'approved', 'rejected', or 'draft'
- **reviewed_by**: Admin who reviewed
- **reviewed_at**: Review timestamp
- **rejection_reason**: Why it was rejected

### approved_scholarships View
- Public view showing only approved scholarships
- Used for displaying scholarships to users
- Automatically filters by status='approved'

## Row Level Security (RLS) Policies

1. **Users can view own submissions** - See their submission status
2. **Users can create submissions** - Submit new scholarships
3. **Users can update own pending/draft submissions** - Edit before approval
4. **Admins can view all submissions** - Full access for review
5. **Admins can update all submissions** - Approve/reject/edit
6. **Admins can delete submissions** - Remove spam/duplicates

## Setup Instructions

### 1. Run SQL Migration
Execute `CREATE_SCHOLARSHIP_SUBMISSIONS.sql` in your Supabase SQL Editor:
```sql
-- This creates:
-- - scholarship_submissions table
-- - approved_scholarships view
-- - RLS policies
-- - Indexes for performance
-- - Triggers for updated_at
```

### 2. Access Points

**For Users:**
- Navigate to Education → Scholarships tab
- Click "Submit a Scholarship" button
- Fill out the form and submit
- Wait for admin approval

**For Admins:**
- Navigate to `/admin-scholarships` (add link in admin dashboard)
- Review pending submissions
- Approve or reject with reasons
- Search and filter as needed

### 3. Update Navigation (Optional)
Add a link to admin scholarship reviews in your admin panel:
```tsx
<TouchableOpacity onPress={() => router.push('/admin-scholarships')}>
  <Text>Review Scholarships</Text>
</TouchableOpacity>
```

## User Flow

### Submission Process
1. User clicks "Submit a Scholarship" in Scholarships tab
2. Fills out comprehensive form with all details
3. Submits for review (status: 'pending')
4. Receives confirmation message
5. Returns to scholarships list

### Admin Review Process
1. Admin opens `/admin-scholarships`
2. Views pending submissions (default filter)
3. Reviews scholarship details, checks legitimacy
4. Actions:
   - **Approve**: Scholarship becomes visible to all users
   - **Reject**: Provide reason, submitter can see why it was rejected
5. Approved scholarships appear in Education → Scholarships tab

## Benefits

1. **Community-Driven** - Alumni share opportunities they discover
2. **Always Current** - Users help keep scholarship database updated
3. **Quality Control** - Admin review prevents scams and spam
4. **Transparency** - Rejection reasons help users submit better next time
5. **Scalability** - Reduces admin workload for finding scholarships

## Files Created

1. **CREATE_SCHOLARSHIP_SUBMISSIONS.sql** - Database schema and policies
2. **app/education/submit-scholarship.tsx** - Submission form
3. **app/admin-scholarships.tsx** - Admin review dashboard
4. **Updated app/education/index.tsx** - Added submit button and approved scholarships fetch

## Next Steps

1. ✅ Run SQL migration
2. ✅ Test scholarship submission as regular user
3. ✅ Test admin approval/rejection workflow
4. ⏳ Add admin scholarships link to main admin dashboard
5. ⏳ Consider adding email notifications for:
   - Admins when new submissions arrive
   - Users when their submission is approved/rejected
6. ⏳ Add ability for admins to edit scholarship details before approving

## Notes

- Submissions default to 'pending' status
- Only approved scholarships are visible to users
- Legacy scholarships from products_services still work
- Both sources are combined in the scholarships list
- Submissions are tracked by submitter for accountability
