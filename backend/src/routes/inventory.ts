import express from 'express';
import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { SyncService } from '../services/sync.service.js';
import { OAuth2Service } from '../services/oauth.service.js';
import { RetryService } from '../services/retry.service.js';

const router = express.Router();
const syncService = new SyncService();
const oauthService = new OAuth2Service();

// Get all inventory items
router.get('/items', async (req, res) => {
  try {
    const organizationId = req.query.org_id as string;
    
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, location_stock(*)')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single item
router.get('/items/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, location_stock(*, locations(*))')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create inventory item
router.post('/items', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(req.body)
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory item
router.patch('/items/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync: Import all items from HCP
router.post('/sync/hcp/import', async (req, res) => {
  try {
    const organizationId = req.body.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }
    
    const result = await syncService.importFromHCP(organizationId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync: Import all items from QBO
router.post('/sync/qbo/import', async (req, res) => {
  try {
    const organizationId = req.body.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }
    
    const result = await syncService.importFromQBO(organizationId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync: Auto-link items between systems
router.post('/sync/autolink', async (req, res) => {
  try {
    const organizationId = req.body.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id required' });
    }
    
    const result = await syncService.autoLinkItems(organizationId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// QBD Import endpoint
router.post('/sync/qbd/import', async (req, res) => {
  try {
    const organizationId = '00000000-0000-0000-0000-000000000001'; // Use default org for now
    console.log('🔄 QBD import requested');
    // QBD sync happens via QBWC polling, not direct API
    res.json({ 
      success: true, 
      message: 'QBD sync queued for next QBWC poll',
      imported: 0,
      updated: 0,
      errors: 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// HCP endpoints (added for consistency with frontend calls)
router.post('/sync/hcp/invoices', async (req, res) => {
  try {
    const organizationId = '00000000-0000-0000-0000-000000000001';
    const { startDate, endDate } = req.body;
    
    console.log(`📄 HCP invoices sync requested: ${startDate} to ${endDate}`);
    
    // Get HCP API token
    const hcpToken = await oauthService.getHCPAccessToken(organizationId);
    if (!hcpToken) {
      return res.status(400).json({ error: 'HCP not connected. Please authenticate first.' });
    }
    
    // Build query parameters
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    // Fetch invoices from HCP with retry logic
    const invoices = await RetryService.withRetry(async () => {
      const response = await axios.get('https://api.housecallpro.com/invoices', {
        headers: {
          'Authorization': `Token ${hcpToken}`,
          'Content-Type': 'application/json'
        },
        params
      });
      
      return response.data.invoices || response.data.data || [];
    });
    
    console.log(`📄 Retrieved ${invoices.length} invoices from HCP`);
    
    // Log sync operation
    await supabase.from('sync_logs').insert({
      organization_id: organizationId,
      sync_type: 'hcp_invoices',
      provider: 'hcp',
      status: 'completed',
      request_data: { start_date: startDate, end_date: endDate },
      response_data: { invoices_retrieved: invoices.length }
    });
    
    res.json({ 
      success: true, 
      invoices_synced: invoices.length,
      message: `Successfully synced ${invoices.length} invoices from HCP`
    });
  } catch (error: any) {
    console.error('❌ Error syncing HCP invoices:', error.message);
    
    await supabase.from('sync_logs').insert({
      organization_id: '00000000-0000-0000-0000-000000000001',
      sync_type: 'hcp_invoices',
      provider: 'hcp',
      status: 'failed',
      error_message: error.message
    });
    
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/hcp/items', async (req, res) => {
  try {
    const organizationId = '00000000-0000-0000-0000-000000000001';
    console.log('📦 HCP items sync requested');
    
    // Get HCP API token
    const hcpToken = await oauthService.getHCPAccessToken(organizationId);
    if (!hcpToken) {
      return res.status(400).json({ error: 'HCP not connected. Please authenticate first.' });
    }
    
    // Fetch pricebook materials from HCP with retry logic
    const materials = await RetryService.withRetry(async () => {
      const response = await axios.get('https://api.housecallpro.com/price_book/materials', {
        headers: {
          'Authorization': `Token ${hcpToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.materials || response.data.data || [];
    });
    
    console.log(`📦 Retrieved ${materials.length} materials from HCP`);
    
    let itemsCreated = 0;
    let itemsUpdated = 0;
    
    // Process each material
    for (const material of materials) {
      try {
        const { id, name, description, unit_cost, unit_price, service_item_id } = material;
        
        // Check if item already exists
        const { data: existing } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('sku', service_item_id || id)
          .maybeSingle();
        
        if (existing) {
          // Update existing item
          await supabase
            .from('inventory_items')
            .update({
              name,
              description,
              cost: unit_cost ? unit_cost / 100 : undefined, // Convert cents to dollars
              price: unit_price ? unit_price / 100 : undefined,
              last_updated: new Date().toISOString()
            })
            .eq('id', existing.id);
          
          itemsUpdated++;
        } else {
          // Create new item
          await supabase
            .from('inventory_items')
            .insert({
              organization_id: organizationId,
              name,
              description,
              sku: service_item_id || id,
              cost: unit_cost ? unit_cost / 100 : 0,
              price: unit_price ? unit_price / 100 : 0,
              category: material.category_name || 'Uncategorized'
            });
          
          itemsCreated++;
        }
      } catch (error: any) {
        console.warn(`  ⚠️  Failed to process material ${material.name}:`, error.message);
      }
    }
    
    console.log(`✅ HCP items sync complete: ${itemsCreated} created, ${itemsUpdated} updated`);
    
    // Log sync operation
    await supabase.from('sync_logs').insert({
      organization_id: organizationId,
      sync_type: 'hcp_items',
      provider: 'hcp',
      status: 'completed',
      request_data: {},
      response_data: { 
        items_retrieved: materials.length,
        items_created: itemsCreated,
        items_updated: itemsUpdated
      }
    });
    
    res.json({ 
      success: true, 
      items_synced: itemsCreated + itemsUpdated,
      message: `Successfully synced ${itemsCreated + itemsUpdated} items from HCP`
    });
  } catch (error: any) {
    console.error('❌ Error syncing HCP items:', error.message);
    
    await supabase.from('sync_logs').insert({
      organization_id: '00000000-0000-0000-0000-000000000001',
      sync_type: 'hcp_items',
      provider: 'hcp',
      status: 'failed',
      error_message: error.message
    });
    
    res.status(500).json({ error: error.message });
  }
});

router.get('/sync/hcp/technicians', async (req, res) => {
  try {
    const organizationId = '00000000-0000-0000-0000-000000000001';
    console.log('👷 HCP technicians requested');
    
    // Get HCP API token
    const hcpToken = await oauthService.getHCPAccessToken(organizationId);
    if (!hcpToken) {
      return res.status(400).json({ error: 'HCP not connected. Please authenticate first.' });
    }
    
    // Fetch employees from HCP with retry logic
    const employees = await RetryService.withRetry(async () => {
      const response = await axios.get('https://api.housecallpro.com/employees', {
        headers: {
          'Authorization': `Token ${hcpToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.employees || response.data.data || [];
    });
    
    console.log(`👷 Retrieved ${employees.length} technicians from HCP`);
    
    res.json({ 
      success: true, 
      technicians: employees,
      message: `Retrieved ${employees.length} technicians from HCP`
    });
  } catch (error: any) {
    console.error('❌ Error fetching HCP technicians:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export { router as inventoryRouter };
