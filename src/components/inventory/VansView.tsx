import React, { useState } from 'react';
import { 
  Truck, 
  User, 
  Package, 
  AlertTriangle, 
  CheckCircle2,
  ChevronRight,
  Search,
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight
} from 'lucide-react';
import { Location, InventoryItem } from '@/types/inventory';

interface VansViewProps {
  locations: Location[];
  inventory: InventoryItem[];
  onSelectVan: (location: Location) => void;
  onEditParLevels: (locationId: string) => void;
}

const VansView: React.FC<VansViewProps> = ({
  locations,
  inventory,
  onSelectVan,
  onEditParLevels
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVan, setSelectedVan] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const vans = locations.filter(loc => loc.type === 'van');
  
  const filteredVans = vans.filter(van => {
    if (showActiveOnly && !van.isActive) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return van.name.toLowerCase().includes(query) || 
             van.technicianName?.toLowerCase().includes(query);
    }
    return true;
  });

  const getVanStats = (vanId: string) => {
    let totalItems = 0;
    let totalUnits = 0;
    let belowPar = 0;
    let atPar = 0;
    let abovePar = 0;

    inventory.forEach(item => {
      const stock = item.locationStock[vanId];
      if (stock) {
        totalItems++;
        totalUnits += stock.quantity;
        if (stock.deviation < 0) belowPar++;
        else if (stock.deviation === 0) atPar++;
        else abovePar++;
      }
    });

    return { totalItems, totalUnits, belowPar, atPar, abovePar };
  };

  const getVanInventory = (vanId: string) => {
    return inventory
      .filter(item => item.locationStock[vanId])
      .map(item => ({
        ...item,
        vanStock: item.locationStock[vanId]
      }))
      .sort((a, b) => a.vanStock.deviation - b.vanStock.deviation);
  };

  const handleVanClick = (van: Location) => {
    setSelectedVan(selectedVan === van.id ? null : van.id);
  };

  // Overall stats
  const activeVans = vans.filter(v => v.isActive).length;
  const totalVanUnits = inventory.reduce((sum, item) => sum + item.totalVanQOH, 0);
  const vansWithLowStock = vans.filter(van => {
    const stats = getVanStats(van.id);
    return stats.belowPar > 0;
  }).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Technician Vans</h1>
          <p className="text-gray-500 mt-1">Monitor and manage mobile inventory locations</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeVans}</p>
              <p className="text-sm text-gray-500">Active Vans</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalVanUnits.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total Van Units</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{vansWithLowStock}</p>
              <p className="text-sm text-gray-500">Vans Below Par</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Math.round(totalVanUnits / activeVans)}</p>
              <p className="text-sm text-gray-500">Avg Units/Van</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search vans or technicians..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d]"
          />
          <span className="text-sm text-gray-600">Active vans only</span>
        </label>
      </div>

      {/* Van Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVans.map((van) => {
          const stats = getVanStats(van.id);
          const vanInventory = getVanInventory(van.id);
          const isExpanded = selectedVan === van.id;

          return (
            <div 
              key={van.id}
              className={`bg-white rounded-xl border transition-all ${
                isExpanded ? 'border-[#1a365d] ring-2 ring-[#1a365d]/20 col-span-full' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => handleVanClick(van)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      van.isActive ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <Truck className={`w-6 h-6 ${van.isActive ? 'text-orange-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{van.name}</h3>
                        {!van.isActive && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <User className="w-4 h-4" />
                        {van.technicianName}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{stats.totalUnits}</p>
                    <p className="text-xs text-gray-500">Units</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{stats.totalItems}</p>
                    <p className="text-xs text-gray-500">SKUs</p>
                  </div>
                  <div className={`text-center p-2 rounded-lg ${
                    stats.belowPar > 0 ? 'bg-red-50' : 'bg-emerald-50'
                  }`}>
                    <p className={`text-lg font-bold ${
                      stats.belowPar > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>{stats.belowPar}</p>
                    <p className="text-xs text-gray-500">Below Par</p>
                  </div>
                </div>

                {/* Par Level Indicator */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Par Level Status</span>
                    <span>{stats.atPar + stats.abovePar} / {stats.totalItems} at or above par</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-red-500 h-full"
                      style={{ width: `${(stats.belowPar / stats.totalItems) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-500 h-full"
                      style={{ width: `${(stats.atPar / stats.totalItems) * 100}%` }}
                    />
                    <div 
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(stats.abovePar / stats.totalItems) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Inventory View */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">Van Inventory</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditParLevels(van.id);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Edit Par Levels
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                          <th className="text-left pb-2">SKU</th>
                          <th className="text-left pb-2">Item</th>
                          <th className="text-right pb-2">Qty</th>
                          <th className="text-right pb-2">Min</th>
                          <th className="text-right pb-2">Max</th>
                          <th className="text-right pb-2">Status</th>
                          <th className="text-right pb-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {vanInventory.slice(0, 10).map((item) => (
                          <tr key={item.id} className="text-sm">
                            <td className="py-2 font-mono text-gray-600">{item.sku}</td>
                            <td className="py-2 text-gray-900">{item.name}</td>
                            <td className={`py-2 text-right font-medium ${
                              item.vanStock.deviation < 0 ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {item.vanStock.quantity}
                            </td>
                            <td className="py-2 text-right text-gray-500">{item.vanStock.minPar}</td>
                            <td className="py-2 text-right text-gray-500">{item.vanStock.maxPar}</td>
                            <td className="py-2 text-right">
                              {item.vanStock.deviation < 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-600">
                                  <TrendingDown className="w-4 h-4" />
                                  {item.vanStock.deviation}
                                </span>
                              ) : item.vanStock.deviation > 0 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                  <TrendingUp className="w-4 h-4" />
                                  +{item.vanStock.deviation}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-500">
                                  <CheckCircle2 className="w-4 h-4" />
                                  At Par
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {item.vanStock.deviation < 0 && (
                                <button className="p-1 hover:bg-blue-100 rounded transition-colors">
                                  <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {vanInventory.length > 10 && (
                    <p className="text-sm text-gray-500 mt-3 text-center">
                      Showing 10 of {vanInventory.length} items
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredVans.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center">
          <Truck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No vans found matching your search</p>
        </div>
      )}
    </div>
  );
};

export default VansView;
