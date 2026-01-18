import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  Warehouse,
  Filter,
  Search,
  Plus,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';
import { TransferRequest, Location, InventoryItem } from '@/types/inventory';

interface TransfersViewProps {
  transfers: TransferRequest[];
  locations: Location[];
  inventory: InventoryItem[];
  onApprove: (transferId: string) => void;
  onReject: (transferId: string) => void;
  onBulkApprove: (transferIds: string[]) => void;
}

const TransfersView: React.FC<TransfersViewProps> = ({
  transfers,
  locations,
  inventory,
  onApprove,
  onReject,
  onBulkApprove
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransfers, setSelectedTransfers] = useState<Set<string>>(new Set());

  const filteredTransfers = useMemo(() => {
    let result = [...transfers];

    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    if (urgencyFilter !== 'all') {
      result = result.filter(t => t.urgency === urgencyFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.itemSku.toLowerCase().includes(query) ||
        t.itemName.toLowerCase().includes(query) ||
        t.fromLocationName.toLowerCase().includes(query) ||
        t.toLocationName.toLowerCase().includes(query)
      );
    }

    // Sort by urgency then by date
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    return result;
  }, [transfers, statusFilter, urgencyFilter, searchQuery]);

  const pendingTransfers = filteredTransfers.filter(t => t.status === 'pending');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-amber-100 text-amber-700',
      'approved': 'bg-blue-100 text-blue-700',
      'in_transit': 'bg-purple-100 text-purple-700',
      'completed': 'bg-emerald-100 text-emerald-700',
      'rejected': 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

  const toggleSelectTransfer = (id: string) => {
    const newSelected = new Set(selectedTransfers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransfers(newSelected);
  };

  const selectAllPending = () => {
    if (selectedTransfers.size === pendingTransfers.length) {
      setSelectedTransfers(new Set());
    } else {
      setSelectedTransfers(new Set(pendingTransfers.map(t => t.id)));
    }
  };

  const handleBulkApprove = () => {
    onBulkApprove(Array.from(selectedTransfers));
    setSelectedTransfers(new Set());
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats
  const stats = {
    pending: transfers.filter(t => t.status === 'pending').length,
    approved: transfers.filter(t => t.status === 'approved').length,
    inTransit: transfers.filter(t => t.status === 'in_transit').length,
    completed: transfers.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Requests</h1>
          <p className="text-gray-500 mt-1">Manage inventory transfers between locations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors">
          <Plus className="w-4 h-4" />
          New Transfer
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
              <p className="text-sm text-gray-500">Pending</p>
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
              <p className="text-sm text-gray-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inTransit}</p>
              <p className="text-sm text-gray-500">In Transit</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
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
              placeholder="Search transfers..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
          >
            <option value="all">All Urgencies</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {selectedTransfers.size > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-600">{selectedTransfers.size} selected</span>
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

      {/* Transfers List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Select All Header */}
        {pendingTransfers.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedTransfers.size === pendingTransfers.length && pendingTransfers.length > 0}
              onChange={selectAllPending}
              className="w-4 h-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d]"
            />
            <span className="text-sm text-gray-600">Select all pending transfers</span>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {filteredTransfers.map((transfer) => (
            <div 
              key={transfer.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                selectedTransfers.has(transfer.id) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {transfer.status === 'pending' && (
                  <input
                    type="checkbox"
                    checked={selectedTransfers.has(transfer.id)}
                    onChange={() => toggleSelectTransfer(transfer.id)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d]"
                  />
                )}
                
                <div className="flex-shrink-0 mt-1">
                  {getUrgencyIndicator(transfer.urgency)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-gray-900">{transfer.itemName}</span>
                    <span className="text-sm font-mono text-gray-500">{transfer.itemSku}</span>
                    {getStatusBadge(transfer.status)}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      {transfer.fromLocationId.includes('wh') ? (
                        <Warehouse className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Truck className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{transfer.fromLocationName}</span>
                    </div>
                    <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-1">
                      {transfer.toLocationId.includes('wh') ? (
                        <Warehouse className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Truck className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{transfer.toLocationName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Qty: <strong className="text-gray-700">{transfer.quantity}</strong></span>
                    <span>Requested by: {transfer.requestedBy}</span>
                    <span>{formatDate(transfer.requestedAt)}</span>
                  </div>

                  {transfer.reason && (
                    <p className="mt-2 text-sm text-gray-500 italic">"{transfer.reason}"</p>
                  )}
                </div>

                {transfer.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApprove(transfer.id)}
                      className="p-2 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </button>
                    <button
                      onClick={() => onReject(transfer.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredTransfers.length === 0 && (
            <div className="px-4 py-12 text-center">
              <ArrowLeftRight className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No transfers found matching your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransfersView;
