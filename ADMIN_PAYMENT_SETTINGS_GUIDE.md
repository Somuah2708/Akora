# Admin Payment Settings Guide

## Overview
Admins can now manage payment details for donation campaigns, including bank transfer and multiple mobile money providers (MTN, Vodafone, AirtelTigo).

## Features

### 1. Payment Settings Screen (`/donation/payment-settings`)
A dedicated screen where admins can configure all payment methods with:
- **Toggle switches** for each payment method (enable/disable)
- **Optional fields** - disable methods you don't use
- **Real-time validation** - ensures required fields are filled for enabled methods
- **Color-coded sections** - MTN (yellow), Vodafone (red), AirtelTigo (green)

### 2. Bank Transfer Settings
- Bank Name (required if enabled)
- Account Name (required if enabled)
- Account Number (required if enabled)
- Branch (optional)
- Enable/Disable toggle

### 3. Mobile Money Settings

#### MTN Mobile Money
- MTN Number (required if enabled)
- Account Name (required if enabled)
- Enable/Disable toggle

#### Vodafone Cash
- Vodafone Number (required if enabled)
- Account Name (required if enabled)
- Enable/Disable toggle

#### AirtelTigo Money
- AirtelTigo Number (required if enabled)
- Account Name (required if enabled)
- Enable/Disable toggle

## How It Works

### For Admins:
1. **Access Payment Settings**:
   - Navigate to Admin Dashboard
   - Tap "Payment Settings" button below stats
   - Or go to `/donation/payment-settings`

2. **Configure Payment Methods**:
   - Toggle on/off payment methods you want to use
   - Fill in required details for enabled methods
   - Leave disabled methods empty (they won't show to users)
   - Tap "Save Payment Settings"

3. **Validation Rules**:
   - At least one payment method must be enabled
   - All required fields must be filled for enabled methods
   - Optional fields can be left empty

### For Users:
- Only **enabled payment methods** with complete details show in campaign detail screens
- Payment information is **dynamically loaded** from admin settings
- Users see only the methods admins have configured

## Database Structure

### Table: `admin_configs`
Payment settings are stored as key-value pairs:

**Bank Transfer:**
- `enable_bank_transfer` (boolean)
- `bank_name` (string)
- `bank_account_name` (string)
- `bank_account_number` (string)
- `bank_branch` (string, optional)

**MTN Mobile Money:**
- `enable_mtn` (boolean)
- `mtn_number` (string)
- `mtn_name` (string)

**Vodafone Cash:**
- `enable_vodafone` (boolean)
- `vodafone_number` (string)
- `vodafone_name` (string)

**AirtelTigo Money:**
- `enable_airteltigo` (boolean)
- `airteltigo_number` (string)
- `airteltigo_name` (string)

## Migration Script

Run `ADD_PAYMENT_SETTINGS.sql` to:
- Add new payment configuration keys
- Migrate existing `momo_number` and `momo_name` to MTN fields
- Set up default values for all providers

## Files Modified

1. **New Files:**
   - `app/donation/payment-settings.tsx` - Payment settings screen
   - `ADD_PAYMENT_SETTINGS.sql` - Database migration

2. **Updated Files:**
   - `app/donation/campaign/[id].tsx` - Dynamic payment info display
   - `app/donation/admin.tsx` - Added payment settings button

## Usage Examples

### Example 1: Bank Transfer Only
```
Enable: Bank Transfer
Disable: All mobile money options

Result: Users only see bank transfer details
```

### Example 2: MTN and Vodafone
```
Enable: MTN, Vodafone
Disable: Bank Transfer, AirtelTigo

Result: Users see MTN and Vodafone numbers only
```

### Example 3: All Payment Methods
```
Enable: Bank Transfer, MTN, Vodafone, AirtelTigo

Result: Users see all available payment methods
```

## Benefits

1. **Flexibility**: Enable only the payment methods you use
2. **No Empty Sections**: Disabled methods don't show to users
3. **Easy Updates**: Change payment details anytime without code changes
4. **Multiple Providers**: Support all major mobile money providers in Ghana
5. **Professional Display**: Color-coded sections with provider branding
6. **Validation**: Prevents incomplete or invalid payment configurations

## Admin Access

Only users with `is_admin = true` or `role = 'admin'` can:
- Access the payment settings screen
- View and modify payment configurations
- See the payment settings button in admin dashboard

## Notes

- Changes take effect immediately for all users
- No app restart required after updating settings
- Payment details are fetched fresh each time a campaign is viewed
- Old `momo_number` and `momo_name` fields are automatically migrated to MTN
