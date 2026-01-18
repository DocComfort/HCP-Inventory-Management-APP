import React, { useState } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Warehouse, 
  Truck,
  AlertTriangle
} from 'lucide-react';
import { InventoryItem, Location } from '@/types/inventory';

interface TransferModalProps {
  item?: InventoryItem;
  locations: Location[];
  onClose: () => void;
  onSubmit: (data: {
    itemId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    urgency: string;
    reason: string;
  }) => void;
  inventory: InventoryItem[];
}

const TransferModal: React.FC<TransferModalProps> = ({
  item,
  locations,
  onClose,
  onSubmit,
  inventory
}) => {
  const [selectedItem, setSelectedItem] = useState(item?.id || '');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState('medium');
  const [reason, setReason] = useState('');

  const currentItem = inventory.find(i => i.id === selectedItem);
  const fromStock = currentItem?.locationStock[fromLocation];
  const maxQuantity = fromStock?.quantity || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !fromLocation || !toLocation || quantity < 1) return;
    
    onSubmit({
      itemId: selectedItem,
      fromLocationId: fromLocation,
      toLocationId: toLocation,
      quantity,
      urgency,
      reason
    });
  };

  const isValid = selectedItem && fromLocation && toLocation && quantity > 0 && quantity <= maxQuantity && fromLocation !== toLocation;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create Transfer Request</h2>
              <p className="text-sm text-gray-500">Move inventory between locations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <select
              value={selectedItem}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                setFromLocation('');
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
              required
            >
              <option value="">Select an item...</option>
              {inventory.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.sku} - {inv.name} (Total: {inv.totalQOH})
                </option>
              ))}
            </select>
          </div>

          {/* From Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Location</label>
            <select
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
              required
              disabled={!selectedItem}
            >
              <option value="">Select source location...</option>
              {locations.filter(loc => {
                if (!currentItem) return false;
                const stock = currentItem.locationStock[loc.id];
                return stock && stock.quantity > 0;
              }).map(loc => {
                const stock = currentItem?.locationStock[loc.id];
                return (
                  <option key={loc.id} value={loc.id}>
                    {loc.type === 'warehouse' ? '🏭' : '🚐'} {loc.name} 
                    {loc.technicianName ? ` (${loc.technicianName})` : ''} 
                    - Qty: {stock?.quantity || 0}
                  </option>
                );
              })}
            </select>
          </div>

          {/* To Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Location</label>
            <select
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
              required
              disabled={!fromLocation}
            >
              <option value="">Select destination location...</option>
              {locations.filter(loc => loc.id !== fromLocation && loc.isActive).map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.type === 'warehouse' ? '🏭' : '🚐'} {loc.name}
                  {loc.technicianName ? ` (${loc.technicianName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity {fromStock && <span className="text-gray-400">(max: {maxQuantity})</span>}
            </label>
            <input
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
              required
            />
            {quantity > maxQuantity && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Quantity exceeds available stock
              </p>
            )}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            >
              <option value="low">Low - Can wait</option>
              <option value="medium">Medium - Within 24 hours</option>
              <option value="high">High - Same day</option>
              <option value="critical">Critical - Immediate</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this transfer needed?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20 resize-none"
            />
          </div>

          {/* Transfer Preview */}
          {fromLocation && toLocation && currentItem && (
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm font-medium text-blue-800 mb-2">Transfer Preview</p>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  {locations.find(l => l.id === fromLocation)?.type === 'warehouse' ? (
                    <Warehouse className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Truck className="w-4 h-4 text-blue-600" />
                  )}
                  <span>{locations.find(l => l.id === fromLocation)?.name}</span>
                </div>
                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                <div className="flex items-center gap-1">
                  {locations.find(l => l.id === toLocation)?.type === 'warehouse' ? (
                    <Warehouse className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Truck className="w-4 h-4 text-blue-600" />
                  )}
                  <span>{locations.find(l => l.id === toLocation)?.name}</span>
                </div>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {quantity}x {currentItem.name}
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Transfer Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
