// Core inventory types for the Centralized Inventory & Procurement Bridge

export interface Location {
  id: string;
  name: string;
  type: 'warehouse' | 'van';
  technicianName?: string;
  technicianId?: string;
  isActive: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  leadTimeDays: number;
  lastOrderDate?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  preferredVendorId: string;
  hcpItemId?: string;
  qbdItemId?: string;
  qboItemId?: string;
  barcode?: string;
  locationStock: Record<string, LocationStock>;
  totalQOH: number;
  warehouseQOH: number;
  totalVanQOH: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'transfer_pending' | 'on_po';
}

export interface LocationStock {
  locationId: string;
  quantity: number;
  minPar: number;
  maxPar: number;
  lastUpdated: string;
  deviation: number; // quantity - minPar (negative means below par)
}

export interface TransferRequest {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  quantity: number;
  status: 'pending' | 'approved' | 'in_transit' | 'completed' | 'rejected';
  requestedAt: string;
  requestedBy: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: POLineItem[];
  totalAmount: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  createdAt: string;
  expectedDelivery?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  destinationLocationId: string;
  destinationLocationName: string;
}

export interface POLineItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface RestockOrder {
  id: string;
  locationId: string;
  locationName: string;
  items: RestockLineItem[];
  status: 'pending' | 'approved' | 'processing' | 'completed';
  createdAt: string;
  triggeredBy: string; // HCP invoice/work order ID
}

export interface RestockLineItem {
  itemId: string;
  sku: string;
  name: string;
  currentQty: number;
  parLevel: number;
  restockQty: number;
}

export interface HCPInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  technicianId: string;
  technicianName: string;
  lineItems: HCPLineItem[];
  total: number;
  status: 'pending' | 'synced' | 'error';
  createdAt: string;
  syncedAt?: string;
}

export interface HCPLineItem {
  itemId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SyncStatus {
  platform: 'hcp' | 'qbd' | 'qbo';
  connected: boolean;
  lastSync: string;
  status: 'syncing' | 'synced' | 'error' | 'disconnected';
  errorMessage?: string;
  itemsInSync: number;
  pendingChanges: number;
}

export interface FulfillmentStep {
  step: 'local' | 'warehouse' | 'network' | 'procurement';
  status: 'pending' | 'checking' | 'found' | 'not_found' | 'completed';
  locationId?: string;
  locationName?: string;
  quantity?: number;
  action?: string;
}

export interface FulfillmentResult {
  itemId: string;
  itemSku: string;
  itemName: string;
  requestedQty: number;
  steps: FulfillmentStep[];
  finalAction: 'fulfilled_local' | 'transfer_initiated' | 'network_transfer' | 'po_generated';
  transferId?: string;
  poId?: string;
}
