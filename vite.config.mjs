import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      // IGDB no longer needs a dev proxy — those calls now go through the
      // main process to our Supabase Edge Function (see src/api/igdb.js).
      '/steam': {
        target: 'https://api.steampowered.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/steam/, ''),
      },
    },
  },
});