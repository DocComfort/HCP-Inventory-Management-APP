import { 
  Location, 
  Vendor, 
  InventoryItem, 
  TransferRequest, 
  PurchaseOrder, 
  SyncStatus,
  HCPInvoice,
  RestockOrder
} from '@/types/inventory';

// Empty data - will be populated from backend/database
export const locations: Location[] = [];

export const vendors: Vendor[] = [];

export const inventoryItems: InventoryItem[] = [];

export const transferRequests: TransferRequest[] = [];

export const purchaseOrders: PurchaseOrder[] = [];

export const syncStatuses: SyncStatus[] = [
  {
    id: 'sync-hcp',
    platform: 'hcp',
    lastSync: new Date().toISOString(),
    status: 'synced',
    itemsInSync: 0,
    pendingChanges: 0,
    connected: false,
    webhookConfigured: false
  },
  {
    id: 'sync-qbd',
    platform: 'qbd',
    lastSync: new Date().toISOString(),
    status: 'synced',
    itemsInSync: 0,
    pendingChanges: 0,
    connected: true, // QBWC is configured and running
    webhookConfigured: true
  },
  {
    id: 'sync-qbo',
    platform: 'qbo',
    lastSync: new Date().toISOString(),
    status: 'synced',
    itemsInSync: 0,
    pendingChanges: 0,
    connected: false,
    webhookConfigured: false
  }
];

export const recentInvoices: HCPInvoice[] = [];

export const restockOrders: RestockOrder[] = [];
