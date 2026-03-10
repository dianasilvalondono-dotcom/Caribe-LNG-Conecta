import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, signInWithMicrosoft, signOut, getProfile, upsertProfile,
         getActors, getAgreements, getInteractions, addInteraction, updateActor, updateAgreementAvance } from './lib/supabase'

// ━━ Design tokens ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const C = {
  navy:    '#0f2744',
  blue:    '#1e3a5f',
  accent:  '#3b82f6',
  tolu:    '#0ea5e9',
  barbosa: '#8b5cf6',
  green:   '#22c55e',
  yellow:  '#eab308',
  orange:  '#f97316',
  red:     '#ef4444',
  bg:      '#f8fafc',
  card:    '#ffffff',
  border:  '#f1f5f9',
  text:    '#0f172a',
  muted:   '#64748b',
  subtle:  '#94a3b8',
}

const SEMAFORO = {
  verde:    { color: C.green,  bg: '#dcfce7', label: 'Verde',    dot: 🟢 },
  amarillo: { color: C.yellow, bg: '#fef9c3', label: 'Amarillo', dot: 🟡 },
  naranja:  { color: C.orange, bg: '#ffedd5', label: 'Naranja',  dot: 🟠 },
  rojo:     { color: C.red,    bg: '#fee2e2', label: 'Rojo',     dot: 🔴 },
}

const TIPO_COLOR = {
  Comunitario: C.tolu, Político: '#ec4899', Institucional: C.barbosa,
  Empresarial: '#f59e0b', Mediático: C.muted, Social: '#10b981', Educativo: '#06b6d4',
}
function getTipoColor(tipo = '') {
  for (const k of Object.keys(TIPO_COLOR)) if (tipo.includes(k)) return TIPO_COLOR[k]
  return C.subtle
}
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ━━ Tiny UI helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Avatar({ name, size = 40, color }) {
  const c = color || getTipoColor(name)
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: c, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, flexShrink: 0 }}>
      {initials(name)}
    </div>
  )
}

function Tag({ children, color = C.accent, bg }) {
  return (
    <span style={{ fontSize: 10, background: bg || color + '22', color,
      padding: '2px 8px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Pill({ value, max = 5, color = C.accent }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: 2,
          background: i < value ? color : '#e2e8f0' }} />
      ))}
    </div>
  )
}

function Bar({ value, color = C.accent, height = 6 }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color,
        borderRadius: height / 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function StatCard({ label, value, sub, color = C.navy, icon }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 26, opacity: 0.12 }}>{icon}</div>}
      </div>
    </div>
  )
}

function SemDot({ s, size = 9 }) {
  const sc = SEMAFORO[s] || SEMAFORO.amarillo
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%',
    background: sc.color, flexShrink: 0 }} />
}

// ━━ Login screen ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 380, width: '100%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${C.accent}, ${C.tolu})`,
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 16px' }}>⚡</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>
          Caribe LNG
        </h1>
        <p style={{ margin: '0 0 8px', color: C.muted, fontSize: 13 }}>
          Centro de Relacionamiento 2026
        </p>
        <p style={{ margin: '0 0 28px', color: C.subtle, fontSize: 12 }}>
          Tolú →  Barbosa →  Nacional
        </p>
        <input type="email" placeholder="Correo electrónico" value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
            fontSize: 14, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
        <input type="password" placeholder="Contraseña" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
            fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' }} />
        {error && <p style={{ color: C.red, fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', background: loading ? '#f1f5f9' : C.navy, border: 'none',
            borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', color: 'white', transition: 'all 0.15s' }}>
          {loading ? 'Conectando...' : 'Entrar'}
        </button>
        <p style={{ margin: '16px 0 0', fontSize: 11, color: C.subtle }}>
          Solo para equipo Caribe LNG →  Acceso controlado por rol
        </p>
      </div>
    </div>
  )
}

// ━━ Actor card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ActorCard({ actor, onClick }) {
  const sc = SEMAFORO[actor.semaforo] || SEMAFORO.amarillo
  return (
    <div onClick={() => onClick(actor)} style={{ background: C.card, borderRadius: 10, padding: '13px 15px',
      cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: `1px solid ${C.border}`,
      transition: 'all 0.15s', display: 'flex', gap: 11, alignItems: 'flex-start' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'none' }}>
      <Avatar name={actor.nombre} size={38} color={getTipoColor(actor.tipo)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <SemDot s={actor.semaforo} size={7} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.nombre}</span>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.tipo}</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag color={sc.color}>{actor.posicion}</Tag>
          <Tag color={C.muted}>P:{actor.poder} I:{actor.interes}</Tag>
          {actor.prioridad === 'A' && <Tag color='#92400e' bg='#fef3c7'>Prioridad A</Tag>}
        </div>
      </div>
    </div>
  )
}

// ━━ Actor Modal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ActorModal({ actor, session, onClose, onUpdated }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState('Visita')
  const [resumen, setResumen] = useState('')
  const [newSemaforo, setNewSemaforo] = useState(actor.semaforo)
  const [saving, setSaving] = useState(false)
  // community fields
  const [cumple, setCumple] = useState(actor.cumpleanos || '')
  const [hijos, setHijos] = useState(actor.hijos || '')
  const [notasPer, setNotasPer] = useState(actor.notas_personales || '')
  const [proximoPaso, setProximoPaso] = useState(actor.proximo_paso || '')

  useEffect(() => {
    getInteractions(actor.id).then(d => { setInteractions(d || []); setLoading(false) })
  }, [actor.id])

  async function handleSave() {
    if (!resumen.trim()) return
    setSaving(true)
    try {
      await addInteraction({ actorId: actor.id, tipo, resumen, semaforo_nuevo: newSemaforo, userId: session.user.id })
      await updateActor(actor.id, { cumpleanos: cumple || null, hijos, notas_personales: notasPer, proximo_paso: proximoPaso })
      setResumen('')
      const fresh = await getInteractions(actor.id)
      setInteractions(fresh || [])
      onUpdated()
    } finally { setSaving(false) }
  }

  const sc = SEMAFORO[actor.semaforo] || SEMAFORO.amarillo
  const isCommunity = actor.tipo?.includes('Comunitario') || actor.tipo?.includes('Local')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '88vh', overflowY: 'auto', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar name={actor.nombre} size={48} color={getTipoColor(actor.tipo)} />
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{actor.nombre}</h2>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{actor.tipo} →  {actor.nivel}</div>
              <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>{actor.territorio} →  {actor.area}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.subtle, padding: 0 }}>✕</button>
        </div>

        {/* Key info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Semáforo', val: <span style={{ color: sc.color, fontWeight: 700 }}>{sc.dot} {sc.label}</span> },
            { label: 'Posición', val: actor.posicion },
            { label: 'Riesgo', val: <span style={{ color: actor.riesgo === 'Alto' || actor.riesgo === 'Muy Alto' ? C.red : actor.riesgo === 'Medio' ? C.orange : C.green, fontWeight: 700 }}>{actor.riesgo}</span> },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Power/interest */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>PODER</div><Pill value={actor.poder} color={C.accent} /></div>
          <div><div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>INTERÉS</div><Pill value={actor.interes} color={C.barbosa} /></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 10, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>CUADRANTE</div><div style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>{actor.cuadrante}</div></div>
        </div>

        {actor.owner && <InfoRow label="Owner" val={actor.owner} />}
        {actor.frecuencia && <InfoRow label="Frecuencia" val={actor.frecuencia} />}
        {actor.contacto && <InfoRow label="Contacto" val={actor.contacto} />}

        {actor.que_hacemos && (
          <Block label="Qué hacemos" bg="#f0fdf4" color="#166534">{actor.que_hacemos}</Block>
        )}
        {actor.riesgo_desc && (
          <Block label="Riesgo identificado" bg="#fff7ed" color="#9a3412">{actor.riesgo_desc}</Block>
        )}

        {/* Community fields */}
        {isCommunity && (
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }}>
            <div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Datos comunitarios</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <Field label="Cumpleaños" value={cumple} onChange={setCumple} type="date" />
              <Field label="Hijos" value={hijos} onChange={setHijos} placeholder="Nombres / edades" />
            </div>
            <Field label="Próximo paso" value={proximoPaso} onChange={setProximoPaso} placeholder="Ej: Llamar para reunión la próxima semana" />
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notas personales</label>
              <textarea value={notasPer} onChange={e => setNotasPer(e.target.value)}
                placeholder="Lo que hay que recordar: gustos, familia, tensiones..."
                style={{ width: '100%', border: `1px solid #e2e8f0`, borderRadius: 8, padding: '8px 10px', fontSize: 12,
                  resize: 'none', height: 60, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
            </div>
          </div>
        )}

        {/* Log interaction */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Registrar novedad</div>
          {/* Tipo */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {['Visita', 'Llamada', 'Reunión', 'Evento', 'WhatsApp'].map(t => (
              <button key={t} onClick={() => setTipo(t)}
                style={{ background: tipo === t ? C.navy : '#f1f5f9', color: tipo === t ? 'white' : C.text,
                  border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                {t}
              </button>
            ))}
          </div>
          {/* New semaforo */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {Object.entries(SEMAFORO).map(([k, v]) => (
              <button key={k} onClick={() => setNewSemaforo(k)}
                style={{ flex: 1, background: newSemaforo === k ? v.bg : '#f8fafc',
                  border: `2px solid ${newSemaforo === k ? v.color : 'transparent'}`,
                  borderRadius: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 11,
                  fontWeight: 700, color: v.color }}>
                {v.dot}
              </button>
            ))}
          </div>
          <textarea value={resumen} onChange={e => setResumen(e.target.value)}
            placeholder="¿Qué pasó? ¿Qué dijo? ¿Hay algo urgente que escalar?"
            style={{ width: '100%', border: `1px solid #e2e8f0`, borderRadius: 8, padding: '9px 11px', fontSize: 13,
              resize: 'none', height: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
          <button onClick={handleSave} disabled={saving || !resumen.trim()}
            style={{ marginTop: 8, width: '100%', background: saving ? '#94a3b8' : C.navy, color: 'white',
              border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 💾 Guardando...' : 💾 Guardar novedad'}
          </button>
        </div>

        {/* History */}
        {interactions.length > 0 && (
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Historial</div>
            {interactions.slice(0, 5).map(i => (
              <div key={i.id} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: i.semaforo_nuevo ? SEMAFORO[i.semaforo_nuevo]?.color : C.subtle, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{i.tipo}</span>
                    <span style={{ fontSize: 10, color: C.subtle }}>{new Date(i.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                    {i.profiles?.full_name && <span style={{ fontSize: 10, color: C.subtle }}>— {i.profiles.full_name}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{i.resumen}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, val }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 10, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', minWidth: 76, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.text }}>{val}</span>
    </div>
  )
}

function Block({ label, bg, color, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color, background: bg, padding: '9px 11px', borderRadius: 8, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 12,
          outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: C.text }} />
    </div>
  )
}

// ━━ Agreement card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AgreementCard({ ag, canEdit, onEdit }) {
  const isT = ag.territorio === 'Tolú'
  const stC = { cumplido: C.green, en_curso: C.accent, estructural: C.barbosa, por_estructurar: C.yellow }
  const barColor = stC[ag.estado_code] || C.accent

  return (
    <div style={{ background: C.card, borderRadius: 12, padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `5px solid ${isT ? C.tolu : C.barbosa}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <Tag color={isT ? '#0369a1' : '#5b21b6'} bg={isT ? '#e0f2fe' : '#ede9fe'}>{ag.id} →  {ag.territorio}</Tag>
            <Tag color={barColor}>{ag.estado}</Tag>
          </div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{ag.nombre}</h3>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: barColor, lineHeight: 1 }}>{ag.avance}%</div>
          {canEdit && (
            <button onClick={() => onEdit(ag)} style={{ marginTop: 4, background: '#f1f5f9', border: 'none',
              borderRadius: 6, padding: '3px 8px', fontSize: 10, cursor: 'pointer', color: C.muted }}>
              Editar
            </button>
          )}
        </div>
      </div>
      <Bar value={ag.avance} color={barColor} height={5} />
      <div style={{ marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700, color: C.text }}>Intervenciones: </span>{ag.intervenciones}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>
        <span style={{ fontWeight: 700, color: C.text }}>Actores: </span>{ag.actores}
      </div>
      <div style={{ marginTop: 8, background: '#f0fdf4', borderRadius: 8, padding: '8px 11px', fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700 }}>Huella: </span>{ag.huella}
      </div>
      {ag.notas && <div style={{ marginTop: 6, fontSize: 11, color: C.orange, fontWeight: 600 }}>{ag.notas}</div>}
    </div>
  )
}

// ━━ Main App ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)

  const [view, setView] = useState('dashboard')
  const [actors, setActors] = useState([])
  const [agreements, setAgreements] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedActor, setSelectedActor] = useState(null)
  const [search, setSearch] = useState('')
  const [filterT, setFilterT] = useState('Todos')
  const [filterS, setFilterS] = useState('Todos')
  const [filterR, setFilterR] = useState('Todos')

  // ━━ Auth ━━
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    const u = session.user
    upsertProfile(u.id, { full_name: u.user_metadata?.full_name, avatar_url: u.user_metadata?.avatar_url, email: u.email })
    getProfile(u.id).then(setProfile)
  }, [session])

  // ━━ Data ━━
  const loadData = useCallback(async () => {
    if (!session) return
    setDataLoading(true)
    try {
      const [a, ag] = await Promise.all([getActors(), getAgreements()])
      setActors(a || [])
      setAgreements(ag || [])
    } finally { setDataLoading(false) }
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  // ━━ Realtime ━━
  useEffect(() => {
    if (!session) return
    const ch = supabase.channel('crm-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actors' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements' }, () => loadData())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [session, loadData])

  const stats = useMemo(() => ({
    total: actors.length,
    verde: actors.filter(a => a.semaforo === 'verde').length,
    amarillo: actors.filter(a => a.semaforo === 'amarillo').length,
    naranja: actors.filter(a => a.semaforo === 'naranja').length,
    rojo: actors.filter(a => a.semaforo === 'rojo').length,
    prioA: actors.filter(a => a.prioridad === 'A').length,
    alto: actors.filter(a => a.riesgo === 'Alto' || a.riesgo === 'Muy Alto').length,
    tolu: actors.filter(a => a.territorio === 'Tolú').length,
    barbosa: actors.filter(a => a.territorio === 'Barbosa').length,
    nacional: actors.filter(a => a.territorio === 'Nacional').length,
  }), [actors])

  const filtered = useMemo(() => actors.filter(a => {
    if (search && !a.nombre?.toLowerCase().includes(search.toLowerCase()) && !a.tipo?.toLowerCase().includes(search.toLowerCase()) && !(a.contacto || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterT !== 'Todos' && a.territorio !== filterT) return false
    if (filterS !== 'Todos' && a.semaforo !== filterS) return false
    if (filterR !== 'Todos' && a.riesgo?.toLowerCase() !== filterR.toLowerCase()) return false
    return true
  }), [actors, search, filterT, filterS, filterR])

  const isAdmin = profile?.role === 'admin'
  const isGestora = profile?.role === 'gestora' || isAdmin
  const myTerritorio = profile?.territorio

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cargando...</div>
    </div>
  )
  if (!session) return <LoginScreen />

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 📊 },
    { id: 'actores', label: 'Actores', icon:  },
    { id: 'acuerdos', label: 'Acuerdos', icon:  },
    ...(isGestora ? [{ id: 'gestora', label: 'Mi territorio', icon: }] : []),
  ]

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: '100vh', background: C.bg, color: C.text }}>
      {/* Top nav */}
      <div style={{ background: C.navy, color: 'white', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${C.accent}, ${C.tolu})`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.3 }}>Caribe LNG</div>
              <div style={{ fontSize: 9, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Centro de Relacionamiento 2026</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                style={{ background: view === n.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                  color: view === n.id ? '#93c5fd' : 'rgba(255,255,255,0.55)',
                  border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{n.icon}</span><span>{n.label}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
              : <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>{initials(profile?.full_name || session.user.email)}</div>
            }
            <button onClick={signOut}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
                padding: '4px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer' }}>
              Salir
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>

        {/* ━━ DASHBOARD ━━ */}
        {view === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Dashboard Ejecutivo</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>Resumen de relacionamiento →  Caribe LNG 2026 →  Tiempo real</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard label="Actores totales" value={stats.total} sub={`${stats.prioA} prioridad A`} color={C.navy} icon=👥 />
              <StatCard label="Relación estable 🟢 value={stats.verde} color={C.green} icon=✅ />
              <StatCard label="En atención" value={stats.amarillo + stats.naranja} sub="Amarillo + Naranja" color={C.orange} icon="⚠️" />
              <StatCard label="Críticos 🔴 value={stats.rojo} color={C.red} icon=🚨 />
              <StatCard label="Riesgo alto" value={stats.alto} color='#dc2626' icon=⚠️ />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Tolú', value: stats.tolu, color: C.tolu, desc: 'Terminal marítima →  Sucre' },
                { label: 'Barbosa', value: stats.barbosa, color: C.barbosa, desc: 'Planta regasificación →  Antioquia' },
                { label: 'Nacional', value: stats.nacional, color: C.muted, desc: 'Legislativo →  Regulatorio' },
              ].map(t => (
                <div key={t.label} style={{ background: C.card, borderRadius: 12, padding: '14px 18px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `4px solid ${t.color}` }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: t.color }}>{t.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Semaforo chart */}
              <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: C.text }}>Semáforo de relacionamiento</h3>
                {[['verde', 'Relación estable', stats.verde], ['amarillo', 'Requiere atención', stats.amarillo],
                  ['naranja', 'Riesgo moderado', stats.naranja], ['rojo', 'Crítico', stats.rojo]].map(([k, lbl, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <SemDot s={k} size={9} />
                    <span style={{ fontSize: 12, color: C.muted, width: 140 }}>{lbl}</span>
                    <div style={{ flex: 1 }}><Bar value={stats.total ? (v / stats.total) * 100 : 0} color={SEMAFORO[k].color} /></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: SEMAFORO[k].color, width: 24, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Agreements summary */}
              <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: C.text }}>Estado de acuerdos territoriales</h3>
                {agreements.map(ag => {
                  const barColor = { cumplido: C.green, en_curso: C.accent, estructural: C.barbosa, por_estructurar: C.yellow }[ag.estado_code] || C.accent
                  return (
                    <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, width: 22 }}>{ag.id}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: C.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.nombre}</div>
                        <Bar value={ag.avance} color={barColor} height={5} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, width: 30, textAlign: 'right', color: barColor }}>{ag.avance}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Critical actors */}
            <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: C.text }}>⚠️ Actores críticos — Acción requerida</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {actors.filter(a => a.semaforo === 'rojo' && a.prioridad === 'A').slice(0, 8).map(a => (
                  <div key={a.id} onClick={() => { setSelectedActor(a); setView('actores') }}
                    style={{ display: 'flex', gap: 10, background: '#fff5f5', borderRadius: 8,
                      padding: '10px 12px', border: '1px solid #fecaca', cursor: 'pointer', alignItems: 'flex-start' }}>
                    <Avatar name={a.nombre} size={30} color={getTipoColor(a.tipo)} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{a.territorio} →  {a.tipo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ━━ ACTORES ━━ */}
        {view === 'actores' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Base de Actores</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>{filtered.length} de {actors.length} actores</p>
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: '12px 14px', marginBottom: 14,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder=🔍  Buscar por nombre, tipo..."
                style={{ flex: 1, minWidth: 180, border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 11px',
                  fontSize: 13, outline: 'none', color: C.text, fontFamily: 'inherit' }} />
              {[
                { val: filterT, set: setFilterT, label: 'Territorio', opts: ['Todos', 'Tolú', 'Barbosa', 'Nacional'] },
                { val: filterS, set: setFilterS, label: 'Semáforo', opts: ['Todos', 'verde', 'amarillo', 'naranja', 'rojo'] },
                { val: filterR, set: setFilterR, label: 'Riesgo', opts: ['Todos', 'Bajo', 'Medio', 'Alto', 'Muy Alto'] },
              ].map(f => (
                <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 12,
                    outline: 'none', color: C.text, background: 'white', fontFamily: 'inherit', cursor: 'pointer' }}>
                  {f.opts.map(o => <option key={o} value={o}>{f.label}: {o}</option>)}
                </select>
              ))}
            </div>
            {dataLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>Cargando actores...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10 }}>
                {filtered.map(a => <ActorCard key={a.id} actor={a} onClick={setSelectedActor} />)}
              </div>
            )}
          </div>
        )}

        {/* ━━ ACUERDOS ━━ */}
        {view === 'acuerdos' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Acuerdos Territoriales</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>6 acuerdos →  3 Barbosa →  3 Tolú →  Co-responsabilidad comunitaria</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {['Barbosa', 'Tolú'].map(t => (
                <div key={t}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 20, background: t === 'Tolú' ? C.tolu : C.barbosa, borderRadius: 2 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{t}</div>
                      <div style={{ fontSize: 11, color: C.subtle }}>{t === 'Tolú' ? 'Terminal marítima' : 'Planta de regasificación'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {agreements.filter(a => a.territorio === t).map(ag => (
                      <AgreementCard key={ag.id} ag={ag} canEdit={isGestora} onEdit={() => {}} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ━━ GESTORA VIEW ━━ */}
        {view === 'gestora' && isGestora && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}> 📍Mi Territorio</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>{profile?.full_name} →  {myTerritorio || 'Todos los territorios'}</p>
            </div>
            {/* Priority actors */}
            <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700 }}>⚠️ Actores que necesitan atención hoy</h3>
              {actors.filter(a => (myTerritorio ? a.territorio === myTerritorio : true) && (a.semaforo === 'rojo' || a.semaforo === 'naranja')).slice(0, 6).map(a => (
                <div key={a.id} onClick={() => setSelectedActor(a)}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0',
                    borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  <SemDot s={a.semaforo} size={10} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.nombre}</div>
                    <div style={{ fontSize: 11, color: C.subtle }}>{a.tipo}</div>
                  </div>
                  <span style={{ fontSize: 13, color: C.subtle }}>›</span>
                </div>
              ))}
            </div>
            {/* Birthday widget */}
            <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>🎂 Próximos cumpleaños</h3>
              {(() => {
                const today = new Date()
                const upcoming = actors.filter(a => a.cumpleanos).map(a => {
                  const d = new Date(a.cumpleanos)
                  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
                  if (next < today) next.setFullYear(today.getFullYear() + 1)
                  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
                  return { ...a, diff, dateStr: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) }
                }).filter(a => a.diff <= 30).sort((a, b) => a.diff - b.diff)
                if (!upcoming.length) return <div style={{ fontSize: 12, color: C.subtle, fontStyle: 'italic' }}>Sin cumpleaños en los próximos 30 días — agrega fechas al abrir un actor comunitario.</div>
                return upcoming.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{a.nombre}</div>
                      <div style={{ fontSize: 11, color: C.subtle }}>{a.dateStr}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: a.diff <= 7 ? C.red : C.orange }}>
                      {a.diff === 0 ? '¡Hoy! 🎉 : `En ${a.diff} días`}
                    </div>
                  </div>
                ))
              })()}
            </div>
            <p style={{ fontSize: 12, color: C.subtle, textAlign: 'center' }}>
              Abre cualquier actor desde "Actores" para registrar novedades en tiempo real.
            </p>
          </div>
        )}
      </div>

      {selectedActor && (
        <ActorModal actor={selectedActor} session={session}
          onClose={() => setSelectedActor(null)} onUpdated={loadData} />
      )}
    </div>
  )
}

