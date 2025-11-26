import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'renderer'),
  plugins: [react()],
  // Use relative paths for Electron file:// protocol
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});
