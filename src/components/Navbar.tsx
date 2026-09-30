import React from 'react';
import { User } from '../types/inventory';
import {
  Building2,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Bot,
  Users,
  LogOut,
  ShieldCheck,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

export type ActiveTab = 'inventory' | 'history' | 'ai' | 'staff';

interface NavbarProps {
  currentUser: User;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onOpenNewItem: () => void;
  onOpenAcceptanceTests: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenStockIn,
  onOpenStockOut,
  onOpenNewItem,
  onOpenAcceptanceTests,
  onLogout,
}) => {
  const isManager = currentUser.role === 'manager';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-sm sm:text-base">
                  Nowshera Shopping Mall
                </span>
                <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Inventory System
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Real-Time Stock & AI Assistant
              </p>
            </div>
          </div>

          {/* Navigation links - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Stock History</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative ${
                activeTab === 'ai'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bot className="w-4 h-4 text-amber-400" />
              <span>AI Assistant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            {/* Manager-only Staff tab */}
            {isManager && (
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'staff'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff Accounts</span>
              </button>
            )}
          </nav>

          {/* Quick Action buttons & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick In & Out buttons */}
            <button
              onClick={onOpenStockIn}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
              title="Stock In"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stock In</span>
            </button>

            <button
              onClick={onOpenStockOut}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-medium hover:bg-rose-500/25 transition-colors"
              title="Stock Out"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stock Out</span>
            </button>

            {/* Test Criteria Verification modal trigger */}
            <button
              onClick={onOpenAcceptanceTests}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
              title="Verify the 5 Acceptance Criteria"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>5 Tests Status</span>
            </button>

            {/* User Badge */}
            <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-white leading-none">
                  {currentUser.name}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium mt-1 px-1.5 py-0.2 rounded ${
                    isManager
                      ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  }`}
                >
                  {isManager ? (
                    <ShieldCheck className="w-2.5 h-2.5" />
                  ) : (
                    <UserCheck className="w-2.5 h-2.5" />
                  )}
                  {isManager ? 'Manager' : 'Staff'}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${
              activeTab === 'inventory' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${
              activeTab === 'history' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${
              activeTab === 'ai' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
          </button>

          {isManager && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex flex-col items-center gap-1 py-1 px-2 ${
                activeTab === 'staff' ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff</span>
            </button>
          )}

          <button
            onClick={onOpenAcceptanceTests}
            className="flex flex-col items-center gap-1 py-1 px-2 text-slate-400 hover:text-amber-400"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Tests</span>
          </button>
        </div>
      </div>
    </header>
  );
};
