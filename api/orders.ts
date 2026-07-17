type EnvLike = Record<string, string | undefined>;

const readEnv = (env: EnvLike, ...keys: string[]) => {
  for (const key of keys) {
    const value = env[key] || env[`VITE_${key}`];
    if (value) return value;
  }
  return undefined;
};

const supabaseUrl = (env: EnvLike) => {
  const value = readEnv(env, 'SUPABASE_URL')?.replace(/\/$/, '');
  if (!value) throw new Error('Missing SUPABASE_URL');
  return value;
};

const supabaseAnonKey = (env: EnvLike) => {
  const value = readEnv(env, 'SUPABASE_ANON_KEY', 'SUPABASE_ANON', 'API_KEY');
  if (!value) throw new Error('Missing SUPABASE_ANON_KEY');
  return value;
};

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
      const anonKey = supabaseAnonKey(process.env);
      const upstream = await fetch(`${supabaseUrl(process.env)}/functions/v1/submit-order`, {
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
