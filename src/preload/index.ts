import { contextBridge, ipcRenderer } from 'electron'

// Exponemos nuestro canal IPC al Frontend
contextBridge.exposeInMainWorld('api', {
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  
  // --- PUENTE DE LA TERMINAL ---
  terminal: {
    enviar: (data: string) => ipcRenderer.send('terminal-out-data', data),
    recibir: (callback: (data: string) => void) => {
        ipcRenderer.on('terminal-inc-data', (_, data) => callback(data));
    },
    redimensionar: (cols: number, rows: number) => ipcRenderer.send('terminal-resize', cols, rows)
  },

  // --- PUENTE DE IA ---
  ai: {
    analizarErrorTerminal: (errorText: string, apiKey: string) => ipcRenderer.invoke('analyze-terminal-error', errorText, apiKey),
    chatArquitecto: (prompt: string, apiKey: string) => ipcRenderer.invoke('chat-arquitecto', prompt, apiKey),
    generarCodigoInline: (prompt: string, codigoActual: string, apiKey: string) => ipcRenderer.invoke('generar-codigo-inline', prompt, codigoActual, apiKey)
  },

  // --- NUEVO: PUENTE DE SEGURIDAD ---
  security: {
    saveApiKey: (key: string) => ipcRenderer.invoke('save-api-key', key),
    getApiKey: () => ipcRenderer.invoke('get-api-key')
  }
}) // <-- Cierre del exposeInMainWorld