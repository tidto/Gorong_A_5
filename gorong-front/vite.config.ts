import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'framer-motion': path.resolve(__dirname, 'src/shims/framer-motion.tsx'),
    },
  },
  server: {
    host: 'localhost',
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        // localhost → ::1(IPv6) 로 붙으면 Java(8080) 연결 거부될 수 있음
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      }
    }
  },
  // 📌 이 부분을 추가하세요!
  define: {
    global: 'window',
  },
})
