import React, { useState } from 'react';
import { InventoryItem, User } from '../types/inventory';
import { deleteInventoryItem } from '../services/inventoryService';
import {
  Package,
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Boxes,
  ShieldCheck,
  ShieldAlert,
  Database,
} from 'lucide-react';

interface InventoryPageProps {
  items: InventoryItem[];
  currentUser: User;
  onRefresh: () => void;
  onOpenNewItem: () => void;
  onOpenEditItem: (item: InventoryItem) => void;
  onOpenStockIn: (itemId?: string) => void;
  onOpenStockOut: (itemId?: string) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  items,
  currentUser,
  onRefresh,
  onOpenNewItem,
  onOpenEditItem,
  onOpenStockIn,
  onOpenStockOut,
}) => {
  const isManager = currentUser.role === 'manager';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  // Calculate stats
  const totalItemsCount = items.length;
  const totalStockUnits = items.reduce((sum, i) => sum + i.current_stock, 0);
  const lowStockCount = items.filter(i => i.current_stock <= i.min_stock_alert && i.current_stock > 0).length;
  const outOfStockCount = items.filter(i => i.current_stock === 0).length;

  // Manager Only Financial Calculations (from Supabase inventory_financials)
  const totalCostValuation = isManager
    ? items.reduce((sum, i) => sum + ((i.cost_price || 0) * i.current_stock), 0)
    : 0;
  const totalRetailValuation = items.reduce((sum, i) => sum + (i.selling_price * i.current_stock), 0);
  const totalPotentialProfit = isManager ? totalRetailValuation - totalCostValuation : 0;

  // Unique categories for filter dropdown
  const categories = ['ALL', ...Array.from(new Set(items.map(i => i.category)))];

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from Supabase database?`)) {
      setIsDeleting(id);
      const res = await deleteInventoryItem(id);
      setIsDeleting(null);
      if (!res.success) {
        alert(res.error || 'Failed to delete item.');
      } else {
        onRefresh();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Products</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalItemsCount}</span>
            <span className="text-xs text-slate-500">in Supabase</span>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Units</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalStockUnits}</span>
            <span className="text-xs text-slate-500">live stock</span>
          </div>
        </div>

        {/* Manager-only KPI 1: Cost Valuation or Staff alternative */}
        {isManager ? (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-300 flex items-center gap-1">
                Cost Valuation
                <ShieldCheck className="w-3 h-3 text-amber-400" />
              </span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-200">
                PKR {totalCostValuation.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">inventory_financials table</span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Stock Alerts</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{lowStockCount}</span>
              <span className="text-xs text-slate-500">low stock</span>
            </div>
          </div>
        )}

        {/* Manager-only KPI 2: Potential Profit or Staff alternative */}
        {isManager ? (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                Projected Profit
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">
                PKR {totalPotentialProfit.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Retail: PKR {totalRetailValuation.toLocaleString()}
            </span>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Out of Stock</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-400">{outOfStockCount}</span>
              <span className="text-xs text-slate-500">depleted</span>
            </div>
          </div>
        )}
      </div>

      {/* Role Notice Indicator */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          {isManager ? (
            <>
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300">
                <strong>Manager Access:</strong> Cost price and margin loaded from <code>public.inventory_financials</code>.
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                <strong>Staff Access:</strong> <code>inventory_financials</code> is strictly omitted at database query level.
              </span>
            </>
          )}
        </div>
        <button
          onClick={onOpenNewItem}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors shadow-sm text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Item</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Supabase catalog by item name, SKU, or category..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table / Cards */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          {items.length === 0 ? (
            <>
              <h3 className="text-base font-semibold text-white">No Items in Supabase Database</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
                Connected to real Supabase database. Click '+ Add First Item' to create products directly in <code>public.inventory_items</code>.
              </p>
              <button
                onClick={onOpenNewItem}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Item</span>
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-semibold text-white">No Matches Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                No items in database matched your search query "{search}".
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('ALL');
                }}
                className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">SKU / Item</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Stock Level</th>
                  <th className="px-4 py-3.5">Selling Price</th>
                  {/* Manager Only Headers */}
                  {isManager && (
                    <>
                      <th className="px-4 py-3.5 text-amber-300">
                        Cost Price <span className="text-[9px] bg-amber-500/20 px-1 py-0.5 rounded">Financials</span>
                      </th>
                      <th className="px-4 py-3.5 text-emerald-300">
                        Margin / Profit <span className="text-[9px] bg-emerald-500/20 px-1 py-0.5 rounded">Manager</span>
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3.5 text-right">Stock Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredItems.map((item) => {
                  const cost = item.cost_price ?? 0;
                  const unitProfit = item.selling_price - cost;
                  const profitMargin =
                    cost > 0 ? ((unitProfit / cost) * 100).toFixed(1) : '100';

                  const isOutOfStock = item.current_stock === 0;
                  const isLowStock = !isOutOfStock && item.current_stock <= item.min_stock_alert;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & SKU */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.sku}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60 text-[11px]">
                          {item.category}
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold text-[11px] inline-flex items-center gap-1 ${
                              isOutOfStock
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                : isLowStock
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock
                                  ? 'bg-rose-400'
                                  : isLowStock
                                  ? 'bg-amber-400 animate-ping'
                                  : 'bg-emerald-400'
                              }`}
                            />
                            {item.current_stock} {item.unit}
                          </span>
                        </div>
                        {isLowStock && (
                          <span className="text-[10px] text-amber-400 mt-0.5 block">
                            Alert threshold: {item.min_stock_alert}
                          </span>
                        )}
                      </td>

                      {/* Selling Price - Visible to both Manager and Staff */}
                      <td className="px-4 py-3.5 font-medium text-slate-100">
                        PKR {item.selling_price.toLocaleString()}
                      </td>

                      {/* MANAGER ONLY: Cost Price */}
                      {isManager && (
                        <td className="px-4 py-3.5 text-amber-300 font-mono">
                          PKR {cost.toLocaleString()}
                        </td>
                      )}

                      {/* MANAGER ONLY: Profit */}
                      {isManager && (
                        <td className="px-4 py-3.5">
                          <span
                            className={`font-semibold ${
                              unitProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            PKR {unitProfit.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            ({profitMargin}%)
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenStockIn(item.id)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                            title="Stock In (+)"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenStockOut(item.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                            title="Stock Out (-)"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenEditItem(item)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isManager && (
                            <button
                              disabled={isDeleting === item.id}
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                              title="Delete Item from Supabase (Manager Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
