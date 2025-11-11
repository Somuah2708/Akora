# Alumni Support - Document Upload Feature

## Overview
Alumni can now upload supporting documents when submitting support requests. This is especially useful for:
- Academic transcripts/certificates for academic support
- Financial documents for scholarship applications
- Legal documents for legal assistance
- Medical records for health & wellness support
- ID verification for membership issues

## Setup Instructions

### 1. Run the SQL Migration
Execute `ADD_ATTACHMENTS_TO_SUPPORT_TICKETS.sql` in your Supabase SQL Editor:

```bash
# This will:
- Add attachments JSONB column to support_tickets table
- Create support-attachments storage bucket
- Set up RLS policies for file access
- Create indexes for performance
```

### 2. Verify Storage Bucket
In Supabase Dashboard:
1. Go to Storage
2. Confirm `support-attachments` bucket exists
3. Check that RLS policies are enabled

## Features

### File Upload
- **Supported Formats**: All file types (PDF, images, Word docs, etc.)
- **File Size Limit**: 10MB per file
- **Multiple Files**: Users can attach multiple documents
- **File Types**: Documents, images, PDFs, spreadsheets

### User Experience
1. Select support category
2. Fill out support form
3. Click "Upload Document" button
4. Select file from device
5. File appears in attachments list with:
   - File icon
   - File name
   - File size
   - Remove button (X)
6. Can upload multiple files
7. Submit request with all attachments

### Upload Process
- Files upload to Supabase Storage
- Stored in user-specific folders: `user-id/ticket-id/filename`
- Metadata saved in ticket record
- Progress indicator during upload
- Error handling for failed uploads

### Security
- **User Isolation**: Each user can only access their own files
- **Admin Access**: Admins can view all support attachments
- **RLS Policies**: Enforced at storage and database level
- **Organized Storage**: Files organized by user ID and ticket ID

## Database Schema

### Attachments Column Structure
```json
[
  {
    "file_name": "transcript.pdf",
    "file_path": "user-id/ticket-id/1731328200000.pdf",
    "file_type": "application/pdf",
    "file_size": 245678,
    "uploaded_at": "2025-11-11T10:30:00Z"
  }
]
```

## Storage Structure
```
support-attachments/
  └── {user_id}/
      └── {ticket_id}/
          ├── {timestamp1}.pdf
          ├── {timestamp2}.jpg
          └── {timestamp3}.docx
```

## UI Components

### Upload Button
- Dashed border with upload icon
- Blue accent color
- Shows "Upload Document" text
- Disabled during upload

### Attachment List
- Shows all selected files before submission
- Each attachment displays:
  - Blue paperclip icon
  - File name (truncated if long)
  - File size in KB
  - Red X button to remove

### Loading States
- "Uploading Files..." when uploading
- "Submitting..." when creating ticket
- Activity indicator during operations
- Button disabled during operations

## Admin Features

Admins can:
- View all ticket attachments
- Download files from any ticket
- Delete attachments if needed
- Access via RLS policies

## Future Enhancements
- [ ] Image preview thumbnails
- [ ] PDF viewer in-app
- [ ] Drag and drop upload (web)
- [ ] Compression for large images
- [ ] File type restrictions per category
- [ ] Bulk download for admins
- [ ] Virus scanning integration

## Testing Checklist

- [ ] Upload single file successfully
- [ ] Upload multiple files
- [ ] Remove file before submission
- [ ] Submit with attachments
- [ ] Submit without attachments
- [ ] Test file size limit (10MB)
- [ ] Test various file types (PDF, images, docs)
- [ ] Verify files stored correctly in Supabase Storage
- [ ] Verify attachments array in database
- [ ] Test user can only access own files
- [ ] Test admin can access all files

## Error Handling

The system handles:
- File too large (>10MB) - Shows alert
- Upload failures - Continues with other files
- Network errors - User-friendly error message
- Invalid file types - Accepts all but validates size

## Files Modified
1. `app/alumni-center/index.tsx` - Added upload UI and logic
2. `ADD_ATTACHMENTS_TO_SUPPORT_TICKETS.sql` - Database migration

## Supported Use Cases

### Academic Support
- Upload transcripts
- Upload degree certificates
- Upload verification documents

### Financial Assistance
- Upload income statements
- Upload scholarship applications
- Upload financial aid forms

### Career Services
- Upload CV/Resume
- Upload portfolios
- Upload certificates

### Health & Wellness
- Upload medical records
- Upload prescriptions
- Upload health insurance cards

### Legal Assistance
- Upload legal documents
- Upload contracts
- Upload court documents

### Membership Issues
- Upload ID verification
- Upload membership proof
- Upload payment receipts
