import { createClient } from '@supabase/supabase-js';
import { createSupabaseProxyFetch } from '../utils/supabaseProxy';

// Vite env types
const env = (import.meta as any).env;
const supabaseUrl = env?.VITE_SUPABASE_URL as string;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
}

const supabaseProxyFetch = createSupabaseProxyFetch(supabaseUrl);

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: supabaseProxyFetch,
  },
});

const clientCache: Record<string, typeof supabase> = {};

export const getSupabaseClient = (phone?: string) => {
  if (!phone) return supabase;
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  if (!cleanPhone) return supabase;

  if (!clientCache[cleanPhone]) {
    clientCache[cleanPhone] = createClient(supabaseUrl || '', supabaseAnonKey || '', {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        fetch: supabaseProxyFetch,
        headers: {
          'x-customer-phone': cleanPhone,
        },
      },
    });
  }
  return clientCache[cleanPhone];
};

export type SupabaseClient = typeof supabase;
