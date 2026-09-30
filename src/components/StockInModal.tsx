import React, { useState, useEffect } from 'react';
import { InventoryItem, User } from '../types/inventory';
import { recordStockMovementRPC } from '../services/inventoryService';
import { X, ArrowDownLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  currentUser: User;
  onStockUpdated: () => void;
  preselectedItemId?: string;
}

export const StockInModal: React.FC<StockInModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  onStockUpdated,
  preselectedItemId,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
      const matched = items.find(i => i.id === preselectedItemId);
      if (matched && matched.supplier_default) {
        setSupplier(matched.supplier_default);
      }
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id);
      if (items[0].supplier_default) {
        setSupplier(items[0].supplier_default);
      }
    }
  }, [preselectedItemId, items, isOpen]);

  if (!isOpen) return null;

  const currentItem = items.find(i => i.id === selectedItemId);
  const qtyNumber = parseFloat(quantity) || 0;
  const currentStock = currentItem ? currentItem.current_stock : 0;
  const projectedStock = currentStock + qtyNumber;

  const handleItemChange = (id: string) => {
    setSelectedItemId(id);
    const itm = items.find(i => i.id === id);
    if (itm && itm.supplier_default) {
      setSupplier(itm.supplier_default);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedItemId) {
      setError('Please select an item to stock in.');
      return;
    }

    if (qtyNumber <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (!supplier.trim()) {
      setError('Supplier name is required (e.g. Ali Traders).');
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute via the Supabase `record_stock_movement()` RPC
      const result = await recordStockMovementRPC({
        itemId: selectedItemId,
        type: 'IN',
        quantity: qtyNumber,
        supplierOrReason: supplier.trim(),
        notes: notes.trim() || undefined,
        source: 'manual',
      });

      if (!result.success) {
        setIsSubmitting(false);
        setError(result.error || 'Server rejected the stock in operation.');
        return;
      }

      setIsSubmitting(false);
      setSuccessMsg(`Successfully recorded Stock In for ${currentItem?.name}!`);
      onStockUpdated();

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'An error occurred during Stock In.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Stock In (Receive Goods)</h3>
              <p className="text-xs text-slate-400">Supabase RPC: record_stock_movement()</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-slate-300">
              No items exist in the inventory catalog.
            </p>
            <p className="text-xs text-slate-500">
              Please register an item first using the "+ New Item" button.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Select Item */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Product <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - Current: {item.current_stock} {item.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quantity to Add <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Live Calculation Preview */}
            {currentItem && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Current stock:</span>
                  <span className="font-medium text-slate-200">{currentStock} {currentItem.unit}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Incoming Change:</span>
                  <span className="font-semibold">+{qtyNumber} {currentItem.unit}</span>
                </div>
                <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-800 font-semibold">
                  <span>Projected New Stock:</span>
                  <span className="text-emerald-400">{projectedStock} {currentItem.unit}</span>
                </div>
              </div>
            )}

            {/* Supplier */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Supplier Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Ali Traders"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes / Reference */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Delivery Note / Invoice Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Invoice #NSM-8491"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Operator attribution notice */}
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span>Authorized operator:</span>
              <span className="text-slate-300 font-medium">{currentUser.name} ({currentUser.role})</span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-semibold shadow-md shadow-emerald-500/10 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Recording on Server...' : 'Confirm Stock In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
