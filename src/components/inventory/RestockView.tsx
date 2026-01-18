import React, { useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Truck,
  Package,
  AlertTriangle,
  Settings,
  Play,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { RestockOrder, InventoryItem, Location } from '@/types/inventory';

interface RestockViewProps {
  restockOrders: RestockOrder[];
  inventory: InventoryItem[];
  locations: Location[];
  onApproveRestock: (orderId: string) => void;
  onProcessRestock: (orderId: string) => void;
}

const RestockView: React.FC<RestockViewProps> = ({
  restockOrders,
  inventory,
  locations,
  onApproveRestock,
  onProcessRestock
}) => {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const vans = locations.filter(loc => loc.type === 'van' && loc.isActive);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-amber-100 text-amber-700',
      'approved': 'bg-blue-100 text-blue-700',
      'processing': 'bg-purple-100 text-purple-700',
      'completed': 'bg-emerald-100 text-emerald-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate items below par across all vans
  const getVanParStatus = () => {
    return vans.map(van => {
      let belowPar = 0;
      let totalItems = 0;
      let totalDeficit = 0;

      inventory.forEach(item => {
        const stock = item.locationStock[van.id];
        if (stock) {
          totalItems++;
          if (stock.deviation < 0) {
            belowPar++;
            totalDeficit += Math.abs(stock.deviation);
          }
        }
      });

      return {
        ...van,
        belowPar,
        totalItems,
        totalDeficit
      };
    });
  };

  const vanParStatus = getVanParStatus();
  const totalBelowPar = vanParStatus.reduce((sum, v) => sum + v.belowPar, 0);
  const pendingRestocks = restockOrders.filter(o => o.status === 'pending').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto-Restock System</h1>
          <p className="text-gray-500 mt-1">Automated par level management and restock generation</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalBelowPar}</p>
              <p className="text-sm text-gray-500">Items Below Par</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingRestocks}</p>
              <p className="text-sm text-gray-500">Pending Restocks</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {restockOrders.filter(o => o.status === 'processing').length}
              </p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {restockOrders.filter(o => o.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500">Completed Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Restock Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Auto-generate on sale</p>
                  <p className="text-sm text-gray-500">Create restock orders when items are sold</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a365d]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Require approval</p>
                  <p className="text-sm text-gray-500">Manager must approve before processing</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a365d]"></div>
                </label>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block font-medium text-gray-900 mb-2">Restock to level</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option value="min">Minimum Par Level</option>
                  <option value="max" selected>Maximum Par Level</option>
                  <option value="avg">Average (Min + Max) / 2</option>
                </select>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block font-medium text-gray-900 mb-2">Batch processing</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20">
                  <option value="immediate">Process immediately</option>
                  <option value="hourly">Batch hourly</option>
                  <option value="daily">Batch daily (end of day)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Van Par Level Overview */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Van Par Level Status</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vanParStatus.map((van) => (
              <div 
                key={van.id}
                className={`p-4 rounded-xl border ${
                  van.belowPar > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    van.belowPar > 0 ? 'bg-amber-100' : 'bg-emerald-100'
                  }`}>
                    <Truck className={`w-5 h-5 ${van.belowPar > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{van.name}</p>
                    <p className="text-sm text-gray-500">{van.technicianName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Below Par</span>
                    <p className={`font-semibold ${van.belowPar > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {van.belowPar} items
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Deficit</span>
                    <p className="font-semibold text-gray-900">{van.totalDeficit} units</p>
                  </div>
                  {van.belowPar > 0 && (
                    <button className="p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
                      <Play className="w-4 h-4 text-amber-700" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Restock Orders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Restock Orders</h3>
          <span className="text-sm text-gray-500">{restockOrders.length} orders</span>
        </div>
        <div className="divide-y divide-gray-100">
          {restockOrders.map((order) => (
            <div key={order.id}>
              <div 
                className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    order.status === 'pending' ? 'bg-amber-100' :
                    order.status === 'approved' ? 'bg-blue-100' :
                    order.status === 'processing' ? 'bg-purple-100' :
                    'bg-emerald-100'
                  }`}>
                    {order.status === 'pending' ? <Clock className="w-5 h-5 text-amber-600" /> :
                     order.status === 'approved' ? <CheckCircle2 className="w-5 h-5 text-blue-600" /> :
                     order.status === 'processing' ? <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" /> :
                     <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{order.locationName}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{order.items.length} items</span>
                      <span>
                        {order.items.reduce((sum, i) => sum + i.restockQty, 0)} units total
                      </span>
                      <span>Triggered by: {order.triggeredBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                    {expandedOrder === order.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {order.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onApproveRestock(order.id);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      Approve
                    </button>
                  )}

                  {order.status === 'approved' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProcessRestock(order.id);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Process
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOrder === order.id && (
                <div className="px-5 pb-4 bg-gray-50">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                        <th className="text-left py-2">SKU</th>
                        <th className="text-left py-2">Item</th>
                        <th className="text-right py-2">Current</th>
                        <th className="text-center py-2"></th>
                        <th className="text-right py-2">Par Level</th>
                        <th className="text-right py-2">Restock Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="text-sm">
                          <td className="py-2 font-mono text-gray-600">{item.sku}</td>
                          <td className="py-2 text-gray-900">{item.name}</td>
                          <td className="py-2 text-right text-red-600 font-medium">{item.currentQty}</td>
                          <td className="py-2 text-center">
                            <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                          </td>
                          <td className="py-2 text-right text-gray-600">{item.parLevel}</td>
                          <td className="py-2 text-right font-semibold text-emerald-600">+{item.restockQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {restockOrders.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No restock orders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestockView;
