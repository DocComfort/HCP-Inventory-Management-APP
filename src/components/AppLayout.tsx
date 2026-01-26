import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

// Components
import Sidebar from './inventory/Sidebar';
import Header from './inventory/Header';
import Dashboard from './inventory/Dashboard';
import InventoryTable from './inventory/InventoryTable';
import TransfersView from './inventory/TransfersView';
import PurchaseOrdersView from './inventory/PurchaseOrdersView';
import VansView from './inventory/VansView';
import IntegrationsView from './inventory/IntegrationsView';
import VendorsView from './inventory/VendorsView';
import FulfillmentEngine from './inventory/FulfillmentEngine';
import RestockView from './inventory/RestockView';
import WarehouseView from './inventory/WarehouseView';
import SettingsView from './inventory/SettingsView';
import TimesheetsView from './inventory/TimesheetsView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Data
import { 
  locations, 
  vendors, 
  inventoryItems, 
  transferRequests, 
  purchaseOrders, 
  syncStatuses,
  recentInvoices,
  restockOrders
} from '@/data/mockData';

// Types
import { 
  InventoryItem, 
  TransferRequest, 
  PurchaseOrder, 
  Location, 
  Vendor,
  SyncStatus,
  HCPInvoice,
  RestockOrder
} from '@/types/inventory';

const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();

  // State
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data state - fetch from API
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [apiLocations, setApiLocations] = useState<Location[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [syncs, setSyncs] = useState<SyncStatus[]>(syncStatuses);
  const [invoices, setInvoices] = useState<HCPInvoice[]>([]);
  const [restocks, setRestocks] = useState<RestockOrder[]>([]);

  // Fetch data from API on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const orgId = '00000000-0000-0000-0000-000000000001';
      
      try {
        // Fetch inventory items
        const itemsRes = await fetch(`${API_BASE_URL}/api/inventory/items?org_id=${orgId}`);
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          // Transform API data to match InventoryItem type
          const transformedItems: InventoryItem[] = (itemsData || []).map((item: any) => ({
            id: item.id,
            sku: item.sku || '',
            name: item.name || '',
            description: item.description || '',
            category: item.category || 'General',
            unitCost: item.unit_cost || 0,
            unitPrice: item.unit_price || 0,
            preferredVendorId: item.preferred_vendor_id,
            totalQOH: item.total_qoh || 0,
            warehouseQOH: item.warehouse_qoh || 0,
            totalVanQOH: item.total_van_qoh || 0,
            status: item.status || 'in_stock',
            hcpItemId: item.hcp_item_id,
            qbdItemId: item.qbd_item_id,
            qboItemId: item.qbo_item_id,
            locationStock: (item.location_stock || []).reduce((acc: any, stock: any) => {
              acc[stock.location_id] = {
                quantity: stock.quantity || 0,
                parLevel: stock.par_level || 0,
                deviation: (stock.quantity || 0) - (stock.par_level || 0)
              };
              return acc;
            }, {})
          }));
          setInventory(transformedItems);
          console.log(`📦 Loaded ${transformedItems.length} inventory items`);
        }

        // Fetch locations
        const locationsRes = await fetch(`${API_BASE_URL}/api/locations`);
        if (locationsRes.ok) {
          const locData = await locationsRes.json();
          const transformedLocations: Location[] = (locData.locations || []).map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            type: loc.type,
            technicianName: loc.technician_name,
            technicianId: loc.technician_id,
            isActive: loc.is_active !== false,
            address: loc.address
          }));
          setApiLocations(transformedLocations);
          console.log(`📍 Loaded ${transformedLocations.length} locations`);
        }

      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Fall back to mock data on error
        setInventory(inventoryItems);
        setApiLocations(locations);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Merge mock locations with API locations (use API if available)
  const allLocations = apiLocations.length > 0 ? apiLocations : locations;

  // Calculate pending approvals
  const pendingApprovals = transfers.filter(t => t.status === 'pending').length + 
                          pos.filter(po => po.status === 'pending_approval').length;

  // Handlers
  const handleRefreshSync = useCallback(() => {
    toast.info('Syncing all platforms...', { duration: 2000 });
    setTimeout(() => {
      setSyncs(prev => prev.map(s => ({
        ...s,
        lastSync: new Date().toISOString(),
        status: 'synced' as const
      })));
      toast.success('All platforms synced successfully!');
    }, 2000);
  }, []);

  const handleApproveTransfer = useCallback((transferId: string) => {
    setTransfers(prev => prev.map(t => 
      t.id === transferId ? { ...t, status: 'approved' as const } : t
    ));
    toast.success('Transfer approved!');
  }, []);

  const handleRejectTransfer = useCallback((transferId: string) => {
    setTransfers(prev => prev.map(t => 
      t.id === transferId ? { ...t, status: 'rejected' as const } : t
    ));
    toast.info('Transfer rejected');
  }, []);

  const handleBulkApproveTransfers = useCallback((transferIds: string[]) => {
    setTransfers(prev => prev.map(t => 
      transferIds.includes(t.id) ? { ...t, status: 'approved' as const } : t
    ));
    toast.success(`${transferIds.length} transfers approved!`);
  }, []);

  const handleApprovePO = useCallback((poId: string) => {
    setPOs(prev => prev.map(po => 
      po.id === poId ? { ...po, status: 'approved' as const } : po
    ));
    toast.success('Purchase order approved!');
  }, []);

  const handleRejectPO = useCallback((poId: string) => {
    setPOs(prev => prev.map(po => 
      po.id === poId ? { ...po, status: 'cancelled' as const } : po
    ));
    toast.info('Purchase order cancelled');
  }, []);

  const handleSendPO = useCallback((poId: string) => {
    setPOs(prev => prev.map(po => 
      po.id === poId ? { ...po, status: 'sent' as const } : po
    ));
    toast.success('Purchase order sent to vendor!');
  }, []);

  const handleBulkApprovePOs = useCallback((poIds: string[]) => {
    setPOs(prev => prev.map(po => 
      poIds.includes(po.id) ? { ...po, status: 'approved' as const } : po
    ));
    toast.success(`${poIds.length} purchase orders approved!`);
  }, []);

  const handleViewItem = useCallback((item: InventoryItem) => {
    toast.info(`Viewing ${item.name}`);
    // In a real app, this would open a modal or navigate to detail view
  }, []);

  const handleEditItem = useCallback((item: InventoryItem) => {
    toast.info(`Editing ${item.name}`);
    // In a real app, this would open an edit modal
  }, []);

  const handleCreateTransfer = useCallback((item: InventoryItem) => {
    toast.info(`Creating transfer for ${item.name}`);
    setActiveView('transfers');
  }, []);

  const handleSelectVan = useCallback((location: Location) => {
    toast.info(`Selected ${location.name}`);
  }, []);

  const handleEditParLevels = useCallback((locationId: string) => {
    toast.info('Opening par level editor...');
  }, []);

  const handleRefreshPlatformSync = useCallback((platform: string) => {
    toast.info(`Syncing ${platform.toUpperCase()}...`, { duration: 1500 });
    setTimeout(() => {
      setSyncs(prev => prev.map(s => 
        s.platform === platform 
          ? { ...s, lastSync: new Date().toISOString(), status: 'synced' as const }
          : s
      ));
      toast.success(`${platform.toUpperCase()} synced!`);
    }, 1500);
  }, []);

  const handleConfigureIntegration = useCallback((platform: string) => {
    toast.info(`Opening ${platform.toUpperCase()} configuration...`);
  }, []);

  const handleAddVendor = useCallback(() => {
    toast.info('Opening vendor form...');
  }, []);

  const handleEditVendor = useCallback((vendor: Vendor) => {
    toast.info(`Editing ${vendor.name}`);
  }, []);

  const handleDeleteVendor = useCallback((vendorId: string) => {
    toast.warning('Vendor deletion requires confirmation');
  }, []);

  const handleApproveRestock = useCallback((orderId: string) => {
    setRestocks(prev => prev.map(r => 
      r.id === orderId ? { ...r, status: 'approved' as const } : r
    ));
    toast.success('Restock order approved!');
  }, []);

  const handleProcessRestock = useCallback((orderId: string) => {
    setRestocks(prev => prev.map(r => 
      r.id === orderId ? { ...r, status: 'processing' as const } : r
    ));
    toast.info('Processing restock order...');
    setTimeout(() => {
      setRestocks(prev => prev.map(r => 
        r.id === orderId ? { ...r, status: 'completed' as const } : r
      ));
      toast.success('Restock order completed!');
    }, 3000);
  }, []);

  const warehouse = allLocations.find(loc => loc.type === 'warehouse');

  // Render active view
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            inventory={inventory}
            transfers={transfers}
            purchaseOrders={pos}
            locations={allLocations}
            recentInvoices={invoices}
            onNavigate={setActiveView}
          />
        );
      case 'inventory':
        return (
          <InventoryTable
            inventory={inventory}
            vendors={vendors}
            onViewItem={handleViewItem}
            onEditItem={handleEditItem}
            onCreateTransfer={handleCreateTransfer}
          />
        );
      case 'warehouse':
        return (
          <WarehouseView
            inventory={inventory}
            warehouse={warehouse}
            onCreateTransfer={handleCreateTransfer}
          />
        );
      case 'vans':
        return (
          <VansView
            locations={allLocations}
            inventory={inventory}
            onSelectVan={handleSelectVan}
            onEditParLevels={handleEditParLevels}
          />
        );
      case 'transfers':
        return (
          <TransfersView
            transfers={transfers}
            locations={allLocations}
            inventory={inventory}
            onApprove={handleApproveTransfer}
            onReject={handleRejectTransfer}
            onBulkApprove={handleBulkApproveTransfers}
          />
        );
      case 'purchase-orders':
        return (
          <PurchaseOrdersView
            purchaseOrders={pos}
            vendors={vendors}
            onApprove={handleApprovePO}
            onReject={handleRejectPO}
            onSend={handleSendPO}
            onBulkApprove={handleBulkApprovePOs}
          />
        );
      case 'fulfillment':
        return (
          <FulfillmentEngine
            inventory={inventory}
            locations={allLocations}
          />
        );
      case 'restock':
        return (
          <RestockView
            restockOrders={restocks}
            inventory={inventory}
            locations={allLocations}
            onApproveRestock={handleApproveRestock}
            onProcessRestock={handleProcessRestock}
          />
        );
      case 'integrations':
        return (
          <IntegrationsView
            syncStatuses={syncs}
            recentInvoices={invoices}
            onRefreshSync={handleRefreshPlatformSync}
            onConfigureIntegration={handleConfigureIntegration}
          />
        );
      case 'timesheets':
        return <TimesheetsView />;
      case 'vendors':
        return (
          <VendorsView
            vendors={vendors}
            inventory={inventory}
            onAddVendor={handleAddVendor}
            onEditVendor={handleEditVendor}
            onDeleteVendor={handleDeleteVendor}
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <Dashboard
            inventory={inventory}
            transfers={transfers}
            purchaseOrders={pos}
            locations={allLocations}
            recentInvoices={invoices}
            onNavigate={setActiveView}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          syncStatuses={syncs}
          onRefreshSync={handleRefreshSync}
          pendingApprovals={pendingApprovals}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
