import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send,
  Package,
  Filter,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Truck,
  CheckCheck,
  FileText
} from 'lucide-react';
import { PurchaseOrder, Vendor } from '@/types/inventory';

interface PurchaseOrdersViewProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  onApprove: (poId: string) => void;
  onReject: (poId: string) => void;
  onSend: (poId: string) => void;
  onBulkApprove: (poIds: string[]) => void;
}

const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  purchaseOrders,
  vendors,
  onApprove,
  onReject,
  onSend,
  onBulkApprove
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());

  const filteredPOs = useMemo(() => {
    let result = [...purchaseOrders];

    if (statusFilter !== 'all') {
      result = result.filter(po => po.status === statusFilter);
    }

    if (vendorFilter !== 'all') {
      result = result.filter(po => po.vendorId === vendorFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(po => 
        po.poNumber.toLowerCase().includes(query) ||
        po.vendorName.toLowerCase().includes(query) ||
        po.items.some(item => item.sku.toLowerCase().includes(query) || item.name.toLowerCase().includes(query))
      );
    }

    // Sort by urgency then by date
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [purchaseOrders, statusFilter, vendorFilter, searchQuery]);

  const pendingPOs = filteredPOs.filter(po => po.status === 'pending_approval');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-700',
      'pending_approval': 'bg-amber-100 text-amber-700',
      'approved': 'bg-blue-100 text-blue-700',
      'sent': 'bg-purple-100 text-purple-700',
      'partially_received': 'bg-cyan-100 text-cyan-700',
      'received': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      'draft': 'Draft',
      'pending_approval': 'Pending Approval',
      'approved': 'Approved',
      'sent': 'Sent to Vendor',
      'partially_received': 'Partial',
      'received': 'Received',
      'cancelled': 'Cancelled'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getUrgencyIndicator = (urgency: string) => {
    const colors: Record<string, string> = {
      'critical': 'bg-red-500',
      'high': 'bg-orange-500',
      'medium': 'bg-amber-500',
      'low': 'bg-gray-400'
    };
    return <div className={`w-2 h-2 rounded-full ${colors[urgency]}`} />;
  };

  const toggleSelectPO = (id: string) => {
    const newSelected = new Set(selectedPOs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPOs(newSelected);
  };

  const selectAllPending = () => {
    if (selectedPOs.size === pendingPOs.length) {
      setSelectedPOs(new Set());
    } else {
      setSelectedPOs(new Set(pendingPOs.map(po => po.id)));
    }
  };

  const handleBulkApprove = () => {
    onBulkApprove(Array.from(selectedPOs));
    setSelectedPOs(new Set());
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Stats
  const stats = {
    pending: purchaseOrders.filter(po => po.status === 'pending_approval').length,
    approved: purchaseOrders.filter(po => po.status === 'approved').length,
    sent: purchaseOrders.filter(po => po.status === 'sent').length,
    totalValue: purchaseOrders.filter(po => ['pending_approval', 'approved', 'sent'].includes(po.status))
      .reduce((sum, po) => sum + po.totalAmount, 0),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 mt-1">Manage vendor orders and procurement</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors">
          <Plus className="w-4 h-4" />
          Create PO
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-sm text-gray-500">Ready to Send</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
              <p className="text-sm text-gray-500">Awaiting Delivery</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Open PO Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search POs, vendors, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
          </select>

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          >
            <option value="all">All Vendors</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>
        </div>

        {selectedPOs.size > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-600">{selectedPOs.size} selected</span>
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Bulk Approve
            </button>
          </div>
        )}
      </div>

      {/* PO List */}
      <div className="space-y-4">
        {filteredPOs.map((po) => (
          <div 
            key={po.id}
            className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${
              selectedPOs.has(po.id) ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                {po.status === 'pending_approval' && (
                  <input
                    type="checkbox"
                    checked={selectedPOs.has(po.id)}
                    onChange={() => toggleSelectPO(po.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d]"
                  />
                )}

                <div className="flex-shrink-0 mt-1">
                  {getUrgencyIndicator(po.urgency)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-gray-900">{po.poNumber}</span>
                    {getStatusBadge(po.status)}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="font-medium">{po.vendorName}</span>
                    <span>{po.items.length} item(s)</span>
                    <span className="font-semibold text-gray-900">${po.totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Created: {formatDate(po.createdAt)}</span>
                    {po.expectedDelivery && (
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Expected: {formatDate(po.expectedDelivery)}
                      </span>
                    )}
                    <span>Destination: {po.destinationLocationName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {expandedPO === po.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>

                  {po.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => onApprove(po.id)}
                        className="p-2 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => onReject(po.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5 text-red-600" />
                      </button>
                    </>
                  )}

                  {po.status === 'approved' && (
                    <button
                      onClick={() => onSend(po.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Line Items */}
            {expandedPO === po.id && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Line Items</h4>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="text-left pb-2">SKU</th>
                      <th className="text-left pb-2">Item</th>
                      <th className="text-right pb-2">Qty</th>
                      <th className="text-right pb-2">Unit Cost</th>
                      <th className="text-right pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {po.items.map((item, idx) => (
                      <tr key={idx} className="text-sm">
                        <td className="py-2 font-mono text-gray-600">{item.sku}</td>
                        <td className="py-2 text-gray-900">{item.name}</td>
                        <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                        <td className="py-2 text-right text-gray-600">${item.unitCost.toFixed(2)}</td>
                        <td className="py-2 text-right font-medium text-gray-900">${item.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="text-sm font-semibold">
                      <td colSpan={4} className="pt-3 text-right text-gray-700">Total:</td>
                      <td className="pt-3 text-right text-gray-900">${po.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ))}

        {filteredPOs.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No purchase orders found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersView;
