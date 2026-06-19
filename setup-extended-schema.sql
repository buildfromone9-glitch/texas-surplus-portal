-- =============================================================================
-- Vorvo Services - Extended Database Schema
-- =============================================================================
-- 
-- This file contains additional tables and columns for future functionality.
-- These are NOT YET APPLIED to the production database.
-- Run these migrations when ready to enable the new features.
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PAYMENTS TABLE
-- -----------------------------------------------------------------------------
-- Tracks all payment transactions across all divisions

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Related record
  quote_id UUID REFERENCES property_quotes(id) ON DELETE SET NULL,
  agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
  wholesale_lead_id UUID REFERENCES wholesale_leads(id) ON DELETE SET NULL,
  
  -- Stripe integration
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, authorized, captured, succeeded, failed, refunded, disputed
  
  -- Refund tracking
  refund_amount_cents INTEGER,
  refund_reason TEXT,
  refunded_at TIMESTAMPTZ,
  
  -- Fee tracking
  application_fee_cents INTEGER,
  platform_fee_cents INTEGER,
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  captured_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'authorized', 'captured', 'succeeded', 'failed', 'refunded', 'disputed', 'cancelled')
  )
);

CREATE INDEX idx_payments_quote_id ON payments(quote_id);
CREATE INDEX idx_payments_agreement_id ON payments(agreement_id);
CREATE INDEX idx_payments_wholesale_lead_id ON payments(wholesale_lead_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- -----------------------------------------------------------------------------
-- 2. PROVIDERS TABLE
-- -----------------------------------------------------------------------------
-- Manages service providers (contractors) for labor services

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business info
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Service configuration
  services TEXT[] NOT NULL DEFAULT '{}',
  -- Services: 'moving', 'junk', 'pressure', 'yard'
  
  service_radius_miles INTEGER DEFAULT 30,
  
  -- Availability
  active BOOLEAN DEFAULT true,
  available_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  available_hours_start TIME DEFAULT '08:00:00',
  available_hours_end TIME DEFAULT '18:00:00',
  
  -- Performance metrics
  rating NUMERIC(3,2) DEFAULT 5.0,
  total_jobs_completed INTEGER DEFAULT 0,
  total_jobs_cancelled INTEGER DEFAULT 0,
  average_response_time_minutes INTEGER,
  
  -- Payment info
  stripe_account_id TEXT,
  bank_account_last4 TEXT,
  payment_terms TEXT DEFAULT 'net_7',
  
  -- Insurance & credentials
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiration_date DATE,
  license_number TEXT,
  license_state TEXT,
  
  -- Internal notes
  internal_notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_job_at TIMESTAMPTZ
);

CREATE INDEX idx_providers_active ON providers(active);
CREATE INDEX idx_providers_services ON providers USING GIN(services);
CREATE INDEX idx_providers_location ON providers(city, state);
CREATE INDEX idx_providers_rating ON providers(rating);

-- -----------------------------------------------------------------------------
-- 3. COMMUNICATIONS TABLE
-- -----------------------------------------------------------------------------
-- Logs all communications with clients and providers

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Related record
  related_id UUID NOT NULL,
  related_type TEXT NOT NULL,
  -- Types: 'agreement', 'quote', 'wholesale_lead', 'provider'
  
  -- Communication details
  type TEXT NOT NULL,
  -- Types: 'email', 'sms', 'phone', 'note'
  
  direction TEXT NOT NULL,
  -- Directions: 'inbound', 'outbound'
  
  -- Content
  subject TEXT,
  content TEXT,
  
  -- Contact info
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  
  -- External tracking
  external_id TEXT,
  -- For emails: Resend message ID
  -- For SMS: Twilio message SID
  
  status TEXT DEFAULT 'sent',
  -- Status values: 'queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  CONSTRAINT valid_type CHECK (type IN ('email', 'sms', 'phone', 'note')),
  CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT valid_status CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'cancelled'))
);

CREATE INDEX idx_communications_related ON communications(related_id, related_type);
CREATE INDEX idx_communications_type ON communications(type);
CREATE INDEX idx_communications_created_at ON communications(created_at);

-- -----------------------------------------------------------------------------
-- 4. NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
-- Stores notifications for admin and future client/provider dashboards

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID,
  -- Null for broadcast notifications
  recipient_type TEXT NOT NULL DEFAULT 'admin',
  -- Types: 'admin', 'client', 'provider'
  
  -- Related record
  related_id UUID,
  related_type TEXT,
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  -- Types: 'info', 'success', 'warning', 'error', 'action_required'
  
  -- Action
  action_url TEXT,
  action_text TEXT,
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  
  -- Email/SMS delivery
  emailed BOOLEAN DEFAULT false,
  emailed_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT valid_recipient_type CHECK (recipient_type IN ('admin', 'client', 'provider')),
  CONSTRAINT valid_notification_type CHECK (type IN ('info', 'success', 'warning', 'error', 'action_required'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. AUDIT LOG TABLE
-- -----------------------------------------------------------------------------
-- Comprehensive audit trail for all sensitive operations

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Actor
  actor_user_id UUID,
  actor_email TEXT,
  actor_ip_address INET,
  actor_user_agent TEXT,
  
  -- Action
  action TEXT NOT NULL,
  -- Examples: 'agreement.signed', 'payment.captured', 'quote.updated'
  
  -- Target
  target_table TEXT NOT NULL,
  target_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  request_id TEXT,
  session_id TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_target ON audit_log(target_table, target_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. SETTINGS TABLE
-- -----------------------------------------------------------------------------
-- Application configuration stored in database

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
  ('surplus_fee_percentage', '10', 'Default fee percentage for surplus recovery'),
  ('labor_service_bundles_enabled', 'true', 'Enable full service bundles for labor services'),
  ('payment_reminder_days', '7', 'Days before sending payment reminder'),
  ('quote_expiration_days', '14', 'Days until a quote expires'),
  ('sms_notifications_enabled', 'false', 'Enable SMS notifications'),
  ('auto_assign_providers', 'false', 'Automatically assign providers to new quotes')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Payments: Admin full access, public can insert (for payment webhooks)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on payments"
  ON payments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public insert on payments"
  ON payments FOR INSERT
  WITH CHECK (true);

-- Providers: Admin full access
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on providers"
  ON providers FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Communications: Admin full access
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on communications"
  ON communications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Notifications: Admin full access, users can read their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on notifications"
  ON notifications FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Audit log: Admin read only
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin read on audit_log"
  ON audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

-- Settings: Admin full access, public read
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access on settings"
  ON settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow public read on settings"
  ON settings FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- 8. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate tracking IDs
CREATE OR REPLACE FUNCTION generate_tracking_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  seq_num INTEGER;
  year_part TEXT := TO_CHAR(NOW(), 'YYYY');
BEGIN
  -- Get next sequence number for this prefix and year
  EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(tracking_id FROM %s) AS INTEGER)), 0) + 1 
                  FROM (
                    SELECT tracking_id FROM agreements WHERE tracking_id LIKE %L
                    UNION
                    SELECT tracking_id FROM property_quotes WHERE tracking_id LIKE %L
                    UNION
                    SELECT tracking_id FROM wholesale_leads WHERE tracking_id LIKE %L
                  ) combined',
                  '%s', -- for substring extraction
                  prefix || '-' || year_part || '-%',
                  prefix || '-' || year_part || '-%',
                  prefix || '-' || year_part || '-%'
               ) INTO seq_num;
               
  RETURN prefix || '-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_target_table TEXT,
  p_target_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log (action, target_table, target_id, old_values, new_values)
  VALUES (p_action, p_target_table, p_target_id, p_old_values, p_new_values);
END;
$$ LANGUAGE plpgsql;
