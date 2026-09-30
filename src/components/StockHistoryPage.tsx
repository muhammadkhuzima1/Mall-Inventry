import React, { useState } from 'react';
import { StockMovement, User } from '../types/inventory';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Bot,
  User as UserIcon,
  ShieldCheck,
  UserCheck,
  Calendar,
} from 'lucide-react';

interface StockHistoryPageProps {
  movements: StockMovement[];
  currentUser: User;
}

export const StockHistoryPage: React.FC<StockHistoryPageProps> = ({ movements }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT' | 'AI'>('ALL');

  const filteredMovements = movements.filter((mov) => {
    const itemName = mov.item_name || '';
    const sku = mov.sku || '';
    const operator = mov.performed_by_name || '';
    const reason = mov.supplier_or_reason || '';
    const notes = mov.notes || '';

    const matchesSearch =
      itemName.toLowerCase().includes(search.toLowerCase()) ||
      sku.toLowerCase().includes(search.toLowerCase()) ||
      operator.toLowerCase().includes(search.toLowerCase()) ||
      reason.toLowerCase().includes(search.toLowerCase()) ||
      notes.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'IN') return mov.type === 'IN';
    if (filterType === 'OUT') return mov.type === 'OUT';
    if (filterType === 'AI') return mov.source === 'ai_assistant';

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Stock Audit & Movement History</h2>
            <p className="text-xs text-slate-400">
              Complete traceable record of every Stock In and Stock Out with author attribution
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="font-semibold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            {movements.length} logged events
          </span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, SKU, operator name, or supplier/reason..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'ALL'
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              filterType === 'IN'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3 h-3" />
            Stock In
          </button>
          <button
            onClick={() => setFilterType('OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              filterType === 'OUT'
                ? 'bg-rose-500/20 text-rose-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3 h-3" />
            Stock Out
          </button>
          <button
            onClick={() => setFilterType('AI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              filterType === 'AI'
                ? 'bg-purple-500/20 text-purple-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3 h-3 text-purple-400" />
            AI Confirmed
          </button>
        </div>
      </div>

      {/* Movements Table */}
      {filteredMovements.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Stock Movements Logged</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {movements.length === 0
              ? 'Whenever items are stocked in or stocked out (manually or confirmed via AI), the full audit trail with author details will appear here.'
              : 'No log entries matched your search filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Item & SKU</th>
                  <th className="px-4 py-3.5">Movement</th>
                  <th className="px-4 py-3.5">Stock Flow</th>
                  <th className="px-4 py-3.5">Performed By</th>
                  <th className="px-4 py-3.5">Supplier / Reason</th>
                  <th className="px-4 py-3.5">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredMovements.map((mov) => {
                  const isStockIn = mov.type === 'IN';
                  const dateObj = new Date(mov.timestamp);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        <div className="text-slate-200 font-medium">{formattedDate}</div>
                        <div className="text-slate-500">{formattedTime}</div>
                      </td>

                      {/* Item */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">{mov.item_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{mov.sku}</div>
                      </td>

                      {/* Movement Type & Qty */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isStockIn
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isStockIn ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {isStockIn ? `+${mov.quantity}` : `-${mov.quantity}`}
                        </span>
                      </td>

                      {/* Stock Change (Prev -> New) */}
                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        <span className="text-slate-500">{mov.previous_stock}</span>
                        <span className="text-slate-600 mx-1.5">→</span>
                        <span
                          className={`font-semibold ${
                            isStockIn ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {mov.new_stock}
                        </span>
                      </td>

                      {/* Performed By (Who made changes) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-white">
                            {mov.performed_by_name}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              mov.performed_by_role === 'manager'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {mov.performed_by_role === 'manager' ? (
                              <ShieldCheck className="w-2.5 h-2.5" />
                            ) : (
                              <UserCheck className="w-2.5 h-2.5" />
                            )}
                            {mov.performed_by_role}
                          </span>
                        </div>
                      </td>

                      {/* Supplier or Reason */}
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="font-medium">{mov.supplier_or_reason}</div>
                        {mov.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            Note: {mov.notes}
                          </div>
                        )}
                      </td>

                      {/* Source Channel (Manual or AI Assistant) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {mov.source === 'ai_assistant' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <Bot className="w-3 h-3 text-purple-400" />
                            AI Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <UserIcon className="w-3 h-3" />
                            Manual Form
                          </span>
                        )}
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
