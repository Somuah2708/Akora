# Alumni Support System - Setup Guide

## Overview
The Alumni Support section has been transformed into a comprehensive support request system where Akoras can submit support tickets across various categories.

## Features Implemented

### Support Categories
1. **Academic Support** - Transcript requests, verification letters, academic records
2. **Financial Assistance** - Scholarships, emergency funds, financial aid inquiries
3. **Career Services** - Job placement, mentorship, professional development
4. **Health & Wellness** - Mental health support, counseling, wellness programs
5. **Legal Assistance** - Legal advice, document notarization, legal referrals
6. **Membership Issues** - Account access, membership benefits, profile updates
7. **Networking Support** - Connect with alumni, chapter information, events
8. **General Inquiry** - Other questions or concerns

### Support Request Form
Each support request includes:
- **Category Selection** - Visual card-based selection with icons
- **Subject** - Brief summary of the request
- **Description** - Detailed information (multiline textarea)
- **Urgency Level** - Low, Normal, High, Urgent
- **Contact Preference** - Email, Phone, Both

### User Features
- Submit support requests in any category
- View recent support requests with status badges
- Track request status (Open, In Progress, Resolved, Closed)
- Color-coded status indicators
- Response time information (24-48 hours normal, 2-4 hours urgent)

### Admin Features (via RLS policies)
- View all support tickets
- Update ticket status
- Assign tickets to staff
- Add admin notes and resolution notes
- Access support ticket statistics view

## Database Setup

### 1. Run the Migration
Execute the SQL file in your Supabase SQL Editor:
```sql
-- File: CREATE_SUPPORT_TICKETS_TABLE.sql
```

This creates:
- `support_tickets` table with all necessary fields
- Indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp updates
- Admin statistics view
- Real-time notification triggers

### 2. Table Schema

```typescript
support_tickets {
  id: UUID (primary key)
  user_id: UUID (references auth.users)
  category: TEXT (academic, financial, career, etc.)
  category_title: TEXT (display name)
  subject: TEXT
  description: TEXT
  urgency: TEXT (low, normal, high, urgent)
  contact_preference: TEXT (email, phone, both)
  status: TEXT (open, in_progress, resolved, closed)
  assigned_to: UUID (admin user id)
  admin_notes: TEXT
  resolution_notes: TEXT
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  resolved_at: TIMESTAMPTZ
}
```

### 3. RLS Policies
- Users can view and create their own tickets
- Users can update their own open tickets
- Admins (is_admin = true in profiles) can view/update/delete all tickets
- Automatic status updates and timestamp management

## UI/UX Features

### Visual Design
- Color-coded categories with gradient icons
- Selected category highlighting with border
- Status badges (color-coded):
  - Open: Orange
  - In Progress: Blue
  - Resolved: Green
  - Closed: Gray
- Responsive card-based layout
- Clean form design with proper spacing

### User Flow
1. User opens Alumni Support page
2. Views hero banner explaining the support system
3. Sees recent tickets (if any) with status
4. Selects a support category from grid
5. Fills out support form with details
6. Submits request
7. Receives confirmation message
8. Can track request in "Recent Requests" section

### Accessibility
- Clear labels and descriptions
- High contrast text
- Touch-friendly button sizes
- Responsive design for all screen sizes
- Proper form validation with user-friendly error messages

## Response Times (Displayed to Users)

| Urgency | Response Time |
|---------|--------------|
| Low | 48-72 hours |
| Normal | 24-48 hours |
| High | 8-12 hours |
| Urgent | 2-4 hours |

## Admin Dashboard (Future Enhancement)
Consider creating an admin panel to:
- View all tickets in a table/list
- Filter by status, category, urgency
- Assign tickets to staff members
- Update ticket status
- Add resolution notes
- View statistics (from support_ticket_stats view)

## Testing Checklist

- [ ] Submit a support request in each category
- [ ] Verify tickets appear in "Recent Requests"
- [ ] Test form validation (empty fields)
- [ ] Test all urgency levels
- [ ] Test all contact preferences
- [ ] Verify RLS policies (users only see their tickets)
- [ ] Test admin access (if admin user exists)
- [ ] Verify status colors display correctly
- [ ] Test on different screen sizes
- [ ] Verify timestamps are saved correctly

## Navigation
- Access: From Secretariat page → Alumni Support card
- Back button returns to previous screen
- After submission, form resets and loads updated recent tickets

## Files Modified
1. `app/alumni-center/index.tsx` - Complete transformation to support form system
2. `CREATE_SUPPORT_TICKETS_TABLE.sql` - Database schema and policies

## Future Enhancements
- File/document attachment support for tickets
- Email notifications to admins on new tickets
- Email notifications to users on status updates
- Ticket comments/replies system
- Knowledge base/FAQ section
- Live chat for urgent matters
- Satisfaction survey after ticket resolution
- Analytics dashboard for support metrics

## Academic Requests Payment Setup (Updated)

Manual payment (Mobile Money or Bank Transfer) replaces third-party redirect buttons. UI now uses the term "Cost of Service" instead of "Price".

### Flow
1. User selects request kind (Transcript, WASSCE Certificate, Recommendation) and sees price box.
2. Payment instructions (MoMo + Bank) are shown from `config/manualPayment.ts` beneath an enlarged "Cost of Service" box.
3. User sends funds externally and uploads a screenshot proof (required if price > 0).
4. Proof stored privately in `proofs` bucket; admin reviews and marks status `payment_provided`.
5. Processing continues until delivered; verification code available for authenticity checks.

### New Fields
- `phone_number` on `transcript_requests` & `recommendation_requests` for quick contact.
- `payment_proof_url` added to `recommendation_requests` (already present for transcripts) for parity.

### Admin Review
- Admin transcript & recommendation screens show identity, phone, price, and indicate payment proof presence.
- Signed URLs generated server-side for private proof viewing.

Update placeholders in `config/manualPayment.ts` with real institutional account details before production use.
