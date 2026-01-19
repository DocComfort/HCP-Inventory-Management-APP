import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Settings,
  ExternalLink,
  Clock,
  ArrowRight,
  Database,
  Zap,
  Shield,
  Activity,
  Key,
  Globe,
  Server,
  X
} from 'lucide-react';
import { SyncStatus, HCPInvoice } from '@/types/inventory';
import { toast } from 'sonner';
import { 
  hcpIntegration, 
  qboIntegration, 
  qbdIntegration,
  getAllIntegrationStatuses,
  getSyncLogs,
  IntegrationStatus
} from '@/lib/integrations';

interface IntegrationsViewProps {
  syncStatuses: SyncStatus[];
  recentInvoices: HCPInvoice[];
  onRefreshSync: (platform: string) => void;
  onConfigureIntegration: (platform: string) => void;
}

// Connection modal component
const ConnectionModal: React.FC<{
  platform: string;
  onClose: () => void;
  onConnect: () => void;
}> = ({ platform, onClose, onConnect }) => {
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [middlewareUrl, setMiddlewareUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(window.location.origin + '/oauth/callback');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (platform === 'hcp') {
        await hcpIntegration.connect(apiKey, webhookSecret);
        toast.success('Housecall Pro connected! Starting automatic item import...');
      } else if (platform === 'qbd') {
        await qbdIntegration.configure(middlewareUrl, apiKey);
        toast.success('QuickBooks Desktop middleware configured!');
      } else if (platform === 'qbo') {
        const { authUrl } = await qboIntegration.getAuthUrl(clientId, clientSecret, redirectUri);
        window.open(authUrl, '_blank', 'width=600,height=700');
        toast.info('Complete authorization in the popup window. Items will be imported automatically after authorization.');
      }
      onConnect();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const platformConfig = {
    hcp: {
      title: 'Connect Housecall Pro',
      description: 'Enter your Housecall Pro API credentials',
      fields: [
        { name: 'apiKey', label: 'API Key', value: apiKey, setter: setApiKey, type: 'password', required: true },
        { name: 'webhookSecret', label: 'Webhook Secret (optional)', value: webhookSecret, setter: setWebhookSecret, type: 'password' },
      ],
    },
    qbd: {
      title: 'QuickBooks Desktop (QBWC)',
      description: 'QuickBooks Desktop is connected via the Web Connector running on your server',
      fields: [], // No user configuration needed - QBWC is configured in backend
    },
    qbo: {
      title: 'Connect QuickBooks Online',
      description: 'Enter your Intuit Developer credentials for OAuth',
      fields: [
        { name: 'clientId', label: 'Client ID', value: clientId, setter: setClientId, required: true },
        { name: 'clientSecret', label: 'Client Secret', value: clientSecret, setter: setClientSecret, type: 'password', required: true },
        { name: 'redirectUri', label: 'Redirect URI', value: redirectUri, setter: setRedirectUri, required: true },
      ],
    },
  };

  const config = platformConfig[platform as keyof typeof platformConfig];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{config.title}</h2>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close modal">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {config.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type || 'text'}
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
              />
            </div>
          ))}
          
          {platform === 'qbo' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                After clicking connect, you'll be redirected to Intuit to authorize the connection.
              </p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  syncStatuses,
  recentInvoices,
  onRefreshSync,
  onConfigureIntegration
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'hcp' | 'qbd' | 'qbo'>('overview');
  const [showConnectionModal, setShowConnectionModal] = useState<string | null>(null);
  const [realStatuses, setRealStatuses] = useState<IntegrationStatus[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<{ platform: string; status: string; imported: number; updated: number } | null>(null);

  // Fetch real integration statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const statuses = await getAllIntegrationStatuses();
        setRealStatuses(statuses);
      } catch (error) {
        console.error('Failed to fetch integration statuses:', error);
      }
    };
    fetchStatuses();
  }, []);

  // Fetch sync logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logs = await getSyncLogs(undefined, 20);
        console.log('[IntegrationsView] Build v1.0.1 - Sync logs loaded:', logs?.length || 0, 'logs');
        setSyncLogs(logs || []);
      } catch (error) {
        console.error('Failed to fetch sync logs:', error);
      }
    };
    fetchLogs();
  }, []);

  const getStatusColor = (status: SyncStatus['status']) => {
    switch (status) {
      case 'synced': return 'text-emerald-500';
      case 'syncing': return 'text-blue-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: SyncStatus['status']) => {
    switch (status) {
      case 'synced': return 'bg-emerald-100';
      case 'syncing': return 'bg-blue-100';
      case 'error': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const formatLastSync = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const platformInfo: Record<string, { name: string; description: string; logo: string }> = {
    hcp: {
      name: 'Housecall Pro',
      description: 'Field service management platform for invoices and work orders',
      logo: 'HCP'
    },
    qbd: {
      name: 'QuickBooks Desktop',
      description: 'Desktop accounting software via Autymate/MyWorks bridge',
      logo: 'QBD'
    },
    qbo: {
      name: 'QuickBooks Online',
      description: 'Cloud-based accounting with native API integration',
      logo: 'QBO'
    }
  };

  const handleSync = async (platform: string) => {
    toast.info(`Syncing ${platform.toUpperCase()}...`);
    try {
      if (platform === 'hcp') {
        await hcpIntegration.syncInvoices();
        await hcpIntegration.syncItems();
      } else if (platform === 'qbo') {
        await qboIntegration.syncItems();
        await qboIntegration.syncVendors();
      } else if (platform === 'qbd') {
        await qbdIntegration.syncInventory();
      }
      toast.success(`${platform.toUpperCase()} synced successfully!`);
      onRefreshSync(platform);
    } catch (error: any) {
      toast.error(error.message || 'Sync failed');
    }
  };

  const handleInitialImport = async (platform: string) => {
    setImportProgress({ platform, status: 'importing', imported: 0, updated: 0 });
    toast.info(`Importing items from ${platform.toUpperCase()}...`);
    
    try {
      const organizationId = '00000000-0000-0000-0000-000000000001'; // TODO: Get from auth context
      
      // Call Netlify Function instead of direct API
      const functionPath = platform === 'hcp' 
        ? '/.netlify/functions/sync-hcp-import'
        : platform === 'qbd'
        ? '/.netlify/functions/sync-qbd-import'
        : `/api/inventory/sync/${platform}/import`; // fallback for other platforms
      
      const response = await fetch(functionPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId })
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      const result = await response.json();
      setImportProgress({ 
        platform, 
        status: 'completed', 
        imported: result.imported, 
        updated: result.updated 
      });
      
      toast.success(`Imported ${result.imported} new items, updated ${result.updated} existing items`);
      
      // Auto-link items
      if (result.imported > 0 || result.updated > 0) {
        toast.info('Auto-linking items between systems...');
        await fetch(`/api/inventory/sync/autolink`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization_id: organizationId })
        });
      }
      
      onRefreshSync(platform);
      
      // Clear progress after 3 seconds
      setTimeout(() => setImportProgress(null), 3000);
      
    } catch (error: any) {
      setImportProgress({ platform, status: 'error', imported: 0, updated: 0 });
      toast.error(error.message || 'Import failed');
      setTimeout(() => setImportProgress(null), 3000);
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      if (platform === 'hcp') {
        await hcpIntegration.disconnect();
      } else if (platform === 'qbo') {
        await qboIntegration.disconnect();
      } else if (platform === 'qbd') {
        await qbdIntegration.disconnect();
      }
      toast.success(`${platform.toUpperCase()} disconnected`);
      // Refresh statuses
      const statuses = await getAllIntegrationStatuses();
      setRealStatuses(statuses);
    } catch (error: any) {
      toast.error(error.message || 'Disconnect failed');
    }
  };

  const getSyncStatus = (platform: string) => {
    return syncStatuses.find(s => s.platform === platform);
  };

  const getRealStatus = (platform: string) => {
    return realStatuses.find(s => s.platform === platform);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Connection Modal */}
      {showConnectionModal && (
        <ConnectionModal
          platform={showConnectionModal}
          onClose={() => setShowConnectionModal(null)}
          onConnect={async () => {
            const statuses = await getAllIntegrationStatuses();
            setRealStatuses(statuses);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations Hub</h1>
          <p className="text-gray-500 mt-1">Manage connections to Housecall Pro and QuickBooks</p>
        </div>
        <button
          onClick={() => {
            handleSync('hcp');
            handleSync('qbo');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Sync All
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['overview', 'hcp', 'qbd', 'qbo'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#1a365d] text-[#1a365d]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? 'Overview' : platformInfo[tab]?.name || tab.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Connection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {syncStatuses.map((sync) => {
              const info = platformInfo[sync.platform];
              const realStatus = getRealStatus(sync.platform);
              const isConnected = realStatus?.connected || sync.connected;
              
              return (
                <div 
                  key={sync.platform}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-white ${
                      sync.platform === 'hcp' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                      sync.platform === 'qbd' ? 'bg-gradient-to-br from-green-500 to-green-700' :
                      'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {info.logo}
                    </div>
                    <div className={`p-2 rounded-full ${isConnected ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      {isConnected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Link2 className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 mt-4">{info.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{info.description}</p>

                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status</span>
                      <span className={`font-medium ${isConnected ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Last Sync</span>
                      <span className="text-gray-900">
                        {realStatus?.lastSync ? formatLastSync(realStatus.lastSync) : formatLastSync(sync.lastSync)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Items Synced</span>
                      <span className="text-gray-900">{sync.itemsInSync}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleInitialImport(sync.platform)}
                          disabled={importProgress?.platform === sync.platform && importProgress.status === 'importing'}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#1a365d] hover:bg-[#1a365d]/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {importProgress?.platform === sync.platform && importProgress.status === 'importing' ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Importing...
                            </>
                          ) : importProgress?.platform === sync.platform && importProgress.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              {importProgress.imported} Imported
                            </>
                          ) : (
                            <>
                              <Database className="w-4 h-4" />
                              Import Items
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSync(sync.platform)}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                          aria-label="Refresh sync"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDisconnect(sync.platform)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowConnectionModal(sync.platform)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#1a365d] text-white rounded-lg text-sm font-medium hover:bg-[#1a365d]/90 transition-colors"
                      >
                        <Key className="w-4 h-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sync Flow Diagram */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Data Sync Flow</h3>
            <div className="flex items-center justify-center gap-4 py-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-blue-700">HCP</span>
                </div>
                <p className="text-sm text-gray-600">Housecall Pro</p>
                <p className="text-xs text-gray-400">Invoices & Work Orders</p>
              </div>
              
              <div className="flex flex-col items-center">
                <ArrowRight className="w-8 h-8 text-gray-300" />
                <span className="text-xs text-gray-400 mt-1">Webhooks</span>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[#1a365d] to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Database className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-900">InventoryBridge</p>
                <p className="text-xs text-gray-400">Central Hub</p>
              </div>

              <div className="flex flex-col items-center">
                <ArrowRight className="w-8 h-8 text-gray-300" />
                <span className="text-xs text-gray-400 mt-1">OAuth/API</span>
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-1">
                    <span className="font-bold text-green-700 text-sm">QBD</span>
                  </div>
                  <p className="text-xs text-gray-600">QB Desktop</p>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-1">
                    <span className="font-bold text-emerald-700 text-sm">QBO</span>
                  </div>
                  <p className="text-xs text-gray-600">QB Online</p>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook URL Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Webhook Configuration</h3>
            <p className="text-sm text-gray-500 mb-4">
              Configure these webhook URLs in your Housecall Pro account to receive real-time updates:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm break-all">
              <p className="text-gray-600">Invoice Webhook:</p>
              <p className="text-[#1a365d]">{window.location.origin}/functions/v1/hcp-webhook</p>
            </div>
          </div>

          {/* Recent Sync Activity */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Sync Activity</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {syncLogs.length > 0 ? (
                syncLogs.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.status === 'completed' ? 'bg-emerald-100' : 
                      log.status === 'failed' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      {log.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : log.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {log.sync_type} sync - {(log.provider || log.platform || "unknown").toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(log.records_processed || 0)} records processed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 capitalize">{log.status}</p>
                      <p className="text-xs text-gray-500">
                        {formatLastSync((log.started_at || log.created_at))}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="px-5 py-3 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      invoice.status === 'synced' ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      {invoice.status === 'synced' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Invoice {invoice.invoiceNumber} from HCP
                      </p>
                      <p className="text-xs text-gray-500">
                        {invoice.customerName} • {invoice.technicianName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">${invoice.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {invoice.syncedAt ? formatLastSync(invoice.syncedAt) : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="space-y-6">
          {(() => {
            const sync = getSyncStatus(activeTab);
            const info = platformInfo[activeTab];
            const realStatus = getRealStatus(activeTab);
            if (!sync || !info) return null;

            const isConnected = realStatus?.connected || sync.connected;

            return (
              <>
                {/* Platform Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start gap-6">
                    <div className={`w-20 h-20 rounded-xl flex items-center justify-center font-bold text-white text-xl ${
                      activeTab === 'hcp' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                      activeTab === 'qbd' ? 'bg-gradient-to-br from-green-500 to-green-700' :
                      'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {info.logo}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{info.name}</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      <p className="text-gray-500 mt-1">{info.description}</p>
                      
                      {activeTab === 'qbd' && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-800">
                            <strong>Note:</strong> QuickBooks Desktop requires a middleware bridge (Autymate or MyWorks) for cloud connectivity. 
                            Ensure your bridge is properly configured.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isConnected ? (
                        <>
                          <button
                            onClick={() => handleSync(activeTab)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Sync Now
                          </button>
                          <button
                            onClick={() => handleDisconnect(activeTab)}
                            className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowConnectionModal(activeTab)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors"
                        >
                          <Key className="w-4 h-4" />
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{sync.itemsInSync}</p>
                        <p className="text-sm text-gray-500">Items Synced</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{sync.pendingChanges}</p>
                        <p className="text-sm text-gray-500">Pending Changes</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatLastSync(sync.lastSync)}</p>
                        <p className="text-sm text-gray-500">Last Sync</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Real-time</p>
                        <p className="text-sm text-gray-500">Sync Mode</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Auto-sync enabled</p>
                        <p className="text-sm text-gray-500">Automatically sync changes via webhooks</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" aria-label="Enable auto-sync" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a365d]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Sync inventory on sale</p>
                        <p className="text-sm text-gray-500">Update QOH immediately when items are sold</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" aria-label="Enable sync inventory on sale" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a365d]"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Conflict resolution</p>
                        <p className="text-sm text-gray-500">How to handle sync conflicts</p>
                      </div>
                      <select aria-label="Conflict resolution method" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                        <option>HCP takes priority</option>
                        <option>QuickBooks takes priority</option>
                        <option>Manual review</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default IntegrationsView;
