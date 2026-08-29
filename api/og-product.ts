/**
 * Dynamic Open Graph & Twitter Card Edge Handler for Jouda Products
 * Serves rich HTML preview tags to WhatsApp, Telegram, Twitter, and social crawlers.
 */

export const config = {
  runtime: 'edge',
};

function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DEFAULT_IMAGE = 'https://i.postimg.cc/qvKhrVZS/pwa-512-511-png.png';
const DEFAULT_TITLE = 'Jouda World - عالم جوده';
const DEFAULT_DESC = 'وجهتك الأولى للمنتجات العضوية والخالية من الجلوتين. تسوق، تصفح الوصفات، واطلب مخبوزاتك الطازجة يومياً.';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || url.searchParams.get('product') || '';
  const host = request.headers.get('host') || 'www.joudafood.com';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const canonicalUrl = `${proto}://${host}/products${id ? `?id=${encodeURIComponent(id)}` : ''}`;

  let productName = DEFAULT_TITLE;
  let productDescription = DEFAULT_DESC;
  let productImage = DEFAULT_IMAGE;

  if (id) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://unsqyovqzsgmxacrqunh.supabase.co';
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.API_KEY || '';

      const queryUrl = `${supabaseUrl}/rest/v1/products?or=(id.eq.${encodeURIComponent(id)},barcode.eq.${encodeURIComponent(id)})&select=id,barcode,name,price,image,image_url,description,category&limit=1`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (supabaseKey) {
        headers['apikey'] = supabaseKey;
        headers['Authorization'] = `Bearer ${supabaseKey}`;
      }

      const res = await fetch(queryUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const prod = data[0];
          if (prod.name) {
            productName = `${prod.name} | متجر جودة`;
          }
          const price = prod.price ? `السعر: ${prod.price} ر.س` : '';
          const badge = 'خالٍ من الجلوتين 100% 🌾';
          const cleanDesc = (prod.description || '')
            .replace(/^ *\|.*\| *$/gm, '')
            .replace(/[#*`~_\[\]]/g, '')
            .slice(0, 140)
            .trim();

          productDescription = [price, badge, cleanDesc].filter(Boolean).join(' • ');

          const rawImg = prod.image_url || prod.image;
          if (rawImg) {
            if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
              productImage = rawImg;
            } else if (rawImg.startsWith('/')) {
              productImage = `${proto}://${host}${rawImg}`;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch product for OG preview:', e);
    }
  }

  const safeTitle = escapeHtml(productName);
  const safeDesc = escapeHtml(productDescription);
  const safeImg = escapeHtml(productImage);
  const safeUrl = escapeHtml(canonicalUrl);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:site_name" content="Jouda - متجر جودة">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImg}">
  <meta property="og:image:secure_url" content="${safeImg}">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:url" content="${safeUrl}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImg}">

  <!-- Fast client-side redirect for human browsers -->
  <meta http-equiv="refresh" content="0;url=${safeUrl}">
  <script>
    if (typeof window !== 'undefined') {
      window.location.replace('${safeUrl}');
    }
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px 20px; background: #faf7f4; color: #333;">
  <div style="max-width: 400px; margin: 0 auto; background: white; padding: 28px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
    <img src="${safeImg}" alt="${safeTitle}" style="width: 140px; height: 140px; object-fit: contain; border-radius: 16px; margin-bottom: 16px;">
    <h2 style="font-size: 18px; font-weight: 800; margin: 0 0 8px 0; color: #111;">${safeTitle}</h2>
    <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">${safeDesc}</p>
    <a href="${safeUrl}" style="display: inline-block; background: #D32F2F; color: white; text-decoration: none; padding: 12px 24px; border-radius: 14px; font-weight: bold; font-size: 14px;">فتح المنتج في المتجر</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
    },
  });
}
