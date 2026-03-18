import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ChatArquitecto() {
  const [mensajesChat, setMensajesChat] = useState<{rol: 'usuario' | 'ia', texto: string}[]>([
    { rol: 'ia', texto: '¡Hola! 🌿 Soy tu Agente Arquitecto Pro. Usa `@nombre_archivo` para darme contexto específico o pregúntame sobre la arquitectura global.' }
  ]);
  const [inputChat, setInputChat] = useState("");
  const [chatCargando, setChatCargando] = useState(false);

  const enviarMensajeChat = async () => {
      if (!inputChat.trim() || chatCargando) return;
      const api = (window as any).api;
      const apiKey = await api.security.getApiKey();
      if (!apiKey) { alert("🔑 Configura tu API Key en la barra superior primero."); return; }

      const preguntaOriginal = inputChat;
      setInputChat(""); 
      
      setChatCargando(true);

      // --- DETECCIÓN DE MENCIONES (@ARCHIVOS) ---
      const regexMenciones = /@(\S+)/g;
      const coincidencias = [...preguntaOriginal.matchAll(regexMenciones)];
      let contextoArchivosExtra = "\n\n--- ARCHIVOS REFERENCIADOS EXPLÍCITAMENTE POR EL USUARIO ---\n";
      let huboMenciones = false;

      if (coincidencias.length > 0) {
          huboMenciones = true;
          for (const match of coincidencias) {
              const rutaArchivo = match[1]; 
              try {
                  const contenido = await api.readFile(rutaArchivo);
                  contextoArchivosExtra += `\n📄 Archivo: ${rutaArchivo}\n\`\`\`\n${contenido}\n\`\`\`\n`;
              } catch (error) {
                  contextoArchivosExtra += `\n⚠️ No se pudo leer el archivo: ${rutaArchivo}\n`;
              }
          }
      }

      const promptFinal = huboMenciones ? `${preguntaOriginal}${contextoArchivosExtra}` : preguntaOriginal;

      setMensajesChat(prev => [
          ...prev, 
          { rol: 'usuario', texto: preguntaOriginal }, 
          { rol: 'ia', texto: '' } 
      ]);

      const modeloActivo = localStorage.getItem('glimp_model') || 'gemini-1.5-flash';

      // --- LLAMADA ASÍNCRONA (STREAMING) ---
      api.ai.streamChatArquitecto(promptFinal, apiKey, modeloActivo, {
          onChunk: (textoNuevo: string) => {
              setMensajesChat(prev => {
                  const nuevosMensajes = [...prev];
                  const ultimoIndex = nuevosMensajes.length - 1;
                  nuevosMensajes[ultimoIndex] = {
                      ...nuevosMensajes[ultimoIndex],
                      texto: nuevosMensajes[ultimoIndex].texto + textoNuevo
                  };
                  return nuevosMensajes;
              });
          },
          onEnd: () => {
              setChatCargando(false);
          },
          onError: (err: string) => {
              setMensajesChat(prev => [...prev, { rol: 'ia', texto: `❌ Error de red o API: ${err}` }]);
              setChatCargando(false);
          }
      });
  };

  return (
    <div style={{ width: '380px', backgroundColor: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
       <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', color: 'var(--frozen-water)', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🤖 Agente Arquitecto Pro
       </div>
       
       <div style={{ flexGrow: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {mensajesChat.map((msg, i) => (
              <div key={i} style={{ 
                  alignSelf: msg.rol === 'usuario' ? 'flex-end' : 'flex-start', 
                  backgroundColor: msg.rol === 'usuario' ? 'var(--fern)' : 'var(--olive-leaf)', 
                  color: msg.rol === 'usuario' ? '#fff' : 'var(--frozen-water)', 
                  padding: '12px 16px', borderRadius: '12px', maxWidth: '90%', fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                  borderTopRightRadius: msg.rol === 'usuario' ? '2px' : '12px',
                  borderTopLeftRadius: msg.rol === 'ia' ? '2px' : '12px',
              }}>
                  
                  {msg.texto === '' ? (
                      <span style={{ color: 'var(--muted-teal)' }}>Glimp está pensando... 🧠</span>
                  ) : (
                      <ReactMarkdown 
                          children={msg.texto} 
                          remarkPlugins={[remarkGfm]} 
                          components={{
                              // Corrección 1: Agregamos `: any` para calmar a TypeScript
                              code({node, inline, className, children, ...props}: any) {
                                  const match = /language-(\w+)/.exec(className || '')
                                  return !inline && match ? (
                                      <SyntaxHighlighter
                                          children={String(children).replace(/\n$/, '')}
                                          style={vscDarkPlus as any} 
                                          language={match[1]}
                                          PreTag="div"
                                          className="highlighter-custom"
                                          customStyle={{ margin: '10px 0', borderRadius: '6px', fontSize: '12px', backgroundColor: '#1e1e1e' }}
                                          {...props}
                                      />
                                  ) : (
                                      <code className={className} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px', fontFamily: 'monospace' }} {...props}>
                                          {children}
                                      {/* Corrección 2: La barra de cierre que faltaba */}
                                      </code>
                                  )
                              },
                              // También tipamos estos para evitar futuros berrinches de TS
                              p: ({children}: any) => <p style={{ margin: '0 0 10px 0' }}>{children}</p>,
                              ul: ({children}: any) => <ul style={{ margin: '0 0 10px 15px', padding: 0 }}>{children}</ul>,
                          }}
                      />
                  )}
              </div>
          ))}
       </div>

       <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
          <input type="text" value={inputChat} onChange={(e) => setInputChat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviarMensajeChat()} placeholder="Pregunta, o usa @archivo para dar contexto..." style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-sidebar)', color: 'var(--frozen-water)', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', boxSizing: 'border-box', fontSize: '13px', transition: 'border-color 0.2s' }} disabled={chatCargando} />
       </div>
    </div>
  );
}