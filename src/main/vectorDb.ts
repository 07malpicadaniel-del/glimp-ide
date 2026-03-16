import { ChromaClient } from 'chromadb';
import { DefaultEmbeddingFunction } from '@chroma-core/default-embed';

const client = new ChromaClient(); 
const embedder = new DefaultEmbeddingFunction();

export async function indexarFragmentos(filePath: string, fragmentos: string[], imports: string[]) {
    if (fragmentos.length === 0) return;

    try {
        const collection = await client.getOrCreateCollection({ 
            name: "glimp_codigo_fuente",
            embeddingFunction: embedder
        });

        const ids = fragmentos.map((_, i) => `${filePath}_chunk_${i}`);
        
        // Convertimos el array de imports a un string separado por comas para que ChromaDB lo acepte
        const dependencias = imports.length > 0 ? imports.join(',') : 'ninguna';

        const metadatas = fragmentos.map(() => ({ 
            source: filePath,
            relaciones: dependencias // Inyectamos el ADN de Graph RAG aquí
        }));

        await collection.upsert({
            ids: ids,
            documents: fragmentos,
            metadatas: metadatas
        });

        console.log(`✅ [VectorDB] ${fragmentos.length} fragmentos sincronizados. Dependencias: [${dependencias}]`);
    } catch (error) {
        console.error(`❌ [VectorDB] Error conectando con ChromaDB:`, error);
    }
}
// --- NUEVO: Motor de búsqueda Graph RAG ---
export async function buscarContexto(pregunta: string): Promise<string> {
    try {
        const collection = await client.getOrCreateCollection({ 
            name: "glimp_codigo_fuente",
            embeddingFunction: embedder
        });

        // Buscamos los 3 fragmentos de código que más se parezcan a la pregunta del usuario
        const resultados = await collection.query({
            queryTexts: [pregunta],
            nResults: 3
        });

        if (resultados.documents.length > 0 && resultados.documents[0].length > 0) {
            console.log(`🔍 [VectorDB] Contexto encontrado para: "${pregunta}"`);
            // Unimos los fragmentos encontrados con doble salto de línea
            return resultados.documents[0].join('\n\n---\n\n');
        }
        return "";
    } catch (error) {
        console.error(`❌ [VectorDB] Error buscando en ChromaDB:`, error);
        return "";
    }
}