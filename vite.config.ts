import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
      tailwindcss(),
    react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7220',
        changeOrigin: true,
        secure: false, // allow self-signed certs in dev
      },
    },
  },
})
