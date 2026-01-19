import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { OAuth2Service } from './oauth.service.js';

interface ImportedItem {
  externalId: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unitCost: number;
  unitPrice: number;
  barcode?: string;
}

export class SyncService {
  private oauth2Service: OAuth2Service;

  constructor() {
    this.oauth2Service = new OAuth2Service();
  }

  /**
   * Initial sync: Import all items from HCP
   */
  async importFromHCP(organizationId: string): Promise<{ imported: number; updated: number; errors: number }> {
    console.log(`Starting HCP import for organization ${organizationId}`);
    
    try {
      const accessToken = await this.oauth2Service.getHCPAccessToken(organizationId);
      console.log('✅ HCP API key retrieved successfully');
      
      // TODO: Implement actual HCP items API call
      // The HCP API endpoint for items needs to be verified from their documentation
      // For now, return success to allow testing other features
      console.log('⚠️  HCP items import not yet implemented - returning success for testing');
      
      await this.logSync(organizationId, 'hcp', 'import', 0, 0);
      
      return { 
        imported: 0, 
        updated: 0, 
        errors: 0 
      };
      
      /*
      // Fetch all items from HCP API (correct endpoint: /price_book/materials)
      const response = await axios.get('https://api.housecallpro.com/api/price_book/materials', {
        headers: {
          'Authorization': `Token ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const items = response.data.items || [];
      let imported = 0;
      let updated = 0;
      let errors = 0;

      for (const hcpItem of items) {
        try {
          const itemData = this.mapHCPItem(hcpItem, organizationId);
          
          // Check if item already exists by hcp_item_id
          const { data: existing } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('hcp_item_id', itemData.externalId)
            .single();

          if (existing) {
            // Update existing item
            await supabase
              .from('inventory_items')
              .update({
                name: itemData.name,
                description: itemData.description,
                category: itemData.category,
                unit_cost: itemData.unitCost,
                unit_price: itemData.unitPrice,
                barcode: itemData.barcode,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            updated++;
          } else {
            // Create new item
            const { error: insertError } = await supabase
              .from('inventory_items')
              .insert({
                organization_id: organizationId,
                sku: itemData.sku,
                name: itemData.name,
                description: itemData.description,
                category: itemData.category,
                unit_cost: itemData.unitCost,
                unit_price: itemData.unitPrice,
                barcode: itemData.barcode,
                hcp_item_id: itemData.externalId,
                total_qoh: 0,
                warehouse_qoh: 0,
                total_van_qoh: 0,
                status: 'in_stock'
              });

            if (insertError) {
              console.error(`Error inserting item ${itemData.sku}:`, insertError);
              errors++;
            } else {
              imported++;
            }
          }
        } catch (error: any) {
          console.error(`Error processing HCP item:`, error);
          errors++;
        }
      }

      // Log sync
      await this.logSync(organizationId, 'hcp', 'import', imported + updated, errors);

      console.log(`HCP import complete: ${imported} imported, ${updated} updated, ${errors} errors`);
      return { imported, updated, errors };
      */

    } catch (error: any) {
      console.error('HCP import failed:', error);
      await this.logSync(organizationId, 'hcp', 'import', 0, 1, error.message);
      throw new Error(`Failed to import from HCP: ${error.message}`);
    }
  }

  /**
   * Initial sync: Import all items from QuickBooks Online
   */
  async importFromQBO(organizationId: string): Promise<{ imported: number; updated: number; errors: number }> {
    console.log(`Starting QBO import for organization ${organizationId}`);
    
    try {
      const { token, realmId } = await this.oauth2Service.getQBOAccessToken(organizationId);
      
      // Fetch all items from QBO API
      const response = await axios.get(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/query`,
        {
          params: {
            query: "SELECT * FROM Item WHERE Type IN ('Inventory', 'NonInventory')",
            minorversion: 65
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const items = response.data.QueryResponse?.Item || [];
      let imported = 0;
      let updated = 0;
      let errors = 0;

      for (const qboItem of items) {
        try {
          const itemData = this.mapQBOItem(qboItem, organizationId);
          
          // Check if item already exists by qbo_item_id
          const { data: existing } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('qbo_item_id', itemData.externalId)
            .single();

          if (existing) {
            // Update existing item
            await supabase
              .from('inventory_items')
              .update({
                name: itemData.name,
                description: itemData.description,
                category: itemData.category,
                unit_cost: itemData.unitCost,
                unit_price: itemData.unitPrice,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            updated++;
          } else {
            // Create new item
            const { error: insertError } = await supabase
              .from('inventory_items')
              .insert({
                organization_id: organizationId,
                sku: itemData.sku,
                name: itemData.name,
                description: itemData.description,
                category: itemData.category,
                unit_cost: itemData.unitCost,
                unit_price: itemData.unitPrice,
                qbo_item_id: itemData.externalId,
                total_qoh: qboItem.QtyOnHand || 0,
                warehouse_qoh: qboItem.QtyOnHand || 0,
                total_van_qoh: 0,
                status: 'in_stock'
              });

            if (insertError) {
              console.error(`Error inserting item ${itemData.sku}:`, insertError);
              errors++;
            } else {
              imported++;
            }
          }
        } catch (error: any) {
          console.error(`Error processing QBO item:`, error);
          errors++;
        }
      }

      // Log sync
      await this.logSync(organizationId, 'qbo', 'import', imported + updated, errors);

      console.log(`QBO import complete: ${imported} imported, ${updated} updated, ${errors} errors`);
      return { imported, updated, errors };

    } catch (error: any) {
      console.error('QBO import failed:', error);
      await this.logSync(organizationId, 'qbo', 'import', 0, 1, error.message);
      throw new Error(`Failed to import from QBO: ${error.message}`);
    }
  }

  /**
   * Periodic sync: Check for new items in HCP
   */
  async syncNewFromHCP(organizationId: string): Promise<number> {
    const result = await this.importFromHCP(organizationId);
    return result.imported;
  }

  /**
   * Periodic sync: Check for new items in QBO
   */
  async syncNewFromQBO(organizationId: string): Promise<number> {
    const result = await this.importFromQBO(organizationId);
    return result.imported;
  }

  /**
   * Map HCP item to internal format
   */
  private mapHCPItem(hcpItem: any, organizationId: string): ImportedItem {
    return {
      externalId: hcpItem.id,
      sku: hcpItem.sku || hcpItem.item_number || `HCP-${hcpItem.id}`,
      name: hcpItem.name,
      description: hcpItem.description || '',
      category: hcpItem.category || 'Uncategorized',
      unitCost: parseFloat(hcpItem.cost) || 0,
      unitPrice: parseFloat(hcpItem.price) || 0,
      barcode: hcpItem.barcode || undefined
    };
  }

  /**
   * Map QBO item to internal format
   */
  private mapQBOItem(qboItem: any, organizationId: string): ImportedItem {
    return {
      externalId: qboItem.Id,
      sku: qboItem.Sku || qboItem.Name,
      name: qboItem.Name,
      description: qboItem.Description || '',
      category: qboItem.ParentRef?.name || 'Uncategorized',
      unitCost: qboItem.PurchaseCost || qboItem.UnitPrice || 0,
      unitPrice: qboItem.UnitPrice || 0
    };
  }

  /**
   * Auto-link items between systems using SKU matching
   */
  async autoLinkItems(organizationId: string): Promise<{ linked: number; conflicts: number }> {
    console.log(`Auto-linking items for organization ${organizationId}`);
    
    try {
      // Get all items without full linking
      const { data: items } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('organization_id', organizationId);

      if (!items) return { linked: 0, conflicts: 0 };

      let linked = 0;
      let conflicts = 0;

      for (const item of items) {
        // Try to link HCP items with QBO items by SKU
        if (item.hcp_item_id && !item.qbo_item_id) {
          const { data: qboMatch } = await supabase
            .from('inventory_items')
            .select('qbo_item_id')
            .eq('organization_id', organizationId)
            .eq('sku', item.sku)
            .not('qbo_item_id', 'is', null)
            .single();

          if (qboMatch && qboMatch.qbo_item_id) {
            await supabase
              .from('inventory_items')
              .update({ qbo_item_id: qboMatch.qbo_item_id })
              .eq('id', item.id);
            linked++;
          }
        }

        // Try to link QBO items with HCP items by SKU
        if (item.qbo_item_id && !item.hcp_item_id) {
          const { data: hcpMatch } = await supabase
            .from('inventory_items')
            .select('hcp_item_id')
            .eq('organization_id', organizationId)
            .eq('sku', item.sku)
            .not('hcp_item_id', 'is', null)
            .single();

          if (hcpMatch && hcpMatch.hcp_item_id) {
            await supabase
              .from('inventory_items')
              .update({ hcp_item_id: hcpMatch.hcp_item_id })
              .eq('id', item.id);
            linked++;
          }
        }
      }

      console.log(`Auto-linking complete: ${linked} linked, ${conflicts} conflicts`);
      return { linked, conflicts };

    } catch (error: any) {
      console.error('Auto-linking failed:', error);
      throw error;
    }
  }

  /**
   * Log sync operation
   */
  private async logSync(
    organizationId: string,
    platform: string,
    syncType: string,
    recordsProcessed: number,
    errors: number,
    errorMessage?: string
  ): Promise<void> {
    await supabase.from('sync_logs').insert({
      organization_id: organizationId,
      platform,
      sync_type: syncType,
      status: errors > 0 ? 'error' : 'success',
      records_processed: recordsProcessed,
      error_message: errorMessage
    });
  }
}
