-- Migration: Add location_employees table for van-employee assignments
-- Run this SQL in your Supabase SQL Editor

-- Add address column to locations if it doesn't exist
ALTER TABLE locations ADD COLUMN IF NOT EXISTS address TEXT;

-- Create location_employees junction table
CREATE TABLE IF NOT EXISTS location_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, employee_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_employees_location_id ON location_employees(location_id);
CREATE INDEX IF NOT EXISTS idx_location_employees_employee_id ON location_employees(employee_id);

-- Enable RLS
ALTER TABLE location_employees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for location_employees
CREATE POLICY "Allow authenticated users to read location_employees" ON location_employees
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert location_employees" ON location_employees
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update location_employees" ON location_employees
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete location_employees" ON location_employees
  FOR DELETE USING (auth.role() = 'authenticated');

-- For service role access (backend API)
CREATE POLICY "Service role full access to location_employees" ON location_employees
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON location_employees TO authenticated;
GRANT ALL ON location_employees TO service_role;

-- Comment
COMMENT ON TABLE location_employees IS 'Tracks which employees are assigned to which locations (especially vans)';
