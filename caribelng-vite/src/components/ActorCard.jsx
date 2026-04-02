import { C, SEMAFORO, getTipoColor } from '../lib/constants'
import { Avatar, Tag, SemDot } from './ui'

export default function ActorCard({ actor, onClick }) {
  const sc = SEMAFORO[actor.semaforo] || SEMAFORO.amarillo
  return (
    <div onClick={() => onClick(actor)} style={{ background: C.card, borderRadius: 10, padding: '12px 14px',
      cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      border: `1px solid ${C.border}`, borderLeft: `3px solid ${sc.color}`,
      transition: 'all 0.15s', display: 'flex', gap: 10, alignItems: 'flex-start' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'none' }}>
      <Avatar name={actor.nombre} size={38} color={getTipoColor(actor.tipo)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <SemDot s={actor.semaforo} size={7} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.nombre}</span>
        </div>
        <div style={{ fontSize: 15, color: C.muted, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.tipo}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag color={sc.color}>{actor.posicion}</Tag>
          <Tag color={C.muted}>P:{actor.poder} I:{actor.interes}</Tag>
          {actor.prioridad === 'A' && <Tag color='#92400e' bg='#fef3c7'>Prioridad A</Tag>}
        </div>
      </div>
    </div>
  )
}
