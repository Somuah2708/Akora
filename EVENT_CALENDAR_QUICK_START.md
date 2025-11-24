# 🚀 Event Calendar Quick Start Guide

## What's New?

The Event Calendar has been completely redesigned as a **year-based event planning system**. Perfect for showcasing all events happening throughout the year, including those with TBA dates.

## Key Concept

**Think of it like a yearbook for events** - administrators can list ALL events planned for the year, even if dates aren't confirmed yet. This gives alumni a complete picture of what's coming.

## For Administrators

### Adding Events

1. **Tap the + button** in the header
2. **Fill in details**:
   - Title (required)
   - Date (can be set to "TBA")
   - Time, Location, Description
   - Category, Pricing, Capacity
3. **Submit** - Event is automatically approved

### Editing Events

- **From Calendar**: Tap the ✎ (edit icon) on any event card
- **From Event Detail**: Navigate to event and tap edit

### Managing TBA Events

When you're not sure of exact dates:
1. Create the event with title and description
2. Leave date as "TBA" or use placeholder date
3. Event appears in "Details Coming Soon" section
4. Update with confirmed date later

### Best Practices

✅ **DO**:
- List all events for the year early (even TBA)
- Update TBA events as dates confirm
- Use clear, descriptive event titles
- Fill location info when available
- Set capacity for ticketed events

❌ **DON'T**:
- Wait until last minute to list events
- Leave important events undated
- Use vague titles like "Event 1"
- Forget to approve user-submitted events

## For Users

### Browsing Events

1. **See Year Overview**: 12-month grid shows event density
2. **Tap Any Month**: See all events in that month
3. **Check Upcoming**: See what's happening soon
4. **View TBA**: See what's planned but not dated yet

### Understanding Event Colors

- **Blue Cards**: Upcoming events (next 30 days)
- **Amber Cards**: Events with TBA dates
- **Gray Cards**: Past events

### Navigation

- **<** **>** buttons: Change year
- **Tap month card**: Filter to that month
- **Tap event card**: See full event details
- **X button**: Close month filter

## Quick Actions

### View All Events for a Year
1. Open Event Calendar
2. Use year selector to change year
3. Scroll through all sections

### Find Events in Specific Month
1. Open Event Calendar
2. Tap the month card (e.g., "March")
3. See all March events in modal

### Check What's Coming Up
1. Open Event Calendar
2. Scroll to "Upcoming Events" section
3. See next 10 upcoming events

### See Events Awaiting Details
1. Open Event Calendar
2. Scroll to "Details Coming Soon"
3. See all TBA events

## Database Setup

### First Time Setup

Run these SQL migrations in Supabase:

```bash
1. CREATE_SECRETARIAT_EVENTS_TABLE.sql
2. ADD_EVENT_INCREMENT_FUNCTIONS.sql
```

### Verify Setup

Check these exist in Supabase:
- ✅ Table: `secretariat_events`
- ✅ Table: `event_bookmarks`
- ✅ Table: `event_registrations`
- ✅ Table: `event_interests`
- ✅ Function: `increment_event_view_count`
- ✅ Function: `get_event_stats`

## Testing Checklist

### Admin Testing

- [ ] Create event for current year
- [ ] Create event with TBA date
- [ ] Edit event from calendar
- [ ] Change year and add event
- [ ] See event appear in correct month

### User Testing

- [ ] View current year events
- [ ] Navigate between years
- [ ] Filter by month
- [ ] View upcoming events
- [ ] View TBA events
- [ ] Navigate to event details

## Common Scenarios

### Scenario 1: Planning Next Year's Events

**Goal**: List all events for 2026 early in 2025

1. Tap year selector → Select 2026
2. Tap + button
3. Create events with TBA dates
4. Update dates as they're confirmed

### Scenario 2: Monthly Newsletter

**Goal**: Get all events for next month

1. Open Event Calendar
2. Tap next month's card
3. Screenshot or note all events
4. Use for newsletter content

### Scenario 3: Quarterly Planning

**Goal**: See event distribution across Q1

1. Open Event Calendar
2. Check January, February, March cards
3. Verify even distribution
4. Add events to balance quarters

### Scenario 4: Event Approval

**Goal**: Review and approve user-submitted event

1. Admin sees all events (approved + pending)
2. Find pending event in calendar
3. Tap edit icon
4. Mark as approved or reject

## Troubleshooting

### Events Not Showing

**Check**:
- Is event approved? (Non-admins only see approved)
- Is event in selected year?
- Is date valid? (Format: YYYY-MM-DD)

### Month Shows Wrong Count

**Check**:
- Month filter is cleared (tap X)
- Year is correct
- Browser cache (refresh app)

### Can't Edit Event

**Check**:
- Are you logged in as admin?
- Do you have admin role in profiles table?
- Is `profile.is_admin = true`?

### Year Navigation Not Working

**Check**:
- Network connection
- Supabase is online
- Check console for errors

## Performance Tips

### For Admins

- Create events in batches (10-20 at a time)
- Use templates for recurring events
- Update TBA events weekly
- Archive past years after 2 years

### For Users

- Year data is cached per session
- Switching years fetches fresh data
- Month filters are instant (client-side)
- Event details load on-demand

## Integration Points

### Works With

- `/create-event` - Event creation form
- `/events/[id]` - Event detail screen
- `/secretariat/my-events` - User's created events
- `/secretariat/saved-events` - Bookmarked events

### API Endpoints

```typescript
// Load events for year
GET /secretariat_events?date=gte.2025-01-01&date=lte.2025-12-31

// Create event
POST /secretariat_events

// Update event
PATCH /secretariat_events/:id

// Delete event
DELETE /secretariat_events/:id
```

## Advanced Usage

### Multi-Year Planning

1. View current year
2. Note gaps in schedule
3. Switch to next year
4. Plan events to fill gaps

### Event Analytics

Check month cards to see:
- Most active months
- Distribution across year
- Upcoming vs TBA ratio
- Total event count

### Content Planning

Use calendar to:
- Plan social media posts
- Schedule email campaigns
- Coordinate with other departments
- Avoid event conflicts

## Support

### Getting Help

1. Check `EVENT_CALENDAR_REDESIGN.md` for details
2. See `EVENT_CALENDAR_DESIGN_GUIDE.md` for design specs
3. Review `CREATE_SECRETARIAT_EVENTS_TABLE.sql` for database schema
4. Check browser console for errors

### Common Questions

**Q: Can users create events?**
A: Yes, but they require admin approval. Admin-created events auto-approve.

**Q: How many events can I list?**
A: No limit, but keep it reasonable (50-100 per year is typical).

**Q: Can events span multiple days?**
A: Yes, use start_date and end_date fields. Calendar shows start date.

**Q: Can I delete past events?**
A: Yes, admins can delete any event. Consider archiving instead.

**Q: What happens to events in other years?**
A: They're still in database, just filtered by year view.

## Success Metrics

After implementation, track:

📊 **Engagement**
- Events viewed per session
- Month filter usage
- Year navigation frequency

📈 **Content**
- Events per year
- TBA → Confirmed conversion rate
- Events per month average

👥 **User Behavior**
- Time spent on calendar
- Events clicked
- Return visit frequency

---

## Next Steps

1. ✅ Run SQL migrations
2. ✅ Test admin flow
3. ✅ Create first event
4. ✅ Test user view
5. ✅ Add events for full year
6. ✅ Share with team
7. ✅ Collect feedback
8. ✅ Iterate and improve

**You're ready to launch! 🎉**

---

**Last Updated**: November 24, 2025
**Version**: 2.0.0
**Support**: Check documentation files in project root
