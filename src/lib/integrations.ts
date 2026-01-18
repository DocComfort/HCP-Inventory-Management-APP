import { supabase } from './supabase';

// API URL for backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  async getAuthUrl(clientId: string, clientSecret: string, redirectUri: string) {
    throw new Error('QBO OAuth setup not yet implemented. Please use the backend OAuth flow.');
  },

  // Handle OAuth callback
  async handleCallback(code: string, realmId: string, state: string) {
    throw new Error('QBO OAuth callback not yet implemented.');
  },

  // Refresh access token
  async refreshToken() {
    throw new Error('QBO token refresh not yet implemented.');
  },

  // Disconnect
  async disconnect() {
    throw new Error('QBO disconnect not yet implemented.');
  },

  // Get connection status
  async getStatus(): Promise<IntegrationStatus> {
    try {
      const response = await fetch(`${API_URL}/api/oauth/qbo/status`, {
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
  async syncItems() {
    return { items: [], synced: 0 };
  },

  // Sync vendors from QBO
  async syncVendors() {
    return { vendors: [], synced: 0 };
  },

  // Create purchase order in QBO
  async createPurchaseOrder(vendorId: string, lines: any[], memo?: string) {
    throw new Error('QBO purchase order creation not yet implemented.');
  },

  // Get classes (locations) from QBO
  async getClasses() {
    return { classes: [] };
  },
};

// Housecall Pro Integration
export const hcpIntegration = {
  // Connect with API key
  async connect(apiKey: string, webhookSecret?: string) {
    // Use a fixed UUID for the default organization (in production, get from auth context)
    const organizationId = '00000000-0000-0000-0000-000000000001';
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/oauth/hcp/connect`, {
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
    
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/oauth/disconnect/hcp`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/oauth/status/hcp?org_id=${organizationId}`);
      
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

  // Sync invoices from HCP
  async syncInvoices(startDate?: string, endDate?: string) {
    const response = await fetch(`${API_URL}/api/inventory/sync/hcp/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate })
    });
    
    if (!response.ok) throw new Error(`Failed to sync invoices: ${response.statusText}`);
    return response.json();
  },

  // Sync items/products from HCP
  async syncItems() {
    const response = await fetch(`${API_URL}/api/inventory/sync/hcp/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (!response.ok) throw new Error(`Failed to sync items: ${response.statusText}`);
    return response.json();
  },

  // Get technicians
  async getTechnicians() {
    const response = await fetch(`${API_URL}/api/inventory/sync/hcp/technicians`, {
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
  async getStatus(): Promise<IntegrationStatus> {
    // TODO: Implement backend API for QBD status
    // For now, return disconnected status to avoid Supabase query errors
    return { platform: 'qbd', connected: false, lastSync: null };
    
    /*
    const { data, error } = await supabase
      .from('integration_credentials')
      .select('is_connected, middleware_url, last_sync_at')
      .eq('platform', 'qbd')
      .single();
    
    if (error) {
      return { platform: 'qbd', connected: false, lastSync: null };
    }
    
    return {
      platform: 'qbd',
      connected: data?.is_connected || false,
      lastSync: data?.last_sync_at,
    };
    */
  },

  // Sync via middleware (Autymate/MyWorks)
  async syncInventory() {
    // TODO: Implement backend API for QBD sync
    throw new Error('QBD sync not yet implemented. Please configure via backend API.');
    
    /*
    const { data: credentials } = await supabase
      .from('integration_credentials')
      .select('middleware_url, api_key')
      .eq('platform', 'qbd')
      .single();

    if (!credentials?.middleware_url) {
      throw new Error('QBD middleware not configured');
    }

    // Call middleware API
    const response = await fetch(`${credentials.middleware_url}/api/inventory/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to sync with QuickBooks Desktop');
    }

    const result = await response.json();

    // Update last sync time
    await supabase
      .from('integration_credentials')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('platform', 'qbd');

    return result;
    */
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
