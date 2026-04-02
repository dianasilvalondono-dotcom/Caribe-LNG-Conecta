import { useState } from 'react'
import { C, SEMAFORO, getTipoColor, initials } from '../lib/constants'

export default function ActorCard({ actor, onClick }) {
  const [hovered, setHovered] = useState(false)
  const sc = SEMAFORO[actor.semaforo] || SEMAFORO.amarillo
  const tc = getTipoColor(actor.tipo)
  return (
    <div onClick={() => onClick(actor)}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white', borderRadius: 14, padding: '14px 16px',
        cursor: 'pointer', boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.07)',
        border: `1px solid ${hovered ? sc.color + '44' : '#e8ecf0'}`,
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden',
        display: 'flex', gap: 12, alignItems: 'flex-start'
      }}>
      {/* Color bar top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: sc.color, borderRadius: '14px 14px 0 0' }} />
      {/* Avatar */}
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tc}15`, color: tc,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, flexShrink: 0, letterSpacing: '0.5px' }}>
        {initials(actor.nombre)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + semáforo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, flexShrink: 0, boxShadow: `0 0 6px ${sc.color}60` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2926', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.nombre}</span>
        </div>
        {/* Type + territory */}
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{actor.tipo} · {actor.territorio}</div>
        {/* Tags */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
            background: sc.color + '15', color: sc.color }}>{actor.posicion}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
            background: '#f1f5f9', color: '#64748b' }}>P:{actor.poder} I:{actor.interes}</span>
          {actor.prioridad === 'A' && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100,
              background: '#fef3c7', color: '#92400e' }}>Prioridad A</span>
          )}
        </div>
      </div>
    </div>
  )
}
