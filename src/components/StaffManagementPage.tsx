import React, { useState, useEffect } from 'react';
import { User } from '../types/inventory';
import { fetchStaffProfiles, provisionStaffAccount } from '../services/inventoryService';
import {
  Users,
  UserPlus,
  Mail,
  Lock,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Database,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface StaffManagementPageProps {
  currentUser: User;
}

export const StaffManagementPage: React.FC<StaffManagementPageProps> = ({ currentUser }) => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStaff = async () => {
    setIsLoading(true);
    const res = await fetchStaffProfiles();
    setIsLoading(false);
    if (res.data) {
      setStaffList(res.data);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Security guard: Only Manager can access
  if (currentUser.role !== 'manager') {
    return (
      <div className="p-8 bg-slate-900 border border-rose-500/30 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400 mt-1">
          Only Managers are authorized to manage mall staff accounts.
        </p>
      </div>
    );
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Staff member name is required.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('A valid work email is required.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Temporary password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Provision in Supabase Auth & public.profiles
      const res = await provisionStaffAccount(cleanName, cleanEmail, password);
      setIsSubmitting(false);

      if (!res.success) {
        setError(res.error || 'Failed to create staff account in Supabase.');
        return;
      }

      setSuccess(`Staff account for ${cleanName} (${cleanEmail}) created in Supabase!`);
      setName('');
      setEmail('');
      setPassword('');
      loadStaff();

      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Staff Account Administration</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Manager Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Create and provision staff credentials in Supabase Auth &amp; public.profiles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-xl">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Table: public.profiles (role: staff)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Staff Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Provision New Staff Member</h3>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariq Khan"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tariq@nowsheramall.com"
                  required
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Initial Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">Staff Account Permissions:</p>
              <p>• Stock In & Stock Out via server RPC</p>
              <p>• Inventory browsing (Selling price only)</p>
              <p className="text-amber-400/90 font-medium">
                • Never receives cost price or inventory_financials
              </p>
              <p>• Staff cannot create accounts</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? 'Provisioning Account...' : 'Create Staff Account'}
            </button>
          </form>
        </div>

        {/* Existing Staff Members List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Registered Mall Staff</h3>
              {isLoading && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
            </div>
            <button
              type="button"
              onClick={loadStaff}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {staffList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl">
              <UserCheck className="w-10 h-10 text-slate-600 mb-2" />
              <h4 className="text-xs font-semibold text-white">No Staff Accounts in Supabase</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                Use the form on the left to create accounts for shopkeepers and store floor staff.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {staffList.map((st) => (
                <div key={st.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                      {st.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{st.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{st.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium">
                      <UserCheck className="w-2.5 h-2.5" />
                      Staff
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {new Date(st.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
