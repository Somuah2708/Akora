# 🎯 Quick Testing Guide - Profile Navigation

## Test Flow 1: Discover Screen Posts → Profile
1. Open Discover tab
2. Find a post from another user
3. **Tap the username** (above the post)
4. ✅ Profile opens
5. See "Add Friend" button
6. Tap "Add Friend"
7. ✅ Status changes to "Pending"

## Test Flow 2: Comments → Profile
1. Open any post (Home or Discover)
2. Tap comments icon
3. Find a comment from another user
4. **Tap the commenter's avatar or username**
5. ✅ Profile opens
6. Can add friend even if you've never interacted

## Test Flow 3: Home Screen (Admin Posts)
1. Open Home tab
2. See admin posts
3. **Tap admin username/avatar**
4. ❌ Nothing happens (static - correct!)
5. Scroll to comments
6. **Tap a regular user's comment username/avatar**
7. ✅ Profile opens
8. Can add that user as friend

## Test Flow 4: Accept Friend Request
1. User A sends request to User B
2. User B opens profile and sees "Accept" button
3. User B taps "Accept"
4. ✅ Status changes to "Friends" (green)
5. Both users can now message each other

## Test Flow 5: Message Button
1. Visit any user's profile
2. Tap blue "Message" button
3. ✅ Opens direct message chat
4. Can send messages

## Visual States

### Friend Button States:
```
┌─────────────────────┐
│  + Add Friend       │  ← Blue (tap to send request)
└─────────────────────┘

┌─────────────────────┐
│  ⏱ Pending          │  ← Orange (request sent)
└─────────────────────┘

┌─────────────────────┐
│  + Accept           │  ← Blue (tap to accept)
└─────────────────────┘

┌─────────────────────┐
│  ✓ Friends          │  ← Green (already friends)
└─────────────────────┘
```

## Where Profiles Open From:

### ✅ Tappable:
- Discover post usernames
- Discover post avatars
- Comment usernames (any screen)
- Comment avatars (any screen)
- Reply usernames (nested)
- Reply avatars (nested)

### ❌ Not Tappable:
- Home screen admin usernames
- Home screen admin avatars

## Expected Behavior:

### Scenario A: Stranger's Profile
1. See user in Discover
2. Tap username → Profile
3. Button shows "Add Friend"
4. Tap → Request sent
5. Button shows "Pending"

### Scenario B: Someone Who Added You
1. They sent you a request
2. Tap their comment/post
3. Button shows "Accept"
4. Tap → Now friends
5. Button shows "Friends"

### Scenario C: Already Friends
1. Tap friend's username anywhere
2. Profile opens
3. Button shows "Friends" (green, disabled)
4. Can tap "Message" to chat

### Scenario D: Admin Post (Home)
1. See admin post
2. Tap admin name/avatar
3. Nothing happens (static)
4. Read comments
5. Tap regular user comment
6. Profile opens normally

## 🐛 Troubleshooting

### "Profile doesn't open"
- Check if you tapped username or avatar (not empty space)
- Ensure you're not tapping admin on Home screen

### "Add Friend button doesn't work"
- Check internet connection
- Ensure you're logged in
- Check if already sent request (should show "Pending")

### "Can't message"
- Ensure both users have accounts
- Check if user has blocked messages
- Try refreshing the app

## ✅ Success Criteria

All of these should work:
- [ ] Discover post usernames open profiles
- [ ] Discover post avatars open profiles
- [ ] Comment usernames open profiles (Home & Discover)
- [ ] Comment avatars open profiles (Home & Discover)
- [ ] Reply usernames open profiles
- [ ] Reply avatars open profiles
- [ ] Add Friend button sends requests
- [ ] Accept button accepts requests
- [ ] Message button opens chat
- [ ] Home admin posts DON'T open profiles
- [ ] Friend status shows correctly

## 📝 Notes

- Navigation uses expo-router: `/user-profile/[userId]`
- Friend system uses existing `friends` and `friend_requests` tables
- Comments work for both Home and Discover screens
- Nested replies also support profile navigation
- Admin protection only applies to Home screen posts
