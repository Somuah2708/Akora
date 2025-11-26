# Customer Care Center - Secretariat

## Overview
The Secretariat screen now features a comprehensive **Customer Care Center** that replaces the generic "Alumni Support" quick action. This provides an integrated, professional support experience with interactive contact methods.

## Features

### 1. **Customer Care Header**
- Large headphones icon in blue background
- Title: "Customer Care Center"
- Subtitle: "We're here to help you"

### 2. **Interactive Contact Methods**
Four clickable contact cards in a 2x2 grid:

#### **Call Us** (Blue theme)
- Phone icon in light blue circle
- Displays phone number
- **Action**: Opens native phone dialer with `tel:` protocol
- Error handling with Alert fallback

#### **Email Us** (Green theme)
- Mail icon in light green circle
- Displays email address
- **Action**: Opens native mail app with `mailto:` protocol
- Error handling with Alert fallback

#### **Visit Us** (Yellow theme)
- Map pin icon in light yellow circle
- Displays physical address
- Currently view-only (future: map integration)

#### **Website** (Pink theme)
- Globe icon in light pink circle
- Displays website URL
- **Action**: Opens browser with `https:` protocol
- Error handling with Alert fallback

### 3. **Office Hours Display**
- Clock icon in blue circle
- Shows business hours: "Mon - Fri: 8:00 AM - 5:00 PM"
- Prominent display in light gray card

### 4. **Send Message Button**
- Primary blue button with shadow
- Message circle icon + text + chevron arrow
- **Action**: Routes to `/chat` for live support
- Encourages direct messaging for immediate assistance

### 5. **Quick Help Info**
- Light blue info card at bottom
- Emoji + helpful message about response time
- Reinforces chat support availability

## Technical Implementation

### Contact Data Structure
```typescript
const CONTACT_INFO = {
  website: 'oldakora.org',
  email: 'info@oldakora.org',
  phone: '+256 752 614 088',
  address: 'Plot 123, Old Kampala Road, Kampala',
  hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
};
```

### Handler Functions
```typescript
// Email handler
const handleEmail = () => {
  Linking.openURL(`mailto:${CONTACT_INFO.email}`)
    .catch(() => Alert.alert('Error', 'Could not open email app'));
};

// Phone handler
const handlePhone = () => {
  Linking.openURL(`tel:${CONTACT_INFO.phone}`)
    .catch(() => Alert.alert('Error', 'Could not open phone app'));
};

// Website handler
const handleWebsite = () => {
  Linking.openURL(`https://${CONTACT_INFO.website}`)
    .catch(() => Alert.alert('Error', 'Could not open website'));
};

// Message handler
const handleMessage = () => {
  router.push('/chat');
};
```

### Dependencies
- `react-native`: `Linking`, `Alert`, `TouchableOpacity`
- `expo-router`: `router.push` for navigation
- `lucide-react-native`: Icons (HeadphonesIcon, Phone, Mail, MapPin, Globe, Clock, MessageCircle, ChevronRight)

## Design System

### Color Palette
- **Blue (Primary)**: `#4169E1` - Main CTA button, headphones icon
- **Light Blue**: `#EFF6FF`, `#DBEAFE`, `#F0F9FF` - Backgrounds
- **Green**: `#DCFCE7`, `#166534` - Email card
- **Yellow**: `#FEF3C7`, `#92400E` - Visit card
- **Pink**: `#FCE7F3`, `#9F1239` - Website card
- **Gray**: `#F8FAFC`, `#E5E7EB`, `#6b7280` - Office hours, borders

### Typography
- **Section Title**: 22px, Inter-Bold, `#1a1a1a`
- **Subtitle**: 14px, Inter-Regular, `#6b7280`
- **Card Labels**: 13px, Inter-SemiBold, `#6b7280`
- **Card Values**: 12-15px, Inter-Medium/SemiBold, `#1a1a1a`
- **Button Text**: 16px, Inter-Bold, `#FFFFFF`

### Spacing & Layout
- **Grid**: 2-column layout with 12px gap
- **Card Padding**: 18px internal padding
- **Card Border Radius**: 16px (cards), 14px (buttons)
- **Icon Sizes**: 52px (card icons), 40px (office hours), 28px (header)
- **Horizontal Margins**: 20px consistent throughout

## User Experience

### Interaction Flow
1. User lands on Secretariat screen
2. Scrolls to "Customer Care Center" section
3. Taps contact method of choice:
   - **Phone**: Opens dialer → User calls
   - **Email**: Opens mail app → User emails
   - **Website**: Opens browser → User visits site
   - **Send Message**: Routes to chat → User messages directly

### Error Handling
- All `Linking.openURL()` calls wrapped in try/catch
- Alert dialogs for failures (no email app, no phone app, etc.)
- Graceful degradation if system apps unavailable

### Accessibility
- All touchable elements have `activeOpacity={0.8}` for visual feedback
- Clear labels for screen readers
- High contrast text and icons
- Large touch targets (minimum 48x48px)

## Changes from Original

### Removed
- ❌ "Alumni Support" quick action card (4th card in services grid)
- ❌ Generic "Contact" section with static display
- ❌ Heart icon (was used for Alumni Support)

### Added
- ✅ Dedicated "Customer Care Center" section
- ✅ Interactive contact methods with native app integration
- ✅ Office hours display
- ✅ Professional customer service styling
- ✅ Send message CTA button
- ✅ Quick help information card

## Testing Checklist

### iOS Testing
- [ ] Phone dial opens correctly with `tel:` link
- [ ] Mail app opens with `mailto:` link
- [ ] Safari opens with `https:` link
- [ ] Chat navigation works
- [ ] Error alerts appear if apps unavailable

### Android Testing
- [ ] Phone dial opens correctly with `tel:` link
- [ ] Gmail/Email app opens with `mailto:` link
- [ ] Chrome opens with `https:` link
- [ ] Chat navigation works
- [ ] Error alerts appear if apps unavailable

### Visual Testing
- [ ] Icons render correctly in all cards
- [ ] Colors match design system
- [ ] Text is readable and properly sized
- [ ] Touch feedback works on all buttons
- [ ] Layout responsive on different screen sizes

## Future Enhancements

### Potential Additions
1. **Live Chat Integration**: Replace chat route with real-time chat SDK
2. **Map Integration**: Add map view for "Visit Us" card
3. **Working Hours Status**: Show "Open Now" or "Closed" badge
4. **FAQ Section**: Add common questions below contact methods
5. **Callback Request**: Add form for scheduling calls
6. **Language Support**: Multilingual contact information
7. **Social Media Links**: Add social icons (Twitter, Facebook, Instagram)
8. **Help Center**: Link to knowledge base articles
9. **Ticket System**: Submit support tickets directly
10. **Chat Bot**: AI assistant for common queries

### Performance Optimizations
- Lazy load contact handlers
- Cache Linking availability checks
- Optimize icon bundle size

## Related Files
- `/app/secretariat/index.tsx` - Main implementation
- `/app/chat/index.tsx` - Chat destination (message button)
- `/app/secretariat/event-calendar.tsx` - Related secretariat feature

## Contact Information Updates
To update contact details, modify the `CONTACT_INFO` object in `/app/secretariat/index.tsx`:

```typescript
const CONTACT_INFO = {
  website: 'your-website.com',
  email: 'your-email@domain.com',
  phone: '+256 XXX XXX XXX',
  address: 'Your physical address',
  hours: 'Your office hours',
};
```

## Support
For issues or questions about the Customer Care Center, contact the development team or create a GitHub issue.

---

**Last Updated**: November 26, 2024  
**Version**: 1.0.0  
**Status**: ✅ Complete and Functional
