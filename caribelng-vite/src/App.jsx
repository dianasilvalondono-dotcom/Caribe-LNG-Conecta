import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, signInWithMicrosoft, signOut, getProfile, upsertProfile,
         getActors, getAgreements, getInteractions, addInteraction, updateActor, updateAgreementAvance,
         getCronograma, getHuellaSocial, updateCronogramaEstado,
         getReportesSemanales, addReporteSemanal, getSeguimientoAcuerdos, addSeguimientoAcuerdo, updateSeguimientoAcuerdo,
         getRiesgos, getBowTie, getRiesgosLegislativos, getCronogramaLegislativo } from './lib/supabase'

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
  verde:    { color: C.green,  bg: '#dcfce7', label: 'Verde',    dot: '🟢' },
  amarillo: { color: C.yellow, bg: '#fef9c3', label: 'Amarillo', dot: '🟡' },
  naranja:  { color: C.orange, bg: '#ffedd5', label: 'Naranja',  dot: '🟠' },
  rojo:     { color: C.red,    bg: '#fee2e2', label: 'Rojo',     dot: '🔴' },
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
            {saving ? '💾 Guardando...' : '💾 Guardar novedad'}
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




// RiesgosView component
function RiesgosView({ riesgos, riesgosLeg, cronoLeg }) {
  const [tab, setTab] = useState('mapa')
  const [expandedRisk, setExpandedRisk] = useState(null)
  const [bowTieData, setBowTieData] = useState({})

  async function toggleRisk(rid) {
    if (expandedRisk === rid) { setExpandedRisk(null); return }
    setExpandedRisk(rid)
    if (!bowTieData[rid]) {
      const data = await getBowTie(rid)
      setBowTieData(prev => ({ ...prev, [rid]: data || [] }))
    }
  }

  function getSemaforoColor(sem) {
    if (!sem) return C.subtle
    if (sem.includes('Alto') || sem.includes('Rojo')) return C.red
    if (sem.includes('Medio') || sem.includes('Vigilar')) return C.yellow
    if (sem.includes('Bajo') || sem.includes('control')) return C.green
    if (sem.includes('Revision') || sem.includes('Azul')) return C.accent
    return C.subtle
  }

  function getNivelColor(nivel) {
    if (!nivel) return C.subtle
    const n = nivel.toUpperCase()
    if (n.includes('MUY ALTO')) return '#7f1d1d'
    if (n.includes('ALTO')) return C.red
    if (n.includes('MEDIO')) return C.orange
    if (n.includes('BAJO')) return C.green
    return C.subtle
  }

  const rojos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente')))
  const amarillos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Medio') || r.semaforo.includes('Vigilar')))
  const verdes = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Bajo') || r.semaforo.includes('control')))
  const azules = riesgos.filter(r => r.semaforo && r.semaforo.includes('Revision'))

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Mapa de Riesgos</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>{riesgos.length} riesgos sociales, institucionales y legislativos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Accion inmediata', count: rojos.length, color: C.red, bg: '#fee2e2' },
          { label: 'Vigilar', count: amarillos.length, color: C.yellow, bg: '#fef9c3' },
          { label: 'Bajo control', count: verdes.length, color: C.green, bg: '#dcfce7' },
          { label: 'En revision', count: azules.length, color: C.accent, bg: '#dbeafe' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 16px', borderLeft: `4px solid ${s.color}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{ id: 'mapa', label: 'Mapa de Riesgos' }, { id: 'legislativo', label: 'Riesgos Legislativos' }, { id: 'cronograma', label: 'Cronograma Politico' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? C.navy : '#f1f5f9', color: tab === t.id ? 'white' : C.text,
              border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mapa' && (
        <div>
          {riesgos.map(r => {
            const semColor = getSemaforoColor(r.semaforo)
            const isExp = expandedRisk === r.id
            const bt = bowTieData[r.id] || []
            return (
              <div key={r.id} style={{ background: C.card, borderRadius: 12, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${semColor}`, overflow: 'hidden' }}>
                <div onClick={() => toggleRisk(r.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'white', background: semColor, padding: '2px 8px', borderRadius: 10 }}>{r.id}</span>
                      <span style={{ fontSize: 10, color: C.muted }}>{r.zona}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Tag color={C.muted}>P: {r.probabilidad}</Tag>
                      <Tag color={semColor}>I: {r.impacto}</Tag>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{r.nombre}</div>
                  {!isExp && r.que_hacemos && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.que_hacemos}</div>}
                </div>
                {isExp && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
                    <div style={{ paddingTop: 12 }}>
                      {r.descripcion && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 10, background: '#fff7ed', padding: '8px 10px', borderRadius: 8 }}><span style={{ fontWeight: 700, color: '#9a3412' }}>Que puede pasar: </span>{r.descripcion}</div>}
                      {r.quien_detona && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.red }}>Quien detona: </span>{r.quien_detona}</div>}
                      {r.quien_mitiga && <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.green }}>Quien mitiga: </span>{r.quien_mitiga}</div>}
                      {r.que_hacemos && <div style={{ fontSize: 11, color: '#166534', background: '#f0fdf4', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5, marginBottom: 10 }}><span style={{ fontWeight: 700 }}>Que estamos haciendo: </span>{r.que_hacemos}</div>}
                      {bt.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Analisis Bow-Tie</div>
                          {bt.map((b, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, marginBottom: 8, fontSize: 10, lineHeight: 1.4 }}>
                              <div>
                                {b.causa && <div style={{ background: '#fee2e2', padding: '6px 8px', borderRadius: 6, color: '#991b1b', marginBottom: 3 }}><span style={{ fontWeight: 700 }}>Causa: </span>{b.causa}</div>}
                                {b.control_preventivo && <div style={{ background: '#dbeafe', padding: '6px 8px', borderRadius: 6, color: '#1e40af' }}><span style={{ fontWeight: 700 }}>Ctrl prev: </span>{b.control_preventivo}</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', color: C.subtle, fontSize: 16, padding: '0 4px' }}>&rarr;</div>
                              <div>
                                {b.control_detectivo && <div style={{ background: '#fef9c3', padding: '6px 8px', borderRadius: 6, color: '#854d0e', marginBottom: 3 }}><span style={{ fontWeight: 700 }}>Ctrl det: </span>{b.control_detectivo}</div>}
                                {b.consecuencia && <div style={{ background: '#fce7f3', padding: '6px 8px', borderRadius: 6, color: '#9d174d' }}><span style={{ fontWeight: 700 }}>Consecuencia: </span>{b.consecuencia}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'legislativo' && (
        <div>
          {riesgosLeg.map(r => {
            const nivelColor = getNivelColor(r.nivel_riesgo)
            return (
              <div key={r.id} style={{ background: C.card, borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${nivelColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3, flex: 1 }}>{r.tema}</div>
                  <Tag color={nivelColor}>{r.nivel_riesgo}</Tag>
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>{r.descripcion}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <Tag color={C.muted}>Prob: {r.probabilidad}</Tag>
                  <Tag color={C.accent}>{r.comision}</Tag>
                </div>
                {r.impacto && <div style={{ fontSize: 11, color: '#9a3412', background: '#fff7ed', padding: '6px 8px', borderRadius: 6, lineHeight: 1.5, marginBottom: 6 }}><span style={{ fontWeight: 700 }}>Impacto: </span>{r.impacto}</div>}
                {r.acciones_preventivas && <div style={{ fontSize: 11, color: '#166534', background: '#f0fdf4', padding: '6px 8px', borderRadius: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700 }}>Acciones: </span>{r.acciones_preventivas}</div>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'cronograma' && (
        <div>
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e2e8f0' }} />
            {cronoLeg.map(ev => {
              const nivelColor = getNivelColor(ev.nivel_riesgo)
              return (
                <div key={ev.id} style={{ position: 'relative', marginBottom: 16, paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: -16, top: 6, width: 12, height: 12, borderRadius: '50%', background: nivelColor, border: '2px solid white', boxShadow: '0 0 0 2px ' + nivelColor }} />
                  <div style={{ background: C.card, borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${nivelColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div><span style={{ fontSize: 10, fontWeight: 700, color: nivelColor, textTransform: 'uppercase' }}>{ev.fecha}</span> <Tag color={C.muted} bg="#f1f5f9">{ev.tipo}</Tag></div>
                      <Tag color={nivelColor}>{ev.nivel_riesgo}</Tag>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{ev.evento}</div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>{ev.impacto}</div>
                    {ev.accion && <div style={{ fontSize: 10, color: '#166534', background: '#f0fdf4', padding: '6px 8px', borderRadius: 6, lineHeight: 1.4 }}><span style={{ fontWeight: 700 }}>Accion: </span>{ev.accion}</div>}
                    {ev.responsable && <div style={{ fontSize: 10, color: C.subtle, marginTop: 4 }}>Responsable: {ev.responsable}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


// KPIs Gestoras component
function KPIsView({ reportes, seguimiento }) {
  const [terrFilter, setTerrFilter] = useState('Todos')

  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  function getMonthData(territorio, mes) {
    return reportes.filter(r => {
      if (territorio !== 'Todos' && r.territorio !== territorio) return false
      const m = new Date(r.fecha_corte).getMonth()
      return m === mes
    })
  }

  function sumField(territorio, mes, field) {
    return getMonthData(territorio, mes).reduce((sum, r) => sum + (r[field] || 0), 0)
  }

  function sumTotal(territorio, field) {
    return reportes.filter(r => territorio === 'Todos' || r.territorio === territorio)
      .reduce((sum, r) => sum + (r[field] || 0), 0)
  }

  function sumQ(territorio, field, q) {
    const meses = q === 1 ? [0,1,2] : q === 2 ? [3,4,5] : q === 3 ? [6,7,8] : [9,10,11]
    return meses.reduce((sum, m) => sum + sumField(territorio, m, field), 0)
  }

  const KPIS_BARBOSA = [
    { cat: 'SOCIALIZACIONES Y EVENTOS', items: [
      { name: 'Socializaciones AID', field: 'eventos_aid', meta: 12, base: '1/mes' },
      { name: 'Socializaciones AII', field: 'eventos_aii', meta: 4, base: '1/trim' },
      { name: 'Reuniones institucionales', field: 'eventos_institucional', meta: 4, base: '1/trim' },
    ]},
    { cat: 'DIAGNOSTICO TERRITORIAL', items: [
      { name: 'Diagnosticos sociofamiliares', field: 'diagnosticos', meta: 53, base: '53 viv/sem' },
      { name: 'Actas de vecindad', field: 'actas_vecindad', meta: 0, base: 'Segun obra' },
      { name: 'Inducciones PGS', field: 'inducciones_pgs', meta: 8, base: '2/trim' },
    ]},
    { cat: 'PQRS', items: [
      { name: 'PQRS recibidas', field: 'pqrs_recibidas', meta: 0, base: '0/mes', invert: true },
      { name: 'PQRS pendientes', field: 'pqrs_pendientes', meta: 0, base: '0/mes', invert: true },
      { name: 'Incidentes', field: 'incidentes', meta: 0, base: '0/mes', invert: true },
    ]},
    { cat: 'ACUERDOS SOCIALES', items: [
      { name: 'Acuerdos firmados', field: 'acuerdos_firmados', meta: 3, base: 'Antes COD' },
      { name: 'Compromisos cumplidos', field: 'compromisos_cumplidos', meta: 0, base: '>=90%' },
    ]},
    { cat: 'ACTORES', items: [
      { name: 'Actores gestionados', field: 'actores_gestionados', meta: 0, base: 'Semanal' },
      { name: 'Alertas escaladas DAC', field: 'alertas_escaladas_dac', meta: 0, base: '0/mes', invert: true },
    ]},
  ]

  const KPIS_TOLU = [
    { cat: 'SOCIALIZACIONES Y EVENTOS', items: [
      { name: 'Socializaciones AID', field: 'eventos_aid', meta: 12, base: '1/mes' },
      { name: 'Socializaciones AII', field: 'eventos_aii', meta: 4, base: '1/trim' },
      { name: 'Reuniones institucionales', field: 'eventos_institucional', meta: 4, base: '1/trim' },
    ]},
    { cat: 'DIAGNOSTICO TERRITORIAL', items: [
      { name: 'Asociaciones mapeadas', field: 'diagnosticos', meta: 0, base: 'Acumulativo' },
      { name: 'Inducciones PGS', field: 'inducciones_pgs', meta: 8, base: '2/trim' },
    ]},
    { cat: 'PQRS', items: [
      { name: 'PQRS recibidas', field: 'pqrs_recibidas', meta: 0, base: '0/mes', invert: true },
      { name: 'PQRS pendientes', field: 'pqrs_pendientes', meta: 0, base: '0/mes', invert: true },
      { name: 'Incidentes', field: 'incidentes', meta: 0, base: '0/mes', invert: true },
    ]},
    { cat: 'ACUERDOS SOCIALES', items: [
      { name: 'Acuerdos firmados', field: 'acuerdos_firmados', meta: 3, base: 'Antes COD' },
      { name: 'Compromisos cumplidos', field: 'compromisos_cumplidos', meta: 0, base: '>=90%' },
    ]},
    { cat: 'ACTORES', items: [
      { name: 'Actores gestionados', field: 'actores_gestionados', meta: 0, base: 'Semanal' },
      { name: 'Alertas escaladas DAC', field: 'alertas_escaladas_dac', meta: 0, base: '0/mes', invert: true },
    ]},
  ]

  function renderTerritory(territorio, kpis) {
    const color = territorio === 'Tolu' ? C.tolu : C.barbosa
    const totalReportes = reportes.filter(r => r.territorio === territorio).length

    return (
      <div key={territorio} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 4, height: 24, background: color, borderRadius: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{territorio}</div>
            <div style={{ fontSize: 11, color: C.subtle }}>
              {territorio === 'Tolu' ? 'Terminal maritima' : 'Planta de regasificacion'} &rarr; {totalReportes} reportes
            </div>
          </div>
        </div>

        {kpis.map(cat => (
          <div key={cat.cat} style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{cat.cat}</div>
            
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr) 60px 50px', gap: 4, marginBottom: 6, alignItems: 'center' }}>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700 }}>KPI</div>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q1</div>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q2</div>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q3</div>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q4</div>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Total</div>
              <div style={{ fontSize: 9, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Meta</div>
            </div>

            {cat.items.map(kpi => {
              const total = sumTotal(territorio, kpi.field)
              const pct = kpi.meta > 0 ? Math.round((total / kpi.meta) * 100) : 0
              const statusColor = kpi.invert
                ? (total === 0 ? C.green : total <= 3 ? C.orange : C.red)
                : (kpi.meta > 0 ? (pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red) : C.subtle)

              return (
                <div key={kpi.name} style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr) 60px 50px', gap: 4, alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{kpi.name}</div>
                    <div style={{ fontSize: 9, color: C.subtle }}>{kpi.base}</div>
                  </div>
                  {[1, 2, 3, 4].map(q => (
                    <div key={q} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: C.text }}>
                      {sumQ(territorio, kpi.field, q) || '-'}
                    </div>
                  ))}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: statusColor }}>{total}</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.muted }}>
                    {kpi.meta || '-'}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* Seguimiento acuerdos summary */}
        {(() => {
          const sg = seguimiento.filter(s => s.territorio === territorio)
          if (!sg.length) return null
          const cumplidos = sg.filter(s => s.estado === 'Cumplido').length
          const total = sg.length
          const pct = total ? Math.round((cumplidos / total) * 100) : 0
          return (
            <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>COMPROMISOS DE ACUERDOS</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: pct >= 90 ? C.green : pct >= 60 ? C.orange : C.red }}>{pct}%</div>
                  <div style={{ fontSize: 10, color: C.muted }}>cumplimiento</div>
                </div>
                <div style={{ flex: 1 }}>
                  <Bar value={pct} color={pct >= 90 ? C.green : pct >= 60 ? C.orange : C.red} height={8} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{cumplidos}/{total}</div>
                  <div style={{ fontSize: 10, color: C.subtle }}>compromisos</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Cumplido', 'En proceso', 'Pendiente', 'Incumplido', 'Escalado'].map(est => {
                  const count = sg.filter(s => s.estado === est).length
                  if (!count) return null
                  const c = est === 'Cumplido' ? C.green : est === 'En proceso' ? C.orange : est === 'Pendiente' ? C.subtle : C.red
                  return <Tag key={est} color={c}>{est}: {count}</Tag>
                })}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  // Overall summary stats
  const totalReportes = reportes.length
  const totalCompromisos = seguimiento.length
  const compromisosCumplidos = seguimiento.filter(s => s.estado === 'Cumplido').length
  const totalEventos = reportes.reduce((s, r) => s + (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0), 0)
  const totalIncidentes = reportes.reduce((s, r) => s + (r.incidentes || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>KPIs Gestion Social</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>Seguimiento anual &rarr; Ene-Dic 2026 &rarr; Calculado de reportes semanales</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard label="Reportes" value={totalReportes} color={C.navy} />
        <StatCard label="Eventos" value={totalEventos} color={C.tolu} />
        <StatCard label="Compromisos" value={`${compromisosCumplidos}/${totalCompromisos}`} color={C.green} />
        <StatCard label="Incidentes" value={totalIncidentes} color={totalIncidentes === 0 ? C.green : C.red} />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['Todos', 'Barbosa', 'Tolu'].map(t => (
          <button key={t} onClick={() => setTerrFilter(t)}
            style={{ background: terrFilter === t ? C.navy : '#f1f5f9', color: terrFilter === t ? 'white' : C.text,
              border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {t === 'Tolu' ? 'Tolú' : t}
          </button>
        ))}
      </div>

      {/* KPI tables by territory */}
      {(terrFilter === 'Todos' || terrFilter === 'Barbosa') && renderTerritory('Barbosa', KPIS_BARBOSA)}
      {(terrFilter === 'Todos' || terrFilter === 'Tolu') && renderTerritory('Tolú', KPIS_TOLU)}

      {totalReportes === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>No hay reportes semanales aun</div>
          <div style={{ fontSize: 12 }}>Los KPIs se calculan automaticamente cuando las gestoras llenen sus reportes en Input Semanal.</div>
        </div>
      )}
    </div>
  )
}

// InputSemanal component
function InputSemanal({ session, profile, territorio, reportes, seguimiento, onSaved }) {
  const [tab, setTab] = useState('reporte')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [myTerr, setMyTerr] = useState(territorio || 'Barbosa')

  // Reporte semanal form
  const [semana, setSemana] = useState('')
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0])
  const [acuerdosFirmados, setAcuerdosFirmados] = useState(0)
  const [compromisosNuevos, setCompromisosNuevos] = useState(0)
  const [compromisosCumplidos, setCompromisosCumplidos] = useState(0)
  const [diagnosticos, setDiagnosticos] = useState(0)
  const [actasVecindad, setActasVecindad] = useState(0)
  const [induccionesPgs, setInduccionesPgs] = useState(0)
  const [eventosAid, setEventosAid] = useState(0)
  const [eventosAii, setEventosAii] = useState(0)
  const [eventosInst, setEventosInst] = useState(0)
  const [asistentes, setAsistentes] = useState(0)
  const [pqrsRecibidas, setPqrsRecibidas] = useState(0)
  const [pqrsCerradas, setPqrsCerradas] = useState(0)
  const [pqrsPendientes, setPqrsPendientes] = useState(0)
  const [incidentes, setIncidentes] = useState(0)
  const [actoresGest, setActoresGest] = useState(0)
  const [alertasDac, setAlertasDac] = useState(0)
  const [logros, setLogros] = useState('')
  const [dificultades, setDificultades] = useState('')
  const [escalamientos, setEscalamientos] = useState('')
  const [prioridades, setPrioridades] = useState('')

  // Seguimiento form
  const [sgAcuerdo, setSgAcuerdo] = useState('')
  const [sgCompromiso, setSgCompromiso] = useState('')
  const [sgFecha, setSgFecha] = useState('')
  const [sgResponsableCl, setSgResponsableCl] = useState('')
  const [sgResponsableCom, setSgResponsableCom] = useState('')
  const [sgEstado, setSgEstado] = useState('Pendiente')
  const [sgObservacion, setSgObservacion] = useState('')

  async function handleSaveReporte() {
    if (!semana || !fechaCorte) return
    setSaving(true)
    try {
      await addReporteSemanal({
        semana: parseInt(semana), fecha_corte: fechaCorte, territorio: myTerr, user_id: session.user.id,
        acuerdos_firmados: acuerdosFirmados, compromisos_nuevos: compromisosNuevos, compromisos_cumplidos: compromisosCumplidos,
        diagnosticos, actas_vecindad: actasVecindad, inducciones_pgs: induccionesPgs,
        eventos_aid: eventosAid, eventos_aii: eventosAii, eventos_institucional: eventosInst, asistentes_total: asistentes,
        pqrs_recibidas: pqrsRecibidas, pqrs_cerradas: pqrsCerradas, pqrs_pendientes: pqrsPendientes, incidentes,
        actores_gestionados: actoresGest, alertas_escaladas_dac: alertasDac,
        logros, dificultades, escalamientos, prioridades_proxima: prioridades
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved()
    } finally { setSaving(false) }
  }

  async function handleSaveSeguimiento() {
    if (!sgAcuerdo || !sgCompromiso) return
    setSaving(true)
    try {
      await addSeguimientoAcuerdo({
        territorio: myTerr, acuerdo: sgAcuerdo, compromiso: sgCompromiso,
        fecha_pactada: sgFecha || null, responsable_cl: sgResponsableCl, responsable_comunidad: sgResponsableCom,
        estado: sgEstado, observacion: sgObservacion, user_id: session.user.id,
        semana_reporte: semana ? parseInt(semana) : null
      })
      setSgAcuerdo(''); setSgCompromiso(''); setSgFecha(''); setSgResponsableCl(''); setSgResponsableCom(''); setSgObservacion('')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved()
    } finally { setSaving(false) }
  }

  const myReportes = reportes.filter(r => r.territorio === myTerr)
  const mySeguimiento = seguimiento.filter(s => s.territorio === myTerr)

  const NumField = ({ label, value, onChange }) => (
    <div style={{ flex: 1, minWidth: 120 }}>
      <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type="number" min="0" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 14,
          fontWeight: 700, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center' }} />
    </div>
  )

  const TextArea = ({ label, value, onChange, placeholder }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 12,
          resize: 'none', height: 60, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Input Semanal</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>{profile?.full_name} &rarr; Cada viernes</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {['Barbosa', 'Tolú'].map(t => (
                <button key={t} onClick={() => setMyTerr(t)}
                  style={{ flex: 1, background: myTerr === t ? C.navy : '#f1f5f9', color: myTerr === t ? 'white' : C.text,
                    border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
      </div>

      {saved && (
        <div style={{ background: '#dcfce7', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 13, color: '#166534', fontWeight: 600 }}>
          Guardado correctamente
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'reporte', label: 'Reporte Semanal' },
          { id: 'seguimiento', label: 'Seguimiento Acuerdos' },
          { id: 'historico', label: 'Historico' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? C.navy : '#f1f5f9', color: tab === t.id ? 'white' : C.text,
              border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* REPORTE SEMANAL */}
      {tab === 'reporte' && (
        <div>
          {/* Header */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3 }}>SEMANA #</label>
                <input type="number" value={semana} onChange={e => setSemana(e.target.value)} placeholder="1-52"
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 14,
                    fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3 }}>FECHA CORTE</label>
                <input type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 13,
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* P1: Acuerdos */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>P1 &mdash; Acuerdos Sociales</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Firmados" value={acuerdosFirmados} onChange={setAcuerdosFirmados} />
              <NumField label="Compromisos nuevos" value={compromisosNuevos} onChange={setCompromisosNuevos} />
              <NumField label="Cumplidos" value={compromisosCumplidos} onChange={setCompromisosCumplidos} />
            </div>
          </div>

          {/* P2: Huella Social */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.barbosa, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>P2 &mdash; Diagnóstico Territorial</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Diagnosticos" value={diagnosticos} onChange={setDiagnosticos} />
              <NumField label="Actas vecindad" value={actasVecindad} onChange={setActasVecindad} />
              <NumField label="Inducciones PGS" value={induccionesPgs} onChange={setInduccionesPgs} />
            </div>
          </div>

          {/* P3: Eventos */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.tolu, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>P3 &mdash; Eventos y Socializaciones</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Eventos AID" value={eventosAid} onChange={setEventosAid} />
              <NumField label="Eventos AII" value={eventosAii} onChange={setEventosAii} />
              <NumField label="Institucional" value={eventosInst} onChange={setEventosInst} />
              <NumField label="Asistentes total" value={asistentes} onChange={setAsistentes} />
            </div>
          </div>

          {/* PQRS */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.orange, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>PQRS / Incidentes</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="PQRS recibidas" value={pqrsRecibidas} onChange={setPqrsRecibidas} />
              <NumField label="Cerradas" value={pqrsCerradas} onChange={setPqrsCerradas} />
              <NumField label="Pendientes" value={pqrsPendientes} onChange={setPqrsPendientes} />
              <NumField label="Incidentes" value={incidentes} onChange={setIncidentes} />
            </div>
          </div>

          {/* Actores */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Actores y Alertas</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Actores gestionados" value={actoresGest} onChange={setActoresGest} />
              <NumField label="Alertas escaladas DAC" value={alertasDac} onChange={setAlertasDac} />
            </div>
          </div>

          {/* Narrativo */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Resumen Narrativo</div>
            <TextArea label="Logros de la semana" value={logros} onChange={setLogros} placeholder="Que se logro esta semana..." />
            <TextArea label="Dificultades / barreras" value={dificultades} onChange={setDificultades} placeholder="Que dificultades hubo..." />
            <TextArea label="Escalamientos a DAC" value={escalamientos} onChange={setEscalamientos} placeholder="Que se escalo a Diana..." />
            <TextArea label="Prioridades proxima semana" value={prioridades} onChange={setPrioridades} placeholder="Que hay que hacer la proxima semana..." />
          </div>

          <button onClick={handleSaveReporte} disabled={saving || !semana}
            style={{ width: '100%', background: saving ? '#94a3b8' : C.navy, color: 'white',
              border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', marginBottom: 20 }}>
            {saving ? 'Guardando...' : 'Guardar Reporte Semanal'}
          </button>
        </div> <a href="https://course2-my.sharepoint.com/:f:/g/personal/diana_silva_caribelng_com/IgC30umcdhdBRY5F1Sjx_MMrAa8c1li2QamoYiBNuVLR3LE?e=ZvD6QH" target="_blank" rel="noopener"
            style={{ display: 'block', width: '100%', background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              textAlign: 'center', textDecoration: 'none', color: C.accent, marginBottom: 20, boxSizing: 'border-box' }}>
            Abrir OneDrive — Subir evidencias ({myTerr})
          </a>      )}
      {/* SEGUIMIENTO ACUERDOS */}
      {tab === 'seguimiento' && (
        <div>
          {/* Add new */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Nuevo Compromiso</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 3 }}>Acuerdo</label>
                <select value={sgAcuerdo} onChange={e => setSgAcuerdo(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                  <option value="">Seleccionar acuerdo...</option>
                  {myTerr === 'Barbosa' ? ['B1: Corresponsabilidad Comunitaria', 'B2: Infraestructura y Entorno', 'B3: Gestion Social y Control de Conflictos'].map(a => <option key={a} value={a}>{a}</option>)
                    : ['T1: Sector Pesquero, Maritimo y Turistico', 'T2: Desarrollo de Capacidades y Convivencia', 'T3: Cronograma Social Anual'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <Field label="Compromiso especifico" value={sgCompromiso} onChange={setSgCompromiso} placeholder="Que se comprometio..." />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><Field label="Fecha pactada" value={sgFecha} onChange={setSgFecha} type="date" /></div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 3 }}>Estado</label>
                  <select value={sgEstado} onChange={e => setSgEstado(e.target.value)}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}>
                    {['Pendiente', 'En proceso', 'Cumplido', 'Incumplido', 'Escalado'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><Field label="Responsable CL" value={sgResponsableCl} onChange={setSgResponsableCl} placeholder="Caribe LNG" /></div>
                <div style={{ flex: 1 }}><Field label="Responsable Comunidad" value={sgResponsableCom} onChange={setSgResponsableCom} placeholder="Comunidad" /></div>
              </div>
              <Field label="Observacion" value={sgObservacion} onChange={setSgObservacion} placeholder="Notas adicionales..." />
              <button onClick={handleSaveSeguimiento} disabled={saving || !sgAcuerdo || !sgCompromiso}
                style={{ width: '100%', background: saving ? '#94a3b8' : C.accent, color: 'white',
                  border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Guardando...' : 'Agregar Compromiso'}
              </button>
            </div>
          </div>

          {/* List existing */}
          <div style={{ fontSize: 11, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Compromisos registrados ({mySeguimiento.length})
          </div>
          {mySeguimiento.map(s => {
            const stColor = s.estado === 'Cumplido' ? C.green : s.estado === 'En proceso' ? C.orange : s.estado === 'Incumplido' || s.estado === 'Escalado' ? C.red : C.subtle
            return (
              <div key={s.id} style={{ background: C.card, borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${stColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>{s.acuerdo}</div>
                  <Tag color={stColor}>{s.estado}</Tag>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{s.compromiso}</div>
                {s.fecha_pactada && <div style={{ fontSize: 10, color: C.subtle }}>Fecha: {new Date(s.fecha_pactada).toLocaleDateString('es-CO')}</div>}
                {s.observacion && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{s.observacion}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* HISTORICO */}
      {tab === 'historico' && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Reportes enviados ({myReportes.length})
          </div>
          {myReportes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: C.subtle, fontSize: 13 }}>No hay reportes aun. Llena tu primer reporte semanal.</div>
          )}
          {myReportes.map(r => {
            const totalEventos = (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0)
            const semaforo = r.incidentes > 0 ? C.red : r.pqrs_pendientes > 3 ? C.orange : C.green
            return (
              <div key={r.id} style={{ background: C.card, borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${semaforo}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Semana {r.semana}</span>
                    <span style={{ fontSize: 11, color: C.subtle, marginLeft: 8 }}>{new Date(r.fecha_corte).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: semaforo }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'Acuerdos', value: r.acuerdos_firmados, color: C.accent },
                    { label: 'Eventos', value: totalEventos, color: C.tolu },
                    { label: 'PQRS pend.', value: r.pqrs_pendientes, color: r.pqrs_pendientes > 0 ? C.orange : C.green },
                    { label: 'Actores', value: r.actores_gestionados, color: C.barbosa },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {r.logros && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.text }}>Logros: </span>{r.logros}</div>}
                {r.dificultades && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginTop: 2 }}><span style={{ fontWeight: 700, color: C.text }}>Dificultades: </span>{r.dificultades}</div>}
              </div>
            )
          })}
        </div>
      )}
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
  const [cronograma, setCronograma] = useState([])
  const [huellaSocial, setHuellaSocial] = useState([])
  const [cronoFilter, setCronoFilter] = useState('Todos')
  const [riesgos, setRiesgos] = useState([])
  const [riesgosLeg, setRiesgosLeg] = useState([])
  const [cronoLeg, setCronoLeg] = useState([])
  const [reportes, setReportes] = useState([])
  const [seguimiento, setSeguimiento] = useState([])

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
      const [a, ag, cr, hs, rp, sg, ri, rl, cleg] = await Promise.all([getActors(), getAgreements(), getCronograma(), getHuellaSocial(), getReportesSemanales(), getSeguimientoAcuerdos(), getRiesgos(), getRiesgosLegislativos(), getCronogramaLegislativo()])
      setActors(a || [])
      setAgreements(ag || [])
      setCronograma(cr || [])
      setHuellaSocial(hs || [])
      setReportes(rp || [])
      setSeguimiento(sg || [])
      setRiesgos(ri || [])
      setRiesgosLeg(rl || [])
      setCronoLeg(cleg || [])
    } finally { setDataLoading(false) }
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  // ━━ Realtime ━━
  useEffect(() => {
    if (!session) return
    const ch = supabase.channel('crm-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actors' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agreements' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes_semanales' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seguimiento_acuerdos' }, () => loadData())
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
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'actores', label: 'Actores', icon: '' },
    { id: 'acuerdos', label: 'Acuerdos', icon: '' },
    { id: 'cronograma', label: 'Cronograma', icon: '' },
    { id: 'input', label: 'Input Semanal', icon: '' },
    { id: 'kpis', label: 'KPIs', icon: '' },
    { id: 'riesgos', label: 'Riesgos', icon: '' },
    ...(isGestora ? [{ id: 'gestora', label: 'Mi territorio', icon: '' }] : []),
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
            {/* Alertas inteligentes */}
            {(() => {
              const alertas = []
              const hoy = new Date()
              
              // PQRS pendientes del ultimo reporte
              const ultimosReportes = {}
              reportes.forEach(r => {
                if (!ultimosReportes[r.territorio] || r.semana > ultimosReportes[r.territorio].semana) ultimosReportes[r.territorio] = r
              })
              Object.values(ultimosReportes).forEach(r => {
                if (r.pqrs_pendientes > 0) alertas.push({ icon: '⚠️', text: `${r.territorio}: ${r.pqrs_pendientes} PQRS pendientes`, color: C.orange, bg: '#fff7ed' })
                if (r.incidentes > 0) alertas.push({ icon: '🚨', text: `${r.territorio}: ${r.incidentes} incidente(s) reportado(s)`, color: C.red, bg: '#fef2f2' })
                if (r.alertas_escaladas_dac > 0) alertas.push({ icon: '📢', text: `${r.territorio}: ${r.alertas_escaladas_dac} alerta(s) escalada(s) a DAC`, color: C.red, bg: '#fef2f2' })
              })

              // Compromisos vencidos
              seguimiento.filter(s => s.estado === 'Pendiente' && s.fecha_pactada).forEach(s => {
                const fecha = new Date(s.fecha_pactada)
                if (fecha < hoy) alertas.push({ icon: '📋', text: `Compromiso vencido: ${(s.compromiso || '').substring(0, 60)}... (${s.territorio})`, color: C.red, bg: '#fef2f2' })
              })

              // Eventos proximos del cronograma (esta semana)
              const enUnaSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000)
              cronograma.filter(c => c.estado === 'En proceso').forEach(c => {
                alertas.push({ icon: '📅', text: `${c.territorio}: ${(c.evento || '').substring(0, 60)}...`, color: C.accent, bg: '#eff6ff' })
              })

              // Riesgos en accion inmediata
              const riesgosAltos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente')))
              if (riesgosAltos.length > 0) alertas.push({ icon: '🔴', text: `${riesgosAltos.length} riesgo(s) en accion inmediata requieren gestion`, color: C.red, bg: '#fef2f2' })

              // Sin reportes esta semana
              const semanActual = Math.ceil((hoy - new Date(hoy.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
              const reportesSemana = reportes.filter(r => r.semana === semanActual)
              if (reportesSemana.length === 0 && hoy.getDay() >= 4) alertas.push({ icon: '📝', text: 'Faltan reportes semanales de las gestoras', color: C.orange, bg: '#fff7ed' })

              if (!alertas.length) return null
              return (
                <div style={{ marginBottom: 16 }}>
                  {alertas.slice(0, 6).map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', background: a.bg,
                      borderRadius: 8, padding: '8px 12px', marginBottom: 4, borderLeft: `3px solid ${a.color}` }}>
                      <span style={{ fontSize: 14 }}>{a.icon}</span>
                      <span style={{ fontSize: 12, color: a.color, fontWeight: 600, flex: 1 }}>{a.text}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard label="Actores totales" value={stats.total} sub={`${stats.prioA} prioridad A`} color={C.navy} icon="👥" />
              <StatCard label="Relación estable 🟢" value={stats.verde} color={C.green} icon="✅" />
              <StatCard label="En atención" value={stats.amarillo + stats.naranja} sub="Amarillo + Naranja" color={C.orange} icon="⚠️" />
              <StatCard label="Accion inmediata 🔴" value={stats.rojo} color={C.red} icon="🚨" />
              <StatCard label="Riesgo alto" value={stats.alto} color='#dc2626' icon="⚠️" />
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
                  ['naranja', 'Riesgo moderado', stats.naranja], ['rojo', 'En gestion activa', stats.rojo]].map(([k, lbl, v]) => (
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
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: C.text }}>⚠️ Actores en gestion prioritaria — Acción requerida</h3>
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar por nombre, tipo..."
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


        {/* ━━ CRONOGRAMA ━━ */}
        {view === 'cronograma' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Cronograma 2026</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 12 }}>Gestión Social Territorial → Nov 2025 – Dic 2026</p>
            </div>
            {/* Progress summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {(() => {
                const cumplido = cronograma.filter(c => c.estado === 'Cumplido').length
                const enProceso = cronograma.filter(c => c.estado === 'En proceso').length
                const pendiente = cronograma.filter(c => c.estado === 'Pendiente').length
                return [
                  { label: 'Cumplido', value: cumplido, color: C.green, bg: '#dcfce7' },
                  { label: 'En proceso', value: enProceso, color: C.orange, bg: '#ffedd5' },
                  { label: 'Pendiente', value: pendiente, color: C.subtle, bg: '#f1f5f9' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 18px', borderLeft: `4px solid ${s.color}` }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))
              })()}
            </div>
            {/* Territory filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {['Todos', 'Tolú', 'Barbosa'].map(t => (
                <button key={t} onClick={() => setCronoFilter(t)}
                  style={{ background: cronoFilter === t ? C.navy : '#f1f5f9', color: cronoFilter === t ? 'white' : C.text,
                    border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  {t}
                </button>
              ))}
            </div>
            {/* Timeline */}
            {['Tolú', 'Barbosa'].filter(t => cronoFilter === 'Todos' || cronoFilter === t).map(territorio => {
              const items = cronograma.filter(c => c.territorio === territorio)
              const cumplidos = items.filter(c => c.estado === 'Cumplido').length
              const pct = items.length ? Math.round((cumplidos / items.length) * 100) : 0
              return (
                <div key={territorio} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 4, height: 24, background: territorio === 'Tolú' ? C.tolu : C.barbosa, borderRadius: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{territorio}</div>
                      <div style={{ fontSize: 11, color: C.subtle }}>{territorio === 'Tolú' ? 'Terminal marítima' : 'Planta de regasificación'} → {items.length} eventos</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: territorio === 'Tolú' ? C.tolu : C.barbosa }}>{pct}%</div>
                      <div style={{ fontSize: 10, color: C.subtle }}>avance</div>
                    </div>
                  </div>
                  <Bar value={pct} color={territorio === 'Tolú' ? C.tolu : C.barbosa} height={6} />
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(ev => {
                      const stColor = ev.estado === 'Cumplido' ? C.green : ev.estado === 'En proceso' ? C.orange : C.subtle
                      const stBg = ev.estado === 'Cumplido' ? '#dcfce7' : ev.estado === 'En proceso' ? '#fff7ed' : '#f8fafc'
                      return (
                        <div key={ev.id} style={{ background: C.card, borderRadius: 12, padding: '14px 18px',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${stColor}`, position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: territorio === 'Tolú' ? C.tolu : C.barbosa,
                                background: territorio === 'Tolú' ? '#e0f2fe' : '#ede9fe', padding: '2px 8px', borderRadius: 10 }}>
                                #{ev.numero}
                              </span>
                              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{ev.mes}</span>
                              <Tag color={stColor} bg={stBg}>{ev.estado}</Tag>
                            </div>
                            {ev.periodo && <span style={{ fontSize: 10, color: C.subtle, whiteSpace: 'nowrap' }}>{ev.periodo}</span>}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>{ev.evento}</div>
                          {ev.producto && (
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, lineHeight: 1.5 }}>
                              <span style={{ fontWeight: 700, color: C.text }}>Producto: </span>{ev.producto}
                            </div>
                          )}
                          {ev.resultado && (
                            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                              <span style={{ fontWeight: 700, color: C.text }}>Resultado: </span>{ev.resultado}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {/* Huella Social */}
            <div style={{ marginTop: 20 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 900, color: C.text }}>Huella Social Territorial</h2>
              <p style={{ margin: '0 0 16px', color: C.muted, fontSize: 12 }}>Lo que queda instalado en el territorio, independientemente de si el proyecto sigue activo</p>
              {['Tolú', 'Barbosa'].filter(t => cronoFilter === 'Todos' || cronoFilter === t).map(territorio => (
                <div key={territorio} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 20, background: territorio === 'Tolú' ? C.tolu : C.barbosa, borderRadius: 2 }} />
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{territorio}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
                    {huellaSocial.filter(h => h.territorio === territorio).map(h => (
                      <div key={h.id} style={{ background: C.card, borderRadius: 12, padding: '14px 18px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `3px solid ${territorio === 'Tolú' ? C.tolu : C.barbosa}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: territorio === 'Tolú' ? C.tolu : C.barbosa,
                          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{h.eje}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>{h.intervencion}</div>
                        <div style={{ fontSize: 11, color: '#166534', background: '#f0fdf4', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700 }}>Huella: </span>{h.huella}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700 }}>Indicador: </span>{h.indicador}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* INPUT SEMANAL */}
        {view === 'input' && (
          <InputSemanal session={session} profile={profile} territorio={myTerritorio}
            reportes={reportes} seguimiento={seguimiento} onSaved={loadData} />
        )}


        {/* KPIs GESTORAS */}
        {view === 'kpis' && (
          <KPIsView reportes={reportes} seguimiento={seguimiento} />
        )}


        {/* RIESGOS */}
        {view === 'riesgos' && (
          <RiesgosView riesgos={riesgos} riesgosLeg={riesgosLeg} cronoLeg={cronoLeg} />
        )}

        {/* ━━ GESTORA VIEW ━━ */}
        {view === 'gestora' && isGestora && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>📍 Mi Territorio</h1>
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
                      {a.diff === 0 ? '¡Hoy! 🎉' : `En ${a.diff} días`}
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
