import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { rewriteSupabaseStorageUrl } from '../utils/mediaProxy';

type EnvLike = Record<string, string | undefined>;

function readEnv(env: EnvLike, ...keys: string[]) {
  for (const key of keys) {
    const value = env[key] || env[`VITE_${key}`];
    if (value) return value;
  }
  return undefined;
}

function resolveSupabaseUrl(env: EnvLike) {
  const url = readEnv(env, 'SUPABASE_URL')?.replace(/\/$/, '');
  if (!url) throw new Error('Missing SUPABASE_URL');
  return url;
}

function resolveSupabaseAnonKey(env: EnvLike) {
  const anonKey = readEnv(env, 'SUPABASE_ANON_KEY', 'SUPABASE_ANON', 'API_KEY');
  if (!anonKey) throw new Error('Missing SUPABASE_ANON_KEY');
  return anonKey;
}

function resolveSupabaseClient(env: EnvLike): SupabaseClient {
  return createClient(resolveSupabaseUrl(env), resolveSupabaseAnonKey(env), {
    auth: { persistSession: false },
  });
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(payload);
}

function sendEmpty(res: ServerResponse, statusCode: number) {
  res.statusCode = statusCode;
  res.end();
}

function readRequestBody(req: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8').trim();
      if (!rawBody) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function normalizeImageField(row: Record<string, unknown>) {
  const imageUrl = typeof row.image_url === 'string' ? row.image_url : null;
  const legacyImage = typeof row.image === 'string' ? row.image : null;
  return {
    ...row,
    image_url: rewriteSupabaseStorageUrl(imageUrl),
    image: rewriteSupabaseStorageUrl(legacyImage),
  };
}

function mapProductRows(env: EnvLike, products: Record<string, unknown>[], packageItems: Record<string, unknown>[]) {
  return products.map((row) => normalizeImageField(row));
}

function mapRecipeRows(env: EnvLike, recipes: Record<string, unknown>[]) {
  return recipes.map((row) => normalizeImageField(row));
}

function mapArticleRows(env: EnvLike, articles: Record<string, unknown>[]) {
  return articles.map((row) => normalizeImageField(row));
}

function mapBannerRows(env: EnvLike, banners: Record<string, unknown>[]) {
  return banners.map((row) => normalizeImageField(row));
}

async function loadSectionData(env: EnvLike, section: string) {
  const supabase = resolveSupabaseClient(env);

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
        products: mapProductRows(env, products || [], packageItems || []),
        package_items: packageItems || [],
      };
    }
    case 'recipes': {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { recipes: mapRecipeRows(env, data || []) };
    }
    case 'articles': {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { articles: mapArticleRows(env, data || []) };
    }
    case 'faq': {
      const { data, error } = await supabase
        .from('faq')
        .select('*')
        .order('sort_order', { ascending: true });
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
      return { banners: mapBannerRows(env, data || []) };
    }
    default:
      throw new Error(`Unsupported catalog section: ${section}`);
  }
}

export async function handleCatalogRequest(req: IncomingMessage, res: ServerResponse, env: EnvLike) {
  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204);
    return;
  }

  if (req.method !== 'GET') {
    writeJson(res, 405, { success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const requestUrl = new URL(req.url || '/api/catalog', 'http://localhost');
    const section = requestUrl.searchParams.get('section') || 'products';
    const body = await loadSectionData(env, section);
    writeJson(res, 200, body);
  } catch (error) {
    console.error('catalog proxy error:', error);
    writeJson(res, 502, {
      success: false,
      message: 'تعذر تحميل بيانات العرض حالياً.',
    });
  }
}

export async function handleMediaRequest(req: IncomingMessage, res: ServerResponse, env: EnvLike) {
  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204);
    return;
  }

  if (req.method !== 'GET') {
    writeJson(res, 405, { success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const requestUrl = new URL(req.url || '/api/media', 'http://localhost');
    const sourceUrl = requestUrl.searchParams.get('url');
    if (!sourceUrl) {
      writeJson(res, 400, { success: false, message: 'Missing image url' });
      return;
    }

    const resolvedSource = new URL(sourceUrl);
    const supabaseHost = new URL(resolveSupabaseUrl(env)).host;
    if (resolvedSource.host !== supabaseHost || !resolvedSource.pathname.startsWith('/storage/v1/object/public/')) {
      writeJson(res, 403, { success: false, message: 'Unsupported media source' });
      return;
    }

    const upstream = await fetch(resolvedSource.toString());
    if (!upstream.ok || !upstream.body) {
      writeJson(res, upstream.status || 502, {
        success: false,
        message: 'Failed to load media',
      });
      return;
    }

    res.statusCode = upstream.status;
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=86400';
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await upstream.arrayBuffer();
    res.end(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('media proxy error:', error);
    writeJson(res, 502, {
      success: false,
      message: 'تعذر تحميل الصورة حالياً.',
    });
  }
}

export async function handleOrdersRequest(req: IncomingMessage, res: ServerResponse, env: EnvLike) {
  if (req.method === 'OPTIONS') {
    sendEmpty(res, 204);
    return;
  }

  if (req.method !== 'POST') {
    writeJson(res, 405, { success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const body = await readRequestBody(req);
    const submitOrderUrl = `${resolveSupabaseUrl(env)}/functions/v1/submit-order`;
    const anonKey = resolveSupabaseAnonKey(env);
    const upstream = await fetch(submitOrderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(body),
    });

    const upstreamBody = await upstream.json().catch(() => ({
      success: false,
      message: 'تعذر قراءة رد نظام الطلبات',
    }));

    writeJson(res, upstream.status, upstreamBody);
  } catch (error) {
    console.error('orders proxy error:', error);
    writeJson(res, 502, {
      success: false,
      message: 'تعذر الاتصال بنظام الطلبات. جرّب مرة أخرى أو أرسل الطلب عبر واتساب.',
    });
  }
}

export function rewritePublicMediaUrl(env: EnvLike, url?: string | null) {
  return rewriteSupabaseStorageUrl(url);
}
