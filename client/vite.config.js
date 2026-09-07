import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Three separate frontends (multi-page build) sharing one component library
// and one API/database. Served at /attendance/, /fees/, /finance/.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        attendance: resolve(__dirname, 'attendance/index.html'),
        fees: resolve(__dirname, 'fees/index.html'),
        finance: resolve(__dirname, 'finance/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
});
