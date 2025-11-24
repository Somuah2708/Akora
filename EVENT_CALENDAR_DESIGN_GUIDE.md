# 🎨 Event Calendar Visual Design Guide

## Color Palette

### Primary Colors
```
Blue Gradient Header:  #1E3A8A → #3B82F6
Upcoming Events:       #4169E1 → #5B7FE8
TBA Events:            #F59E0B → #FBBF24
Past Events:           #6B7280 → #9CA3AF
Success Badge:         #22C563
```

### Neutral Colors
```
Background:            #F5F7FA
Card Background:       #FFFFFF
Text Primary:          #1E293B
Text Secondary:        #64748B
Text Tertiary:         #94A3B8
Border:                #E2E8F0
Empty State:           #E5E7EB
```

## Component Hierarchy

```
┌─────────────────────────────────────────┐
│ HEADER (Blue Gradient)                  │
│  ├─ Back Button (Glass)                 │
│  ├─ Title: "OAA Secretariat"            │
│  ├─ Subtitle: "Events Calendar 2025"    │
│  └─ Add Button (Admin only, Glass)      │
├─────────────────────────────────────────┤
│ YEAR SELECTOR                            │
│  ├─ Previous Year (<)                   │
│  ├─ Current Year (2025)                 │
│  └─ Next Year (>)                       │
├─────────────────────────────────────────┤
│ STATS BAR                                │
│  ├─ Total Events: 24                    │
│  ├─ Upcoming: 8                         │
│  └─ TBA: 3                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CONTENT (Scrollable)                    │
│                                         │
│ Monthly Overview                         │
│ ┌──────────┐ ┌──────────┐              │
│ │ January  │ │ February │               │
│ │    5     │ │    3     │               │
│ │  Events  │ │  Events  │               │
│ │ • Event1 │ │ • Event1 │               │
│ │ • Event2 │ │ • Event2 │               │
│ └──────────┘ └──────────┘              │
│                                         │
│ ┌──────────┐ ┌──────────┐              │
│ │  March   │ │  April   │               │
│ │    2     │ │    0     │               │
│ │  Events  │ │  Events  │               │
│ │ • Event1 │ │ (Empty)  │               │
│ └──────────┘ └──────────┘              │
│                                         │
│ ... (8 more months)                     │
│                                         │
│ Upcoming Events (8)                     │
│ ┌─────────────────────────────────────┐│
│ │ 15 │ Alumni Homecoming              ││
│ │ JAN│ 6:00 PM • Main Campus          ││
│ │    │ [UPCOMING]                     ││
│ └─────────────────────────────────────┘│
│ ┌─────────────────────────────────────┐│
│ │ 22 │ Career Fair 2025               ││
│ │ FEB│ 9:00 AM • Student Center       ││
│ │    │ [UPCOMING]                     ││
│ └─────────────────────────────────────┘│
│                                         │
│ Details Coming Soon (3)                 │
│ ┌─────────────────────────────────────┐│
│ │  ? │ Annual Gala                    ││
│ │ TBA│ Details Coming Soon            ││
│ └─────────────────────────────────────┘│
│                                         │
│ Past Events (13)                        │
│ ┌─────────────────────────────────────┐│
│ │ 10 │ Networking Mixer               ││
│ │ NOV│ 7:00 PM • Downtown Hotel       ││
│ └─────────────────────────────────────┘│
│                                         │
│ [View All Past Events (8 more)]        │
│                                         │
└─────────────────────────────────────────┘
```

## Event Card Anatomy

### Upcoming Event Card (Blue)
```
┌──────────────────────────────────────────┐
│ ┌────┐                         [UPCOMING]│
│ │ 15 │ Alumni Homecoming               │
│ │ JAN│                         [Edit✎] │
│ └────┘                                   │
│        🕒 6:00 PM                        │
│        📍 Main Campus Auditorium         │
└──────────────────────────────────────────┘
```

### TBA Event Card (Amber)
```
┌──────────────────────────────────────────┐
│ ┌────┐                                   │
│ │ ?  │ Annual Fundraising Gala         │
│ │TBA │                         [Edit✎] │
│ └────┘                                   │
│        [Details Coming Soon]             │
└──────────────────────────────────────────┘
```

### Past Event Card (Gray)
```
┌──────────────────────────────────────────┐
│ ┌────┐                                   │
│ │ 10 │ Networking Mixer                │
│ │ NOV│                         [Edit✎] │
│ └────┘                                   │
│        🕒 7:00 PM                        │
│        📍 Downtown Hotel Ballroom        │
└──────────────────────────────────────────┘
```

## Month Card States

### With Events
```
┌──────────────────┐
│ January      [2] │ ← Upcoming badge
│                  │
│       12         │ ← Event count
│     Events       │
│                  │
│ • First Event    │ ← Preview (max 2)
│ • Second Event   │
│ +10 more         │
└──────────────────┘
```

### Empty Month
```
┌┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┐
┊   February       ┊ ← Dashed border
┊                  ┊
┊        0         ┊ ← Gray count
┊      Events      ┊
┊                  ┊
└┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┘
```

## Interactive States

### Buttons
```
Normal:   [Button] - Opacity 1.0
Pressed:  [Button] - Opacity 0.7 (activeOpacity)
Disabled: [Button] - Opacity 0.5, Gray
```

### Cards
```
Normal:   Shadow elevation 3, Border 1px
Hover:    Shadow elevation 5 (desktop)
Pressed:  Opacity 0.7, slight scale
```

### Month Filter Modal
```
┌────────────────────────────────────────┐
│ March Events                       [×] │
├────────────────────────────────────────┤
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Event Card 1                       │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Event Card 2                       │ │
│ └────────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

## Empty States

### No Events This Year
```
        ┌─────────┐
        │    📅   │ ← Calendar icon (80px)
        └─────────┘
        
   No Events for 2025
   
Check back later for upcoming events
   (or "Start by adding your first event")

        [+ Add Event] ← Admin only
```

### No Events This Month (in filter)
```
        ┌─────────┐
        │    📅   │ ← Calendar icon (48px)
        └─────────┘
        
   No events in March
```

## Typography Scale

```
H1 (Header Title):    26px / 700 / #FFFFFF
H2 (Section Title):   20px / 700 / #1E293B
H3 (Card Title):      17px / 700 / #FFFFFF
H4 (Month Title):     16px / 700 / #1E293B

Body Large:           15px / 400 / #64748B
Body:                 14px / 400 / #64748B
Body Small:           13px / 500 / rgba(255,255,255,0.95)

Label:                12px / 600 / #64748B
Label Small:          11px / 700 / #1E40AF
Caption:              10px / 800 / #FFFFFF

Stat Number:          28px / 800 / #FFFFFF
Month Number:         32px / 800 / #3B82F6
Date Day:             24px / 800 / #FFFFFF
```

## Spacing System

```
XXS:  4px   - Icon gaps, badge padding
XS:   8px   - Card internal spacing, gaps
SM:   12px  - Card margins, section spacing
MD:   16px  - Standard padding, button padding
LG:   20px  - Container padding, section margins
XL:   24px  - Section margins, modal padding
XXL:  32px  - Large empty state padding
XXXL: 80px  - Empty state vertical padding
```

## Shadow Specifications

```
Card Shadow:
  shadowColor: '#000'
  shadowOffset: { width: 0, height: 2 }
  shadowOpacity: 0.08
  shadowRadius: 12
  elevation: 3

Modal Shadow:
  shadowColor: '#000'
  shadowOffset: { width: 0, height: 4 }
  shadowOpacity: 0.1
  shadowRadius: 16
  elevation: 5

Button Shadow:
  shadowColor: '#3B82F6'
  shadowOffset: { width: 0, height: 4 }
  shadowOpacity: 0.3
  shadowRadius: 8
  elevation: 4
```

## Animation Guidelines

```
Screen Transitions:  300ms ease-in-out
Button Press:        150ms ease-out
Card Press:          200ms ease-out
Modal Open/Close:    250ms ease-in-out
Fade In:             300ms ease-in
Slide In:            350ms ease-out
```

## Responsive Breakpoints

```
Mobile (default):    < 768px
  - 2-column month grid
  - Full-width event cards
  - Stacked stats

Tablet:              768px - 1024px
  - 3-column month grid (future)
  - 2-column event cards (future)
  - Horizontal stats

Desktop:             > 1024px
  - 4-column month grid (future)
  - 2-column event cards (future)
  - Enhanced hover states
```

## Accessibility

```
Touch Targets:       44px × 44px minimum
Text Contrast:       WCAG AA compliant
Icon Size:           16-24px for visibility
Label Clarity:       Clear, descriptive labels
Screen Reader:       Semantic HTML elements
```

## Icon Usage

```
ArrowLeft:           24px - Navigation back
Plus:                24px - Add action
ChevronLeft/Right:   20px - Year navigation
Calendar:            48-80px - Empty states
Clock:               14px - Time indicator
MapPin:              14px - Location indicator
Edit3:               16px - Edit action
X:                   24px - Close/dismiss
```

## Best Practices

### DO ✅
- Use gradient backgrounds for visual hierarchy
- Show event status with color coding
- Display TBA events separately
- Provide quick admin edit access
- Show year-at-a-glance overview
- Use clear, descriptive labels

### DON'T ❌
- Overwhelm with too many filters
- Hide admin controls deep in menus
- Show past events before upcoming
- Use busy background patterns
- Overcrowd the month cards
- Mix event statuses without visual distinction

---

**Design System**: Material Design 3 + Custom
**Inspiration**: Eventbrite, LinkedIn Events, Notion
**Framework**: React Native with Expo
