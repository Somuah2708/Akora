# Package Expiry Automation

This folder contains the Supabase Edge Function for automatically expiring premium packages after 30 days.

## Setup Instructions

### 1. Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

### 2. Deploy the Edge Function
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy expire-packages
```

### 3. Set up Cron Schedule

In Supabase Dashboard → Database → Extensions → Enable `pg_cron`

Then run this SQL:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expiry function to run daily at midnight UTC
SELECT cron.schedule(
  'expire-packages-daily',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT net.http_post(
    url := 'YOUR_SUPABASE_URL/functions/v1/expire-packages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 4. Alternative: Using Supabase Cron Jobs

Go to Supabase Dashboard → Database → Cron Jobs → Create new job:

- **Job name**: `expire-packages-daily`
- **Schedule**: `0 0 * * *` (daily at midnight)
- **Command**: 
```sql
SELECT public.expire_packages();
```

## Manual Testing

You can test the function manually by running this SQL:

```sql
SELECT * FROM public.expire_packages();
```

This will return a list of users whose packages were expired.

## What It Does

The `expire_packages()` function:
1. Finds all users with `package_expires_at < NOW()`
2. Downgrades them to `free` tier
3. Logs the change in `package_history` table
4. Sends a notification to each affected user

## Monitoring

Check logs:
```sql
-- View recent package expirations
SELECT * FROM package_history 
WHERE reason = 'expiry' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check upcoming expirations
SELECT 
  p.id,
  p.email,
  p.package_tier,
  p.package_expires_at,
  (p.package_expires_at - NOW()) as time_remaining
FROM profiles p
WHERE package_expires_at IS NOT NULL
AND package_expires_at > NOW()
ORDER BY package_expires_at ASC;
```
