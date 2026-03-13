import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

import { supabase, signInWithMicrosoft, signOut, getProfile, upsertProfile,
         getActors, getAgreements, getInteractions, addInteraction, updateActor, updateAgreementAvance,
         getCronograma, getHuellaSocial, updateCronogramaEstado,
         getReportesSemanales, addReporteSemanal, deleteReporteSemanal, deleteKpiEntry, deleteCronogramaEvent, deleteRiesgo,
         getSeguimientoAcuerdos, addSeguimientoAcuerdo, updateSeguimientoAcuerdo, deleteSeguimientoAcuerdo,
         getRiesgos, getBowTie, getRiesgosLegislativos, getCronogramaLegislativo,
         addCronogramaLegislativo, deleteCronogramaLegislativo,
         getKpisDac, upsertKpiDac, sendAlerta,
         getKnowledgeBase, addKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc } from './lib/supabase'

// ━━ Design tokens ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const C = {
  navy:    '#0D47A1',  // Pantone 294 C — primary dark
  blue:    '#1565C0',  // Pantone 2145 C — primary medium
  accent:  '#1565C0',  // primary blue for links/accents
  tolu:    '#007A87',  // Pantone 7716 C — secondary teal
  barbosa: '#00BFB3',  // Pantone 3262 C — secondary cyan
  green:   '#22c55e',
  yellow:  '#eab308',
  orange:  '#f97316',
  red:     '#ef4444',
  bg:      '#FAFBFC',  // very light neutral
  card:    '#FFFFFF',
  border:  '#E8ECF0',
  text:    '#2B2926',  // Pantone Black C
  muted:   '#5C6370',
  subtle:  '#8D95A0',
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

function StatCard({ label, value, sub, color = C.navy, icon, compact }) {
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
  const [fechasImp, setFechasImp] = useState(Array.isArray(actor.fechas_importantes) ? actor.fechas_importantes : [])
  const [newFechaDate, setNewFechaDate] = useState('')
  const [newFechaDesc, setNewFechaDesc] = useState('')

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
              <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>📅 Fechas importantes</label>
              {/* Existing dates list */}
              {fechasImp.length > 0 && (
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {fechasImp.map((fi, i) => {
                    const [mm, dd] = (fi.fecha || '').split('-')
                    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
                    const label = mm && dd ? `${parseInt(dd)} ${meses[parseInt(mm)-1] || ''}` : fi.fecha
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 7, padding: '6px 10px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, minWidth: 40 }}>{label}</span>
                        <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{fi.descripcion}</span>
                        <button onClick={() => setFechasImp(f => f.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Add new date */}
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="date" value={newFechaDate} onChange={e => setNewFechaDate(e.target.value)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 8px', fontSize: 13, outline: 'none', width: 140, boxSizing: 'border-box', fontFamily: 'inherit', color: C.text }} />
                <input type="text" value={newFechaDesc} onChange={e => setNewFechaDesc(e.target.value)}
                  placeholder="Ej: Hija se gradúa de la uni" onKeyDown={e => { if (e.key === 'Enter' && newFechaDate && newFechaDesc.trim()) { const [,mm,dd] = newFechaDate.split('-'); setFechasImp(f => [...f, { fecha: `${mm}-${dd}`, descripcion: newFechaDesc.trim() }]); setNewFechaDate(''); setNewFechaDesc('') } }}
                  style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 8px', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: C.text }} />
                <button onClick={() => { if (!newFechaDate || !newFechaDesc.trim()) return; const [,mm,dd] = newFechaDate.split('-'); setFechasImp(f => [...f, { fecha: `${mm}-${dd}`, descripcion: newFechaDesc.trim() }]); setNewFechaDate(''); setNewFechaDesc('') }}
                  style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Agregar</button>
              </div>
              <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>La fecha se usa para el recordatorio anual en "Mi Territorio"</div>
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960 || navigator.maxTouchPoints > 0)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 960 || navigator.maxTouchPoints > 0)
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

  // Social risks
  const rojos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente')))
  const amarillos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Medio') || r.semaforo.includes('Vigilar')))
  const verdes = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Bajo') || r.semaforo.includes('control')))
  const azules = riesgos.filter(r => r.semaforo && r.semaforo.includes('Revision'))
  const total = riesgos.length
  const pct = (n) => total ? Math.round((n / total) * 100) : 0

  // Legislative risks bucketed by nivel_riesgo
  const legAlto = (riesgosLeg || []).filter(r => { const n = (r.nivel_riesgo || '').toUpperCase(); return n.includes('MUY ALTO') || n.includes('ALTO') })
  const legMedio = (riesgosLeg || []).filter(r => (r.nivel_riesgo || '').toUpperCase().includes('MEDIO'))
  const legBajo = (riesgosLeg || []).filter(r => (r.nivel_riesgo || '').toUpperCase().includes('BAJO'))
  const totalLeg = (riesgosLeg || []).length
  const pctLeg = (n) => totalLeg ? Math.round((n / totalLeg) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              background: C.navy, color: 'white', padding: '3px 8px', borderRadius: 6 }}>DAC</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dirección de Asuntos Corporativos</span>
          </div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Gestión de Riesgos</h1>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: isMobile ? 13 : 15 }}>
            {total} riesgos sociales · {totalLeg} legislativos · {rojos.length + legAlto.length} requieren acción inmediata
          </p>
        </div>
        {/* Dual mini status bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: isMobile ? '100%' : 200 }}>
          {/* Social risks bar — clickable → switches to mapa sub-tab */}
          {total > 0 && <div onClick={() => setTab('mapa')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Sociales y Comunitarios ↗</div>
            <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 3 }}>
              {rojos.length > 0 && <div style={{ background: C.red, flex: rojos.length }} title={`${rojos.length} acción inmediata`} />}
              {amarillos.length > 0 && <div style={{ background: C.yellow, flex: amarillos.length }} title={`${amarillos.length} vigilar`} />}
              {verdes.length > 0 && <div style={{ background: C.green, flex: verdes.length }} title={`${verdes.length} bajo control`} />}
              {azules.length > 0 && <div style={{ background: C.accent, flex: azules.length }} title={`${azules.length} en revisión`} />}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: C.muted, justifyContent: 'flex-end' }}>
              <span style={{ color: C.red, fontWeight: 700 }}>🔴 {rojos.length}</span>
              <span style={{ color: C.yellow, fontWeight: 700 }}>🟡 {amarillos.length}</span>
              <span style={{ color: C.green, fontWeight: 700 }}>🟢 {verdes.length}</span>
              <span style={{ color: C.accent, fontWeight: 700 }}>🔵 {azules.length}</span>
            </div>
          </div>}
          {/* Legislative risks bar — clickable → switches to legislativo sub-tab */}
          {totalLeg > 0 && <div onClick={() => setTab('legislativo')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Legislativos y Regulatorios ↗</div>
            <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 3 }}>
              {legAlto.length > 0 && <div style={{ background: C.red, flex: legAlto.length }} title={`${legAlto.length} alto`} />}
              {legMedio.length > 0 && <div style={{ background: C.orange, flex: legMedio.length }} title={`${legMedio.length} medio`} />}
              {legBajo.length > 0 && <div style={{ background: C.green, flex: legBajo.length }} title={`${legBajo.length} bajo`} />}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: C.muted, justifyContent: 'flex-end' }}>
              <span style={{ color: C.red, fontWeight: 700 }}>🔴 {legAlto.length}</span>
              <span style={{ color: C.orange, fontWeight: 700 }}>🟠 {legMedio.length}</span>
              <span style={{ color: C.green, fontWeight: 700 }}>🟢 {legBajo.length}</span>
            </div>
          </div>}
        </div>
      </div>

      {/* Filter cards — social risks only */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Riesgos Sociales y Comunitarios</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Acción inmediata', key: 'Alto', count: rojos.length, pct: pct(rojos.length), color: C.red, bg: '#fee2e2', icon: '🔴' },
          { label: 'Vigilar', key: 'Medio', count: amarillos.length, pct: pct(amarillos.length), color: C.yellow, bg: '#fef9c3', icon: '🟡' },
          { label: 'Bajo control', key: 'Bajo', count: verdes.length, pct: pct(verdes.length), color: C.green, bg: '#dcfce7', icon: '🟢' },
          { label: 'En revisión', key: 'Revision', count: azules.length, pct: pct(azules.length), color: C.accent, bg: '#dbeafe', icon: '🔵' },
        ].map(s => {
          const isActive = riesgoFilter === s.key
          return (
            <div key={s.key} onClick={() => { setRiesgoFilter(isActive ? 'Todos' : s.key); setTab('mapa') }}
              style={{ background: isActive ? s.color : C.card, borderRadius: 12,
                padding: isMobile ? '10px 12px' : '14px 16px',
                borderTop: `3px solid ${s.color}`, cursor: 'pointer',
                boxShadow: isActive ? `0 4px 14px ${s.color}44` : '0 1px 4px rgba(0,0,0,0.07)',
                transform: isActive ? 'translateY(-2px)' : 'none', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 900, color: isActive ? 'white' : s.color, lineHeight: 1 }}>{s.count}</div>
                <span style={{ fontSize: isMobile ? 16 : 20 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: isActive ? 'rgba(255,255,255,0.9)' : s.color, marginTop: 6 }}>{s.label}</div>
              {total > 0 && <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: isActive ? 'rgba(255,255,255,0.3)' : `${s.color}30` }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: isActive ? 'white' : s.color, borderRadius: 2, transition: 'width 0.6s' }} />
              </div>}
            </div>
          )
        })}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'mapa', label: '🗺 Riesgos Sociales', count: riesgos.length },
          { id: 'legislativo', label: '⚖️ Riesgos Legislativos', count: riesgosLeg.length },
          { id: 'cronograma', label: '🏛 Agenda Government Affairs', count: cronoLeg.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? C.navy : '#f1f5f9',
              color: tab === t.id ? 'white' : C.text,
              border: 'none', borderRadius: 8, padding: isMobile ? '7px 4px' : '9px 4px',
              fontSize: isMobile ? 11 : 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span>{t.label}</span>
            {t.count > 0 && <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>{t.count} registros</span>}
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
        <AgendaGubernamental cronoLeg={cronoLeg} isAdmin={isAdmin} onReloaded={onDeleted} getNivelColor={getNivelColor} isMobile={isMobile} />
      )}
    </div>
  )
}

// Agenda Government Affairs component
function AgendaGubernamental({ cronoLeg, isAdmin, onReloaded, getNivelColor, isMobile }) {
  const NIVELES = ['Bajo', 'Medio', 'Alto', 'Muy Alto']
  const TIPOS = ['Debate de control político', 'Proyecto de ley', 'Audiencia pública', 'Reunión', 'Comisión', 'Otro']

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fecha: '', tipo: '', nivel_riesgo: 'Medio', evento: '', impacto: '', accion: '', responsable: '' })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.fecha || !form.evento) return
    setSaving(true)
    try {
      await addCronogramaLegislativo(form)
      setForm({ fecha: '', tipo: '', nivel_riesgo: 'Medio', evento: '', impacto: '', accion: '', responsable: '' })
      setShowForm(false)
      onReloaded()
    } catch(err) { alert('Error al guardar: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await deleteCronogramaLegislativo(id)
      onReloaded()
    } catch(err) { alert('Error al eliminar: ' + err.message) }
  }

  const sorted = [...(cronoLeg || [])].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

  return (
    <div style={{ padding: isMobile ? '12px 8px' : '0 8px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text }}>
          🏛 Agenda Government Affairs
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ background: showForm ? C.muted : C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {showForm ? '✕ Cancelar' : '+ Agregar evento'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && isAdmin && (
        <form onSubmit={handleAdd} style={{ background: '#f1f5f9', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }}>
                <option value="">Seleccionar...</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Nivel de riesgo</label>
              <select value={form.nivel_riesgo} onChange={e => setForm(f => ({ ...f, nivel_riesgo: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }}>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Responsable</label>
              <input type="text" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Nombre"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Evento / Descripción *</label>
            <input type="text" value={form.evento} onChange={e => setForm(f => ({ ...f, evento: e.target.value }))} required placeholder="Descripción del evento"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Impacto</label>
            <textarea value={form.impacto} onChange={e => setForm(f => ({ ...f, impacto: e.target.value }))} rows={2} placeholder="Posible impacto del evento"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Acción</label>
            <textarea value={form.accion} onChange={e => setForm(f => ({ ...f, accion: e.target.value }))} rows={2} placeholder="Acción a tomar"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving}
              style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar evento'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: isMobile ? 16 : 20 }}>
        {sorted.length === 0 && (
          <div style={{ color: C.muted, fontSize: 14, padding: '20px 0' }}>No hay eventos registrados.</div>
        )}
        {sorted.map((ev, i) => {
          const nivelColor = getNivelColor(ev.nivel_riesgo)
          return (
            <div key={ev.id || i} style={{ position: 'relative', paddingLeft: isMobile ? 20 : 28, paddingBottom: 20, borderLeft: `2px solid ${C.border}` }}>
              {/* Dot */}
              <div style={{ position: 'absolute', left: -7, top: 4, width: 12, height: 12, borderRadius: '50%', background: nivelColor, border: '2px solid #fff', boxShadow: '0 0 0 2px ' + nivelColor }} />
              <div style={{ background: C.card, borderRadius: 10, padding: isMobile ? '10px 12px' : '12px 16px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, background: nivelColor + '22', color: nivelColor, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{ev.nivel_riesgo}</span>
                      {ev.tipo && <span style={{ fontSize: 12, background: '#f1f5f9', color: C.muted, borderRadius: 6, padding: '2px 8px' }}>{ev.tipo}</span>}
                      <span style={{ fontSize: 12, color: C.subtle }}>{ev.fecha}</span>
                    </div>
                    <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{ev.evento}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(ev.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 16, padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
                      title="Eliminar">🗑</button>
                  )}
                </div>
                {ev.impacto && <div style={{ fontSize: 13, color: '#9a3412', background: '#fff7ed', padding: '5px 8px', borderRadius: 6, marginBottom: 4, lineHeight: 1.5 }}><span style={{ fontWeight: 700 }}>Impacto: </span>{ev.impacto}</div>}
                {ev.accion && <div style={{ fontSize: 13, color: '#166534', background: '#f0fdf4', padding: '5px 8px', borderRadius: 6, marginBottom: 4, lineHeight: 1.5 }}><span style={{ fontWeight: 700 }}>Acción: </span>{ev.accion}</div>}
                {ev.responsable && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>👤 {ev.responsable}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// KPIs component
function KPIsView({ reportes, seguimiento, isAdmin, onDeleted, agreements, kpisDac, onKpiDacSaved }) {
  const [mainTab, setMainTab] = useState('dac')
  const [terrFilter, setTerrFilter] = useState('Todos')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960 || navigator.maxTouchPoints > 0)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 960 || navigator.maxTouchPoints > 0)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── DAC Director KPI definitions ──────────────────────────────────────────
  const KPIS_DAC_DEF = [
    { obj: 1, titulo: 'Desarrollar e implementar el Plan de Gestión Social (PGS) en territorios de influencia', pct: '20%', color: C.tolu, items: [
      { id: 'pgs_ejecutado', name: 'PGS ejecutado en Puntos de Influencia', formula: 'Ejecución del PGS / Plan aprobado', meta: '>=80%', frecuencia: 'Mensual' },
      { id: 'bloqueos_comunitarios', name: 'Bloqueos comunitarios', formula: 'N. bloqueos con impacto en cronograma', meta: '0', frecuencia: 'Semanal / Mensual', invert: true },
    ]},
    { obj: 2, titulo: 'Formalizar e implementar acuerdos sociales con comunidades en territorios clave', pct: '20%', color: C.barbosa, items: [
      { id: 'compromisos_pactados_dac', name: 'Compromisos pactados cumplidos', formula: 'Compromisos ejecutados / suscritos', meta: '>=90%', frecuencia: 'Mensual' },
      { id: 'acuerdos_antes_cod', name: 'Acuerdos formalizados antes de COD', formula: 'Fecha firma / fecha objetivo COD', meta: '100%', frecuencia: 'Mensual' },
      { id: 'acuerdos_incumplidos_dac', name: 'Acuerdos incumplidos', formula: 'N. Acuerdos incumplidos', meta: '0', frecuencia: 'Mensual', invert: true },
    ]},
    { obj: 3, titulo: 'Gestionar conflictos y riesgos sociales/reputacionales para proteger la operación', pct: '20%', color: C.red, items: [
      { id: 'incidentes_alta_dac', name: 'Incidentes de severidad alta', formula: 'N. incidentes de severidad alta', meta: '0', frecuencia: 'Mensual', invert: true },
      { id: 'alertas_24h_dac', name: 'Alertas escaladas en <=24h', formula: 'Alertas escaladas / total alertas', meta: '>=90%', frecuencia: 'Semanal / Mensual' },
    ]},
    { obj: 4, titulo: 'Blindar reputacionalmente cada hito crítico y ejecutar el plan de comunicaciones', pct: '20%', color: C.orange, items: [
      { id: 'hitos_material', name: 'Hitos con material aprobado', formula: 'Hitos con material / total hitos', meta: '>=85%', frecuencia: 'Mensual' },
      { id: 'plan_comunicaciones', name: 'Plan de comunicaciones', formula: 'Avance / plan aprobado', meta: '100%', frecuencia: 'Trimestral' },
    ]},
    { obj: 5, titulo: 'Entregar y aprobar los informes ESG 2026 en plazos requeridos para financiamiento', pct: '20%', color: C.green, items: [
      { id: 'esg_en_plazo', name: 'Informes ESG entregados en plazo', formula: 'Informes en fecha / calendario aprobado', meta: '100%', frecuencia: 'Mensual' },
      { id: 'esg_aprobado', name: 'Informe ESG aprobado', formula: 'Fecha entrega / fecha objetivo', meta: '100%', frecuencia: 'Mensual' },
    ]},
  ]

  const dacMap = Object.fromEntries((kpisDac || []).map(k => [k.id, k]))

  // ── Gestora KPI definitions (updated to match PDF) ────────────────────────
  const KPIS_BARBOSA = [
    { cat: 'OBJ.1 — PGS: SOCIALIZACIONES Y EVENTOS', items: [
      { name: 'Socializaciones AID', field: 'eventos_aid', meta: 12, base: '1/mes' },
      { name: 'Socializaciones AII', field: 'eventos_aii', meta: 4, base: '1/trim' },
      { name: 'Reuniones institucionales clave', field: 'eventos_institucional', meta: 4, base: '1/trim' },
      { name: '% socializ. con >=10 asistentes', field: 'pct_socializaciones_asistentes', meta: 100, base: '>=10 asist.' },
    ]},
    { cat: 'OBJ.1 — DIAGNÓSTICO SOCIOFAMILIAR (53 viviendas)', items: [
      { name: 'Diagnóstico sociofamiliar – % avance', field: 'diagnosticos', meta: 53, base: '53 viv/sem' },
      { name: 'Diagnóstico sociofamiliar – ciclos', field: 'ciclos_diagnostico', meta: 2, base: '2 ciclos/año' },
    ]},
    { cat: 'OBJ.3 — GESTIÓN DE PQRS', items: [
      { name: '% PQRS respondidas en tiempo', field: 'pct_pqrs_tiempo', meta: 100, base: '<=10 días háb.' },
      { name: '% PQRS cerradas', field: 'pct_pqrs_cerradas', meta: 100, base: '<=15 días háb.' },
      { name: 'PQRS pendientes (fin de mes)', field: 'pqrs_pendientes', meta: 0, base: '0/mes', invert: true },
    ]},
    { cat: 'OBJ.1 — GESTIÓN DE CONTRATISTAS (PGS)', items: [
      { name: 'Inducciones PGS a contratistas', field: 'inducciones_pgs', meta: 8, base: '2/trim' },
      { name: 'Actas de vecindad', field: 'actas_vecindad', meta: 0, base: 'Según obra' },
    ]},
    { cat: 'OBJ.3 — RIESGO E INCIDENTES', items: [
      { name: 'Incidentes / rumores críticos', field: 'incidentes', meta: 0, base: '0/mes', invert: true },
      { name: 'Alertas riesgo escaladas <=24h', field: 'alertas_escaladas_dac', meta: 90, base: '>=90% alertas' },
    ]},
    { cat: 'OBJ.2 — ACUERDOS SOCIALES (BARBOSA)', items: [
      { name: 'Acuerdos comunitarios firmados', field: 'acuerdos_firmados', meta: 3, base: 'Firma antes COD' },
      { name: 'Compromisos pactados cumplidos', field: 'compromisos_cumplidos', meta: 90, base: '>=90%' },
      { name: 'Incumplimientos con impacto', field: 'incumplimientos_acuerdos', meta: 0, base: '0/mes', invert: true },
    ]},
  ]

  const KPIS_TOLU = [
    { cat: 'OBJ.1 — PGS: SOCIALIZACIONES Y EVENTOS', items: [
      { name: 'Socializaciones AID', field: 'eventos_aid', meta: 12, base: '1/mes' },
      { name: 'Socializaciones AII', field: 'eventos_aii', meta: 4, base: '1/trim' },
      { name: 'Reuniones institucionales clave', field: 'eventos_institucional', meta: 4, base: '1/trim' },
      { name: '% socializ. con >=10 asistentes', field: 'pct_socializaciones_asistentes', meta: 100, base: '>=10 asist.' },
    ]},
    { cat: 'OBJ.1 — DIAGNÓSTICO SOCIAL (asociaciones y actores)', items: [
      { name: 'Asociaciones mapeadas y caracterizadas', field: 'asociaciones_mapeadas', meta: 0, base: 'Acumulativo' },
      { name: 'Personas obstaculizadoras identificadas', field: 'personas_obstaculizadoras', meta: 0, base: 'Acumulativo' },
      { name: 'Aliados potenciales identificados', field: 'aliados_identificados', meta: 0, base: 'Acumulativo' },
      { name: 'Visitas a comunidades AID', field: 'visitas_aid', meta: 0, base: 'Semanal' },
    ]},
    { cat: 'OBJ.3 — GESTIÓN DE PQRS', items: [
      { name: '% PQRS respondidas en tiempo', field: 'pct_pqrs_tiempo', meta: 100, base: '<=10 días háb.' },
      { name: '% PQRS cerradas', field: 'pct_pqrs_cerradas', meta: 100, base: '<=15 días háb.' },
      { name: 'PQRS pendientes (fin de mes)', field: 'pqrs_pendientes', meta: 0, base: '0/mes', invert: true },
    ]},
    { cat: 'OBJ.1 — GESTIÓN DE CONTRATISTAS (PGS)', items: [
      { name: 'Inducciones PGS a contratistas', field: 'inducciones_pgs', meta: 8, base: '2/trim' },
    ]},
    { cat: 'OBJ.3 — RIESGO E INCIDENTES', items: [
      { name: 'Incidentes / rumores críticos', field: 'incidentes', meta: 0, base: '0/mes', invert: true },
      { name: 'Alertas riesgo escaladas <=24h', field: 'alertas_escaladas_dac', meta: 90, base: '>=90% alertas' },
    ]},
    { cat: 'OBJ.2 — ACUERDOS SOCIALES (TOLÚ)', items: [
      { name: 'Acuerdos sociales firmados (T1+T2+T3)', field: 'acuerdos_firmados', meta: 3, base: 'Firma antes COD' },
      { name: 'Compromisos pactados cumplidos', field: 'compromisos_cumplidos', meta: 90, base: '>=90%' },
      { name: 'Incumplimientos con impacto', field: 'incumplimientos_acuerdos', meta: 0, base: '0/mes', invert: true },
    ]},
  ]

  // ── Gestora helpers ───────────────────────────────────────────────────────
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

  function renderTerritory(territorio, kpis) {
    const color = territorio === 'Tolú' ? C.tolu : C.barbosa
    const totalReportes = reportes.filter(r => r.territorio === territorio).length
    return (
      <div key={territorio} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 4, height: 28, background: color, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{territorio}</div>
            <div style={{ fontSize: 13, color: C.subtle }}>
              {territorio === 'Tolú' ? 'Terminal marítima · Sucre' : 'Planta de regasificación · Antioquia'} · {totalReportes} reportes
            </div>
          </div>
        </div>
        {kpis.map(cat => (
          <div key={cat.cat} style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{cat.cat}</div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4,1fr) 60px 56px', gap: 4, marginBottom: 6, minWidth: 420 }}>
                {['KPI','Q1','Q2','Q3','Q4','Total','Meta'].map(h => (
                  <div key={h} style={{ fontSize: 11, color: C.subtle, fontWeight: 700, textAlign: h === 'KPI' ? 'left' : 'center', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {cat.items.map(kpi => {
                const total = sumTotal(territorio, kpi.field)
                const pct = kpi.meta > 0 ? Math.round((total / kpi.meta) * 100) : 0
                const sc = kpi.invert
                  ? (total === 0 ? C.green : total <= 2 ? C.orange : C.red)
                  : (kpi.meta > 0 ? (pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red) : C.subtle)
                return (
                  <div key={kpi.name} style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4,1fr) 60px 56px', gap: 4, alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.border}`, minWidth: 420 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{kpi.name}</div>
                      <div style={{ fontSize: 11, color: C.subtle }}>{kpi.base}</div>
                    </div>
                    {[1,2,3,4].map(q => (
                      <div key={q} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: C.text }}>{sumQ(territorio, kpi.field, q) || '—'}</div>
                    ))}
                    <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: sc }}>{total || '—'}</div>
                    <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, fontWeight: 600 }}>{kpi.meta || '—'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {(() => {
          const agT = agreements.filter(a => a.territorio === territorio)
          if (!agT.length) return null
          const avg = Math.round(agT.reduce((s, a) => s + (a.avance || 0), 0) / agT.length)
          const ac = avg >= 90 ? C.green : avg >= 50 ? C.orange : C.red
          return (
            <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.2 — ACUERDOS TERRITORIALES</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
                <div><div style={{ fontSize: 26, fontWeight: 900, color: ac }}>{avg}%</div><div style={{ fontSize: 11, color: C.muted }}>avance prom.</div></div>
                <div style={{ flex: 1 }}><Bar value={avg} color={ac} height={7} /></div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{agT.length} acuerdos</div>
              </div>
              {agT.map(a => {
                const aColor = { cumplido: C.green, en_curso: C.accent, estructural: C.barbosa, por_estructurar: C.yellow }[a.estado_code] || C.accent
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, width: 20 }}>{a.id}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                      <Bar value={a.avance} color={aColor} height={4} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: aColor, width: 34, textAlign: 'right' }}>{a.avance}%</span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    )
  }

  // ── DAC Director view ────────────────────────────────────────────────────
  function DACKpiRow({ kpi, saved, isAdmin, onSaved }) {
    const [valor, setValor] = useState(saved?.valor || '')
    const [estado, setEstado] = useState(saved?.estado || 'EN CURSO')
    const [notas, setNotas] = useState(saved?.notas || '')
    const [saving, setSaving] = useState(false)
    const estadoColor = { 'CUMPLIDO': C.green, 'EN RIESGO': C.red, 'EN CURSO': C.accent, 'PENDIENTE': C.yellow }[estado] || C.muted

    async function save() {
      setSaving(true)
      try { await upsertKpiDac(kpi.id, { valor, estado, notas }); onSaved() }
      catch(e) { alert('Error: ' + e.message) }
      finally { setSaving(false) }
    }

    return (
      <div style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{kpi.name}</div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{kpi.formula} · {kpi.frecuencia}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Meta:</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.text, background: '#f1f5f9', padding: '2px 7px', borderRadius: 5 }}>{kpi.meta}</span>
          </div>
        </div>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor actual"
              style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, width: 110, outline: 'none', fontFamily: 'inherit' }} />
            <select value={estado} onChange={e => setEstado(e.target.value)}
              style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, outline: 'none', fontFamily: 'inherit', color: estadoColor, fontWeight: 700 }}>
              {['EN CURSO','CUMPLIDO','EN RIESGO','PENDIENTE'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Notas"
              style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 8px', fontSize: 12, flex: 1, minWidth: 120, outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={save} disabled={saving}
              style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? '…' : 'Guardar'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {saved?.valor && <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{saved.valor}</span>}
            <span style={{ fontSize: 11, fontWeight: 700, color: estadoColor, background: estadoColor + '18', padding: '2px 8px', borderRadius: 10 }}>{estado}</span>
            {saved?.notas && <span style={{ fontSize: 12, color: C.muted }}>{saved.notas}</span>}
          </div>
        )}
      </div>
    )
  }

  const totalReportes = reportes.length
  const totalEventos = reportes.reduce((s, r) => s + (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0), 0)
  const totalIncidentes = reportes.reduce((s, r) => s + (r.incidentes || 0), 0)
  const compromisosCumplidos = seguimiento.filter(s => s.estado === 'Cumplido').length

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>KPIs 2026</h1>
        <p style={{ margin: '3px 0 0', color: C.muted, fontSize: 13 }}>Caribe LNG · Dirección de Asuntos Corporativos · Enero–Diciembre 2026</p>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
        {[{ id: 'dac', label: '🎯 Director DAC' }, { id: 'gestoras', label: '🌍 Gestoras Territoriales' }].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            style={{ flex: 1, background: mainTab === t.id ? C.navy : 'transparent', color: mainTab === t.id ? 'white' : C.muted,
              border: 'none', borderRadius: 7, padding: '9px 8px', fontSize: isMobile ? 12 : 14, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DAC Director tab ── */}
      {mainTab === 'dac' && (
        <div>
          <div style={{ background: `${C.navy}08`, border: `1px solid ${C.navy}20`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            <strong>Diana Silva</strong> · Nivel Estratégico · 5 Objetivos × 20% · Marzo 2026
          </div>
          {KPIS_DAC_DEF.map(obj => (
            <div key={obj.obj} style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12, borderLeft: `4px solid ${obj.color}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, background: obj.color, color: 'white', padding: '2px 8px', borderRadius: 5, marginRight: 6 }}>OBJ {obj.obj}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Peso: {obj.pct}</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 6, lineHeight: 1.4 }}>{obj.titulo}</div>
                </div>
              </div>
              {obj.items.map(kpi => (
                <DACKpiRow key={kpi.id} kpi={kpi} saved={dacMap[kpi.id]} isAdmin={isAdmin} onSaved={onKpiDacSaved} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Gestoras tab ── */}
      {mainTab === 'gestoras' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
            <StatCard label="Reportes" value={totalReportes} color={C.navy} />
            <StatCard label="Eventos" value={totalEventos} color={C.tolu} />
            <StatCard label="Compromisos" value={`${compromisosCumplidos}/${seguimiento.length}`} color={C.green} />
            <StatCard label="Incidentes" value={totalIncidentes} color={totalIncidentes === 0 ? C.green : C.red} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['Todos', 'Barbosa', 'Tolú'].map(t => (
              <button key={t} onClick={() => setTerrFilter(t)}
                style={{ background: terrFilter === t ? C.navy : '#f1f5f9', color: terrFilter === t ? 'white' : C.text,
                  border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {t}
              </button>
            ))}
          </div>
          {(terrFilter === 'Todos' || terrFilter === 'Barbosa') && renderTerritory('Barbosa', KPIS_BARBOSA)}
          {(terrFilter === 'Todos' || terrFilter === 'Tolú') && renderTerritory('Tolú', KPIS_TOLU)}
          {totalReportes === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>No hay reportes semanales aún</div>
              <div style={{ fontSize: 13 }}>Los KPIs se calculan automáticamente cuando las gestoras llenen sus reportes en Input Semanal.</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// InputSemanal component
function InputSemanal({ session, profile, territorio, reportes, seguimiento, onSaved, isAdmin }) {
  const [tab, setTab] = useState('reporte')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960 || navigator.maxTouchPoints > 0)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 960 || navigator.maxTouchPoints > 0)
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
  // Nuevos campos PDF
  const [pctSocAsistentes, setPctSocAsistentes] = useState(0)
  const [ciclosDiag, setCiclosDiag] = useState(0)
  const [pctPqrsTiempo, setPctPqrsTiempo] = useState(0)
  const [pctPqrsCerradas, setPctPqrsCerradas] = useState(0)
  const [incumplimientos, setIncumplimientos] = useState(0)
  // Tolú específicos
  const [asociacionesMapeadas, setAsociacionesMapeadas] = useState(0)
  const [personasObstaculizadoras, setPersonasObstaculizadoras] = useState(0)
  const [aliadosIdentificados, setAliadosIdentificados] = useState(0)
  const [visitasAid, setVisitasAid] = useState(0)

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
        incumplimientos_acuerdos: incumplimientos,
        diagnosticos, actas_vecindad: actasVecindad, inducciones_pgs: induccionesPgs,
        ciclos_diagnostico: ciclosDiag,
        asociaciones_mapeadas: asociacionesMapeadas, personas_obstaculizadoras: personasObstaculizadoras,
        aliados_identificados: aliadosIdentificados, visitas_aid: visitasAid,
        eventos_aid: eventosAid, eventos_aii: eventosAii, eventos_institucional: eventosInst, asistentes_total: asistentes,
        pct_socializaciones_asistentes: pctSocAsistentes,
        pqrs_recibidas: pqrsRecibidas, pqrs_cerradas: pqrsCerradas, pqrs_pendientes: pqrsPendientes,
        pct_pqrs_tiempo: pctPqrsTiempo, pct_pqrs_cerradas: pctPqrsCerradas,
        incidentes, actores_gestionados: actoresGest, alertas_escaladas_dac: alertasDac,
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

          {/* OBJ.1 — PGS: Socializaciones y Eventos */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.tolu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.1 — PGS: Socializaciones y Eventos</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Socializaciones AID" value={eventosAid} onChange={setEventosAid} />
              <NumField label="Socializaciones AII" value={eventosAii} onChange={setEventosAii} />
              <NumField label="Reuniones institucionales" value={eventosInst} onChange={setEventosInst} />
              <NumField label="Asistentes total" value={asistentes} onChange={setAsistentes} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <NumField label="% socializ. con >=10 asistentes" value={pctSocAsistentes} onChange={setPctSocAsistentes} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>El % se calcula sobre AID+AII con al menos 10 asistentes</div>
          </div>

          {/* OBJ.1 — Diagnóstico (territory-specific) */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            {myTerr === 'Barbosa' ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.barbosa, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.1 — Diagnóstico Sociofamiliar (53 viviendas)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <NumField label="Visitas a familias (diag.)" value={diagnosticos} onChange={setDiagnosticos} />
                  <NumField label="Ciclos diagnóstico" value={ciclosDiag} onChange={setCiclosDiag} />
                  <NumField label="Actas de vecindad" value={actasVecindad} onChange={setActasVecindad} />
                  <NumField label="Inducciones PGS contratistas" value={induccionesPgs} onChange={setInduccionesPgs} />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.tolu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.1 — Diagnóstico Social (asociaciones y actores)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <NumField label="Asociaciones mapeadas" value={asociacionesMapeadas} onChange={setAsociacionesMapeadas} />
                  <NumField label="Personas obstaculizadoras" value={personasObstaculizadoras} onChange={setPersonasObstaculizadoras} />
                  <NumField label="Aliados identificados" value={aliadosIdentificados} onChange={setAliadosIdentificados} />
                  <NumField label="Visitas a comunidades AID" value={visitasAid} onChange={setVisitasAid} />
                  <NumField label="Inducciones PGS contratistas" value={induccionesPgs} onChange={setInduccionesPgs} />
                </div>
              </>
            )}
          </div>

          {/* OBJ.3 — PQRS */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.orange, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.3 — Gestión de PQRS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="PQRS recibidas" value={pqrsRecibidas} onChange={setPqrsRecibidas} />
              <NumField label="PQRS cerradas" value={pqrsCerradas} onChange={setPqrsCerradas} />
              <NumField label="PQRS pendientes" value={pqrsPendientes} onChange={setPqrsPendientes} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <NumField label="% respondidas en tiempo" value={pctPqrsTiempo} onChange={setPctPqrsTiempo} />
              <NumField label="% cerradas en plazo" value={pctPqrsCerradas} onChange={setPctPqrsCerradas} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>% respondidas: ≤10 días hábiles · % cerradas: ≤15 días hábiles · Meta: 100%</div>
          </div>

          {/* OBJ.3 — Riesgo e incidentes */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.3 — Riesgo e Incidentes</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Incidentes / rumores críticos" value={incidentes} onChange={setIncidentes} />
              <NumField label="Alertas escaladas a DAC" value={alertasDac} onChange={setAlertasDac} />
              <NumField label="Personas contactadas" value={actoresGest} onChange={setActoresGest} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>Meta incidentes: 0 · Alertas escaladas en ≤24h: ≥90%</div>
          </div>

          {/* OBJ.2 — Acuerdos */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.2 — Acuerdos Sociales</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Acuerdos firmados" value={acuerdosFirmados} onChange={setAcuerdosFirmados} />
              <NumField label="Compromisos nuevos" value={compromisosNuevos} onChange={setCompromisosNuevos} />
              <NumField label="Compromisos cumplidos" value={compromisosCumplidos} onChange={setCompromisosCumplidos} />
              <NumField label="Incumplimientos con impacto" value={incumplimientos} onChange={setIncumplimientos} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>Meta acuerdos: {myTerr === 'Barbosa' ? '3' : '3 (T1+T2+T3)'} antes COD · Compromisos cumplidos: ≥90% · Incumplimientos: 0</div>
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

// ━━ KnowledgeBaseView ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function KnowledgeBaseView({ docs, onReload, isMobile }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ titulo: '', categoria: 'General', contenido: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const categorias = ['General', 'Políticas DAC', 'Procedimientos', 'Marco Regulatorio', 'Acuerdos Marco', 'Comunicaciones', 'ESG', 'Otro']
  const fileInputRef = useRef(null)

  async function extractText(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const buf = await file.arrayBuffer()

    if (ext === 'pdf') {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      const pages = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        pages.push(content.items.map(item => item.str).join(' '))
      }
      return pages.join('\n\n')
    }

    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ arrayBuffer: buf })
      return result.value
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(buf, { type: 'array' })
      const lines = []
      for (const name of wb.SheetNames) {
        lines.push(`--- ${name} ---`)
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
        lines.push(csv)
      }
      return lines.join('\n\n')
    }

    if (ext === 'pptx') {
      const zip = await JSZip.loadAsync(buf)
      const slides = []
      const slideFiles = Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/i.test(f))
        .sort((a, b) => {
          const na = parseInt(a.match(/slide(\d+)/)[1])
          const nb = parseInt(b.match(/slide(\d+)/)[1])
          return na - nb
        })
      for (const sf of slideFiles) {
        const xml = await zip.files[sf].async('text')
        const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text) slides.push(text)
      }
      return slides.join('\n\n')
    }

    // Fallback: read as text (md, txt)
    return new TextDecoder().decode(buf)
  }

  function splitIntoChunks(text, name) {
    if (text.length <= 1900) return [{ titulo: name, contenido: text.trim() }]
    const sections = text.split(/(?=^## |\n\n---\s*\n)/m).filter(s => s.trim())
    const chunks = []
    let current = ''
    let currentTitle = name
    for (const section of sections) {
      const headingMatch = section.match(/^## (.+)/)
      const sectionTitle = headingMatch ? headingMatch[1].replace(/[#*_]/g, '').trim() : null
      if ((current + section).length > 1900 && current.length > 0) {
        chunks.push({ titulo: currentTitle, contenido: current.trim() })
        current = section
        currentTitle = sectionTitle ? `${name} - ${sectionTitle}` : `${name} (cont.)`
      } else {
        if (sectionTitle && !current) currentTitle = `${name} - ${sectionTitle}`
        current += section
      }
    }
    if (current.trim()) chunks.push({ titulo: currentTitle, contenido: current.trim() })
    return chunks
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const name = file.name.replace(/\.(md|txt|text|pdf|docx|xlsx|xls|pptx)$/i, '')
    setUploading(true)
    try {
      const text = await extractText(file)
      if (!text || !text.trim()) { alert('No se pudo extraer texto del archivo.'); return }
      const chunks = splitIntoChunks(text, name)
      if (chunks.length === 1 && chunks[0].contenido.length <= 1900) {
        setForm({ ...form, titulo: chunks[0].titulo, contenido: chunks[0].contenido })
      } else {
        if (!confirm(`El archivo tiene ${text.length.toLocaleString()} caracteres y se dividirá en ~${chunks.length} documentos (categoría: ${form.categoria}). ¿Continuar?`)) return
        for (const chunk of chunks) {
          await addKnowledgeDoc({ titulo: chunk.titulo, categoria: form.categoria, contenido: chunk.contenido })
        }
        alert(`${chunks.length} documentos creados desde "${file.name}"`)
        onReload()
      }
    } catch(err) { alert('Error al procesar archivo: ' + err.message) }
    finally { setUploading(false) }
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.contenido.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await updateKnowledgeDoc(editing, form)
      } else {
        await addKnowledgeDoc(form)
      }
      setForm({ titulo: '', categoria: 'General', contenido: '' })
      setEditing(null)
      onReload()
    } catch(e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este documento?')) return
    await deleteKnowledgeDoc(id)
    onReload()
  }

  const grouped = {}
  docs.forEach(d => { if (!grouped[d.categoria]) grouped[d.categoria] = []; grouped[d.categoria].push(d) })

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>🧠 Base de Conocimiento</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 14 }}>Documentos y contexto que el asistente IA usa para responder preguntas. Total: {docs.length} docs · ~{Math.round(docs.reduce((s,d) => s + (d.contenido?.length || 0), 0) / 1000)}K caracteres</p>
      </div>

      {/* Add/Edit form */}
      <div style={{ background: C.card, borderRadius: 12, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20, borderLeft: `4px solid ${C.accent}` }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.accent, marginBottom: 12 }}>{editing ? '✏️ Editar documento' : '+ Agregar documento'}</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Título del documento"
            style={{ flex: 2, minWidth: 200, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
            style={{ flex: 1, minWidth: 150, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white' }}>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea value={form.contenido} onChange={e => setForm({...form, contenido: e.target.value})}
          placeholder="Pega aquí el contenido del documento, política, procedimiento, etc. El asistente IA usará este texto para responder preguntas."
          style={{ width: '100%', minHeight: 140, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14,
            fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={handleSave} disabled={saving || !form.titulo.trim() || !form.contenido.trim()}
            style={{ background: saving ? '#94a3b8' : C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar documento'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            style={{ background: uploading ? '#94a3b8' : '#f1f5f9', color: uploading ? 'white' : C.accent, border: `1px solid ${C.accent}33`, borderRadius: 8, padding: '9px 20px',
              fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {uploading ? 'Subiendo...' : '📄 Subir archivo'}
          </button>
          <input ref={fileInputRef} type="file" accept=".md,.txt,.text,.pdf,.docx,.xlsx,.xls,.pptx" onChange={handleFileUpload} style={{ display: 'none' }} />
          {editing && (
            <button onClick={() => { setEditing(null); setForm({ titulo: '', categoria: 'General', contenido: '' }) }}
              style={{ background: '#f1f5f9', color: C.text, border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Documents list by category */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🧠</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No hay documentos aún</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Agrega documentos, políticas o procedimientos para que el asistente IA pueda responder preguntas sobre ellos.</div>
        </div>
      )}
      {Object.entries(grouped).map(([cat, catDocs]) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{cat} ({catDocs.length})</div>
          {catDocs.map(d => (
            <div key={d.id} style={{ background: C.card, borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{d.titulo}</div>
                  <div style={{ fontSize: 12, color: C.subtle, marginTop: 2 }}>{(d.contenido?.length || 0).toLocaleString()} caracteres · {d.updated_at ? new Date(d.updated_at).toLocaleDateString('es-CO') : 'recién creado'}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.contenido?.slice(0, 200)}{d.contenido?.length > 200 ? '...' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditing(d.id); setForm({ titulo: d.titulo, categoria: d.categoria, contenido: d.contenido }) }}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: C.accent }}>
                    Editar
                  </button>
                  <button onClick={() => handleDelete(d.id)}
                    style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: C.red }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ━━ ChatBot ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ChatBot({ appData, knowledgeDocs, session, isMobile }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  function buildContext() {
    const d = appData
    const lines = []
    lines.push(`== RESUMEN GENERAL ==`)
    lines.push(`Total actores: ${d.actors?.length || 0}`)
    const byTerr = (t) => d.actors?.filter(a => a.territorio === t) || []
    lines.push(`Actores Tolú: ${byTerr('Tolú').length}, Barbosa: ${byTerr('Barbosa').length}, Nacional: ${byTerr('Nacional').length}`)
    const sem = (color) => d.actors?.filter(a => a.semaforo === color).length || 0
    lines.push(`Semáforo: ${sem('Verde')} verde, ${sem('Amarillo')} amarillo, ${sem('Rojo')} rojo`)
    lines.push(`Total acuerdos: ${d.agreements?.length || 0}`)
    d.agreements?.forEach(a => lines.push(`  - ${a.nombre}: ${a.estado} (${a.territorio})`))
    lines.push(`Total riesgos sociales: ${d.riesgos?.length || 0}`)
    d.riesgos?.forEach(r => lines.push(`  - [${r.nivel_riesgo}] ${r.riesgo} → Acción: ${r.accion_inmediata}`))
    lines.push(`Total riesgos legislativos: ${d.riesgosLeg?.length || 0}`)
    d.riesgosLeg?.forEach(r => lines.push(`  - [${r.nivel_riesgo}] ${r.riesgo} → ${r.accion_inmediata}`))
    lines.push(`\n== HUELLA SOCIAL TERRITORIAL ==`)
    lines.push(`TOLÚ: C3 Licencia C3 (formación, género, sustancias peligrosas) | HUB Muelle Astivik (hub operativo, deportes acuáticos, certificaciones marítimas) | ECO Ambiental Marino (impacto ambiental con pescadores, restauración arrecifes)`)
    lines.push(`BARBOSA: C3 Licencia C3 (formación, género) | HUB Cancha El Machete (polideportivo, espacio comunitario) | ECO Cadena de Reciclaje (puntos ecológicos, siembra 150 árboles, genera ingreso)`)
    lines.push(`\n== CRONOGRAMA LEGISLATIVO ==`)
    d.cronoLeg?.forEach(c => lines.push(`  - ${c.fecha}: [${c.nivel_riesgo}] ${c.evento} (${c.tipo})`))
    lines.push(`\n== ACTORES CLAVE (top 20 por relevancia) ==`)
    const topActors = [...(d.actors || [])].sort((a, b) => (b.relevancia || 0) - (a.relevancia || 0)).slice(0, 20)
    topActors.forEach(a => lines.push(`  - ${a.nombre} (${a.territorio}, ${a.sector}, semáforo: ${a.semaforo}, cargo: ${a.cargo || 'N/A'})`))
    lines.push(`\n== KPIs DAC ==`)
    d.kpisDac?.forEach(k => lines.push(`  - ${k.kpi_id}: valor=${k.valor || 'pendiente'}, estado=${k.estado || 'EN CURSO'}`))
    lines.push(`\n== REPORTES SEMANALES ==`)
    lines.push(`Total reportes: ${d.reportes?.length || 0}`)
    const lastR = d.reportes?.[0]
    if (lastR) lines.push(`Último reporte: Semana ${lastR.semana} (${lastR.territorio}) — Eventos AID: ${lastR.eventos_aid}, AII: ${lastR.eventos_aii}, PQRS: ${lastR.pqrs_recibidas}, Incidentes: ${lastR.incidentes}`)
    // Knowledge base documents
    if (knowledgeDocs?.length) {
      lines.push(`\n== BASE DE CONOCIMIENTO (${knowledgeDocs.length} documentos) ==`)
      knowledgeDocs.forEach(d => {
        lines.push(`\n--- ${d.titulo} [${d.categoria}] ---`)
        lines.push(d.contenido)
      })
    }
    return lines.join('\n')
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: buildContext(), userId: session?.user?.id })
      })
      const data = await res.json()
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.error }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer, budget: data.budget }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error de conexión: ' + e.message }])
    } finally { setLoading(false) }
  }

  const panelW = isMobile ? '92vw' : 400
  const panelH = isMobile ? '70vh' : 500

  return (
    <>
      {/* Floating label above button */}
      {!open && (
        <div onClick={() => setOpen(true)}
          style={{ position: 'fixed', bottom: isMobile ? 78 : 88, right: isMobile ? 4 : 8,
            background: 'white', borderRadius: 14, padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            cursor: 'pointer', zIndex: 10000, textAlign: 'center', minWidth: 180,
            border: `1.5px solid ${C.navy}22` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>¡Hola! Soy Conecta</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Tu asistente personal de Caribe LNG</div>
          {/* Arrow pointing down */}
          <div style={{ position: 'absolute', bottom: -8, right: 28, width: 16, height: 16,
            background: 'white', transform: 'rotate(45deg)', boxShadow: '2px 2px 4px rgba(0,0,0,0.08)',
            borderRight: `1.5px solid ${C.navy}22`, borderBottom: `1.5px solid ${C.navy}22` }} />
        </div>
      )}
      {/* Floating button */}
      <button onClick={() => setOpen(!open)}
        style={{ position: 'fixed', bottom: isMobile ? 16 : 24, right: isMobile ? 16 : 24,
          width: 56, height: 56, borderRadius: '50%', background: C.navy, color: 'white',
          border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', cursor: 'pointer',
          fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        {open ? '✕' : <svg viewBox="0 0 863.64 794.92" width="28" height="28"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#90caf9" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{ position: 'fixed', bottom: isMobile ? 80 : 90, right: isMobile ? '4vw' : 24,
          width: panelW, height: panelH, background: 'white', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 9998, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: C.navy, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 863.64 794.92" width="28" height="28"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#90caf9" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>
            <div>
              <div style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>Conecta te habla</div>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>Tu asistente personal</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: C.subtle, fontSize: 13, padding: '30px 10px', lineHeight: 1.7 }}>
                ¡Hola! Soy <b>Conecta</b>, tu asistente personal de Caribe LNG.<br />
                Pregúntame lo que necesites sobre actores, acuerdos, riesgos, huella social, KPIs o cualquier dato de la plataforma.
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 14 }}>
                  {['¿Cuántos actores hay en Tolú?', '¿Cuál es la huella social de Barbosa?', '¿Qué riesgos legislativos tenemos?', '¿Cómo van los acuerdos?'].map(q => (
                    <button key={q} onClick={() => { setInput(q); }}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px',
                        fontSize: 12, color: C.text, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  background: m.role === 'user' ? C.navy : '#f1f5f9',
                  color: m.role === 'user' ? 'white' : C.text,
                  padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'user' ? 12 : 4,
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.text}
                </div>
                {m.budget && (
                  <div style={{ fontSize: 10, color: C.subtle, marginTop: 2, textAlign: 'right' }}>
                    ${m.budget.spent} / ${m.budget.limit} este mes
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '10px 14px', borderRadius: 12, fontSize: 13, color: C.muted }}>
                Pensando...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 12px', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta..."
              style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
                fontSize: 14, outline: 'none', fontFamily: 'inherit', color: C.text }} />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              style={{ background: loading ? '#94a3b8' : C.navy, color: 'white', border: 'none',
                borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
              →
            </button>
          </div>
        </div>
      )}
    </>
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
  const [kpisDac, setKpisDac] = useState([])
  const [knowledgeBase, setKnowledgeBase] = useState([])

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
      const [a, ag, cr, hs, rp, sg, ri, rl, cleg, kd, kb] = await Promise.all([getActors(), getAgreements(), getCronograma(), getHuellaSocial(), getReportesSemanales(), getSeguimientoAcuerdos(), getRiesgos(), getRiesgosLegislativos(), getCronogramaLegislativo(), getKpisDac(), getKnowledgeBase()])
      setActors(a || [])
      setAgreements(ag || [])
      setCronograma(cr || [])
      setHuellaSocial(hs || [])
      setReportes(rp || [])
      setSeguimiento(sg || [])
      setRiesgos(ri || [])
      setRiesgosLeg(rl || [])
      setCronoLeg(cleg || [])
      setKpisDac(kd || [])
      setKnowledgeBase(kb || [])
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

  const stats = useMemo(() => {
    const semBreak = arr => ({
      verde: arr.filter(a => a.semaforo === 'verde').length,
      amarillo: arr.filter(a => a.semaforo === 'amarillo').length,
      naranja: arr.filter(a => a.semaforo === 'naranja').length,
      rojo: arr.filter(a => a.semaforo === 'rojo').length,
    })
    const toluArr = actors.filter(a => a.territorio === 'Tolú')
    const barbosaArr = actors.filter(a => a.territorio === 'Barbosa')
    const nacionalArr = actors.filter(a => a.territorio === 'Nacional')
    return {
      total: actors.length,
      verde: actors.filter(a => a.semaforo === 'verde').length,
      amarillo: actors.filter(a => a.semaforo === 'amarillo').length,
      naranja: actors.filter(a => a.semaforo === 'naranja').length,
      rojo: actors.filter(a => a.semaforo === 'rojo').length,
      prioA: actors.filter(a => a.prioridad === 'A').length,
      alto: actors.filter(a => a.riesgo === 'Alto' || a.riesgo === 'Muy Alto').length,
      tolu: toluArr.length,
      barbosa: barbosaArr.length,
      nacional: nacionalArr.length,
      semTodos: semBreak(actors),
      semTolu: semBreak(toluArr),
      semBarbosa: semBreak(barbosaArr),
      semNacional: semBreak(nacionalArr),
    }
  }, [actors])

  const filtered = useMemo(() => actors.filter(a => {
    if (search && !a.nombre?.toLowerCase().includes(search.toLowerCase()) && !a.tipo?.toLowerCase().includes(search.toLowerCase()) && !(a.contacto || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterT !== 'Todos' && a.territorio !== filterT) return false
    if (filterS !== 'Todos' && a.semaforo !== filterS) return false
    if (filterR !== 'Todos' && a.riesgo?.toLowerCase() !== filterR.toLowerCase()) return false
    return true
  }), [actors, search, filterT, filterS, filterR])

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960 || navigator.maxTouchPoints > 0)
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 960 || navigator.maxTouchPoints > 0)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
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
    { id: 'riesgos', label: 'Riesgos DAC', icon: '⚠️' },
    { id: 'acuerdos', label: 'Acuerdos', icon: '🤝' },
    { id: 'huella', label: 'Huella Social', icon: '🌱' },
    { id: 'actores', label: 'Actores', icon: '👥' },
    { id: 'cronograma', label: 'Cronograma', icon: '📅' },
    { id: 'kpis', label: 'KPIs', icon: '🎯' },
    { id: 'input', label: 'Input Semanal', icon: '✍️' },
    { id: 'gestora', label: 'Mi territorio', icon: '📍' },
    ...(isAdmin ? [{ id: 'knowledge', label: 'Base Conocimiento', icon: '🧠' }] : []),
  ]

  if (isMobile && isPortrait) return (
    <div style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: '100vh', background: C.navy, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 24, animation: 'spin90 1.5s ease-in-out infinite alternate' }}>📱</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 12, letterSpacing: -0.5 }}>Rota el dispositivo</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 260 }}>
        Caribe LNG Conecta está optimizado para usarse en <strong style={{ color: 'rgba(255,255,255,0.85)' }}>modo horizontal</strong> en celular.
      </div>
      <style>{`@keyframes spin90 { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: '100vh', background: C.bg, color: C.text }}>
      <style>{`
        /* CSS responsive — bypasses JS isMobile detection */
        .clng-mobile-nav { display: none; }
        .clng-desktop-nav { display: flex; }
        @media (max-width: 960px) {
          .clng-mobile-nav { display: block !important; }
          .clng-desktop-nav { display: none !important; }
          .clng-content { padding: 10px !important; }
          .clng-g1  { grid-template-columns: 1fr !important; }
          .clng-g2  { grid-template-columns: 1fr !important; }
          .clng-g3  { grid-template-columns: 1fr !important; }
          .clng-g4  { grid-template-columns: repeat(2,1fr) !important; }
          .clng-novedades { display: none !important; }
          .clng-stat-value { font-size: 22px !important; }
          .clng-stat-pad { padding: 8px 10px !important; }
        }
        .clng-mobile-nav div::-webkit-scrollbar { display: none; }
      `}</style>
      {/* Top nav */}
      <div style={{ background: C.navy, color: 'white', position: 'sticky', top: 0, zIndex: 100 }}>
        {/* Mobile nav — landscape tab strip (shown via CSS at ≤960px) */}
        <div className="clng-mobile-nav">
          {/* Scrollable horizontal tab bar — respects safe area insets for camera notch */}
          <div style={{
            display: 'flex', alignItems: 'center',
            paddingLeft: 'max(12px, env(safe-area-inset-left))',
            paddingRight: 'max(12px, env(safe-area-inset-right))',
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(46px + env(safe-area-inset-top))',
            overflowX: 'auto', overflowY: 'hidden',
            gap: 2, scrollbarWidth: 'none',
          }}>
            {/* Logo */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              paddingRight: 10, marginRight: 4, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ width: 22, height: 22, background: `linear-gradient(135deg, ${C.accent}, ${C.tolu})`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 863.64 794.92" width="13" height="13"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#fff" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, whiteSpace: 'nowrap' }}>Caribe LNG</span>
            </div>
            {/* Nav tabs */}
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                style={{ flexShrink: 0,
                  background: view === n.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                  color: view === n.id ? '#93c5fd' : 'rgba(255,255,255,0.6)',
                  border: 'none', borderRadius: 8, padding: '5px 9px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                  whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13 }}>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
            {/* Separator + user */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              paddingLeft: 10, marginLeft: 4, borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                : <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials(profile?.full_name || session.user.email)}</div>
              }
              <button onClick={signOut}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
                  padding: '4px 8px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Salir
              </button>
            </div>
          </div>
        </div>
          <div style={{ padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, overflow: 'hidden', maxWidth: '100vw' }} className="clng-desktop-nav">
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
      </div>

      <div style={{ padding: isMobile ? '10px 10px' : '24px 40px', width: '100%', maxWidth: '100vw', boxSizing: 'border-box', overflowX: 'hidden' }}>

        {/* ━━ DASHBOARD ━━ */}
        {view === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 17 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Caribe LNG Conecta | Estado del territorio</h1>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: isMobile ? 12 : 16, flex: 1, minWidth: 0 }}>Resumen de relacionamiento · Caribe LNG 2026 · Tiempo real</p>
                {!isMobile && <button onClick={() => window.print()} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Exportar PDF</button>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 24, alignItems: 'start' }}>
            <div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: isMobile ? 8 : 16, marginBottom: 20 }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginBottom: -4 }}>
                <div style={{ width: 3, height: 16, background: C.navy, borderRadius: 2 }} />
                <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mapeo de Actores</span>
              </div>
              <div onClick={() => { setView('actores'); setFilterS('Todos') }} style={{ cursor: 'pointer' }}><StatCard label="Actores totales" value={stats.total} sub={`${stats.prioA} prioridad A`} color={C.navy} icon="👥" compact={isMobile} /></div>
              <div onClick={() => { setView('actores'); setFilterS('verde') }} style={{ cursor: 'pointer' }}><StatCard label="Relación estable" value={stats.verde} color={C.green} icon="✅" compact={isMobile} /></div>
              <div onClick={() => { setView('actores'); setFilterS('amarillo') }} style={{ cursor: 'pointer' }}><StatCard label="En atención" value={stats.amarillo + stats.naranja} sub="Amarillo + Naranja" color={C.orange} icon="⚠️" compact={isMobile} /></div>
              <div onClick={() => { setView('actores'); setFilterS('rojo') }} style={{ cursor: 'pointer' }}><StatCard label="Por iniciar" value={stats.rojo} color={C.red} icon="🚨" compact={isMobile} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 18, background: C.red, borderRadius: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mapa de Riesgos</span>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div onClick={() => setView('riesgos')} style={{ cursor: 'pointer', display: 'block', maxWidth: isMobile ? '100%' : 320 }}>
                <StatCard label="Riesgos en acción inmediata" value={riesgos.filter(r => r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente'))).length} sub="Ver mapa completo →" color='#dc2626' icon="🗺️" compact={isMobile} />
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
                <div key={t.label} onClick={() => { setView('actores'); setFilterT(t.label) }} style={{ background: C.card, borderRadius: 10, padding: isMobile ? '8px 10px' : '14px 18px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderTop: `4px solid ${t.color}`, cursor: 'pointer' }}>
                  <div style={{ fontSize: isMobile ? 24 : 34, fontWeight: 900, color: t.color }}>{t.value}</div>
                  <div style={{ fontSize: isMobile ? 12 : 15, fontWeight: 700, color: C.text }}>{t.label}</div>
                  <div style={{ fontSize: isMobile ? 11 : 15, color: C.subtle, marginTop: 1 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 18, background: C.accent, borderRadius: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Semáforo de Relacionamiento & Acuerdos</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 12 : 20 }}>
              <div style={{ background: C.card, borderRadius: 10, padding: isMobile ? '10px 12px' : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: isMobile ? '0 0 8px' : '0 0 14px', fontSize: isMobile ? 12 : 15, fontWeight: 700, color: C.text }}>Semáforo de relacionamiento</h3>
                {[['verde', 'Relación estable', stats.verde], ['amarillo', 'Requiere atención', stats.amarillo],
                  ['naranja', 'Riesgo moderado', stats.naranja], ['rojo', 'Acercamiento por iniciar', stats.rojo]].map(([k, lbl, v]) => (
                  <div key={k} onClick={() => { setView('actores'); setFilterS(k) }} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isMobile ? 6 : 9, cursor: 'pointer' }}>
                    <SemDot s={k} size={8} />
                    <span style={{ fontSize: isMobile ? 12 : 16, color: C.muted, minWidth: 0, flex: '0 1 120px' }}>{lbl}</span>
                    <div style={{ flex: 1 }}><Bar value={stats.total ? (v / stats.total) * 100 : 0} color={SEMAFORO[k].color} /></div>
                    <span style={{ fontSize: isMobile ? 12 : 15, fontWeight: 700, color: SEMAFORO[k].color, width: 22, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, borderRadius: 10, padding: isMobile ? '10px 12px' : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: isMobile ? '0 0 8px' : '0 0 14px', fontSize: isMobile ? 12 : 15, fontWeight: 700, color: C.text }}>Estado de acuerdos territoriales</h3>
                {agreements.map(ag => {
                  const barColor = { cumplido: C.green, en_curso: C.accent, estructural: C.barbosa, por_estructurar: C.yellow }[ag.estado_code] || C.accent
                  return (
                    <div key={ag.id} onClick={() => setView('acuerdos')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isMobile ? 6 : 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: isMobile ? 12 : 16, fontWeight: 700, color: C.muted, width: 20 }}>{ag.id}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: isMobile ? 12 : 15, color: C.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.nombre}</div>
                        <Bar value={ag.avance} color={barColor} height={4} />
                      </div>
                      <span style={{ fontSize: isMobile ? 12 : 16, fontWeight: 700, width: 28, textAlign: 'right', color: barColor }}>{ag.avance}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 18, background: C.red, borderRadius: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actores en Gestión Prioritaria</span>
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: isMobile ? '12px' : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <h3 style={{ margin: isMobile ? '0 0 10px' : '0 0 14px', fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.text }}>⚠️ Actores en gestion prioritaria — Acción requerida</h3>
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

            {!isMobile && <div style={{ position: 'sticky', top: 80 }}>
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
            </div>}
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
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Todos', sub: `${stats.prioA} prioridad A`, value: stats.total, color: C.navy, sem: stats.semTodos, onClick: () => { setFilterT('Todos'); setFilterS('Todos'); setFilterR('Todos'); setSearch('') } },
                { label: 'Tolú', sub: 'Terminal marítima · Sucre', value: stats.tolu, color: C.tolu, sem: stats.semTolu, onClick: () => setFilterT('Tolú') },
                { label: 'Barbosa', sub: 'Planta regasificación · Antioquia', value: stats.barbosa, color: C.barbosa, sem: stats.semBarbosa, onClick: () => setFilterT('Barbosa') },
                { label: 'Nacional', sub: 'Legislativo · Regulatorio', value: stats.nacional, color: C.blue, sem: stats.semNacional, onClick: () => setFilterT('Nacional') },
              ].map(card => (
                <div key={card.label} onClick={card.onClick}
                  style={{ background: C.card, borderRadius: 12, padding: isMobile ? '10px 12px' : '14px 16px',
                    borderTop: `3px solid ${card.color}`, cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.11)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.07)'}>
                  {/* Name + number row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: card.color, letterSpacing: -0.3 }}>{card.label}</div>
                      <div style={{ fontSize: isMobile ? 10 : 11, color: C.subtle, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.sub}</div>
                    </div>
                    <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 900, color: card.color, letterSpacing: -2, lineHeight: 1, flexShrink: 0 }}>{card.value}</div>
                  </div>
                  {/* Mini semáforo bar */}
                  {card.value > 0 && <div style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 10, gap: 1 }}>
                    {[['verde', SEMAFORO.verde.color, card.sem.verde], ['amarillo', SEMAFORO.amarillo.color, card.sem.amarillo],
                      ['naranja', SEMAFORO.naranja.color, card.sem.naranja], ['rojo', SEMAFORO.rojo.color, card.sem.rojo]]
                      .filter(([,, v]) => v > 0)
                      .map(([k, col, v]) => <div key={k} style={{ background: col, flex: v, minWidth: 3 }} title={`${v} ${k}`} />)}
                  </div>}
                  {/* Semáforo dot counts */}
                  {card.value > 0 && <div style={{ display: 'flex', gap: isMobile ? 6 : 10, marginTop: 6, flexWrap: 'wrap' }}>
                    {[['verde', card.sem.verde], ['amarillo', card.sem.amarillo], ['naranja', card.sem.naranja], ['rojo', card.sem.rojo]]
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => (
                        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <SemDot s={k} size={6} />
                          <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: C.muted }}>{v}</span>
                        </span>
                      ))}
                  </div>}
                </div>
              ))}
            </div>

            {/* ── Chips de semáforo (filtros rápidos) ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[
                { key: 'Todos', label: 'Todos', count: stats.total, color: C.navy, bg: '#f1f5f9' },
                { key: 'verde', label: 'Relación estable', count: stats.verde, color: SEMAFORO.verde.color, bg: '#dcfce7' },
                { key: 'amarillo', label: 'Requiere atención', count: stats.amarillo, color: SEMAFORO.amarillo.color, bg: '#fef9c3' },
                { key: 'naranja', label: 'Riesgo moderado', count: stats.naranja, color: SEMAFORO.naranja.color, bg: '#ffedd5' },
                { key: 'rojo', label: 'Por iniciar', count: stats.rojo, color: SEMAFORO.rojo.color, bg: '#fee2e2' },
              ].map(chip => {
                const active = filterS === chip.key
                return (
                  <button key={chip.key} onClick={() => setFilterS(chip.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6,
                      background: active ? chip.color : chip.bg,
                      color: active ? 'white' : chip.color,
                      border: `1.5px solid ${active ? chip.color : 'transparent'}`,
                      borderRadius: 20, padding: isMobile ? '5px 10px' : '5px 12px',
                      fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s' }}>
                    {chip.key !== 'Todos' && <SemDot s={chip.key} size={7} />}
                    <span>{chip.label}</span>
                    <span style={{ fontWeight: 900, opacity: active ? 0.85 : 1 }}>{chip.count}</span>
                  </button>
                )
              })}
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: 8 }}>
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

        {view === 'huella' && (() => {
          const P = { c3: { label: 'C3', desc: 'Gente Capacitada', color: '#1565C0' }, hub: { label: 'HUB', desc: 'Infraestructura Funcionando', color: '#007A87' }, eco: { label: 'ECO', desc: 'Programa Ambiental', color: '#00BFB3' } }
          const territorios = [
            { nombre: 'TOLÚ', sub: 'Sucre', color: C.navy,
              c3: { titulo: 'Licencia C3', items: ['Enfoque de género', 'Autoescuela habilitada', 'Si no hay infraestructura, Cargovolco y Suragas proveen lo necesario', 'Certificación en manejo de sustancias peligrosas', 'En 3 años los contratamos'] },
              hub: { titulo: 'Muelle Astivik', items: ['Reformamos el muelle como hub operativo', 'Deportes acuáticos para jóvenes', 'Certificaciones marítimas y portuarias para adultos', 'Mercado de pescadores'] },
              eco: { titulo: 'Ambiental Marino', items: ['Mini estudio de impacto ambiental con pescadores', 'Programa ambiental costero co-construido con la comunidad', 'Restauración de arrecifes o protección de ecosistemas marinos', 'Nace del mar, se construye con la gente del mar'] },
              resumen: 'Tolú = Astivik + Licencia C3 + Programa Ambiental Marino con Pescadores'
            },
            { nombre: 'BARBOSA', sub: 'Antioquia', color: C.navy,
              c3: { titulo: 'Licencia C3', items: ['Mismo programa de formación', 'Enfoque de género', 'Certificación en sustancias peligrosas', 'En 3 años los contratamos'] },
              hub: { titulo: 'Cancha El Machete', items: ['Reforma con cubierta', 'Polideportivo: microfútbol, voleibol, básquetbol', 'Espacio comunitario de uso continuo'] },
              eco: { titulo: 'Cadena de Reciclaje', items: ['Puntos ecológicos en la comunidad', 'La comunidad recicla y vende el producto', 'Acuerdo con Alcaldía y EPM para manejo de basuras', 'Siembra de 150 árboles', 'Genera ingreso para la comunidad'] },
              resumen: 'Barbosa = El Machete + Licencia C3 + Cadena de Reciclaje que Genera Ingreso'
            }
          ]
          const HuellaCard = ({ pilar, data }) => (
            <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0, background: '#fff', border: '1px solid #E0E4EA', borderRadius: 14, padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: pilar.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <span style={{ color: 'white', fontSize: 15, fontWeight: 900, letterSpacing: 0.5 }}>{pilar.label}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14, textAlign: 'center' }}>{data.titulo}</div>
              <div style={{ width: '100%', textAlign: 'left' }}>
                {data.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 15, color: '#444', lineHeight: 1.6 }}>
                    <span style={{ color: '#00BFB3', fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>•</span>
                    <span>{it}</span>
                  </div>
                ))}
              </div>
            </div>
          )
          return (
            <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 16 : 32 }}>
              {/* Header with logos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg viewBox="0 0 863.64 794.92" width="36" height="36"><path fill="#1565C0" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#08306b" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.navy, letterSpacing: -0.3 }}>Caribe LNG</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>Caribe LNG <span style={{ color: '#00BFB3' }}>¡Conecta!</span></div>
              </div>
              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 34, fontWeight: 900, color: C.navy }}>HUELLA SOCIAL TERRITORIAL</h1>
                <div style={{ width: 80, height: 4, background: C.accent, borderRadius: 2, margin: '10px auto 12px' }} />
                <p style={{ margin: 0, color: '#5C6370', fontSize: 15, fontWeight: 500 }}>Lo que Caribe LNG deja en cada territorio</p>
              </div>
              {/* Legend bar */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? 10 : 24, marginBottom: 32, flexWrap: 'wrap', background: '#F5F7FA', borderRadius: 10, padding: '12px 20px' }}>
                {Object.values(P).map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: p.color, color: 'white', fontSize: 11, fontWeight: 900, padding: '4px 12px', borderRadius: 14 }}>{p.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.desc}</span>
                  </div>
                ))}
              </div>
              {/* Territories */}
              {territorios.map(t => (
                <div key={t.nombre} style={{ marginBottom: 40 }}>
                  <div style={{ marginBottom: 16, borderBottom: '2px solid #E0E4EA', paddingBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 900, color: C.navy }}>
                      {t.nombre} <span style={{ fontSize: 16, fontWeight: 400, color: '#8D95A0', marginLeft: 8 }}>{t.sub}</span>
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: 16 }}>
                    <HuellaCard pilar={P.c3} data={t.c3} />
                    <HuellaCard pilar={P.hub} data={t.hub} />
                    <HuellaCard pilar={P.eco} data={t.eco} />
                  </div>
                  {/* Summary banner */}
                  <div style={{ background: '#0D2137', borderRadius: 10, padding: '14px 24px', textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{t.resumen}</span>
                  </div>
                </div>
              ))}
              {/* Final banner */}
              <div style={{ background: 'linear-gradient(135deg, #0D47A1, #007A87)', borderRadius: 12, padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, color: 'white', marginBottom: 8 }}>Nace del territorio. Se construye con su gente.</div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Eso es la huella social de Caribe LNG.</div>
              </div>
              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#8D95A0' }}>
                Caribe LNG | Huella Social Territorial | 2026
              </div>
            </div>
          )
        })()}

        {view === 'input' && (
          <InputSemanal session={session} profile={profile} territorio={myTerritorio}
            reportes={reportes} seguimiento={seguimiento} onSaved={loadData} isAdmin={isAdmin} />
        )}

        {view === 'kpis' && (
          <KPIsView reportes={reportes} seguimiento={seguimiento}
            isAdmin={isAdmin} onDeleted={loadData} agreements={agreements}
            kpisDac={kpisDac} onKpiDacSaved={loadData} />
        )}

        {view === 'riesgos' && (
          <RiesgosView riesgos={riesgos} riesgosLeg={riesgosLeg} cronoLeg={cronoLeg}
            isAdmin={isAdmin} onDeleted={loadData} />
        )}

        {view === 'knowledge' && isAdmin && (
          <KnowledgeBaseView docs={knowledgeBase} onReload={loadData} isMobile={isMobile} />
        )}

        {view === 'gestora' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>📍 Mi Territorio</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{profile?.full_name} · {myTerritorio || 'Todos los territorios'}</p>
            </div>
            {/* Explanation banner */}
            <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}33`, borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
                <strong>Panel de campo.</strong> Aquí ves de un vistazo los actores que necesitan atención inmediata en tu territorio y los cumpleaños próximos — para que puedas priorizar tu gestión del día. Toca cualquier actor para registrar una novedad.
              </div>
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
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>📅 Próximas fechas importantes</h3>
              {(() => {
                const today = new Date()
                const todayMM = today.getMonth()
                const todayDD = today.getDate()
                const items = []

                const filteredActors = actors.filter(a => myTerritorio ? a.territorio === myTerritorio : true)

                // Birthdays
                filteredActors.filter(a => a.cumpleanos).forEach(a => {
                  const d = new Date(a.cumpleanos)
                  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
                  if (next < today) next.setFullYear(today.getFullYear() + 1)
                  const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
                  if (diff <= 30) items.push({
                    actorId: a.id, actor: a, diff,
                    descripcion: '🎂 Cumpleaños',
                    dateStr: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
                  })
                })

                // Fechas importantes
                filteredActors.forEach(a => {
                  if (!Array.isArray(a.fechas_importantes)) return
                  a.fechas_importantes.forEach((fi, idx) => {
                    if (!fi.fecha) return
                    const [mm, dd] = fi.fecha.split('-').map(Number)
                    if (!mm || !dd) return
                    const next = new Date(today.getFullYear(), mm - 1, dd)
                    if (next < today) next.setFullYear(today.getFullYear() + 1)
                    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
                    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
                    if (diff <= 30) items.push({
                      actorId: a.id + '-' + idx, actor: a, diff,
                      descripcion: fi.descripcion,
                      dateStr: `${dd} de ${meses[mm - 1]}`
                    })
                  })
                })

                items.sort((a, b) => a.diff - b.diff)

                if (!items.length) return <div style={{ fontSize: 14, color: C.subtle, fontStyle: 'italic' }}>Sin fechas en los próximos 30 días.</div>
                return items.map(item => (
                  <div key={item.actorId} onClick={() => setSelectedActor(item.actor)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.actor.nombre}</div>
                      <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>{item.descripcion}</div>
                      <div style={{ fontSize: 12, color: C.subtle }}>{item.dateStr}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: item.diff <= 7 ? C.red : C.orange, textAlign: 'right', minWidth: 60 }}>
                      {item.diff === 0 ? '¡Hoy! 🎉' : `En ${item.diff}d`}
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

      <ChatBot
        appData={{ actors, agreements, riesgos, riesgosLeg, cronoLeg, kpisDac, reportes }}
        knowledgeDocs={knowledgeBase}
        session={session}
        isMobile={isMobile}
      />
    </div>
  )
}
