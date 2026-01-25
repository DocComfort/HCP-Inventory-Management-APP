import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Truck, 
  ArrowLeftRight, 
  ShoppingCart, 
  RefreshCw, 
  Link2, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  RotateCcw,
  Clock
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Global Inventory', icon: Package },
  { id: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { id: 'vans', label: 'Technician Vans', icon: Truck },
  { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'fulfillment', label: 'Fulfillment Engine', icon: Zap },
  { id: 'restock', label: 'Auto-Restock', icon: RotateCcw },
  { id: 'timesheets', label: 'Timesheets', icon: Clock },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];



const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, collapsed, onToggleCollapse }) => {
  return (
    <div 
      className={`bg-[#1a365d] text-white flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">InventoryBridge</h1>
              <p className="text-xs text-white/60">HCP + QB Sync</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center mx-auto">
            <Package className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-white/10">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
