-- Simple in-app notifications (idempotent)
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_notif_user ON app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_app_notif_read ON app_notifications(read_at);

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users read own notifications') THEN
    CREATE POLICY "Users read own notifications" ON app_notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users insert own notifications') THEN
    CREATE POLICY "Users insert own notifications" ON app_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users update own notifications') THEN
    CREATE POLICY "Users update own notifications" ON app_notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Admin bypass (match other policies' pattern)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admins manage notifications') THEN
    CREATE POLICY "Admins manage notifications" ON app_notifications FOR ALL
    USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND COALESCE(p.role,'') IN ('admin','staff'))
    );
  END IF;
END$$;
