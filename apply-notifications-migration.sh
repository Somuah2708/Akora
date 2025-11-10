#!/bin/bash

# Apply notifications system migration
# Run this script to create the notifications system in your Supabase database

echo "🔔 Applying Notifications System Migration..."
echo ""
echo "Please run the CREATE_NOTIFICATIONS_SYSTEM.sql file in your Supabase SQL Editor"
echo ""
echo "Steps:"
echo "1. Open Supabase Dashboard"
echo "2. Go to SQL Editor"
echo "3. Copy contents of CREATE_NOTIFICATIONS_SYSTEM.sql"
echo "4. Paste and execute"
echo ""
echo "This will create:"
echo "  ✓ notifications table"
echo "  ✓ RLS policies for privacy"
echo "  ✓ Helper functions (get_unread_count, mark_all_read)"
echo "  ✓ create_notification function with duplicate prevention"
echo "  ✓ Triggers for automatic notifications on:"
echo "    - Post likes"
echo "    - Post comments"
echo "    - Friend requests"
echo "    - Friend request acceptance"
echo ""
echo "After running the SQL, your Instagram-style notifications will be fully functional!"
