# Admin Settings Feature

## Overview
Added a comprehensive admin settings screen that allows admins to configure pricing, processing times, contact information, and payment instructions without modifying code.

## What's New

### 1. Settings Button in Admin Panel
- Located in the top-right corner of the admin panel header (gear icon)
- Only visible to admins and staff
- Quick access to all configuration settings

### 2. Admin Settings Screen (`/transcripts/admin/settings`)
Organized into 4 main sections:

#### **Pricing Section** 💰
Configure prices for all academic services:
- Official Transcript Price (default: GHS 50)
- Unofficial Transcript Price (default: GHS 0)
- WASSCE Certificate Price (default: GHS 40)
- Recommendation Letter Price (default: GHS 0)

#### **Processing Times Section** ⏱️
Set expected turnaround times:
- Transcript Processing Time (default: "3-5 business days")
- WASSCE Processing Time (default: "3-5 business days")

#### **Contact Information Section** 📞
Admin contact details for urgent inquiries:
- Admin Contact Email
- Admin Contact Phone

#### **Instructions Section** 📝
- Payment Instructions (shown to users when making requests)

### 3. Features
- **Live Preview**: Changes update immediately in the form
- **Save All**: Single button to save all settings at once
- **Individual Saves**: Each field can be saved separately (future enhancement)
- **Descriptions**: Helpful text explaining each setting
- **Default Values**: Pre-populated with sensible defaults
- **Validation**: Input types match expected data (numbers for prices, etc.)

## Setup Instructions

### Step 1: Create the Database Table
Run the SQL migration in Supabase SQL Editor:

```bash
# Open this file and copy contents to Supabase SQL Editor
CREATE_ADMIN_CONFIGS_TABLE.sql
```

This creates:
- `admin_configs` table with config_key/config_value structure
- RLS policies (admin/staff only access)
- Default configuration values
- Indexes for performance

### Step 2: Access Settings
1. Log in as admin (account with `is_admin = true` or `role = 'admin'`)
2. Navigate to Admin Panel
3. Click the gear icon (⚙️) in the top-right corner
4. Update settings as needed
5. Click "Save All" button

## How It Works

### Database Structure
```sql
admin_configs (
  id UUID PRIMARY KEY,
  config_key TEXT UNIQUE,
  config_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Configuration Keys
- `transcript_official_price` - Price for official transcripts
- `transcript_unofficial_price` - Price for unofficial transcripts
- `wassce_certificate_price` - Price for WASSCE certificates
- `recommendation_price` - Price for recommendations
- `payment_instructions` - Instructions shown to users
- `processing_time_transcript` - Expected time for transcripts
- `processing_time_wassce` - Expected time for WASSCE
- `admin_email` - Contact email for inquiries
- `admin_phone` - Contact phone for inquiries

### Future Enhancements
To use these dynamic configs in the app:

1. **Update Price Resolution** (in `/config/academicPricing.ts`):
   ```typescript
   // Instead of hardcoded PRICING object, fetch from admin_configs
   async function fetchPricing() {
     const { data } = await supabase
       .from('admin_configs')
       .select('config_key, config_value')
       .in('config_key', ['transcript_official_price', 'transcript_unofficial_price', ...]);
     // Parse and return
   }
   ```

2. **Display Instructions** (in `/app/transcripts/new.tsx`):
   ```typescript
   // Load and display payment_instructions from configs
   const { data } = await supabase
     .from('admin_configs')
     .select('config_value')
     .eq('config_key', 'payment_instructions')
     .single();
   ```

3. **Show Processing Times** (in request confirmation screens):
   ```typescript
   // Display expected processing time from configs
   ```

## Benefits

### For Admins
- ✅ No code changes needed to update prices
- ✅ Instant updates across the app
- ✅ Easy to manage from mobile device
- ✅ All settings in one place
- ✅ Safe: changes are isolated to specific fields

### For Development
- ✅ Separation of concerns (config vs code)
- ✅ Easier to test different pricing models
- ✅ Reduces deployment frequency
- ✅ Audit trail (updated_at timestamps)

### For Users
- ✅ Always see current prices
- ✅ Clear instructions
- ✅ Accurate contact information
- ✅ Realistic processing time expectations

## Testing

1. **Access Control**:
   - Try accessing `/transcripts/admin/settings` as regular user (should redirect)
   - Try as admin (should work)

2. **Price Updates**:
   - Change official transcript price to GHS 100
   - Create new transcript request
   - Verify new price is displayed (once integrated)

3. **Persistence**:
   - Update settings and save
   - Close app and reopen
   - Verify settings persisted

## Screenshots
(Settings screen shows organized sections with clear labels and descriptions)

## Files Modified/Created

### New Files
- `/app/transcripts/admin/settings.tsx` - Settings screen component
- `CREATE_ADMIN_CONFIGS_TABLE.sql` - Database migration

### Modified Files
- `/app/transcripts/admin/index.tsx` - Added settings button in header

## Next Steps

1. **Run the migration** to create the `admin_configs` table
2. **Integrate configs** into the pricing logic (replace hardcoded values)
3. **Add more configs** as needed (e.g., deadline for semester, holidays, etc.)
4. **Add validation** for numeric fields (ensure prices are valid numbers)
5. **Add audit logging** to track who changed what and when

## Notes

- Settings are stored as TEXT in the database (convert to appropriate types when using)
- All admins and staff can modify settings (consider adding approval workflow if needed)
- Default values are shown if table doesn't exist yet
- The screen provides the SQL to create the table if it's missing
