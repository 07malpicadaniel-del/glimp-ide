import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { iniciarBoveda } from './security'

// Importamos nuestros módulos de Glimp
import { iniciarDemonioObservador } from './watcher'
import { iniciarTerminal } from './terminal'
import { iniciarAgentesIA } from './aiController' // <-- NUEVO: Controlador de IA

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
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

  // --- INICIO CÓDIGO GLIMP: Terminal ---
  mainWindow.webContents.on('did-finish-load', () => {
    iniciarTerminal(mainWindow.webContents);
  });
  // --- FIN CÓDIGO GLIMP ---
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // --- INICIO CÓDIGO GLIMP: Lector de Directorios y Archivos ---
  ipcMain.handle('read-dir', async (_, dirPath) => {
    try {
      const dirents = fs.readdirSync(dirPath, { withFileTypes: true })
      return dirents.map(dirent => ({
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
        path: join(dirPath, dirent.name)
      })).sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
        return a.isDirectory ? -1 : 1 
      })
    } catch (error) {
      console.error('Error al leer el directorio:', error)
      return []
    }
  })

  ipcMain.handle('read-file', async (_, filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error) {
      console.error(`Error al leer el archivo ${filePath}:`, error)
      throw error
    }
  })
  // --- FIN CÓDIGO GLIMP ---

  // --- Encender los motores en segundo plano ---
  iniciarDemonioObservador('.');
  iniciarAgentesIA(); // <-- NUEVO: Despierta a Gemini
  iniciarBoveda(); // <-- NUEVO: Encendemos la seguridad

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})