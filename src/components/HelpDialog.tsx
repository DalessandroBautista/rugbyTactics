import React, { useState } from 'react'
import { useStore } from '../store/useStore'

type Tab = 'como' | 'mouse' | 'teclado' | 'cantos'

const SECTIONS: Record<Tab, { title: string; items: Array<{ label: string; desc: string }> }> = {
  como: {
    title: 'Cómo usar TacticsRugby',
    items: [
      { label: '1. Armá tu jugada', desc: 'Elegí un modo (Seleccionar / Mover / Grabar) y ubicá a los 15 jugadores en el campo.' },
      { label: '2. Dibujá las rutas', desc: 'En modo Grabar, seleccioná jugadores y arrastralos para grabar sus movimientos en tiempo real.' },
      { label: '3. Reproducí', desc: 'Presioná Espacio o el botón Play para ver la animación de la jugada.' },
      { label: '4. Cono de visión', desc: 'Cada jugador muestra hacia dónde mira (toggle Visión). Por defecto miran al frente; en un lineout, hacia la pelota. Seleccioná un jugador y arrastrá la manija para rotarlo.' },
      { label: '5. Cantos de jugada', desc: 'Agregá burbujas de texto que aparecen en momentos específicos de la jugada (botón Canto).' },
      { label: '6. Exportá y compartí', desc: 'Descargá PNG o video, compartí una jugada por link, o armá una lista de reproducción: un link corto que otros abren y reproducen en la app, con copias editables.' },
      { label: '7. Modo Presentación', desc: 'Pantalla completa sin ediciones, ideal para proyectar en el vestuario.' },
    ],
  },
  mouse: {
    title: 'Mouse y Touch',
    items: [
      { label: 'Click + arrastrar (fondo)', desc: 'Mover la vista del campo (paneo). Funciona en todos los modos.' },
      { label: 'Shift + click + arrastrar', desc: 'Selección múltiple por banda de goma (solo en modo Seleccionar).' },
      { label: 'Rueda del mouse', desc: 'Zoom in / zoom out sobre el cursor.' },
      { label: 'Doble click (fondo)', desc: 'Centrar y ajustar la cancha a la pantalla.' },
      { label: 'Click en jugador', desc: 'Seleccionarlo. Click en otro para cambiar la selección.' },
      { label: 'Arrastrar jugador', desc: 'Moverlo de posición (en modos Mover y Grabar).' },
      { label: 'Click en pelota', desc: 'Seleccionar la pelota para moverla o dibujar su trayectoria.' },
    ],
  },
  teclado: {
    title: 'Atajos de Teclado',
    items: [
      { label: 'S', desc: 'Modo Seleccionar' },
      { label: 'M', desc: 'Modo Mover' },
      { label: 'R', desc: 'Modo Grabar' },
      { label: 'G', desc: 'Iniciar / detener grabación del jugador seleccionado' },
      { label: 'Espacio', desc: 'Reproducir / pausar la animación' },
      { label: 'F', desc: 'Centrar la cancha en pantalla (fit to screen)' },
      { label: 'P', desc: 'Alternar modo Presentación (pantalla completa)' },
      { label: 'Escape', desc: 'Deseleccionar jugador / pelota / salir de presentación' },
      { label: 'Suprimir / Retroceso', desc: 'Borrar la trayectoria del jugador o pelota seleccionada' },
      { label: 'Ctrl + Z', desc: 'Deshacer último cambio' },
      { label: 'Ctrl + Y', desc: 'Rehacer último cambio' },
    ],
  },
  cantos: {
    title: 'Cantos de Jugada',
    items: [
      { label: '¿Qué son?', desc: 'Burbujas de texto que aparecen sobre el campo en un momento específico de la jugada, como si un jugador estuviera cantando una jugada.' },
      { label: '¿Cómo creo uno?', desc: 'Hacé clic en el botón Canto (💬) en la barra superior. Escribí el texto, elegí cuándo aparece y cuánto dura.' },
      { label: 'Aparece en', desc: 'El segundo de la jugada en que se muestra la burbuja (usa el slider).' },
      { label: 'Duración', desc: 'Cuánto tiempo permanece visible durante la reproducción.' },
      { label: 'Colocación', desc: 'Podés colocarla en el centro del viewport o hacer clic en el campo para posicionarla exactamente.' },
      { label: 'En edición', desc: 'Las burbujas se ven siempre para que puedas posicionarlas y editarlas.' },
      { label: 'En reproducción', desc: 'Solo aparecen en el momento configurado, como un subtítulo de la jugada.' },
      { label: 'Presentación', desc: 'Se ven también en modo presentación, ideal para proyectar la jugada con las órdenes.' },
    ],
  },
}

export const HelpDialog: React.FC = () => {
  const showHelp = useStore(s => s.showHelp)
  const setShowHelp = useStore(s => s.setShowHelp)
  const [tab, setTab] = useState<Tab>('como')

  if (!showHelp) return null

  const section = SECTIONS[tab]

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={() => setShowHelp(false)}
    >
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: 520,
          maxWidth: '92vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 10px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🏉</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              Ayuda de TacticsRugby
            </span>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-dim)',
              cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--border)',
          padding: '0 18px',
        }}>
          {([
            ['como', 'Cómo usar'],
            ['mouse', 'Mouse'],
            ['teclado', 'Atajos'],
            ['cantos', 'Cantos'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: '8px 14px',
                fontSize: 12, fontWeight: tab === id ? 600 : 400,
                color: tab === id ? 'var(--accent)' : 'var(--text-dim)',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 18px 18px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            {section.title}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {section.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{
                  minWidth: 140, maxWidth: 160,
                  fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  lineHeight: 1.4,
                  flexShrink: 0,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
                }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            Tip: presioná <kbd style={kbdStyle}>?</kbd> en cualquier momento para abrir esta ayuda
          </span>
          <button
            onClick={() => setShowHelp(false)}
            style={{
              padding: '5px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  borderRadius: 3,
  fontSize: 10,
  fontFamily: 'monospace',
  background: 'var(--panel-alt)',
  border: '1px solid var(--border)',
  color: 'var(--text-muted)',
}
