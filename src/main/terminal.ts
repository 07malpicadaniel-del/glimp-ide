import * as pty from 'node-pty';
import * as os from 'os';
import { ipcMain, WebContents } from 'electron';

export function iniciarTerminal(webContents: WebContents) {
    // Detectamos el sistema operativo para abrir PowerShell en Windows o Bash en Mac/Linux
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    // Creamos la terminal invisible en el sistema
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(), // Se abre en la carpeta actual de Glimp
        env: process.env as any
    });

    console.log(`\n💻 [Terminal] Pseudoterminal iniciada usando: ${shell}`);

    // ESCUCHAR: Cuando la terminal real produzca texto, enviarlo al Frontend (React)
    ptyProcess.onData((data) => {
        webContents.send('terminal-inc-data', data);
    });

    // ESCRIBIR: Cuando el usuario teclee algo en React, enviarlo a la terminal real
    ipcMain.on('terminal-out-data', (_, data) => {
        ptyProcess.write(data);
    });

    // REDIMENSIONAR: Cuando el usuario ajuste el tamaño de la ventana
    ipcMain.on('terminal-resize', (_, cols, rows) => {
        ptyProcess.resize(cols, rows);
    });
}