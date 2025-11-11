-- Create support_tickets table for alumni support requests
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  category_title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
  contact_preference TEXT NOT NULL DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone', 'both')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Add indexes for better query performance
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);

-- Enable Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view their own support tickets"
  ON support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own tickets
CREATE POLICY "Users can create support tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own open tickets (before admin takes action)
CREATE POLICY "Users can update their own open tickets"
  ON support_tickets
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status = 'open'
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND status = 'open'
  );

-- Policy: Admins can view all tickets
CREATE POLICY "Admins can view all support tickets"
  ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Admins can update any ticket
CREATE POLICY "Admins can update support tickets"
  ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Admins can delete tickets
CREATE POLICY "Admins can delete support tickets"
  ON support_tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_updated_at();

-- Create a view for support ticket statistics (admin use)
CREATE OR REPLACE VIEW support_ticket_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets,
  COUNT(*) FILTER (WHERE status = 'closed') AS closed_tickets,
  COUNT(*) FILTER (WHERE urgency = 'urgent') AS urgent_tickets,
  COUNT(*) FILTER (WHERE urgency = 'high') AS high_priority_tickets,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS tickets_last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS tickets_last_week,
  category,
  COUNT(*) AS total_by_category
FROM support_tickets
GROUP BY category;

-- Grant access to the view for admins
GRANT SELECT ON support_ticket_stats TO authenticated;

-- Create notification trigger for new tickets (optional - for real-time updates)
CREATE OR REPLACE FUNCTION notify_new_support_ticket()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_support_ticket',
    json_build_object(
      'ticket_id', NEW.id,
      'user_id', NEW.user_id,
      'category', NEW.category,
      'subject', NEW.subject,
      'urgency', NEW.urgency
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_ticket_notification
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_support_ticket();

-- Insert sample categories documentation
COMMENT ON TABLE support_tickets IS 'Alumni support request tickets with categories: academic, financial, career, wellness, legal, membership, networking, general';
COMMENT ON COLUMN support_tickets.urgency IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN support_tickets.contact_preference IS 'Preferred contact method: email, phone, both';
COMMENT ON COLUMN support_tickets.status IS 'Ticket status: open, in_progress, resolved, closed';
