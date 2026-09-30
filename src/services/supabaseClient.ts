import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default project credentials
const DEFAULT_SUPABASE_URL = 'https://emueqivbzalyaprqzgqo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_s92pfdKkqW89bacyRzhnkA_344bnXgz';

// Helper to sanitize any incoming Supabase Project URL
// Removes any trailing slashes, /rest/v1, /auth/v1 to avoid "Invalid path specified in request URL"
export const sanitizeSupabaseUrl = (url: string | undefined): string => {
  if (!url) return DEFAULT_SUPABASE_URL;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/auth\/v1\/?$/, '')
      .replace(/\/+$/, '') || DEFAULT_SUPABASE_URL;
  }
};

const getEnvVar = (key: string): string => {
  const env = (import.meta as any).env || {};
  return env[key] || '';
};

// Remove any legacy local/mock authentication or data
try {
  localStorage.removeItem('supabase_project_url');
  localStorage.removeItem('supabase_anon_key');
  localStorage.removeItem('nsm_auth_user_v1');
  localStorage.removeItem('nsm_inventory_items_v1');
  localStorage.removeItem('nsm_stock_movements_v1');
  localStorage.removeItem('nsm_staff_directory_v1');
} catch {}

const rawUrl = getEnvVar('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
const rawAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_URL = sanitizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = rawAnonKey.trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
};

// Main Supabase client using official @supabase/supabase-js
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Secondary client for manager to provision new staff without overwriting active manager session
export const createAdminProvisionClient = (): SupabaseClient => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
