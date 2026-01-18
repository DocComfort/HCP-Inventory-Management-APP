import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  ArrowUpDown,
  Package,
  Warehouse,
  Truck,
  AlertTriangle,
  Clock,
  ShoppingCart,
  MoreHorizontal,
  Eye,
  Edit,
  ArrowLeftRight
} from 'lucide-react';
import { InventoryItem, Vendor } from '@/types/inventory';

interface InventoryTableProps {
  inventory: InventoryItem[];
  vendors: Vendor[];
  onViewItem: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onCreateTransfer: (item: InventoryItem) => void;
}

type SortField = 'sku' | 'name' | 'totalQOH' | 'warehouseQOH' | 'totalVanQOH' | 'status';
type SortDirection = 'asc' | 'desc';

const InventoryTable: React.FC<InventoryTableProps> = ({
  inventory,
  vendors,
  onViewItem,
  onEditItem,
  onCreateTransfer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [inventory]);

  const statuses = ['all', 'in_stock', 'low_stock', 'out_of_stock', 'transfer_pending', 'on_po'];

  const filteredAndSortedInventory = useMemo(() => {
    let result = [...inventory];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.sku.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [inventory, searchQuery, categoryFilter, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedInventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedInventory.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return <Package className="w-4 h-4 text-emerald-500" />;
      case 'low_stock': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'out_of_stock': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'transfer_pending': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'on_po': return <ShoppingCart className="w-4 h-4 text-purple-500" />;
      default: return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-900 transition-colors"
    >
      {label}
      {sortField === field ? (
        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      ) : (
        <ArrowUpDown className="w-4 h-4 opacity-50" />
      )}
    </button>
  );

  const getVendorName = (vendorId: string) => {
    return vendors.find(v => v.id === vendorId)?.name || 'Unknown';
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Global Inventory</h1>
          <p className="text-gray-500 mt-1">
            {filteredAndSortedInventory.length} of {inventory.length} items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by SKU, name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d]"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a365d]/10 rounded-lg">
            <span className="text-sm font-medium text-[#1a365d]">{selectedItems.size} selected</span>
            <button className="text-sm text-[#1a365d] hover:underline">Bulk Transfer</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredAndSortedInventory.length && filteredAndSortedInventory.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <SortHeader field="sku" label="SKU" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <SortHeader field="name" label="Item Name" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <SortHeader field="totalQOH" label="Total QOH" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <SortHeader field="warehouseQOH" label="Warehouse" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <SortHeader field="totalVanQOH" label="Vans" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <SortHeader field="status" label="Status" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAndSortedInventory.map((item) => (
                <React.Fragment key={item.id}>
                  <tr 
                    className={`hover:bg-gray-50 transition-colors ${expandedRow === item.id ? 'bg-gray-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                        className="flex items-center gap-2 text-sm font-mono text-[#1a365d] hover:underline"
                      >
                        {expandedRow === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {item.sku}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{item.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">{item.totalQOH}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Warehouse className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{item.warehouseQOH}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{item.totalVanQOH}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => onViewItem(item)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={() => onEditItem(item)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={() => onCreateTransfer(item)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Create Transfer"
                        >
                          <ArrowLeftRight className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRow === item.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-8">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Item Details</h4>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm"><span className="text-gray-500">Cost:</span> ${item.unitCost.toFixed(2)}</p>
                              <p className="text-sm"><span className="text-gray-500">Price:</span> ${item.unitPrice.toFixed(2)}</p>
                              <p className="text-sm"><span className="text-gray-500">Vendor:</span> {getVendorName(item.preferredVendorId)}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Integration IDs</h4>
                            <div className="space-y-1">
                              <p className="text-sm font-mono"><span className="text-gray-500">HCP:</span> {item.hcpItemId || 'N/A'}</p>
                              <p className="text-sm font-mono"><span className="text-gray-500">QBD:</span> {item.qbdItemId || 'N/A'}</p>
                              <p className="text-sm font-mono"><span className="text-gray-500">QBO:</span> {item.qboItemId || 'N/A'}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Location Breakdown</h4>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {Object.entries(item.locationStock).slice(0, 5).map(([locId, stock]) => (
                                <div key={locId} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">{locId.includes('wh') ? 'Warehouse' : `Van ${locId.slice(-1)}`}</span>
                                  <span className={`font-medium ${stock.deviation < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {stock.quantity} / {stock.minPar}-{stock.maxPar}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedInventory.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No items found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTable;
