/**
 * Dynamic Open Graph & Twitter Card Edge Handler for Jouda Articles
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

const DEFAULT_IMAGE = 'https://www.joudafood.com/pwa-512x512.png';
const DEFAULT_TITLE = 'مدونة جودة - عالم التغذية الصحية الخالية من الجلوتين';
const DEFAULT_DESC = 'اكتشف أحدث المقالات والنصائح التغذوية والوصفات الصحية الخالية من الجلوتين من خبراء متجر جودة.';

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || url.pathname.split('/').filter(Boolean).pop() || '';
  const host = request.headers.get('host') || 'www.joudafood.com';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const canonicalUrl = `${proto}://${host}/articles/${encodeURIComponent(id)}`;

  let articleTitle = DEFAULT_TITLE;
  let articleDescription = DEFAULT_DESC;
  let articleImage = DEFAULT_IMAGE;
  let isFound = false;
  let apiStatus = 0;

  if (id && id !== 'articles') {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://unsqyovqzsgmxacrqunh.supabase.co';
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON || process.env.API_KEY || '';

      const queryUrl = `${supabaseUrl}/rest/v1/articles?id=eq.${encodeURIComponent(id)}&select=id,title,content,image_url,author&limit=1`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (supabaseKey) {
        headers['apikey'] = supabaseKey;
        headers['Authorization'] = `Bearer ${supabaseKey}`;
      }

      const res = await fetch(queryUrl, { headers });
      apiStatus = res.status;

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const article = data[0];
          isFound = true;
          if (article.title) {
            articleTitle = `${article.title} | مدونة جودة`;
          }
          const authorBadge = article.author ? `بقلم: ${article.author}` : 'مدونة جودة 🌾';
          const cleanDesc = (article.content || '')
            .replace(/^ *\|.*\| *$/gm, '')
            .replace(/[#*`~_\[\]]/g, '')
            .slice(0, 160)
            .trim();

          articleDescription = [authorBadge, cleanDesc].filter(Boolean).join(' • ');

          const rawImg = article.image_url;
          if (rawImg) {
            if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
              articleImage = rawImg;
            } else if (rawImg.startsWith('/')) {
              articleImage = `${proto}://${host}${rawImg}`;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch article for OG preview:', e);
    }
  }

  const safeTitle = escapeHtml(articleTitle);
  const safeDesc = escapeHtml(articleDescription);
  const safeImg = escapeHtml(articleImage);
  const safeUrl = escapeHtml(canonicalUrl);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:site_name" content="مدونة جودة">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImg}">
  <meta property="og:image:secure_url" content="${safeImg}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
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
    <img src="${safeImg}" alt="${safeTitle}" style="width: 140px; height: 140px; object-fit: cover; border-radius: 16px; margin-bottom: 16px;">
    <h2 style="font-size: 18px; font-weight: 800; margin: 0 0 8px 0; color: #111;">${safeTitle}</h2>
    <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">${safeDesc}</p>
    <a href="${safeUrl}" style="display: inline-block; background: #D32F2F; color: white; text-decoration: none; padding: 12px 24px; border-radius: 14px; font-weight: bold; font-size: 14px;">قراءة المقال</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
      'x-og-found': String(isFound),
      'x-og-status': String(apiStatus),
    },
  });
}
