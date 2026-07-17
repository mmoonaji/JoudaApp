type EnvLike = Record<string, string | undefined>;

const readEnv = (env: EnvLike, ...keys: string[]) => {
  for (const key of keys) {
    const value = env[key] || env[`VITE_${key}`];
    if (value) return value;
  }
  return undefined;
};

const resolveSupabaseUrl = (env: EnvLike) => {
  const value = readEnv(env, 'SUPABASE_URL')?.replace(/\/$/, '');
  if (!value) throw new Error('Missing SUPABASE_URL');
  return value;
};

const resolveSupabaseAnonKey = (env: EnvLike) => {
  const value = readEnv(env, 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'API_KEY');
  if (!value) throw new Error('Missing SUPABASE_ANON_KEY');
  return value;
};

const configuredSupabaseKeys = (env: EnvLike) =>
  [
    env.SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_ANON,
    env.API_KEY,
  ].filter(Boolean);

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const rewriteStorageUrl = (value: string) => {
  const supabaseUrl = resolveSupabaseUrl(process.env);
  if (!value.startsWith(`${supabaseUrl}/storage/v1/object/public/`)) return value;
  return `/api/media?url=${encodeURIComponent(value)}`;
};

const rewriteStorageUrls = (value: unknown): unknown => {
  if (typeof value === 'string') return rewriteStorageUrl(value);
  if (Array.isArray(value)) return value.map((item) => rewriteStorageUrls(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, rewriteStorageUrls(item)]),
  );
};

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

    try {
      const requestUrl = new URL(request.url);
      const target = requestUrl.searchParams.get('url');
      if (!target) return json({ success: false, message: 'Missing Supabase URL' }, 400);

      const targetUrl = new URL(target);
      const allowedHost = new URL(resolveSupabaseUrl(process.env)).host;
      if (targetUrl.host !== allowedHost || targetUrl.protocol !== 'https:') {
        return json({ success: false, message: 'Unsupported Supabase host' }, 403);
      }

      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.delete('connection');
      headers.delete('content-length');

      const anonKey = resolveSupabaseAnonKey(process.env);
      headers.set('apikey', anonKey);

      const incomingAuthorization = headers.get('authorization') || '';
      const incomingBearer = incomingAuthorization.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!incomingBearer || configuredSupabaseKeys(process.env).includes(incomingBearer)) {
        headers.set('authorization', `Bearer ${anonKey}`);
      }

      const body =
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : await request.arrayBuffer();

      const upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body,
        redirect: 'manual',
      });

      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.delete('content-encoding');
      responseHeaders.delete('content-length');
      responseHeaders.delete('transfer-encoding');
      responseHeaders.set('Cache-Control', 'no-store');

      const contentType = upstream.headers.get('content-type') || '';
      if (targetUrl.pathname.startsWith('/rest/v1/') && contentType.includes('application/json')) {
        const data = await upstream.json();
        return json(rewriteStorageUrls(data), upstream.status);
      }

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('supabase proxy error:', error);
      return json({ success: false, message: 'تعذر الاتصال بخدمة Supabase عبر الخادم.' }, 502);
    }
  },
};
