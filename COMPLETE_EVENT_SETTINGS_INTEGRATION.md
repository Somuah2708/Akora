# Complete Event Settings Integration

## Problem
All admin settings (package pricing, bank details, MoMo details) were hardcoded in the user-facing event submission form. When admins updated settings in the admin panel, these changes weren't reflected to users.

## Solution
Made ALL event settings load dynamically from the `event_settings` database table:

### 1. Package Pricing (Already Fixed)
- ✅ Basic Price (GHS)
- ✅ Standard Price (GHS)
- ✅ Priority Price (GHS)
- ✅ Premium Price (GHS)

### 2. Bank Transfer Details (NOW FIXED)
- ✅ Bank Name
- ✅ Account Name
- ✅ Account Number

### 3. Mobile Money Details (NOW FIXED)
- ✅ Network (MTN/Vodafone/AirtelTigo)
- ✅ Number
- ✅ Account Name

---

## What Changed

### File: `app/events/index.tsx`

#### Added Payment Details State
```typescript
// Payment details from database
const [paymentDetails, setPaymentDetails] = useState({
  bankName: 'Access Bank',
  bankAccountName: 'Akora Events',
  bankAccountNumber: '1234567890',
  momoNetwork: 'MTN',
  momoNumber: '0244 123 456',
  momoAccountName: 'Akora Events',
});
```

#### Updated Load Function
```typescript
const loadPackagePricing = useCallback(async () => {
  // Now loads: pricing + bank details + momo details
  const { data } = await supabase
    .from('event_settings')
    .select('basic_price, standard_price, priority_price, premium_price, bank_name, bank_account_name, bank_account_number, momo_network, momo_number, momo_account_name')
    .limit(1)
    .maybeSingle();
    
  // Updates both pricing and payment details
  setPackagePricing({ ... });
  setPaymentDetails({ ... });
}, []);
```

#### Updated Payment UI
```jsx
{/* Bank Transfer - NOW DYNAMIC */}
<Text style={styles.detailValue}>{paymentDetails.bankName}</Text>
<Text style={styles.detailValue}>{paymentDetails.bankAccountName}</Text>
<Text style={styles.detailValue}>{paymentDetails.bankAccountNumber}</Text>

{/* MoMo - NOW DYNAMIC */}
<Text style={styles.detailValue}>{paymentDetails.momoNetwork}</Text>
<Text style={styles.detailValue}>{paymentDetails.momoNumber}</Text>
<Text style={styles.detailValue}>{paymentDetails.momoAccountName}</Text>
```

---

## How It Works

### Admin Flow
1. Admin opens **Events Admin Settings**
2. Admin updates:
   - Package pricing (Basic, Standard, Priority, Premium)
   - Bank details (Name, Account Name, Number)
   - MoMo details (Network, Number, Account Name)
3. Admin clicks **Save All Settings**
4. Data saved to `event_settings` table in database

### User Flow
1. User opens **Events** screen
2. App loads settings from database on mount
3. User clicks **Submit Event**
4. User sees package pricing with updated prices
5. User selects package tier
6. User scrolls to **Payment Options**
7. User sees:
   - Updated bank details for transfer
   - Updated MoMo details for mobile payment
8. User makes payment using current details
9. User uploads payment proof

---

## Testing

### Test 1: Pricing Update
1. ✅ Admin changes Premium price: 300 → 320
2. ✅ Admin saves settings
3. ✅ User reopens Events screen
4. ✅ User sees "Premium - GHS 320"

### Test 2: Bank Details Update
1. ✅ Admin changes Bank Name: "Access Bank" → "Ecobank Ghana"
2. ✅ Admin changes Account Number: "1234567890" → "0987654321"
3. ✅ Admin saves settings
4. ✅ User reopens Events screen
5. ✅ User sees updated bank details in payment section

### Test 3: MoMo Details Update
1. ✅ Admin changes Network: "MTN" → "Vodafone"
2. ✅ Admin changes Number: "0244 123 456" → "0205 987 654"
3. ✅ Admin saves settings
4. ✅ User reopens Events screen
5. ✅ User sees updated MoMo details in payment section

---

## Console Logs to Verify

### On Events Screen Load
```
[AkoraEvents] Loading package pricing and payment details from database...
[AkoraEvents] Loaded settings: {
  basic_price: 0,
  standard_price: 50,
  priority_price: 150,
  premium_price: 320,
  bank_name: "Ecobank Ghana",
  bank_account_name: "Akora Events",
  bank_account_number: "0987654321",
  momo_network: "Vodafone",
  momo_number: "0205 987 654",
  momo_account_name: "Akora Events"
}
[AkoraEvents] ✅ Package pricing and payment details updated
```

---

## Database Requirements

### Table: `event_settings`
Must have these columns:
- `basic_price` (NUMERIC)
- `standard_price` (NUMERIC)
- `priority_price` (NUMERIC)
- `premium_price` (NUMERIC)
- `bank_name` (TEXT)
- `bank_account_name` (TEXT)
- `bank_account_number` (TEXT)
- `momo_network` (TEXT)
- `momo_number` (TEXT)
- `momo_account_name` (TEXT)

### Run This If Not Setup
```sql
-- See COMPLETE_EVENT_SETTINGS_FIX.sql for full setup
```

---

## Benefits

### For Admins
- ✅ Update ALL payment details from one screen
- ✅ No need to edit code or redeploy
- ✅ Changes apply immediately to all users
- ✅ Can change bank accounts, pricing anytime

### For Users
- ✅ Always see current payment information
- ✅ Always pay correct package prices
- ✅ No confusion from outdated details
- ✅ Payments go to correct accounts

### For System
- ✅ Single source of truth (database)
- ✅ No hardcoded values
- ✅ Easy to maintain
- ✅ Consistent across app

---

## Complete Data Flow

```
┌─────────────────────┐
│  Admin Settings     │
│  Screen             │
│  - Edit pricing     │
│  - Edit bank        │
│  - Edit MoMo        │
│  - Click save       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase           │
│  event_settings     │
│  Table              │
│  - Single row       │
│  - All settings     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Events Screen      │
│  (User View)        │
│  - Load on mount    │
│  - Show pricing     │
│  - Show bank        │
│  - Show MoMo        │
└─────────────────────┘
```

---

## Summary

**Before**: Settings hardcoded → Admin updates ignored → Users see wrong info

**After**: Settings from database → Admin updates work → Users see current info

**Result**: Complete dynamic settings system for Events module 🎉
