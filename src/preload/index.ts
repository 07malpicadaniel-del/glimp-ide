import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
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
    analizarErrorTerminal: (errorText: string, apiKey: string, modelo: string) => ipcRenderer.invoke('analyze-terminal-error', errorText, apiKey, modelo),
    
    chatArquitecto: (prompt: string, apiKey: string, modelo: string) => ipcRenderer.invoke('chat-arquitecto', prompt, apiKey, modelo),
    
    generarCodigoInline: (prompt: string, codigoActual: string, apiKey: string, modelo: string) => ipcRenderer.invoke('generar-codigo-inline', prompt, codigoActual, apiKey, modelo),
    
    // Función de Streaming (¡Restaurada!)
    streamChatArquitecto: (prompt: string, apiKey: string, modelo: string, callbacks: { onChunk: (text: string) => void, onEnd: () => void, onError: (err: string) => void }) => {
        const channelId = `chat-stream-${Date.now()}`;
        
        ipcRenderer.on(`${channelId}-chunk`, (_, chunkText) => callbacks.onChunk(chunkText));
        
        ipcRenderer.once(`${channelId}-end`, () => {
            ipcRenderer.removeAllListeners(`${channelId}-chunk`);
            callbacks.onEnd();
        });
        
        ipcRenderer.once(`${channelId}-error`, (_, errText) => {
            ipcRenderer.removeAllListeners(`${channelId}-chunk`);
            callbacks.onError(errText);
        });

        ipcRenderer.send('chat-arquitecto-stream', { channelId, promptUsuario: prompt, apiKey, modeloSeleccionado: modelo });
    },

    // --- NUEVO: Tech Lead Planificador ---
    planearCodigoInline: (prompt: string, codigoActual: string, apiKey: string, modelo: string) => ipcRenderer.invoke('planear-codigo-inline', prompt, codigoActual, apiKey, modelo)
  },

  // --- PUENTE DE SEGURIDAD ---
  security: {
    saveApiKey: (key: string) => ipcRenderer.invoke('save-api-key', key),
    getApiKey: () => ipcRenderer.invoke('get-api-key')
  },

  // --- PUENTE DE WORKSPACES ---
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),

  // --- PUENTE DE TELEMETRÍA RAG ---
  onIndexProgress: (callback: (data: { current: number, total: number, file: string, status: string }) => void) => {
      ipcRenderer.on('index-progress', (_, data) => callback(data));
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}