import React from 'react';
import { 
  Package, 
  Warehouse, 
  Truck, 
  AlertTriangle, 
  ArrowLeftRight, 
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { InventoryItem, TransferRequest, PurchaseOrder, Location, HCPInvoice } from '@/types/inventory';

interface DashboardProps {
  inventory: InventoryItem[];
  transfers: TransferRequest[];
  purchaseOrders: PurchaseOrder[];
  locations: Location[];
  recentInvoices: HCPInvoice[];
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  inventory,
  transfers,
  purchaseOrders,
  locations,
  recentInvoices,
  onNavigate
}) => {
  // Calculate metrics
  const totalItems = inventory.length;
  const totalQOH = inventory.reduce((sum, item) => sum + item.totalQOH, 0);
  const warehouseQOH = inventory.reduce((sum, item) => sum + item.warehouseQOH, 0);
  const vanQOH = inventory.reduce((sum, item) => sum + item.totalVanQOH, 0);
  
  const lowStockItems = inventory.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock');
  const pendingTransfers = transfers.filter(t => t.status === 'pending');
  const pendingPOs = purchaseOrders.filter(po => po.status === 'pending_approval');
  const activeVans = locations.filter(loc => loc.type === 'van' && loc.isActive).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-emerald-100 text-emerald-700';
      case 'low_stock': return 'bg-amber-100 text-amber-700';
      case 'out_of_stock': return 'bg-red-100 text-red-700';
      case 'transfer_pending': return 'bg-blue-100 text-blue-700';
      case 'on_po': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time overview of your inventory across all locations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          Last updated: Just now
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              +12%
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900">{totalQOH.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Total Units in Stock</p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {totalItems} unique SKUs tracked
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              Primary
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900">{warehouseQOH.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Warehouse Stock</p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {((warehouseQOH / totalQOH) * 100).toFixed(1)}% of total inventory
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-orange-600" />
            </div>
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              {activeVans} Active
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900">{vanQOH.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Van Stock (All Techs)</p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Avg {Math.round(vanQOH / activeVans)} units per van
          </div>
        </div>

        <div 
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigate('inventory')}
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            {lowStockItems.length > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
                Action Needed
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-gray-900">{lowStockItems.length}</p>
            <p className="text-sm text-gray-500 mt-1">Low/Out of Stock Items</p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1">
            Click to view details <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Pending Approvals</h2>
              <p className="text-sm text-gray-500">{pendingTransfers.length + pendingPOs.length} items awaiting review</p>
            </div>
            <button 
              onClick={() => onNavigate('transfers')}
              className="text-sm text-[#1a365d] font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {pendingTransfers.slice(0, 3).map((transfer) => (
              <div key={transfer.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getUrgencyColor(transfer.urgency)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-gray-900 text-sm">Transfer Request</span>
                      <span className="text-xs text-gray-400">#{transfer.id.slice(-4)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {transfer.quantity}x {transfer.itemName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {transfer.fromLocationName} → {transfer.toLocationName}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </button>
                    <button className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingPOs.slice(0, 2).map((po) => (
              <div key={po.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getUrgencyColor(po.urgency)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-gray-900 text-sm">Purchase Order</span>
                      <span className="text-xs text-gray-400">{po.poNumber}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {po.items.length} item(s) from {po.vendorName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Total: ${po.totalAmount.toFixed(2)} • Expected: {new Date(po.expectedDelivery || '').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </button>
                    <button className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingTransfers.length + pendingPOs.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm">All caught up! No pending approvals.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent HCP Syncs</h2>
            <p className="text-sm text-gray-500">Latest invoices from Housecall Pro</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 text-sm">{invoice.invoiceNumber}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    invoice.status === 'synced' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{invoice.customerName}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{invoice.technicianName}</span>
                  <span className="text-sm font-medium text-gray-900">${invoice.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Status by Category */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Inventory by Category</h2>
            <p className="text-sm text-gray-500">Stock levels across product categories</p>
          </div>
          <button 
            onClick={() => onNavigate('inventory')}
            className="text-sm text-[#1a365d] font-medium hover:underline"
          >
            View Full Inventory
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['HVAC', 'Plumbing', 'Electrical', 'General'].map((category) => {
              const categoryItems = inventory.filter(item => item.category === category);
              const categoryQOH = categoryItems.reduce((sum, item) => sum + item.totalQOH, 0);
              const lowStock = categoryItems.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock').length;
              
              return (
                <div key={category} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{category}</h3>
                    {lowStock > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        {lowStock} low
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{categoryQOH.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{categoryItems.length} SKUs</p>
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#1a365d] to-blue-500 rounded-full"
                      style={{ width: `${(categoryQOH / totalQOH) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
