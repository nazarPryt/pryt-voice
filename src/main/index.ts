import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { transcribe } from './whisper'
import { checkWhisperReady } from './model-manager'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 400,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    titleBarStyle: 'hiddenInset',
    title: 'Pryt Voice'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers
ipcMain.handle('whisper:transcribe', async (_event, audioData: number[]) => {
  const samples = new Float32Array(audioData)
  return await transcribe(samples)
})

ipcMain.handle('whisper:check', () => {
  return checkWhisperReady()
})

app.whenReady().then(() => {
  // Auto-grant microphone permission
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
