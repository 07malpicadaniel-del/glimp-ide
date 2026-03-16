import { ipcMain } from 'electron';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buscarContexto } from './vectorDb'; // <-- Importamos el buscador

export function iniciarAgentesIA() {
    
    // 1. Agente Solucionador (Terminal) - Mantenemos el que ya tienes
    ipcMain.handle('analyze-terminal-error', async (_, errorText, apiKey) => {
       // ... (Tu código actual de la terminal) ...
    });

    // 2. NUEVO: Agente Arquitecto (Chat Lateral + Graph RAG)
    ipcMain.handle('chat-arquitecto', async (_, promptUsuario, apiKey) => {
        try {
            if (!apiKey) return "⚠️ Error: No has configurado tu API Key.";

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Paso A: Extraer conocimiento de ChromaDB
            const contextoRAG = await buscarContexto(promptUsuario);

            // Paso B: Construir el Mega-Prompt
            const promptMestro = `
Eres el Agente Arquitecto de Glimp IDE.
El usuario te hará una pregunta sobre su código fuente.
Utiliza el siguiente contexto (extraído de sus archivos locales mediante Graph RAG) para responder.
Si el contexto no tiene la respuesta, responde basándote en tu conocimiento general, pero siempre prioriza el contexto del proyecto.

--- CONTEXTO LOCAL DEL PROYECTO ---
${contextoRAG ? contextoRAG : "No se encontró contexto específico en la base de datos."}
-----------------------------------

PREGUNTA DEL USUARIO:
${promptUsuario}
`;
            const result = await model.generateContent(promptMestro);
            return result.response.text();
        } catch (error: any) {
            console.error("Error en el Chat:", error);
            return `❌ Error al consultar a Gemini: ${error.message}`;
        }
    });
    
}
// 3. NUEVO: Agente Operario (Generador de Código Inline)
    ipcMain.handle('generar-codigo-inline', async (_, promptUsuario, codigoActual, apiKey) => {
        try {
            if (!apiKey) return "⚠️ Error: No has configurado tu API Key.";

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const promptMaestro = `
Eres un Agente Operario de código dentro de un IDE.
El usuario te pide la siguiente modificación o generación: "${promptUsuario}"

Aquí está el código actual del archivo:
${codigoActual ? codigoActual : "(El archivo está vacío)"}

INSTRUCCIONES ESTRICTAS:
- Devuelve ÚNICAMENTE el código final resultante.
- NO envuelvas el código en bloques de Markdown (ej. evita usar \`\`\`typescript).
- NO incluyas explicaciones, saludos, ni texto adicional. Tu salida reemplazará el texto del editor del usuario directamente.
`;
            const result = await model.generateContent(promptMaestro);
            let texto = result.response.text();
            
            // Filtro de seguridad: quitamos los bloques markdown si Gemini los llega a incluir por terquedad
            texto = texto.replace(/^```[\w]*\n/i, '').replace(/\n```$/i, '');
            
            return texto;
        } catch (error: any) {
            console.error("Error en Agente Operario:", error);
            throw error;
        }
    });