import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('src/renderer'),
    publicDir: resolve('src/renderer/public'),
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    }
  }
})
