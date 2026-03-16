import * as chokidar from 'chokidar';
import { diseccionarCodigo } from './ast-extractor';
import { indexarFragmentos } from './vectorDb';

export function iniciarDemonioObservador(rutaDirectorio: string) {
    console.log(`\n👁️ [Demonio] Iniciando vigilancia en: ${rutaDirectorio}`);

    const watcher = chokidar.watch(rutaDirectorio, {
        ignored: [ /(^|[\/\\])\../, /node_modules/, /dist/, /out/ ], 
        persistent: true,
        ignoreInitial: true 
    });

    watcher.on('change', async (rutaArchivo) => {
        if (rutaArchivo.endsWith('.ts') || rutaArchivo.endsWith('.tsx') || rutaArchivo.endsWith('.js')) {
            console.log(`\n⚡ [Demonio] Cambio detectado en: ${rutaArchivo}`);
            
            try {
                // Ahora desestructuramos para obtener fragmentos e importaciones
                const { fragmentos, imports } = diseccionarCodigo(rutaArchivo);
                console.log(`   -> 🔪 Bisturí AST extrajo ${fragmentos.length} bloques lógicos.`);
                console.log(`   -> 🕸️ Graph RAG mapeó ${imports.length} dependencias directas.`);
                
                if (fragmentos.length > 0) {
                    await indexarFragmentos(rutaArchivo, fragmentos, imports);
                } else {
                    console.log(`   -> ℹ️ No hay bloques lógicos para indexar.`);
                }

            } catch (error) {
                console.error(`   -> ❌ Error procesando el archivo:`, error);
            }
        }
    });

    return watcher;
}
//test