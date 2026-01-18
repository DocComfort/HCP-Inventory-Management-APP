import React, { useState, useMemo } from 'react';
import { 
  Warehouse, 
  Package, 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowLeftRight,
  Download
} from 'lucide-react';
import { InventoryItem, Location } from '@/types/inventory';

interface WarehouseViewProps {
  inventory: InventoryItem[];
  warehouse: Location | undefined;
  onCreateTransfer: (item: InventoryItem) => void;
}

const WarehouseView: React.FC<WarehouseViewProps> = ({
  inventory,
  warehouse,
  onCreateTransfer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  const warehouseId = warehouse?.id || 'loc-wh-001';

  const warehouseInventory = useMemo(() => {
    return inventory.map(item => ({
      ...item,
      warehouseStock: item.locationStock[warehouseId]
    })).filter(item => item.warehouseStock);
  }, [inventory, warehouseId]);

  const filteredInventory = useMemo(() => {
    let result = [...warehouseInventory];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.sku.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter);
    }

    if (stockFilter !== 'all') {
      result = result.filter(item => {
        const deviation = item.warehouseStock.deviation;
        switch (stockFilter) {
          case 'below': return deviation < 0;
          case 'at': return deviation === 0;
          case 'above': return deviation > 0;
          default: return true;
        }
      });
    }

    return result;
  }, [warehouseInventory, searchQuery, categoryFilter, stockFilter]);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [inventory]);

  // Calculate stats
  const totalUnits = warehouseInventory.reduce((sum, item) => sum + item.warehouseStock.quantity, 0);
  const totalValue = warehouseInventory.reduce((sum, item) => sum + (item.warehouseStock.quantity * item.unitCost), 0);
  const belowPar = warehouseInventory.filter(item => item.warehouseStock.deviation < 0).length;
  const abovePar = warehouseInventory.filter(item => item.warehouseStock.deviation > 0).length;

  const getStockStatus = (deviation: number) => {
    if (deviation < 0) {
      return {
        icon: <TrendingDown className="w-4 h-4 text-red-500" />,
        label: `${deviation}`,
        color: 'text-red-600'
      };
    }
    if (deviation > 0) {
      return {
        icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
        label: `+${deviation}`,
        color: 'text-emerald-600'
      };
    }
    return {
      icon: <CheckCircle2 className="w-4 h-4 text-gray-400" />,
      label: 'At Par',
      color: 'text-gray-500'
    };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Main Warehouse</h1>
          <p className="text-gray-500 mt-1">Central inventory hub and distribution center</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalUnits.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Units</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Inventory Value</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{belowPar}</p>
              <p className="text-sm text-gray-500">Below Par Level</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{abovePar}</p>
              <p className="text-sm text-gray-500">Above Par Level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search warehouse inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
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
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          >
            <option value="all">All Stock Levels</option>
            <option value="below">Below Par</option>
            <option value="at">At Par</option>
            <option value="above">Above Par</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Min Par
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Max Par
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item.warehouseStock.deviation);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-[#1a365d]">{item.sku}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{item.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${
                        item.warehouseStock.deviation < 0 ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {item.warehouseStock.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-500">{item.warehouseStock.minPar}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-500">{item.warehouseStock.maxPar}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {status.icon}
                        <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-600">
                        ${(item.warehouseStock.quantity * item.unitCost).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onCreateTransfer(item)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Create Transfer"
                      >
                        <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No items found matching your filters</p>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Inventory by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {categories.filter(c => c !== 'all').map(category => {
            const categoryItems = warehouseInventory.filter(item => item.category === category);
            const categoryUnits = categoryItems.reduce((sum, item) => sum + item.warehouseStock.quantity, 0);
            const categoryValue = categoryItems.reduce((sum, item) => sum + (item.warehouseStock.quantity * item.unitCost), 0);
            const categoryBelowPar = categoryItems.filter(item => item.warehouseStock.deviation < 0).length;

            return (
              <div key={category} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{category}</h4>
                  {categoryBelowPar > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      {categoryBelowPar} low
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SKUs</span>
                    <span className="font-medium text-gray-900">{categoryItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Units</span>
                    <span className="font-medium text-gray-900">{categoryUnits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Value</span>
                    <span className="font-medium text-gray-900">${categoryValue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WarehouseView;
