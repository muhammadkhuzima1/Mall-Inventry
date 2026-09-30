import React, { useState, useEffect } from 'react';
import { InventoryItem, User } from '../types/inventory';
import { recordStockMovementRPC } from '../services/inventoryService';
import { X, ArrowUpRight, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  currentUser: User;
  onStockUpdated: () => void;
  preselectedItemId?: string;
}

export const StockOutModal: React.FC<StockOutModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  onStockUpdated,
  preselectedItemId,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('Customer Purchase');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id);
    }
  }, [preselectedItemId, items, isOpen]);

  if (!isOpen) return null;

  const currentItem = items.find(i => i.id === selectedItemId);
  const qtyNumber = parseFloat(quantity) || 0;
  const currentStock = currentItem ? currentItem.current_stock : 0;
  const projectedStock = currentStock - qtyNumber;
  const isZeroStockViolation = projectedStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedItemId) {
      setError('Please select an item.');
      return;
    }

    if (qtyNumber <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    // Strict validation: Stock cannot go below zero
    if (isZeroStockViolation) {
      setError(`Stock cannot go below zero! Available stock is ${currentStock} ${currentItem?.unit}, cannot deduct ${qtyNumber}.`);
      return;
    }

    if (!reason.trim()) {
      setError('Reason or customer details required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute via the Supabase `record_stock_movement()` RPC
      const result = await recordStockMovementRPC({
        itemId: selectedItemId,
        type: 'OUT',
        quantity: qtyNumber,
        supplierOrReason: reason.trim(),
        notes: notes.trim() || undefined,
        source: 'manual',
      });

      if (!result.success) {
        setIsSubmitting(false);
        // Show clear errors from the server, including insufficient stock
        setError(result.error || 'Server rejected the stock out operation.');
        return;
      }

      setIsSubmitting(false);
      setSuccessMsg(`Successfully recorded Stock Out for ${currentItem?.name}!`);
      onStockUpdated();

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'An error occurred during Stock Out.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Stock Out (Discharge / Sale)</h3>
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
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
              >
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - Available: {item.current_stock} {item.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quantity to Deduct <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className={`w-full px-3 py-2 bg-slate-950 border rounded-lg text-slate-200 text-xs focus:outline-none ${
                  isZeroStockViolation
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 text-rose-300'
                    : 'border-slate-800 focus:ring-1 focus:ring-rose-500'
                }`}
              />
            </div>

            {/* Live Calculation Preview with Zero Protection Warning */}
            {currentItem && (
              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                isZeroStockViolation
                  ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}>
                <div className="flex justify-between text-slate-400">
                  <span>Current Available:</span>
                  <span className="font-medium text-slate-200">{currentStock} {currentItem.unit}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Requested Deduction:</span>
                  <span className="font-semibold">-{qtyNumber} {currentItem.unit}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800/80 font-semibold">
                  <span>Remaining Stock:</span>
                  <span className={isZeroStockViolation ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    {projectedStock} {currentItem.unit}
                  </span>
                </div>

                {isZeroStockViolation && (
                  <div className="mt-2 pt-2 border-t border-rose-500/30 flex items-start gap-1.5 text-[11px] text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Blocked by Rule:</strong> Stock cannot go below zero. Server RPC will reject negative balance.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason / Destination <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Counter 1 Walk-in Customer"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {['Customer Sale', 'Mall Shop Transfer', 'Damaged / Defect', 'Display Sample'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setReason(tag)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Reference */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Receipt / Reference Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bill #8492"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
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
                disabled={isZeroStockViolation || currentStock === 0 || isSubmitting}
                className="px-5 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 text-xs font-semibold shadow-md shadow-rose-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Recording on Server...' : 'Confirm Stock Out'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
