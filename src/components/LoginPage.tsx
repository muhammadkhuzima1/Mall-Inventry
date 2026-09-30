import React, { useState } from 'react';
import { User } from '../types/inventory';
import { supabase } from '../services/supabaseClient';
import { fetchUserProfile } from '../services/inventoryService';
import { Lock, Mail, AlertCircle, Building2, Store } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your work email.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate using official Supabase Auth client signInWithPassword()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError || !authData.user) {
        setIsLoading(false);
        setError(authError?.message || 'Invalid email or password.');
        return;
      }

      // 2. Read role from public.profiles using authenticated user ID
      // "Login must authenticate the real Manager and load their profiles row using the authenticated user ID."
      // "Never silently assign a default role if the profile cannot be loaded."
      const { user: profileUser, error: profileErr } = await fetchUserProfile(authData.user.id);

      if (profileErr || !profileUser) {
        // Sign out to prevent unverified session access
        await supabase.auth.signOut();
        setIsLoading(false);
        setError(
          profileErr ||
            'Access denied: Profile record could not be loaded from database. User role could not be verified.'
        );
        return;
      }

      // 3. User successfully verified with role from public.profiles
      setIsLoading(false);
      onLoginSuccess(profileUser);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'An unexpected error occurred during authentication.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Background mall ambient aesthetic */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-950 to-slate-950 -z-10 pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Mall Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Nowshera Shopping Mall
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 flex items-center justify-center gap-1.5">
            <Store className="w-4 h-4 text-amber-400/80" />
            Inventory Control & AI Assistant System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 pb-4 border-b border-slate-800/80">
            <h2 className="text-lg font-semibold text-slate-200">Account Login</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Supabase Authentication &bull; Role verified from database
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form: STRICTLY Email and Password only. NO Sign Up. NO Role Selector! */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@nowsheramall.com"
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In'}
            </button>
          </form>

          {/* Authentication System Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <strong>Security Protocol:</strong> Role is resolved directly from <code>public.profiles</code>.
            </p>
            <p className="text-slate-500">
              No public sign-up. Only Mall Managers can create Staff accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
