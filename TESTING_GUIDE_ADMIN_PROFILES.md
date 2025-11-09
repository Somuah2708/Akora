# 🧪 Quick Testing Guide - Admin Profiles

## Test 1: Verified Badge Visibility ✓

### Home Screen:
1. Open Home tab
2. Find an admin post
3. **Look next to admin name**
4. ✅ Should see blue checkmark badge

### Discover Screen:
1. Open Discover tab  
2. If any admin posts appear
3. **Look next to admin name**
4. ✅ Should see blue checkmark badge

### Comments:
1. Open any post (Home or Discover)
2. Tap comments icon
3. Find admin comment (if any)
4. **Look next to admin name**
5. ✅ Should see blue checkmark badge
6. Check nested replies too

## Test 2: Admin Profile Navigation

### From Home Screen:
1. Open Home tab
2. Find admin post
3. **Tap admin username**
4. ✅ Profile opens
5. **Tap back, then tap admin avatar**
6. ✅ Profile opens again

### From Comments:
1. Open comments
2. Find admin comment
3. **Tap admin username in comment**
4. ✅ Profile opens

## Test 3: Admin Profile Content

### What Should Show:
1. Open admin profile (from any method above)
2. ✅ **Verified badge** next to name at top
3. ✅ **Posts count** (e.g., "42 Posts")
4. ❌ **NO Friends count** (should be hidden)
5. ✅ **Bio section** (if admin has bio)
6. ❌ **NO About section** (should be completely hidden)
7. ✅ **Highlights** (if admin has any)
8. ✅ **Posts grid** below

### What Should NOT Show:
1. On admin profile page
2. ❌ Should NOT see "Add Friend" button
3. ❌ Should NOT see "Message" button
4. ❌ Should NOT see "Friends count"
5. ❌ Should NOT see "About" card

## Test 4: Regular User Profile (Control Test)

### Verify Normal Users Still Work:
1. Go to Discover tab
2. Find regular user post (NOT admin)
3. Tap their username
4. ✅ Should see both "Posts" and "Friends" counts
5. ✅ Should see "Add Friend" button
6. ✅ Should see "Message" button
7. ✅ Should see "About" section
8. ❌ Should NOT see verified badge

## Visual Comparison

### Admin Profile Should Look Like:
```
┌───────────────────────┐
│ ← Admin Name ✓     ⋮  │ ✓ Verified badge
├───────────────────────┤
│   [Profile Picture]    │
│                        │
│   📊 Posts: 42        │ ✓ Only posts
├───────────────────────┤
│ Admin Name ✓          │ ✓ Verified badge
│                        │
│ 📝 Bio                │ ✓ Shows
│ Official page...       │
├───────────────────────┤
│ ⭐ Highlights         │ ✓ Shows (if any)
├───────────────────────┤
│ 📸 Posts              │ ✓ Shows
└───────────────────────┘
```

### Regular Profile Should Look Like:
```
┌───────────────────────┐
│ ← User Name        ⋮  │ No badge
├───────────────────────┤
│   [Profile Picture]    │
│                        │
│ 📊 Posts: 15          │ Shows posts
│ 👥 Friends: 28        │ Shows friends
├───────────────────────┤
│ User Name             │ No badge
│                        │
│ 📝 Bio                │
│ 📋 About              │ Shows About
│ ⭐ Interests          │
├───────────────────────┤
│ 💬 Message            │ Shows buttons
│ ➕ Add Friend         │
└───────────────────────┘
```

## Quick Checklist

### ✅ Admin Features:
- [ ] Blue verified badge on posts
- [ ] Blue verified badge on comments
- [ ] Blue verified badge on profile
- [ ] Profile opens when tapping name/avatar
- [ ] Shows posts count
- [ ] Shows bio
- [ ] Shows highlights
- [ ] Shows posts grid

### ❌ Admin Restrictions:
- [ ] No Friends count
- [ ] No About section
- [ ] No Add Friend button
- [ ] No Message button

### ✅ Regular User Features (Should Still Work):
- [ ] NO verified badge (unless admin)
- [ ] Shows Posts AND Friends count
- [ ] Shows Bio AND About
- [ ] Shows Add Friend button
- [ ] Shows Message button
- [ ] Can add as friend
- [ ] Can message them

## Common Issues & Solutions

### Issue: "Verified badge not showing"
**Solution:** Check if user has `is_admin: true` in profiles table

### Issue: "Can still add admin as friend"
**Solution:** Clear app cache and restart

### Issue: "Friends count still shows for admin"
**Solution:** Verify profile has `is_admin: true` field

### Issue: "About section shows for admin"
**Solution:** Check the conditional wrapping in code

### Issue: "Regular users show verified badge"
**Solution:** They might actually be admins! Check database

## 🎯 Success Criteria

All these should be TRUE:
- [x] Admin posts have verified badge ✓
- [x] Admin comments have verified badge ✓
- [x] Admin profiles have verified badge ✓
- [x] Admin profiles open from Home screen
- [x] Admin profiles show ONLY posts count
- [x] Admin profiles hide Friends count
- [x] Admin profiles hide About section
- [x] Admin profiles hide Add Friend button
- [x] Admin profiles hide Message button
- [x] Admin profiles show Bio, Highlights, Posts
- [x] Regular user profiles unaffected
- [x] Regular users can still add friends
- [x] Instagram-style official page look

## 📸 Test Screenshots To Take

1. **Home screen post with verified badge**
2. **Admin comment with verified badge**
3. **Admin profile page (showing restrictions)**
4. **Regular user profile (showing buttons)**
5. **Side-by-side comparison of admin vs regular profile**

## 🎊 Expected Result

**Admin profiles should feel like Instagram official/business pages:**
- Professional with verified badge
- Informational (posts, bio, highlights)
- Not social (no friend requests)
- Clean and focused

**Regular profiles should feel like Instagram personal accounts:**
- Social (add friends, message)
- Personal info (about, interests)
- Interactive (buttons and counts)
- Complete social features
