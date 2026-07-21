import { resolveSupabaseUrl } from '../utils/supabaseProxy';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (request.method !== 'GET') return json({ success: false, message: 'Method not allowed' }, 405);

    try {
      const sourceUrl = new URL(request.url).searchParams.get('url');
      if (!sourceUrl) return json({ success: false, message: 'Missing image url' }, 400);

      const source = new URL(sourceUrl);
      const allowedHost = new URL(resolveSupabaseUrl(process.env)).host;
      if (source.host !== allowedHost || !source.pathname.startsWith('/storage/v1/object/public/')) {
        return json({ success: false, message: 'Unsupported media source' }, 403);
      }

      const upstream = await fetch(source.toString());
      if (!upstream.ok || !upstream.body) {
        return json({ success: false, message: 'Failed to load media' }, upstream.status || 502);
      }

      const headers = new Headers();
      const contentType = upstream.headers.get('content-type');
      if (contentType) headers.set('Content-Type', contentType);
      headers.set('Cache-Control', upstream.headers.get('cache-control') || 'public, max-age=86400');
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    } catch (error) {
      console.error('media proxy error:', error);
      return json({ success: false, message: 'تعذر تحميل الصورة حالياً.' }, 502);
    }
  },
};
