import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    // In local dev, run `vercel dev` (not `npm run dev:vite`) so that the Vercel
    // CLI serves both the frontend and the /api serverless functions on a single
    // port. The proxy below is only used when running the Vite dev server directly
    // without Vercel CLI; in that case start the api functions on port 3001 and set
    // VITE_API_PORT=3001 to avoid a circular request loop.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT ?? 3001}`,
        changeOrigin: true,
      },
    },
  },
});
