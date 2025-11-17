# Event RSVP System Setup Guide

## Overview
This document explains the RSVP system implementation for Akora Events and how to set it up properly.

## Database Setup

### Step 1: Create the event_rsvps table
Run the SQL migration file: `CREATE_EVENT_RSVPS_TABLE.sql`

This will:
1. Create the `event_rsvps` table
2. Set up proper indexes for performance
3. Enable Row Level Security (RLS)
4. Create RLS policies for secure access
5. Add helper functions for counting RSVPs
6. Add `view_count` column to `akora_events` table if missing

### Step 2: Verify the table structure
```sql
-- Check if the table exists
SELECT * FROM event_rsvps LIMIT 1;

-- Check the schema
\d event_rsvps
```

## How the RSVP System Works

### 1. RSVP Storage
- RSVPs are stored in the `event_rsvps` table, NOT in the `akora_events` table
- Each RSVP has: event_id, user_id, status ('attending', 'maybe', 'not_attending')
- Users can only have one RSVP per event (enforced by UNIQUE constraint)

### 2. RSVP Counting
- RSVP counts are calculated in real-time from the `event_rsvps` table
- The count query filters by `status = 'attending'` to show actual attendees
- No need to manually update event records

### 3. Code Implementation

#### Event Detail Screen (app/events/[id].tsx)
```typescript
// Load RSVP count
const loadRsvpCount = async () => {
  const { count } = await supabase
    .from('event_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'attending');
    
  setRsvpCount(count || 0);
};

// Handle RSVP
const handleRsvp = async (status: 'attending' | 'maybe' | 'not_attending') => {
  if (rsvpId) {
    // Update existing RSVP
    await supabase
      .from('event_rsvps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', rsvpId);
  } else {
    // Create new RSVP
    await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: user.id, status });
  }
  
  loadRsvpCount(); // Refresh count
};
```

#### Admin Dashboard (app/events/admin.tsx)
```typescript
// Load events with RSVP counts
const eventsWithRsvps = await Promise.all(
  events.map(async (event) => {
    const { count } = await supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'attending');
    
    return { ...event, rsvp_count: count || 0 };
  })
);
```

## Features

### User Features
- ✅ View current RSVP count for any event
- ✅ RSVP with three options: Attending, Maybe, Can't Go
- ✅ Change RSVP status at any time
- ✅ See capacity warnings when event is nearly full
- ✅ Visual feedback for active RSVP status

### Admin Features
- ✅ View total RSVPs across all events
- ✅ See RSVP count per event in admin dashboard
- ✅ Track engagement metrics (views vs RSVPs)
- ✅ Monitor event performance

## Capacity Management

Events can have optional capacity limits:
- If capacity is set, users see warnings when 80% full
- At 100% capacity, new RSVPs are blocked
- Current formula: `(rsvp_count / capacity) * 100`

## Testing the System

### 1. Test RSVP Creation
```typescript
// As a user, click "Attending" button
// Check database:
SELECT * FROM event_rsvps WHERE user_id = 'your-user-id';
```

### 2. Test RSVP Count
```typescript
// Check count matches UI
SELECT COUNT(*) FROM event_rsvps 
WHERE event_id = 'event-id' AND status = 'attending';
```

### 3. Test RSVP Update
```typescript
// Change from "Attending" to "Maybe"
// Verify in database:
SELECT status FROM event_rsvps 
WHERE user_id = 'your-user-id' AND event_id = 'event-id';
```

## Troubleshooting

### Error: Column "rsvp_count" does not exist
**Solution**: Run the `CREATE_EVENT_RSVPS_TABLE.sql` migration. The RSVP count is now calculated from the `event_rsvps` table, not stored in `akora_events`.

### RSVP count not updating
**Solution**: Check that `loadRsvpCount()` is called after RSVP changes:
```typescript
await handleRsvp('attending');
loadRsvpCount(); // This should be called
```

### Permission errors
**Solution**: Verify RLS policies are in place:
```sql
SELECT * FROM pg_policies WHERE tablename = 'event_rsvps';
```

### Performance issues with many events
**Solution**: Indexes are created automatically, but you can verify:
```sql
-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'event_rsvps';
```

## Database Functions

### increment_event_views(event_id)
Increments the view count for an event.

```sql
SELECT increment_event_views('event-id');
```

### get_event_rsvp_count(event_id, status)
Gets the RSVP count for an event with a specific status.

```sql
SELECT get_event_rsvp_count('event-id', 'attending');
```

## Security

- RLS ensures users can only modify their own RSVPs
- View permissions are public (anyone can see RSVP counts)
- Admin functions use SECURITY DEFINER for elevated permissions
- Unique constraint prevents duplicate RSVPs

## Performance Considerations

1. **Indexes**: Automatically created on event_id, user_id, and status
2. **Caching**: Consider implementing client-side caching for RSVP counts
3. **Batch Loading**: Admin dashboard loads RSVPs in parallel using Promise.all()
4. **Count Optimization**: Using `{ count: 'exact', head: true }` for efficient counting

## Future Enhancements

- [ ] Email notifications for RSVP confirmations
- [ ] Export attendee lists for organizers
- [ ] Check-in system for events
- [ ] Waitlist feature for full events
- [ ] RSVP reminders before event starts
- [ ] Analytics dashboard for RSVP trends

## Support

If you encounter any issues:
1. Check Supabase logs for database errors
2. Verify the SQL migration ran successfully
3. Ensure RLS policies are enabled
4. Check that auth.users table exists and has proper permissions
