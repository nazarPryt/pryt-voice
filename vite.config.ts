import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
   plugins: [react()],
   resolve: {
      alias: { '@': resolve(__dirname, 'src') },
   },
   clearScreen: false,
   server: { port: 1420, strictPort: true },
   envPrefix: ['VITE_', 'TAURI_'],
   build: {
      target: 'chrome105',
      outDir: 'dist',
      rollupOptions: {
         input: {
            main: resolve(__dirname, 'index.html'),
            widget: resolve(__dirname, 'widget.html'),
         },
      },
   },
})
