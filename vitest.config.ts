import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
   plugins: [react()],
   resolve: {
      alias: { '@': resolve(__dirname, 'src') },
   },
   // Pre-bundle these deps so Vite doesn't discover and optimize them mid-run.
   // Without this, the first full test suite run triggers a Vite reload when a
   // new dependency is encountered, which causes duplicate React instances and
   // random test failures (e.g. "Invalid hook call" from @radix-ui/react-tabs).
   optimizeDeps: {
      include: [
         'clsx',
         'date-fns',
         'lucide-react',
         'zustand',
         'vitest-browser-react',
         '@radix-ui/react-tabs',
         '@tauri-apps/api/core',
         '@tauri-apps/api/event',
         '@tauri-apps/plugin-clipboard-manager',
      ],
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
