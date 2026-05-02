import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    headers: {
      // 팝업이 부모 창과 통신할 수 있도록 허용
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    }
  }
})