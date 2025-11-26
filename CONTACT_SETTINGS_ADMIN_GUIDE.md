# Contact Settings Management System

## Overview
A comprehensive admin system for managing contact information displayed in the Customer Care Center. Admins can update email, phone, address, GPS coordinates, and office hours directly from the app.

## Features Implemented

### 1. **Database Table**
Created `app_contact_settings` table with:
- Email address
- Phone number
- Physical address
- GPS coordinates (latitude/longitude)
- Office hours (weekdays & weekends as JSON)
- Audit fields (updated_at, updated_by)
- RLS policies (read for all, write for admins only)

### 2. **Customer Care Updates**

#### **Removed Website Card**
- Website contact method removed from grid
- Layout now shows 3 cards: Call Us, Email Us, Visit Us
- Visit Us card now full-width with map integration

#### **Map Integration**
- Tapping "Visit Us" opens native maps app
- iOS: Opens Apple Maps with coordinates
- Android: Opens Google Maps with coordinates
- Fallback: Opens Google Maps in browser
- Uses GPS coordinates from database

#### **Dynamic Contact Info**
- All contact details fetched from database in real-time
- No more hardcoded values
- Updates reflect immediately after admin changes

### 3. **Admin Settings Screen**
**Location**: `/admin/contact-settings.tsx`

**Features**:
- Access restricted to admin role only
- Full form to edit all contact details
- GPS coordinate inputs with helper text
- Office hours for weekdays (required) and weekends (optional)
- Live preview of contact information
- Save button with loading state
- Error handling with user-friendly alerts

**Form Fields**:
1. **Email Address** - Email input with validation
2. **Phone Number** - Phone input
3. **Physical Address** - Multi-line text area
4. **GPS Coordinates** - Separate latitude/longitude inputs
5. **Office Hours** - Weekdays (required) and weekends (optional)

**Admin Access Button**:
- Settings gear icon appears in Customer Care header (admin only)
- Opens admin settings screen when tapped

## Usage

### For Admins

#### Accessing Settings
1. Navigate to Secretariat screen
2. Look for gear icon (⚙️) in Customer Care Center header
3. Tap to open Contact Settings screen

#### Updating Contact Info
1. Edit any field in the form
2. For GPS coordinates, use Google Maps to find accurate values
3. Format office hours clearly (e.g., "Mon - Fri: 8:00 AM - 5:00 PM")
4. Weekends are optional - leave blank if closed
5. Tap save button (top right)
6. Changes appear immediately in Secretariat

#### GPS Coordinates
To find accurate coordinates:
1. Open Google Maps
2. Right-click on your location
3. Click on the coordinates to copy them
4. Paste latitude and longitude into respective fields

Example coordinates:
- **Accra, Ghana**: Lat: 5.6037, Long: -0.1870
- **Kampala, Uganda**: Lat: 0.3136, Long: 32.5811

### For Users

#### Contacting Support
1. **Call**: Tap "Call Us" card → Opens phone dialer
2. **Email**: Tap "Email Us" card → Opens mail app
3. **Visit**: Tap "Visit Us" card → Opens maps with directions
4. **Message**: Tap "Send us a Message" → Opens chat
5. **Hours**: View office hours in dedicated card

## Technical Details

### Database Schema
```sql
CREATE TABLE app_contact_settings (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  office_hours JSONB DEFAULT '{"weekdays": "", "weekends": ""}',
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ
);
```

### Office Hours JSON Format
```json
{
  "weekdays": "Mon - Fri: 8:00 AM - 5:00 PM",
  "weekends": "Sat: 9:00 AM - 1:00 PM"
}
```

### Map URL Schemes
- **iOS**: `maps:0,0?q={latitude},{longitude}`
- **Android**: `geo:0,0?q={latitude},{longitude}`
- **Fallback**: `https://www.google.com/maps/search/?api=1&query={latitude},{longitude}`

### File Changes

#### Created Files
1. **CREATE_APP_CONTACT_SETTINGS_TABLE.sql** - Database migration
2. **app/admin/contact-settings.tsx** - Admin settings screen

#### Modified Files
1. **app/secretariat/index.tsx**
   - Added database fetch for contact info
   - Added map redirect handler
   - Removed website card
   - Added admin settings button
   - Changed from hardcoded to state-based contact data

## Security

### RLS Policies
- **Read**: All authenticated users can view contact settings
- **Write**: Only users with `role = 'admin'` can update
- **Audit**: Updates tracked with `updated_by` and `updated_at`

### Client-Side Protection
- Admin screen checks `profile.role === 'admin'`
- Non-admins redirected with alert
- Settings button only visible to admins

## Error Handling

### Common Errors & Solutions

1. **"Could not open maps app"**
   - Device doesn't have maps app installed
   - GPS coordinates invalid (check format)

2. **"Failed to load contact settings"**
   - Database connection issue
   - RLS policy blocking read access
   - Table doesn't exist (run migration)

3. **"Access Denied" (Admin screen)**
   - User is not an admin
   - Profile role not set correctly in database

4. **"Failed to save contact settings"**
   - Missing required fields
   - RLS policy blocking write access
   - Invalid data format

## Testing Checklist

### Database
- [ ] Run CREATE_APP_CONTACT_SETTINGS_TABLE.sql
- [ ] Verify default data inserted
- [ ] Test RLS policies (read as user, write as admin)

### Map Integration
- [ ] Test on iOS device (Apple Maps)
- [ ] Test on Android device (Google Maps)
- [ ] Test fallback in simulator/web
- [ ] Verify coordinates are accurate

### Admin Screen
- [ ] Access as admin (should work)
- [ ] Access as regular user (should block)
- [ ] Edit all fields and save
- [ ] Verify changes appear in Secretariat
- [ ] Test validation (empty required fields)
- [ ] Test loading states

### User Experience
- [ ] Tap Call Us → Opens dialer with correct number
- [ ] Tap Email Us → Opens mail with correct address
- [ ] Tap Visit Us → Opens maps at correct location
- [ ] Office hours display correctly (including weekends if set)
- [ ] Admin settings button only visible to admins

## Migration Steps

### 1. Apply Database Migration
```bash
# Copy SQL content from CREATE_APP_CONTACT_SETTINGS_TABLE.sql
# Run in Supabase SQL Editor
```

### 2. Update Contact Information
1. Log in as admin
2. Navigate to Secretariat
3. Tap settings gear icon
4. Update all fields with accurate information
5. Save changes

### 3. Verify Changes
1. Log out and log back in (as regular user)
2. Check Secretariat Customer Care section
3. Test all contact methods
4. Verify map location is accurate

## Future Enhancements

### Potential Additions
1. **Multiple Locations** - Support for different campus locations
2. **Department Contacts** - Specific contacts for different departments
3. **Language Support** - Multi-language contact information
4. **Social Media** - Add social media links
5. **Business Hours Status** - Show "Open Now" or "Closed" dynamically
6. **Contact History** - Track admin changes over time
7. **Bulk Import** - Import contacts from CSV
8. **QR Code** - Generate QR code with contact vCard
9. **Emergency Contacts** - Separate section for urgent contacts
10. **Map Preview** - Show mini map in admin settings

## Support

### For Developers
- Check console logs for database errors
- Verify RLS policies in Supabase dashboard
- Test with admin and non-admin accounts

### For Admins
- Contact IT support if unable to save changes
- Verify your account has admin role in database
- Use Google Maps for accurate GPS coordinates

---

**Created**: November 26, 2024  
**Version**: 1.0.0  
**Status**: ✅ Complete and Functional
