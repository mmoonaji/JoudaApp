export type EnvLike = Record<string, string | undefined>;

export const SUPABASE_STORAGE_PUBLIC_PATTERN =
  /^https:\/\/([^.]+)\.supabase\.co\/storage\/v1\/object\/public\/(.+)$/;

export function readEnv(env: EnvLike, ...keys: string[]) {
  for (const key of keys) {
    const value = env[key] || env[`VITE_${key}`];
    if (value) return value;
  }
  return undefined;
}

export function resolveSupabaseUrl(env: EnvLike) {
  const value = readEnv(env, 'SUPABASE_URL')?.replace(/\/$/, '');
  if (!value) throw new Error('Missing SUPABASE_URL');
  return value;
}

export function resolveSupabaseAnonKey(env: EnvLike) {
  const value = readEnv(env, 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'API_KEY');
  if (!value) throw new Error('Missing SUPABASE_ANON_KEY');
  return value;
}

export function configuredSupabaseKeys(env: EnvLike) {
  return [env.SUPABASE_ANON_KEY, env.VITE_SUPABASE_ANON_KEY, env.VITE_SUPABASE_ANON, env.API_KEY].filter(Boolean);
}

export function rewriteSupabaseStorageUrl(url?: string | null): string {
  if (!url) return url ?? '';
  if (url.startsWith('/api/media?url=')) return url;

  try {
    const parsedUrl = new URL(url);
    if (!SUPABASE_STORAGE_PUBLIC_PATTERN.test(parsedUrl.toString())) return url;
    return `/api/media?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

export function rewriteSupabaseStorageUrls(value: unknown): unknown {
  if (typeof value === 'string') return rewriteSupabaseStorageUrl(value);
  if (Array.isArray(value)) return value.map((item) => rewriteSupabaseStorageUrls(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, rewriteSupabaseStorageUrls(item)]),
  );
}

export function buildSupabaseProxyUrl(baseUrl: string | null | undefined, input: RequestInfo | URL): string | null {
  if (!baseUrl) return null;

  const requestUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (!requestUrl.startsWith(baseUrl)) return null;
  return `/api/supabase?url=${encodeURIComponent(requestUrl)}`;
}

export function createSupabaseProxyFetch(baseUrl: string | null | undefined): typeof fetch {
  return (input, init) => {
    const proxyUrl = buildSupabaseProxyUrl(baseUrl, input);
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
}
