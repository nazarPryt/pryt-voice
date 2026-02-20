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
    title: 'Pryt Voice',
    backgroundColor: '#1a1a2e',
    show: false
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

ipcMain.handle('whisper:check', async () => {
  try {
    return checkWhisperReady()
  } catch (err) {
    console.error('whisper:check failed:', err)
    throw err
  }
})

app.whenReady().then(() => {
  // Grant microphone permission only to the app's own renderer pages
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL()
    const isAppPage = url.startsWith('file://') || url.startsWith(process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost')
    if (permission === 'media' && isAppPage) {
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
