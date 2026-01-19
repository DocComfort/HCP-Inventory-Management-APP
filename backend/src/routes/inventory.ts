import express from 'express';
import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { SyncService } from '../services/sync.service.js';
import { OAuth2Service } from '../services/oauth.service.js';
import { RetryService } from '../services/retry.service.js';
import { sendSuccess, sendError } from '../middleware/requestId.js';
import { validateIntegrationsKey } from '../middleware/integrationsKey.js';

const router = express.Router();
const syncService = new SyncService();
const oauthService = new OAuth2Service();

// Protect all /sync endpoints with integrations key
router.use('/sync', validateIntegrationsKey);

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

// HCP endpoints (protected by router.use('/sync', validateIntegrationsKey) above)
router.post('/sync/hcp/invoices', async (req, res) => {
  const routeName = 'POST /api/inventory/sync/hcp/invoices';
  
  try {
    // Validate environment variables
    const missingVars: string[] = [];
    if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_KEY');
    
    if (missingVars.length > 0) {
      console.error(`❌ [${req.requestId}] ${routeName}: Missing environment variables:`, missingVars);
      return sendError(res, 'ENV_VALIDATION_ERROR', 'Missing required environment variables', 500, { missing: missingVars });
    }
    
    const organizationId = '00000000-0000-0000-0000-000000000001';
    const { startDate, endDate } = req.body;
    
    console.log(`📄 [${req.requestId}] ${routeName}: Sync requested (${startDate || 'all'} to ${endDate || 'now'})`);
    
    // Get HCP API token
    const hcpToken = await oauthService.getHCPAccessToken(organizationId);
    if (!hcpToken) {
      return sendError(res, 'HCP_NOT_CONNECTED', 'HCP not connected. Please authenticate first.', 400);
    }
    
    // Build query parameters
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    // Fetch invoices from HCP with retry logic and timeout
    const invoices = await RetryService.withRetry(async () => {
      const response = await axios.get('https://api.housecallpro.com/invoices', {
        headers: {
          'Authorization': `Token ${hcpToken}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 15000 // 15 second timeout
      });
      
      return response.data.invoices || response.data.data || [];
    });
    
    console.log(`📄 [${req.requestId}] ${routeName}: Retrieved ${invoices.length} invoices from HCP`);
    
    // Log sync operation
    await supabase.from('sync_logs').insert({
      organization_id: organizationId,
      sync_type: 'hcp_invoices',
      provider: 'hcp',
      status: 'completed',
      request_data: { start_date: startDate, end_date: endDate },
      response_data: { invoices_retrieved: invoices.length }
    });
    
    sendSuccess(res, { 
      invoices_synced: invoices.length,
      message: `Successfully synced ${invoices.length} invoices from HCP`
    });
  } catch (error: any) {
    const isAxiosError = error.response !== undefined;
    const upstreamStatus = error.response?.status;
    
    // Map upstream errors to appropriate status codes
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = error.message;
    
    if (isAxiosError) {
      console.error(`❌ [${req.requestId}] ${routeName}: Upstream HCP error - Status ${upstreamStatus}`);
      
      if (upstreamStatus === 401 || upstreamStatus === 403) {
        statusCode = 401;
        errorCode = 'HCP_AUTH_FAILED';
        errorMessage = 'HCP authentication failed. Please reconnect.';
      } else if (upstreamStatus === 429) {
        statusCode = 429;
        errorCode = 'HCP_RATE_LIMIT';
        errorMessage = 'HCP rate limit exceeded. Please try again later.';
      } else if (upstreamStatus >= 500) {
        statusCode = 502;
        errorCode = 'HCP_SERVICE_UNAVAILABLE';
        errorMessage = 'HCP service unavailable. Please try again later.';
      }
      
      // Log truncated response body (no tokens)
      if (error.response?.data) {
        const bodyStr = JSON.stringify(error.response.data).substring(0, 500);
        console.error(`❌ [${req.requestId}] Response body (truncated):`, bodyStr);
      }
    } else {
      console.error(`❌ [${req.requestId}] ${routeName}: Internal error:`, error.message);
    }
    
    // Log failed sync
    await supabase.from('sync_logs').insert({
      organization_id: '00000000-0000-0000-0000-000000000001',
      sync_type: 'hcp_invoices',
      provider: 'hcp',
      status: 'failed',
      error_message: errorMessage
    }).catch(err => console.error('Failed to log error:', err));
    
    sendError(res, errorCode, errorMessage, statusCode);
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
    
    // First, fetch all material categories
    console.log('📦 Fetching material categories from HCP...');
    const categories = await RetryService.withRetry(async () => {
      const response = await axios.get('https://api.housecallpro.com/api/price_book/material_categories', {
        headers: {
          'Authorization': `Token ${hcpToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: 1,
          page_size: 100 // Get up to 100 categories per page
        }
      });
      
      return response.data.data || [];
    });
    
    console.log(`📦 Retrieved ${categories.length} material categories from HCP`);
    
    // Now fetch materials from each category
    const allMaterials = [];
    for (const category of categories) {
      try {
        console.log(`📦 Fetching materials from category: ${category.name} (${category.uuid})`);
        
        // Fetch materials for this category with pagination
        let page = 1;
        let hasMorePages = true;
        
        while (hasMorePages) {
          const materialsResponse = await RetryService.withRetry(async () => {
            const response = await axios.get('https://api.housecallpro.com/api/price_book/materials', {
              headers: {
                'Authorization': `Token ${hcpToken}`,
                'Content-Type': 'application/json'
              },
              params: {
                material_category_uuid: category.uuid,
                page: page,
                page_size: 100
              }
            });
            
            return response.data;
          });
          
          const materials = materialsResponse.data || [];
          allMaterials.push(...materials);
          
          console.log(`📦 Retrieved ${materials.length} materials from category ${category.name} (page ${page})`);
          
          // Check if there are more pages
          hasMorePages = page < (materialsResponse.total_pages_count || 0);
          page++;
        }
      } catch (error) {
        console.error(`⚠️ Failed to fetch materials from category ${category.name}:`, error);
        // Continue with other categories
      }
    }
    
    const materials = allMaterials;
    console.log(`📦 Total materials retrieved from all categories: ${materials.length}`);
    
    let itemsCreated = 0;
    let itemsUpdated = 0;
    
    // Process each material
    for (const material of materials) {
      try {
        const { uuid, name, description, cost, price, part_number, material_category_name } = material;
        
        // Check if item already exists by HCP ID
        const { data: existing } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('hcp_id', uuid)
          .maybeSingle();
        
        if (existing) {
          // Update existing item
          await supabase
            .from('inventory_items')
            .update({
              name,
              description,
              unit_cost: cost ? cost / 100 : undefined, // Convert cents to dollars
              unit_price: price ? price / 100 : undefined,
              sku: part_number || uuid,
              category: material_category_name || 'Uncategorized',
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          
          itemsUpdated++;
        } else {
          // Create new item
          await supabase
            .from('inventory_items')
            .insert({
              organization_id: organizationId,
              hcp_id: uuid,
              name,
              description,
              sku: part_number || uuid,
              unit_cost: cost ? cost / 100 : 0,
              unit_price: price ? price / 100 : 0,
              category: material_category_name || 'Uncategorized',
              item_type: 'material'
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

// Sync HCP services endpoint
router.post('/sync/hcp/services', async (req, res) => {
  try {
    const organizationId = '00000000-0000-0000-0000-000000000001';
    console.log('🛠️ Syncing HCP services...');
    
    // Get HCP API token
    const hcpToken = await oauthService.getHCPAccessToken(organizationId);
    if (!hcpToken) {
      return res.status(400).json({ error: 'HCP not connected. Please authenticate first.' });
    }
    
    let allServices: any[] = [];
    let currentPage = 1;
    let totalPages = 1;
    
    // Fetch all services with pagination
    while (currentPage <= totalPages) {
      console.log(`📄 Fetching services page ${currentPage}...`);
      
      const response = await RetryService.withRetry(async () => {
        return await axios.get('https://api.housecallpro.com/api/price_book/services', {
          headers: {
            'Authorization': `Token ${hcpToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            page: currentPage,
            page_size: 100,
            sort_by: 'created_at',
            sort_direction: 'desc'
          }
        });
      });
      
      const servicesData = response.data.data || [];
      allServices = allServices.concat(servicesData);
      
      totalPages = response.data.total_pages || 1;
      console.log(`✅ Page ${currentPage}/${totalPages}: ${servicesData.length} services`);
      
      currentPage++;
    }
    
    console.log(`📊 Total services retrieved: ${allServices.length}`);
    
    // Process and insert/update services
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const service of allServices) {
      try {
        // Check if service already exists
        const { data: existing } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('hcp_id', service.uuid)
          .eq('organization_id', organizationId)
          .single();
        
        const itemData = {
          organization_id: organizationId,
          hcp_id: service.uuid,
          name: service.name,
          description: service.description || '',
          sku: service.task_number || service.uuid,
          category: service.category?.name || 'Service',
          unit_cost: service.cost ? service.cost / 100 : 0,
          unit_price: service.price ? service.price / 100 : 0,
          item_type: 'service',
          taxable: service.taxable || false,
          flat_rate_enabled: service.flat_rate_enabled || false,
          online_booking_enabled: service.online_booking_enabled || false,
          duration: service.duration || null,
          image_url: service.image || null,
          unit_of_measure: service.unit_of_measure || 'each'
        };
        
        if (existing) {
          await supabase
            .from('inventory_items')
            .update(itemData)
            .eq('id', existing.id);
          updatedCount++;
        } else {
          await supabase
            .from('inventory_items')
            .insert(itemData);
          insertedCount++;
        }
      } catch (itemError: any) {
        console.error(`⚠️ Error processing service ${service.uuid}:`, itemError.message);
      }
    }
    
    console.log(`✅ Services sync complete: ${insertedCount} inserted, ${updatedCount} updated`);
    
    await supabase.from('sync_logs').insert({
      organization_id: organizationId,
      sync_type: 'hcp_services',
      provider: 'hcp',
      status: 'completed',
      items_synced: allServices.length,
      metadata: {
        inserted: insertedCount,
        updated: updatedCount
      }
    });
    
    res.json({ 
      success: true, 
      message: `Synced ${allServices.length} services from HCP (${insertedCount} new, ${updatedCount} updated)`
    });
  } catch (error: any) {
    console.error('❌ Error syncing HCP services:', error.message);
    
    await supabase.from('sync_logs').insert({
      organization_id: '00000000-0000-0000-0000-000000000001',
      sync_type: 'hcp_services',
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
