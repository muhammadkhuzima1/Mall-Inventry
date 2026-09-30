import React, { useState, useRef, useEffect } from 'react';
import { AIChatMessage, InventoryItem, PendingAIChange, User } from '../types/inventory';
import { processInventoryAIQuery, isGeminiConfigured } from '../services/aiAssistant';
import { recordStockMovementRPC } from '../services/inventoryService';
import {
  Bot,
  Send,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  Power,
  RotateCcw,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface AIAssistantViewProps {
  currentUser: User;
  items: InventoryItem[];
  onStockUpdated: () => void;
  onOpenNewItem: () => void;
  onClose?: () => void;
}

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({
  currentUser,
  items,
  onStockUpdated,
  onClose,
}) => {
  const isManager = currentUser.role === 'manager';
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello ${currentUser.name}! I am the Nowshera Shopping Mall AI Inventory Assistant.\n\nI answer queries strictly from your real Supabase database. I can also prepare stock adjustments for you (e.g. *"Add 40 Type-C cables from Ali Traders"*), but **stock will NEVER change until you click Confirm**.`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isConfirmingId, setIsConfirmingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Execute confirmation of pending stock change via Supabase RPC
  const handleConfirmChange = async (proposal: PendingAIChange, messageId: string) => {
    const item = items.find(i => i.id === proposal.item_id);

    if (!item) {
      alert(`Item "${proposal.item_name}" not found in current Supabase inventory.`);
      return;
    }

    // Strict validation: Stock cannot go below zero
    if (proposal.type === 'OUT' && item.current_stock - proposal.change_quantity < 0) {
      alert(`Action blocked! Current stock is ${item.current_stock}, cannot deduct ${proposal.change_quantity}. Stock cannot go below zero.`);
      return;
    }

    setIsConfirmingId(messageId);

    try {
      // Execute via the Supabase `record_stock_movement()` RPC
      const result = await recordStockMovementRPC({
        itemId: proposal.item_id,
        type: proposal.type,
        quantity: proposal.change_quantity,
        supplierOrReason: proposal.supplier_or_reason,
        notes: proposal.notes || 'Confirmed via AI Assistant',
        source: 'ai_assistant',
      });

      setIsConfirmingId(null);

      if (!result.success) {
        alert(result.error || 'Server rejected the stock change.');
        return;
      }

      // Update message state: mark proposal as confirmed
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === messageId && msg.proposedChange) {
            return {
              ...msg,
              proposedChange: {
                ...msg.proposedChange,
                status: 'confirmed',
                current_stock: item.current_stock,
                new_stock: proposal.new_stock,
              },
            };
          }
          return msg;
        })
      );

      // Append system acknowledgment message
      const ackMessage: AIChatMessage = {
        id: `ack_${Date.now()}`,
        sender: 'system',
        text: `✅ **Confirmed & Applied:** Server recorded stock change for **${proposal.item_name}**. Recorded in audit history under **${currentUser.name} (${currentUser.role})**.`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, ackMessage]);
      onStockUpdated();
    } catch (err: any) {
      setIsConfirmingId(null);
      alert(err.message || 'Failed to execute stock movement on server.');
    }
  };

  // Cancel pending stock change: Cancel must make no change!
  const handleCancelChange = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId && msg.proposedChange) {
          return {
            ...msg,
            proposedChange: {
              ...msg.proposedChange,
              status: 'cancelled',
            },
          };
        }
        return msg;
      })
    );

    const cancelMessage: AIChatMessage = {
      id: `cancel_${Date.now()}`,
      sender: 'system',
      text: `❌ **Cancelled:** Stock adjustment proposal dismissed. No change made to database.`,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, cancelMessage]);
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const queryText = (customText || input).trim();
    if (!queryText || isProcessing) return;

    setInput('');

    // Append user message
    const userMsg: AIChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await processInventoryAIQuery(
        queryText,
        currentUser,
        items,
        isOfflineMode
      );

      const aiMsg: AIChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: response.message,
        timestamp: new Date().toISOString(),
        proposedChange: response.proposal,
        isRestrictedNotice: response.isRestrictedNotice,
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: 'AI Assistant is currently unavailable. Normal inventory pages and forms (Stock In, Stock Out, Inventory, and Stock History) continue to work normally.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[750px] max-h-[82vh]">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Nowshera Mall AI Assistant
              </h3>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  !isOfflineMode
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    !isOfflineMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {!isOfflineMode ? 'Online (Supabase Connected)' : 'Offline / Unavailable'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isManager
                ? 'Manager Mode: Cost prices and profit analysis authorized'
                : 'Staff Mode: Cost prices and profit analysis restricted'}
            </p>
          </div>
        </div>

        {/* Status toggle & reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`p-2 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
              isOfflineMode
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Toggle AI Availability to verify Test #5"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isOfflineMode ? 'Simulate Offline' : 'Online'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMessages([
                {
                  id: 'welcome_reset',
                  sender: 'assistant',
                  text: 'Conversation cleared. What would you like to check or prepare?',
                  timestamp: new Date().toISOString(),
                },
              ])
            }
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Clear Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close AI Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Acceptance Test Banner Notice */}
      <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>AI Changes Require Confirm:</strong> Stock will <strong>NEVER</strong> change until you click [Confirm].
          </span>
        </span>
        <span className="font-mono text-slate-400 hidden sm:inline">Cancel = No change</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 text-center max-w-lg mx-auto"
              >
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-3`}>
                {/* Bubble */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm shadow-md shadow-amber-500/10'
                      : msg.isRestrictedNotice
                      ? 'bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-tl-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
                  }`}
                >
                  {msg.isRestrictedNotice && (
                    <div className="flex items-center gap-1.5 font-bold text-rose-300 mb-1">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Security Restriction</span>
                    </div>
                  )}
                  {msg.text}
                </div>

                {/* Interactive Stock Change Proposal Card */}
                {msg.proposedChange && (
                  <div className="rounded-xl border border-amber-500/30 bg-slate-950/90 p-4 shadow-xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Stock Change Proposal
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            msg.proposedChange.status === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : msg.proposedChange.status === 'cancelled'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {msg.proposedChange.status}
                        </span>
                        {msg.proposedChange.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelChange(msg.id)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Close Proposal (Cancel)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Proposal Details */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Target Product:</span>
                        <strong className="text-white">{msg.proposedChange.item_name}</strong>
                      </div>

                      <div className="flex justify-between text-slate-300">
                        <span className="text-slate-400">Current stock:</span>
                        <span className="font-mono">{msg.proposedChange.current_stock}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-400">Change:</span>
                        <span
                          className={`font-bold font-mono ${
                            msg.proposedChange.type === 'IN'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {msg.proposedChange.type === 'IN' ? '+' : '-'}
                          {msg.proposedChange.change_quantity}
                        </span>
                      </div>

                      <div className="flex justify-between pt-1 border-t border-slate-800/80 font-semibold">
                        <span className="text-slate-300">New stock:</span>
                        <span
                          className={`font-mono ${
                            msg.proposedChange.new_stock < 0
                              ? 'text-rose-400 font-bold'
                              : 'text-amber-400'
                          }`}
                        >
                          {msg.proposedChange.new_stock}
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-300 pt-0.5">
                        <span className="text-slate-400">
                          {msg.proposedChange.type === 'IN' ? 'Supplier:' : 'Reason / Destination:'}
                        </span>
                        <span className="font-medium text-slate-200">
                          {msg.proposedChange.supplier_or_reason}
                        </span>
                      </div>
                    </div>

                    {/* Error Banner if Zero Stock Violated */}
                    {msg.proposedChange.error && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{msg.proposedChange.error}</span>
                      </div>
                    )}

                    {/* Action Buttons: [Cancel] [Confirm] */}
                    {msg.proposedChange.status === 'pending' ? (
                      <div className="pt-2 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          disabled={isConfirmingId === msg.id}
                          onClick={() => handleCancelChange(msg.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(msg.proposedChange.error) || isConfirmingId === msg.id}
                          onClick={() => handleConfirmChange(msg.proposedChange!, msg.id)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-md shadow-emerald-500/10 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isConfirmingId === msg.id ? 'Applying...' : 'Confirm'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] pt-1 text-slate-400 text-right">
                        {msg.proposedChange.status === 'confirmed' ? (
                          <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Change recorded via Supabase RPC
                          </span>
                        ) : (
                          <span className="text-slate-500">Proposal cancelled</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Querying Supabase database...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-300">
        <span className="text-slate-500 shrink-0 font-medium">Quick Prompts:</span>
        <button
          type="button"
          onClick={() => handleSendMessage(undefined, 'List all inventory items in stock')}
          className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 shrink-0 border border-slate-700/60 transition-colors"
        >
          Check database stock
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage(undefined, 'Add 40 Type-C cables from Ali Traders')}
          className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 shrink-0 border border-emerald-500/30 transition-colors"
        >
          "Add 40 Type-C cables from Ali Traders"
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage(undefined, 'What is the cost price and profit of Type-C cables?')}
          className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 shrink-0 border border-amber-500/30 transition-colors"
        >
          Test Role Permission (Cost/Profit)
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage(undefined, 'Remove 9999 units for customer sale')}
          className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 shrink-0 border border-rose-500/30 transition-colors"
        >
          Test Zero-Stock Block
        </button>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask stock levels or e.g. 'Add 40 Type-C cables from Ali Traders'..."
          disabled={isProcessing}
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
