#!/bin/bash

# Apply migration script
# This will apply the auth system migration to your Supabase database

echo "Applying authentication system migration..."
echo ""
echo "Please run this SQL in your Supabase SQL Editor:"
echo "https://eclpduejlabiazblkvgh.supabase.co/project/_/sql"
echo ""

cat supabase/migrations/20251227000007_setup_auth_system.sql

echo ""
echo ""
echo "After running the SQL, press any key to continue..."
read -n 1 -s
echo "Migration should now be applied!"
