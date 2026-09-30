import { supabase, createAdminProvisionClient } from './supabaseClient';
import { InventoryItem, MovementType, StockMovement, User, UserRole } from '../types/inventory';

/**
 * Fetch inventory items strictly from Supabase
 * RLS & Role enforcement:
 * - If user is Staff, NEVER query `inventory_financials`!
 * - If user is Manager, query `inventory_financials` and map cost_price.
 */
export async function fetchInventoryItems(userRole: UserRole): Promise<{
  data: InventoryItem[];
  error?: string;
}> {
  try {
    // 1. Fetch catalog items from `inventory_items` table
    const { data: itemsData, error: itemsError } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');

    if (itemsError) {
      console.error('Error fetching inventory items from Supabase:', itemsError);
      return { data: [], error: itemsError.message };
    }

    if (!itemsData || itemsData.length === 0) {
      return { data: [] };
    }

    // Map base items
    const items: InventoryItem[] = itemsData.map((row: any) => ({
      id: row.id,
      sku: row.sku || '',
      name: row.name || 'Unnamed Product',
      category: row.category || 'General Merchandise',
      current_stock: Number(row.current_stock ?? row.stock ?? 0),
      unit: row.unit || 'pcs',
      selling_price: Number(row.selling_price || 0),
      supplier_default: row.supplier_default || row.supplier || undefined,
      min_stock_alert: Number(row.min_stock_alert ?? row.min_alert ?? 5),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at,
    }));

    // 2. PERMISSION CHECK: Only Manager can access `inventory_financials`
    if (userRole === 'manager') {
      try {
        const { data: finData, error: finError } = await supabase
          .from('inventory_financials')
          .select('*');

        if (!finError && finData) {
          const finMap = new Map<string, number>();
          finData.forEach((f: any) => {
            const key = f.item_id || f.id;
            if (key) {
              finMap.set(key, Number(f.cost_price || 0));
            }
          });

          // Join cost_price into items
          items.forEach(item => {
            if (finMap.has(item.id)) {
              item.cost_price = finMap.get(item.id);
            } else {
              item.cost_price = 0;
            }
          });
        }
      } catch (err) {
        console.warn('Could not query inventory_financials for manager:', err);
      }
    }
    // Note: If userRole !== 'manager', cost_price remains undefined. No query sent to inventory_financials.

    return { data: items };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to fetch inventory from Supabase.' };
  }
}

/**
 * Fetch stock movements from `stock_movements` table
 */
export async function fetchStockMovements(): Promise<{
  data: StockMovement[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Try fallback to 'timestamp' column if created_at does not exist
      const fallback = await supabase
        .from('stock_movements')
        .select('*')
        .order('timestamp', { ascending: false });

      if (fallback.error) {
        return { data: [], error: fallback.error.message };
      }

      return { data: normalizeMovements(fallback.data) };
    }

    return { data: normalizeMovements(data) };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to fetch stock movements.' };
  }
}

function normalizeMovements(rows: any[]): StockMovement[] {
  if (!rows) return [];
  return rows.map(r => ({
    id: r.id,
    item_id: r.item_id,
    item_name: r.item_name || r.name || 'Item',
    sku: r.sku || '',
    type: (r.type || r.movement_type || 'IN').toUpperCase() as MovementType,
    quantity: Number(r.quantity || 0),
    previous_stock: Number(r.previous_stock ?? r.prev_stock ?? 0),
    new_stock: Number(r.new_stock ?? 0),
    performed_by_id: r.performed_by_id || r.user_id,
    performed_by_name: r.performed_by_name || r.user_name || 'Staff Operator',
    performed_by_role: (r.performed_by_role || r.role || 'staff') as UserRole,
    supplier_or_reason: r.supplier_or_reason || r.reason || r.supplier || 'General Movement',
    notes: r.notes || undefined,
    timestamp: r.created_at || r.timestamp || new Date().toISOString(),
    source: (r.source === 'ai_assistant' ? 'ai_assistant' : 'manual') as any,
  }));
}

/**
 * Executes a Stock In or Stock Out movement via the Supabase `record_stock_movement()` RPC
 * Requirements:
 * - Normal Stock In/Out must use the Supabase `record_stock_movement()` RPC.
 * - Never directly update `inventory_items.current_stock` from the frontend.
 * - Show clear errors from the server, including insufficient stock.
 * - Stock must never go below zero.
 */
export async function recordStockMovementRPC(params: {
  itemId: string;
  type: MovementType;
  quantity: number;
  supplierOrReason: string;
  notes?: string;
  source: 'manual' | 'ai_assistant';
}): Promise<{
  success: boolean;
  error?: string;
  data?: any;
}> {
  try {
    const qty = Number(params.quantity);
    if (isNaN(qty) || qty <= 0) {
      return { success: false, error: 'Quantity must be greater than zero.' };
    }

    // Call Supabase RPC record_stock_movement()
    let rpcResponse = await supabase.rpc('record_stock_movement', {
      p_item_id: params.itemId,
      p_type: params.type,
      p_quantity: qty,
      p_supplier_or_reason: params.supplierOrReason,
      p_notes: params.notes || '',
      p_source: params.source,
    });

    // Fallback if procedure only takes 5 arguments without p_source
    if (rpcResponse.error && rpcResponse.error.code === 'PGRST202') {
      rpcResponse = await supabase.rpc('record_stock_movement', {
        p_item_id: params.itemId,
        p_type: params.type,
        p_quantity: qty,
        p_supplier_or_reason: params.supplierOrReason,
        p_notes: params.notes || '',
      });
    }

    if (rpcResponse.error) {
      console.error('record_stock_movement RPC Error:', rpcResponse.error);
      return {
        success: false,
        error: rpcResponse.error.message || 'Server rejected the stock movement.',
      };
    }

    return {
      success: true,
      data: rpcResponse.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error executing stock movement on server.',
    };
  }
}

/**
 * Creates or updates an inventory item and (if manager) cost price in `inventory_financials`
 */
export async function saveInventoryItem(
  itemData: {
    name: string;
    sku: string;
    category: string;
    unit: string;
    selling_price: number;
    cost_price?: number;
    supplier_default?: string;
    min_stock_alert: number;
    initial_stock?: number;
  },
  existingId: string | undefined,
  userRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const itemPayload: any = {
      name: itemData.name.trim(),
      sku: itemData.sku.trim().toUpperCase(),
      category: itemData.category.trim(),
      unit: itemData.unit.trim() || 'pcs',
      selling_price: Number(itemData.selling_price) || 0,
      min_stock_alert: Number(itemData.min_stock_alert) || 5,
      supplier_default: itemData.supplier_default?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let itemId = existingId;

    if (existingId) {
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(itemPayload)
        .eq('id', existingId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // New item creation
      itemPayload.current_stock = Number(itemData.initial_stock) || 0;
      itemPayload.created_at = new Date().toISOString();

      const { data: inserted, error: insertError } = await supabase
        .from('inventory_items')
        .insert([itemPayload])
        .select()
        .single();

      if (insertError) {
        return { success: false, error: insertError.message };
      }
      itemId = inserted.id;
    }

    // If Manager provided cost price, save to `inventory_financials`
    if (userRole === 'manager' && itemId && itemData.cost_price !== undefined) {
      try {
        await supabase.from('inventory_financials').upsert({
          item_id: itemId,
          cost_price: Number(itemData.cost_price) || 0,
          updated_at: new Date().toISOString(),
        });
      } catch (finErr) {
        console.warn('Failed to update inventory_financials:', finErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save item in Supabase.' };
  }
}

/**
 * Deletes an item from Supabase (Manager only)
 */
export async function deleteInventoryItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from financials first if exists
    try {
      await supabase.from('inventory_financials').delete().eq('item_id', id);
    } catch {}

    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch staff profiles from `public.profiles`
 */
export async function fetchStaffProfiles(): Promise<{ data: User[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'staff')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    const staff: User[] = (data || []).map((row: any) => ({
      id: row.id,
      email: row.email || '',
      name: row.name || row.full_name || 'Staff Member',
      role: 'staff',
      createdAt: row.created_at || new Date().toISOString(),
    }));

    return { data: staff };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

/**
 * Provision new Staff account (Manager only)
 * Uses separate client without session persistence to prevent manager from being logged out!
 */
export async function provisionStaffAccount(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = createAdminProvisionClient();

    // 1. Sign up user with auth metadata
    const { data: authData, error: authError } = await adminClient.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          name: name.trim(),
          role: 'staff',
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (authData.user) {
      // 2. Insert into public.profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          role: 'staff',
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        console.warn('Profile insert returned notice:', profileError.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to provision staff account.' };
  }
}

/**
 * Load user profile from public.profiles
 * Acceptance rule: Never silently assign a default role if profile cannot be loaded!
 */
export async function fetchUserProfile(userId: string): Promise<{ user: User | null; error?: string }> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return {
        user: null,
        error: `Could not load user profile from database: ${error.message}`,
      };
    }

    if (!profile) {
      return {
        user: null,
        error: 'No profile record found in public.profiles for this account.',
      };
    }

    const role = profile.role ? String(profile.role).toLowerCase() : '';
    if (role !== 'manager' && role !== 'staff') {
      return {
        user: null,
        error: `Invalid account role "${profile.role}". Profile must have role "manager" or "staff".`,
      };
    }

    const user: User = {
      id: profile.id,
      email: profile.email || '',
      name: profile.name || profile.full_name || profile.email?.split('@')[0] || 'User',
      role: role as UserRole,
      createdAt: profile.created_at || new Date().toISOString(),
    };

    return { user };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'Failed to query public.profiles.',
    };
  }
}
