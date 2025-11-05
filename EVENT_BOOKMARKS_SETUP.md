# Event Bookmarks Setup Guide

## Database Setup Required

The saved events feature requires the `event_bookmarks` table in Supabase. Follow these steps:

### Step 1: Create the Table

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the SQL from `CREATE_EVENT_BOOKMARKS.sql`:

```sql
-- Create event_bookmarks table for saving events
CREATE TABLE IF NOT EXISTS public.event_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.products_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Disable RLS for testing with mock auth
ALTER TABLE public.event_bookmarks DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_event ON public.event_bookmarks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user ON public.event_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_created ON public.event_bookmarks(created_at DESC);
```

### Step 2: Verify the Table

Run this query to check if the table was created:

```sql
SELECT * FROM public.event_bookmarks LIMIT 10;
```

### How It Works

1. **Saving Events**: When a user clicks the bookmark icon in an event detail page, a record is inserted into `event_bookmarks`
2. **Loading Saved Events**: The saved-events page queries `event_bookmarks` joined with `products_services` to get full event details
3. **Removing Bookmarks**: Clicking the filled bookmark icon or the trash button removes the record

### Troubleshooting

If saved events don't show:

1. **Check if table exists**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'event_bookmarks';
   ```

2. **Check for saved bookmarks**:
   ```sql
   SELECT * FROM public.event_bookmarks;
   ```

3. **Check console logs**: Look for `[Saved Events]` logs in the browser/app console

4. **Verify user ID**: Make sure `user.id` is available when the query runs

### Foreign Key Structure

- `event_id` → References `products_services.id` (the event)
- `user_id` → References `profiles.id` (the user who saved it)

The UNIQUE constraint on `(event_id, user_id)` ensures a user can't bookmark the same event twice.
