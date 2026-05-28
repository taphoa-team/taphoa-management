import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/agent': {
        target: 'http://localhost:2024',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/agent/, ''),
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
