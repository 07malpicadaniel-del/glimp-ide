import React from 'react';

// Actualizamos las interfaces para soportar Multi-Archivo
interface ArchivoModificacion {
  ruta: string;
  pasos: string[];
}

interface Planificador {
  descripcion: string;
  archivos: ArchivoModificacion[];
}

interface ModalPlaneacionProps {
  isOpen: boolean;
  plan: Planificador | null;
  onAceptar: () => void;
  onRechazar: () => void;
  cargandoEjecucion: boolean;
}

export default function ModalPlaneacion({ isOpen, plan, onAceptar, onRechazar, cargandoEjecucion }: ModalPlaneacionProps) {
  if (!isOpen || !plan) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'var(--bg-sidebar)', padding: '25px', borderRadius: '12px', border: '1px solid var(--fern)', width: '600px', boxShadow: '0 10px 40px rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
         
         <h3 style={{ color: 'var(--frozen-water)', marginTop: 0, fontFamily: 'sans-serif', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
            🧠 Plan Arquitectónico (Multi-Archivo)
         </h3>

         <div style={{ overflowY: 'auto', paddingRight: '5px', marginTop: '10px', marginBottom: '20px', flexGrow: 1 }}>
             <p style={{ color: 'var(--dry-sage)', fontSize: '14px', lineHeight: '1.5', fontFamily: 'sans-serif', marginBottom: '20px' }}>
                 {plan.descripcion}
             </p>

             {/* Iteramos sobre cada archivo que el Tech Lead quiere tocar */}
             {plan.archivos.map((archivo, index) => (
                 <div key={index} style={{ marginBottom: '20px', backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                     <h4 style={{ color: 'var(--muted-teal)', fontSize: '13px', fontFamily: 'monospace', margin: '0 0 10px 0', borderBottom: '1px dashed var(--border-color)', paddingBottom: '5px' }}>
                         📄 {archivo.ruta}
                     </h4>
                     <ul style={{ paddingLeft: '20px', color: 'var(--frozen-water)', fontSize: '13px', lineHeight: '1.6', fontFamily: 'sans-serif', margin: 0 }}>
                        {archivo.pasos.map((paso, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>{paso}</li>
                        ))}
                     </ul>
                 </div>
             ))}
         </div>

         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
            <button onClick={onRechazar} disabled={cargandoEjecucion} style={{ backgroundColor: 'transparent', color: '#da3633', border: '1px solid #da3633', cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', opacity: cargandoEjecucion ? 0.5 : 1, transition: 'all 0.2s' }}>
                ✖ Rechazar
            </button>
            <button onClick={onAceptar} disabled={cargandoEjecucion} style={{ backgroundColor: 'var(--fern)', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 2px 10px rgba(97, 139, 74, 0.4)', display: 'flex', alignItems: 'center', gap: '8px', opacity: cargandoEjecucion ? 0.7 : 1, transition: 'all 0.2s' }}>
                {cargandoEjecucion ? '⚡ Junior Coder trabajando en múltiples archivos...' : `✔ Aprobar y Modificar (${plan.archivos.length} archivos)`}
            </button>
         </div>
      </div>
    </div>
  );
}