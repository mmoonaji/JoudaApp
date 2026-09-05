
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  return {
    server: {
      host: true,
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app-[hash].js',
          manualChunks: {
            'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'map-vendor':      ['leaflet', 'react-leaflet'],
            'ui-vendor':       ['lucide-react'],
          }
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          id: '/',
          name: 'Jouda World | عالم جوده',
          short_name: 'Jouda',
          description: 'منصتك المتكاملة لحياة خالية من الجلوتين. تسوق، اطبخ، واستمتع.',
          theme_color: '#D32F2F',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: 'index.html',
          globPatterns: [
            'index.html',
            'apple-touch-icon.png',
            'assets/app-*.js',
            'assets/index-*.css',
            'assets/react-vendor-*.js',
            'assets/ui-vendor-*.js',
            'assets/supabase-vendor-*.js',
            'assets/HomePage-*.js',
            'assets/HomePackagesCarousel-*.js',
            'assets/AppImage-*.js',
            'assets/KnowledgeHub-*.js',
            'assets/imageCompression-*.js',
            'assets/index-*.js',
            'assets/stockUtils-*.js',
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/(?:object|render\/image)\/public\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-public-images',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.bunny\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'bunny-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'google-sheets-data',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 // 1 Day
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
  }
})
