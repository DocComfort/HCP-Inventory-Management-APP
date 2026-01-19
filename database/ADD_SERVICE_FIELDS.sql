-- Add service-specific fields to inventory_items table
-- These fields support HCP price book services

-- Add item_type column to distinguish materials from services
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'material' CHECK (item_type IN ('material', 'service', 'labor'));

-- Add service-specific fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS flat_rate_enabled BOOLEAN DEFAULT false;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS online_booking_enabled BOOLEAN DEFAULT false;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS taxable BOOLEAN DEFAULT false;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS duration INTEGER; -- Duration in minutes for services

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'each';

-- Rename hcp_item_id to hcp_id for consistency
ALTER TABLE inventory_items 
RENAME COLUMN hcp_item_id TO hcp_id;

-- Update constraint to handle null SKUs for services (they use task_number)
ALTER TABLE inventory_items 
DROP CONSTRAINT IF EXISTS inventory_items_organization_id_sku_key;

-- Add index for HCP ID lookups
CREATE INDEX IF NOT EXISTS idx_items_hcp_id ON inventory_items(hcp_id);

-- Add index for item type
CREATE INDEX IF NOT EXISTS idx_items_type ON inventory_items(item_type);

-- Comment for documentation
COMMENT ON COLUMN inventory_items.item_type IS 'Type of item: material, service, or labor';
COMMENT ON COLUMN inventory_items.flat_rate_enabled IS 'Whether this item uses flat-rate pricing (HCP)';
COMMENT ON COLUMN inventory_items.online_booking_enabled IS 'Whether this service can be booked online (HCP services)';
COMMENT ON COLUMN inventory_items.duration IS 'Expected duration in minutes for services';
COMMENT ON COLUMN inventory_items.image_url IS 'URL to item/service image';
