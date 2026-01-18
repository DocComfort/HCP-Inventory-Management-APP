import { supabase } from '../config/supabase.js';
import { OAuth2Service } from './oauth.service.js';
import { QBWCService } from './qbwc.service.js';
import { RetryService } from './retry.service.js';
import axios from 'axios';

const oauthService = new OAuth2Service();
const qbwcService = new QBWCService();

export class WebhookService {
  /**
   * Store webhook event in database
   */
  async storeWebhookEvent(eventData: {
    organization_id: string;
    provider: 'hcp' | 'qbo';
    event_type: string;
    payload: any;
  }): Promise<void> {
    await supabase.from('webhook_events').insert({
      ...eventData,
      processed: false
    });
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(eventId: string, error?: string): Promise<void> {
    await supabase
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: error
      })
      .eq('id', eventId);
  }

  /**
   * Get organization by QuickBooks realm ID
   */
  async getOrgByRealmId(realmId: string): Promise<string | null> {
    const { data } = await supabase
      .from('oauth_tokens')
      .select('organization_id')
      .eq('provider', 'qbo')
      .eq('realm_id', realmId)
      .single();

    return data?.organization_id || null;
  }

  /**
   * Handle HCP invoice.created event
   */
  async handleHCPInvoiceCreated(invoiceData: any, organizationId: string): Promise<void> {
    console.log('Processing HCP invoice.created');
    
    try {
      const invoiceId = invoiceData.id;
      
      // Check idempotency - prevent duplicate inventory deductions
      const alreadyProcessed = await RetryService.isInvoiceAlreadyProcessed(
        invoiceId,
        organizationId
      );
      
      if (alreadyProcessed) {
        console.log(`⚠️  Invoice ${invoiceId} already processed. Skipping to prevent duplicate inventory deductions.`);
        return;
      }
      
      // Extract line items from invoice
      const lineItems = invoiceData.line_items || [];
      
      // Process each line item for inventory deduction
      for (const item of lineItems) {
        const { sku, quantity, location_id } = item;
        
        if (!sku || !quantity) continue;
        
        // Find inventory item by SKU
        const { data: inventoryItem } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('sku', sku)
          .single();
        
        if (!inventoryItem) {
          console.warn(`Inventory item not found for SKU: ${sku}`);
          continue;
        }
        
        // Update location stock
        const { data: locationStock } = await supabase
          .from('location_stock')
          .select('*')
          .eq('item_id', inventoryItem.id)
          .eq('location_id', location_id)
          .single();
        
        if (locationStock) {
          const newQuantity = Math.max(0, locationStock.quantity - quantity);
          
          await supabase
            .from('location_stock')
            .update({
              quantity: newQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('id', locationStock.id);
          
          // Queue QB Desktop sync if configured
          await qbwcService.queueInventoryAdjustment(
            inventoryItem.id,
            location_id,
            -quantity,
            `Invoice ${invoiceData.invoice_number || 'N/A'}`,
            organizationId
          );
          
          console.log(`Deducted ${quantity} of ${sku} from location ${location_id}`);
        }
      }
      
      // Create sync log
      await supabase.from('sync_logs').insert({
        organization_id: organizationId,
        sync_type: 'invoice_sync',
        provider: 'hcp',
        status: 'completed',
        request_data: { invoice_id: invoiceData.id },
        response_data: { items_processed: lineItems.length }
      });
      
    } catch (error: any) {
      console.error('Error handling HCP invoice:', error);
      
      await supabase.from('sync_logs').insert({
        organization_id: organizationId,
        sync_type: 'invoice_sync',
        provider: 'hcp',
        status: 'failed',
        error_message: error.message
      });
    }
  }

  /**
   * Handle HCP invoice.updated event
   */
  async handleHCPInvoiceUpdated(invoiceData: any, organizationId: string): Promise<void> {
    console.log('Processing HCP invoice.updated');
    // Similar logic to invoice.created, but check for changes
  }

  /**
   * Handle HCP inventory.updated event
   */
  async handleHCPInventoryUpdated(inventoryData: any, organizationId: string): Promise<void> {
    console.log('Processing HCP inventory.updated');
    
    try {
      const { sku, quantity, location_id } = inventoryData;
      
      // Find and update inventory item
      const { data: item } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('hcp_item_id', inventoryData.item_id)
        .single();
      
      if (item) {
        await supabase
          .from('location_stock')
          .update({
            quantity,
            last_updated: new Date().toISOString()
          })
          .eq('item_id', item.id)
          .eq('location_id', location_id);
        
        console.log(`Updated inventory for item ${item.id}`);
      }
      
    } catch (error: any) {
      console.error('Error handling HCP inventory update:', error);
    }
  }

  /**
   * Handle HCP job.completed event
   * This is triggered when a technician completes a job
   * Actions: 1) Calculate labor time, 2) Fetch line items, 3) Deduct materials from inventory
   */
  async handleHCPJobCompleted(jobData: any, organizationId: string): Promise<void> {
    console.log('🏁 Processing HCP job.completed');
    
    try {
      const jobId = jobData.id;
      
      // Check idempotency - prevent duplicate processing
      const alreadyProcessed = await RetryService.isJobAlreadyProcessed(
        jobId,
        organizationId,
        'job_completed'
      );
      
      if (alreadyProcessed) {
        console.log(`⚠️  Job ${jobId} already processed. Skipping to prevent duplicate inventory deductions.`);
        return;
      }
      
      // Get HCP access token
      const accessToken = await oauthService.getHCPAccessToken(organizationId);
      
      // 1. Fetch full job details including work_timestamps
      const jobResponse = await axios.get(
        `https://api.housecallpro.com/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Token ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const job = jobResponse.data.job || jobResponse.data;
      const workTimestamps = job.work_timestamps || {};
      
      // 2. Calculate labor time
      if (workTimestamps.started_at && workTimestamps.completed_at) {
        const startTime = new Date(workTimestamps.started_at);
        const endTime = new Date(workTimestamps.completed_at);
        const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
        const durationHours = (durationMinutes / 60).toFixed(2);
        
        console.log(`⏱️  Labor Duration: ${durationHours} hours (${durationMinutes.toFixed(2)} minutes)`);
        
        // Calculate travel time if available
        if (workTimestamps.on_my_way_at) {
          const onMyWayTime = new Date(workTimestamps.on_my_way_at);
          const travelMinutes = (startTime.getTime() - onMyWayTime.getTime()) / 60000;
          console.log(`🚗 Travel Duration: ${(travelMinutes / 60).toFixed(2)} hours`);
        }
        
        // Store labor data (you can add a labor_logs table later)
        console.log(`👷 Assigned to: ${job.assigned_employees?.map((e: any) => e.name || e.id).join(', ') || 'Unassigned'}`);
      }
      
      // 3. Fetch line items to identify materials used
      const lineItemsResponse = await axios.get(
        `https://api.housecallpro.com/jobs/${jobId}/line_items`,
        {
          headers: {
            'Authorization': `Token ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const allLineItems = lineItemsResponse.data.line_items || lineItemsResponse.data.data || [];
      
      // Filter for materials only (exclude labor, services, etc.)
      const materials = allLineItems.filter((item: any) => item.kind === 'materials');
      
      console.log(`📦 Found ${materials.length} material items to process`);
      
      // 4. Process each material for inventory deduction
      for (const material of materials) {
        const { name, quantity, service_item_id, unit_cost } = material;
        
        console.log(`  📦 DEDUCT: ${name} | Qty: ${quantity} | SKU: ${service_item_id || 'N/A'}`);
        
        if (!service_item_id || !quantity) {
          console.warn(`  ⚠️  Skipping ${name}: Missing SKU or quantity`);
          continue;
        }
        
        // Find inventory item by service_item_id (SKU)
        const { data: inventoryItem } = await supabase
          .from('inventory_items')
          .select('id, name, sku')
          .eq('organization_id', organizationId)
          .eq('sku', service_item_id)
          .single();
        
        if (!inventoryItem) {
          console.warn(`  ⚠️  Inventory item not found for SKU: ${service_item_id}`);
          continue;
        }
        
        // Determine location (use job's address or default to first location)
        const locationId = job.address?.location_id || job.location_id || 'default-location';
        
        // Update location stock
        const { data: locationStock } = await supabase
          .from('location_stock')
          .select('*')
          .eq('item_id', inventoryItem.id)
          .eq('location_id', locationId)
          .maybeSingle();
        
        if (locationStock) {
          const newQuantity = Math.max(0, locationStock.quantity - quantity);
          
          await supabase
            .from('location_stock')
            .update({
              quantity: newQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('id', locationStock.id);
          
          console.log(`  ✅ Deducted ${quantity} of ${inventoryItem.name} (New qty: ${newQuantity})`);
          
          // Queue QuickBooks Desktop sync if configured
          await qbwcService.queueInventoryAdjustment(
            inventoryItem.id,
            locationId,
            -quantity,
            `Job ${job.job_number || jobId}`,
            organizationId
          );
        } else {
          console.warn(`  ⚠️  No stock record found for item ${inventoryItem.name} at location ${locationId}`);
        }
      }
      
      // 5. Create sync log
      await supabase.from('sync_logs').insert({
        organization_id: organizationId,
        sync_type: 'job_completed',
        provider: 'hcp',
        status: 'completed',
        request_data: { job_id: jobId },
        response_data: { 
          materials_processed: materials.length,
          labor_hours: workTimestamps.started_at && workTimestamps.completed_at 
            ? ((new Date(workTimestamps.completed_at).getTime() - new Date(workTimestamps.started_at).getTime()) / 3600000).toFixed(2)
            : null
        }
      });
      
      console.log(`✅ Job completed processing finished: ${jobId}`);
      
    } catch (error: any) {
      console.error('❌ Error handling HCP job.completed:', error);
      
      await supabase.from('sync_logs').insert({
        organization_id: organizationId,
        sync_type: 'job_completed',
        provider: 'hcp',
        status: 'failed',
        error_message: error.message
      });
    }
  }

  /**
   * Handle HCP job.started event
   * Log work start time for labor tracking
   */
  async handleHCPJobStarted(jobData: any, organizationId: string): Promise<void> {
    console.log('▶️  Processing HCP job.started');
    console.log(`   Job ID: ${jobData.id}`);
    console.log(`   Started at: ${jobData.work_timestamps?.started_at || 'N/A'}`);
    // TODO: Store in labor_logs table when implemented
  }

  /**
   * Handle HCP job.on_my_way event
   * Log travel start time for labor tracking
   */
  async handleHCPJobOnMyWay(jobData: any, organizationId: string): Promise<void> {
    console.log('🚗 Processing HCP job.on_my_way');
    console.log(`   Job ID: ${jobData.id}`);
    console.log(`   On my way at: ${jobData.work_timestamps?.on_my_way_at || 'N/A'}`);
    // TODO: Store in labor_logs table when implemented
  }

  /**
   * Handle HCP invoice.paid event
   * Secondary check to ensure materials are finalized
   */
  async handleHCPInvoicePaid(invoiceData: any, organizationId: string): Promise<void> {
    console.log('💰 Processing HCP invoice.paid');
    console.log(`   Invoice ID: ${invoiceData.id}`);
    // Most inventory deduction happens at job.completed
    // This is a secondary verification point if needed
  }

  /**
   * Handle QuickBooks Online invoice change
   */
  async handleQBOInvoiceChange(invoiceId: string, realmId: string, organizationId: string): Promise<void> {
    console.log(`Processing QBO invoice change: ${invoiceId}`);
    
    try {
      // Get access token
      const { token } = await oauthService.getQBOAccessToken(organizationId);
      
      // Fetch invoice details from QBO
      const response = await axios.get(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/invoice/${invoiceId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const invoice = response.data.Invoice;
      
      // Log the sync
      await supabase.from('sync_logs').insert({
        organization_id: organizationId,
        sync_type: 'invoice_sync',
        provider: 'qbo',
        status: 'completed',
        request_data: { invoice_id: invoiceId },
        response_data: invoice
      });
      
      console.log(`Synced QBO invoice: ${invoice.DocNumber}`);
      
    } catch (error: any) {
      console.error('Error handling QBO invoice:', error);
      
      await supabase.from('sync_logs').insert({
        organization_id: organizationId,
        sync_type: 'invoice_sync',
        provider: 'qbo',
        status: 'failed',
        error_message: error.message
      });
    }
  }

  /**
   * Handle QuickBooks Online item change
   */
  async handleQBOItemChange(itemId: string, realmId: string, organizationId: string): Promise<void> {
    console.log(`Processing QBO item change: ${itemId}`);
    
    try {
      const { token } = await oauthService.getQBOAccessToken(organizationId);
      
      // Fetch item details from QBO
      const response = await axios.get(
        `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/item/${itemId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const item = response.data.Item;
      
      // Update local inventory item if it exists
      const { data: localItem } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('qbo_item_id', itemId)
        .single();
      
      if (localItem) {
        await supabase
          .from('inventory_items')
          .update({
            name: item.Name,
            description: item.Description,
            unit_cost: item.PurchaseCost || 0,
            unit_price: item.UnitPrice || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', localItem.id);
        
        console.log(`Updated local item from QBO: ${item.Name}`);
      }
      
    } catch (error: any) {
      console.error('Error handling QBO item:', error);
    }
  }
}
