-- Add missing columns to sync_logs table for better tracking

ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS records_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_org_created ON sync_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_provider ON sync_logs(provider);
