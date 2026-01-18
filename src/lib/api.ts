import { supabase } from './supabase';
import { InventoryItem, Location, TransferRequest, PurchaseOrder, Vendor } from '@/types/inventory';

/**
 * Inventory API Service
 * Provides CRUD operations and real-time subscriptions for inventory data
 */

export const inventoryApi = {
  // ===== INVENTORY ITEMS =====
  
  async getItems(organizationId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        location_stock (
          *,
          locations (*)
        )
      `)
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    return data || [];
  },

  async getItem(itemId: string): Promise<InventoryItem | null> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        location_stock (
          *,
          locations (*)
        )
      `)
      .eq('id', itemId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createItem(item: Partial<InventoryItem>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateItem(itemId: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId);
    
    if (error) throw error;
  },

  subscribeToItems(organizationId: string, callback: (items: InventoryItem[]) => void) {
    return supabase
      .channel('inventory_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `organization_id=eq.${organizationId}`
        },
        async () => {
          const items = await this.getItems(organizationId);
          callback(items);
        }
      )
      .subscribe();
  },

  // ===== LOCATIONS =====

  async getLocations(organizationId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    return data || [];
  },

  async createLocation(location: Partial<Location>): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateLocation(locationId: string, updates: Partial<Location>): Promise<Location> {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', locationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ===== TRANSFERS =====

  async getTransfers(organizationId: string): Promise<TransferRequest[]> {
    const { data, error } = await supabase
      .from('transfer_requests')
      .select(`
        *,
        inventory_items (*),
        from_location:locations!from_location_id (*),
        to_location:locations!to_location_id (*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createTransfer(transfer: Partial<TransferRequest>): Promise<TransferRequest> {
    const { data, error } = await supabase
      .from('transfer_requests')
      .insert(transfer)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTransferStatus(
    transferId: string,
    status: TransferRequest['status'],
    approvedBy?: string
  ): Promise<TransferRequest> {
    const updates: Record<string, unknown> = { status };
    if (approvedBy) {
      updates.approved_by = approvedBy;
      updates.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('transfer_requests')
      .update(updates)
      .eq('id', transferId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  subscribeToTransfers(organizationId: string, callback: (transfers: TransferRequest[]) => void) {
    return supabase
      .channel('transfers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfer_requests',
          filter: `organization_id=eq.${organizationId}`
        },
        async () => {
          const transfers = await this.getTransfers(organizationId);
          callback(transfers);
        }
      )
      .subscribe();
  },

  // ===== PURCHASE ORDERS =====

  async getPurchaseOrders(organizationId: string): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors (*),
        po_line_items (
          *,
          inventory_items (*)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createPurchaseOrder(po: Partial<PurchaseOrder>, lineItems: Record<string, unknown>[]): Promise<PurchaseOrder> {
    // Insert PO
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .insert(po)
      .select()
      .single();
    
    if (poError) throw poError;

    // Insert line items
    const lineItemsWithPOId = lineItems.map(item => ({
      ...item,
      po_id: poData.id
    }));

    const { error: lineItemsError } = await supabase
      .from('po_line_items')
      .insert(lineItemsWithPOId);
    
    if (lineItemsError) throw lineItemsError;

    return poData;
  },

  async updatePOStatus(
    poId: string,
    status: PurchaseOrder['status'],
    approvedBy?: string
  ): Promise<PurchaseOrder> {
    const updates: Record<string, unknown> = { status };
    if (approvedBy) {
      updates.approved_by = approvedBy;
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', poId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ===== VENDORS =====

  async getVendors(organizationId: string): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    return data || [];
  },

  async createVendor(vendor: Partial<Vendor>): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert(vendor)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ===== LOCATION STOCK =====

  async updateLocationStock(
    itemId: string,
    locationId: string,
    quantity: number
  ): Promise<void> {
    const { error } = await supabase
      .from('location_stock')
      .upsert({
        item_id: itemId,
        location_id: locationId,
        quantity,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'item_id,location_id'
      });
    
    if (error) throw error;

    // Update item totals
    await this.recalculateItemTotals(itemId);
  },

  async adjustStock(
    itemId: string,
    locationId: string,
    adjustment: number,
    reason: string
  ): Promise<void> {
    // Get current stock
    const { data: currentStock } = await supabase
      .from('location_stock')
      .select('quantity')
      .eq('item_id', itemId)
      .eq('location_id', locationId)
      .single();

    const currentQty = currentStock?.quantity || 0;
    const newQty = Math.max(0, currentQty + adjustment);

    await this.updateLocationStock(itemId, locationId, newQty);

    // Queue QB Desktop sync if needed
    // This would trigger the backend to create qbXML
  },

  async recalculateItemTotals(itemId: string): Promise<void> {
    const { data: stocks } = await supabase
      .from('location_stock')
      .select('quantity, locations(type)')
      .eq('item_id', itemId);

    if (!stocks) return;

    const totalQOH = stocks.reduce((sum, s) => sum + s.quantity, 0);
    const warehouseQOH = stocks
      .filter((s) => s.locations && 'type' in s.locations && s.locations.type === 'warehouse')
      .reduce((sum, s) => sum + s.quantity, 0);
    const totalVanQOH = stocks
      .filter((s) => s.locations && 'type' in s.locations && s.locations.type === 'van')
      .reduce((sum, s) => sum + s.quantity, 0);

    await supabase
      .from('inventory_items')
      .update({
        total_qoh: totalQOH,
        warehouse_qoh: warehouseQOH,
        total_van_qoh: totalVanQOH
      })
      .eq('id', itemId);
  }
};
