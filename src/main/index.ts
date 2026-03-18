import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron' // <-- IMPORTAMOS DIALOG
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { iniciarBoveda } from './security'

import { iniciarDemonioObservador } from './watcher'
import { iniciarTerminal } from './terminal'
import { iniciarAgentesIA } from './aiController' 

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

  mainWindow.webContents.on('did-finish-load', () => {
    iniciarTerminal(mainWindow.webContents);
  });
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

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

  // --- INICIO CÓDIGO GLIMP: Selector de Workspaces ---
  ipcMain.handle('open-folder-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'] 
    });
    
    if (canceled || filePaths.length === 0) {
      return null; 
    }
    
    const selectedPath = filePaths[0];
    console.log("📁 Nuevo Workspace seleccionado:", selectedPath);
    
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        iniciarTerminal(windows[0].webContents, selectedPath);
    }

    return selectedPath;
  });
  // --- FIN CÓDIGO GLIMP ---

  iniciarDemonioObservador('.');
  iniciarAgentesIA(); 
  iniciarBoveda(); 

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