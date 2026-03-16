import { app, safeStorage, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Ruta donde guardaremos el archivo cifrado (AppData/Roaming/glimp-ide en Windows)
const configPath = path.join(app.getPath('userData'), 'glimp-config.json');

export function iniciarBoveda() {
    // 1. Guardar y cifrar
    ipcMain.handle('save-api-key', async (_, key: string) => {
        try {
            if (safeStorage.isEncryptionAvailable()) {
                // El sistema operativo cifra la llave y nos devuelve un Buffer
                const encryptedBuffer = safeStorage.encryptString(key);
                // Convertimos el buffer a texto base64 para poder guardarlo en un JSON
                const config = { apiKey: encryptedBuffer.toString('base64') };
                fs.writeFileSync(configPath, JSON.stringify(config));
                return true;
            } else {
                console.warn("La encriptación nativa no está disponible en este SO.");
                return false;
            }
        } catch (e) {
            console.error("Error cifrando la llave:", e);
            return false;
        }
    });

    // 2. Leer y descifrar
    ipcMain.handle('get-api-key', async () => {
        try {
            if (!fs.existsSync(configPath)) return null;
            
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(fileContent);

            if (!config.apiKey) return null;

            // Reconstruimos el Buffer desde el base64 y le pedimos al SO que lo descifre
            const encryptedBuffer = Buffer.from(config.apiKey, 'base64');
            return safeStorage.decryptString(encryptedBuffer);
        } catch (e) {
            console.error("Error descifrando la llave:", e);
            return null;
        }
    });
}