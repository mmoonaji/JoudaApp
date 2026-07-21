import {
  configuredSupabaseKeys,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
  rewriteSupabaseStorageUrls,
} from '../utils/supabaseProxy';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

const isJsonResponse = (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json');
};

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

    try {
      const requestUrl = new URL(request.url);
      const target = requestUrl.searchParams.get('url');
      if (!target) return json({ success: false, message: 'Missing Supabase URL' }, 400);

      const targetUrl = new URL(target);
      const supabaseUrl = resolveSupabaseUrl(process.env);
      if (targetUrl.host !== new URL(supabaseUrl).host || targetUrl.protocol !== 'https:') {
        return json({ success: false, message: 'Unsupported Supabase host' }, 403);
      }

      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.delete('connection');
      headers.delete('content-length');
      const anonKey = resolveSupabaseAnonKey(process.env);
      headers.set('apikey', anonKey);

      const currentBearer = headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!currentBearer || configuredSupabaseKeys(process.env).includes(currentBearer)) {
        headers.set('authorization', `Bearer ${anonKey}`);
      }

      const upstream = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
        redirect: 'manual',
      });

      if (targetUrl.pathname.startsWith('/rest/v1/') && isJsonResponse(upstream)) {
        return json(rewriteSupabaseStorageUrls(await upstream.json()), upstream.status);
      }

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
