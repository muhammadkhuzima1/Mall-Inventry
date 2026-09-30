export type UserRole = 'manager' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  selling_price: number;
  cost_price?: number; // Only loaded from inventory_financials for Manager. Never for Staff!
  supplier_default?: string;
  min_stock_alert: number;
  created_at: string;
  updated_at?: string;
}

export interface InventoryFinancial {
  item_id: string;
  cost_price: number;
  updated_at?: string;
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  item_id: string;
  item_name?: string;
  sku?: string;
  type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  performed_by_id?: string;
  performed_by_name?: string;
  performed_by_role?: UserRole;
  supplier_or_reason: string;
  notes?: string;
  timestamp: string;
  source: 'manual' | 'ai_assistant';
}

export interface PendingAIChange {
  id: string;
  item_id: string;
  item_name: string;
  type: MovementType;
  change_quantity: number;
  current_stock: number;
  new_stock: number;
  supplier_or_reason: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  error?: string;
  created_at: string;
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  proposedChange?: PendingAIChange;
  isRestrictedNotice?: boolean;
}
