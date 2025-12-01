# Enable Real-time DELETE Events for Messages

## Problem
When messages are deleted, the real-time listener doesn't receive DELETE events because the tables don't have the proper REPLICA IDENTITY setting.

## Solution
Run the following SQL commands in your Supabase SQL Editor:

### Step 1: Set REPLICA IDENTITY to FULL

This allows DELETE events to include the old row data (like the message ID) so clients can identify which message to remove.

```sql
ALTER TABLE direct_messages REPLICA IDENTITY FULL;
ALTER TABLE group_messages REPLICA IDENTITY FULL;
```

### Step 2: Verify Real-time is enabled

Check that real-time replication is enabled for these tables:

```sql
-- Check current replica identity setting
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN relreplident = 'd' THEN 'DEFAULT (primary key only)'
        WHEN relreplident = 'f' THEN 'FULL (all columns)'
        WHEN relreplident = 'i' THEN 'INDEX'
        WHEN relreplident = 'n' THEN 'NOTHING'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE c.relname IN ('direct_messages', 'group_messages');
```

### Step 3: Enable Real-time in Supabase Dashboard (if needed)

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Find `direct_messages` and `group_messages` tables
4. Make sure they are enabled for replication
5. Specifically ensure **DELETE** events are checked

## Alternative: Via Supabase Dashboard

If SQL doesn't work, you can also:

1. Go to **Database** → **Replication**
2. Find `direct_messages` table → Click to manage
3. Enable all events: **INSERT**, **UPDATE**, **DELETE**
4. Repeat for `group_messages` table
5. Save changes

## Testing

After applying these changes:

1. Send a message from Device A to Device B
2. Keep both chat screens open
3. Long-press and unsend the message from Device A
4. The message should immediately disappear from Device B without refreshing

## Notes

- `REPLICA IDENTITY FULL` means all columns are included in replication logs
- This is necessary for DELETE events to work properly
- The change takes effect immediately, no restart needed
