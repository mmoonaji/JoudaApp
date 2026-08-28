import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'output', 'playwright', 'figma-screens');
fs.mkdirSync(outDir, { recursive: true });

const envPath = path.join(root, '.env.local');
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const appUrl = 'http://localhost:5173';
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const projectRef = (() => {
  try {
    return new URL(supabaseUrl).host.split('.')[0];
  } catch {
    return null;
  }
})();

const mobileRoutes = [
  ['mobile-01-home', '/'],
  ['mobile-02-products', '/products'],
  ['mobile-03-recipes', '/recipes'],
  ['mobile-04-articles', '/articles'],
  ['mobile-05-orders', '/orders'],
  ['mobile-06-about', '/about'],
  ['mobile-07-health', '/health'],
  ['mobile-08-admin-login', '/admin/login'],
];

const adminRoutes = [
  ['desktop-admin-01-overview', '/admin/overview'],
  ['desktop-admin-02-products', '/admin/products'],
  ['desktop-admin-03-packages', '/admin/packages'],
  ['desktop-admin-04-banners', '/admin/banners'],
  ['desktop-admin-05-recipes', '/admin/recipes'],
  ['desktop-admin-06-articles', '/admin/articles'],
  ['desktop-admin-07-faq', '/admin/faq'],
  ['desktop-admin-08-settings', '/admin/settings'],
];

const overlays = [
  {
    name: 'mobile-09-home-scanner',
    route: '/',
    action: async (page) => {
      const candidates = [
        page.getByText(/افحص|ابدأ الفحص|فحص/i).first(),
        page.locator('button').filter({ hasText: /افحص|فحص/i }).first(),
      ];
      for (const locator of candidates) {
        try {
          if ((await locator.count()) > 0) {
            await locator.click({ timeout: 2000 });
            await page.waitForTimeout(1200);
            return 'opened';
          }
        } catch {}
      }
      return 'not-opened';
    },
  },
  {
    name: 'mobile-10-products-filter',
    route: '/products',
    action: async (page) => {
      const candidates = [
        page.getByText(/فلتر|تصفية|الفلاتر/i).first(),
        page.locator('button').filter({ hasText: /فلتر|تصفية|الفلاتر/i }).first(),
      ];
      for (const locator of candidates) {
        try {
          if ((await locator.count()) > 0) {
            await locator.click({ timeout: 2000 });
            await page.waitForTimeout(1000);
            return 'opened';
          }
        } catch {}
      }
      return 'not-opened';
    },
  },
];

async function preparePage(page, fakeAdmin = false) {
  await page.addInitScript(({ fakeAdmin, projectRef }) => {
    localStorage.setItem('jouda_onboarding_seen_v1', 'true');
    localStorage.setItem('darkMode', 'false');
    if (fakeAdmin && projectRef) {
      const authKey = `sb-${projectRef}-auth-token`;
      localStorage.setItem(authKey, JSON.stringify({
        access_token: 'figma-preview-token',
        refresh_token: 'figma-preview-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        expires_in: 86400,
        token_type: 'bearer',
        user: {
          id: '00000000-0000-0000-0000-000000000000',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'figma-preview@example.com',
        },
      }));
    }
  }, { fakeAdmin, projectRef });
}

async function capture(page, label, route, viewport, fakeAdmin = false, action) {
  await page.setViewportSize(viewport);
  await preparePage(page, fakeAdmin);
  const url = `${appUrl}${route}`;
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 180));
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(2500);
  let actionStatus = 'none';
  if (action) actionStatus = await action(page);
  const file = path.join(outDir, `${label}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 76, fullPage: false });
  return {
    label,
    route,
    file,
    viewport,
    actionStatus,
    title: await page.title().catch(() => ''),
    url: page.url(),
    errors: [...new Set(errors)].slice(0, 5),
  };
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const [label, route] of mobileRoutes) {
  const page = await browser.newPage();
  results.push(await capture(page, label, route, { width: 390, height: 844 }));
  await page.close();
}

for (const item of overlays) {
  const page = await browser.newPage();
  results.push(await capture(page, item.name, item.route, { width: 390, height: 844 }, false, item.action));
  await page.close();
}

for (const [label, route] of adminRoutes) {
  const page = await browser.newPage();
  results.push(await capture(page, label, route, { width: 1440, height: 900 }, true));
  await page.close();
}

await browser.close();

const manifest = path.join(outDir, 'manifest.json');
fs.writeFileSync(manifest, JSON.stringify(results, null, 2));
console.log(manifest);
