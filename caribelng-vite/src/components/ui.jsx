import { C, SEMAFORO, getTipoColor, initials } from '../lib/constants'

export function Avatar({ name, size = 40, color }) {
  const c = color || getTipoColor(name)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: c, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, flexShrink: 0 }}>
      {initials(name)}
    </div>
  )
}

export function Tag({ children, color = C.accent, bg }) {
  return (
    <span style={{ fontSize: 16, background: bg || color + '22', color,
      padding: '2px 8px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export function Pill({ value, max = 5, color = C.accent }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: 2,
          background: i < value ? color : '#e2e8f0' }} />
      ))}
    </div>
  )
}

export function Bar({ value, color = C.accent, height = 6 }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color,
        borderRadius: height / 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export function StatCard({ label, value, sub, color = C.navy, icon, compact }) {
  return (
    <div style={{ background: C.card, borderRadius: 10, padding: compact ? '8px 10px' : '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: compact ? 22 : 38, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: compact ? 10 : 15, color: C.muted, marginTop: 2, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          {sub && <div style={{ fontSize: compact ? 10 : 15, color: C.subtle, marginTop: 1 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: compact ? 14 : 26, opacity: 0.12 }}>{icon}</div>}
      </div>
    </div>
  )
}

export function SemDot({ s, size = 9 }) {
  const sc = SEMAFORO[s] || SEMAFORO.amarillo
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%',
    background: sc.color, flexShrink: 0 }} />
}

export function InfoRow({ label, val }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', minWidth: 76, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 16, color: C.text }}>{val}</span>
    </div>
  )
}

export function Block({ label, bg, color, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ background: bg, borderRadius: 8, padding: '8px 12px', fontSize: 14, color, lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

export function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px',
          fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: C.text }} />
    </div>
  )
}
