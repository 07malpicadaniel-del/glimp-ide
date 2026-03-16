import { useEffect, useState, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalIntegrada() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const bufferTerminal = useRef<string>(""); 
  const [errorTerminal, setErrorTerminal] = useState<string | null>(null);
  const [respuestaIA, setRespuestaIA] = useState<string | null>(null);

  const analizarConIA = async () => {
      if (!errorTerminal) return;
      const apiKey = localStorage.getItem('glimp_apikey');
      if (!apiKey) { setRespuestaIA("⚠️ Acceso denegado: Necesitas configurar tu API Key de Gemini."); return; }
      
      setRespuestaIA("Escaneando el contexto del error... 🧠");
      try {
          // @ts-ignore
          const respuesta = await window.api.ai.analizarErrorTerminal(errorTerminal, apiKey);
          setRespuestaIA(respuesta);
      } catch (e) { setRespuestaIA("Fallo de conexión con Gemini."); }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({ theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#e3a828' }, fontFamily: 'Consolas, "Courier New", monospace', fontSize: 13, cursorBlink: true });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    setTimeout(() => fitAddon.fit(), 50);

    const api = (window as any).api;
    if (!api || !api.terminal) { term.write('\r\nError IPC no conectado.\r\n'); return; }

    term.onData(data => {
      api.terminal.enviar(data);
      if (!data.startsWith('\x1b[')) { setErrorTerminal(null); setRespuestaIA(null); }
    });

    api.terminal.recibir((data: string) => {
      term.write(data);
      bufferTerminal.current += data;
      if (bufferTerminal.current.length > 2000) bufferTerminal.current = bufferTerminal.current.slice(-2000);
      const cleanData = data.replace(/\x1b\[[0-9;]*m/g, '').toLowerCase();
      
      if (cleanData.includes('error') || cleanData.includes('err!') || cleanData.includes('exception') || cleanData.includes('not recognized') || cleanData.includes('no se reconoce')) {
         setErrorTerminal(bufferTerminal.current);
      }
    });

    const handleResize = () => { fitAddon.fit(); api.terminal.redimensionar(term.cols, term.rows); };
    window.addEventListener('resize', handleResize);
    return () => { term.dispose(); window.removeEventListener('resize', handleResize); };
  }, []);

  return (
    <div style={{ height: '300px', borderTop: '1px solid #333', backgroundColor: '#1e1e1e', padding: '10px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
       <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '5px', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'space-between' }}>
          <span>TERMINAL INTEGRADA</span>
          {errorTerminal && !respuestaIA && <button onClick={analizarConIA} style={{ backgroundColor: '#da3633', color: 'white', border: 'none', padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>🤖 Explicar Error con IA</button>}
       </div>

       {respuestaIA && (
           <div style={{ position: 'absolute', top: '35px', right: '20px', width: '450px', maxHeight: '240px', overflowY: 'auto', backgroundColor: '#252526', border: '1px solid #e3a828', borderRadius: '6px', padding: '15px', zIndex: 10, boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                  <strong style={{ color: '#e3a828', fontSize: '12px' }}>⚡ Glimp Solucionador</strong>
                  <span onClick={() => { setRespuestaIA(null); }} style={{ cursor: 'pointer', color: '#888' }}>✖ Cerrar</span>
               </div>
               <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#ccc', whiteSpace: 'pre-wrap' }}>{respuestaIA}</div>
           </div>
       )}
       <div style={{ flexGrow: 1, width: '100%', position: 'relative', overflow: 'hidden' }}>
          <div ref={terminalRef} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}></div>
       </div>
    </div>
  );
}