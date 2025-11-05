# ATTACHMENT FEATURE SETUP

## What's Been Added

### 1. Attachment Section in Create Announcement ✅
- Added **attachment picker** under "Full Content" field
- Users can upload documents from their computer
- Displays file name and size
- Remove button for each attachment

### 2. File Types Supported
- PDFs
- Word Documents (.doc, .docx)
- Excel Spreadsheets (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)
- Text files (.txt)
- Any other file type (**/*)

### 3. Features
- **Add Document button** with Paperclip icon
- **File preview** showing:
  - File name
  - File size (KB/MB)
  - File icon
- **Remove button** (X) for each attachment
- Multiple attachments supported
- Stored in database as JSONB array

## Installation Required

You need to install `expo-document-picker`:

```bash
npx expo install expo-document-picker
```

## How It Works

### User Flow:
1. User fills in announcement details
2. Scrolls to "Attachments (Optional)" section
3. Clicks "Add Document" button
4. System file picker opens
5. User selects a file
6. File appears in the attachments list
7. Can add multiple files
8. Can remove files with X button
9. Files saved with announcement

### Technical Implementation:

**Document Picker:**
```typescript
const result = await DocumentPicker.getDocumentAsync({
  type: '*/*', // All file types
  copyToCacheDirectory: true,
  multiple: false,
});
```

**Attachment Object:**
```typescript
interface AttachmentItem {
  name: string;    // File name
  url: string;     // File URI/URL
  size?: string;   // Formatted size (e.g., "2.5 MB")
  type?: string;   // MIME type
}
```

**Database Storage:**
```typescript
attachments: attachments.length > 0 ? attachments : null
```

Stored in `secretariat_announcements.attachments` column as JSONB array.

## UI Components

### Add Document Button:
- Blue border with paperclip icon
- Text: "Add Document"
- Opens system file picker

### Attachment List Item:
```
[📄 Icon] [Filename.pdf      ] [X]
          [2.5 MB             ]
```

### Styling:
- Clean white background
- Blue accents for icons
- Red remove button
- File size in gray text

## Database Column

The `attachments` column already exists in `secretariat_announcements` table as JSONB.

No SQL migration needed!

## File Display in Announcement Detail

When viewing an announcement with attachments, the files are shown in the "Attachments" section with download links.

## Next Steps

1. **Install the package:**
   ```bash
   npx expo install expo-document-picker
   ```

2. **Restart your development server:**
   ```bash
   npm start
   ```

3. **Test the feature:**
   - Go to Create Announcement
   - Scroll to "Attachments (Optional)"
   - Click "Add Document"
   - Select a file
   - Verify it appears in the list
   - Click X to remove
   - Submit announcement
   - View announcement to see attachments

## Important Notes

### File Upload Limitations:
- Files are currently stored as URIs (local paths)
- For production, you should upload files to cloud storage:
  - Supabase Storage
  - AWS S3
  - Cloudinary
  - etc.

### Recommended Enhancement:
Upload files to Supabase Storage and store the public URL in the database:

```typescript
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('announcements-attachments')
  .upload(`${userId}/${fileName}`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('announcements-attachments')
  .getPublicUrl(filePath);

// Store in database
const attachment = {
  name: fileName,
  url: publicUrl,  // Public URL instead of local URI
  size: fileSize,
  type: mimeType
};
```

## Testing

### Test Cases:
1. Add single document
2. Add multiple documents
3. Remove a document
4. Create announcement with attachments
5. View announcement with attachments
6. Different file types (PDF, DOCX, etc.)
7. Large files (check size limits)

## File Size Limits

Consider adding file size validation:

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

if (file.size > MAX_FILE_SIZE) {
  Alert.alert('Error', 'File size must be less than 10 MB');
  return;
}
```
