import { resolveSupabaseAnonKey, resolveSupabaseUrl } from '../utils/supabaseProxy';

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (request.method !== 'POST') return json({ success: false, message: 'Method not allowed' }, 405);

    try {
      const anonKey = resolveSupabaseAnonKey(process.env);
      const supabaseUrl = resolveSupabaseUrl(process.env);
      const upstream = await fetch(`${supabaseUrl}/functions/v1/submit-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify(await request.json().catch(() => ({}))),
      });

      const body = await upstream.json().catch(() => ({
        success: false,
        message: 'تعذر قراءة رد نظام الطلبات',
      }));

      return json(body, upstream.status);
    } catch (error) {
      console.error('orders proxy error:', error);
      return json(
        {
          success: false,
          message: 'تعذر الاتصال بنظام الطلبات. جرّب مرة أخرى أو أرسل الطلب عبر واتساب.',
        },
        502,
      );
    }
  },
};
