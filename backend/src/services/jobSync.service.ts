import axios from 'axios';
import { supabase } from '../config/supabase.js';
import { OAuth2Service } from './oauth.service.js';

interface JobTimestamp {
  arrival_time?: string;
  departure_time?: string;
  start_time?: string;
  end_time?: string;
}

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  sku?: string;
  item_id?: string;
}

interface CompletedJob {
  id: string;
  job_number: string;
  work_status: string;
  work_timestamps: JobTimestamp;
  total_amount: number;
  customer_id: string;
  updated_at: string;
}

export class JobSyncService {
  private oauth2Service: OAuth2Service;
  private readonly HCP_API_URL = process.env.HCP_API_URL || 'https://api.housecallpro.com';

  constructor() {
    this.oauth2Service = new OAuth2Service();
  }

  /**
   * Get the last successful sync timestamp for an organization
   */
  private async getLastSyncTimestamp(organizationId: string): Promise<string> {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('created_at')
      .eq('organization_id', organizationId)
      .eq('platform', 'hcp')
      .eq('status', 'success')
      .eq('sync_type', 'job_polling')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Default to 24 hours ago if no previous sync
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() - 24);
      return defaultDate.toISOString();
    }

    return data.created_at;
  }

  /**
   * Update the last sync timestamp
   */
  private async updateLastSyncTimestamp(organizationId: string, status: 'success' | 'error', message?: string): Promise<void> {
    await supabase
      .from('sync_logs')
      .insert({
        organization_id: organizationId,
        platform: 'hcp',
        sync_type: 'job_polling',
        status,
        message: message || `Polled completed jobs at ${new Date().toISOString()}`,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Calculate labor duration from work timestamps (in hours)
   */
  private calculateLaborDuration(timestamps: JobTimestamp): number {
    const startTime = timestamps.start_time || timestamps.arrival_time;
    const endTime = timestamps.end_time || timestamps.departure_time;

    if (!startTime || !endTime) {
      return 0;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    return Math.max(0, durationHours);
  }

  /**
   * Fetch line items for a specific job
   */
  private async fetchJobLineItems(jobId: string, accessToken: string): Promise<LineItem[]> {
    try {
      const response = await axios.get(`${this.HCP_API_URL}/jobs/${jobId}/line_items`, {
        headers: {
          'Authorization': `Token ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.line_items || [];
    } catch (error: any) {
      console.error(`Error fetching line items for job ${jobId}:`, error.message);
      return [];
    }
  }

  /**
   * Process materials used in a job and update inventory
   */
  private async processMaterialsUsed(
    jobId: string,
    lineItems: LineItem[],
    organizationId: string,
    locationId?: string
  ): Promise<void> {
    for (const item of lineItems) {
      if (!item.sku && !item.item_id) continue;

      // Find the inventory item
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('organization_id', organizationId)
        .or(`sku.eq.${item.sku},hcp_item_id.eq.${item.item_id}`)
        .single();

      if (!inventoryItem) {
        console.warn(`Inventory item not found for SKU: ${item.sku} or ID: ${item.item_id}`);
        continue;
      }

      // Deduct from location stock
      if (locationId) {
        const { data: locationStock } = await supabase
          .from('location_stock')
          .select('quantity')
          .eq('item_id', inventoryItem.id)
          .eq('location_id', locationId)
          .single();

        if (locationStock) {
          const newQuantity = Math.max(0, locationStock.quantity - item.quantity);
          
          await supabase
            .from('location_stock')
            .update({
              quantity: newQuantity,
              last_updated: new Date().toISOString()
            })
            .eq('item_id', inventoryItem.id)
            .eq('location_id', locationId);

          console.log(`Deducted ${item.quantity} units of ${item.name} from location ${locationId}`);
        }
      }
    }
  }

  /**
   * Store job data including labor duration and materials
   */
  private async storeJobData(
    job: CompletedJob,
    laborDuration: number,
    materialsUsed: LineItem[],
    organizationId: string
  ): Promise<void> {
    await supabase
      .from('completed_jobs')
      .upsert({
        organization_id: organizationId,
        hcp_job_id: job.id,
        job_number: job.job_number,
        work_status: job.work_status,
        labor_hours: laborDuration,
        total_amount: job.total_amount,
        customer_id: job.customer_id,
        materials_used: materialsUsed,
        completed_at: job.updated_at,
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'hcp_job_id'
      });
  }

  /**
   * Main sync function: Fetch recently completed jobs and process them
   */
  async syncRecentJobs(organizationId: string): Promise<{ processed: number; errors: number }> {
    console.log(`[JobSync] Starting sync for organization ${organizationId}`);
    
    let processed = 0;
    let errors = 0;
    let accessToken: string;

    try {
      // Get HCP access token
      accessToken = await this.oauth2Service.getHCPAccessToken(organizationId);
    } catch (error: any) {
      console.error('[JobSync] Failed to get HCP access token:', error.message);
      await this.updateLastSyncTimestamp(organizationId, 'error', `Authentication failed: ${error.message}`);
      return { processed, errors: 1 };
    }

    try {
      // Get last sync timestamp
      const updatedAfter = await this.getLastSyncTimestamp(organizationId);
      console.log(`[JobSync] Fetching jobs updated after ${updatedAfter}`);

      // Fetch completed jobs from HCP
      const response = await axios.get(`${this.HCP_API_URL}/jobs`, {
        headers: {
          'Authorization': `Token ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          work_status: 'completed',
          updated_after: updatedAfter,
          page_size: 100
        }
      });

      const jobs: CompletedJob[] = response.data.jobs || [];
      console.log(`[JobSync] Found ${jobs.length} completed jobs`);

      // Process each job
      for (const job of jobs) {
        try {
          // Calculate labor duration
          const laborDuration = this.calculateLaborDuration(job.work_timestamps);

          // Fetch line items (materials used)
          const lineItems = await this.fetchJobLineItems(job.id, accessToken);

          // Filter for materials
          const materialsUsed = lineItems.filter(item => item.sku || item.item_id);

          // Process materials and update inventory
          await this.processMaterialsUsed(
            job.id,
            materialsUsed,
            organizationId,
            undefined
          );

          // Store job data
          await this.storeJobData(job, laborDuration, materialsUsed, organizationId);

          processed++;
          console.log(`[JobSync] Processed job ${job.job_number} (${laborDuration.toFixed(2)} hours labor, ${materialsUsed.length} materials)`);

        } catch (jobError: any) {
          errors++;
          console.error(`[JobSync] Error processing job ${job.id}:`, jobError.message);
        }
      }

      // Update last sync timestamp only if entire batch succeeds
      if (errors === 0) {
        await this.updateLastSyncTimestamp(organizationId, 'success', `Processed ${processed} jobs`);
        console.log(`[JobSync] Sync completed successfully: ${processed} jobs processed`);
      } else {
        await this.updateLastSyncTimestamp(organizationId, 'error', `Processed ${processed} jobs with ${errors} errors`);
        console.log(`[JobSync] Sync completed with errors: ${processed} jobs processed, ${errors} errors`);
      }

    } catch (error: any) {
      console.error('[JobSync] Fatal error during sync:', error.message);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        console.error(`[JobSync] Rate limited. Retry after ${retryAfter} seconds`);
        await this.updateLastSyncTimestamp(
          organizationId,
          'error',
          `Rate limited. Retry after ${retryAfter}s`
        );
      } else {
        await this.updateLastSyncTimestamp(organizationId, 'error', error.message);
      }
      
      errors++;
    }

    return { processed, errors };
  }

  /**
   * Sync jobs for all connected organizations
   */
  async syncAllOrganizations(): Promise<void> {
    console.log('[JobSync] Starting sync for all organizations');

    // Get all organizations with HCP connected
    const { data: organizations } = await supabase
      .from('oauth_tokens')
      .select('organization_id')
      .eq('provider', 'hcp');

    if (!organizations || organizations.length === 0) {
      console.log('[JobSync] No organizations with HCP connected');
      return;
    }

    for (const org of organizations) {
      try {
        await this.syncRecentJobs(org.organization_id);
      } catch (error: any) {
        console.error(`[JobSync] Error syncing organization ${org.organization_id}:`, error.message);
      }
    }

    console.log('[JobSync] Completed sync for all organizations');
  }
}
