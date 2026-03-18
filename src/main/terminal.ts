import * as pty from 'node-pty';
import * as os from 'os';
import { ipcMain, WebContents } from 'electron';

// Variable global para rastrear el proceso actual
let ptyProcess: pty.IPty | null = null;

// Ahora recibimos un segundo parámetro opcional: la nueva ruta
export function iniciarTerminal(webContents: WebContents, cwdPath: string = process.cwd()) {
    // 1. Si ya existe una terminal, la matamos para liberar memoria
    if (ptyProcess) {
        ptyProcess.kill();
        ipcMain.removeAllListeners('terminal-out-data');
        ipcMain.removeAllListeners('terminal-resize');
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    // 2. Creamos la nueva terminal
    ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: cwdPath, // AHORA ES DINÁMICO
        env: process.env as any
    });

    console.log(`\n💻 [Terminal] Pseudoterminal iniciada en: ${cwdPath}`);

    ptyProcess.onData((data) => {
        webContents.send('terminal-inc-data', data);
    });

    ipcMain.on('terminal-out-data', (_, data) => {
        if (ptyProcess) ptyProcess.write(data);
    });

    ipcMain.on('terminal-resize', (_, cols, rows) => {
        if (ptyProcess) ptyProcess.resize(cols, rows);
    });
}