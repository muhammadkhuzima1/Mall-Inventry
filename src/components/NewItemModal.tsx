import React, { useState, useEffect } from 'react';
import { InventoryItem, User } from '../types/inventory';
import { saveInventoryItem } from '../services/inventoryService';
import { X, PackagePlus, AlertCircle, ShieldAlert } from 'lucide-react';

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onItemSaved: () => void;
  editItem?: InventoryItem | null;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onItemSaved,
  editItem,
}) => {
  const isManager = currentUser.role === 'manager';

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Electronics & Accessories');
  const [currentStock, setCurrentStock] = useState('0');
  const [unit, setUnit] = useState('pcs');
  const [costPrice, setCostPrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [supplierDefault, setSupplierDefault] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setSku(editItem.sku);
      setCategory(editItem.category);
      setCurrentStock(editItem.current_stock.toString());
      setUnit(editItem.unit);
      setCostPrice((editItem.cost_price ?? 0).toString());
      setSellingPrice(editItem.selling_price.toString());
      setMinStockAlert(editItem.min_stock_alert.toString());
      setSupplierDefault(editItem.supplier_default || '');
    } else {
      setName('');
      setSku('');
      setCategory('Electronics & Accessories');
      setCurrentStock('0');
      setUnit('pcs');
      setCostPrice('0');
      setSellingPrice('0');
      setMinStockAlert('5');
      setSupplierDefault('');
    }
    setError(null);
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Item name is required.');
      return;
    }

    if (!sku.trim()) {
      setError('SKU / Barcode is required.');
      return;
    }

    const stockNum = parseFloat(currentStock) || 0;
    const sellNum = parseFloat(sellingPrice) || 0;
    const costNum = isManager ? parseFloat(costPrice) || 0 : undefined;
    const minAlertNum = parseFloat(minStockAlert) || 0;

    if (stockNum < 0) {
      setError('Initial stock cannot be negative.');
      return;
    }

    if (sellNum < 0) {
      setError('Selling price cannot be negative.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save item to Supabase database (inventory_items and inventory_financials)
      const res = await saveInventoryItem(
        {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: category.trim(),
          unit: unit.trim() || 'pcs',
          selling_price: sellNum,
          cost_price: costNum,
          min_stock_alert: minAlertNum,
          supplier_default: supplierDefault.trim() || undefined,
          initial_stock: stockNum,
        },
        editItem ? editItem.id : undefined,
        currentUser.role
      );

      if (!res.success) {
        setIsSubmitting(false);
        setError(res.error || 'Failed to save item in Supabase.');
        return;
      }

      setIsSubmitting(false);
      onItemSaved();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'An error occurred while saving.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {editItem ? 'Edit Inventory Item' : 'Register New Item'}
              </h3>
              <p className="text-xs text-slate-400">
                Supabase Table: public.inventory_items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Item Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Type-C Fast Cable"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                SKU / Barcode <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CAB-TC-01"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Electronics & Accessories">Electronics & Accessories</option>
                <option value="Mobile & Telecom">Mobile & Telecom</option>
                <option value="Fashion & Garments">Fashion & Garments</option>
                <option value="Footwear & Bags">Footwear & Bags</option>
                <option value="Home & Living">Home & Living</option>
                <option value="Cosmetics & Fragrance">Cosmetics & Fragrance</option>
                <option value="Stationery & Office">Stationery & Office</option>
                <option value="Groceries & Snacks">Groceries & Snacks</option>
                <option value="General Mall Merchandise">General Mall Merchandise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs, box, kg, meter"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Stock & Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {editItem ? 'Current Stock (Read-only)' : 'Initial Stock Quantity'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                disabled={Boolean(editItem)}
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none disabled:opacity-50"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {editItem
                  ? 'Use Stock In/Out RPC to modify stock'
                  : 'Cannot go below zero'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Min Stock Alert Level
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Pricing & Valuation
              </span>
              {!isManager && (
                <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Cost stored in inventory_financials (Manager Only)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Selling Price - Visible to BOTH Manager and Staff */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Selling Price (PKR) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Cost Price - MANAGER ONLY! */}
              {isManager ? (
                <div>
                  <label className="block text-xs font-medium text-amber-300 mb-1 flex items-center gap-1">
                    Cost Price (PKR)
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-normal">
                      inventory_financials
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-lg text-amber-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-500 text-xs text-center">
                  Cost price is confidential and restricted by database RLS.
                </div>
              )}
            </div>

            {/* Manager Profit Preview */}
            {isManager && (
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span>Estimated Unit Margin:</span>
                <span className="font-semibold text-emerald-400">
                  PKR {(parseFloat(sellingPrice || '0') - parseFloat(costPrice || '0')).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Default Supplier */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Primary Supplier (Optional)
            </label>
            <input
              type="text"
              value={supplierDefault}
              onChange={(e) => setSupplierDefault(e.target.value)}
              placeholder="e.g. Ali Traders, Peshawar Tech Hub"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
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
              className="px-5 py-2 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-semibold shadow-md shadow-amber-500/10 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving to Database...' : editItem ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
