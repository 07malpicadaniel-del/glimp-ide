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
    analizarErrorTerminal: (errorText: string, apiKey: string, modelo: string) => ipcRenderer.invoke('analyze-terminal-error', errorText, apiKey, modelo),
    chatArquitecto: (prompt: string, apiKey: string, modelo: string) => ipcRenderer.invoke('chat-arquitecto', prompt, apiKey, modelo),
    generarCodigoInline: (prompt: string, codigoActual: string, apiKey: string, modelo: string) => ipcRenderer.invoke('generar-codigo-inline', prompt, codigoActual, apiKey, modelo),
    
    // --- NUEVO: Puente de Streaming para el Chat ---
    streamChatArquitecto: (prompt: string, apiKey: string, modelo: string, callbacks: { onChunk: (text: string) => void, onEnd: () => void, onError: (err: string) => void }) => {
        // Creamos un ID único para este mensaje
        const channelId = `chat-stream-${Date.now()}`;
        
        // Escuchamos los pedazos
        ipcRenderer.on(`${channelId}-chunk`, (_, chunkText) => callbacks.onChunk(chunkText));
        
        // Escuchamos el final
        ipcRenderer.once(`${channelId}-end`, () => {
            ipcRenderer.removeAllListeners(`${channelId}-chunk`); // Limpiamos la memoria
            callbacks.onEnd();
        });
        
        // Escuchamos si hay error
        ipcRenderer.once(`${channelId}-error`, (_, errText) => {
            ipcRenderer.removeAllListeners(`${channelId}-chunk`);
            callbacks.onError(errText);
        });

        // Enviamos la petición al backend
        ipcRenderer.send('chat-arquitecto-stream', { channelId, promptUsuario: prompt, apiKey, modeloSeleccionado: modelo });
    }
  },

  // --- PUENTE DE SEGURIDAD ---
  security: {
    saveApiKey: (key: string) => ipcRenderer.invoke('save-api-key', key),
    getApiKey: () => ipcRenderer.invoke('get-api-key')
  },

  // --- PUENTE DE WORKSPACES ---
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),

  // --- NUEVO: PUENTE DE TELEMETRÍA RAG ---
  onIndexProgress: (callback: (data: { current: number, total: number, file: string, status: string }) => void) => {
      // Usamos ipcRenderer.on para escuchar un flujo constante de datos, no solo una respuesta
      ipcRenderer.on('index-progress', (_, data) => callback(data));
  }
})