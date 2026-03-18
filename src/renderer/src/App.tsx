import Editor, { DiffEditor } from '@monaco-editor/react';
import { useEffect, useState, useRef } from 'react';
import './assets/main.css';

import ChatArquitecto from './components/ChatArquitecto';
import TerminalIntegrada from './components/TerminalIntegrada';

interface FileNode { name: string; isDirectory: boolean; path: string; }
interface Tab { path: string; name: string; content: string; }

function App() {
  const [rutaActual, setRutaActual] = useState<string>('.'); 
  const [archivos, setArchivos] = useState<FileNode[]>([]);
  const [tabsAbiertos, setTabsAbiertos] = useState<Tab[]>([]);
  const [tabActivo, setTabActivo] = useState<string | null>(null);

  const [mostrarModalApi, setMostrarModalApi] = useState(false);
  const [inputApiKey, setInputApiKey] = useState("");

  // --- ESTADO: Modelo activo (Por defecto usamos 2.5 Flash) ---
  const [modeloIA, setModeloIA] = useState(localStorage.getItem('glimp_model') || 'gemini-2.5-flash');

  const editorRef = useRef<any>(null);
  const [mostrarInlinePrompt, setMostrarInlinePrompt] = useState(false);
  const [inlineInput, setInlineInput] = useState("");
  const [inlineCargando, setInlineCargando] = useState(false);

  const [modoDiff, setModoDiff] = useState(false);
  const [codigoPropuesto, setCodigoPropuesto] = useState("");

  useEffect(() => {
    const api = (window as any).api;
    if (api && api.security) {
        api.security.getApiKey().then((key: string | null) => { if (key) setInputApiKey(key); });
    }
    cargarArchivos(rutaActual);
  }, [rutaActual]);

  const cargarArchivos = (ruta: string) => {
    const api = (window as any).api;
    if (api && api.readDir) {
        api.readDir(ruta).then((res: FileNode[]) => setArchivos(res)).catch(console.error);
    }
  };

  const abrirWorkspace = async () => {
      const api = (window as any).api;
      const nuevaRuta = await api.openFolderDialog();
      if (nuevaRuta) {
          setRutaActual(nuevaRuta);
          setTabsAbiertos([]); 
          setTabActivo(null);
      }
  };

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
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => setMostrarInlinePrompt(true));
  };

  const ejecutarAgenteOperario = async () => {
      if (!inlineInput.trim()) return;
      const api = (window as any).api;
      const apiKey = await api.security.getApiKey();
      if (!apiKey) { alert("Configura tu API Key primero."); return; }

      setInlineCargando(true);
      try {
          const modeloActivo = localStorage.getItem('glimp_model') || 'gemini-2.5-flash';
          const nuevoCodigo = await api.ai.generarCodigoInline(inlineInput, contenidoActivo, apiKey, modeloActivo);
          setCodigoPropuesto(nuevoCodigo);
          setModoDiff(true); 
      } catch (e) { alert("Error al generar código."); } 
      finally { setInlineCargando(false); setMostrarInlinePrompt(false); setInlineInput(""); }
  };

  const contenidoActivo = tabsAbiertos.find(t => t.path === tabActivo)?.content || "// Selecciona o crea un archivo...";
  const lenguajeActivo = tabActivo ? (tabActivo.endsWith('.json') ? 'json' : 'typescript') : 'typescript';

  const guardarApiKey = async () => {
      const api = (window as any).api;
      const guardado = await api.security.saveApiKey(inputApiKey.trim());
      if (guardado) alert("✅ Llave cifrada correctamente.");
      setMostrarModalApi(false);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
      
      {/* MODAL PERSONALIZADO DE API KEY */}
      {mostrarModalApi && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'var(--bg-sidebar)', padding: '25px', borderRadius: '8px', border: '1px solid var(--olive-leaf)', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' }}>
             <h3 style={{ color: 'var(--frozen-water)', marginTop: 0, fontFamily: 'sans-serif', fontSize: '16px' }}>🔑 Bóveda Glimp (BYOK)</h3>
             <p style={{ color: 'var(--muted-teal)', fontSize: '13px', fontFamily: 'sans-serif', marginBottom: '20px' }}>Tu clave se guardará cifrada localmente en tu sistema operativo.</p>
             <input type="password" value={inputApiKey} onChange={(e) => setInputApiKey(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-main)', color: 'var(--frozen-water)', border: '1px solid var(--fern)', borderRadius: '4px', marginBottom: '20px', outline: 'none', fontFamily: 'monospace' }} />
             <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setMostrarModalApi(false)} style={{ backgroundColor: 'transparent', color: 'var(--muted-teal)', border: '1px solid var(--border-color)', cursor: 'pointer', padding: '6px 15px', borderRadius: '4px' }}>Cancelar</button>
                <button onClick={guardarApiKey} style={{ backgroundColor: 'var(--fern)', color: '#fff', border: 'none', cursor: 'pointer', padding: '6px 15px', borderRadius: '4px', fontWeight: 'bold' }}>Guardar</button>
             </div>
          </div>
        </div>
      )}

      {/* HEADER IDE CON SELECTOR DE MODELOS DE VANGUARDIA */}
      <div style={{ padding: '10px 20px', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ color: 'var(--frozen-water)', fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '15px' }}>🌿 Glimp IDE</span>
            
            <button onClick={abrirWorkspace} style={{ backgroundColor: 'var(--olive-leaf)', color: 'var(--frozen-water)', border: '1px solid var(--fern)', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s' }}>
                📁 Abrir Proyecto
            </button>
            
            {/* SELECTOR DE MODELOS MEJORADO */}
            <select 
                value={modeloIA} 
                onChange={(e) => {
                    const nuevoModelo = e.target.value;
                    setModeloIA(nuevoModelo);
                    localStorage.setItem('glimp_model', nuevoModelo);
                }}
                style={{ backgroundColor: 'var(--bg-sidebar)', color: 'var(--frozen-water)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif', maxWidth: '250px' }}
            >
                <optgroup label="⚡ Velocidad & Estabilidad">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                </optgroup>
                <optgroup label="🧠 Razonamiento Avanzado">
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </optgroup>
                <optgroup label="🚀 Previews de Vanguardia (Glimp Pro)">
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                    <option value="gemini-3-pro-preview">Gemini 3.0 Pro Preview</option>
                    <option value="deep-research-pro-preview-12-2025">Deep Research Pro (Dec 25)</option>
                    <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite Preview</option>
                </optgroup>
                <optgroup label="💎 Modelos Abiertos (Gemma)">
                    <option value="gemma-3-27b-it">Gemma 3 27B</option>
                    <option value="gemma-3-12b-it">Gemma 3 12B</option>
                </optgroup>
            </select>
        </div>
        
        <button onClick={() => setMostrarModalApi(true)} style={{ backgroundColor: 'transparent', color: 'var(--dry-sage)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
            🔑 Bóveda
        </button>
      </div>

      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR EXPLORADOR */}
        <div style={{ width: '250px', backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', overflowY: 'auto', padding: '15px 0', flexShrink: 0 }}>
          {archivos.map((a, i) => (
            <div key={i} onClick={() => abrirArchivo(a)} style={{ padding: '6px 15px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: a.isDirectory ? 'var(--dry-sage)' : 'var(--muted-teal)', fontFamily: 'sans-serif' }}>
              <span>{a.isDirectory ? '📁' : '📄'}</span><span>{a.name}</span>
            </div>
          ))}
        </div>

        {/* ZONA CENTRAL */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', overflowX: 'auto' }}>
            {tabsAbiertos.map(tab => (
              <div key={tab.path} onClick={() => setTabActivo(tab.path)} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: tabActivo === tab.path ? 'var(--bg-main)' : 'var(--bg-sidebar)', borderTop: tabActivo === tab.path ? '2px solid var(--fern)' : '2px solid transparent', borderRight: '1px solid var(--border-color)', color: tabActivo === tab.path ? 'var(--frozen-water)' : 'var(--muted-teal)', fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {tab.name} <span onClick={(e) => cerrarTab(e, tab.path)} style={{ cursor: 'pointer' }}>×</span>
              </div>
            ))}
          </div>

          <div style={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {modoDiff ? (
                <>
                    <div style={{ backgroundColor: 'var(--bg-sidebar)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--muted-teal)', fontSize: '13px', fontFamily: 'sans-serif' }}>Revisando cambios propuestos...</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setModoDiff(false)} style={{ backgroundColor: 'transparent', color: 'var(--frozen-water)', border: '1px solid #da3633', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>✖ Rechazar</button>
                            <button onClick={() => {
                                const nuevosTabs = tabsAbiertos.map(t => t.path === tabActivo ? { ...t, content: codigoPropuesto } : t);
                                setTabsAbiertos(nuevosTabs);
                                setModoDiff(false);
                            }} style={{ backgroundColor: 'var(--fern)', color: '#fff', border: 'none', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✔ Aceptar Cambios</button>
                        </div>
                    </div>
                    <DiffEditor height="100%" language={lenguajeActivo} theme="vs-dark" original={contenidoActivo} modified={codigoPropuesto} options={{ minimap: { enabled: false }, fontSize: 14, renderSideBySide: true }} />
                </>
            ) : (
                <>
                    <Editor height="100%" language={lenguajeActivo} theme="vs-dark" value={contenidoActivo} options={{ minimap: { enabled: true }, fontSize: 14 }} onMount={handleEditorDidMount} />
                    
                    {mostrarInlinePrompt && (
                        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', width: '500px', backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--fern)', borderRadius: '8px', padding: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '16px' }}>✨</span>
                            <input type="text" autoFocus value={inlineInput} onChange={(e) => setInlineInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ejecutarAgenteOperario(); if (e.key === 'Escape') setMostrarInlinePrompt(false); }} placeholder="Pídele a Gemini que edite o genere código..." style={{ flexGrow: 1, backgroundColor: 'transparent', border: 'none', color: 'var(--frozen-water)', fontSize: '13px', outline: 'none', fontFamily: 'sans-serif' }} disabled={inlineCargando} />
                            {inlineCargando && <span style={{ color: 'var(--dry-sage)', fontSize: '12px', fontWeight: 'bold' }}>Codificando...</span>}
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