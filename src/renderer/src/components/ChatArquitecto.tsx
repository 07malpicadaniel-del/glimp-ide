import { useState } from 'react';

export default function ChatArquitecto() {
  const [mensajesChat, setMensajesChat] = useState<{rol: 'usuario' | 'ia', texto: string}[]>([
    { rol: 'ia', texto: '¡Hola! Soy tu Agente Arquitecto. Conozco tu código gracias a Graph RAG. ¿Qué analizamos hoy?' }
  ]);
  const [inputChat, setInputChat] = useState("");
  const [chatCargando, setChatCargando] = useState(false);

  const enviarMensajeChat = async () => {
      if (!inputChat.trim() || chatCargando) return;
      
      // NUEVO: Pedimos la llave a la bóveda
      const api = (window as any).api;
      const apiKey = await api.security.getApiKey();
      
      if (!apiKey) { alert("Configura tu API Key en la barra superior primero."); return; }

      const pregunta = inputChat;
      setInputChat("");
      setMensajesChat(prev => [...prev, { rol: 'usuario', texto: pregunta }]);
      setChatCargando(true);

      try {
          const respuesta = await api.ai.chatArquitecto(pregunta, apiKey);
          setMensajesChat(prev => [...prev, { rol: 'ia', texto: respuesta }]);
      } catch (e) {
          setMensajesChat(prev => [...prev, { rol: 'ia', texto: "❌ Error de conexión." }]);
      } finally {
          setChatCargando(false);
      }
  };

  return (
    <div style={{ width: '320px', backgroundColor: '#252526', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
       <div style={{ padding: '15px', borderBottom: '1px solid #333', color: '#e3a828', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>🤖 Agente Arquitecto</div>
       <div style={{ flexGrow: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {mensajesChat.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.rol === 'usuario' ? 'flex-end' : 'flex-start', backgroundColor: msg.rol === 'usuario' ? '#007acc' : '#333', color: '#fff', padding: '10px 14px', borderRadius: '8px', maxWidth: '85%', fontSize: '13px', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.texto}
              </div>
          ))}
          {chatCargando && <div style={{ alignSelf: 'flex-start', backgroundColor: '#333', color: '#888', padding: '10px 14px', borderRadius: '8px', fontSize: '12px' }}>Analizando el grafo de código... 🔍</div>}
       </div>
       <div style={{ padding: '15px', borderTop: '1px solid #333', backgroundColor: '#1e1e1e' }}>
          <input type="text" value={inputChat} onChange={(e) => setInputChat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviarMensajeChat()} placeholder="Pregúntale a tu proyecto..." style={{ width: '100%', padding: '10px', backgroundColor: '#2d2d2d', color: '#fff', border: '1px solid #444', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }} />
       </div>
    </div>
  );
}