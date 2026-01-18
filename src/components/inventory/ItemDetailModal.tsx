import React from 'react';
import { 
  X, 
  Package, 
  Warehouse, 
  Truck, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  ArrowLeftRight,
  Edit,
  ShoppingCart
} from 'lucide-react';
import { InventoryItem, Vendor, Location } from '@/types/inventory';

interface ItemDetailModalProps {
  item: InventoryItem;
  vendors: Vendor[];
  locations: Location[];
  onClose: () => void;
  onEdit: () => void;
  onCreateTransfer: () => void;
  onCreatePO: () => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  vendors,
  locations,
  onClose,
  onEdit,
  onCreateTransfer,
  onCreatePO
}) => {
  const vendor = vendors.find(v => v.id === item.preferredVendorId);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'in_stock': 'bg-emerald-100 text-emerald-700',
      'low_stock': 'bg-amber-100 text-amber-700',
      'out_of_stock': 'bg-red-100 text-red-700',
      'transfer_pending': 'bg-blue-100 text-blue-700',
      'on_po': 'bg-purple-100 text-purple-700'
    };
    const labels: Record<string, string> = {
      'in_stock': 'In Stock',
      'low_stock': 'Low Stock',
      'out_of_stock': 'Out of Stock',
      'transfer_pending': 'Transfer Pending',
      'on_po': 'On PO'
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDeviationDisplay = (deviation: number) => {
    if (deviation < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600">
          <TrendingDown className="w-4 h-4" />
          {deviation}
        </span>
      );
    }
    if (deviation > 0) {
      return (
        <span className="flex items-center gap-1 text-emerald-600">
          <TrendingUp className="w-4 h-4" />
          +{deviation}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-gray-500">
        <CheckCircle2 className="w-4 h-4" />
        At Par
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
              <p className="text-sm font-mono text-gray-500">{item.sku}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(item.status)}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-3xl font-bold text-gray-900">{item.totalQOH}</p>
              <p className="text-sm text-gray-500">Total QOH</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2">
                <Warehouse className="w-5 h-5 text-gray-400" />
                <p className="text-3xl font-bold text-gray-900">{item.warehouseQOH}</p>
              </div>
              <p className="text-sm text-gray-500">Warehouse</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2">
                <Truck className="w-5 h-5 text-gray-400" />
                <p className="text-3xl font-bold text-gray-900">{item.totalVanQOH}</p>
              </div>
              <p className="text-sm text-gray-500">All Vans</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Item Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium text-gray-900">{item.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unit Cost</span>
                  <span className="font-medium text-gray-900">${item.unitCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unit Price</span>
                  <span className="font-medium text-gray-900">${item.unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Margin</span>
                  <span className="font-medium text-emerald-600">
                    {(((item.unitPrice - item.unitCost) / item.unitPrice) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Integration IDs</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">HCP ID</span>
                  <span className="font-mono text-sm text-gray-900">{item.hcpItemId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">QBD ID</span>
                  <span className="font-mono text-sm text-gray-900">{item.qbdItemId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">QBO ID</span>
                  <span className="font-mono text-sm text-gray-900">{item.qboItemId || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor Info */}
          {vendor && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Preferred Vendor</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{vendor.name}</p>
                  <p className="text-sm text-gray-500">{vendor.contactEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Lead Time</p>
                  <p className="font-medium text-gray-900">{vendor.leadTimeDays} days</p>
                </div>
              </div>
            </div>
          )}

          {/* Location Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Location Breakdown</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Location</th>
                    <th className="text-right px-4 py-2">Quantity</th>
                    <th className="text-right px-4 py-2">Min Par</th>
                    <th className="text-right px-4 py-2">Max Par</th>
                    <th className="text-right px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(item.locationStock).map(([locId, stock]) => {
                    const location = locations.find(l => l.id === locId);
                    return (
                      <tr key={locId} className="text-sm">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {location?.type === 'warehouse' ? (
                              <Warehouse className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Truck className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-gray-900">
                              {location?.name || locId}
                            </span>
                          </div>
                        </td>
                        <td className={`px-4 py-2 text-right font-medium ${
                          stock.deviation < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {stock.quantity}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">{stock.minPar}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{stock.maxPar}</td>
                        <td className="px-4 py-2 text-right">
                          {getDeviationDisplay(stock.deviation)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onCreatePO}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Create PO
            </button>
            <button
              onClick={onCreateTransfer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfer
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailModal;
