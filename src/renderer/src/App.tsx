import Editor, { DiffEditor } from '@monaco-editor/react';
import { useEffect, useState, useRef } from 'react';
import './assets/main.css';

// Importamos nuestros componentes modulares
import ChatArquitecto from './components/ChatArquitecto';
import TerminalIntegrada from './components/TerminalIntegrada';

interface FileNode { name: string; isDirectory: boolean; path: string; }
interface Tab { path: string; name: string; content: string; }

function App() {
  const [archivos, setArchivos] = useState<FileNode[]>([]);
  const [tabsAbiertos, setTabsAbiertos] = useState<Tab[]>([]);
  const [tabActivo, setTabActivo] = useState<string | null>(null);

  const [mostrarModalApi, setMostrarModalApi] = useState(false);
  const [inputApiKey, setInputApiKey] = useState("");

  // --- Estados: Agente Operario (Ctrl+K) ---
  const editorRef = useRef<any>(null);
  const [mostrarInlinePrompt, setMostrarInlinePrompt] = useState(false);
  const [inlineInput, setInlineInput] = useState("");
  const [inlineCargando, setInlineCargando] = useState(false);

  // --- Estados: Vista Diff (Rojo/Verde) ---
  const [modoDiff, setModoDiff] = useState(false);
  const [codigoPropuesto, setCodigoPropuesto] = useState("");

  useEffect(() => {
    const api = (window as any).api;
    
    // NUEVO: Al iniciar, leemos la llave cifrada desde la bóveda de Windows/Mac
    if (api && api.security) {
        api.security.getApiKey().then((key: string | null) => {
            if (key) setInputApiKey(key);
        });
    }

    if (api && api.readDir) {
      api.readDir('.').then((res: FileNode[]) => setArchivos(res)).catch(err => console.error(err));
    }
  }, []);

  const abrirArchivo = async (archivo: FileNode) => {
      if (archivo.isDirectory) return;
      if (tabsAbiertos.find(t => t.path === archivo.path)) { setTabActivo(archivo.path); return; }
      try {
          const api = (window as any).api;
          const contenido = await api.readFile(archivo.path);
          setTabsAbiertos([...tabsAbiertos, { path: archivo.path, name: archivo.name, content: contenido }]);
          setTabActivo(archivo.path);
      } catch (error) { console.error("Error al abrir archivo:", error); }
  };

  const cerrarTab = (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      const nuevosTabs = tabsAbiertos.filter(t => t.path !== path);
      setTabsAbiertos(nuevosTabs);
      if (tabActivo === path) setTabActivo(nuevosTabs.length > 0 ? nuevosTabs[nuevosTabs.length - 1].path : null);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
      editorRef.current = editor;
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
          setMostrarInlinePrompt(true);
      });
  };

  const ejecutarAgenteOperario = async () => {
      if (!inlineInput.trim()) return;
      
      const api = (window as any).api;
      
      // NUEVO: Obtenemos la llave cifrada desde el backend
      const apiKey = await api.security.getApiKey();
      
      if (!apiKey) { alert("Configura tu API Key en la barra superior primero."); return; }

      setInlineCargando(true);
      
      try {
          const nuevoCodigo = await api.ai.generarCodigoInline(inlineInput, contenidoActivo, apiKey);
          setCodigoPropuesto(nuevoCodigo);
          setModoDiff(true); // Encendemos la pantalla comparativa
      } catch (e) {
          alert("Error de conexión al generar código.");
      } finally {
          setInlineCargando(false);
          setMostrarInlinePrompt(false);
          setInlineInput("");
      }
  };

  const contenidoActivo = tabsAbiertos.find(t => t.path === tabActivo)?.content || "// Selecciona un archivo...";
  const lenguajeActivo = tabActivo ? (tabActivo.endsWith('.json') ? 'json' : 'typescript') : 'typescript';

  // NUEVO: Guardamos la llave usando la API cifrada nativa
  const guardarApiKey = async () => {
      const api = (window as any).api;
      const guardado = await api.security.saveApiKey(inputApiKey.trim());
      
      if (guardado) {
          alert("✅ Llave guardada y cifrada nativamente en tu sistema operativo.");
      } else {
          alert("❌ Error al cifrar la llave.");
      }
      setMostrarModalApi(false);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', position: 'relative' }}>
      
      {/* MODAL PERSONALIZADO DE API KEY */}
      {mostrarModalApi && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: '#252526', padding: '25px', borderRadius: '8px', border: '1px solid #444', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
             <h3 style={{ color: '#e3a828', marginTop: 0, fontFamily: 'sans-serif', fontSize: '16px' }}>🔑 Configuración de IA (BYOK)</h3>
             <p style={{ color: '#ccc', fontSize: '13px', fontFamily: 'sans-serif', marginBottom: '20px' }}>Glimp IDE utiliza Google Gemini para analizar tus errores y generar código. Tu clave se guardará cifrada localmente.</p>
             <input type="password" value={inputApiKey} onChange={(e) => setInputApiKey(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #007acc', borderRadius: '4px', marginBottom: '20px', boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace' }} />
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setMostrarModalApi(false)} style={{ backgroundColor: 'transparent', color: '#ccc', border: '1px solid #444', cursor: 'pointer', padding: '6px 15px', borderRadius: '4px' }}>Cancelar</button>
                <button onClick={guardarApiKey} style={{ backgroundColor: '#007acc', color: '#fff', border: 'none', cursor: 'pointer', padding: '6px 15px', borderRadius: '4px', fontWeight: 'bold' }}>Guardar</button>
             </div>
          </div>
        </div>
      )}

      {/* HEADER IDE */}
      <div style={{ padding: '10px 20px', backgroundColor: '#181818', color: '#e3a828', fontWeight: 'bold', fontFamily: 'sans-serif', borderBottom: '1px solid #333', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>⚡ Glimp IDE 2.0</span>
        <button onClick={() => setMostrarModalApi(true)} style={{ backgroundColor: 'transparent', color: '#888', border: '1px solid #444', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', transition: 'all 0.2s' }} > 🔑 Configurar API Key </button>
      </div>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* 1. SIDEBAR EXPLORADOR */}
        <div style={{ width: '250px', backgroundColor: '#252526', borderRight: '1px solid #333', overflowY: 'auto', padding: '15px 0', flexShrink: 0 }}>
          {archivos.map((a, i) => (
            <div key={i} onClick={() => abrirArchivo(a)} style={{ padding: '6px 15px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: a.isDirectory ? '#e3a828' : '#ccc', fontFamily: 'sans-serif' }}>
              <span>{a.isDirectory ? '📁' : '📄'}</span><span>{a.name}</span>
            </div>
          ))}
        </div>

        {/* 2. ZONA CENTRAL (Editor + Terminal) */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', backgroundColor: '#1e1e1e', borderBottom: '1px solid #333', overflowX: 'auto' }}>
            {tabsAbiertos.map(tab => (
              <div key={tab.path} onClick={() => setTabActivo(tab.path)} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: tabActivo === tab.path ? '#1e1e1e' : '#2d2d2d', borderTop: tabActivo === tab.path ? '2px solid #e3a828' : '2px solid transparent', borderRight: '1px solid #333', color: tabActivo === tab.path ? '#fff' : '#888', fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {tab.name} <span onClick={(e) => cerrarTab(e, tab.path)} style={{ cursor: 'pointer' }}>×</span>
              </div>
            ))}
          </div>

          <div style={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            
            {/* CONDICIONAL: Vista Diff vs Editor Normal */}
            {modoDiff ? (
                <>
                    {/* Barra de Aceptar/Rechazar */}
                    <div style={{ backgroundColor: '#1e1e1e', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                        <span style={{ color: '#ccc', fontSize: '13px', fontFamily: 'sans-serif' }}>Revisando cambios propuestos por el Agente...</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setModoDiff(false)} style={{ backgroundColor: '#da3633', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✖ Rechazar</button>
                            <button onClick={() => {
                                const nuevosTabs = tabsAbiertos.map(t => t.path === tabActivo ? { ...t, content: codigoPropuesto } : t);
                                setTabsAbiertos(nuevosTabs);
                                setModoDiff(false);
                            }} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✔ Aceptar Cambios</button>
                        </div>
                    </div>
                    {/* Editor de Diferencias */}
                    <DiffEditor 
                        height="100%" 
                        language={lenguajeActivo} 
                        theme="vs-dark" 
                        original={contenidoActivo} 
                        modified={codigoPropuesto} 
                        options={{ minimap: { enabled: false }, fontSize: 14, renderSideBySide: true }} 
                    />
                </>
            ) : (
                <>
                    <Editor 
                        height="100%" 
                        language={lenguajeActivo} 
                        theme="vs-dark" 
                        value={contenidoActivo} 
                        options={{ minimap: { enabled: true }, fontSize: 14 }} 
                        onMount={handleEditorDidMount} 
                    />

                    {/* BARRA FLOTANTE (AGENTE OPERARIO) */}
                    {mostrarInlinePrompt && (
                        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '500px', backgroundColor: '#252526', border: '1px solid #007acc', borderRadius: '8px', padding: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '16px' }}>✨</span>
                            <input 
                                type="text" 
                                autoFocus 
                                value={inlineInput} 
                                onChange={(e) => setInlineInput(e.target.value)} 
                                onKeyDown={(e) => { 
                                    if (e.key === 'Enter') ejecutarAgenteOperario(); 
                                    if (e.key === 'Escape') setMostrarInlinePrompt(false); 
                                }} 
                                placeholder="Pídele a Gemini que edite o genere código..." 
                                style={{ flexGrow: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'sans-serif' }} 
                                disabled={inlineCargando} 
                            />
                            {inlineCargando && <span style={{ color: '#007acc', fontSize: '12px', fontWeight: 'bold' }}>Codificando...</span>}
                        </div>
                    )}
                </>
            )}
          </div>

          <TerminalIntegrada />
          
        </div>

        <ChatArquitecto />

      </div>
    </div>
  );
}

export default App;