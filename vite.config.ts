import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const pbUrl = env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8092';
    const pbHost = pbUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    return {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-pocketbase': ['pocketbase'],
              'vendor-utils': ['date-fns', 'xlsx', 'jszip', 'file-saver', 'zod'],
            },
          },
        },
        chunkSizeWarningLimit: 600,
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: pbUrl.replace(/^http/, 'http'),
            changeOrigin: true,
            rewrite: (path) => path,
          },
          '/_': {
            target: pbUrl,
            changeOrigin: true,
            rewrite: (path) => path,
          },
        },
      },
      preview: {
        port: 3000,
        host: true,
        strictPort: true,
        allowedHosts: ['test.barestack.org', 'app.barestack.org'],
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.pocketbase.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ${pbUrl} https://cdn.pocketbase.io wss://${pbHost}; img-src 'self' data: https:; media-src 'self' data: blob:; frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'none';`,
        },
      },
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
  });
