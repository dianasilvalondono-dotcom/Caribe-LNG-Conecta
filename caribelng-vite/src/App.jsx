import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, signInWithMicrosoft, signOut, getProfile, upsertProfile,
         getActors, getAgreements, getInteractions, addInteraction, updateActor, updateAgreementAvance,
         getCronograma, getHuellaSocial, updateCronogramaEstado,
         getReportesSemanales, addReporteSemanal, deleteReporteSemanal, deleteKpiEntry, deleteCronogramaEvent, deleteRiesgo,
         getSeguimientoAcuerdos, addSeguimientoAcuerdo, updateSeguimientoAcuerdo, deleteSeguimientoAcuerdo,
         getRiesgos, getBowTie, getRiesgosLegislativos, getCronogramaLegislativo, sendAlerta } from './lib/supabase'

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
    <span style={{ fontSize: 16, background: bg || color + '22', color,
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
          <div style={{ fontSize: 38, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 15, color: C.muted, marginTop: 3, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          {sub && <div style={{ fontSize: 15, color: C.subtle, marginTop: 2 }}>{sub}</div>}
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
  const [loading, setLoading] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showEmail, setShowEmail] = useState(false)

  const handleMicrosoft = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithMicrosoft()
    } catch (e) {
      setError('No se pudo conectar. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const handleEmail = async () => {
    if (!email || !password) return
    setLoadingEmail(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoadingEmail(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 380, width: '100%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${C.accent}, ${C.tolu})`,
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 16px' }}><svg viewBox="0 0 863.64 794.92" width="28" height="28"><path fill="#1565c0" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#08306b" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg></div>
        <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>
          Caribe LNG
        </h1>
        <p style={{ margin: '0 0 8px', color: C.muted, fontSize: 15 }}>
          Conecta! | Plan de Gestion Social 2026
        </p>
        <p style={{ margin: '0 0 32px', color: C.subtle, fontSize: 16 }}>
          Tolú →  Barbosa →  Nacional
        </p>

        <button onClick={handleMicrosoft} disabled={loading}
          style={{ width: '100%', background: loading ? '#f1f5f9' : '#2f2f2f', border: 'none',
            borderRadius: 10, padding: '13px 16px', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', color: 'white', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          {loading ? 'Conectando...' : 'Entrar con Microsoft'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: 13, color: C.subtle }}>o</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {!showEmail ? (
          <button onClick={() => setShowEmail(true)}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 14,
              cursor: 'pointer', textDecoration: 'underline' }}>
            Entrar con correo y contraseña
          </button>
        ) : (
          <div>
            <input type="email" placeholder="Correo electrónico" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 15, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
            <input type="password" placeholder="Contraseña" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
            <button onClick={handleEmail} disabled={loadingEmail}
              style={{ width: '100%', background: loadingEmail ? '#f1f5f9' : C.navy, border: 'none',
                borderRadius: 10, padding: '12px 16px', fontSize: 15, fontWeight: 600,
                cursor: loadingEmail ? 'wait' : 'pointer', color: 'white' }}>
              {loadingEmail ? 'Conectando...' : 'Entrar'}
            </button>
          </div>
        )}

        {error && <p style={{ color: C.red, fontSize: 14, margin: '12px 0 0' }}>{error}</p>}
        <p style={{ margin: '20px 0 0', fontSize: 13, color: C.subtle }}>
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

// ━━ Actor Modal ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ActorModal({ actor, session, onClose, onUpdated }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalTab, setModalTab] = useState('perfil')
  const [tipo, setTipo] = useState('Visita')
  const [resumen, setResumen] = useState('')
  const [newSemaforo, setNewSemaforo] = useState(actor.semaforo)
  const [saving, setSaving] = useState(false)
  const [savingPersonal, setSavingPersonal] = useState(false)
  // Campos relacionamiento
  const [accionTomada, setAccionTomada] = useState(actor.accion_tomada || '')
  const [fechaAccion, setFechaAccion] = useState(actor.fecha_accion || new Date().toISOString().split('T')[0])
  // Campos datos personales
  const [cumple, setCumple] = useState(actor.cumpleanos || '')
  const [conyuge, setConyuge] = useState(actor.conyuge || '')
  const [hijos, setHijos] = useState(actor.hijos || '')
  const [hobbies, setHobbies] = useState(actor.hobbies || '')
  const [notasPer, setNotasPer] = useState(actor.notas_personales || '')
  const [fechasImp, setFechasImp] = useState(actor.fechas_importantes || '')

  useEffect(() => {
    getInteractions(actor.id).then(d => { setInteractions(d || []); setLoading(false) })
  }, [actor.id])

  async function handleSave() {
    if (!resumen.trim()) return
    setSaving(true)
    try {
      await addInteraction({ actorId: actor.id, tipo, resumen, semaforo_nuevo: newSemaforo, userId: session.user.id, accion_tomada: accionTomada, fecha_accion: fechaAccion })
      await updateActor(actor.id, { semaforo: newSemaforo, accion_tomada: accionTomada, fecha_accion: fechaAccion || null })
      setResumen(''); setAccionTomada('')
      setFechaAccion(new Date().toISOString().split('T')[0])
      const fresh = await getInteractions(actor.id)
      setInteractions(fresh || [])
      onUpdated()
    } catch(e) { alert('Error guardando: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleSavePersonal() {
    setSavingPersonal(true)
    try {
      await updateActor(actor.id, {
        cumpleanos: cumple || null, conyuge, hijos,
        hobbies, notas_personales: notasPer, fechas_importantes: fechasImp
      })
      onUpdated()
    } catch(e) { alert('Error guardando: ' + e.message) }
    finally { setSavingPersonal(false) }
  }

  const sc = SEMAFORO[actor.semaforo] || SEMAFORO.amarillo

  const MODAL_TABS = [
    { id: 'perfil', label: '📋 Perfil' },
    { id: 'relacionamiento', label: '💬 Relacionamiento' },
    { id: 'personal', label: '🌟 Datos personales' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 580,
        maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar name={actor.nombre} size={48} color={getTipoColor(actor.tipo)} />
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{actor.nombre}</h2>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>{actor.tipo} → {actor.nivel}</div>
              <div style={{ fontSize: 13, color: C.subtle, marginTop: 1 }}>{actor.territorio} → {actor.area}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: C.subtle, padding: 0 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {MODAL_TABS.map(t => (
            <button key={t.id} onClick={() => setModalTab(t.id)}
              style={{ flex: 1, background: modalTab === t.id ? 'white' : 'transparent',
                border: 'none', borderRadius: 7, padding: '7px 4px', fontSize: 13, fontWeight: 700,
                color: modalTab === t.id ? C.navy : C.muted, cursor: 'pointer',
                boxShadow: modalTab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: PERFIL ── */}
        {modalTab === 'perfil' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Estado relación</div>
                <div style={{ fontSize: 14, color: sc.color, fontWeight: 700 }}>{sc.dot} {sc.label}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                  {actor.semaforo === 'rojo' && 'No se ha iniciado acercamiento — prioritaria'}
                  {actor.semaforo === 'naranja' && 'Relación en construcción — seguimiento cercano'}
                  {actor.semaforo === 'amarillo' && 'Acercamiento en curso — avanzar'}
                  {actor.semaforo === 'verde' && 'Relacion activa con comunicacion regular'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Posición</div>
                <div style={{ fontSize: 14 }}>{actor.posicion}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                  {(actor.posicion || '').includes('Aliado') && 'Apoya el proyecto activamente'}
                  {(actor.posicion || '').includes('Neutro') && 'Sin posición definida'}
                  {(actor.posicion || '').includes('Opositor') && 'Se opone activamente'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Riesgo</div>
                <div style={{ fontSize: 14, color: actor.riesgo === 'Alto' || actor.riesgo === 'Muy Alto' ? C.red : actor.riesgo === 'Medio' ? C.orange : C.green, fontWeight: 700 }}>{actor.riesgo}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                  {(actor.riesgo === 'Alto' || actor.riesgo === 'Muy Alto') && 'Gestión proactiva prioritaria'}
                  {actor.riesgo === 'Medio' && 'Seguimiento regular'}
                  {actor.riesgo === 'Bajo' && 'Monitoreo de rutina'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>PODER</div><Pill value={actor.poder} color={C.accent} /></div>
              <div><div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>INTERÉS</div><Pill value={actor.interes} color={C.barbosa} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>CUADRANTE</div><div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{actor.cuadrante}</div></div>
            </div>
            {actor.owner && <InfoRow label="Owner" val={actor.owner} />}
            {actor.frecuencia && <InfoRow label="Frecuencia" val={actor.frecuencia} />}
            {actor.contacto && <InfoRow label="Contacto" val={actor.contacto} />}
            {actor.accion_tomada && (
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px', marginBottom: 8, borderLeft: `3px solid ${C.accent}` }}>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  Última acción {actor.fecha_accion ? `— ${new Date(actor.fecha_accion).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                </div>
                <div style={{ fontSize: 14, color: C.text }}>{actor.accion_tomada}</div>
              </div>
            )}
            {actor.que_hacemos && <Block label="Qué hacemos" bg="#f0fdf4" color="#166534">{actor.que_hacemos}</Block>}
            {actor.riesgo_desc && <Block label="Riesgo identificado" bg="#fff7ed" color="#9a3412">{actor.riesgo_desc}</Block>}
          </div>
        )}

        {/* ── TAB: RELACIONAMIENTO ── */}
        {modalTab === 'relacionamiento' && (
          <div>
            <div style={{ fontSize: 13, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Registrar novedad</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {['Visita', 'Llamada', 'Reunión', 'Evento', 'WhatsApp'].map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  style={{ background: tipo === t ? C.navy : '#f1f5f9', color: tipo === t ? 'white' : C.text,
                    border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {Object.entries(SEMAFORO).map(([k, v]) => (
                <button key={k} onClick={() => setNewSemaforo(k)}
                  style={{ flex: 1, background: newSemaforo === k ? v.bg : '#f8fafc',
                    border: `2px solid ${newSemaforo === k ? v.color : 'transparent'}`,
                    borderRadius: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 15,
                    fontWeight: 700, color: v.color }}>
                  {v.dot}
                </button>
              ))}
            </div>
            <textarea value={resumen} onChange={e => setResumen(e.target.value)}
              placeholder="¿Qué pasó? ¿Qué dijo? ¿Hay algo urgente que escalar?"
              style={{ width: '100%', border: `1px solid #e2e8f0`, borderRadius: 8, padding: '9px 11px', fontSize: 14,
                resize: 'none', height: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 8 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acción tomada</label>
                <input value={accionTomada} onChange={e => setAccionTomada(e.target.value)}
                  placeholder="Ej: Se llamó para acordar reunión..."
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: C.text }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</label>
                <input type="date" value={fechaAccion} onChange={e => setFechaAccion(e.target.value)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px',
                    fontSize: 13, outline: 'none', fontFamily: 'inherit', color: C.text }} />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving || !resumen.trim()}
              style={{ marginTop: 8, width: '100%', background: saving ? '#94a3b8' : C.navy, color: 'white',
                border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? '💾 Guardando...' : '💾 Guardar novedad'}
            </button>
            {interactions.length > 0 && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 13, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Historial</div>
                {interactions.slice(0, 8).map(i => (
                  <div key={i.id} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: i.semaforo_nuevo ? SEMAFORO[i.semaforo_nuevo]?.color : C.subtle, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{i.tipo}</span>
                        <span style={{ fontSize: 12, color: C.subtle }}>{new Date(i.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
                        {i.profiles?.full_name && <span style={{ fontSize: 12, color: C.subtle }}>— {i.profiles.full_name}</span>}
                      </div>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{i.resumen}</div>
                      {i.accion_tomada && (
                        <div style={{ fontSize: 12, color: C.accent, marginTop: 3, fontStyle: 'italic' }}>
                          ✅ {i.accion_tomada}{i.fecha_accion ? ` — ${new Date(i.fecha_accion).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: DATOS PERSONALES ── */}
        {modalTab === 'personal' && (
          <div>
            <div style={{ fontSize: 13, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Detalles que fortalecen la relación
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label="🎂 Fecha de cumpleaños" value={cumple} onChange={setCumple} type="date" />
              <Field label="💍 Cónyuge / pareja" value={conyuge} onChange={setConyuge} placeholder="Nombre" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Field label="👨‍👩‍👧 Hijos" value={hijos} onChange={setHijos} placeholder="Ej: Ana (12), Pedro (8)" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Field label="🎯 Intereses y hobbies" value={hobbies} onChange={setHobbies} placeholder="Ej: fútbol, pesca, música vallenata..." />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>📅 Fechas importantes</label>
              <textarea value={fechasImp} onChange={e => setFechasImp(e.target.value)}
                placeholder="Ej: Aniversario 15 marzo, graduación hijo mayo..."
                style={{ width: '100%', border: `1px solid #e2e8f0`, borderRadius: 8, padding: '8px 10px', fontSize: 13,
                  resize: 'none', height: 60, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>🌟 Notas personales</label>
              <textarea value={notasPer} onChange={e => setNotasPer(e.target.value)}
                placeholder="Lo que hay que recordar: gustos, tensiones, contexto familiar, temas sensibles..."
                style={{ width: '100%', border: `1px solid #e2e8f0`, borderRadius: 8, padding: '8px 10px', fontSize: 13,
                  resize: 'none', height: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
            </div>
            <button onClick={handleSavePersonal} disabled={savingPersonal}
              style={{ width: '100%', background: savingPersonal ? '#94a3b8' : C.green, color: 'white',
                border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: savingPersonal ? 'wait' : 'pointer' }}>
              {savingPersonal ? '💾 Guardando...' : '💾 Guardar datos personales'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

function InfoRow({ label, val }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', minWidth: 76, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 16, color: C.text }}>{val}</span>
    </div>
  )
}

function Block({ label, bg, color, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, color, background: bg, padding: '9px 11px', borderRadius: 8, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 15, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 16,
          outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: C.text }} />
    </div>
  )
}

// ━━ Agreement card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AgreementCard({ ag, canEdit, onEdit, onAvanceAdded, isAdmin }) {
  const isT = ag.territorio === 'Tolú'
  const stC = { cumplido: C.green, en_curso: C.accent, estructural: C.barbosa, por_estructurar: C.yellow }
  const [localAvance, setLocalAvance] = useState(ag.avance || 0)
  const [localEstadoCode, setLocalEstadoCode] = useState(ag.estado_code || 'por_estructurar')
  const [localNotas, setLocalNotas] = useState(ag.notas || '')
  const [editingNotas, setEditingNotas] = useState(false)
  const [notasInput, setNotasInput] = useState(ag.notas || '')
  const [savingNotas, setSavingNotas] = useState(false)
  const barColor = stC[localEstadoCode] || C.accent
  const [showModal, setShowModal] = useState(false)
  const [actividad, setActividad] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [porcentaje, setPorcentaje] = useState('')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [ultimoAvance, setUltimoAvance] = useState(null)

  async function loadHistorial() {
    const { data } = await supabase
      .from('seguimiento_acuerdos')
      .select('*')
      .eq('acuerdo_id', ag.id)
      .order('fecha_pactada', { ascending: false })
    setHistorial(data || [])
    setUltimoAvance(data && data.length > 0 ? data[0] : null)
  }

  useEffect(() => { loadHistorial() }, [ag.id])

  async function handleGuardar() {
    if (!actividad || !porcentaje) return
    setSaving(true)
    try {
      const pct = Math.min(parseInt(porcentaje) || 0, 100)
      const nuevoAvance = Math.min((localAvance) + pct, 100)
      const nuevoEstado = nuevoAvance >= 100 ? 'cumplido' : 'en_curso'
      await addSeguimientoAcuerdo({
        acuerdo_id: ag.id, acuerdo: ag.nombre, territorio: ag.territorio,
        compromiso: actividad, fecha_pactada: fecha, estado: 'Cumplido',
        notas: notas, avance_porcentaje: pct,
      })
      await updateAgreementAvance(ag.id, nuevoAvance, notas || ag.notas)
      setLocalAvance(nuevoAvance)
      setLocalEstadoCode(nuevoEstado)
      setActividad(''); setPorcentaje(''); setNotas('')
      setShowModal(false)
      await loadHistorial()
      if (onAvanceAdded) onAvanceAdded()
    } catch(e) {
      alert('Error guardando: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleBorrar(h) {
    if (!confirm(`¿Borrar "${h.compromiso}"? El avance del acuerdo se reducirá en ${h.avance_porcentaje || 0}%.`)) return
    try {
      await deleteSeguimientoAcuerdo(h.id)
      const nuevoAvance = Math.max(0, localAvance - (h.avance_porcentaje || 0))
      const nuevoEstado = nuevoAvance >= 100 ? 'cumplido' : nuevoAvance > 0 ? 'en_curso' : 'por_estructurar'
      await updateAgreementAvance(ag.id, nuevoAvance, ag.notas)
      setLocalAvance(nuevoAvance)
      setLocalEstadoCode(nuevoEstado)
      setHistorial([])
      setUltimoAvance(null)
      await loadHistorial()
      if (onAvanceAdded) onAvanceAdded()
    } catch(e) {
      alert('Error borrando: ' + e.message)
    }
  }

  async function handleSaveNotas() {
    setSavingNotas(true)
    try {
      await updateAgreementAvance(ag.id, localAvance, notasInput || null)
      setLocalNotas(notasInput)
      setEditingNotas(false)
    } catch(e) {
      alert('Error guardando nota: ' + e.message)
    } finally {
      setSavingNotas(false)
    }
  }

  return (
    <>
    <div style={{ background: C.card, borderRadius: 12, padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `5px solid ${isT ? C.tolu : C.barbosa}`, overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <Tag color={isT ? '#0369a1' : '#5b21b6'} bg={isT ? '#e0f2fe' : '#ede9fe'}>{ag.id} →  {ag.territorio}</Tag>
            <Tag color={barColor}>{localEstadoCode === 'cumplido' ? 'Cumplido' : localEstadoCode === 'en_curso' ? 'En curso' : 'Por estructurar'}</Tag>
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{ag.nombre}</h3>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: barColor, lineHeight: 1 }}>{localAvance}%</div>
        </div>
      </div>
      <Bar value={localAvance} color={barColor} height={5} />
      <div style={{ marginTop: 10, fontSize: 16, color: C.muted, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700, color: C.text }}>Intervenciones: </span>{ag.intervenciones}
      </div>
      <div style={{ marginTop: 6, fontSize: 16, color: C.muted }}>
        <span style={{ fontWeight: 700, color: C.text }}>Actores: </span>{ag.actores}
      </div>
      <div style={{ marginTop: 8, background: '#f0fdf4', borderRadius: 8, padding: '8px 11px', fontSize: 16, color: '#166534', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700 }}>Huella: </span>{ag.huella}
      </div>
      {editingNotas ? (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={notasInput} onChange={e => setNotasInput(e.target.value)}
            placeholder="Nota de seguimiento..."
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={handleSaveNotas} disabled={savingNotas}
            style={{ background: C.green, color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {savingNotas ? '...' : '✓'}
          </button>
          <button onClick={() => { setEditingNotas(false); setNotasInput(localNotas) }}
            style={{ background: '#f1f5f9', color: C.muted, border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          {localNotas
            ? <div style={{ fontSize: 14, color: C.orange, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>⚠️ {localNotas}</div>
            : isAdmin && <div style={{ fontSize: 13, color: C.subtle, fontStyle: 'italic', flex: 1 }}>Sin nota de seguimiento</div>
          }
          {isAdmin && (
            <button onClick={() => setEditingNotas(true)}
              style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>
              ✏️
            </button>
          )}
        </div>
      )}
      {ultimoAvance && (
        <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 8, padding: '8px 12px', borderLeft: `3px solid ${barColor}`, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Último avance · {ultimoAvance.fecha_pactada}</div>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ultimoAvance.compromiso}</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => setShowModal(true)}
          style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', flex: 1 }}>
          + Registrar avance
        </button>
        <button onClick={() => { setShowHistorial(!showHistorial); if (!showHistorial) loadHistorial() }}
          style={{ background: '#f1f5f9', color: C.muted, border: 'none', borderRadius: 8,
            padding: '7px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {showHistorial ? 'Ocultar' : 'Ver historial'}
        </button>
      </div>
      {showHistorial && (
        <div style={{ marginTop: 12 }}>
          {historial.length === 0
            ? <div style={{ fontSize: 14, color: C.subtle, padding: '8px 0' }}>Sin actividades registradas aún.</div>
            : historial.map((h, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 10, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{h.compromiso}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>{h.fecha_pactada} · +{h.avance_porcentaje || 0}%</div>
                  {h.notas && <div style={{ fontSize: 13, color: C.subtle, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{h.notas}</div>}
                </div>
                <button onClick={() => handleBorrar(h)}
                  style={{ background: 'none', border: 'none', color: C.red, fontSize: 16, cursor: 'pointer', padding: '0 4px', flexShrink: 0, visibility: isAdmin ? 'visible' : 'hidden' }}
                  title="Borrar esta actividad">🗑</button>
              </div>
            ))
          }
        </div>
      )}
    </div>

    {showModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 460, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: C.text }}>Registrar avance</h2>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{ag.nombre}</div>
            </div>
            <button onClick={() => setShowModal(false)}
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Actividad *</label>
              <input value={actividad} onChange={e => setActividad(e.target.value)}
                placeholder="ej: Reunión con Suragás y directora operativa"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                    fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>
                  % que representa *
                  <span style={{ fontWeight: 400, color: C.muted }}> (avance actual: {localAvance}%)</span>
                </label>
                <input type="number" min="1" max={100 - localAvance} value={porcentaje}
                  onChange={e => setPorcentaje(e.target.value)}
                  placeholder="ej: 10"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                    fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>
            {porcentaje && (
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: C.accent, fontWeight: 600 }}>
                El acuerdo quedará en {Math.min(localAvance + (parseInt(porcentaje) || 0), 100)}% de avance
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Notas (opcional)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                placeholder="Observaciones, compromisos, próximos pasos..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
            <button onClick={handleGuardar} disabled={saving || !actividad || !porcentaje}
              style={{ background: saving || !actividad || !porcentaje ? '#f1f5f9' : C.navy,
                color: saving || !actividad || !porcentaje ? C.muted : 'white',
                border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700,
                cursor: saving || !actividad || !porcentaje ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar avance'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// RiesgosView component
function RiesgosView({ riesgos, riesgosLeg, cronoLeg, isAdmin, onDeleted }) {
  const [tab, setTab] = useState('mapa')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const [expandedRisk, setExpandedRisk] = useState(null)
  const [bowTieData, setBowTieData] = useState({})
  const [riesgoFilter, setRiesgoFilter] = useState('Todos')

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
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Mapa de Riesgos</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{riesgos.length} riesgos sociales, institucionales y legislativos</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16, marginBottom: 18 }}>
        {[
          { label: 'Accion inmediata', key: 'Alto', count: rojos.length, color: C.red, bg: '#fee2e2' },
          { label: 'Vigilar', key: 'Medio', count: amarillos.length, color: C.yellow, bg: '#fef9c3' },
          { label: 'Bajo control', key: 'Bajo', count: verdes.length, color: C.green, bg: '#dcfce7' },
          { label: 'En revision', key: 'Revision', count: azules.length, color: C.accent, bg: '#dbeafe' },
        ].map(s => {
          const isActive = riesgoFilter === s.key
          return (
            <div key={s.label} onClick={() => { setRiesgoFilter(isActive ? 'Todos' : s.key); setTab('mapa') }}
              style={{ background: isActive ? s.color : s.bg, borderRadius: 12, padding: '14px 16px',
                borderLeft: `4px solid ${s.color}`, textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s', boxShadow: isActive ? `0 4px 14px ${s.color}44` : 'none',
                transform: isActive ? 'translateY(-2px)' : 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: isActive ? 'white' : s.color }}>{s.count}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: isActive ? 'white' : s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{ id: 'mapa', label: 'Mapa de Riesgos' }, { id: 'legislativo', label: 'Riesgos Legislativos' }, { id: 'cronograma', label: 'Calendario de seguimiento' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? C.navy : '#f1f5f9', color: tab === t.id ? 'white' : C.text,
              border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'mapa' && (
        <div>
          {riesgos.filter(r => {
            if (riesgoFilter === 'Todos') return true
            if (riesgoFilter === 'Alto') return r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente'))
            if (riesgoFilter === 'Medio') return r.semaforo && (r.semaforo.includes('Medio') || r.semaforo.includes('Vigilar'))
            if (riesgoFilter === 'Bajo') return r.semaforo && (r.semaforo.includes('Bajo') || r.semaforo.includes('control'))
            if (riesgoFilter === 'Revision') return r.semaforo && r.semaforo.includes('Revision')
            return true
          }).map(r => {
            const semColor = getSemaforoColor(r.semaforo)
            const isExp = expandedRisk === r.id
            const bt = bowTieData[r.id] || []
            return (
              <div key={r.id} style={{ background: C.card, borderRadius: 12, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${semColor}`, overflow: 'hidden' }}>
                <div onClick={() => toggleRisk(r.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'white', background: semColor, padding: '2px 8px', borderRadius: 10 }}>{r.id}</span>
                      <span style={{ fontSize: 16, color: C.muted }}>{r.zona}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Tag color={C.muted}>P: {r.probabilidad}</Tag>
                      <Tag color={semColor}>I: {r.impacto}</Tag>
                      {isAdmin && (
                        <button onClick={async (e) => { e.stopPropagation(); if (confirm('¿Borrar este riesgo?')) { await deleteRiesgo(r.id); onDeleted() } }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.red, padding: '0 2px' }}
                          title="Borrar">🗑</button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{r.nombre}</div>
                  {!isExp && r.que_hacemos && <div style={{ fontSize: 15, color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.que_hacemos}</div>}
                </div>
                {isExp && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
                    <div style={{ paddingTop: 12 }}>
                      {r.descripcion && <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.5, marginBottom: 10, background: '#fff7ed', padding: '8px 10px', borderRadius: 8 }}><span style={{ fontWeight: 700, color: '#9a3412' }}>Que puede pasar: </span>{r.descripcion}</div>}
                      {r.quien_detona && <div style={{ fontSize: 15, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.red }}>Actores clave a gestionar: </span>{r.quien_detona}</div>}
                      {r.quien_mitiga && <div style={{ fontSize: 15, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.green }}>Quien nos ayuda a controlarlo: </span>{r.quien_mitiga}</div>}
                      {r.que_hacemos && <div style={{ fontSize: 15, color: '#166534', background: '#f0fdf4', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5, marginBottom: 10 }}><span style={{ fontWeight: 700 }}>Que estamos haciendo hoy: </span>{r.que_hacemos}</div>}
                      {bt.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Causa y efecto</div>
                          {bt.map((b, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, marginBottom: 8, fontSize: 16, lineHeight: 1.4 }}>
                              <div>
                                {b.causa && <div style={{ background: '#fee2e2', padding: '6px 8px', borderRadius: 6, color: '#991b1b', marginBottom: 3 }}><span style={{ fontWeight: 700 }}>Causa: </span>{b.causa}</div>}
                                {b.control_preventivo && <div style={{ background: '#dbeafe', padding: '6px 8px', borderRadius: 6, color: '#1e40af' }}><span style={{ fontWeight: 700 }}>Que hacemos para evitarlo: </span>{b.control_preventivo}</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', color: C.subtle, fontSize: 16, padding: '0 4px' }}>&rarr;</div>
                              <div>
                                {b.control_detectivo && <div style={{ background: '#fef9c3', padding: '6px 8px', borderRadius: 6, color: '#854d0e', marginBottom: 3 }}><span style={{ fontWeight: 700 }}>Como nos enteramos: </span>{b.control_detectivo}</div>}
                                {b.consecuencia && <div style={{ background: '#fce7f3', padding: '6px 8px', borderRadius: 6, color: '#9d174d' }}><span style={{ fontWeight: 700 }}>Si no actuamos: </span>{b.consecuencia}</div>}
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
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3, flex: 1 }}>{r.tema}</div>
                  <Tag color={nivelColor}>{r.nivel_riesgo}</Tag>
                </div>
                <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>{r.descripcion}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <Tag color={C.muted}>Prob: {r.probabilidad}</Tag>
                  <Tag color={C.accent}>{r.comision}</Tag>
                </div>
                {r.impacto && <div style={{ fontSize: 15, color: '#9a3412', background: '#fff7ed', padding: '6px 8px', borderRadius: 6, lineHeight: 1.5, marginBottom: 6 }}><span style={{ fontWeight: 700 }}>Impacto: </span>{r.impacto}</div>}
                {r.acciones_preventivas && <div style={{ fontSize: 15, color: '#166534', background: '#f0fdf4', padding: '6px 8px', borderRadius: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700 }}>Acciones: </span>{r.acciones_preventivas}</div>}
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
                      <div><span style={{ fontSize: 16, fontWeight: 700, color: nivelColor, textTransform: 'uppercase' }}>{ev.fecha}</span> <Tag color={C.muted} bg="#f1f5f9">{ev.tipo}</Tag></div>
                      <Tag color={nivelColor}>{ev.nivel_riesgo}</Tag>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{ev.evento}</div>
                    <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginBottom: 4 }}>{ev.impacto}</div>
                    {ev.accion && <div style={{ fontSize: 16, color: '#166534', background: '#f0fdf4', padding: '6px 8px', borderRadius: 6, lineHeight: 1.4 }}><span style={{ fontWeight: 700 }}>Accion: </span>{ev.accion}</div>}
                    {ev.responsable && <div style={{ fontSize: 16, color: C.subtle, marginTop: 4 }}>Responsable: {ev.responsable}</div>}
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
function KPIsView({ reportes, seguimiento, isAdmin, onDeleted, agreements }) {
  const [terrFilter, setTerrFilter] = useState('Todos')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

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
    { cat: 'EVENTOS Y REUNIONES', items: [
      { name: 'Eventos area influencia directa', field: 'eventos_aid', meta: 12, base: '1/mes' },
      { name: 'Eventos area influencia indirecta', field: 'eventos_aii', meta: 4, base: '1/trim' },
      { name: 'Reuniones institucionales', field: 'eventos_institucional', meta: 4, base: '1/trim' },
    ]},
    { cat: 'DIAGNOSTICO EN TERRITORIO', items: [
      { name: 'Visitas a familias', field: 'diagnosticos', meta: 53, base: '53 viv/sem' },
      { name: 'Actas de vecindad', field: 'actas_vecindad', meta: 0, base: 'Segun obra' },
      { name: 'Capacitaciones a contratistas', field: 'inducciones_pgs', meta: 8, base: '2/trim' },
    ]},
    { cat: 'QUEJAS Y RECLAMOS', items: [
      { name: 'Quejas recibidas', field: 'pqrs_recibidas', meta: 0, base: '0/mes', invert: true },
      { name: 'Quejas sin resolver', field: 'pqrs_pendientes', meta: 0, base: '0/mes', invert: true },
      { name: 'Incidentes', field: 'incidentes', meta: 0, base: '0/mes', invert: true },
    ]},
    { cat: 'ACUERDOS CON LA COMUNIDAD', items: [
      { name: 'Acuerdos firmados', field: 'acuerdos_firmados', meta: 3, base: 'Antes COD' },
      { name: 'Compromisos cumplidos', field: 'compromisos_cumplidos', meta: 0, base: '>=90%' },
    ]},
    { cat: 'CONTACTOS Y RELACIONES', items: [
      { name: 'Personas contactadas', field: 'actores_gestionados', meta: 0, base: 'Semanal' },
      { name: 'Alertas escaladas DAC', field: 'alertas_escaladas_dac', meta: 0, base: '0/mes', invert: true },
    ]},
  ]

  const KPIS_TOLU = [
    { cat: 'EVENTOS Y REUNIONES', items: [
      { name: 'Eventos area influencia directa', field: 'eventos_aid', meta: 12, base: '1/mes' },
      { name: 'Eventos area influencia indirecta', field: 'eventos_aii', meta: 4, base: '1/trim' },
      { name: 'Reuniones institucionales', field: 'eventos_institucional', meta: 4, base: '1/trim' },
    ]},
    { cat: 'DIAGNOSTICO EN TERRITORIO', items: [
      { name: 'Organizaciones identificadas', field: 'diagnosticos', meta: 0, base: 'Acumulativo' },
      { name: 'Capacitaciones a contratistas', field: 'inducciones_pgs', meta: 8, base: '2/trim' },
    ]},
    { cat: 'QUEJAS Y RECLAMOS', items: [
      { name: 'Quejas recibidas', field: 'pqrs_recibidas', meta: 0, base: '0/mes', invert: true },
      { name: 'Quejas sin resolver', field: 'pqrs_pendientes', meta: 0, base: '0/mes', invert: true },
      { name: 'Incidentes', field: 'incidentes', meta: 0, base: '0/mes', invert: true },
    ]},
    { cat: 'ACUERDOS CON LA COMUNIDAD', items: [
      { name: 'Acuerdos firmados', field: 'acuerdos_firmados', meta: 3, base: 'Antes COD' },
      { name: 'Compromisos cumplidos', field: 'compromisos_cumplidos', meta: 0, base: '>=90%' },
    ]},
    { cat: 'CONTACTOS Y RELACIONES', items: [
      { name: 'Personas contactadas', field: 'actores_gestionados', meta: 0, base: 'Semanal' },
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
            <div style={{ fontSize: 15, color: C.subtle }}>
              {territorio === 'Tolu' ? 'Terminal maritima' : 'Planta de regasificacion'} &rarr; {totalReportes} reportes
            </div>
          </div>
        </div>

        {kpis.map(cat => (
          <div key={cat.cat} style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{cat.cat}</div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr) 60px 50px', gap: 4, marginBottom: 6, alignItems: 'center', minWidth: 380 }}>
              <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700 }}>KPI</div>
              <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q1</div>
              <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q2</div>
              <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q3</div>
              <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Q4</div>
              <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Total</div>
              <div style={{ fontSize: 15, color: C.subtle, fontWeight: 700, textAlign: 'center' }}>Meta</div>
            </div>

            {cat.items.map(kpi => {
              const total = sumTotal(territorio, kpi.field)
              const pct = kpi.meta > 0 ? Math.round((total / kpi.meta) * 100) : 0
              const statusColor = kpi.invert
                ? (total === 0 ? C.green : total <= 3 ? C.orange : C.red)
                : (kpi.meta > 0 ? (pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red) : C.subtle)

              return (
                <div key={kpi.name} style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr) 60px 50px', gap: 4, alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid #f1f5f9', minWidth: 380 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{kpi.name}</div>
                    <div style={{ fontSize: 15, color: C.subtle }}>{kpi.base}</div>
                  </div>
                  {[1, 2, 3, 4].map(q => (
                    <div key={q} style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: C.text }}>
                      {sumQ(territorio, kpi.field, q) || '-'}
                    </div>
                  ))}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: statusColor }}>{total}</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, color: C.muted }}>
                    {kpi.meta || '-'}
                  </div>
                </div>
              )
            })}
            </div>{/* close overflowX wrapper */}
          </div>
        ))}

        {(() => {
          const agTerritory = agreements.filter(a => a.territorio === territorio)
          if (!agTerritory.length) return null
          const cumplidos = agTerritory.filter(a => a.estado_code === 'cumplido').length
          const enCurso = agTerritory.filter(a => a.estado_code === 'en_curso').length
          const porEstructurar = agTerritory.filter(a => a.estado_code === 'por_estructurar' || a.estado_code === 'estructural').length
          const avgAvance = Math.round(agTerritory.reduce((sum, a) => sum + (a.avance || 0), 0) / agTerritory.length)
          return (
            <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>ACUERDOS TERRITORIALES</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: avgAvance >= 90 ? C.green : avgAvance >= 50 ? C.orange : C.red }}>{avgAvance}%</div>
                  <div style={{ fontSize: 13, color: C.muted }}>avance promedio</div>
                </div>
                <div style={{ flex: 1 }}>
                  <Bar value={avgAvance} color={avgAvance >= 90 ? C.green : avgAvance >= 50 ? C.orange : C.red} height={8} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{agTerritory.length} acuerdos</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {agTerritory.map(a => {
                  const ac = { cumplido: C.green, en_curso: C.accent, estructural: C.barbosa, por_estructurar: C.yellow }[a.estado_code] || C.accent
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, width: 24 }}>{a.id}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                        <Bar value={a.avance} color={ac} height={5} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: ac, width: 36, textAlign: 'right' }}>{a.avance}%</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {cumplidos > 0 && <Tag color={C.green}>Cumplido: {cumplidos}</Tag>}
                {enCurso > 0 && <Tag color={C.accent}>En curso: {enCurso}</Tag>}
                {porEstructurar > 0 && <Tag color={C.yellow}>Por estructurar: {porEstructurar}</Tag>}
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  const totalReportes = reportes.length
  const totalCompromisos = seguimiento.length
  const compromisosCumplidos = seguimiento.filter(s => s.estado === 'Cumplido').length
  const totalEventos = reportes.reduce((s, r) => s + (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0), 0)
  const totalIncidentes = reportes.reduce((s, r) => s + (r.incidentes || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>KPIs Gestion Social</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>Seguimiento anual &rarr; Ene-Dic 2026 &rarr; Calculado de reportes semanales</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard label="Reportes" value={totalReportes} color={C.navy} />
        <StatCard label="Eventos" value={totalEventos} color={C.tolu} />
        <StatCard label="Compromisos" value={`${compromisosCumplidos}/${totalCompromisos}`} color={C.green} />
        <StatCard label="Incidentes" value={totalIncidentes} color={totalIncidentes === 0 ? C.green : C.red} />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['Todos', 'Barbosa', 'Tolu'].map(t => (
          <button key={t} onClick={() => setTerrFilter(t)}
            style={{ background: terrFilter === t ? C.navy : '#f1f5f9', color: terrFilter === t ? 'white' : C.text,
              border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
            {t === 'Tolu' ? 'Tolú' : t}
          </button>
        ))}
      </div>

      {(terrFilter === 'Todos' || terrFilter === 'Barbosa') && renderTerritory('Barbosa', KPIS_BARBOSA)}
      {(terrFilter === 'Todos' || terrFilter === 'Tolu') && renderTerritory('Tolú', KPIS_TOLU)}

      {totalReportes === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ fontSize: 16, marginBottom: 6 }}>No hay reportes semanales aun</div>
          <div style={{ fontSize: 16 }}>Los KPIs se calculan automaticamente cuando las gestoras llenen sus reportes en Input Semanal.</div>
        </div>
      )}
    </div>
  )
}

// InputSemanal component
function InputSemanal({ session, profile, territorio, reportes, seguimiento, onSaved, isAdmin }) {
  const [tab, setTab] = useState('reporte')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [myTerr, setMyTerr] = useState(territorio || 'Barbosa')

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

  const [alertaMensaje, setAlertaMensaje] = useState('')
  const [alertaUrgencia, setAlertaUrgencia] = useState('Media')
  const [alertaEnviada, setAlertaEnviada] = useState(false)

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

  async function handleSendAlerta() {
    if (!alertaMensaje.trim()) return
    setSaving(true)
    try {
      await sendAlerta({
        gestora: profile?.full_name || session?.user?.email,
        territorio: myTerr,
        mensaje: alertaMensaje,
        urgencia: alertaUrgencia
      })
      setAlertaMensaje('')
      setAlertaEnviada(true)
      setTimeout(() => setAlertaEnviada(false), 4000)
    } catch(e) {
      alert('Error enviando alerta: ' + e.message)
    } finally { setSaving(false) }
  }

  const myReportes = reportes.filter(r => r.territorio === myTerr)

  const NumField = ({ label, value, onChange }) => (
    <div style={{ flex: 1, minWidth: 120 }}>
      <label style={{ fontSize: 16, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type="number" min="0" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 16,
          fontWeight: 700, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center' }} />
    </div>
  )

  const TextArea = ({ label, value, onChange, placeholder }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 15, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 16,
          resize: 'none', height: 60, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Input Semanal</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{profile?.full_name} &rarr; Cada viernes</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {['Barbosa', 'Tolú'].map(t => (
                <button key={t} onClick={() => setMyTerr(t)}
                  style={{ flex: 1, background: myTerr === t ? C.navy : '#f1f5f9', color: myTerr === t ? 'white' : C.text,
                    border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
      </div>

      {saved && (
        <div style={{ background: '#dcfce7', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 15, color: '#166534', fontWeight: 600 }}>
          Guardado correctamente
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'reporte', label: 'Reporte Semanal' },
          { id: 'alerta', label: '🚨 Escalar alerta' },
          { id: 'historico', label: 'Histórico' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? (t.id === 'alerta' ? C.red : C.navy) : '#f1f5f9',
              color: tab === t.id ? 'white' : C.text,
              border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reporte' && (
        <div>
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 16, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3 }}>SEMANA #</label>
                <input type="number" value={semana} onChange={e => setSemana(e.target.value)} placeholder="1-52"
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 16,
                    fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 16, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3 }}>FECHA CORTE</label>
                <input type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 15,
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>P1 &mdash; Acuerdos Sociales</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Firmados" value={acuerdosFirmados} onChange={setAcuerdosFirmados} />
              <NumField label="Compromisos nuevos" value={compromisosNuevos} onChange={setCompromisosNuevos} />
              <NumField label="Cumplidos" value={compromisosCumplidos} onChange={setCompromisosCumplidos} />
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.barbosa, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>P2 &mdash; Diagnóstico Territorial</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Visitas y diagnosticos" value={diagnosticos} onChange={setDiagnosticos} />
              <NumField label="Actas y acuerdos vecinales" value={actasVecindad} onChange={setActasVecindad} />
              <NumField label="Capacitaciones a contratistas" value={induccionesPgs} onChange={setInduccionesPgs} />
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.tolu, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>P3 &mdash; Eventos y Socializaciones</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Eventos area influencia directa" value={eventosAid} onChange={setEventosAid} />
              <NumField label="Eventos area influencia indirecta" value={eventosAii} onChange={setEventosAii} />
              <NumField label="Institucional" value={eventosInst} onChange={setEventosInst} />
              <NumField label="Asistentes total" value={asistentes} onChange={setAsistentes} />
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.orange, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Quejas, peticiones y reclamos</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Quejas recibidas" value={pqrsRecibidas} onChange={setPqrsRecibidas} />
              <NumField label="Cerradas" value={pqrsCerradas} onChange={setPqrsCerradas} />
              <NumField label="Pendientes" value={pqrsPendientes} onChange={setPqrsPendientes} />
              <NumField label="Incidentes" value={incidentes} onChange={setIncidentes} />
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Contactos y alertas</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Personas contactadas" value={actoresGest} onChange={setActoresGest} />
              <NumField label="Alertas enviadas a direccion" value={alertasDac} onChange={setAlertasDac} />
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Resumen Narrativo</div>
            <TextArea label="Que se logro esta semana" value={logros} onChange={setLogros} placeholder="Que se logro esta semana..." />
            <TextArea label="Dificultades o problemas" value={dificultades} onChange={setDificultades} placeholder="Que dificultades hubo..." />
            <TextArea label="Temas que necesitan atencion de direccion" value={escalamientos} onChange={setEscalamientos} placeholder="Que se escalo a Diana..." />
            <TextArea label="Que hay que hacer la proxima semana" value={prioridades} onChange={setPrioridades} placeholder="Que hay que hacer la proxima semana..." />
          </div>

          <button onClick={handleSaveReporte} disabled={saving || !semana}
            style={{ width: '100%', background: saving ? '#94a3b8' : C.navy, color: 'white',
              border: 'none', borderRadius: 10, padding: '13px', fontSize: 16, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', marginBottom: 20 }}>
            {saving ? 'Guardando...' : 'Guardar Reporte Semanal'}
          </button>
          <a href="https://course2-my.sharepoint.com/:f:/g/personal/diana_silva_caribelng_com/IgC30umcdhdBRY5F1Sjx_MMrAa8c1li2QamoYiBNuVLR3LE?e=ZvD6QH" target="_blank" rel="noopener"
            style={{ display: 'block', width: '100%', background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: '11px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              textAlign: 'center', textDecoration: 'none', color: C.accent, boxSizing: 'border-box' }}>
            Abrir OneDrive — Subir evidencias ({myTerr})
          </a>
        </div>
      )}

      {tab === 'alerta' && (
        <div>
          <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>🚨 Escalar alerta a Diana Silva</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>El mensaje llega directamente al correo de la Directora de Asuntos Corporativos.</div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Nivel de urgencia</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Alta', 'Media', 'Baja'].map(u => (
                  <button key={u} onClick={() => setAlertaUrgencia(u)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid',
                      borderColor: alertaUrgencia === u ? (u === 'Alta' ? C.red : u === 'Media' ? C.orange : C.yellow) : '#e2e8f0',
                      background: alertaUrgencia === u ? (u === 'Alta' ? '#fee2e2' : u === 'Media' ? '#fff7ed' : '#fefce8') : 'white',
                      color: alertaUrgencia === u ? (u === 'Alta' ? C.red : u === 'Media' ? C.orange : C.yellow) : C.muted,
                      fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    {u === 'Alta' ? '🔴' : u === 'Media' ? '🟠' : '🟡'} {u}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Mensaje *</label>
              <textarea value={alertaMensaje} onChange={e => setAlertaMensaje(e.target.value)} rows={5}
                placeholder="Describe la situación que necesitas escalar: qué pasó, quiénes están involucrados, qué necesitas de Diana..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #fecdd3',
                  fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            {alertaEnviada && (
              <div style={{ background: '#dcfce7', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 14, color: '#166534', fontWeight: 600 }}>
                ✅ Alerta enviada a diana.silva@caribelng.com
              </div>
            )}

            <button onClick={handleSendAlerta} disabled={saving || !alertaMensaje.trim()}
              style={{ width: '100%', background: saving || !alertaMensaje.trim() ? '#f1f5f9' : C.red,
                color: saving || !alertaMensaje.trim() ? C.muted : 'white',
                border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700,
                cursor: saving || !alertaMensaje.trim() ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enviando...' : '🚨 Enviar alerta'}
            </button>
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Reportes enviados ({myReportes.length})
          </div>
          {myReportes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: C.subtle, fontSize: 15 }}>No hay reportes aun. Llena tu primer reporte semanal.</div>
          )}
          {myReportes.map(r => {
            const totalEventos = (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0)
            const semaforo = r.incidentes > 0 ? C.red : r.pqrs_pendientes > 3 ? C.orange : C.green
            return (
              <div key={r.id} style={{ background: C.card, borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${semaforo}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Semana {r.semana}</span>
                    <span style={{ fontSize: 15, color: C.subtle, marginLeft: 8 }}>{new Date(r.fecha_corte).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {(isAdmin || profile?.role === 'gestora') && (
                      <button onClick={async () => { if (confirm('¿Borrar este reporte?')) { await deleteReporteSemanal(r.id); onSaved() } }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.red, padding: '0 2px' }}
                        title="Borrar">🗑</button>
                    )}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: semaforo }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'Acuerdos', value: r.acuerdos_firmados, color: C.accent },
                    { label: 'Eventos', value: totalEventos, color: C.tolu },
                    { label: 'Quejas pend.', value: r.pqrs_pendientes, color: r.pqrs_pendientes > 0 ? C.orange : C.green },
                    { label: 'Actores', value: r.actores_gestionados, color: C.barbosa },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 15, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {r.logros && <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.text }}>Logros: </span>{r.logros}</div>}
                {r.dificultades && <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginTop: 2 }}><span style={{ fontWeight: 700, color: C.text }}>Dificultades: </span>{r.dificultades}</div>}
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

  const [view, setView] = useState('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
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
  const [cronoEstadoFilter, setCronoEstadoFilter] = useState('Todos')
  const [riesgos, setRiesgos] = useState([])
  const [riesgosLeg, setRiesgosLeg] = useState([])
  const [cronoLeg, setCronoLeg] = useState([])
  const [reportes, setReportes] = useState([])
  const [seguimiento, setSeguimiento] = useState([])

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

  useEffect(() => {
    if (selectedActor) {
      const fresh = actors.find(a => a.id === selectedActor.id)
      if (fresh) setSelectedActor(fresh)
    }
  }, [actors])

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

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isAdmin = profile?.role === 'admin'
  const isGestora = profile?.role === 'gestora' || isAdmin
  const myTerritorio = profile?.territorio

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>Cargando...</div>
    </div>
  )
  if (!session) return <LoginScreen />

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'actores', label: 'Actores', icon: '👥' },
    { id: 'acuerdos', label: 'Acuerdos', icon: '🤝' },
    { id: 'cronograma', label: 'Cronograma', icon: '📅' },
    { id: 'huella', label: 'Huella Social', icon: '🌱' },
    { id: 'input', label: 'Input Semanal', icon: '✍️' },
    { id: 'kpis', label: 'KPIs', icon: '🎯' },
    { id: 'riesgos', label: 'Riesgos', icon: '⚠️' },
    ...(isGestora ? [{ id: 'gestora', label: 'Mi territorio', icon: '📍' }] : []),
  ]

  return (
    <div style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: '100vh', background: C.bg, color: C.text }}>
      {/* Top nav */}
      <div style={{ background: C.navy, color: 'white', position: 'sticky', top: 0, zIndex: 100 }}>
        {isMobile ? (
          <>
            {/* Mobile: top bar — hamburger + logo + user */}
            <div style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 14, paddingRight: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Hamburger */}
                <button onClick={() => setDrawerOpen(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ display: 'block', width: 22, height: 2, background: 'white', borderRadius: 2 }} />
                  <span style={{ display: 'block', width: 22, height: 2, background: 'white', borderRadius: 2 }} />
                  <span style={{ display: 'block', width: 22, height: 2, background: 'white', borderRadius: 2 }} />
                </button>
                <div style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${C.accent}, ${C.tolu})`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg viewBox="0 0 863.64 794.92" width="16" height="16"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#fff" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg></div>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>Caribe LNG</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  : <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>{initials(profile?.full_name || session.user.email)}</div>
                }
                <button onClick={signOut}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
                    padding: '6px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>
                  Salir
                </button>
              </div>
            </div>
            {/* Left drawer overlay */}
            {drawerOpen && (
              <>
                {/* Backdrop */}
                <div onClick={() => setDrawerOpen(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
                {/* Drawer panel */}
                <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
                  background: C.navy, zIndex: 201, display: 'flex', flexDirection: 'column',
                  boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
                  paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                  {/* Drawer header */}
                  <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, background: `linear-gradient(135deg, ${C.accent}, ${C.tolu})`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg viewBox="0 0 863.64 794.92" width="16" height="16"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#fff" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg></div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Caribe LNG</span>
                    </div>
                    <button onClick={() => setDrawerOpen(false)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                  {/* Nav items */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                    {NAV.map(n => (
                      <button key={n.id} onClick={() => { setView(n.id); setDrawerOpen(false) }}
                        style={{ width: '100%', background: view === n.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                          color: view === n.id ? '#93c5fd' : 'rgba(255,255,255,0.75)',
                          border: 'none', borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                          fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10,
                          textAlign: 'left', marginBottom: 2 }}>
                        <span style={{ fontSize: 18 }}>{n.icon}</span>
                        <span>{n.label}</span>
                      </button>
                    ))}
                  </div>
                  {/* User info at bottom */}
                  <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                      : <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials(profile?.full_name || session.user.email)}</div>
                    }
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name || session.user.email}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{profile?.role || 'usuario'}</div>
                    </div>
                    <button onClick={signOut}
                      style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
                        padding: '6px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                      Salir
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, background: `linear-gradient(135deg, ${C.accent}, ${C.tolu})`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><svg viewBox="0 0 863.64 794.92" width="20" height="20"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#fff" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg></div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>Caribe LNG</div>
                <div style={{ fontSize: 15, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Conecta! | Plan de Gestion Social 2026</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {NAV.map(n => (
                <button key={n.id} onClick={() => setView(n.id)}
                  style={{ background: view === n.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                    color: view === n.id ? '#93c5fd' : 'rgba(255,255,255,0.55)',
                    border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'white' }}>{initials(profile?.full_name || session.user.email)}</div>
              }
              <button onClick={signOut}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
                  padding: '4px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 15, cursor: 'pointer' }}>
                Salir
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: isMobile ? '16px 14px' : '24px 40px' }}>

        {/* ━━ DASHBOARD ━━ */}
        {view === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Caribe LNG Conecta | Estado del territorio</h1>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>Resumen de relacionamiento →  Caribe LNG 2026 →  Tiempo real</p>
                <button onClick={() => window.print()} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Exportar PDF</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 24, alignItems: 'start' }}>
            <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginBottom: -8 }}>
                <div style={{ width: 3, height: 18, background: C.navy, borderRadius: 2 }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mapeo de Actores</span>
              </div>
              <div onClick={() => { setView('actores'); setFilterS('Todos') }} style={{ cursor: 'pointer' }}><StatCard label="Actores totales" value={stats.total} sub={`${stats.prioA} prioridad A`} color={C.navy} icon="👥" /></div>
              <div onClick={() => { setView('actores'); setFilterS('verde') }} style={{ cursor: 'pointer' }}><StatCard label="Relación estable 🟢" value={stats.verde} color={C.green} icon="✅" /></div>
              <div onClick={() => { setView('actores'); setFilterS('amarillo') }} style={{ cursor: 'pointer' }}><StatCard label="En atención" value={stats.amarillo + stats.naranja} sub="Amarillo + Naranja" color={C.orange} icon="⚠️" /></div>
              <div onClick={() => { setView('actores'); setFilterS('rojo') }} style={{ cursor: 'pointer' }}><StatCard label="Acercamiento por iniciar 🔴" value={stats.rojo} color={C.red} icon="🚨" /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 18, background: C.red, borderRadius: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mapa de Riesgos</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div onClick={() => setView('riesgos')} style={{ cursor: 'pointer', display: 'block', maxWidth: isMobile ? '100%' : 320 }}>
                <StatCard label="Riesgos en acción inmediata" value={riesgos.filter(r => r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente'))).length} sub="Ver mapa completo →" color='#dc2626' icon="🗺️" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 18, background: C.tolu, borderRadius: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actores por Territorio</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Tolú', value: stats.tolu, color: C.tolu, desc: 'Terminal marítima →  Sucre' },
                { label: 'Barbosa', value: stats.barbosa, color: C.barbosa, desc: 'Planta regasificación →  Antioquia' },
                { label: 'Nacional', value: stats.nacional, color: C.muted, desc: 'Legislativo →  Regulatorio' },
              ].map(t => (
                <div key={t.label} onClick={() => { setView('actores'); setFilterT(t.label) }} style={{ background: C.card, borderRadius: 12, padding: '14px 18px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `4px solid ${t.color}`, cursor: 'pointer' }}>
                  <div style={{ fontSize: 34, fontWeight: 900, color: t.color }}>{t.value}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{t.label}</div>
                  <div style={{ fontSize: 15, color: C.subtle, marginTop: 1 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 18, background: C.accent, borderRadius: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Semáforo de Relacionamiento & Acuerdos</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.text }}>Semáforo de relacionamiento</h3>
                {[['verde', 'Relación estable', stats.verde], ['amarillo', 'Requiere atención', stats.amarillo],
                  ['naranja', 'Riesgo moderado', stats.naranja], ['rojo', 'Acercamiento por iniciar', stats.rojo]].map(([k, lbl, v]) => (
                  <div key={k} onClick={() => { setView('actores'); setFilterS(k) }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, cursor: 'pointer' }}>
                    <SemDot s={k} size={9} />
                    <span style={{ fontSize: 16, color: C.muted, width: 140 }}>{lbl}</span>
                    <div style={{ flex: 1 }}><Bar value={stats.total ? (v / stats.total) * 100 : 0} color={SEMAFORO[k].color} /></div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: SEMAFORO[k].color, width: 24, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.text }}>Estado de acuerdos territoriales</h3>
                {agreements.map(ag => {
                  const barColor = { cumplido: C.green, en_curso: C.accent, estructural: C.barbosa, por_estructurar: C.yellow }[ag.estado_code] || C.accent
                  return (
                    <div key={ag.id} onClick={() => setView('acuerdos')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: C.muted, width: 22 }}>{ag.id}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, color: C.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.nombre}</div>
                        <Bar value={ag.avance} color={barColor} height={5} />
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, width: 30, textAlign: 'right', color: barColor }}>{ag.avance}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 18, background: C.red, borderRadius: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actores en Gestión Prioritaria</span>
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: C.text }}>⚠️ Actores en gestion prioritaria — Acción requerida</h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {actors.filter(a => a.semaforo === 'rojo' && a.prioridad === 'A').slice(0, 8).map(a => (
                  <div key={a.id} onClick={() => { setSelectedActor(a); setView('actores') }}
                    style={{ display: 'flex', gap: 10, background: '#fff5f5', borderRadius: 8,
                      padding: '10px 12px', border: '1px solid #fecaca', cursor: 'pointer', alignItems: 'flex-start' }}>
                    <Avatar name={a.nombre} size={30} color={getTipoColor(a.tipo)} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                      <div style={{ fontSize: 15, color: C.muted }}>{a.territorio} →  {a.tipo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            <div style={{ position: 'sticky', top: 80 }}>
              <div style={{ background: C.card, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div style={{ background: C.navy, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🔔</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '0.04em' }}>NOVEDADES</span>
                </div>
                <div style={{ padding: 12 }}>
                  {(() => {
                    const alertas = []
                    const hoy = new Date()
                    const ultimosReportes = {}
                    reportes.forEach(r => { if (!ultimosReportes[r.territorio] || r.semana > ultimosReportes[r.territorio].semana) ultimosReportes[r.territorio] = r })
                    Object.values(ultimosReportes).forEach(r => {
                      if (r.pqrs_pendientes > 0) alertas.push({ icon: '⚠️', text: `${r.territorio}: ${r.pqrs_pendientes} quejas sin resolver`, color: C.orange, nav: () => setView('input') })
                      if (r.incidentes > 0) alertas.push({ icon: '🚨', text: `${r.territorio}: ${r.incidentes} incidente(s)`, color: C.red, nav: () => setView('input') })
                    })
                    seguimiento.filter(s => s.estado === 'Pendiente' && s.fecha_pactada).forEach(s => {
                      if (new Date(s.fecha_pactada) < hoy) alertas.push({ icon: '📋', text: `Compromiso vencido: ${(s.compromiso || '').substring(0, 45)}...`, color: C.red, nav: () => setView('input') })
                    })
                    cronograma.filter(c => c.estado === 'En proceso').forEach(c => {
                      alertas.push({ icon: '📅', text: `${c.territorio}: ${(c.evento || '').substring(0, 50)}...`, color: C.accent, nav: () => setView('cronograma') })
                    })
                    const riesgosAltos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente')))
                    if (riesgosAltos.length > 0) alertas.push({ icon: '🔴', text: `${riesgosAltos.length} riesgo(s) en acción inmediata`, color: C.red, nav: () => setView('riesgos') })
                    if (!alertas.length) return (
                      <div style={{ padding: '20px 8px', textAlign: 'center', color: C.subtle, fontSize: 14 }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                        Sin novedades por ahora
                      </div>
                    )
                    return alertas.map((a, i) => (
                      <div key={i} onClick={a.nav} style={{ display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '9px 10px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                        borderLeft: `3px solid ${a.color}`, background: a.color === C.red ? '#fef2f2' : a.color === C.orange ? '#fff7ed' : '#eff6ff' }}>
                        <span style={{ fontSize: 14, marginTop: 1 }}>{a.icon}</span>
                        <span style={{ fontSize: 13, color: a.color, fontWeight: 600, lineHeight: 1.4 }}>{a.text}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* ━━ ACTORES ━━ */}
        {view === 'actores' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Base de Actores</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{filtered.length} de {actors.length} actores</p>
            </div>

            {/* ── Banner territorial ── */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {/* Total */}
              <div style={{ background: C.navy, borderRadius: 14, padding: '20px 22px', color: 'white',
                cursor: 'pointer', transition: 'opacity 0.15s' }}
                onClick={() => { setFilterT('Todos'); setFilterS('Todos'); setFilterR('Todos'); setSearch('') }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.55, marginBottom: 8 }}>Total actores</div>
                <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{stats.total}</div>
                <div style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>{stats.prioA} prioridad A</div>
              </div>
              {/* Tolú */}
              <div style={{ background: C.tolu, borderRadius: 14, padding: '20px 22px', color: 'white',
                cursor: 'pointer', transition: 'opacity 0.15s' }}
                onClick={() => setFilterT('Tolú')}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 8 }}>Tolú</div>
                <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{stats.tolu}</div>
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 6 }}>Terminal marítima · Sucre</div>
              </div>
              {/* Barbosa */}
              <div style={{ background: C.barbosa, borderRadius: 14, padding: '20px 22px', color: 'white',
                cursor: 'pointer', transition: 'opacity 0.15s' }}
                onClick={() => setFilterT('Barbosa')}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 8 }}>Barbosa</div>
                <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{stats.barbosa}</div>
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 6 }}>Planta regasificación · Antioquia</div>
              </div>
              {/* Nacional */}
              <div style={{ background: C.blue, borderRadius: 14, padding: '20px 22px', color: 'white',
                cursor: 'pointer', transition: 'opacity 0.15s' }}
                onClick={() => setFilterT('Nacional')}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 8 }}>Nacional</div>
                <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{stats.nacional}</div>
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 6 }}>Legislativo · Regulatorio</div>
              </div>
            </div>

            {/* Filtros */}
            <div style={{ background: C.card, borderRadius: 12, padding: '12px 14px', marginBottom: 14,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar por nombre, tipo..."
                style={{ flex: 1, minWidth: 180, border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: isMobile ? '11px 14px' : '7px 11px',
                  fontSize: isMobile ? 16 : 15, outline: 'none', color: C.text, fontFamily: 'inherit' }} />
              {[
                { val: filterT, set: setFilterT, label: 'Territorio', opts: ['Todos', 'Tolú', 'Barbosa', 'Nacional'] },
                { val: filterS, set: setFilterS, label: 'Estado de la relación', opts: ['Todos', 'verde', 'amarillo', 'naranja', 'rojo'] },
                { val: filterR, set: setFilterR, label: 'Riesgo', opts: ['Todos', 'Bajo', 'Medio', 'Alto', 'Muy Alto'] },
              ].map(f => (
                <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: isMobile ? '11px 12px' : '7px 10px', fontSize: 16,
                    outline: 'none', color: C.text, background: 'white', fontFamily: 'inherit', cursor: 'pointer' }}>
                  {f.opts.map(o => <option key={o} value={o}>{f.label}: {o}</option>)}
                </select>
              ))}
            </div>

            {/* Grilla */}
            {dataLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>Cargando actores...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: 10 }}>
                {filtered.map(a => <ActorCard key={a.id} actor={a} onClick={setSelectedActor} />)}
              </div>
            )}
          </div>
        )}

        {/* ━━ ACUERDOS ━━ */}
        {view === 'acuerdos' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Acuerdos Territoriales</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>6 acuerdos →  3 Barbosa →  3 Tolú →  Co-responsabilidad comunitaria</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>
              {['Barbosa', 'Tolú'].map(t => (
                <div key={t}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 20, background: t === 'Tolú' ? C.tolu : C.barbosa, borderRadius: 2 }} />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{t}</div>
                      <div style={{ fontSize: 15, color: C.subtle }}>{t === 'Tolú' ? 'Terminal marítima' : 'Planta de regasificación'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {agreements.filter(a => a.territorio === t)
                      .sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)))
                      .map(ag => (
                      <AgreementCard key={ag.id} ag={ag} canEdit={isGestora} onEdit={() => {}} onAvanceAdded={loadData} isAdmin={isAdmin} />
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
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Cronograma 2026</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>Gestión Social Territorial → Nov 2025 – Dic 2026</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {(() => {
                const cumplido = cronograma.filter(c => c.estado === 'Cumplido').length
                const enProceso = cronograma.filter(c => c.estado === 'En proceso').length
                const pendiente = cronograma.filter(c => c.estado === 'Pendiente').length
                return [
                  { label: 'Cumplido', key: 'Cumplido', value: cumplido, color: C.green, bg: '#dcfce7' },
                  { label: 'En proceso', key: 'En proceso', value: enProceso, color: C.orange, bg: '#ffedd5' },
                  { label: 'Pendiente', key: 'Pendiente', value: pendiente, color: C.subtle, bg: '#f1f5f9' },
                ].map(s => {
                  const isActive = cronoEstadoFilter === s.key
                  return (
                    <div key={s.label}
                      onClick={() => setCronoEstadoFilter(isActive ? 'Todos' : s.key)}
                      style={{ background: isActive ? s.color : s.bg, borderRadius: 12, padding: '14px 18px',
                        borderLeft: `4px solid ${s.color}`, cursor: 'pointer', transition: 'all 0.15s',
                        transform: isActive ? 'translateY(-2px)' : 'none',
                        boxShadow: isActive ? `0 4px 14px ${s.color}44` : 'none' }}>
                      <div style={{ fontSize: 26, fontWeight: 900, color: isActive ? 'white' : s.color }}>{s.value}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isActive ? 'white' : s.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      {isActive && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Clic para quitar filtro</div>}
                    </div>
                  )
                })
              })()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, alignItems: 'start' }}>
              {['Tolú', 'Barbosa'].map(territorio => {
                const color = territorio === 'Tolú' ? C.tolu : C.barbosa
                const items = cronograma.filter(c => c.territorio === territorio)
                const cumplidos = items.filter(c => c.estado === 'Cumplido').length
                const pct = items.length ? Math.round((cumplidos / items.length) * 100) : 0
                const filtered = items.filter(ev => cronoEstadoFilter === 'Todos' || ev.estado === cronoEstadoFilter)
                return (
                  <div key={territorio}>
                    <div style={{ borderTop: `5px solid ${color}`, borderRadius: 12, background: C.card,
                      padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 900, color }}>{territorio}</div>
                          <div style={{ fontSize: 13, color: C.subtle }}>{territorio === 'Tolú' ? 'Terminal marítima · Sucre' : 'Planta de regasificación · Antioquia'} · {items.length} eventos</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color }}>{pct}%</div>
                          <div style={{ fontSize: 12, color: C.subtle }}>avance</div>
                        </div>
                      </div>
                      <Bar value={pct} color={color} height={6} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {filtered.map(ev => {
                        const stColor = ev.estado === 'Cumplido' ? C.green : ev.estado === 'En proceso' ? C.orange : C.subtle
                        const stBg = ev.estado === 'Cumplido' ? '#dcfce7' : ev.estado === 'En proceso' ? '#fff7ed' : '#f8fafc'
                        return (
                          <div key={ev.id} style={{ background: C.card, borderRadius: 12, padding: '14px 18px',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${stColor}`, position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color,
                                  background: territorio === 'Tolú' ? '#e0f2fe' : '#ede9fe', padding: '2px 8px', borderRadius: 10 }}>
                                  #{ev.numero}
                                </span>
                                <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{ev.mes}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {ev.periodo && <span style={{ fontSize: 12, color: C.subtle, whiteSpace: 'nowrap' }}>{ev.periodo}</span>}
                                <select value={ev.estado}
                                  onChange={async e => { await updateCronogramaEstado(ev.id, e.target.value); loadData() }}
                                  style={{ border: `1.5px solid ${stColor}`, borderRadius: 20, padding: '2px 8px',
                                    fontSize: 12, fontWeight: 700, color: stColor, background: stBg,
                                    cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                                  {['Pendiente', 'En proceso', 'Cumplido'].map(op => (
                                    <option key={op} value={op}>{op}</option>
                                  ))}
                                </select>
                                {isAdmin && (
                                  <button onClick={async () => { if (confirm('¿Borrar este evento del cronograma?')) { await deleteCronogramaEvent(ev.id); loadData() } }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.red, padding: '0 2px' }}>🗑</button>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, lineHeight: 1.4 }}>{ev.evento}</div>
                            {ev.producto && <div style={{ fontSize: 13, color: C.muted, marginBottom: 2, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.text }}>Producto: </span>{ev.producto}</div>}
                            {ev.resultado && <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.text }}>Resultado: </span>{ev.resultado}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'huella' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Huella Social Territorial</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>Lo que Caribe LNG deja instalado en el territorio</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, alignItems: 'start' }}>
              {['Tolú', 'Barbosa'].map(territorio => {
                const items = huellaSocial.filter(h => h.territorio === territorio)
                const color = territorio === 'Tolú' ? C.tolu : C.barbosa
                return (
                  <div key={territorio}>
                    <div style={{ borderTop: `5px solid ${color}`, borderRadius: 12, background: C.card,
                      padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 16 }}>
                      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color, letterSpacing: -0.3, textTransform: 'uppercase' }}>
                        {territorio}
                      </h2>
                      <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
                        {territorio === 'Tolú' ? 'Terminal marítima · Sucre' : 'Planta de regasificación · Antioquia'}
                      </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                      {items.map(h => (
                        <div key={h.id} style={{ background: C.card, borderRadius: 12, padding: '18px 16px',
                          boxShadow: '0 1px 6px rgba(0,0,0,0.07)', borderTop: `3px solid ${color}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${color}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                            {h.icono || ({
                              'Ambiental-Marítimo': '⚓', 'Ambiental': '⚓', 'Marítimo': '⚓',
                              'Formación Marítima': '🎓', 'Formación Local': '💡', 'Formación': '💡',
                              'Seguridad y Convivencia': '🛡️', 'Seguridad': '🛡️', 'Convivencia': '🛡️',
                              'Presencia Territorial': '🗺️', 'Presencia permanente': '🗺️', 'Presencia': '🗺️',
                              'Prevención Conflictos': '⚠️', 'Prevención': '⚠️',
                              'Vida comunitaria': '👥', 'Vida Comunitaria': '👥',
                              'Cuidado del entorno': '🌳', 'Cuidado del Entorno': '🌳',
                              'Deporte e infraestructura': '🏆', 'Deporte': '🏆',
                              'Datos para decidir': '📊', 'Datos': '📊',
                              'Roles claros': '🤝', 'Roles Claros': '🤝',
                              'Economía Costera': '🎣', 'Economía costera': '🎣',
                            }[h.eje] || '🌱')}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {h.eje}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
                            {h.intervencion}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                            {h.huella}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'input' && (
          <InputSemanal session={session} profile={profile} territorio={myTerritorio}
            reportes={reportes} seguimiento={seguimiento} onSaved={loadData} isAdmin={isAdmin} />
        )}

        {view === 'kpis' && (
          <KPIsView reportes={reportes} seguimiento={seguimiento}
            isAdmin={isAdmin} onDeleted={loadData} agreements={agreements} />
        )}

        {view === 'riesgos' && (
          <RiesgosView riesgos={riesgos} riesgosLeg={riesgosLeg} cronoLeg={cronoLeg}
            isAdmin={isAdmin} onDeleted={loadData} />
        )}

        {view === 'gestora' && isGestora && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>📍 Mi Territorio</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{profile?.full_name} →  {myTerritorio || 'Todos los territorios'}</p>
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>⚠️ Actores que necesitan atención hoy</h3>
              {actors.filter(a => (myTerritorio ? a.territorio === myTerritorio : true) && (a.semaforo === 'rojo' || a.semaforo === 'naranja')).slice(0, 6).map(a => (
                <div key={a.id} onClick={() => setSelectedActor(a)}
                  style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0',
                    borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  <SemDot s={a.semaforo} size={10} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{a.nombre}</div>
                    <div style={{ fontSize: 15, color: C.subtle }}>{a.tipo}</div>
                  </div>
                  <span style={{ fontSize: 15, color: C.subtle }}>›</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>🎂 Próximos cumpleaños</h3>
              {(() => {
                const today = new Date()
                const upcoming = actors.filter(a => a.cumpleanos).map(a => {
                  const d = new Date(a.cumpleanos)
                  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
                  if (next < today) next.setFullYear(today.getFullYear() + 1)
                  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
                  return { ...a, diff, dateStr: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) }
                }).filter(a => a.diff <= 30).sort((a, b) => a.diff - b.diff)
                if (!upcoming.length) return <div style={{ fontSize: 16, color: C.subtle, fontStyle: 'italic' }}>Sin cumpleaños en los próximos 30 días.</div>
                return upcoming.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{a.nombre}</div>
                      <div style={{ fontSize: 15, color: C.subtle }}>{a.dateStr}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: a.diff <= 7 ? C.red : C.orange }}>
                      {a.diff === 0 ? '¡Hoy! 🎉' : `En ${a.diff} días`}
                    </div>
                  </div>
                ))
              })()}
            </div>
            <p style={{ fontSize: 16, color: C.subtle, textAlign: 'center' }}>
              Abre cualquier actor desde "Actores" para registrar novedades en tiempo real.
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: '30px 40px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg viewBox="0 0 863.64 794.92" width="36" height="36"><path fill="#1565c0" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#08306b" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, letterSpacing: -0.3 }}>Caribe LNG <span style={{ color: C.accent, fontWeight: 900 }}>Conecta!</span></div>
            <div style={{ fontSize: 13, color: C.subtle }}>Plan de Gestion Social &mdash; 2026</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: C.subtle }}>Direccion de Asuntos Corporativos</div>
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Diana Silva</div>
        </div>
      </div>

      {selectedActor && (
        <ActorModal actor={selectedActor} session={session}
          onClose={() => setSelectedActor(null)} onUpdated={loadData} />
      )}
    </div>
  )
}
