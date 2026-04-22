import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts'

import { supabase, signInWithMicrosoft, signOut, getProfile, upsertProfile,
         getActors, addActor, getAgreements, getInteractions, getAllInteractions, addInteraction, updateActor, updateAgreementAvance,
         getCronograma, getHuellaSocial, updateCronogramaEstado,
         getReportesSemanales, addReporteSemanal, deleteReporteSemanal, deleteKpiEntry, deleteCronogramaEvent, deleteRiesgo,
         getSeguimientoAcuerdos, addSeguimientoAcuerdo, updateSeguimientoAcuerdo, deleteSeguimientoAcuerdo,
         getRiesgos, getBowTie, getRiesgosLegislativos, getCronogramaLegislativo,
         addCronogramaLegislativo, deleteCronogramaLegislativo,
         getKpisDac, upsertKpiDac, sendAlerta, getAlertas, resolverAlerta,
         getKnowledgeBase, addKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc, uploadKnowledgeFile,
         uploadEvidenciaPhoto, addEvidencia, getEvidencias, deleteEvidencia,
         submitActorEdit, getActorEdits, approveActorEdit, rejectActorEdit,
         addRegistroDiario, getRegistrosDiarios,
         getAuditLog, subscribeToPush, sendPushNotification } from './lib/supabase'

import { IconDashboard, IconPin, IconUsers, IconGlobe, IconHandshake, IconLeaf, IconCalendar,
         IconAlert, IconClipboard, IconTarget, IconEdit, IconBrain, IconCamera, IconBell, IconSearch, IconDownload, IconBook } from './components/Icons'

// ── Export helper ────────────────────────────────────────────────────────────
function exportToExcel(data, filename, sheetName = 'Datos') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

import { C, SEMAFORO, TIPO_COLOR, getTipoColor, initials } from './lib/constants'
import { Avatar, Tag, Pill, Bar, StatCard, SemDot, InfoRow, Block, Field } from './components/ui'
import LoginScreen from './components/LoginScreen'
import ActorCard from './components/ActorCard'
import ActorModal from './components/ActorModal'
import InputSemanal from './components/InputSemanal'
import RiesgosView from './components/RiesgosView'
import KPIsView from './components/KPIsView'
import KnowledgeBaseView from './components/KnowledgeBaseView'
import ChatBot from './components/ChatBot'
import OnboardingTour from './components/OnboardingTour'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'

// LoginScreen → imported from components/LoginScreen

// ActorCard → imported from components/ActorCard

// InfoRow, Block, Field → imported from components/ui

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
            ? <div style={{ fontSize: 14, color: C.orange, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{localNotas}</div>
            : isAdmin && <div style={{ fontSize: 13, color: C.subtle, fontStyle: 'italic', flex: 1 }}>Sin nota de seguimiento</div>
          }
          {isAdmin && (
            <button onClick={() => setEditingNotas(true)}
              style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>
              
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
                  title="Borrar esta actividad">✕</button>
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

// ━━ Main App ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (profile && !profile.onboarding_conecta_completed) setShowOnboarding(true)
  }, [profile])
  const [authLoading, setAuthLoading] = useState(true)

  const [view, setView] = useState('dashboard')
  const [navOpen, setNavOpen] = useState(null) // which dropdown is open
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actors, setActors] = useState([])
  const [agreements, setAgreements] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedActor, setSelectedActor] = useState(null)
  const [showNewActor, setShowNewActor] = useState(false)
  const [newActor, setNewActor] = useState({ nombre: '', tipo: 'Político', territorio: 'Nacional', semaforo: 'rojo', posicion: 'Neutro', poder: 3, interes: 3, prioridad: '', riesgo: 'Bajo', owner: '', contacto: '', telefono: '', correo: '', que_hacemos: '', recomendacion_gestora: '', recomendacion_dac: '' })
  const [search, setSearch] = useState('')
  const [filterT, setFilterT] = useState('Todos')
  const [filterS, setFilterS] = useState('Todos')
  const [filterR, setFilterR] = useState('Todos')
  const [cronograma, setCronograma] = useState([])
  const [huellaSocial, setHuellaSocial] = useState([])
  const [expandedAcuerdo, setExpandedAcuerdo] = useState(null)
  const [cronoFilter, setCronoFilter] = useState('Todos')
  const [cronoEstadoFilter, setCronoEstadoFilter] = useState('Todos')
  const [riesgos, setRiesgos] = useState([])
  const [riesgosLeg, setRiesgosLeg] = useState([])
  const [cronoLeg, setCronoLeg] = useState([])
  const [reportes, setReportes] = useState([])
  const [seguimiento, setSeguimiento] = useState([])
  const [kpisDac, setKpisDac] = useState([])
  const [allInteractions, setAllInteractions] = useState([])
  const [knowledgeBase, setKnowledgeBase] = useState([])
  const [evidencias, setEvidencias] = useState([])
  const [showEvidenciaCapture, setShowEvidenciaCapture] = useState(false)
  const [selectedEvidencia, setSelectedEvidencia] = useState(null)
  const [selectedRegistro, setSelectedRegistro] = useState(null)
  const [alertaMensaje, setAlertaMensaje] = useState('')
  const [alertaUrgencia, setAlertaUrgencia] = useState('Media')
  const [alertaEnviada, setAlertaEnviada] = useState(false)
  const [actorEdits, setActorEdits] = useState([])
  const [editingActor, setEditingActor] = useState(null)
  const [registrosDiarios, setRegistrosDiarios] = useState([])
  const [inputSubTab, setInputSubTab] = useState('diario')
  const [showGuia, setShowGuia] = useState(false)
  const [auditLog, setAuditLog] = useState([])
  const [showAudit, setShowAudit] = useState(false)
  const [alertasRecibidas, setAlertasRecibidas] = useState([])
  const [alertaResolviendo, setAlertaResolviendo] = useState(null)
  const [alertaResolucionTexto, setAlertaResolucionTexto] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)

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
    // Subscribe to push notifications
    subscribeToPush(u.id).catch(() => {})
  }, [session])

  // Core data — always loaded (needed for dashboard + navigation)
  const loadCoreData = useCallback(async () => {
    if (!session) return
    setDataLoading(true)
    try {
      const [a, ag, rp, sg, ri, ae] = await Promise.all([
        getActors(), getAgreements(), getReportesSemanales(),
        getSeguimientoAcuerdos(), getRiesgos(), getActorEdits()
      ])
      setActors(a || [])
      setAgreements(ag || [])
      setReportes(rp || [])
      setSeguimiento(sg || [])
      setRiesgos(ri || [])
      setActorEdits(ae || [])
    } finally { setDataLoading(false) }
  }, [session])

  // View-specific data — loaded on demand
  const loadViewData = useCallback(async (v) => {
    if (!session) return
    try {
      if (v === 'cronograma' && !cronograma.length) setCronograma(await getCronograma() || [])
      if (v === 'huella') {
        if (!huellaSocial.length) setHuellaSocial(await getHuellaSocial() || [])
        if (!cronograma.length) setCronograma(await getCronograma() || [])
      }
      if (v === 'riesgos' && !riesgosLeg.length) {
        const [rl, cleg] = await Promise.all([getRiesgosLegislativos(), getCronogramaLegislativo()])
        setRiesgosLeg(rl || []); setCronoLeg(cleg || [])
      }
      if (v === 'kpis') {
        if (!kpisDac.length) setKpisDac(await getKpisDac() || [])
        if (!allInteractions.length) setAllInteractions(await getAllInteractions() || [])
        if (!cronograma.length) setCronograma(await getCronograma() || [])
      }
      if (v === 'knowledge' && !knowledgeBase.length) setKnowledgeBase(await getKnowledgeBase() || [])
      if (v === 'dac') {
        const [al, rs, rd, ev] = await Promise.all([getAlertas(), getReportesSemanales(), getRegistrosDiarios(), getEvidencias()])
        setAlertasRecibidas(al || [])
        setReportes(rs || [])
        setRegistrosDiarios(rd || [])
        setEvidencias(ev || [])
      }
      if (v === 'input') {
        const [ev, rd] = await Promise.all([getEvidencias(), getRegistrosDiarios()])
        setEvidencias(ev || []); setRegistrosDiarios(rd || [])
      }
      if (v === 'gestora') {
        const [ev, rd] = await Promise.all([getEvidencias(), getRegistrosDiarios()])
        setEvidencias(ev || []); setRegistrosDiarios(rd || [])
      }
    } catch (err) { console.error('Error loading view data:', err) }
  }, [session, cronograma.length, huellaSocial.length, riesgosLeg.length, kpisDac.length, knowledgeBase.length])

  // Full reload (for real-time updates)
  const loadData = useCallback(async () => {
    await loadCoreData()
    await loadViewData(view)
  }, [loadCoreData, loadViewData, view])

  useEffect(() => { loadCoreData() }, [loadCoreData])
  useEffect(() => { loadViewData(view) }, [view, loadViewData])

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

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960)
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth && window.innerWidth < 960)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 960)
      setIsPortrait(window.innerHeight > window.innerWidth && window.innerWidth < 960)
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
    { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={16} /> },
    { id: 'miterritorio', label: 'Mi Territorio', icon: <IconPin size={16} />, children: [
      { id: 'gestora', label: 'Vista General', icon: <IconPin size={16} /> },
      { id: 'input', label: 'Registro de Campo', icon: <IconEdit size={16} /> },
    ]},
    { id: 'actores', label: 'Actores', icon: <IconUsers size={16} /> },
    { id: 'estrategia', label: 'Estrategia Social', icon: <IconGlobe size={16} />, children: [
      { id: 'huella', label: 'Huella Social', icon: <IconLeaf size={16} /> },
      { id: 'kpis', label: 'Indicadores', icon: <IconTarget size={16} /> },
    ]},
    { id: 'riesgos', label: 'Riesgos Sociales', icon: <IconAlert size={16} /> },
    ...(isAdmin ? [{ id: 'knowledge', label: 'Base Conocimiento', icon: <IconBrain size={16} /> }] : []),
    ...(isAdmin ? [{ id: 'dac', label: 'Dirección', icon: <IconBell size={16} /> }] : []),
  ]
  // helper: check if a view belongs to a dropdown group
  const isInGroup = (groupId) => NAV.find(n => n.id === groupId)?.children?.some(c => c.id === view)

  if (isMobile && isPortrait) return (
    <div style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: '100vh', background: C.navy, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 24, animation: 'spin90 1.5s ease-in-out infinite alternate' }}>📱</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: 'white', marginBottom: 12, letterSpacing: -0.5 }}>Rota tu cel</div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 260 }}>
        Caribe LNG Conecta está optimizado para usarse en <strong style={{ color: 'rgba(255,255,255,0.85)' }}>modo horizontal</strong> en celular.
      </div>
      <style>{`@keyframes spin90 { from { transform: rotate(0deg); } to { transform: rotate(90deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: '100vh', background: C.bg, color: C.text }}>
      {navOpen && <div onClick={() => setNavOpen(null)} style={{ position: 'fixed', top: 60, left: 0, right: 0, bottom: 0, zIndex: 99 }} />}
      <style>{`
        .clng-mobile-nav { display: none; }
        .clng-desktop-nav { display: flex; }
        @media (max-width: 960px) {
          .clng-mobile-nav { display: block !important; }
          .clng-desktop-nav { display: none !important; }
          .clng-content { margin-left: 0 !important; padding: 10px !important; }
          aside { display: none !important; }
          .clng-g1  { grid-template-columns: 1fr !important; }
          .clng-g2  { grid-template-columns: 1fr !important; }
          .clng-g3  { grid-template-columns: 1fr !important; }
          .clng-g4  { grid-template-columns: repeat(2,1fr) !important; }
          .clng-novedades { display: none !important; }
          .clng-stat-value { font-size: 22px !important; }
          .clng-stat-pad { padding: 8px 10px !important; }
        }
        @keyframes wave1 { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes wave2 { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        @keyframes logoFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .clng-wave-1 { animation: wave1 18s linear infinite; }
        .clng-wave-2 { animation: wave2 24s linear infinite; }
        aside img { animation: logoFloat 3s ease-in-out infinite; }
        .clng-footer-logo { animation: logoFloat 4s ease-in-out infinite; }
      `}</style>
      {/* Sidebar con search + nav + user */}
      <Sidebar
        activeView={view}
        onNavigate={(k) => { setView(k); setNavOpen(null) }}
        profile={profile}
        session={session}
        onSignOut={signOut}
        onReplayTour={() => setShowOnboarding(true)}
        isAdmin={isAdmin}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        showGlobalSearch={showGlobalSearch}
        setShowGlobalSearch={setShowGlobalSearch}
        searchResults={(() => {
          if (!globalSearch || globalSearch.length < 2) return []
          const q = globalSearch.toLowerCase()
          const results = []
          actors.filter(a => a.nombre?.toLowerCase().includes(q) || a.tipo?.toLowerCase().includes(q) || a.contacto?.toLowerCase().includes(q)).slice(0, 4)
            .forEach(a => results.push({ label: a.nombre, sub: `${a.tipo} · ${a.territorio}`, action: () => { setSelectedActor(a); setView('actores') } }))
          registrosDiarios.filter(r => r.descripcion?.toLowerCase().includes(q) || r.lugar?.toLowerCase().includes(q) || r.tipo_reunion?.toLowerCase().includes(q)).slice(0, 3)
            .forEach(r => results.push({ label: r.descripcion?.substring(0, 50), sub: `${r.tipo_reunion} · ${r.fecha}`, action: () => { setView('input'); setInputSubTab('diario') } }))
          agreements.filter(a => a.nombre?.toLowerCase().includes(q)).slice(0, 2)
            .forEach(a => results.push({ label: a.nombre, sub: `${a.territorio} · ${a.avance}%`, action: () => setView('huella') }))
          riesgos.filter(r => r.riesgo?.toLowerCase().includes(q) || r.accion_inmediata?.toLowerCase().includes(q)).slice(0, 2)
            .forEach(r => results.push({ label: r.riesgo?.substring(0, 50), sub: r.semaforo, action: () => setView('riesgos') }))
          seguimiento.filter(s => s.compromiso?.toLowerCase().includes(q) || s.actividad?.toLowerCase().includes(q)).slice(0, 2)
            .forEach(s => results.push({ label: s.compromiso?.substring(0, 50), sub: s.estado, action: () => setView('huella') }))
          return results
        })()}
      />

      <main className="clng-content" style={{ marginLeft: 240, padding: isMobile ? '10px 10px' : '24px 32px', minHeight: '100vh', boxSizing: 'border-box', overflowX: 'hidden', transition: 'margin-left 0.2s' }}>

        {/* ━━ DASHBOARD ━━ */}
        {view === 'dashboard' && (
          <Dashboard
            stats={stats}
            actors={actors}
            agreements={agreements}
            riesgos={riesgos}
            seguimiento={seguimiento}
            reportes={reportes}
            cronograma={cronograma}
            isMobile={isMobile}
            isAdmin={isAdmin}
            profile={profile}
            session={session}
            actorEdits={actorEdits}
            setView={setView}
            setFilterS={setFilterS}
            setFilterT={setFilterT}
            setSelectedActor={setSelectedActor}
            loadData={loadData}
            exportToExcel={exportToExcel}
            approveActorEdit={approveActorEdit}
            rejectActorEdit={rejectActorEdit}
            sendPushNotification={sendPushNotification}
            auditLog={auditLog}
            setAuditLog={setAuditLog}
            showAudit={showAudit}
            setShowAudit={setShowAudit}
            getAuditLog={getAuditLog}
            registrosDiarios={registrosDiarios}
            subscribeToPush={subscribeToPush}
          />
        )}
        {/* ━━ ACTORES ━━ */}
        {view === 'actores' && (
          <div>
            {/* Hero */}
            <div style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #1976D2 100%)', borderRadius: 20, padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, position: 'relative', zIndex: 1 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white' }}>Base de Actores</h1>
                  <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{filtered.length} de {actors.length} actores · Tolú, Barbosa y Nacional</p>
                </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {(isAdmin || profile?.role === 'gestora') && (
                  <button onClick={() => setShowNewActor(!showNewActor)}
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10,
                      padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
                    + Nuevo Actor
                  </button>
                )}
                <button onClick={() => exportToExcel(
                  filtered.map(a => ({ Nombre: a.nombre, Tipo: a.tipo, Territorio: a.territorio, Semáforo: a.semaforo, Posición: a.posicion, Riesgo: a.riesgo, Poder: a.poder, Interés: a.interes, Prioridad: a.prioridad, Responsable: a.owner, Contacto: a.contacto, 'Última acción': a.accion_tomada, 'Fecha acción': a.fecha_accion })),
                  'Actores_CaribeLNG', 'Actores'
                )}
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                    padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IconDownload size={14} /> Excel
                </button>
              </div>
            </div>
            </div>

            {/* ── Resumen de impacto ── */}
            {(() => {
              const now = new Date()
              const hace30 = new Date(now - 30 * 24 * 60 * 60 * 1000)
              const contactadosReciente = actors.filter(a => a.fecha_accion && new Date(a.fecha_accion) >= hace30).length
              const sinContacto30 = actors.filter(a => !a.fecha_accion || new Date(a.fecha_accion) < hace30).length
              const prioA = actors.filter(a => a.prioridad === 'A' || a.prioridad === 1)
              const prioAContactados = prioA.filter(a => a.fecha_accion && new Date(a.fecha_accion) >= hace30).length
              const verdes = actors.filter(a => a.semaforo === 'verde').length
              const relPct = actors.length ? Math.round((verdes / actors.length) * 100) : 0
              return (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #e8ecf0', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#22c55e' }} />
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#22c55e' }}>{contactadosReciente}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926' }}>Contactados este mes</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>de {actors.length} actores</div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #e8ecf0', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: sinContacto30 > 100 ? '#ef4444' : '#f59e0b' }} />
                    <div style={{ fontSize: 24, fontWeight: 900, color: sinContacto30 > 100 ? '#ef4444' : '#f59e0b' }}>{sinContacto30}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926' }}>Sin contacto (30+ días)</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>requieren atención</div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #e8ecf0', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.navy }} />
                    <div style={{ fontSize: 24, fontWeight: 900, color: C.navy }}>{prioAContactados}/{prioA.length}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926' }}>Prioridad A activos</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>contactados este mes</div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', border: '1px solid #e8ecf0', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: relPct >= 50 ? '#22c55e' : '#f59e0b' }} />
                    <div style={{ fontSize: 24, fontWeight: 900, color: relPct >= 50 ? '#22c55e' : '#f59e0b' }}>{relPct}%</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926' }}>Relación estable</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{verdes} actores en verde</div>
                  </div>
                </div>
              )
            })()}

            {/* ── Formulario nuevo actor ── */}
            {showNewActor && (
              <div style={{ background: C.card, borderRadius: 12, padding: 20, marginBottom: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.1)', border: `2px solid ${C.navy}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>Crear nuevo actor</h3>
                  <button onClick={() => setShowNewActor(false)}
                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.muted }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
                  {/* Nombre */}
                  <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Nombre *</label>
                    <input value={newActor.nombre} onChange={e => setNewActor({ ...newActor, nombre: e.target.value })}
                      placeholder="Nombre completo del actor"
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  {/* Tipo */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Tipo *</label>
                    <select value={newActor.tipo} onChange={e => setNewActor({ ...newActor, tipo: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Comunitario', 'Político', 'Institucional', 'Empresarial', 'Mediático', 'Social', 'Educativo'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {/* Territorio */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Territorio *</label>
                    <select value={newActor.territorio} onChange={e => setNewActor({ ...newActor, territorio: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Tolú', 'Barbosa', 'Nacional'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {/* Semáforo */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Semáforo</label>
                    <select value={newActor.semaforo} onChange={e => setNewActor({ ...newActor, semaforo: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['verde', 'amarillo', 'naranja', 'rojo'].map(s => (
                        <option key={s} value={s}>{SEMAFORO[s].dot} {SEMAFORO[s].label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Posición */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Posición</label>
                    <select value={newActor.posicion} onChange={e => setNewActor({ ...newActor, posicion: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Aliado', 'Neutro', 'Opositor'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  {/* Riesgo */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Riesgo</label>
                    <select value={newActor.riesgo} onChange={e => setNewActor({ ...newActor, riesgo: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Bajo', 'Medio', 'Alto', 'Muy Alto'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  {/* Poder */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Poder (1-5)</label>
                    <select value={newActor.poder} onChange={e => setNewActor({ ...newActor, poder: +e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  {/* Interés */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Interés (1-5)</label>
                    <select value={newActor.interes} onChange={e => setNewActor({ ...newActor, interes: +e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  {/* Prioridad */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Prioridad</label>
                    <select value={newActor.prioridad} onChange={e => setNewActor({ ...newActor, prioridad: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      <option value="">Sin prioridad</option>
                      <option value="A">A (máxima)</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  {/* Owner */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Responsable</label>
                    <input value={newActor.owner} onChange={e => setNewActor({ ...newActor, owner: e.target.value })}
                      placeholder="Quién gestiona"
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  {/* Contacto */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Contacto (cargo / referencia)</label>
                    <input value={newActor.contacto} onChange={e => setNewActor({ ...newActor, contacto: e.target.value })}
                      placeholder="Ej: Asistente, jefe de despacho..."
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  {/* Teléfono */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Teléfono</label>
                    <input value={newActor.telefono} onChange={e => setNewActor({ ...newActor, telefono: e.target.value })}
                      type="tel" placeholder="+57 300 123 4567"
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  {/* Correo */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Correo electrónico</label>
                    <input value={newActor.correo} onChange={e => setNewActor({ ...newActor, correo: e.target.value })}
                      type="email" placeholder="nombre@dominio.com"
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  {/* Qué hacemos */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Estrategia / Qué hacemos</label>
                    <textarea value={newActor.que_hacemos} onChange={e => setNewActor({ ...newActor, que_hacemos: e.target.value })}
                      placeholder="Estrategia de relacionamiento con este actor"
                      rows={2}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                  {/* Recomendación de la gestora */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4 }}>💡 Recomendación de la gestora</label>
                    <textarea value={newActor.recomendacion_gestora} onChange={e => setNewActor({ ...newActor, recomendacion_gestora: e.target.value })}
                      placeholder="Lectura desde el campo: tono, canales, frecuencia, temas a evitar, oportunidades..."
                      rows={2}
                      style={{ width: '100%', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px',
                        fontSize: 15, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fefce8' }} />
                  </div>
                  {/* Lectura estratégica DAC (solo admin) */}
                  {isAdmin && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: C.navy, display: 'block', marginBottom: 4 }}>🎯 Lectura estratégica DAC</label>
                      <textarea value={newActor.recomendacion_dac} onChange={e => setNewActor({ ...newActor, recomendacion_dac: e.target.value })}
                        placeholder="Lectura como Dirección DAC: prioridad política, mensaje institucional, riesgos a vigilar..."
                        rows={2}
                        style={{ width: '100%', border: `1px solid ${C.navy}33`, borderRadius: 8, padding: '8px 12px',
                          fontSize: 15, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#eff6ff' }} />
                    </div>
                  )}
                </div>
                {/* Botones */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowNewActor(false)}
                    style={{ background: '#f1f5f9', color: C.muted, border: 'none', borderRadius: 8,
                      padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={async () => {
                    if (!newActor.nombre.trim()) return alert('El nombre es obligatorio')
                    try {
                      await addActor(newActor)
                      await loadData()
                      setShowNewActor(false)
                      setNewActor({ nombre: '', tipo: 'Político', territorio: 'Nacional', semaforo: 'rojo', posicion: 'Neutro', poder: 3, interes: 3, prioridad: '', riesgo: 'Bajo', owner: '', contacto: '', telefono: '', correo: '', que_hacemos: '', recomendacion_gestora: '', recomendacion_dac: '' })
                    } catch (err) { alert('Error creando actor: ' + err.message) }
                  }}
                    style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8,
                      padding: '8px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Guardar actor
                  </button>
                </div>
              </div>
            )}

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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, tipo..."
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
            <div style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #007A87 100%)', borderRadius: 20, padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 100, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' }}>{agreements.filter(a => a.estado_code === 'cumplido').length} cumplidos de {agreements.length}</span>
              </div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white' }}>Acuerdos Territoriales</h1>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Co-responsabilidad comunitaria · {agreements.filter(a => a.territorio === 'Tolú').length} Tolú · {agreements.filter(a => a.territorio === 'Barbosa').length} Barbosa</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>{agreements.length ? Math.round(agreements.reduce((s, a) => s + (a.avance || 0), 0) / agreements.length) : 0}%</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avance prom.</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#34d399' }}>{agreements.filter(a => a.estado_code === 'cumplido').length}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cumplidos</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#fbbf24' }}>{seguimiento.filter(s => s.estado === 'Pendiente').length}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pendientes</div>
                </div>
              </div>
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
            {(() => {
              const cumplido = cronograma.filter(c => c.estado === 'Cumplido').length
              const enProceso = cronograma.filter(c => c.estado === 'En proceso').length
              const pendiente = cronograma.filter(c => c.estado === 'Pendiente').length
              return (
                <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0D47A1 50%, #1565C0 100%)', borderRadius: 20, padding: isMobile ? '20px 16px' : '24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 100, marginBottom: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: enProceso > 0 ? '#fbbf24' : '#34d399' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' }}>{enProceso} en proceso</span>
                  </div>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white' }}>Cronograma 2026</h1>
                  <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Gestión Social Territorial · Nov 2025 – Dic 2026</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#34d399' }}>{cumplido}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cumplidos</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#fbbf24' }}>{enProceso}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>En proceso</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>{pendiente}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pendientes</div>
                    </div>
                  </div>
                </div>
              )
            })()}
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
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.red, padding: '0 2px' }}>✕</button>
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
          const ejes = [
            { key: 'ft', label: '1', matchKey: 'FT', titulo: 'Formación para el Trabajo', ifc: 'Empleo formal para jóvenes', color: '#1565C0',
              bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#93c5fd',
              tagline: 'Jóvenes de 18-28 años en Tolú y comunidades aledañas con certificaciones que les abren puertas laborales',
              items: ['Licencias de conducción C2/C3', 'Certificaciones marítimas y portuarias', 'Formación técnica en energía y mantenimiento', 'Manejo de sustancias peligrosas', 'Orientado a empleo formal y certificable'] },
            { key: 'jd', label: '2', matchKey: 'JD', titulo: 'Juventud, Deporte y Liderazgo', ifc: 'Ocupación del tiempo libre', color: '#007A87',
              bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '#6ee7b7',
              tagline: 'Jóvenes con actividades deportivas, liderazgo y habilidades para la vida — no en riesgo',
              items: ['Liderazgo juvenil y desarrollo personal', 'Deportes acuáticos y recreación', 'Educación comunitaria y habilidades para la vida', 'Espacios seguros para jóvenes', 'Alianzas con organizaciones deportivas y sociales'] },
            { key: 'ec', label: '3', matchKey: 'EC', titulo: 'Economía Local y Medio Ambiente', ifc: 'Economías locales sostenibles', color: '#00BFB3',
              bg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border: '#5eead4',
              tagline: 'Comunidades con cadenas productivas fortalecidas y ecosistemas protegidos',
              items: ['Fortalecimiento productivo de pescadores artesanales', 'Protección y restauración de ecosistemas locales', 'Reciclaje comunitario y economía circular', 'Educación ambiental'] },
          ]
          const contexto = [
            { value: '21.8%', label: 'Pobreza multidimensional en Sucre' },
            { value: '17.8%', label: 'Desempleo juvenil (18-28) en Colombia' },
            { value: '69%', label: 'Informalidad laboral en Sucre' },
            { value: '55%', label: 'Jóvenes (18-28) en informalidad' },
            { value: '100%', label: 'Inversión privada — cero costo público' },
          ]
          return (
            <div>
              {/* Hero */}
              <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #00BFB3 100%)', borderRadius: 20, padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 100, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' }}>3 ejes de inversión social</span>
                </div>
                <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white' }}>Huella Social Territorial</h1>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Guía de referencia interna — ejes, programas y contexto territorial</p>
              </div>

              {/* Intro */}
              <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', border: '1px solid #e8ecf0', marginBottom: 24, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                La inversión social de Caribe LNG se ejecuta en dos territorios: <strong style={{ color: '#2B2926' }}>Tolú (Sucre)</strong> — terminal marítima — y <strong style={{ color: '#2B2926' }}>Barbosa (Antioquia)</strong> — planta de regasificación. La estrategia se organiza en tres ejes: empleo, juventud y economía local. Cada eje tiene programas, aliados y poblaciones objetivo definidas. 100% inversión privada, sin costo para los municipios. El objetivo es dejar capacidad instalada en los territorios, no dependencia.
              </div>

              {/* Section title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 3, height: 14, background: '#0D47A1', borderRadius: 2 }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#2B2926', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Tres ejes de inversión social</span>
              </div>

              {/* 3 Ejes */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
                {ejes.map(e => (
                  <div key={e.key} style={{ background: e.bg, borderRadius: 16, padding: '22px 18px', border: `1px solid ${e.border}`, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: e.color }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{e.label}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#2B2926', lineHeight: 1.2 }}>{e.titulo}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: e.color, marginTop: 2 }}>{e.ifc}</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, marginTop: 10 }}>
                      {e.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: e.color, flexShrink: 0, marginTop: 6, boxShadow: `0 0 4px ${e.color}60` }} />
                          <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, padding: '10px 12px', background: `${e.color}10`, borderRadius: 10, border: `1px solid ${e.color}20` }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: e.color, lineHeight: 1.4 }}>→ {e.tagline}</span>
                    </div>
                    {/* Acuerdos vinculados — conexión directa */}
                    {(() => {
                      const acuerdosEje = agreements.filter(ag => ag.eje && ag.eje.split(',').includes(e.matchKey))
                      if (!acuerdosEje.length) return null
                      return (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ width: 2, height: 12, background: e.color, opacity: 0.4 }} />
                            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${e.color}`, opacity: 0.4 }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: e.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Acuerdos vinculados</div>
                          {acuerdosEje.map(ag => {
                            const pct = ag.avance || 0
                            const pctColor = pct >= 100 ? '#22c55e' : pct > 0 ? e.color : '#eab308'
                            const isExpanded = expandedAcuerdo === ag.id
                            return (
                              <div key={ag.id} onClick={() => setExpandedAcuerdo(isExpanded ? null : ag.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: isExpanded ? `${e.color}10` : 'white', borderRadius: 8, border: `1px solid ${isExpanded ? e.color : e.border}`, marginBottom: 4, cursor: 'pointer', transition: 'all 0.15s' }}>
                                <div style={{ fontSize: 12, color: e.color, flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.nombre}</div>
                                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{ag.territorio} · Acuerdo {ag.id.slice(1)}</div>
                                </div>
                                <div style={{ width: 40 }}>
                                  <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 2 }} />
                                  </div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 900, color: pctColor, minWidth: 35, textAlign: 'right' }}>{pct}%</div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>

              {/* ── Detalle expandido del acuerdo ── */}
              {expandedAcuerdo && (() => {
                const ag = agreements.find(a => a.id === expandedAcuerdo)
                if (!ag) return null
                const eje = ejes.find(e => ag.eje && ag.eje.split(',').includes(e.matchKey))
                const ejeColor = eje?.color || '#0D47A1'
                const eventos = cronograma.filter(c => c.acuerdo_id && c.acuerdo_id.split(',').includes(ag.id)).sort((a, b) => a.numero - b.numero)
                const estadoIcon = { Cumplido: '✓', 'En proceso': '→', Pendiente: '○' }
                const estadoColor = { Cumplido: '#22c55e', 'En proceso': '#1565C0', Pendiente: '#94a3b8' }
                return (
                  <div style={{ marginBottom: 24 }}>
                    {/* Connector arrow */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: -1 }}>
                      <div style={{ width: 2, height: 16, background: ejeColor, opacity: 0.3 }} />
                      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid ${ejeColor}`, opacity: 0.3 }} />
                    </div>
                    {/* AgreementCard con toda la funcionalidad */}
                    <AgreementCard ag={ag} canEdit={true} onEdit={() => {}} onAvanceAdded={loadData} isAdmin={isAdmin} />
                    {/* Cronograma del acuerdo */}
                    {eventos.length > 0 && (
                      <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${ejeColor}30`, padding: '16px 18px', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 3, height: 14, background: ejeColor, borderRadius: 2 }} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#2B2926', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Cronograma</span>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>({eventos.filter(ev => ev.estado === 'Cumplido').length}/{eventos.length} cumplidos)</span>
                        </div>
                        {eventos.map(ev => (
                          <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: `${estadoColor[ev.estado]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: estadoColor[ev.estado], fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                              {estadoIcon[ev.estado]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926', lineHeight: 1.3 }}>{ev.evento}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{ev.mes}{ev.producto ? ` · ${ev.producto}` : ''}</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: estadoColor[ev.estado], flexShrink: 0, whiteSpace: 'nowrap' }}>{ev.estado}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setExpandedAcuerdo(null)}
                      style={{ marginTop: 8, width: '100%', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      ← Cerrar detalle
                    </button>
                  </div>
                )
              })()}

              {/* Lógica del modelo */}
              <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', border: '1px solid #e8ecf0', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0D47A1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 900, flexShrink: 0 }}>+</div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  <strong style={{ color: '#2B2926' }}>Cómo se conectan los tres ejes.</strong> Eje 1 genera empleo formal para jóvenes. Eje 2 ocupa su tiempo libre con deporte y liderazgo. Eje 3 fortalece las economías locales y protege el medio ambiente. Juntos, reducen la vulnerabilidad de los territorios donde operamos. Esta es la narrativa que las gestoras territoriales deben poder explicar a comunidades, autoridades y aliados.
                </div>
              </div>

              {/* Contexto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 3, height: 14, background: '#0D47A1', borderRadius: 2 }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: '#2B2926', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Datos de contexto territorial</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 10, marginBottom: 28 }}>
                {contexto.map((c, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: '16px 14px', border: '1px solid #e8ecf0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: i === 4 ? '#10b981' : '#0D47A1' }} />
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#2B2926', letterSpacing: -1, lineHeight: 1 }}>{c.value}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Bottom banner */}
              <div style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #007A87 100%)', borderRadius: 16, padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: 'white', marginBottom: 6 }}>Referencia interna — Huella Social 2026</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Dirección de Asuntos Corporativos · Caribe LNG</div>
              </div>
            </div>
          )
        })()}

        {view === 'input' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #1976D2 100%)', borderRadius: 20, padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white' }}>Registro de Campo</h1>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Registros diarios, reportes semanales y evidencias</p>
            </div>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
              {[
                { id: 'diario', label: 'Registro Diario' },
                { id: 'semanal', label: 'Reporte Semanal' },
                { id: 'evidencias', label: 'Evidencias' },
                { id: 'alerta', label: 'Escalar Alerta' },
              ].map(t => (
                <button key={t.id} onClick={() => setInputSubTab(t.id)}
                  style={{ flex: 1, background: inputSubTab === t.id ? 'white' : 'transparent',
                    border: 'none', borderRadius: 7, padding: isMobile ? '8px 4px' : '8px 12px', fontSize: isMobile ? 12 : 14, fontWeight: 700,
                    color: inputSubTab === t.id ? C.navy : C.muted, cursor: 'pointer',
                    boxShadow: inputSubTab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── SUB-TAB: REGISTRO DIARIO ── */}
            {inputSubTab === 'diario' && (() => {
              const DailyForm = () => {
                const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
                const [territorio, setTerritorio] = useState(myTerritorio || 'Tolú')
                const [tipoReunion, setTipoReunion] = useState('Comunidad')
                const [lugarR, setLugarR] = useState('')
                const [asistentes, setAsistentes] = useState('')
                const [descripcion, setDescripcion] = useState('')
                const [file, setFile] = useState(null)
                const [preview, setPreview] = useState(null)
                const [geo, setGeo] = useState(null)
                const [geoLugar, setGeoLugar] = useState(null)
                const [saving, setSaving] = useState(false)
                const [saved, setSaved] = useState(false)
                const fileRef = useRef(null)

                const handlePhoto = (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setFile(f)
                  setPreview(URL.createObjectURL(f))
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=es&zoom=16`)
                          const data = await res.json()
                          const a = data.address || {}
                          const parts = [a.village || a.hamlet || a.neighbourhood || a.suburb, a.town || a.city || a.municipality, a.county || a.state_district, a.state].filter(Boolean)
                          setGeoLugar(parts.join(', ') || data.display_name)
                          if (!lugarR) setLugarR(parts[0] || '')
                        } catch {}
                      },
                      () => {},
                      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    )
                  }
                }

                const handleSubmit = async () => {
                  if (!descripcion.trim()) return alert('La descripción es obligatoria')
                  setSaving(true)
                  try {
                    let foto_url = null
                    if (file) foto_url = await uploadEvidenciaPhoto(file, territorio)
                    await addRegistroDiario({
                      user_id: session.user.id,
                      territorio, fecha, tipo_reunion: tipoReunion,
                      lugar: lugarR || geoLugar || null,
                      asistentes: parseInt(asistentes) || 0,
                      descripcion: descripcion.trim(),
                      foto_url, latitud: geo?.lat || null, longitud: geo?.lng || null,
                      precision_m: geo?.accuracy || null, geo_lugar: geoLugar || null
                    })
                    await loadData()
                    setSaved(true)
                    // Notificar a admins
                    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
                    if (admins?.length) {
                      sendPushNotification({
                        title: `Registro — ${territorio}`,
                        body: `${tipoReunion}: ${descripcion.trim().substring(0, 80)}`,
                        user_ids: admins.map(a => a.id)
                      }).catch(() => {})
                    }
                    setTimeout(() => {
                      setSaved(false)
                      setDescripcion(''); setLugarR(''); setAsistentes(''); setFile(null); setPreview(null); setGeo(null); setGeoLugar(null)
                    }, 2000)
                  } catch (err) { alert('Error: ' + err.message) }
                  finally { setSaving(false) }
                }

                if (saved) return (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "#dcfce7", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#10b981" }}>✓</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>Registro guardado</div>
                    <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Con trazabilidad completa</div>
                  </div>
                )

                return (
                  <div>
                    <div style={{ background: C.card, borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Fecha</label>
                          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Territorio</label>
                          <select value={territorio} onChange={e => setTerritorio(e.target.value)}
                            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                            {['Tolú', 'Barbosa'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Tipo de reunión</label>
                          <select value={tipoReunion} onChange={e => setTipoReunion(e.target.value)}
                            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 15, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                            {['Comunidad', 'Pescadores', 'JAC', 'Institucional', 'Socialización', 'Vecindad', 'Diagnóstico', 'Llamada', 'Visita', 'Otro'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Lugar / Vereda</label>
                          <input value={lugarR} onChange={e => setLugarR(e.target.value)} placeholder="Ej: Vereda El Progreso"
                            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Asistentes</label>
                          <input type="number" value={asistentes} onChange={e => setAsistentes(e.target.value)} placeholder="0"
                            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Descripción *</label>
                        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                          placeholder="¿Qué se habló? ¿Qué se acordó? ¿Hay algo que escalar?"
                          rows={3}
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 15, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                      </div>
                      {/* Foto */}
                      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                        {!preview ? (
                          <button onClick={() => fileRef.current?.click()}
                            style={{ background: `${C.accent}10`, border: `1.5px dashed ${C.accent}`, borderRadius: 10,
                              padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <span style={{ fontSize: 20 }}></span>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>Foto o subir de galería</div>
                              <div style={{ fontSize: 12, color: C.subtle }}>GPS + hora automáticos (opcional)</div>
                            </div>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                            <img src={preview} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {geo && <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>GPS {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} ±{Math.round(geo.accuracy)}m</div>}
                              {geoLugar && <div style={{ fontSize: 12, color: C.muted }}>{geoLugar}</div>}
                            </div>
                            <button onClick={() => { setFile(null); setPreview(null); setGeo(null); setGeoLugar(null) }}
                              style={{ background: '#fee2e2', color: C.red, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✕</button>
                          </div>
                        )}
                      </div>
                      <button onClick={handleSubmit} disabled={saving || !descripcion.trim()}
                        style={{ width: '100%', background: saving || !descripcion.trim() ? '#cbd5e1' : C.navy,
                          color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700,
                          cursor: saving || !descripcion.trim() ? 'not-allowed' : 'pointer' }}>
                        {saving ? 'Guardando...' : 'Guardar registro'}
                      </button>
                    </div>

                    {/* Timeline de registros recientes */}
                    {registrosDiarios.length > 0 && (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Registros recientes</div>
                        {registrosDiarios.slice(0, 15).map(r => (
                          <div key={r.id} onClick={() => setSelectedRegistro(r)}
                            style={{ background: C.card, borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start',
                            borderLeft: `3px solid ${r.territorio === 'Tolú' ? C.tolu : C.barbosa}`, cursor: 'pointer' }}>
                            {r.foto_url && <img src={r.foto_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: r.territorio === 'Tolú' ? C.tolu : C.barbosa }}>{r.territorio}</span>
                                <span style={{ fontSize: 12, color: C.subtle }}>·</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{r.tipo_reunion}</span>
                                {r.asistentes > 0 && <span style={{ fontSize: 12, color: C.subtle }}>· {r.asistentes} asistentes</span>}
                              </div>
                              <div style={{ fontSize: 13, color: C.text, marginBottom: 3, lineHeight: 1.4 }}>{r.descripcion}</div>
                              <div style={{ fontSize: 12, color: C.subtle }}>
                                {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                {r.lugar && <span> · · {r.lugar}</span>}
                                {r.geo_lugar && !r.lugar && <span> · · {r.geo_lugar}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
              return <DailyForm />
            })()}

            {/* ── SUB-TAB: REPORTE SEMANAL ── */}
            {inputSubTab === 'semanal' && (
              <InputSemanal session={session} profile={profile} territorio={myTerritorio}
                reportes={reportes} seguimiento={seguimiento} onSaved={loadData} isAdmin={isAdmin} />
            )}

            {/* ── SUB-TAB: EVIDENCIAS ── */}
            {inputSubTab === 'evidencias' && (() => {
              const EvidenciasTab = () => {
                const [file, setFile] = useState(null)
                const [preview, setPreview] = useState(null)
                const [desc, setDesc] = useState('')
                const [geo, setGeo] = useState(null)
                const [lugar, setLugar] = useState(null)
                const [captureTime, setCaptureTime] = useState(null)
                const [uploading, setUploading] = useState(false)
                const fileRef = useRef(null)

                const handleFile = (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setFile(f)
                  setPreview(URL.createObjectURL(f))
                  setCaptureTime(new Date().toISOString())
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
                        try {
                          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=es&zoom=16`)
                          const data = await res.json()
                          const a = data.address || {}
                          const parts = [a.village || a.hamlet || a.neighbourhood || a.suburb, a.town || a.city || a.municipality, a.county || a.state_district, a.state].filter(Boolean)
                          setLugar(parts.join(', ') || data.display_name)
                        } catch {}
                      },
                      () => {},
                      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    )
                  }
                }

                return (
                  <div>
                    {/* Upload card */}
                    <div style={{ background: C.card, borderRadius: 12, padding: isMobile ? 14 : 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                      {!preview ? (
                        <div onClick={() => fileRef.current?.click()}
                          style={{ border: `2px dashed ${C.accent}`, borderRadius: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: `${C.accent}08` }}>
                          <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Foto o subir de galería</div>
                          <div style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>GPS + hora + lugar automáticos</div>
                        </div>
                      ) : (
                        <div>
                          <img src={preview} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover', marginBottom: 10 }} />
                          {captureTime && (
                            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13 }}>
                              <div>— {new Date(captureTime).toLocaleString('es-CO')}</div>
                              {geo && <div>GPS {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} ±{Math.round(geo.accuracy)}m</div>}
                              {lugar && <div>· {lugar}</div>}
                            </div>
                          )}
                          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción de la evidencia *" rows={2}
                            style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 15, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setFile(null); setPreview(null); setGeo(null); setLugar(null); setCaptureTime(null) }}
                              style={{ flex: 1, background: '#f1f5f9', color: C.muted, border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={async () => {
                              if (!desc.trim() || !geo) return alert(geo ? 'Agrega una descripción' : 'Esperando GPS...')
                              setUploading(true)
                              try {
                                const foto_url = await uploadEvidenciaPhoto(file, myTerritorio)
                                await addEvidencia({ user_id: session.user.id, territorio: myTerritorio || 'Nacional', foto_url, latitud: geo.lat, longitud: geo.lng, precision_m: geo.accuracy, descripcion: desc.trim(), capturada_at: captureTime, lugar })
                                await loadData()
                                setFile(null); setPreview(null); setDesc(''); setGeo(null); setLugar(null); setCaptureTime(null)
                              } catch (err) { alert('Error: ' + err.message) }
                              finally { setUploading(false) }
                            }}
                              disabled={uploading || !desc.trim()}
                              style={{ flex: 2, background: uploading || !desc.trim() ? '#cbd5e1' : C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer' }}>
                              {uploading ? 'Subiendo...' : geo ? 'Guardar' : 'Guardar sin GPS'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Gallery */}
                    {evidencias.filter(e => isAdmin ? true : (myTerritorio ? e.territorio === myTerritorio : true)).length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evidencias recientes</div>
                          {isAdmin && (
                            <a href="https://course2-my.sharepoint.com/:f:/g/personal/diana_silva_caribelng_com/IgDgdg9A2N02R7E_pwEiOOC6AcGvXQw6p7KVALqIFdDhUPo?e=BCkAgB"
                              target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 12, fontWeight: 700, color: C.navy, background: '#EEF2FF', border: `1px solid ${C.navy}`,
                                borderRadius: 6, padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                              Ver en OneDrive →
                            </a>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                          {evidencias.filter(e => isAdmin ? true : (myTerritorio ? e.territorio === myTerritorio : true)).slice(0, 20).map(ev => (
                            <div key={ev.id} onClick={() => setSelectedEvidencia(ev)}
                              style={{ background: C.card, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                              <img src={ev.foto_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                              <div style={{ padding: '10px 12px' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{ev.descripcion}</div>
                                <div style={{ fontSize: 12, color: C.subtle }}>— {new Date(ev.capturada_at).toLocaleString('es-CO')}</div>
                                {ev.lugar && <div style={{ fontSize: 12, color: C.accent }}>· {ev.lugar}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
              return <EvidenciasTab />
            })()}

            {inputSubTab === 'alerta' && (
              <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Escalar alerta a Dirección</div>
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
                        ● {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Mensaje *</label>
                  <textarea value={alertaMensaje} onChange={e => setAlertaMensaje(e.target.value)} rows={5}
                    placeholder="Describe la situación: qué pasó, quiénes están involucrados, qué necesitas de dirección..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #fecdd3',
                      fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                {alertaEnviada && (
                  <div style={{ background: '#dcfce7', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 14, color: '#166534', fontWeight: 600 }}>
                    Alerta enviada correctamente
                  </div>
                )}
                <button onClick={async () => {
                  if (!alertaMensaje.trim()) return
                  try {
                    await sendAlerta({ gestora: profile?.full_name || session?.user?.email, territorio: myTerritorio || 'Nacional', mensaje: alertaMensaje, urgencia: alertaUrgencia })
                    setAlertaMensaje('')
                    setAlertaEnviada(true)
                    setTimeout(() => setAlertaEnviada(false), 4000)
                    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
                    if (admins?.length) sendPushNotification({ title: `Alerta ${alertaUrgencia} — ${myTerritorio || 'Nacional'}`, body: `${profile?.full_name || 'Gestora'}: ${alertaMensaje.substring(0, 100)}`, user_ids: admins.map(a => a.id) }).catch(() => {})
                  } catch(e) { alert('Error enviando alerta: ' + e.message) }
                }} disabled={!alertaMensaje.trim()}
                  style={{ width: '100%', background: !alertaMensaje.trim() ? '#f1f5f9' : C.red,
                    color: !alertaMensaje.trim() ? C.muted : 'white',
                    border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700,
                    cursor: !alertaMensaje.trim() ? 'not-allowed' : 'pointer' }}>
                  Enviar alerta
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'kpis' && (
          <KPIsView reportes={reportes} seguimiento={seguimiento}
            isAdmin={isAdmin} onDeleted={loadData} agreements={agreements}
            kpisDac={kpisDac} onKpiDacSaved={loadData} actors={actors}
            registrosDiarios={registrosDiarios} evidencias={evidencias}
            allInteractions={allInteractions} cronograma={cronograma} />
        )}

        {view === 'riesgos' && (
          <RiesgosView riesgos={riesgos} riesgosLeg={riesgosLeg} cronoLeg={cronoLeg}
            isAdmin={isAdmin} onDeleted={loadData} />
        )}

        {view === 'knowledge' && isAdmin && (
          <KnowledgeBaseView docs={knowledgeBase} onReload={loadData} isMobile={isMobile} />
        )}

        {view === 'dac' && isAdmin && (() => {
          const CT = '#0ea5e9', CB = '#00BFB3'
          const urgColor = { Alta: '#ef4444', Media: '#f97316', Baja: '#eab308' }
          const urgBg   = { Alta: '#fee2e2', Media: '#fff7ed', Baja: '#fefce8' }
          const pendientes = alertasRecibidas.filter(a => !a.leida)
          const leidas     = alertasRecibidas.filter(a => a.leida)
          const rdT = registrosDiarios.filter(r => r.territorio === 'Tolú')
          const rdB = registrosDiarios.filter(r => r.territorio === 'Barbosa')
          const evT = evidencias.filter(e => e.territorio === 'Tolú')
          const evB = evidencias.filter(e => e.territorio === 'Barbosa')
          const repT = reportes.filter(r => r.territorio === 'Tolú')
          const repB = reportes.filter(r => r.territorio === 'Barbosa')
          const TerritoryCard = ({ nombre, color, rd, ev, rep }) => (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: color, borderRadius: '12px 12px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: 'white', fontWeight: 900, fontSize: 16, letterSpacing: -0.3 }}>{nombre}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { v: rd.length, l: 'registros' },
                    { v: ev.length, l: 'evidencias' },
                    { v: rep.length, l: 'reportes' },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ border: `1.5px solid ${color}22`, borderTop: 'none', borderRadius: '0 0 12px 12px', background: 'white', padding: 14 }}>
                {/* Evidencias grid */}
                {ev.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Evidencias recientes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {ev.slice(0, 6).map(e => (
                        <div key={e.id} style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '1', position: 'relative', cursor: 'pointer' }}
                          onClick={() => window.open(e.foto_url, '_blank')}>
                          <img src={e.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {e.lugar && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '12px 4px 4px', fontSize: 9, color: 'white', lineHeight: 1.2 }}>{e.lugar.split(',')[0]}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Registros recientes */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Registros recientes</div>
                  {rd.length === 0 ? (
                    <div style={{ fontSize: 13, color: C.subtle, textAlign: 'center', padding: '12px 0' }}>Sin registros</div>
                  ) : rd.slice(0, 4).map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle, minWidth: 36, flexShrink: 0, paddingTop: 2 }}>
                        {new Date(r.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {r.actividad && <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.actividad}</div>}
                        {r.descripcion && <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descripcion}</div>}
                        {r.gestora_nombre && <div style={{ fontSize: 11, color: C.subtle }}>— {r.gestora_nombre}</div>}
                      </div>
                      {r.tiene_incidente && <div style={{ fontSize: 10, background: '#fee2e2', color: '#ef4444', borderRadius: 4, padding: '2px 5px', fontWeight: 700, flexShrink: 0 }}>!</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
          return (
            <div style={{ maxWidth: 1140, margin: '0 auto', padding: isMobile ? '16px 8px' : '24px 16px' }}>
              {/* Header */}
              <div style={{ background: `linear-gradient(135deg, #0a2d5e 0%, ${C.navy} 40%, ${C.blue} 100%)`, borderRadius: 16, padding: '24px 28px', marginBottom: 20, color: 'white', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -20, top: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', right: 40, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Dirección de Asuntos Corporativos</div>
                <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, marginBottom: 18 }}>Mesa de Dirección</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Alertas pendientes', val: pendientes.length, color: pendientes.length > 0 ? '#fca5a5' : '#86efac', bg: pendientes.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)' },
                    { label: 'Registros campo', val: registrosDiarios.length, color: 'white', bg: 'rgba(255,255,255,0.1)' },
                    { label: 'Evidencias', val: evidencias.length, color: 'white', bg: 'rgba(255,255,255,0.1)' },
                    { label: 'Reportes', val: reportes.length, color: 'white', bg: 'rgba(255,255,255,0.1)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '10px 18px', minWidth: 90 }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertas */}
              <div style={{ background: pendientes.length > 0 ? '#fff5f5' : C.card, border: pendientes.length > 0 ? '1.5px solid #fecaca' : `1px solid ${C.border}`, borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: pendientes.length > 0 ? '#ef4444' : C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pendientes.length > 0 ? '⚠️' : '✅'} Alertas de gestoras
                    {pendientes.length > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: 10, padding: '1px 8px', fontSize: 12 }}>{pendientes.length}</span>}
                  </div>
                  <button onClick={async () => { const al = await getAlertas(); setAlertasRecibidas(al) }}
                    style={{ background: '#f1f5f9', color: C.muted, border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Actualizar
                  </button>
                </div>
                {alertasRecibidas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: C.subtle, fontSize: 14 }}>Sin alertas por el momento</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pendientes.map(a => (
                      <div key={a.id} style={{ background: urgBg[a.urgencia] || '#f8fafc', border: `1.5px solid ${urgColor[a.urgencia] || C.border}`, borderRadius: 12, padding: '14px 16px' }}>
                        {/* Cabecera */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgColor[a.urgencia] || C.muted, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: urgColor[a.urgencia] || C.text, textTransform: 'uppercase' }}>{a.urgencia}</span>
                          <span style={{ fontSize: 12, color: C.muted }}>·</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{a.gestora}</span>
                          <span style={{ fontSize: 12, color: C.subtle, background: '#e2e8f0', padding: '1px 7px', borderRadius: 6 }}>{a.territorio}</span>
                          <span style={{ fontSize: 11, color: C.subtle, marginLeft: 'auto' }}>{new Date(a.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {/* Mensaje */}
                        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>{a.mensaje}</div>
                        {/* Formulario de resolución */}
                        {alertaResolviendo === a.id ? (
                          <div style={{ background: 'white', borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Nota de cierre (opcional)</div>
                            <textarea value={alertaResolucionTexto} onChange={e => setAlertaResolucionTexto(e.target.value)}
                              placeholder="Describe cómo se resolvió o por qué no se pudo resolver…"
                              rows={3} style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none', marginBottom: 8 }} />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={async () => {
                                try {
                                  await resolverAlerta(a.id, 'solucionado', alertaResolucionTexto)
                                  setAlertaResolviendo(null); setAlertaResolucionTexto('')
                                  setAlertasRecibidas(await getAlertas())
                                } catch(e) { alert('Error: ' + e.message) }
                              }} style={{ flex: 1, background: '#22c55e', color: 'white', border: 'none', borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                ✓ Solucionado
                              </button>
                              <button onClick={async () => {
                                try {
                                  await resolverAlerta(a.id, 'no_solucionado', alertaResolucionTexto)
                                  setAlertaResolviendo(null); setAlertaResolucionTexto('')
                                  setAlertasRecibidas(await getAlertas())
                                } catch(e) { alert('Error: ' + e.message) }
                              }} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', borderRadius: 7, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                ✗ No solucionado
                              </button>
                              <button onClick={() => { setAlertaResolviendo(null); setAlertaResolucionTexto('') }}
                                style={{ background: '#f1f5f9', color: C.muted, border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAlertaResolviendo(a.id); setAlertaResolucionTexto('') }}
                            style={{ background: 'white', border: `1.5px solid ${urgColor[a.urgencia] || C.border}`, color: urgColor[a.urgencia] || C.muted, borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            Resolver alerta
                          </button>
                        )}
                      </div>
                    ))}
                    {/* Alertas resueltas */}
                    {leidas.length > 0 && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{ fontSize: 13, color: C.subtle, cursor: 'pointer', padding: '4px 0' }}>{leidas.length} alertas cerradas</summary>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          {leidas.map(a => {
                            const esSolucionada = a.estado === 'solucionado'
                            const esNoSolucionada = a.estado === 'no_solucionado'
                            return (
                              <div key={a.id} style={{ background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase' }}>{a.urgencia}</span>
                                  <span style={{ fontSize: 12, color: C.muted }}>·</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.gestora}</span>
                                  <span style={{ fontSize: 12, color: C.subtle, background: '#e2e8f0', padding: '1px 7px', borderRadius: 6 }}>{a.territorio}</span>
                                  {esSolucionada && <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>✓ Solucionado</span>}
                                  {esNoSolucionada && <span style={{ background: '#fee2e2', color: '#ef4444', borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>✗ No solucionado</span>}
                                  <span style={{ fontSize: 11, color: C.subtle, marginLeft: 'auto' }}>{new Date(a.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div style={{ fontSize: 13, color: C.muted, marginBottom: a.resolucion ? 6 : 0 }}>{a.mensaje}</div>
                                {a.resolucion && <div style={{ fontSize: 12, color: C.text, background: 'white', borderRadius: 6, padding: '6px 10px', borderLeft: `3px solid ${esSolucionada ? '#22c55e' : '#ef4444'}` }}>{a.resolucion}</div>}
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>

              {/* Territorios: dos columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <TerritoryCard nombre="Tolú" color={CT} rd={rdT} ev={evT} rep={repT} />
                <TerritoryCard nombre="Barbosa" color={CB} rd={rdB} ev={evB} rep={repB} />
              </div>

              {/* Reportes semanales — colapsable */}
              <details style={{ background: C.card, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <summary style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, listStyle: 'none' }}>
                  <span style={{ flex: 1 }}>Reportes Semanales</span>
                  <span style={{ background: C.navy, color: 'white', borderRadius: 8, padding: '1px 9px', fontSize: 12 }}>{reportes.length}</span>
                </summary>
                <div style={{ padding: '0 20px 20px' }}>
                  {reportes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: C.subtle, fontSize: 14 }}>Sin reportes registrados</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['Semana', 'Gestora', 'Territorio', 'Actores', 'Reuniones', 'Incidentes', 'PQRS', 'Novedades'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportes.slice(0, 30).map((r, i) => (
                            <tr key={r.id} style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ padding: '8px 10px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{r.semana}</td>
                              <td style={{ padding: '8px 10px', color: C.text }}>{r.gestora_nombre || r.gestora || '—'}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{ background: r.territorio === 'Tolú' ? `${CT}22` : `${CB}22`, color: r.territorio === 'Tolú' ? CT : CB, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{r.territorio}</span>
                              </td>
                              <td style={{ padding: '8px 10px', color: C.text, textAlign: 'center' }}>{r.actores_gestionados ?? '—'}</td>
                              <td style={{ padding: '8px 10px', color: C.text, textAlign: 'center' }}>{r.reuniones ?? '—'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}><span style={{ color: (r.incidentes || 0) > 0 ? '#ef4444' : C.subtle, fontWeight: (r.incidentes || 0) > 0 ? 700 : 400 }}>{r.incidentes ?? 0}</span></td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}><span style={{ color: (r.pqrs_pendientes || 0) > 0 ? '#f97316' : C.subtle, fontWeight: (r.pqrs_pendientes || 0) > 0 ? 700 : 400 }}>{r.pqrs_pendientes ?? 0}</span></td>
                              <td style={{ padding: '8px 10px', color: C.muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.novedades || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )
        })()}

        {view === 'gestora' && (
          <div>
            {/* Hero header by territory */}
            {(() => {
              const isTolu = myTerritorio === 'Tolú'
              const isBarbosa = myTerritorio === 'Barbosa'
              const heroGrad = isTolu
                ? 'linear-gradient(135deg, #004d5a 0%, #007A87 40%, #0891b2 100%)'
                : isBarbosa
                ? 'linear-gradient(135deg, #064e3b 0%, #059669 40%, #34d399 100%)'
                : `linear-gradient(135deg, #0D47A1 0%, #1a3d7a 60%, #1565C0 100%)`
              const heroSub = isTolu ? 'Terminal marítima · Sucre · Costa Caribe'
                : isBarbosa ? 'Planta de regasificación · Antioquia · Magdalena Medio'
                : 'Todos los territorios'
              const actoresT = actors.filter(a => myTerritorio ? a.territorio === myTerritorio : true)
              const rojos = actoresT.filter(a => a.semaforo === 'rojo' || a.semaforo === 'naranja').length
              const verdes = actoresT.filter(a => a.semaforo === 'verde').length
              return (
                <div style={{ background: heroGrad, borderRadius: 20, padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                  {/* Decorative circles */}
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 100, marginBottom: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' }}>En campo</span>
                        </div>
                        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white' }}>
                          {myTerritorio || 'Mi Territorio'}
                        </h1>
                        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                          {profile?.full_name} · {heroSub}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setShowGuia(true)}
                          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                            padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <IconBook size={13} /> Guía
                        </button>
                        <button onClick={async () => {
                          if (!('Notification' in window)) return alert('Tu navegador no soporta notificaciones')
                          const perm = await Notification.requestPermission()
                          if (perm === 'granted') {
                            await subscribeToPush(session.user.id)
                            new Notification('Caribe LNG Conecta', { body: 'Notificaciones activadas', icon: '/logo-simbolo.svg' })
                          } else { alert('Permiso denegado') }
                        }}
                          style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
                            padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <IconBell size={13} />
                        </button>
                      </div>
                    </div>
                    {/* Quick stats */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 16px', flex: 1 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{actoresT.length}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actores</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 16px', flex: 1 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: rojos > 0 ? '#fbbf24' : '#34d399' }}>{rojos}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Atención hoy</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 16px', flex: 1 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#34d399' }}>{verdes}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estables</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ── Modal Guía Gestora ── */}
            {showGuia && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={(e) => { if (e.target === e.currentTarget) setShowGuia(false) }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520,
                  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.navy }}>Guía de la Gestora</h2>
                    <button onClick={() => setShowGuia(false)}
                      style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
                  </div>

                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>

                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                      <div style={{ fontWeight: 800, color: C.navy, marginBottom: 4 }}>Tu rol en Conecta</div>
                      Eres los ojos y oídos del proyecto en el territorio. Todo lo que registras aquí construye la trazabilidad que necesita Caribe LNG para demostrar su compromiso con las comunidades.
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 8 }}>Lo que DEBES hacer cada día</div>

                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${C.green}` }}>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>1. Registrar cada reunión o visita</div>
                      Gestión → Registro de Campo → <strong>Registro Diario</strong><br/>
                      Llena: fecha, tipo de reunión, lugar, asistentes, qué se habló y qué se acordó. Toma foto si puedes — queda con GPS y hora automáticos.
                    </div>

                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${C.green}` }}>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>2. Registrar novedades con actores</div>
                      Ve a <strong>Actores</strong> → toca el actor → tab <strong>Relacionamiento</strong><br/>
                      Registra: qué tipo de contacto fue (visita, llamada, reunión), qué pasó, y actualiza el semáforo si cambió la relación.
                    </div>

                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${C.green}` }}>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: 4 }}>3. Subir evidencias fotográficas</div>
                      Gestión → Registro de Campo → <strong>Evidencias</strong><br/>
                      Toma la foto directo desde la app. Se guarda con ubicación GPS exacta, hora y nombre del lugar. Esto es tu respaldo forense.
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 8, marginTop: 16 }}>Lo que DEBES hacer cada viernes</div>

                    <div style={{ background: '#fffbeb', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: '3px solid #f59e0b' }}>
                      <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 4 }}>4. Enviar el Reporte Semanal</div>
                      Gestión → Registro de Campo → <strong>Reporte Semanal</strong><br/>
                      Llena todos los indicadores de la semana: acuerdos, compromisos, eventos, quejas (PQRS), incidentes, logros, dificultades y prioridades de la próxima semana.
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 8, marginTop: 16 }}>Lo que PUEDES hacer</div>

                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${C.accent}` }}>
                      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>5. Editar información de actores</div>
                      Actores → toca el actor → tab <strong>Editar</strong><br/>
                      Puedes proponer cambios a cualquier campo. Tus cambios quedan <strong>pendientes</strong> hasta que la directora DAC los apruebe.
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${C.accent}` }}>
                      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>6. Actualizar datos personales de actores</div>
                      Actores → toca el actor → tab <strong>Datos Personales</strong><br/>
                      Cumpleaños, familia, intereses, fechas importantes. Esto alimenta los recordatorios en "Mi Territorio" para que nunca se te pase una fecha clave.
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: `3px solid ${C.accent}` }}>
                      <div style={{ fontWeight: 700, color: C.navy, marginBottom: 4 }}>7. Enviar alertas urgentes al DAC</div>
                      Dentro del Reporte Semanal hay un botón de <strong>alerta rápida</strong>. Úsalo si hay algo que no puede esperar al viernes: incidente, bloqueo, queja grave.
                    </div>

                    <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 8, marginTop: 16 }}>Checklist diario</div>

                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                      {[
                        'Revisar "Mi Territorio" — ver qué actores necesitan atención',
                        'Después de cada reunión → Registro Diario + foto',
                        'Después de contactar un actor → Registrar novedad',
                        'Si hay fecha importante esta semana → llamar o visitar',
                        'Viernes → Enviar Reporte Semanal completo',
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < 4 ? 8 : 0 }}>
                          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>☐</span>
                          <span style={{ fontSize: 13, color: C.text }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: '#fef2f2', borderRadius: 10, padding: 14, marginTop: 16, borderLeft: `3px solid ${C.red}` }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Recuerda</div>
                      Todo lo que registras es evidencia oficial del proyecto. Sé precisa en las descripciones, toma fotos siempre que puedas, y no dejes pasar reuniones sin registrar. Tu trabajo en campo es lo que sostiene la trazabilidad de Caribe LNG.
                    </div>
                  </div>

                  <button onClick={() => setShowGuia(false)}
                    style={{ width: '100%', marginTop: 20, background: C.navy, color: 'white', border: 'none',
                      borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                    Entendido
                  </button>
                </div>
              </div>
            )}
            {/* ── Contenido por territorio ── */}
            {(() => {
              const territorios = myTerritorio ? [myTerritorio] : ['Tolú', 'Barbosa']
              const tColors = { 'Tolú': { accent: '#007A87', border: '#99d5db', bg: '#f0fafa' }, 'Barbosa': { accent: '#00BFB3', border: '#99e6e0', bg: '#f0fdfb' } }
              const renderTerritorioCol = (terr) => {
                const tc = tColors[terr] || tColors['Tolú']
                const terrAgreements = agreements.filter(ag => ag.territorio === terr)
                const terrActors = actors.filter(a => a.territorio === terr)
                const rojos = terrActors.filter(a => a.semaforo === 'rojo' || a.semaforo === 'naranja')
                return (
                  <div key={terr}>
                    {/* Territory label */}
                    <div style={{ background: tc.accent, borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: 0.5 }}>{terr}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 'auto' }}>{terr === 'Tolú' ? 'Terminal marítima · Sucre' : 'Planta regasificación · Antioquia'}</span>
                    </div>
                    {/* Acuerdos */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 3, height: 14, background: tc.accent, borderRadius: 2 }} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#2B2926', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Acuerdos</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {terrAgreements.map(ag => (
                          <AgreementCard key={ag.id} ag={ag} canEdit={true} onEdit={() => {}} onAvanceAdded={loadData} isAdmin={isAdmin} />
                        ))}
                      </div>
                    </div>
                    {/* Requieren atención */}
                    <div style={{ background: 'white', borderRadius: 14, padding: '14px 14px', border: '1px solid #e8ecf0', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 3, height: 14, background: '#ef4444', borderRadius: 2 }} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#2B2926', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Requieren atención</span>
                      </div>
                      {rojos.length === 0
                        ? <div style={{ padding: 10, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>Sin actores en atención urgente</div>
                        : rojos.slice(0, 5).map(a => (
                          <div key={a.id} onClick={() => setSelectedActor(a)}
                            style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', marginBottom: 4, borderRadius: 8, cursor: 'pointer', background: '#f8fafc', border: '1px solid #e8ecf0' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.semaforo === 'rojo' ? '#ef4444' : '#f97316', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>{a.tipo}</div>
                            </div>
                            <span style={{ fontSize: 13, color: '#cbd5e1' }}>›</span>
                          </div>
                        ))
                      }
                    </div>
                    {/* Próximas fechas */}
                    <div style={{ background: 'white', borderRadius: 14, padding: '14px 14px', border: '1px solid #e8ecf0', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 3, height: 14, background: '#f59e0b', borderRadius: 2 }} />
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#2B2926', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Próximas fechas</span>
                      </div>
                      {(() => {
                        const today = new Date()
                        const items = []
                        terrActors.filter(a => a.cumpleanos).forEach(a => {
                          const d = new Date(a.cumpleanos)
                          const next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
                          if (next < today) next.setFullYear(today.getFullYear() + 1)
                          const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
                          if (diff <= 30) items.push({ actorId: a.id, actor: a, diff, descripcion: 'Cumpleaños', dateStr: d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) })
                        })
                        terrActors.forEach(a => {
                          if (!Array.isArray(a.fechas_importantes)) return
                          a.fechas_importantes.forEach((fi, idx) => {
                            if (!fi.fecha) return
                            const [mm, dd] = fi.fecha.split('-').map(Number)
                            if (!mm || !dd) return
                            const next = new Date(today.getFullYear(), mm - 1, dd)
                            if (next < today) next.setFullYear(today.getFullYear() + 1)
                            const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
                            const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
                            if (diff <= 30) items.push({ actorId: a.id + '-' + idx, actor: a, diff, descripcion: fi.descripcion, dateStr: `${dd} de ${meses[mm - 1]}` })
                          })
                        })
                        items.sort((a, b) => a.diff - b.diff)
                        if (!items.length) return <div style={{ fontSize: 12, color: C.subtle, fontStyle: 'italic' }}>Sin fechas en los próximos 30 días.</div>
                        return items.slice(0, 5).map(item => (
                          <div key={item.actorId} onClick={() => setSelectedActor(item.actor)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.actor.nombre}</div>
                              <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{item.descripcion}</div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: item.diff <= 7 ? C.red : C.orange, flexShrink: 0, marginLeft: 8 }}>
                              {item.diff === 0 ? '¡Hoy!' : `${item.diff}d`}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )
              }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: !myTerritorio && !isMobile ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 12 }}>
                  {territorios.map(t => renderTerritorioCol(t))}
                </div>
              )
            })()}
            {/* ── Captura de Evidencia ── */}
            {(() => {
              const isTolu = myTerritorio === 'Tolú'
              const btnGrad = isTolu
                ? 'linear-gradient(135deg, #004d5a, #0891b2)'
                : myTerritorio === 'Barbosa'
                ? 'linear-gradient(135deg, #064e3b, #059669)'
                : `linear-gradient(135deg, #0D47A1, #1565C0)`
              return (
                <div onClick={() => setShowEvidenciaCapture(true)}
                  style={{ background: btnGrad, borderRadius: 14, padding: '18px 20px', marginBottom: 12,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconCamera size={22} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Capturar Evidencia</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Foto con GPS y hora exacta</div>
                  </div>
                </div>
              )
            })()}

            {/* ── Modal captura ── */}
            {showEvidenciaCapture && (() => {
              const CaptureForm = () => {
                const [file, setFile] = useState(null)
                const [preview, setPreview] = useState(null)
                const [desc, setDesc] = useState('')
                const [geo, setGeo] = useState(null)
                const [geoError, setGeoError] = useState(null)
                const [lugar, setLugar] = useState(null)
                const [captureTime, setCaptureTime] = useState(null)
                const [uploading, setUploading] = useState(false)
                const fileRef = useRef(null)

                const reverseGeocode = async (lat, lng) => {
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es&zoom=16`)
                    const data = await res.json()
                    const a = data.address || {}
                    const parts = [a.village || a.hamlet || a.neighbourhood || a.suburb, a.town || a.city || a.municipality, a.county || a.state_district, a.state].filter(Boolean)
                    setLugar(parts.join(', ') || data.display_name || 'Ubicación desconocida')
                  } catch { setLugar(null) }
                }

                const handleFile = (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setFile(f)
                  setPreview(URL.createObjectURL(f))
                  setCaptureTime(new Date().toISOString())
                  // Capturar GPS inmediatamente
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
                        reverseGeocode(pos.coords.latitude, pos.coords.longitude)
                      },
                      (err) => setGeoError('No se pudo obtener ubicación: ' + err.message),
                      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    )
                  } else {
                    setGeoError('Geolocalización no disponible en este dispositivo')
                  }
                }

                const handleSubmit = async () => {
                  if (!file || !desc.trim() || !geo) return
                  setUploading(true)
                  try {
                    const foto_url = await uploadEvidenciaPhoto(file, myTerritorio)
                    await addEvidencia({
                      user_id: session.user.id,
                      territorio: myTerritorio || 'Nacional',
                      foto_url,
                      latitud: geo.lat,
                      longitud: geo.lng,
                      precision_m: geo.accuracy,
                      descripcion: desc.trim(),
                      capturada_at: captureTime,
                      lugar: lugar || null
                    })
                    await loadData()
                    setFile(null); setPreview(null); setDesc(''); setGeo(null); setLugar(null); setCaptureTime(null)
                    setShowEvidenciaCapture(false)
                  } catch (err) {
                    alert('Error subiendo evidencia: ' + err.message)
                  } finally { setUploading(false) }
                }

                return (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowEvidenciaCapture(false) }}>
                    <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480,
                      maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>Capturar Evidencia</h3>
                        <button onClick={() => setShowEvidenciaCapture(false)}
                          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
                      </div>

                      {/* Botón cámara */}
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
                        style={{ display: 'none' }} />
                      {!preview ? (
                        <div onClick={() => fileRef.current?.click()}
                          style={{ border: `2px dashed ${C.accent}`, borderRadius: 12, padding: '32px 16px',
                            textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: `${C.accent}08` }}>
                          <div style={{ fontSize: 40, marginBottom: 8 }}></div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Foto o subir de galería</div>
                          <div style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>Se capturará ubicación GPS y hora automáticamente</div>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 16 }}>
                          <img src={preview} alt="Evidencia" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
                          <button onClick={() => { setFile(null); setPreview(null); setGeo(null); setCaptureTime(null) }}
                            style={{ background: '#fee2e2', color: C.red, border: 'none', borderRadius: 6,
                              padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
                            Volver a tomar
                          </button>
                        </div>
                      )}

                      {/* Metadata GPS + hora */}
                      {captureTime && (
                        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, color: C.text }}>— Hora:</span>
                            <span style={{ color: C.muted }}>{new Date(captureTime).toLocaleString('es-CO')}</span>
                          </div>
                          {geo ? (
                            <>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, color: C.text }}>GPS GPS:</span>
                                <span style={{ color: C.muted }}>{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, color: C.text }}>Precisión:</span>
                                <span style={{ color: geo.accuracy > 50 ? C.orange : C.green, fontWeight: 600 }}>
                                  ±{Math.round(geo.accuracy)}m {geo.accuracy > 50 ? '(baja)' : '(buena)'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontWeight: 700, color: C.text }}>· Lugar:</span>
                                <span style={{ color: C.muted }}>{lugar || 'Resolviendo...'}</span>
                              </div>
                            </>
                          ) : geoError ? (
                            <div style={{ color: C.red, fontWeight: 600 }}>{geoError}</div>
                          ) : (
                            <div style={{ color: C.accent }}>📡 Obteniendo ubicación...</div>
                          )}
                        </div>
                      )}

                      {/* Descripción */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Descripción de la evidencia *</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)}
                          placeholder="Ej: Acta de reunión con JAC vereda El Progreso, firma de acuerdo de socialización"
                          rows={3}
                          style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px',
                            fontSize: 15, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                      </div>

                      {/* Territorio */}
                      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                        Territorio: <strong style={{ color: C.text }}>{myTerritorio || 'Nacional'}</strong>
                      </div>

                      {/* Enviar */}
                      <button onClick={handleSubmit}
                        disabled={!file || !desc.trim() || !geo || uploading}
                        style={{ width: '100%', background: (!file || !desc.trim() || !geo || uploading) ? '#cbd5e1' : C.navy,
                          color: 'white', border: 'none', borderRadius: 10, padding: '12px 20px',
                          fontSize: 15, fontWeight: 700, cursor: (!file || !desc.trim() || !geo || uploading) ? 'not-allowed' : 'pointer' }}>
                        {uploading ? 'Subiendo...' : 'Guardar evidencia'}
                      </button>
                    </div>
                  </div>
                )
              }
              return <CaptureForm />
            })()}

            {/* ── Galería de evidencias recientes ── */}
            {evidencias.filter(e => isAdmin ? true : (myTerritorio ? e.territorio === myTerritorio : true)).length > 0 && (
              <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Evidencias recientes</h3>
                {evidencias.filter(e => isAdmin ? true : (myTerritorio ? e.territorio === myTerritorio : true)).slice(0, 10).map(ev => (
                  <div key={ev.id} onClick={() => setSelectedEvidencia(ev)}
                    style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start', cursor: 'pointer' }}>
                    <img src={ev.foto_url} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{ev.descripcion}</div>
                      <div style={{ fontSize: 12, color: C.subtle }}>
                        — {new Date(ev.capturada_at).toLocaleString('es-CO')}
                      </div>
                      {ev.lugar && <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>· {ev.lugar}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 16, color: C.subtle, textAlign: 'center' }}>
              Abre cualquier actor desde "Actores" para registrar novedades en tiempo real.
            </p>
          </div>
        )}

        {/* Footer con olas animadas */}
        <div style={{ marginTop: 60, position: 'relative', height: 100, overflow: 'hidden' }}>
          <svg className="clng-wave-1" viewBox="0 0 2400 80" preserveAspectRatio="none"
               style={{ position: 'absolute', bottom: 20, left: 0, width: '200%', height: 80 }}>
            <path d="M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 C1400,80 1600,0 1800,40 C2000,80 2200,0 2400,40 L2400,80 L0,80 Z"
                  fill={`${C.blue}15`} />
          </svg>
          <svg className="clng-wave-2" viewBox="0 0 2400 80" preserveAspectRatio="none"
               style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height: 80 }}>
            <path d="M0,50 C150,70 350,20 600,50 C850,80 1050,20 1200,50 C1350,70 1550,20 1800,50 C2050,80 2250,20 2400,50 L2400,80 L0,80 Z"
                  fill={`${C.barbosa}14`} />
          </svg>
          <svg className="clng-wave-1" viewBox="0 0 2400 60" preserveAspectRatio="none"
               style={{ position: 'absolute', bottom: 10, left: 0, width: '200%', height: 60, animationDuration: '12s' }}>
            <path d="M0,30 C300,50 500,10 800,30 C1100,50 1300,10 1600,30 C1900,50 2100,10 2400,30 L2400,60 L0,60 Z"
                  fill={`${C.navy}08`} />
          </svg>
          <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <img src="/logo-conecta.svg" alt="Caribe LNG Conecta" className="clng-footer-logo" style={{ height: 32 }} />
            <span style={{ fontSize: 9, color: C.muted, fontWeight: 500, letterSpacing: 1 }}>
              Plan de Gestion Social 2026
            </span>
          </div>
        </div>
      </main>

      {/* ── Registro de Campo Detail Modal ── */}
      {selectedRegistro && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedRegistro(null) }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ background: selectedRegistro.territorio === 'Tolú'
              ? 'linear-gradient(135deg, #004d5a, #007A87)' : 'linear-gradient(135deg, #064e3b, #059669)',
              padding: '16px 20px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Registro de Campo
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginTop: 2 }}>
                  {selectedRegistro.territorio}
                </div>
              </div>
              <button onClick={() => setSelectedRegistro(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32,
                  fontSize: 18, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {/* Foto si existe */}
            {selectedRegistro.foto_url && (
              <a href={selectedRegistro.foto_url} target="_blank" rel="noopener noreferrer">
                <img src={selectedRegistro.foto_url} alt=""
                  style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
              </a>
            )}
            {/* Detalle */}
            <div style={{ padding: 20 }}>
              {selectedRegistro.actividad && (
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>{selectedRegistro.actividad}</div>
              )}
              {selectedRegistro.descripcion && (
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 16,
                  background: '#f8fafc', borderRadius: 8, padding: 12 }}>{selectedRegistro.descripcion}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedRegistro.tipo_reunion && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 90, flexShrink: 0 }}>Tipo</span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{selectedRegistro.tipo_reunion}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 90, flexShrink: 0 }}>Fecha</span>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                    {new Date(selectedRegistro.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                {selectedRegistro.asistentes > 0 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 90, flexShrink: 0 }}>Asistentes</span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{selectedRegistro.asistentes}</span>
                  </div>
                )}
                {(selectedRegistro.lugar || selectedRegistro.geo_lugar) && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 90, flexShrink: 0 }}>Lugar</span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{selectedRegistro.lugar || selectedRegistro.geo_lugar}</span>
                  </div>
                )}
                {selectedRegistro.gestora_nombre && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 90, flexShrink: 0 }}>Gestora</span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{selectedRegistro.gestora_nombre}</span>
                  </div>
                )}
                {selectedRegistro.tiene_incidente && (
                  <div style={{ background: '#fee2e2', color: C.red, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                    ⚠️ Este registro incluye un incidente
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Evidencia Detail Modal ── */}
      {selectedEvidencia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEvidencia(null) }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>Evidencia</div>
              <button onClick={() => setSelectedEvidencia(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            {/* Imagen */}
            <a href={selectedEvidencia.foto_url} target="_blank" rel="noopener noreferrer">
              <img src={selectedEvidencia.foto_url} alt=""
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
            </a>
            {/* Detalle */}
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16, lineHeight: 1.5 }}>
                {selectedEvidencia.descripcion}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 80, flexShrink: 0 }}>Fecha</span>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                    {new Date(selectedEvidencia.capturada_at).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}
                  </span>
                </div>
                {selectedEvidencia.lugar && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: C.muted, width: 80, flexShrink: 0 }}>Lugar</span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{selectedEvidencia.lugar}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 80, flexShrink: 0 }}>Territorio</span>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{selectedEvidencia.territorio}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 12, color: C.muted, width: 80, flexShrink: 0 }}>GPS</span>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                    {selectedEvidencia.latitud?.toFixed(6)}, {selectedEvidencia.longitud?.toFixed(6)}
                    {selectedEvidencia.precision_m && <span style={{ color: C.subtle }}> · ±{Math.round(selectedEvidencia.precision_m)}m</span>}
                  </span>
                </div>
              </div>
              <a href="https://course2-my.sharepoint.com/:f:/g/personal/diana_silva_caribelng_com/IgDgdg9A2N02R7E_pwEiOOC6AcGvXQw6p7KVALqIFdDhUPo?e=BCkAgB"
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', marginTop: 16, background: '#EEF2FF', color: C.navy, border: `1px solid ${C.navy}`,
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
                Ver carpeta en OneDrive →
              </a>
              {isAdmin && (
                <button onClick={async () => {
                  if (!confirm('¿Eliminar esta evidencia?')) return
                  await deleteEvidencia(selectedEvidencia.id)
                  await loadData()
                  setSelectedEvidencia(null)
                }} style={{ marginTop: 8, background: '#fee2e2', color: C.red, border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                  Eliminar evidencia
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Log Modal ── */}
      {showAudit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAudit(false) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 600,
            maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>📜 Historial de Cambios</h3>
              <button onClick={() => setShowAudit(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
            </div>
            {auditLog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: C.subtle }}>Sin cambios registrados</div>
            ) : auditLog.map(log => {
              const actorName = log.accion === 'delete'
                ? log.cambios?.nombre || `#${log.registro_id}`
                : (log.cambios?.despues?.nombre || actors.find(a => a.id === log.registro_id)?.nombre || `#${log.registro_id}`)
              const changedFields = log.accion === 'update' && log.cambios?.antes && log.cambios?.despues
                ? Object.keys(log.cambios.despues).filter(k => JSON.stringify(log.cambios.antes[k]) !== JSON.stringify(log.cambios.despues[k]) && k !== 'updated_at')
                : []
              return (
                <div key={log.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: log.accion === 'insert' ? C.green : log.accion === 'delete' ? C.red : C.accent }}>
                      {log.accion === 'insert' ? '➕ Creado' : log.accion === 'delete' ? '🗑️ Eliminado' : ' Editado'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{actorName}</span>
                    <span style={{ fontSize: 12, color: C.subtle, marginLeft: 'auto' }}>
                      {new Date(log.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {changedFields.length > 0 && (
                    <div style={{ fontSize: 12, color: C.muted, paddingLeft: 8 }}>
                      {changedFields.slice(0, 5).map(k => (
                        <div key={k} style={{ marginBottom: 2 }}>
                          <span style={{ fontWeight: 700 }}>{k}:</span>{' '}
                          <span style={{ color: C.subtle, textDecoration: 'line-through' }}>{String(log.cambios.antes[k] ?? '')}</span>
                          {' → '}
                          <span style={{ color: C.accent, fontWeight: 600 }}>{String(log.cambios.despues[k] ?? '')}</span>
                        </div>
                      ))}
                      {changedFields.length > 5 && <div style={{ color: C.subtle }}>+{changedFields.length - 5} campos más</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selectedActor && (
        <ActorModal actor={selectedActor} session={session} isAdmin={isAdmin} profile={profile}
          onClose={() => setSelectedActor(null)} onUpdated={loadData} />
      )}

      <ChatBot
        appData={{ actors, agreements, riesgos, riesgosLeg, cronoLeg, kpisDac, reportes }}
        knowledgeDocs={knowledgeBase}
        session={session}
        isMobile={isMobile}
      />

      {/* Onboarding tour */}
      {showOnboarding && profile && <OnboardingTour profile={profile} onComplete={() => setShowOnboarding(false)} />}
    </div>
  )
}
