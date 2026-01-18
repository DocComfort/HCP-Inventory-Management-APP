-- HCP Inventory Management Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'technician')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  technician_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  lead_time_days INTEGER DEFAULT 0,
  last_order_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warehouse', 'van')),
  technician_name TEXT,
  technician_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  unit_price DECIMAL(10, 2) DEFAULT 0,
  preferred_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  hcp_item_id TEXT,
  qbd_item_id TEXT,
  qbo_item_id TEXT,
  barcode TEXT,
  total_qoh INTEGER DEFAULT 0,
  warehouse_qoh INTEGER DEFAULT 0,
  total_van_qoh INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock', 'transfer_pending', 'on_po')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, sku)
);

-- Create location_stock table
CREATE TABLE IF NOT EXISTS location_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  min_par INTEGER DEFAULT 0,
  max_par INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, location_id)
);

-- Create transfer_requests table
CREATE TABLE IF NOT EXISTS transfer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  to_location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'received', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expected_delivery DATE,
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  destination_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, po_number)
);

-- Create po_line_items table
CREATE TABLE IF NOT EXISTS po_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create oauth_tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hcp', 'qbo')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  realm_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('hcp', 'qbo', 'qbd')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create qbwc_queue table (for QuickBooks Desktop sync)
CREATE TABLE IF NOT EXISTS qbwc_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  qbxml_request TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  response_data TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('hcp', 'qbo')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_org ON inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_location_stock_item ON location_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_location_stock_location ON location_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_org ON transfer_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_pos_org ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_pos_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_qbwc_status ON qbwc_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_sync_logs_org ON sync_logs(organization_id);

-- Create Row Level Security (RLS) policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbwc_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access data from their organization
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view users in their organization" ON users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view vendors in their organization" ON vendors
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can access inventory in their organization" ON inventory_items
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can access locations in their organization" ON locations
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Similar policies for other tables...
CREATE POLICY "Users can access location stock" ON location_stock
  FOR ALL USING (
    location_id IN (
      SELECT id FROM locations WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample organization for testing
INSERT INTO organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization')
ON CONFLICT DO NOTHING;

-- Insert sample warehouse location
INSERT INTO locations (organization_id, name, type, is_active) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Warehouse', 'warehouse', true)
ON CONFLICT DO NOTHING;
