import { createClient } from '@supabase/supabase-js';

// Vite env types
const env = (import.meta as any).env;
const supabaseUrl = env?.VITE_SUPABASE_URL as string;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
}

const createClientOptions = (headers?: Record<string, string>) => {
  return {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    ...(headers ? { global: { headers } } : {}),
  };
};

let _supabase: ReturnType<typeof createClient<any>>;
try {
  _supabase = createClient<any>(supabaseUrl || '', supabaseAnonKey || '', createClientOptions());
} catch (e) {
  console.error('Failed to create Supabase client — check env variables', e);
  // Provide a non-functional client so the rest of the app can still mount
  // and show a user-friendly error instead of a white screen.
  _supabase = createClient<any>('https://placeholder.supabase.co', 'placeholder', createClientOptions());
}
export const supabase = _supabase;

const clientCache: Record<string, typeof supabase> = {};

export const getSupabaseClient = (phone?: string) => {
  if (!phone) return supabase;
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  if (!cleanPhone) return supabase;

  if (!clientCache[cleanPhone]) {
    try {
      clientCache[cleanPhone] = createClient<any>(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseAnonKey || 'placeholder',
        createClientOptions({ 'x-customer-phone': cleanPhone }),
      );
    } catch (e) {
      console.warn('Failed to create customer Supabase client, using fallback', e);
      clientCache[cleanPhone] = supabase;
    }
  }
  return clientCache[cleanPhone];
};

export type SupabaseClient = typeof supabase;
