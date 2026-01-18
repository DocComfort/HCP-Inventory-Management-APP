import React, { useState } from 'react';
import { Bell, Search, User, RefreshCw, CheckCircle2, AlertCircle, Clock, LogOut, Camera } from 'lucide-react';
import { SyncStatus } from '@/types/inventory';
import { useAuth } from '@/hooks/use-auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface HeaderProps {
  syncStatuses: SyncStatus[];
  onRefreshSync: () => void;
  pendingApprovals: number;
  onOpenBarcodeScanner?: () => void;
}

const platformLabels: Record<string, string> = {
  hcp: 'Housecall Pro',
  qbd: 'QB Desktop',
  qbo: 'QB Online'
};

const Header: React.FC<HeaderProps> = ({ syncStatuses, onRefreshSync, pendingApprovals, onOpenBarcodeScanner }) => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const formatLastSync = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'syncing':
        return <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory, SKUs, locations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 focus:border-[#1a365d]"
            />
          </div>
        </div>

        {/* Sync Status Pills */}
        <div className="flex items-center gap-3 mx-6">
          {syncStatuses.map((sync) => (
            <div
              key={sync.platform}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200"
            >
              {getStatusIcon(sync.status)}
              <span className="text-xs font-medium text-gray-700">
                {platformLabels[sync.platform]}
              </span>
              <span className="text-xs text-gray-400">
                {formatLastSync(sync.lastSync)}
              </span>
              {sync.pendingChanges > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                  {sync.pendingChanges}
                </span>
              )}
            </div>
          ))}
          <button
            onClick={onRefreshSync}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh all syncs"
          >
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Barcode Scanner */}
          {onOpenBarcodeScanner && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenBarcodeScanner}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              Scan
            </Button>
          )}

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            {pendingApprovals > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingApprovals > 9 ? '9+' : pendingApprovals}
              </span>
            )}
          </button>

          {/* User */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 pl-3 border-l border-gray-200 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role || 'User'}
                    </p>
                  </div>
                  <div className="w-9 h-9 bg-[#1a365d] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => setShowAuthModal(true)} variant="outline" size="sm">
              Sign In
            </Button>
          )}
        </div>
        
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </header>
  );
};

export default Header;
