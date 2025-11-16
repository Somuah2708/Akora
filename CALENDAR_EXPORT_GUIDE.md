# Calendar Export Integration Guide

## Quick Setup

Add this to your `app/events/[id].tsx` event detail screen:

### 1. Import the calendar export utility

```typescript
import { exportEventToCalendar } from '../../lib/ics-export';
import { Ionicons } from '@expo/vector-icons';
```

### 2. Add calendar export handler

```typescript
const handleAddToCalendar = async () => {
  try {
    await exportEventToCalendar({
      id: eventData.id,
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      organizer_name: eventData.organizer_name,
      organizer_email: eventData.organizer_email,
    });
    
    Alert.alert('Success', 'Event added to calendar!');
  } catch (error) {
    console.error('Calendar export error:', error);
    Alert.alert('Error', 'Failed to export event to calendar');
  }
};
```

### 3. Add button to UI (insert after share button)

```tsx
{/* Add to Calendar Button */}
<TouchableOpacity 
  style={styles.calendarButton} 
  onPress={handleAddToCalendar}
>
  <Ionicons name="calendar-outline" size={20} color="#4169E1" />
  <Text style={styles.calendarButtonText}>Add to Calendar</Text>
</TouchableOpacity>
```

### 4. Add styles

```typescript
calendarButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 12,
  paddingHorizontal: 20,
  backgroundColor: '#EBF0FF',
  borderRadius: 12,
  marginTop: 12,
},
calendarButtonText: {
  fontSize: 14,
  fontWeight: '700',
  color: '#4169E1',
},
```

## Installation Requirements

Install required packages:

```bash
npx expo install expo-file-system expo-sharing
```

## Features Included

✅ **Native Calendar Apps**: Works with Apple Calendar, Google Calendar, Outlook  
✅ **ICS Format**: Industry-standard calendar file format  
✅ **Auto-Fill**: Pre-fills title, date, location, description  
✅ **Organizer Info**: Includes organizer name and email  
✅ **Time Zones**: Handles UTC conversion automatically  
✅ **Special Characters**: Escapes commas, semicolons, newlines  

## Platform Support

- **iOS**: Opens system share sheet → User selects Calendar app
- **Android**: Opens file picker → User selects Calendar app
- **Web**: Falls back to Google Calendar URL

## Multiple Events Export

To export multiple events at once:

```typescript
import { exportMultipleEventsToCalendar } from '../../lib/ics-export';

const handleExportAll = async () => {
  await exportMultipleEventsToCalendar(eventsArray);
};
```

## Web Calendar Links

For web-based calendars (Google Calendar, Outlook.com):

```typescript
import { generateCalendarUrls } from '../../lib/ics-export';

const urls = generateCalendarUrls(eventData);

// Open Google Calendar
Linking.openURL(urls.google);

// Or Outlook
Linking.openURL(urls.outlook);
```

## Testing

1. Tap "Add to Calendar" button
2. System share sheet should open
3. Select "Calendar" or "Add to Calendar"
4. Event should appear in calendar app

## Troubleshooting

**Issue**: "Sharing is not available on this device"  
**Solution**: Ensure `expo-sharing` is installed and app has file access permissions

**Issue**: Event not showing in calendar  
**Solution**: Check that date format is valid ISO string (YYYY-MM-DDTHH:MM:SSZ)

**Issue**: Special characters appear broken  
**Solution**: Text is automatically escaped, but verify your event data doesn't have pre-escaped text

## Example Event Data Format

```typescript
{
  id: "uuid-123",
  title: "Tech Conference 2025",
  description: "Join us for an exciting day of innovation",
  location: "Accra International Conference Centre",
  start_date: "2025-06-15T09:00:00Z",
  end_date: "2025-06-15T17:00:00Z",
  organizer_name: "John Doe",
  organizer_email: "john@example.com"
}
```

## Production Checklist

- [ ] Installed `expo-file-system` and `expo-sharing`
- [ ] Imported `ics-export` utility
- [ ] Added calendar button to event detail screen
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] Added error handling
- [ ] Added success confirmation alert
