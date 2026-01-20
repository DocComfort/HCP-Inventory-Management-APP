import { supabase } from './supabase';
import * as apiClient from './apiClient';

// OAuth and webhook endpoints must go to Railway backend directly
// Sync endpoints use Netlify Functions for security
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || '';

// Integration status types
export interface IntegrationStatus {
  platform: 'hcp' | 'qbd' | 'qbo';
  connected: boolean;
  lastSync: string | null;
  companyId?: string;
  realmId?: string;
  tokenExpired?: boolean;
  error?: string;
}

// QuickBooks Online Integration
export const qboIntegration = {
  // Get OAuth authorization URL
  async getAuthUrl(organizationId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/oauth/qbo/authorize?org_id=${organizationId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get QBO auth URL');
      }
      
      // Response is a redirect, return the URL from headers or body
      return response.url;
    } catch (error) {
      throw new Error(`QBO OAuth setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Handle OAuth callback
  async handleCallback(code: string, state: string, realmId: string) {
    // This is handled by the backend redirect
    // Frontend just receives the redirect back
    return { success: true, message: 'QBO connected successfully' };
  },

  // Refresh access token
  async refreshToken(organizationId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/oauth/refresh/qbo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh QBO token');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`QBO token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Disconnect
  async disconnect(organizationId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/oauth/disconnect/qbo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect QBO');
      }
      
      return { success: true, message: 'Disconnected from QBO' };
    } catch (error) {
      throw new Error(`QBO disconnect failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get connection status
  async getStatus(organizationId: string = 'default'): Promise<IntegrationStatus> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/oauth/status/qbo?org_id=${organizationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        return { platform: 'qbo', connected: false, lastSync: null };
      }
      
      const data = await response.json();
      return {
        platform: 'qbo',
        connected: data.connected,
        lastSync: data.lastSync,
        realmId: data.realmId,
        tokenExpired: data.tokenExpired,
      };
    } catch (error) {
      return { platform: 'qbo', connected: false, lastSync: null };
    }
  },

  // Sync inventory items from QBO
  async syncItems(organizationId: string = 'default') {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sync/qbo/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync items from QBO');
      }
      
      const data = await response.json();
      return { items: data.items || [], synced: data.imported || 0 };
    } catch (error) {
      throw new Error(`QBO items sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Sync vendors from QBO
  async syncVendors(organizationId: string = 'default') {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sync/qbo/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync vendors from QBO');
      }
      
      const data = await response.json();
      return { vendors: data.vendors || [], synced: data.imported || 0 };
    } catch (error) {
      throw new Error(`QBO vendors sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Create purchase order in QBO
  async createPurchaseOrder(vendorId: string, lines: any[], memo?: string, organizationId: string = 'default') {
    try {
      const response = await fetch(`${BACKEND_URL}/api/sync/qbo/purchase-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organization_id: organizationId,
          vendor_id: vendorId,
          lines,
          memo
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create purchase order');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`QBO PO creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get classes (locations) from QBO
  async getClasses(organizationId: string = 'default') {
    return { classes: [] };
  },
};

// Housecall Pro Integration
export const hcpIntegration = {
  // Connect with API key
  async connect(apiKey: string, webhookSecret?: string) {
    // Use a fixed UUID for the default organization (in production, get from auth context)
    const organizationId = '00000000-0000-0000-0000-000000000001';
    
    const response = await fetch(`${BACKEND_URL}/api/oauth/hcp/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId, apiKey, webhookSecret }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to connect to Housecall Pro');
    }
    
    const data = await response.json();
    return data;
  },

  // Disconnect
  async disconnect() {
    const organizationId = '00000000-0000-0000-0000-000000000001'; // In production, get from auth context
    
    const response = await fetch(`${BACKEND_URL}/api/oauth/disconnect/hcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to disconnect from Housecall Pro');
    }
    
    const data = await response.json();
    return data;
  },

  // Get connection status
  async getStatus(): Promise<IntegrationStatus> {
    const organizationId = '00000000-0000-0000-0000-000000000001'; // In production, get from auth context
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/oauth/status/hcp?org_id=${organizationId}`);
      
      if (!response.ok) {
        const error = await response.json();
        return { platform: 'hcp', connected: false, lastSync: null, error: error.error };
      }
      
      const data = await response.json();
      return {
        platform: 'hcp',
        connected: data.connected,
        lastSync: data.lastSync || null,
      };
    } catch (error) {
      return { platform: 'hcp', connected: false, lastSync: null, error: (error as Error).message };
    }
  },

  // Sync invoices from HCP (uses Netlify Function proxy for security)
  async syncInvoices(startDate?: string, endDate?: string) {
    const response = await fetch('/.netlify/functions/sync-hcp-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to sync HCP invoices' }));
      throw new Error(error.message || 'Failed to sync HCP invoices');
    }
    
    return response.json();
  },

  // Sync items/products from HCP
  async syncItems() {
    const response = await fetch(`${BACKEND_URL}/api/inventory/sync/hcp/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!response.ok) throw new Error(`Failed to sync items: ${response.statusText}`);
    return response.json();
  },

  // Sync services from HCP
  async syncServices() {
    const response = await fetch(`${BACKEND_URL}/api/inventory/sync/hcp/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!response.ok) throw new Error(`Failed to sync services: ${response.statusText}`);
    return response.json();
  },

  // Sync jobs from HCP (for inventory and payroll tracking)
  async syncJobs(options?: { startDate?: string; endDate?: string; workStatus?: string[] }) {
    const response = await fetch(`${BACKEND_URL}/api/inventory/sync/hcp/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    
    if (!response.ok) throw new Error(`Failed to sync jobs: ${response.statusText}`);
    return response.json();
  },

  // Get technicians
  async getTechnicians() {
    const response = await fetch(`${BACKEND_URL}/api/inventory/sync/hcp/technicians`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error(`Failed to get technicians: ${response.statusText}`);
    return response.json();
  },
};

// QuickBooks Desktop Integration (via middleware)
export const qbdIntegration = {
  // Configure middleware connection
  async configure(middlewareUrl: string, apiKey: string) {
    const { error } = await supabase
      .from('integration_credentials')
      .upsert({
        platform: 'qbd',
        middleware_url: middlewareUrl,
        api_key: apiKey,
        is_connected: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'platform' });
    
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Disconnect
  async disconnect() {
    const { error } = await supabase
      .from('integration_credentials')
      .update({
        middleware_url: null,
        api_key: null,
        is_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq('platform', 'qbd');
    
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Get connection status
  async getStatus(organizationId: string = 'default'): Promise<IntegrationStatus> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/oauth/status/qbd?org_id=${organizationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        return { platform: 'qbd', connected: false, lastSync: null };
      }
      
      const data = await response.json();
      return {
        platform: 'qbd',
        connected: data.connected,
        lastSync: data.lastSync || null,
      };
    } catch (error) {
      return { platform: 'qbd', connected: false, lastSync: null };
    }
  },

  // Sync via QBWC (QB Desktop Web Connector)
  async syncInventory(organizationId: string = 'default') {
    try {
      const response = await fetch(`/.netlify/functions/sync-qbd-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync with QuickBooks Desktop');
      }
      
      const data = await response.json();
      return { success: true, synced: data.synced || 0, message: data.message };
    } catch (error) {
      throw new Error(`QBD sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Download .qwc file for QBWC installation
  async downloadQWCFile(organizationId: string = 'default') {
    try {
      const response = await fetch(`${BACKEND_URL}/api/qbwc/download-qwc?org_id=${organizationId}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error('Failed to download QWC file');
      }
      
      return response.blob();
    } catch (error) {
      throw new Error(`QWC download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

// Get all integration statuses
export async function getAllIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const [hcp, qbd, qbo] = await Promise.all([
    hcpIntegration.getStatus(),
    qbdIntegration.getStatus(),
    qboIntegration.getStatus(),
  ]);

  return [hcp, qbd, qbo];
}

// Get sync logs
export async function getSyncLogs(platform?: string, limit = 50) {
  let query = supabase
    .from('sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (platform) {
    query = query.eq('provider', platform);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// Get webhook events
export async function getWebhookEvents(platform?: string, limit = 50) {
  let query = supabase
    .from('webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

