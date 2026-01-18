import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Clock, 
  Package,
  Edit,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Vendor, InventoryItem } from '@/types/inventory';

interface VendorsViewProps {
  vendors: Vendor[];
  inventory: InventoryItem[];
  onAddVendor: () => void;
  onEditVendor: (vendor: Vendor) => void;
  onDeleteVendor: (vendorId: string) => void;
}

const VendorsView: React.FC<VendorsViewProps> = ({
  vendors,
  inventory,
  onAddVendor,
  onEditVendor,
  onDeleteVendor
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  const filteredVendors = vendors.filter(vendor => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return vendor.name.toLowerCase().includes(query) ||
           vendor.contactEmail.toLowerCase().includes(query);
  });

  const getVendorItems = (vendorId: string) => {
    return inventory.filter(item => item.preferredVendorId === vendorId);
  };

  const getVendorStats = (vendorId: string) => {
    const items = getVendorItems(vendorId);
    const totalValue = items.reduce((sum, item) => sum + (item.unitCost * item.totalQOH), 0);
    const lowStockItems = items.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock');
    return { itemCount: items.length, totalValue, lowStockCount: lowStockItems.length };
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-500 mt-1">Manage suppliers and preferred vendors for inventory items</p>
        </div>
        <button 
          onClick={onAddVendor}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
              <p className="text-sm text-gray-500">Total Vendors</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
              <p className="text-sm text-gray-500">Items Linked</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(vendors.reduce((sum, v) => sum + v.leadTimeDays, 0) / vendors.length)}
              </p>
              <p className="text-sm text-gray-500">Avg Lead Time (days)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {vendors.filter(v => v.lastOrderDate).length}
              </p>
              <p className="text-sm text-gray-500">Active This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          />
        </div>
      </div>

      {/* Vendor List */}
      <div className="space-y-4">
        {filteredVendors.map((vendor) => {
          const stats = getVendorStats(vendor.id);
          const items = getVendorItems(vendor.id);
          const isExpanded = expandedVendor === vendor.id;

          return (
            <div 
              key={vendor.id}
              className={`bg-white rounded-xl border transition-all ${
                isExpanded ? 'border-[#1a365d] ring-2 ring-[#1a365d]/20' : 'border-gray-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#1a365d] to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {vendor.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{vendor.name}</h3>
                      {stats.lowStockCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          {stats.lowStockCount} items low
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                      <a href={`mailto:${vendor.contactEmail}`} className="flex items-center gap-1 hover:text-[#1a365d]">
                        <Mail className="w-4 h-4" />
                        {vendor.contactEmail}
                      </a>
                      <a href={`tel:${vendor.contactPhone}`} className="flex items-center gap-1 hover:text-[#1a365d]">
                        <Phone className="w-4 h-4" />
                        {vendor.contactPhone}
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 mt-3">
                      <div>
                        <span className="text-xs text-gray-500">Items</span>
                        <p className="font-semibold text-gray-900">{stats.itemCount}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Inventory Value</span>
                        <p className="font-semibold text-gray-900">${stats.totalValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Lead Time</span>
                        <p className="font-semibold text-gray-900">{vendor.leadTimeDays} days</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Last Order</span>
                        <p className="font-semibold text-gray-900">{formatDate(vendor.lastOrderDate)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedVendor(isExpanded ? null : vendor.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => onEditVendor(vendor)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => onDeleteVendor(vendor.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Items List */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-5 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-4">Linked Inventory Items</h4>
                  {items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                            <th className="text-left pb-2">SKU</th>
                            <th className="text-left pb-2">Item Name</th>
                            <th className="text-right pb-2">Unit Cost</th>
                            <th className="text-right pb-2">QOH</th>
                            <th className="text-right pb-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {items.map((item) => (
                            <tr key={item.id} className="text-sm">
                              <td className="py-2 font-mono text-gray-600">{item.sku}</td>
                              <td className="py-2 text-gray-900">{item.name}</td>
                              <td className="py-2 text-right text-gray-600">${item.unitCost.toFixed(2)}</td>
                              <td className="py-2 text-right font-medium text-gray-900">{item.totalQOH}</td>
                              <td className="py-2 text-right">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                  item.status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' :
                                  item.status === 'low_stock' ? 'bg-amber-100 text-amber-700' :
                                  item.status === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No items linked to this vendor</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredVendors.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No vendors found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorsView;
