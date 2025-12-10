# 🎯 Donation System Database Setup Guide

## ⚠️ IMPORTANT: Run in this exact order

### Step 1: Drop and Recreate Tables
Run this first to clean up and create fresh donation tables:
```bash
DROP_AND_RECREATE_DONATION_TABLES.sql
```

This will:
- ✅ Drop all old donation tables, triggers, functions, and policies
- ✅ Create fresh `donation_campaigns` table
- ✅ Create fresh `donations` table
- ✅ Create `donor_tiers` table with 5 recognition levels
- ✅ Set up RLS policies for security
- ✅ Create triggers for auto-updating campaign amounts
- ✅ Create indexes for performance

---

### Step 2: Create Storage Bucket
Run this to set up file storage for donation receipts:
```bash
CREATE_DONATION_STORAGE_BUCKET.sql
```

This will:
- ✅ Create `donation-proofs` storage bucket
- ✅ Set 5MB file size limit
- ✅ Allow JPEG, PNG, WEBP, PDF uploads
- ✅ Set up storage policies for user uploads
- ✅ Enable admin access to all receipts

---

### Step 3: Seed Sample Data (Optional)
Run this to populate with realistic Achimota School campaigns:
```bash
SEED_DONATION_CAMPAIGNS.sql
```

This will add 8 campaigns:
- Science Laboratory Complex (GH₵500,000)
- Full Scholarship Fund 2024 (GH₵200,000)
- Digital Learning Resources (GH₵150,000)
- Sports Complex Renovation (GH₵300,000)
- Library Expansion (GH₵120,000)
- Emergency Student Support (GH₵50,000)
- Music & Arts Center (GH₵250,000)
- Teacher Development Program (GH₵80,000)

---

## 📊 Database Schema Overview

### Tables Created:

#### 1. `donation_campaigns`
- Campaign details (title, description, goal, current amount)
- Category (Infrastructure, Scholarship, Equipment, etc.)
- Status (active, completed, cancelled)
- Deadline and donor count tracking

#### 2. `donations`
- Individual donation records
- Links to user and campaign
- Payment proof URL (receipt image)
- Status: pending → approved/rejected
- Anonymous option
- Admin notes for approval/rejection

#### 3. `donor_tiers`
- Recognition levels (Bronze → Diamond)
- Minimum amounts for each tier
- Benefits and badge styling

---

## 🔐 Security Features

✅ **Row Level Security (RLS)** enabled on all tables
✅ Users can only view their own donations
✅ Admins can view and manage all donations
✅ Anyone can view active campaigns
✅ Storage policies prevent unauthorized access

---

## ⚡ Automatic Features

✅ **Auto-update campaign amounts** when donations are approved
✅ **Auto-increment donor count** on approval
✅ **Auto-decrement** if approval is reversed
✅ **Timestamps** automatically updated
✅ **Progress tracking** calculated in real-time

---

## 🎨 Donation System Screens

All 4 screens are ready in your app:

1. **`/donation`** - Main hub with stats and campaigns
2. **`/donation/campaign/[id]`** - Campaign details with payment info
3. **`/donation/make-donation`** - Submit donation with receipt upload
4. **`/donation/my-donations`** - User's donation history and status

---

## 🚀 Next Steps

After running the SQL scripts:

1. ✅ Test the donation submission flow
2. ✅ Upload a test receipt
3. ✅ Create admin dashboard for approvals (optional)
4. ✅ Test anonymous donations
5. ✅ Verify campaign progress updates

---

## 📞 Support

If you encounter any issues:
- Check Supabase logs for detailed error messages
- Verify the `profiles` table has `is_admin` column
- Ensure storage bucket permissions are correct
- Confirm user authentication is working

---

## 🏆 Features Included

✅ Professional dark theme with gold accents
✅ Receipt upload (camera or gallery)
✅ Anonymous donation option
✅ Admin approval workflow
✅ Donor recognition system
✅ Progress tracking
✅ Real-time stats
✅ Payment instructions displayed
✅ Top donors hall of fame
✅ Recognition badges (Bronze → Diamond)

---

**Database is production-ready for Achimota School Alumni donations! 🎓**
