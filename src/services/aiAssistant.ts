import { GoogleGenAI } from '@google/genai';
import { InventoryItem, PendingAIChange, User } from '../types/inventory';
import { fetchInventoryItems } from './inventoryService';

export interface AIResponse {
  message: string;
  proposal?: PendingAIChange;
  isRestrictedNotice?: boolean;
  status: 'success' | 'clarification' | 'offline_fallback' | 'unavailable' | 'error';
}

/**
 * Checks if Gemini API is configured in the environment
 */
export const isGeminiConfigured = (): boolean => {
  const envKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  return Boolean(envKey && envKey !== 'MY_GEMINI_API_KEY');
};

/**
 * Clean and normalize a search term
 */
function cleanQueryTerm(term: string): string {
  return term
    .replace(/[?!.,;:]+$/, '')
    .replace(/^[?!.,;:]+/, '')
    .trim();
}

/**
 * Matches a specific term to the Supabase inventory catalog.
 * Strict enough not to false-positive on common stop words.
 */
function findBestMatchingItem(term: string, items: InventoryItem[]): InventoryItem | null {
  const clean = cleanQueryTerm(term).toLowerCase();
  if (!clean || clean.length < 2) return null;

  // 1. Exact match on SKU
  const skuMatch = items.find(i => i.sku.toLowerCase() === clean);
  if (skuMatch) return skuMatch;

  // 2. Exact match on name
  const nameMatch = items.find(i => i.name.toLowerCase() === clean);
  if (nameMatch) return nameMatch;

  // 3. Item name contains the search term or vice versa
  const itemContainingTerm = items.find(i => i.name.toLowerCase().includes(clean));
  if (itemContainingTerm) return itemContainingTerm;

  const termContainingItem = items.find(i => clean.includes(i.name.toLowerCase()));
  if (termContainingItem) return termContainingItem;

  // 4. Word-level overlap
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'left', 'stock', 'how', 'many', 'much',
    'items', 'item', 'any', 'some', 'all', 'our', 'what', 'is', 'we', 'have', 'in', 'of', 'do'
  ]);
  const termWords = clean
    .split(/[\s\-_/]+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length >= 3 && !stopWords.has(w));

  if (termWords.length > 0) {
    let bestMatch: InventoryItem | null = null;
    let maxMatches = 0;

    for (const item of items) {
      const itemWords = item.name
        .toLowerCase()
        .split(/[\s\-_/]+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));

      let matchCount = 0;
      for (const tw of termWords) {
        if (itemWords.some(iw => iw.includes(tw) || tw.includes(iw))) {
          matchCount++;
        }
      }

      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestMatch = item;
      }
    }

    if (bestMatch && maxMatches > 0) {
      return bestMatch;
    }
  }

  return null;
}

/**
 * Extracts multiple target item names from user prompt
 * e.g. "How many Type-C cable, Lays and Puma are left?" -> ["Type-C cable", "Lays", "Puma"]
 */
function extractTargetItemsFromPrompt(prompt: string): string[] {
  let cleaned = prompt.trim();

  // Strip leading question/intent starters
  cleaned = cleaned.replace(
    /^(?:could you |can you |please |hey |hi |hello |assistant )*(?:tell me |show me |check |let me know )*(?:how many units of |how many |how much |what is the stock of |what are the stock levels of |stock of |check stock for |check stock of |do we have any |do we have |is there any |are there any |check |find |show me the stock for |show me the stock of |tell me how many |tell me the stock of )\s*/i,
    ''
  );

  // Strip trailing phrases
  cleaned = cleaned.replace(
    /\s*(?:are left in stock|are left in the store|are left|left in stock|left|in stock right now|in stock|in inventory|available in stock|available|remaining|do we have left|do we have)[?.!]?$/i,
    ''
  );
  cleaned = cleaned.replace(/[?.!]+$/, '').trim();

  // Split on commas, "and", "&", "+", "or"
  const rawSegments = cleaned
    .split(/(?:,\s*|\s+(?:and|&|\+|or)\s+)/i)
    .map(s => cleanQueryTerm(s))
    .filter(s => s.length > 0);

  const stopWords = new Set([
    'how', 'many', 'much', 'stock', 'left', 'available', 'remaining',
    'are', 'is', 'do', 'we', 'have', 'in', 'of', 'the', 'items', 'item', 'all', 'our'
  ]);
  const segments = rawSegments.filter(s => !stopWords.has(s.toLowerCase()));

  return segments;
}

/**
 * Parses user input for stock preparation requests
 * e.g., "Add 40 Type-C cables from Ali Traders"
 */
function parseStockChangeIntent(
  prompt: string,
  items: InventoryItem[]
): {
  isChangeIntent: boolean;
  type?: 'IN' | 'OUT';
  quantity?: number;
  matchedItem?: InventoryItem;
  supplierOrReason?: string;
} {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  const isAdd = /\b(add|stock\s*in|receive|increase|inflow|restock|buy|bought)\b/i.test(lower);
  const isDeduct = /\b(remove|deduct|stock\s*out|decrease|outflow|sell|sold|damaged|issue)\b/i.test(lower);

  if (!isAdd && !isDeduct) {
    return { isChangeIntent: false };
  }

  const type = isAdd ? 'IN' : 'OUT';

  // Extract quantity: digits
  const qtyMatch = text.match(/\b\d+(\.\d+)?\b/);
  const quantity = qtyMatch ? parseFloat(qtyMatch[0]) : undefined;

  // Extract supplier or reason (e.g., "from Ali Traders", "for Counter 2", "to Customer")
  let supplierOrReason = '';
  const fromMatch = text.match(/(?:from|by|supplier)\s+([A-Za-z0-9\s&.-]+?)(?=$|\.|\n|,)/i);
  const forMatch = text.match(/(?:for|to|reason|customer)\s+([A-Za-z0-9\s&.-]+?)(?=$|\.|\n|,)/i);

  if (fromMatch && fromMatch[1]) {
    supplierOrReason = fromMatch[1].trim();
  } else if (forMatch && forMatch[1]) {
    supplierOrReason = forMatch[1].trim();
  } else {
    supplierOrReason = isAdd ? 'Supplier Shipment' : 'Store Outflow';
  }

  // Find matching item from real Supabase items
  const matchedItem = findBestMatchingItem(text, items);

  return {
    isChangeIntent: true,
    type,
    quantity,
    matchedItem: matchedItem || undefined,
    supplierOrReason,
  };
}

/**
 * Processes user prompt against REAL Supabase inventory database
 * Requirements:
 * 1. When user asks about multiple items, search real Supabase inventory and return ALL matching items with current stock.
 * 2. Do not return only one item.
 * 3. Do not invent missing items or numbers. If an item does not exist, clearly say it was not found.
 * 4. For stock questions, return ONLY the requested item and current stock. Do NOT expose cost price, profit, margin, or unrelated fields unless allowed.
 * 5. AI changes require proposal card with Cancel and Confirm. Stock only changes after Confirm.
 * 6. Staff cannot see cost/profit.
 * 7. AI failure must not break normal inventory.
 */
export async function processInventoryAIQuery(
  prompt: string,
  user: User,
  knownItems?: InventoryItem[],
  forceOffline: boolean = false
): Promise<AIResponse> {
  // If user explicitly toggled offline or AI service is unavailable
  if (forceOffline) {
    return {
      message:
        'AI Assistant is currently unavailable. Normal inventory pages and forms (Stock In, Stock Out, Inventory, and Stock History) continue to work normally.',
      status: 'unavailable',
    };
  }

  // Fetch real items from Supabase if not provided
  let currentItems = knownItems || [];
  if (!knownItems || knownItems.length === 0) {
    const res = await fetchInventoryItems(user.role);
    currentItems = res.data;
  }

  const lower = prompt.toLowerCase();

  // Test 4 Check: Staff requesting cost price or profit
  const asksForCostOrProfit =
    /\b(cost|cost\s*price|purchase\s*price|margin|profit|financial|buying\s*rate|valuation)\b/i.test(lower);

  if (asksForCostOrProfit && user.role === 'staff') {
    return {
      message:
        'Access Restricted: Cost price, financial margins, and profit metrics are restricted to Managers only.',
      isRestrictedNotice: true,
      status: 'clarification',
    };
  }

  // Check for Stock Preparation command (Add/Deduct)
  const changeIntent = parseStockChangeIntent(prompt, currentItems);

  if (changeIntent.isChangeIntent) {
    if (currentItems.length === 0) {
      return {
        message:
          'Supabase inventory is currently empty. Please register items in the Inventory tab before preparing stock adjustments.',
        status: 'clarification',
      };
    }

    if (!changeIntent.matchedItem) {
      return {
        message:
          'Item not found in Supabase inventory. The AI assistant answers strictly using real database data and cannot invent inventory items. Please verify the item name or add it first.',
        status: 'clarification',
      };
    }

    if (!changeIntent.quantity || changeIntent.quantity <= 0) {
      return {
        message: `Please specify a valid quantity to ${changeIntent.type === 'IN' ? 'add' : 'deduct'} for "${changeIntent.matchedItem.name}".`,
        status: 'clarification',
      };
    }

    const item = changeIntent.matchedItem;
    const qty = changeIntent.quantity;
    const type = changeIntent.type!;
    const currentStock = item.current_stock;
    const newStock = type === 'IN' ? currentStock + qty : currentStock - qty;

    // Test 3 Check: Stock cannot go below zero
    let validationError: string | undefined;
    if (type === 'OUT' && newStock < 0) {
      validationError = `Stock cannot go below zero! Current stock in database is ${currentStock} ${item.unit}, cannot deduct ${qty} ${item.unit}.`;
    }

    const proposal: PendingAIChange = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      item_id: item.id,
      item_name: item.name,
      type,
      change_quantity: qty,
      current_stock: currentStock,
      new_stock: Math.max(0, newStock),
      supplier_or_reason: changeIntent.supplierOrReason || (type === 'IN' ? 'Supplier Shipment' : 'Store Outflow'),
      status: 'pending',
      error: validationError,
      created_at: new Date().toISOString(),
    };

    let summaryText = `I have prepared the stock ${type === 'IN' ? 'addition' : 'reduction'} for **${item.name}**.\n\nPlease review the proposal below. **Stock will NOT change until you press Confirm.**`;

    if (validationError) {
      summaryText = `⚠️ **Invalid Request**: ${validationError}\n\nThis change cannot be confirmed because stock cannot fall below zero.`;
    }

    return {
      message: summaryText,
      proposal,
      status: 'success',
    };
  }

  // Stock inquiries (e.g. "How many Type-C cable, Lays and Puma are left?", "Stock of Lays", etc.)
  const isStockQuestion =
    /\b(how many|how much|stock of|check stock|available stock|left|in stock|remaining|count of|quantity of|units of|do we have|are there any)\b/i.test(lower);

  const requestedTerms = extractTargetItemsFromPrompt(prompt);

  // If user asked about specific items (single or multiple)
  if (requestedTerms.length > 0 && (isStockQuestion || requestedTerms.length > 1)) {
    if (currentItems.length === 0) {
      const missingList = requestedTerms.map(t => `• **${t}**: Not found in inventory`).join('\n');
      return {
        message: `The Supabase database currently has 0 items registered:\n\n${missingList}`,
        status: 'success',
      };
    }

    // Search real Supabase items for ALL requested terms
    const results: string[] = [];
    const seenItemIds = new Set<string>();

    for (const term of requestedTerms) {
      const match = findBestMatchingItem(term, currentItems);
      if (match) {
        if (!seenItemIds.has(match.id)) {
          seenItemIds.add(match.id);
          // For stock questions, return ONLY requested item and current stock!
          const stockLabel = match.current_stock === 0 ? '0 (Out of stock)' : `${match.current_stock} ${match.unit}`;
          results.push(`• **${match.name}**: ${stockLabel}`);
        }
      } else {
        // Do not invent missing items or numbers. Clearly state not found!
        results.push(`• **${term}**: Not found in inventory`);
      }
    }

    if (results.length > 0) {
      return {
        message: results.join('\n'),
        status: 'success',
      };
    }
  }

  // Empty database notice
  if (currentItems.length === 0) {
    return {
      message:
        'The Supabase database currently has 0 items registered. Use "+ New Item" in the Inventory tab to record products.',
      status: 'success',
    };
  }

  // Explicit Financial / Margin question (Manager only)
  if (asksForCostOrProfit && user.role === 'manager') {
    const matched = findBestMatchingItem(prompt, currentItems);
    if (matched) {
      const cost = matched.cost_price ?? 0;
      const profit = matched.selling_price - cost;
      const margin = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '100';
      return {
        message: `**${matched.name}** (Manager Financial View):\n` +
          `• Cost Price: PKR ${cost.toLocaleString()}\n` +
          `• Selling Price: PKR ${matched.selling_price.toLocaleString()}\n` +
          `• Unit Margin: PKR ${profit.toLocaleString()} (${margin}%)\n` +
          `• Current Stock: ${matched.current_stock} ${matched.unit}`,
        status: 'success',
      };
    }
  }

  // Low stock query
  if (/\b(low|empty|alert|out\s*of\s*stock|minimum)\b/i.test(lower)) {
    const lowStockItems = currentItems.filter(i => i.current_stock <= i.min_stock_alert);
    if (lowStockItems.length === 0) {
      return {
        message: 'All inventory items in the database are currently above their minimum stock alert thresholds.',
        status: 'success',
      };
    }
    const list = lowStockItems
      .map(
        i =>
          `• **${i.name}**: ${i.current_stock} ${i.unit} (Alert threshold: ${i.min_stock_alert})`
      )
      .join('\n');
    return {
      message: `The following items in Supabase require restocking:\n\n${list}`,
      status: 'success',
    };
  }

  // Attempt Gemini API call for general assistant conversations
  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // STRICT PERMISSION CHECK: Staff NEVER receives cost_price in context
      const itemsContext = currentItems.map(i => ({
        name: i.name,
        sku: i.sku,
        category: i.category,
        current_stock: i.current_stock,
        unit: i.unit,
        selling_price: i.selling_price,
        ...(user.role === 'manager' && i.cost_price !== undefined ? { cost_price: i.cost_price } : {}),
      }));

      const systemInstruction = `You are the AI Inventory Assistant for Nowshera Shopping Mall connected to a real Supabase database.
CRITICAL RULES:
1. ONLY answer using the real database items provided below. NEVER invent, fabricate, or assume items, prices, or stock quantities.
2. When a user asks about multiple items (e.g. "How many Type-C cable, Lays and Puma are left?"):
   - Search the real inventory items provided below and return ALL matching items with their current stock.
   - NEVER return only one item when multiple items were requested.
   - If an item was requested but is not in the database, clearly say it was not found in inventory. Do NOT invent missing items or numbers.
3. For stock questions, return ONLY the requested item and current stock. Do NOT expose cost price, profit, margin, or unrelated fields unless explicitly requested and permitted.
4. User Role: ${user.role.toUpperCase()} (Name: ${user.name}).
5. ${
  user.role === 'staff'
    ? 'CRITICAL RESTRICTION: The user is STAFF. You must NEVER reveal or discuss cost prices, purchase rates, profit margins, or financial valuations. If asked, inform them that cost and profit data are restricted to Managers.'
    : 'The user is MANAGER and is authorized to view cost prices and profit margins if explicitly requested.'
}
6. Stock changes require UI proposal confirmation; you cannot directly change database values.

Real Supabase Database:
${JSON.stringify(itemsContext, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      if (response && response.text) {
        return {
          message: response.text,
          status: 'success',
        };
      }
    } catch (err) {
      console.warn('Gemini request encountered issue, using real Supabase local engine:', err);
    }
  }

  // Fallback: Accurate overview from real database items
  const totalUnits = currentItems.reduce((acc, curr) => acc + curr.current_stock, 0);
  const itemList = currentItems
    .slice(0, 10)
    .map(i => `• **${i.name}**: ${i.current_stock} ${i.unit}`)
    .join('\n');

  let responseText = `Active Supabase inventory has **${currentItems.length}** products and **${totalUnits}** total units in stock:\n\n${itemList}`;
  if (currentItems.length > 10) {
    responseText += `\n...and ${currentItems.length - 10} more items.`;
  }

  return {
    message: responseText,
    status: 'success',
  };
}
