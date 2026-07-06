import { useState, useEffect, useRef } from 'react'

// ── Caribe LNG · App Launcher universal ──
// Mismo componente en las 5 apps. Detecta cuál está abierta por hostname.
// Si quieres forzar el current, pasa la prop `current="conecta"`.

export const CLNG_APPS = [
  { key: 'bridge',      label: 'Bridge',        url: 'https://caribelng-bridge.vercel.app',     color: '#0D47A1', icon: '🏛',  desc: 'Plataforma gerencial · documentos y aprobaciones', hostMatch: ['caribelng-bridge'] },
  { key: 'conecta',     label: 'Conecta!',      url: 'https://caribe-lng-conecta.vercel.app',   color: '#00BFB3', icon: '🌱', desc: 'Gestión social territorial · actores y campo',     hostMatch: ['caribe-lng-conecta', 'conecta'] },
  { key: 'financiera',  label: 'Financiera',    url: 'https://caribelng-financiera.vercel.app', color: '#007A87', icon: '💰', desc: 'Gastos, reportes y conciliación financiera',       hostMatch: ['caribelng-financiera'] },
  { key: 'comercial',   label: 'Comercial',     url: 'https://caribelng-comercial.vercel.app',  color: '#7C3AED', icon: '📈', desc: 'Pipeline comercial · contratos y offtake',         hostMatch: ['caribelng-comercial'] },
  { key: 'operaciones', label: 'Operaciones',   url: 'https://caribelng-operaciones.vercel.app',color: '#1565C0', icon: '⚓️', desc: 'Operaciones marítimas y planta',                   hostMatch: ['caribelng-operaciones'] },
]

function detectCurrent() {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname.toLowerCase()
  for (const a of CLNG_APPS) {
    if (a.hostMatch.some(h => host.includes(h))) return a.key
  }
  return null
}

export default function AppLauncher({ current, compact = false, variant = 'light' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const activeKey = current || detectCurrent()
  const activeApp = CLNG_APPS.find(a => a.key === activeKey)

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function toggle() {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect()
      const dropW = 320
      // Si el trigger está pegado a la izquierda (sidebar), abrir a la derecha
      // Si no hay espacio a la derecha, abrir a la izquierda
      const spaceRight = window.innerWidth - r.left
      const left = spaceRight >= dropW + 16
        ? r.left
        : Math.max(8, window.innerWidth - dropW - 8)
      setPos({ top: r.bottom + 6, left })
    }
    setOpen(o => !o)
  }

  const triggerBg = variant === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(13,71,161,0.06)'
  const triggerColor = variant === 'dark' ? 'white' : '#0D47A1'
  const triggerBorder = variant === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(13,71,161,0.12)'

  return (
    <div ref={ref} style={{ position: 'relative', fontFamily: "Georgia, 'Times New Roman', serif", display: 'inline-block' }}>
      <button onClick={toggle}
        title="Cambiar de app"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: triggerBg,
          color: triggerColor,
          border: `1px solid ${triggerBorder}`,
          borderRadius: 10, padding: compact ? '6px 10px' : '8px 12px',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
        <span style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'space-between', width: 12, height: 12 }}>
          <span style={{ display: 'grid', gridTemplateColumns: 'repeat(3,3px)', gridTemplateRows: 'repeat(3,3px)', gap: 1 }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} style={{ width: 3, height: 3, background: 'currentColor', borderRadius: 1, opacity: 0.85 }} />
            ))}
          </span>
        </span>
        {!compact && <span>{activeApp ? activeApp.label : 'Apps Caribe LNG'}</span>}
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left,
          background: 'white', borderRadius: 14, boxShadow: '0 12px 40px rgba(13,71,161,0.18)',
          padding: 8, width: 320, zIndex: 99999,
          border: '1px solid #E2E8F0',
          maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
        }}>
          <div style={{ padding: '8px 10px 6px', fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Apps Caribe LNG
          </div>
          {CLNG_APPS.map(a => {
            const isActive = a.key === activeKey
            return (
              <a key={a.key} href={isActive ? '#' : a.url}
                onClick={(e) => { if (isActive) { e.preventDefault(); setOpen(false) } }}
                target={isActive ? '_self' : '_blank'} rel="noopener noreferrer"
                style={{
                  display: 'flex', gap: 10, padding: '10px 10px',
                  borderRadius: 10, textDecoration: 'none', color: '#2B2926',
                  background: isActive ? `${a.color}12` : 'transparent',
                  border: isActive ? `1px solid ${a.color}33` : '1px solid transparent',
                  marginBottom: 2,
                  cursor: isActive ? 'default' : 'pointer',
                  alignItems: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: a.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: a.color }}>{a.label}</div>
                    {isActive && <span style={{ fontSize: 9, fontWeight: 800, color: a.color, background: `${a.color}22`, padding: '1px 6px', borderRadius: 4, letterSpacing: 0.4 }}>ACÁ ESTÁS</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.35 }}>{a.desc}</div>
                </div>
              </a>
            )
          })}
          <div style={{ padding: '8px 10px 4px', borderTop: '1px solid #F1F5F9', marginTop: 4, fontSize: 10, color: '#94A3B8', lineHeight: 1.4 }}>
            Tu sesión se mantiene en cada app · usa el mismo correo @caribelng.com en todas
          </div>
        </div>
      )}
    </div>
  )
}
