import { ipcMain } from 'electron';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buscarContexto } from './vectorDb';

export function iniciarAgentesIA() {
    
    // 1. Agente Solucionador (Terminal)
    ipcMain.handle('analyze-terminal-error', async (_, errorText, apiKey, modeloSeleccionado = "gemini-2.5-flash") => {
        try {
            if (!apiKey) return "⚠️ Error: No has configurado tu API Key.";
            const genAI = new GoogleGenerativeAI(apiKey);
            
            // USAMOS EL MODELO DINÁMICO
            const model = genAI.getGenerativeModel({ model: modeloSeleccionado });
            
            const prompt = `
Eres un experto desarrollador y solucionador de problemas (debugging).
A continuación, te proporcionaré la salida de un error de consola o terminal.
Tu objetivo es:
1. Identificar rápidamente cuál es el problema raíz.
2. Dar una solución clara y directa. Si hay comandos que ejecutar o código que corregir, muéstralos.

Error detectado:
${errorText}
`;
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error("Error analizando terminal:", error);
            return `❌ Error al consultar a la IA: ${error.message}`;
        }
    });

    // --- NUEVO: Agente Arquitecto con STREAMING ---
    ipcMain.on('chat-arquitecto-stream', async (event, payload) => {
        const { channelId, promptUsuario, apiKey, modeloSeleccionado } = payload;
        
        try {
            if (!apiKey) throw new Error("No has configurado tu API Key.");
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modeloSeleccionado || "gemini-2.5-flash" });

            const contextoRAG = await buscarContexto(promptUsuario);
            const promptMestro = `
Eres el Agente Arquitecto de Glimp IDE. Tu trabajo es asistir al desarrollador de forma concisa y experta.
REGLAS ESTRICTAS:
1. NUNCA repitas tu rol ("Hola, soy el Agente..."). Ve directo al grano.
2. Usa viñetas para listar conceptos y sé breve.
3. Si sugieres código, envuélvelo siempre en bloques Markdown.
4. Usa emojis sutilmente para darle identidad a tus respuestas, pero prioriza la claridad técnica.

--- CONTEXTO LOCAL DEL PROYECTO ---
${contextoRAG ? contextoRAG : "No se encontró contexto específico en la base de datos."}
-----------------------------------

PREGUNTA DEL USUARIO:
${promptUsuario}
`;
            // Usamos generateContentStream en lugar de generateContent
            const result = await model.generateContentStream(promptMestro);
            
            // Iteramos sobre los pedazos (chunks) de texto conforme van llegando de Google
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                // Enviamos cada pedacito al frontend usando el canal único
                event.sender.send(`${channelId}-chunk`, chunkText);
            }
            
            // Avisamos que el stream terminó
            event.sender.send(`${channelId}-end`);
            
        } catch (error: any) {
            console.error("Error en el Chat Stream:", error);
            event.sender.send(`${channelId}-error`, error.message);
        }
    });

    // 3. Agente Operario (Generador de Código Inline)
    ipcMain.handle('generar-codigo-inline', async (_, promptUsuario, codigoActual, apiKey, modeloSeleccionado = "gemini-2.5-flash") => {
        try {
            if (!apiKey) return "⚠️ Error: No has configurado tu API Key.";
            const genAI = new GoogleGenerativeAI(apiKey);
            
            // USAMOS EL MODELO DINÁMICO
            const model = genAI.getGenerativeModel({ model: modeloSeleccionado });

            const promptMaestro = `
Eres un Agente Operario de código dentro de un IDE.
El usuario te pide la siguiente modificación o generación: "${promptUsuario}"

Aquí está el código actual del archivo:
${codigoActual ? codigoActual : "(El archivo está vacío)"}

INSTRUCCIONES ESTRICTAS:
- Devuelve ÚNICAMENTE el código final resultante.
- NO envuelvas el código en bloques de Markdown (ej. evita usar \`\`\`typescript).
- NO incluyas explicaciones, saludos, ni texto adicional. Tu salida reemplazará el texto del editor.
`;
            const result = await model.generateContent(promptMaestro);
            let texto = result.response.text();
            texto = texto.replace(/^```[\w]*\n/i, '').replace(/\n```$/i, '');
            return texto;
        } catch (error: any) {
            console.error("Error en Agente Operario:", error);
            throw error;
        }
    });
}