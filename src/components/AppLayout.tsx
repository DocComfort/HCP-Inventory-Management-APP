import React, { useState, useCallback } from 'react';
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
  
  // Data state (in a real app, this would come from API/database)
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryItems);
  const [transfers, setTransfers] = useState<TransferRequest[]>(transferRequests);
  const [pos, setPOs] = useState<PurchaseOrder[]>(purchaseOrders);
  const [syncs, setSyncs] = useState<SyncStatus[]>(syncStatuses);
  const [invoices] = useState<HCPInvoice[]>(recentInvoices);
  const [restocks, setRestocks] = useState<RestockOrder[]>(restockOrders);

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

  const warehouse = locations.find(loc => loc.type === 'warehouse');

  // Render active view
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            inventory={inventory}
            transfers={transfers}
            purchaseOrders={pos}
            locations={locations}
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
            locations={locations}
            inventory={inventory}
            onSelectVan={handleSelectVan}
            onEditParLevels={handleEditParLevels}
          />
        );
      case 'transfers':
        return (
          <TransfersView
            transfers={transfers}
            locations={locations}
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
            locations={locations}
          />
        );
      case 'restock':
        return (
          <RestockView
            restockOrders={restocks}
            inventory={inventory}
            locations={locations}
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
            locations={locations}
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
