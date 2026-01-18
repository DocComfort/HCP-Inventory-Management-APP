// Database types for Supabase tables

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'technician';
  organization_id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  technician_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit_cost: number;
  unit_price: number;
  preferred_vendor_id?: string;
  hcp_item_id?: string;
  qbd_item_id?: string;
  qbo_item_id?: string;
  barcode?: string;
  total_qoh: number;
  warehouse_qoh: number;
  total_van_qoh: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'transfer_pending' | 'on_po';
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  type: 'warehouse' | 'van';
  technician_name?: string;
  technician_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationStock {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  min_par: number;
  max_par: number;
  last_updated: string;
}

export interface TransferRequest {
  id: string;
  organization_id: string;
  item_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  status: 'pending' | 'approved' | 'in_transit' | 'completed' | 'rejected';
  requested_at: string;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  po_number: string;
  vendor_id: string;
  total_amount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  created_at: string;
  expected_delivery?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  destination_location_id: string;
  created_by: string;
  approved_by?: string;
  updated_at: string;
}

export interface POLineItem {
  id: string;
  po_id: string;
  item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  received_quantity?: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  lead_time_days: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
}

export interface OAuthToken {
  id: string;
  organization_id: string;
  provider: 'hcp' | 'qbo';
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_at: string;
  realm_id?: string; // For QuickBooks
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  organization_id: string;
  sync_type: 'inventory_adjustment' | 'invoice_sync' | 'item_sync';
  provider: 'hcp' | 'qbo' | 'qbd';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  request_data?: any;
  response_data?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface QBWCQueue {
  id: string;
  organization_id: string;
  request_type: 'InventoryAdjustment' | 'Invoice' | 'Customer' | 'Item';
  qbxml_request: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  max_attempts: number;
  response_data?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  organization_id: string;
  provider: 'hcp' | 'qbo';
  event_type: string;
  payload: any;
  processed: boolean;
  processed_at?: string;
  error_message?: string;
  created_at: string;
}
