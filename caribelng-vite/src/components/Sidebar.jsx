import { C } from '../lib/constants'

// ── Sidebar Conecta (estilo Bridge/Financiera) ──

const s = (d, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
const Icons = {
  dashboard: () => s(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>),
  pin:       () => s(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>),
  edit:      () => s(<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>),
  users:     () => s(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  leaf:      () => s(<><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 20 8 20 8s.5 5-2.5 8.5"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 12 13"/></>),
  target:    () => s(<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>),
  alert:     () => s(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  brain:     () => s(<><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/></>),
  bell:      () => s(<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>),
  search:    () => s(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  logout:    () => s(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
}

function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Sidebar({ activeView, onNavigate, profile, session, onSignOut, onReplayTour, isAdmin, globalSearch, setGlobalSearch, showGlobalSearch, setShowGlobalSearch, searchResults }) {
  const sections = [
    {
      label: 'INICIO',
      items: [{ key: 'dashboard', icon: 'dashboard', label: 'Dashboard' }],
    },
    {
      label: 'TERRITORIO',
      items: [
        { key: 'gestora', icon: 'pin', label: 'Mi Territorio' },
        { key: 'input', icon: 'edit', label: 'Registro de Campo' },
        { key: 'actores', icon: 'users', label: 'Actores' },
      ],
    },
    {
      label: 'ESTRATEGIA SOCIAL',
      items: [
        { key: 'huella', icon: 'leaf', label: 'Huella Social' },
        { key: 'kpis', icon: 'target', label: 'Indicadores' },
        { key: 'riesgos', icon: 'alert', label: 'Riesgos Sociales' },
      ],
    },
    {
      label: 'AMBIENTAL',
      items: [
        { key: 'ambiental', icon: 'leaf', label: 'Gestión Ambiental' },
      ],
    },
    ...(isAdmin ? [{
      label: 'ADMIN',
      items: [
        { key: 'knowledge', icon: 'brain', label: 'Base Conocimiento' },
        { key: 'dac', icon: 'bell', label: 'Direccion' },
      ],
    }] : []),
  ]

  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: C.navy,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Montserrat', sans-serif",
      position: 'fixed', left: 0, top: 0, zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <img src="/logo-conecta-white.svg" alt="Caribe LNG Conecta" style={{ height: 48, maxWidth: '100%' }} />
      </div>

      {/* Global search */}
      <div style={{ padding: '12px 16px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
            <Icons.search />
          </span>
          <input
            value={globalSearch || ''}
            onChange={e => { setGlobalSearch(e.target.value); setShowGlobalSearch(!!e.target.value) }}
            onFocus={() => { if (globalSearch) setShowGlobalSearch(true) }}
            placeholder="Buscar todo..."
            style={{
              width: '100%', padding: '8px 10px 8px 34px', fontSize: 12,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: 'white', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
        {showGlobalSearch && globalSearch?.length >= 2 && searchResults && (
          <div style={{
            position: 'absolute', top: '100%', left: 16, right: 16, marginTop: 4,
            background: '#1a2744', borderRadius: 10, padding: 6, zIndex: 300,
            maxHeight: 350, overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}>
            {searchResults.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Sin resultados</div>
            ) : searchResults.map((r, i) => (
              <div key={i} onClick={() => { r.action(); setShowGlobalSearch(false); setGlobalSearch('') }}
                style={{ padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                {r.sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{r.sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {sections.map(section => (
          <div key={section.label} style={{ marginTop: 14 }}>
            <div style={{
              padding: '4px 22px 6px',
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              letterSpacing: 1.5,
            }}>
              {section.label}
            </div>
            {section.items.map(item => {
              const isActive = activeView === item.key
              const IconEl = Icons[item.icon]
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '9px 22px',
                    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    borderLeft: isActive ? `3px solid ${C.barbosa}` : '3px solid transparent',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' } }}
                >
                  <span style={{ color: isActive ? C.barbosa : 'rgba(255,255,255,0.7)', display: 'flex' }}>
                    <IconEl />
                  </span>
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Boton ver tour */}
      {onReplayTour && (
        <button onClick={onReplayTour} style={{
          margin: '0 16px 8px', padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          💡 Ver tour de bienvenida
        </button>
      )}

      {/* User footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" style={{ width: 30, height: 30, borderRadius: '50%' }} />
          : <div style={{ width: 30, height: 30, borderRadius: 15, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {initials(profile?.full_name || session?.user?.email)}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.full_name || 'Usuario'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
            {profile?.territorio || profile?.role || ''}
          </div>
        </div>
        <button onClick={onSignOut} style={{
          background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4, display: 'flex',
        }} title="Salir">
          <Icons.logout />
        </button>
      </div>
    </aside>
  )
}
