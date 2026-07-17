import { createClient } from '@supabase/supabase-js';

// Vite env types
const env = (import.meta as any).env;
const supabaseUrl = env?.VITE_SUPABASE_URL as string;
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
}

const resolveSupabaseProxyUrl = (input: RequestInfo | URL): string | null => {
  if (!supabaseUrl) return null;

  const requestUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (!requestUrl.startsWith(supabaseUrl)) return null;
  return `/api/supabase?url=${encodeURIComponent(requestUrl)}`;
};

const supabaseProxyFetch: typeof fetch = (input, init) => {
  const proxyUrl = resolveSupabaseProxyUrl(input);
  if (!proxyUrl) return fetch(input, init);

  if (input instanceof Request) {
    return fetch(proxyUrl, {
      method: input.method,
      headers: input.headers,
      body: input.method === 'GET' || input.method === 'HEAD' ? undefined : input.body,
      signal: input.signal,
      ...init,
    });
  }

  return fetch(proxyUrl, init);
};

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
