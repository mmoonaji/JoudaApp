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

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const proxiedBodyAllowed = (method: string) => method !== 'GET' && method !== 'HEAD';

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

      const upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body: proxiedBodyAllowed(request.method) ? request.body : undefined,
        redirect: 'manual',
      });

      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.delete('content-encoding');
      responseHeaders.delete('content-length');
      responseHeaders.delete('transfer-encoding');
      responseHeaders.set('Cache-Control', 'no-store');

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
