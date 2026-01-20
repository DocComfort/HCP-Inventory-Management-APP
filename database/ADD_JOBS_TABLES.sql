-- Create jobs table for tracking work orders from HCP
-- Supports both inventory tracking and payroll/time management

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  hcp_id TEXT UNIQUE NOT NULL, -- HCP job ID
  invoice_number TEXT,
  description TEXT,
  work_status TEXT CHECK (work_status IN ('needs_scheduling', 'scheduled', 'in_progress', 'complete_rated', 'complete_unrated', 'user_canceled', 'pro_canceled')),
  
  -- Customer info
  customer_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Address
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  
  -- Scheduling
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  arrival_window INTEGER, -- minutes
  
  -- Time tracking for payroll
  on_my_way_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Financial
  total_amount INTEGER, -- cents
  outstanding_balance INTEGER, -- cents
  subtotal INTEGER, -- cents
  
  -- Metadata
  tags TEXT[],
  lead_source TEXT,
  original_estimate_id TEXT,
  recurrence_number INTEGER,
  recurrence_rule TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hcp_created_at TIMESTAMPTZ,
  hcp_updated_at TIMESTAMPTZ
);

-- Job assigned employees (for payroll tracking)
CREATE TABLE IF NOT EXISTS job_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL, -- HCP employee ID
  employee_name TEXT,
  employee_email TEXT,
  role TEXT,
  color_hex TEXT,
  
  -- Time tracking per employee
  dispatched_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job materials used (for inventory depletion tracking)
CREATE TABLE IF NOT EXISTS job_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  
  -- Material details from HCP
  hcp_material_uuid TEXT,
  name TEXT NOT NULL,
  description TEXT,
  part_number TEXT,
  
  -- Quantities and costs
  quantity DECIMAL(10, 2) NOT NULL,
  unit_cost INTEGER, -- cents
  unit_price INTEGER, -- cents
  total_cost INTEGER, -- cents
  total_price INTEGER, -- cents
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job notes
CREATE TABLE IF NOT EXISTS job_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  hcp_note_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_org ON jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_jobs_hcp_id ON jobs(hcp_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(work_status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start ON jobs(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON jobs(completed_at);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_invoice ON jobs(invoice_number);

CREATE INDEX IF NOT EXISTS idx_job_employees_job ON job_employees(job_id);
CREATE INDEX IF NOT EXISTS idx_job_employees_employee ON job_employees(employee_id);

CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_item ON job_materials(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_hcp ON job_materials(hcp_material_uuid);

CREATE INDEX IF NOT EXISTS idx_job_notes_job ON job_notes(job_id);

-- Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can access jobs in their organization" ON jobs
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can access job employees in their organization" ON job_employees
  FOR ALL USING (job_id IN (
    SELECT id FROM jobs WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access job materials in their organization" ON job_materials
  FOR ALL USING (job_id IN (
    SELECT id FROM jobs WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can access job notes in their organization" ON job_notes
  FOR ALL USING (job_id IN (
    SELECT id FROM jobs WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

-- Triggers for updated_at
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE jobs IS 'Work orders/service calls from HCP for inventory and payroll tracking';
COMMENT ON TABLE job_employees IS 'Employees assigned to jobs for time tracking and payroll';
COMMENT ON TABLE job_materials IS 'Materials used on jobs for inventory depletion tracking';
COMMENT ON TABLE job_notes IS 'Notes associated with jobs';

COMMENT ON COLUMN jobs.on_my_way_at IS 'Timestamp when technician marked "on my way" - for time tracking';
COMMENT ON COLUMN jobs.started_at IS 'Timestamp when job work started - for time tracking';
COMMENT ON COLUMN jobs.completed_at IS 'Timestamp when job completed - for time tracking';
COMMENT ON COLUMN job_materials.quantity IS 'Quantity of material used on the job';
