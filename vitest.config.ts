import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
   plugins: [react()],
   resolve: {
      alias: { '@': resolve(__dirname, 'src') },
   },
   test: {
      exclude: ['whisper/**', 'node_modules/**'],
      browser: {
         enabled: true,
         provider: playwright(),
         instances: [{ browser: 'chromium' }],
      },
   },
})
