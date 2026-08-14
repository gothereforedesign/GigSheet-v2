import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        devOptions: {
          enabled: false,
        },
        includeAssets: [
          'favicon.svg',
          'favicon.ico',
          'apple-touch-icon.png',
          'pdf.worker.min.mjs',
          'pwa-64x64.png',
          'pwa-96x96.png',
          'pwa-128x128.png',
          'pwa-192x192.png',
          'pwa-256x256.png',
          'pwa-384x384.png',
          'pwa-512x512.png',
          'pwa-maskable-192x192.png',
          'pwa-maskable-384x384.png',
          'pwa-maskable-512x512.png',
          'icon-64.png',
          'icon-96.png',
          'icon-128.png',
          'icon-192.png',
          'icon-256.png',
          'icon-384.png',
          'icon-512.png'
        ],
        manifest: {
          id: '/',
          name: 'GigSheet - Sheet Music & Setlists',
          short_name: 'GigSheet',
          description: 'Offline sheet music directory, chart viewer, and setlist manager.',
          theme_color: '#0c4a6e',
          background_color: '#0c4a6e',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-96x96.png',
              sizes: '96x96',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-128x128.png',
              sizes: '128x128',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-256x256.png',
              sizes: '256x256',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-384x384.png',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,mjs}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-jsdelivr-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /.*\.pdf$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pdf-documents-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
