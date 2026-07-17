import { createClient } from '@supabase/supabase-js';

type EnvLike = Record<string, string | undefined>;

const STORAGE_PUBLIC_PATTERN = /^https:\/\/([^.]+)\.supabase\.co\/storage\/v1\/object\/public\/(.+)$/;

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

const rewriteStorageUrl = (url?: string | null) => {
  if (!url) return url ?? '';
  if (url.startsWith('/api/media?url=')) return url;
  if (!STORAGE_PUBLIC_PATTERN.test(url)) return url;
  return `/api/media?url=${encodeURIComponent(url)}`;
};

const normalizeImage = (row: Record<string, unknown>) => ({
  ...row,
  image_url: rewriteStorageUrl(typeof row.image_url === 'string' ? row.image_url : null),
  image: rewriteStorageUrl(typeof row.image === 'string' ? row.image : null),
});

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

async function loadSection(section: string, env: EnvLike) {
  const supabase = createClient(supabaseUrl(env), supabaseAnonKey(env), {
    auth: { persistSession: false },
  });

  switch (section) {
    case 'settings': {
      const { data, error } = await supabase
        .from('app_settings_public')
        .select('maintenance_mode, maintenance_message, store_latitude, store_longitude, delivery_price_per_km')
        .eq('id', 1)
        .single();
      if (error) throw error;
      return { settings: data || null };
    }
    case 'products': {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (productsError) throw productsError;

      const { data: packageItems, error: packageError } = await supabase
        .from('package_items')
        .select('*');
      if (packageError) throw packageError;

      return {
        products: (products || []).map((row) => normalizeImage(row)),
        package_items: packageItems || [],
      };
    }
    case 'recipes': {
      const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { recipes: (data || []).map((row) => normalizeImage(row)) };
    }
    case 'articles': {
      const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { articles: (data || []).map((row) => normalizeImage(row)) };
    }
    case 'faq': {
      const { data, error } = await supabase.from('faq').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return { faq: data || [] };
    }
    case 'banners': {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return { banners: (data || []).map((row) => normalizeImage(row)) };
    }
    default:
      return { error: `Unsupported catalog section: ${section}` };
  }
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (request.method !== 'GET') return json({ success: false, message: 'Method not allowed' }, 405);

    try {
      const section = new URL(request.url).searchParams.get('section') || 'products';
      return json(await loadSection(section, process.env));
    } catch (error) {
      console.error('catalog proxy error:', error);
      return json({ success: false, message: 'تعذر تحميل بيانات العرض حالياً.' }, 502);
    }
  },
};
