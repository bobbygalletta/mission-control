import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        agent: './agent.html',
      },
    },
  },
  server: {
    hmr: { overlay: false },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/tools': {
        target: 'http://localhost:18789',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Authorization', 'Bearer 286caba2a7d072f065abdec6f5cff840c2c31eb8f7801111');
          });
        },
      },
    },
  },
})