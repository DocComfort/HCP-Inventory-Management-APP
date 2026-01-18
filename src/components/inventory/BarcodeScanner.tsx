import React, { useRef, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Camera, X, Check, Plus, Minus } from 'lucide-react';
import { InventoryItem, Location } from '@/types/inventory';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onItemScanned?: (item: InventoryItem) => void;
  inventoryItems: InventoryItem[];
  locations: Location[];
  mode?: 'scan' | 'assign' | 'adjust' | 'transfer';
}

export function BarcodeScanner({
  open,
  onClose,
  onItemScanned,
  inventoryItems,
  locations,
  mode = 'scan'
}: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  
  // Form states
  const [assignItemId, setAssignItemId] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentLocation, setAdjustmentLocation] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState(0);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !scanning) {
      startScanner();
    }
    
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startScanner = async () => {
    try {
      if (!videoRef.current) return;
      
      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
      );
      
      setScanning(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to start camera: ' + message);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setScanning(false);
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
  };

  const onScanSuccess = (decodedText: string) => {
    console.log('Barcode scanned:', decodedText);
    setScannedCode(decodedText);
    
    // Look up item by barcode
    const item = inventoryItems.find(
      i => i.barcode === decodedText || i.sku === decodedText
    );
    
    if (item) {
      setFoundItem(item);
      toast.success(`Item found: ${item.name}`);
      
      if (onItemScanned) {
        onItemScanned(item);
      }
      
      // Show appropriate form based on mode
      if (mode === 'adjust') {
        setShowAdjustForm(true);
      } else if (mode === 'transfer') {
        setShowTransferForm(true);
      }
      
      stopScanner();
    } else {
      toast.info('Item not found. Assign barcode to existing item?');
      setShowAssignForm(true);
      stopScanner();
    }
  };

  const onScanFailure = (error: string) => {
    // Silent - scanning failures are normal
  };

  const handleAssignBarcode = async () => {
    if (!assignItemId || !scannedCode) {
      toast.error('Please select an item');
      return;
    }
    
    try {
      // In production, make API call to update item
      // await api.updateItem(assignItemId, { barcode: scannedCode });
      
      toast.success('Barcode assigned successfully');
      setShowAssignForm(false);
      onClose();
    } catch (error) {
      toast.error('Failed to assign barcode');
    }
  };

  const handleStockAdjustment = async () => {
    if (!foundItem || !adjustmentLocation || adjustmentQty === 0) {
      toast.error('Please fill all fields');
      return;
    }
    
    try {
      // In production, make API call to adjust stock
      // await api.adjustStock(foundItem.id, adjustmentLocation, adjustmentQty);
      
      toast.success(`Stock ${adjustmentQty > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustmentQty)}`);
      setShowAdjustForm(false);
      resetForms();
      
      // Restart scanner for next item
      if (mode === 'adjust') {
        await startScanner();
      } else {
        onClose();
      }
    } catch (error) {
      toast.error('Failed to adjust stock');
    }
  };

  const handleTransfer = async () => {
    if (!foundItem || !transferFrom || !transferTo || transferQty <= 0) {
      toast.error('Please fill all fields');
      return;
    }
    
    try {
      // In production, make API call to create transfer
      // await api.createTransfer({
      //   itemId: foundItem.id,
      //   fromLocationId: transferFrom,
      //   toLocationId: transferTo,
      //   quantity: transferQty
      // });
      
      toast.success('Transfer request created');
      setShowTransferForm(false);
      resetForms();
      
      if (mode === 'transfer') {
        await startScanner();
      } else {
        onClose();
      }
    } catch (error) {
      toast.error('Failed to create transfer');
    }
  };

  const resetForms = () => {
    setScannedCode('');
    setFoundItem(null);
    setAssignItemId('');
    setAdjustmentQty(0);
    setAdjustmentLocation('');
    setTransferFrom('');
    setTransferTo('');
    setTransferQty(0);
  };

  const handleClose = () => {
    stopScanner();
    resetForms();
    setShowAssignForm(false);
    setShowAdjustForm(false);
    setShowTransferForm(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            {mode === 'scan' && 'Point camera at barcode to scan item'}
            {mode === 'assign' && 'Scan barcode to assign to item'}
            {mode === 'adjust' && 'Scan barcode to adjust stock'}
            {mode === 'transfer' && 'Scan barcode to create transfer'}
          </DialogDescription>
        </DialogHeader>

        {/* Camera View */}
        {scanning && !showAssignForm && !showAdjustForm && !showTransferForm && (
          <div className="space-y-4">
            <div 
              id="barcode-reader" 
              ref={videoRef}
              className="w-full rounded-lg overflow-hidden border-2 border-primary"
            />
            <Button variant="outline" onClick={stopScanner} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Cancel Scanning
            </Button>
          </div>
        )}

        {/* Manual Entry */}
        {!scanning && !showAssignForm && !showAdjustForm && !showTransferForm && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual-code">Or Enter Barcode Manually</Label>
              <Input
                id="manual-code"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder="Enter barcode or SKU"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={startScanner} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onScanSuccess(scannedCode)}
                disabled={!scannedCode}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Lookup
              </Button>
            </div>
          </div>
        )}

        {/* Assign Barcode Form */}
        {showAssignForm && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Scanned Code: {scannedCode}</p>
            </div>
            
            <div>
              <Label htmlFor="assign-item">Select Item</Label>
              <Select value={assignItemId} onValueChange={setAssignItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAssignBarcode} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Assign Barcode
              </Button>
              <Button variant="outline" onClick={() => setShowAssignForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Stock Adjustment Form */}
        {showAdjustForm && foundItem && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{foundItem.name}</p>
              <p className="text-sm text-muted-foreground">SKU: {foundItem.sku}</p>
            </div>
            
            <div>
              <Label htmlFor="adjust-location">Location</Label>
              <Select value={adjustmentLocation} onValueChange={setAdjustmentLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="adjust-qty">Adjustment Quantity</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustmentQty(prev => prev - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="adjust-qty"
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustmentQty(prev => prev + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use negative numbers to decrease stock
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleStockAdjustment} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Apply Adjustment
              </Button>
              <Button variant="outline" onClick={() => setShowAdjustForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Transfer Form */}
        {showTransferForm && foundItem && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{foundItem.name}</p>
              <p className="text-sm text-muted-foreground">SKU: {foundItem.sku}</p>
            </div>
            
            <div>
              <Label htmlFor="transfer-from">From Location</Label>
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="transfer-to">To Location</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations.filter(loc => loc.id !== transferFrom).map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="transfer-qty">Quantity</Label>
              <Input
                id="transfer-qty"
                type="number"
                min="1"
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleTransfer} className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                Create Transfer
              </Button>
              <Button variant="outline" onClick={() => setShowTransferForm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
