/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { InventoryItem, StockMovement, User } from './types/inventory';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import {
  fetchInventoryItems,
  fetchStockMovements,
  fetchUserProfile,
} from './services/inventoryService';
import { LoginPage } from './components/LoginPage';
import { Navbar, ActiveTab } from './components/Navbar';
import { InventoryPage } from './components/InventoryPage';
import { StockHistoryPage } from './components/StockHistoryPage';
import { AIAssistantView } from './components/AIAssistantView';
import { StaffManagementPage } from './components/StaffManagementPage';
import { StockInModal } from './components/StockInModal';
import { StockOutModal } from './components/StockOutModal';
import { NewItemModal } from './components/NewItemModal';
import { AcceptanceTestsModal } from './components/AcceptanceTestsModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentUser, setAuthUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Modals state
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [isAcceptanceTestsOpen, setIsAcceptanceTestsOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  // Sync data strictly from Supabase
  const reloadData = useCallback(async (role?: 'manager' | 'staff') => {
    const activeRole = role || currentUser?.role;
    if (!activeRole) return;

    try {
      // 1. Fetch inventory items (cost price from inventory_financials only queried if role is manager)
      const itemsRes = await fetchInventoryItems(activeRole);
      if (itemsRes.data) {
        setItems(itemsRes.data);
      }

      // 2. Fetch stock movements from stock_movements table
      const movementsRes = await fetchStockMovements();
      if (movementsRes.data) {
        setMovements(movementsRes.data);
      }
    } catch (err) {
      console.error('Error synchronizing Supabase data:', err);
    }
  }, [currentUser?.role]);

  // Session restoration on startup using Supabase Auth
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!isSupabaseConfigured()) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Read user role strictly from public.profiles
          // "Never silently assign a default role if the profile cannot be loaded."
          const { user, error } = await fetchUserProfile(session.user.id);

          if (user && isMounted) {
            setAuthUser(user);
            reloadData(user.role);
          } else {
            console.warn('Profile resolution failed on session restore:', error);
            // Sign out if profile is missing/invalid
            await supabase.auth.signOut();
            if (isMounted) setAuthUser(null);
          }
        }
      } catch (err) {
        console.error('Error restoring Supabase session:', err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    restoreSession();

    // Listen to Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setAuthUser(null);
          setItems([]);
          setMovements([]);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        const { user } = await fetchUserProfile(session.user.id);
        if (user && isMounted) {
          setAuthUser(user);
          reloadData(user.role);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [reloadData]);

  // Handle Login
  const handleLoginSuccess = (user: User) => {
    setAuthUser(user);
    setActiveTab('inventory');
    reloadData(user.role);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error logging out from Supabase:', err);
    }
    setAuthUser(null);
    setItems([]);
    setMovements([]);
  };

  // Open modals
  const handleOpenStockIn = (itemId?: string) => {
    setSelectedItemId(itemId);
    setIsStockInOpen(true);
  };

  const handleOpenStockOut = (itemId?: string) => {
    setSelectedItemId(itemId);
    setIsStockOutOpen(true);
  };

  const handleOpenNewItem = () => {
    setItemToEdit(null);
    setIsNewItemOpen(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsNewItemOpen(true);
  };

  // Show loading indicator during session restoration
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        <span className="text-xs">Connecting to Supabase...</span>
      </div>
    );
  }

  // Screen 1: ALWAYS Login Page first if not authenticated
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStockIn={() => handleOpenStockIn()}
        onOpenStockOut={() => handleOpenStockOut()}
        onOpenNewItem={handleOpenNewItem}
        onOpenAcceptanceTests={() => setIsAcceptanceTestsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'inventory' && (
          <InventoryPage
            items={items}
            currentUser={currentUser}
            onRefresh={() => reloadData()}
            onOpenNewItem={handleOpenNewItem}
            onOpenEditItem={handleOpenEditItem}
            onOpenStockIn={handleOpenStockIn}
            onOpenStockOut={handleOpenStockOut}
          />
        )}

        {activeTab === 'history' && (
          <StockHistoryPage
            movements={movements}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'ai' && (
          <AIAssistantView
            currentUser={currentUser}
            items={items}
            onStockUpdated={() => reloadData()}
            onOpenNewItem={handleOpenNewItem}
            onClose={() => setActiveTab('inventory')}
          />
        )}

        {/* Manager-only Staff tab */}
        {activeTab === 'staff' && currentUser.role === 'manager' && (
          <StaffManagementPage currentUser={currentUser} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Nowshera Shopping Mall &bull; Supabase Database Connected</span>
          <span className="text-[11px] text-slate-500 font-mono">
            Active: {currentUser.name} ({currentUser.role})
          </span>
        </div>
      </footer>

      {/* Modals */}
      <StockInModal
        isOpen={isStockInOpen}
        onClose={() => {
          setIsStockInOpen(false);
          setSelectedItemId(undefined);
        }}
        items={items}
        currentUser={currentUser}
        onStockUpdated={() => reloadData()}
        preselectedItemId={selectedItemId}
      />

      <StockOutModal
        isOpen={isStockOutOpen}
        onClose={() => {
          setIsStockOutOpen(false);
          setSelectedItemId(undefined);
        }}
        items={items}
        currentUser={currentUser}
        onStockUpdated={() => reloadData()}
        preselectedItemId={selectedItemId}
      />

      <NewItemModal
        isOpen={isNewItemOpen}
        onClose={() => {
          setIsNewItemOpen(false);
          setItemToEdit(null);
        }}
        currentUser={currentUser}
        onItemSaved={() => reloadData()}
        editItem={itemToEdit}
      />

      <AcceptanceTestsModal
        isOpen={isAcceptanceTestsOpen}
        onClose={() => setIsAcceptanceTestsOpen(false)}
        currentUser={currentUser}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        onOpenStockOut={() => handleOpenStockOut()}
      />
    </div>
  );
}
