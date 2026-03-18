// test-modelos.js
const API_KEY = "AIzaSyBtj4ROvMM54YFdus6hxvUFy2lEsVekw_Y"; // <-- Reemplaza esto

async function listarModelos() {
  console.log("Conectando con Google AI Studio...\n");
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Error de la API:", data.error.message);
      return;
    }

    console.log("🟢 Modelos de generación de texto disponibles:\n");
    
    data.models.forEach(modelo => {
      // Filtramos para ver solo los modelos que soportan generación de contenido (Chat/Código)
      if (modelo.supportedGenerationMethods.includes("generateContent")) {
          // Limpiamos el prefijo "models/" para que quede el string exacto que necesitamos
          const nombreExacto = modelo.name.replace('models/', '');
          console.log(`Nombre exacto: "${nombreExacto}"`);
          console.log(`Descripción:   ${modelo.displayName}`);
          console.log("--------------------------------------------------");
      }
    });
    
  } catch (error) {
    console.error("Fallo la conexión:", error);
  }
}

listarModelos();