import React, { useState } from 'react';
import { 
  Truck, 
  Warehouse, 
  Network, 
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Play,
  RotateCcw,
  Package,
  AlertTriangle
} from 'lucide-react';
import { InventoryItem, Location, FulfillmentStep, FulfillmentResult } from '@/types/inventory';

interface FulfillmentEngineProps {
  inventory: InventoryItem[];
  locations: Location[];
}

const FulfillmentEngine: React.FC<FulfillmentEngineProps> = ({
  inventory,
  locations
}) => {
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedVan, setSelectedVan] = useState<string>('');
  const [requestedQty, setRequestedQty] = useState<number>(1);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [result, setResult] = useState<FulfillmentResult | null>(null);

  const vans = locations.filter(loc => loc.type === 'van' && loc.isActive);
  const warehouse = locations.find(loc => loc.type === 'warehouse');

  const runFulfillmentLogic = async () => {
    if (!selectedItem || !selectedVan) return;

    const item = inventory.find(i => i.id === selectedItem);
    if (!item) return;

    setIsRunning(true);
    setResult(null);
    setCurrentStep(0);

    const steps: FulfillmentStep[] = [
      { step: 'local', status: 'pending' },
      { step: 'warehouse', status: 'pending' },
      { step: 'network', status: 'pending' },
      { step: 'procurement', status: 'pending' }
    ];

    // Step 1: Check local van inventory
    await new Promise(resolve => setTimeout(resolve, 1000));
    const vanStock = item.locationStock[selectedVan];
    
    if (vanStock && vanStock.quantity >= requestedQty) {
      steps[0] = { 
        step: 'local', 
        status: 'found', 
        locationId: selectedVan,
        locationName: vans.find(v => v.id === selectedVan)?.name,
        quantity: vanStock.quantity,
        action: `Decrement ${requestedQty} from local stock`
      };
      setCurrentStep(0);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setResult({
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        requestedQty,
        steps,
        finalAction: 'fulfilled_local'
      });
      setIsRunning(false);
      return;
    }

    steps[0] = { step: 'local', status: 'not_found', quantity: vanStock?.quantity || 0 };
    setCurrentStep(1);

    // Step 2: Check warehouse
    await new Promise(resolve => setTimeout(resolve, 1000));
    const warehouseStock = item.locationStock[warehouse?.id || ''];
    
    if (warehouseStock && warehouseStock.quantity >= requestedQty) {
      steps[1] = {
        step: 'warehouse',
        status: 'found',
        locationId: warehouse?.id,
        locationName: 'Main Warehouse',
        quantity: warehouseStock.quantity,
        action: `Transfer ${requestedQty} from Warehouse to Van`
      };
      setCurrentStep(1);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setResult({
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        requestedQty,
        steps,
        finalAction: 'transfer_initiated',
        transferId: `TR-${Date.now()}`
      });
      setIsRunning(false);
      return;
    }

    steps[1] = { step: 'warehouse', status: 'not_found', quantity: warehouseStock?.quantity || 0 };
    setCurrentStep(2);

    // Step 3: Check other vans
    await new Promise(resolve => setTimeout(resolve, 1000));
    let foundInNetwork = false;
    
    for (const van of vans) {
      if (van.id === selectedVan) continue;
      const otherVanStock = item.locationStock[van.id];
      if (otherVanStock && otherVanStock.quantity >= requestedQty) {
        steps[2] = {
          step: 'network',
          status: 'found',
          locationId: van.id,
          locationName: van.name,
          quantity: otherVanStock.quantity,
          action: `Transfer ${requestedQty} from ${van.name} to requesting Van`
        };
        foundInNetwork = true;
        break;
      }
    }

    if (foundInNetwork) {
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 500));
      setResult({
        itemId: item.id,
        itemSku: item.sku,
        itemName: item.name,
        requestedQty,
        steps,
        finalAction: 'network_transfer',
        transferId: `TR-${Date.now()}`
      });
      setIsRunning(false);
      return;
    }

    steps[2] = { step: 'network', status: 'not_found' };
    setCurrentStep(3);

    // Step 4: Generate PO
    await new Promise(resolve => setTimeout(resolve, 1000));
    steps[3] = {
      step: 'procurement',
      status: 'completed',
      action: `Generate PO for ${requestedQty} units from preferred vendor`
    };

    setResult({
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      requestedQty,
      steps,
      finalAction: 'po_generated',
      poId: `PO-${Date.now()}`
    });
    setIsRunning(false);
  };

  const resetSimulation = () => {
    setResult(null);
    setCurrentStep(-1);
    setIsRunning(false);
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'local': return <Truck className="w-6 h-6" />;
      case 'warehouse': return <Warehouse className="w-6 h-6" />;
      case 'network': return <Network className="w-6 h-6" />;
      case 'procurement': return <ShoppingCart className="w-6 h-6" />;
      default: return <Package className="w-6 h-6" />;
    }
  };

  const getStepLabel = (step: string) => {
    switch (step) {
      case 'local': return 'Step A: Local Van Check';
      case 'warehouse': return 'Step B: Warehouse Check';
      case 'network': return 'Step C: Network Check';
      case 'procurement': return 'Step D: Procurement';
      default: return step;
    }
  };

  const getStepStatus = (index: number, step: FulfillmentStep) => {
    if (currentStep < index && !result) {
      return { color: 'bg-gray-100 text-gray-400', status: 'Waiting' };
    }
    if (currentStep === index && isRunning) {
      return { color: 'bg-blue-100 text-blue-600', status: 'Checking...' };
    }
    if (step.status === 'found' || step.status === 'completed') {
      return { color: 'bg-emerald-100 text-emerald-600', status: 'Found' };
    }
    if (step.status === 'not_found') {
      return { color: 'bg-red-100 text-red-600', status: 'Not Found' };
    }
    return { color: 'bg-gray-100 text-gray-400', status: 'Pending' };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Smart Fulfillment Engine</h1>
        <p className="text-gray-500 mt-1">Visualize and test the 4-step fulfillment logic</p>
      </div>

      {/* Simulation Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Fulfillment Simulation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              disabled={isRunning}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            >
              <option value="">Choose an item...</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requesting Van</label>
            <select
              value={selectedVan}
              onChange={(e) => setSelectedVan(e.target.value)}
              disabled={isRunning}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            >
              <option value="">Choose a van...</option>
              {vans.map(van => (
                <option key={van.id} value={van.id}>
                  {van.name} - {van.technicianName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Needed</label>
            <input
              type="number"
              min="1"
              value={requestedQty}
              onChange={(e) => setRequestedQty(parseInt(e.target.value) || 1)}
              disabled={isRunning}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a365d]/20"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={runFulfillmentLogic}
              disabled={!selectedItem || !selectedVan || isRunning}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1a365d] text-white rounded-lg hover:bg-[#1a365d]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Simulation'}
            </button>
            <button
              onClick={resetSimulation}
              disabled={isRunning}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Fulfillment Flow Visualization */}
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            {[
              { step: 'local', label: 'Local Van', desc: 'Check technician inventory' },
              { step: 'warehouse', label: 'Warehouse', desc: 'Check main warehouse' },
              { step: 'network', label: 'Network', desc: 'Check other vans' },
              { step: 'procurement', label: 'Procurement', desc: 'Generate purchase order' }
            ].map((item, index) => {
              const stepResult = result?.steps[index] || { step: item.step, status: 'pending' };
              const { color, status } = getStepStatus(index, stepResult);
              
              return (
                <React.Fragment key={item.step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${color} transition-all duration-300 ${
                      currentStep === index && isRunning ? 'animate-pulse ring-4 ring-blue-200' : ''
                    }`}>
                      {getStepIcon(item.step)}
                    </div>
                    <p className="font-medium text-gray-900 mt-2 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                    <span className={`mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
                      {status}
                    </span>
                    {stepResult.quantity !== undefined && stepResult.status !== 'pending' && (
                      <span className="text-xs text-gray-500 mt-1">
                        Qty: {stepResult.quantity}
                      </span>
                    )}
                  </div>
                  {index < 3 && (
                    <ArrowRight className={`w-8 h-8 flex-shrink-0 transition-colors ${
                      currentStep > index || (result && result.steps[index].status !== 'pending')
                        ? 'text-gray-400'
                        : 'text-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Result Panel */}
      {result && (
        <div className={`rounded-xl border p-6 ${
          result.finalAction === 'fulfilled_local' ? 'bg-emerald-50 border-emerald-200' :
          result.finalAction === 'po_generated' ? 'bg-amber-50 border-amber-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              result.finalAction === 'fulfilled_local' ? 'bg-emerald-100' :
              result.finalAction === 'po_generated' ? 'bg-amber-100' :
              'bg-blue-100'
            }`}>
              {result.finalAction === 'fulfilled_local' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : result.finalAction === 'po_generated' ? (
                <ShoppingCart className="w-6 h-6 text-amber-600" />
              ) : (
                <Truck className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {result.finalAction === 'fulfilled_local' && 'Fulfilled from Local Stock'}
                {result.finalAction === 'transfer_initiated' && 'Transfer Request Created'}
                {result.finalAction === 'network_transfer' && 'Network Transfer Initiated'}
                {result.finalAction === 'po_generated' && 'Purchase Order Generated'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {result.requestedQty}x {result.itemName} ({result.itemSku})
              </p>
              
              <div className="mt-4 space-y-2">
                {result.steps.map((step, index) => (
                  step.action && (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-gray-700">{step.action}</span>
                    </div>
                  )
                ))}
              </div>

              {(result.transferId || result.poId) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Reference: <span className="font-mono font-medium text-gray-900">
                      {result.transferId || result.poId}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logic Documentation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Fulfillment Logic Flow</h3>
        <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-blue-700 text-sm">A</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Local Check</h4>
              <p className="text-sm text-gray-600 mt-1">
                When an item is sold by a technician in Housecall Pro, first check the specific Technician's Van inventory. 
                If stock exists, decrement the local count.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-emerald-700 text-sm">B</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Global Check (Warehouse)</h4>
              <p className="text-sm text-gray-600 mt-1">
                If local stock is 0, check the Main Warehouse. If available, initiate a Transfer/Pull Request 
                to move the item from Warehouse to the Technician's Van.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-purple-700 text-sm">C</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Network Check</h4>
              <p className="text-sm text-gray-600 mt-1">
                If unavailable in the Warehouse, check other Technician Locations. This enables van-to-van 
                transfers when nearby technicians have excess stock.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-amber-700 text-sm">D</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Procurement</h4>
              <p className="text-sm text-gray-600 mt-1">
                If the item is unavailable globally, automatically generate a Purchase Order (PO) Request 
                assigned to the "Preferred Vendor" listed for that SKU.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentEngine;
