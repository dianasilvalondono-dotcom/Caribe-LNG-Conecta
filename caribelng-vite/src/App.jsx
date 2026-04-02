import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { PieChart, Pie, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, Legend } from 'recharts'

import { supabase, signInWithMicrosoft, signOut, getProfile, upsertProfile,
         getActors, addActor, getAgreements, getInteractions, addInteraction, updateActor, updateAgreementAvance,
         getCronograma, getHuellaSocial, updateCronogramaEstado,
         getReportesSemanales, addReporteSemanal, deleteReporteSemanal, deleteKpiEntry, deleteCronogramaEvent, deleteRiesgo,
         getSeguimientoAcuerdos, addSeguimientoAcuerdo, updateSeguimientoAcuerdo, deleteSeguimientoAcuerdo,
         getRiesgos, getBowTie, getRiesgosLegislativos, getCronogramaLegislativo,
         addCronogramaLegislativo, deleteCronogramaLegislativo,
         getKpisDac, upsertKpiDac, sendAlerta,
         getKnowledgeBase, addKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc, uploadKnowledgeFile,
         uploadEvidenciaPhoto, addEvidencia, getEvidencias,
         submitActorEdit, getActorEdits, approveActorEdit, rejectActorEdit,
         addRegistroDiario, getRegistrosDiarios,
         getAuditLog } from './lib/supabase'

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

// ━━ Main App ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [view, setView] = useState('dashboard')
  const [navOpen, setNavOpen] = useState(null) // which dropdown is open
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actors, setActors] = useState([])
  const [agreements, setAgreements] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedActor, setSelectedActor] = useState(null)
  const [showNewActor, setShowNewActor] = useState(false)
  const [newActor, setNewActor] = useState({ nombre: '', tipo: 'Político', territorio: 'Nacional', semaforo: 'rojo', posicion: 'Neutro', poder: 3, interes: 3, prioridad: '', riesgo: 'Bajo', owner: '', contacto: '', que_hacemos: '' })
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
  const [evidencias, setEvidencias] = useState([])
  const [showEvidenciaCapture, setShowEvidenciaCapture] = useState(false)
  const [actorEdits, setActorEdits] = useState([])
  const [editingActor, setEditingActor] = useState(null)
  const [registrosDiarios, setRegistrosDiarios] = useState([])
  const [inputSubTab, setInputSubTab] = useState('diario')
  const [showGuia, setShowGuia] = useState(false)
  const [auditLog, setAuditLog] = useState([])
  const [showAudit, setShowAudit] = useState(false)
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
      if (v === 'huella' && !huellaSocial.length) setHuellaSocial(await getHuellaSocial() || [])
      if (v === 'riesgos' && !riesgosLeg.length) {
        const [rl, cleg] = await Promise.all([getRiesgosLegislativos(), getCronogramaLegislativo()])
        setRiesgosLeg(rl || []); setCronoLeg(cleg || [])
      }
      if (v === 'kpis' && !kpisDac.length) setKpisDac(await getKpisDac() || [])
      if (v === 'knowledge' && !knowledgeBase.length) setKnowledgeBase(await getKnowledgeBase() || [])
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
    { id: 'gestora', label: 'Mi territorio', icon: '📍' },
    { id: 'actores', label: 'Actores', icon: '👥' },
    { id: 'territorio', label: 'Territorio', icon: '🌎', children: [
      { id: 'acuerdos', label: 'Acuerdos', icon: '🤝' },
      { id: 'huella', label: 'Huella Social', icon: '🌱' },
      { id: 'cronograma', label: 'Cronograma', icon: '📅' },
    ]},
    { id: 'riesgos', label: 'Riesgos DAC', icon: '⚠️' },
    { id: 'gestion', label: 'Gestión', icon: '📋', children: [
      { id: 'kpis', label: 'KPIs', icon: '🎯' },
      { id: 'input', label: 'Registro de Campo', icon: '✍️' },
    ]},
    ...(isAdmin ? [{ id: 'knowledge', label: 'Base Conocimiento', icon: '🧠' }] : []),
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
    <div onClick={(e) => { if (!e.target.closest('[data-nav-dropdown]')) setNavOpen(null) }}
      style={{ fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: '100vh', background: C.bg, color: C.text }}>
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
            overflowX: 'auto', overflowY: 'visible',
            gap: 2, scrollbarWidth: 'none',
          }}>
            {/* Logo — click to go to dashboard */}
            <div onClick={() => setView('dashboard')} style={{ flexShrink: 0, display: 'flex', alignItems: 'center',
              paddingRight: 10, marginRight: 4, borderRight: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
              <img src="/logo-conecta-white.svg" alt="Caribe LNG Conecta" style={{ height: 30 }} />
            </div>
            {/* Nav tabs */}
            {NAV.map(n => n.children ? (
              <div key={n.id} data-nav-dropdown style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => setNavOpen(navOpen === n.id ? null : n.id)}
                  style={{ flexShrink: 0,
                    background: isInGroup(n.id) || navOpen === n.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                    color: isInGroup(n.id) || navOpen === n.id ? '#93c5fd' : 'rgba(255,255,255,0.6)',
                    border: 'none', borderRadius: 8, padding: '5px 9px', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                    whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 13 }}>{n.icon}</span>
                  <span>{n.label}</span>
                  <span style={{ fontSize: 9, marginLeft: 2 }}>▼</span>
                </button>
                {navOpen === n.id && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#1a2744',
                    borderRadius: 8, padding: 4, zIndex: 200, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {n.children.map(c => (
                      <button key={c.id} onClick={() => { setView(c.id); setNavOpen(null) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                          background: view === c.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                          color: view === c.id ? '#93c5fd' : 'rgba(255,255,255,0.7)',
                          border: 'none', borderRadius: 6, padding: '7px 10px', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 13 }}>{c.icon}</span><span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button key={n.id} onClick={() => { setView(n.id); setNavOpen(null) }}
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
          <div style={{ padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62, maxWidth: '100vw' }} className="clng-desktop-nav">
            <div onClick={() => setView('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <img src="/logo-conecta-white.svg" alt="Caribe LNG Conecta" style={{ height: 34 }} />
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {NAV.map(n => n.children ? (
                <div key={n.id} data-nav-dropdown style={{ position: 'relative' }}>
                  <button onClick={() => setNavOpen(navOpen === n.id ? null : n.id)}
                    style={{ background: isInGroup(n.id) || navOpen === n.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                      color: isInGroup(n.id) || navOpen === n.id ? '#93c5fd' : 'rgba(255,255,255,0.55)',
                      border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                      fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{n.icon}</span><span>{n.label}</span>
                    <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
                  </button>
                  {navOpen === n.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#1a2744',
                      borderRadius: 8, padding: 4, zIndex: 200, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                      {n.children.map(c => (
                        <button key={c.id} onClick={() => { setView(c.id); setNavOpen(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                            background: view === c.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                            color: view === c.id ? '#93c5fd' : 'rgba(255,255,255,0.7)',
                            border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer',
                            fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <span>{c.icon}</span><span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button key={n.id} onClick={() => { setView(n.id); setNavOpen(null) }}
                  style={{ background: view === n.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                    color: view === n.id ? '#93c5fd' : 'rgba(255,255,255,0.55)',
                    border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{n.icon}</span><span>{n.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Búsqueda global */}
              <div style={{ position: 'relative' }}>
                <input value={globalSearch} onChange={e => { setGlobalSearch(e.target.value); setShowGlobalSearch(!!e.target.value) }}
                  onFocus={() => { if (globalSearch) setShowGlobalSearch(true) }}
                  placeholder="🔍 Buscar todo..."
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                    padding: '5px 12px', fontSize: 13, color: 'white', width: 180, outline: 'none', fontFamily: 'inherit' }} />
                {showGlobalSearch && globalSearch.length >= 2 && (() => {
                  const q = globalSearch.toLowerCase()
                  const results = []
                  // Actores
                  actors.filter(a => a.nombre?.toLowerCase().includes(q) || a.tipo?.toLowerCase().includes(q) || a.contacto?.toLowerCase().includes(q)).slice(0, 4)
                    .forEach(a => results.push({ icon: '👤', label: a.nombre, sub: `${a.tipo} · ${a.territorio}`, action: () => { setSelectedActor(a); setView('actores') } }))
                  // Registros diarios
                  registrosDiarios.filter(r => r.descripcion?.toLowerCase().includes(q) || r.lugar?.toLowerCase().includes(q) || r.tipo_reunion?.toLowerCase().includes(q)).slice(0, 3)
                    .forEach(r => results.push({ icon: '📝', label: r.descripcion?.substring(0, 50), sub: `${r.tipo_reunion} · ${r.fecha}`, action: () => { setView('input'); setInputSubTab('diario') } }))
                  // Acuerdos
                  agreements.filter(a => a.nombre?.toLowerCase().includes(q)).slice(0, 2)
                    .forEach(a => results.push({ icon: '🤝', label: a.nombre, sub: `${a.territorio} · ${a.avance}%`, action: () => setView('acuerdos') }))
                  // Riesgos
                  riesgos.filter(r => r.riesgo?.toLowerCase().includes(q) || r.accion_inmediata?.toLowerCase().includes(q)).slice(0, 2)
                    .forEach(r => results.push({ icon: '⚠️', label: r.riesgo?.substring(0, 50), sub: r.semaforo, action: () => setView('riesgos') }))
                  // Seguimiento
                  seguimiento.filter(s => s.compromiso?.toLowerCase().includes(q) || s.actividad?.toLowerCase().includes(q)).slice(0, 2)
                    .forEach(s => results.push({ icon: '📋', label: s.compromiso?.substring(0, 50), sub: s.estado, action: () => setView('acuerdos') }))
                  if (!results.length) results.push({ icon: '🔍', label: 'Sin resultados', sub: '', action: () => {} })
                  return (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#1a2744',
                      borderRadius: 10, padding: 6, zIndex: 300, minWidth: 300, maxHeight: 350, overflowY: 'auto',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                      {results.map((r, i) => (
                        <div key={i} onClick={() => { r.action(); setShowGlobalSearch(false); setGlobalSearch('') }}
                          style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                            alignItems: 'flex-start' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                            {r.sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{r.sub}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <img src="/logo-conecta.svg" alt="Caribe LNG Conecta" style={{ height: isMobile ? 32 : 44 }} />
                <span style={{ fontSize: isMobile ? 15 : 22, fontWeight: 800, color: C.muted }}>|</span>
                <h1 style={{ margin: 0, fontSize: isMobile ? 17 : 24, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Estado del territorio</h1>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: isMobile ? 12 : 16, flex: 1, minWidth: 0 }}>Resumen de relacionamiento · Caribe LNG 2026 · Tiempo real</p>
                {!isMobile && <>
                  <button onClick={() => window.print()} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Exportar PDF</button>
                  <button onClick={() => exportToExcel(
                    actors.map(a => ({ Nombre: a.nombre, Tipo: a.tipo, Territorio: a.territorio, Semáforo: a.semaforo, Posición: a.posicion, Riesgo: a.riesgo, Poder: a.poder, Interés: a.interes, Prioridad: a.prioridad, Responsable: a.owner, Contacto: a.contacto })),
                    'Actores_CaribeLNG', 'Actores'
                  )}
                    style={{ background: '#f1f5f9', color: C.navy, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>📥 Excel Actores</button>
                  <button onClick={() => exportToExcel(
                    registrosDiarios.map(r => ({ Fecha: r.fecha, Territorio: r.territorio, Tipo: r.tipo_reunion, Lugar: r.lugar || r.geo_lugar, Asistentes: r.asistentes, Descripción: r.descripcion, GPS: r.latitud ? `${r.latitud},${r.longitud}` : '' })),
                    'Registros_Diarios', 'Registros'
                  )}
                    style={{ background: '#f1f5f9', color: C.navy, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>📥 Excel Registros</button>
                </>}
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

            {/* ── Gráficos ── */}
            {!isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Pie: distribución semáforo */}
                <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Distribución de Relaciones</div>
                  <PieChart width={280} height={200}>
                    <Pie data={[
                      { name: 'Verde', value: stats.verde, fill: C.green },
                      { name: 'Amarillo', value: stats.amarillo, fill: C.yellow },
                      { name: 'Naranja', value: stats.naranja, fill: C.orange },
                      { name: 'Rojo', value: stats.rojo, fill: C.red },
                    ].filter(d => d.value > 0)} cx={140} cy={95} innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} actores`, name]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </div>
                {/* Bar: gestión semanal */}
                <div style={{ background: C.card, borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Actividad Semanal</div>
                  <BarChart width={280} height={200} data={
                    reportes.slice(0, 8).reverse().map(r => ({
                      sem: `S${r.semana}`,
                      Reuniones: (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0),
                      Actores: r.actores_gestionados || 0,
                      PQRS: r.pqrs_recibidas || 0,
                    }))
                  }>
                    <XAxis dataKey="sem" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <RBar dataKey="Reuniones" fill={C.accent} radius={[3, 3, 0, 0]} />
                    <RBar dataKey="Actores" fill={C.tolu} radius={[3, 3, 0, 0]} />
                    <RBar dataKey="PQRS" fill={C.orange} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </div>
              </div>
            )}

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
              {/* ── Ediciones pendientes (admin only) ── */}
              {isAdmin && actorEdits.length > 0 && (
                <div style={{ background: C.card, borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', marginTop: 12 }}>
                  <div style={{ background: '#f59e0b', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✏️</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'white', letterSpacing: '0.04em' }}>EDICIONES PENDIENTES</span>
                    <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.3)', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 800, color: 'white' }}>{actorEdits.length}</span>
                  </div>
                  <div style={{ padding: 12 }}>
                    {actorEdits.map(edit => {
                      const actorName = actors.find(a => a.id === edit.actor_id)?.nombre || `Actor #${edit.actor_id}`
                      const changedKeys = Object.keys(edit.campos || {})
                      return (
                        <div key={edit.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{actorName}</div>
                          <div style={{ fontSize: 12, color: C.subtle, marginBottom: 4 }}>
                            Por: {edit.user_name} · {new Date(edit.created_at).toLocaleDateString('es-CO')}
                          </div>
                          <div style={{ fontSize: 12, marginBottom: 6 }}>
                            {changedKeys.map(k => (
                              <div key={k} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
                                <span style={{ fontWeight: 700, color: C.muted }}>{k}:</span>
                                <span style={{ color: C.accent, fontWeight: 600 }}>{String(edit.campos[k])}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={async () => {
                              await approveActorEdit(edit.id, edit.actor_id, edit.campos, session.user.id)
                              await loadData()
                            }}
                              style={{ flex: 1, background: C.green, color: 'white', border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              ✅ Aprobar
                            </button>
                            <button onClick={async () => {
                              await rejectActorEdit(edit.id, session.user.id)
                              await loadData()
                            }}
                              style={{ flex: 1, background: '#fee2e2', color: C.red, border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              ❌ Rechazar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Audit log button */}
              {isAdmin && (
                <button onClick={async () => { setAuditLog(await getAuditLog(30)); setShowAudit(true) }}
                  style={{ width: '100%', marginTop: 12, background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: '10px 14px', fontSize: 13, fontWeight: 700, color: C.muted, cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📜</span> Ver historial de cambios
                </button>
              )}
            </div>}
            </div>
          </div>
        )}

        {/* ━━ ACTORES ━━ */}
        {view === 'actores' && (
          <div>
            {/* Header */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Base de Actores</h1>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{filtered.length} de {actors.length} actores</p>
              </div>
              {(isAdmin || profile?.role === 'gestora') && (
                <button onClick={() => setShowNewActor(!showNewActor)}
                  style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>+</span> Nuevo Actor
                </button>
              )}
              <button onClick={() => exportToExcel(
                filtered.map(a => ({ Nombre: a.nombre, Tipo: a.tipo, Territorio: a.territorio, Semáforo: a.semaforo, Posición: a.posicion, Riesgo: a.riesgo, Poder: a.poder, Interés: a.interes, Prioridad: a.prioridad, Responsable: a.owner, Contacto: a.contacto, 'Última acción': a.accion_tomada, 'Fecha acción': a.fecha_accion })),
                'Actores_CaribeLNG', 'Actores'
              )}
                style={{ background: '#f1f5f9', color: C.navy, border: '1px solid #e2e8f0', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                📥 Excel
              </button>
            </div>

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
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Contacto</label>
                    <input value={newActor.contacto} onChange={e => setNewActor({ ...newActor, contacto: e.target.value })}
                      placeholder="Email, teléfono, etc."
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
                      setNewActor({ nombre: '', tipo: 'Político', territorio: 'Nacional', semaforo: 'rojo', posicion: 'Neutro', poder: 3, interes: 3, prioridad: '', riesgo: 'Bajo', owner: '', contacto: '', que_hacemos: '' })
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
              <div style={{ width: 66, height: 66, borderRadius: '50%', background: pilar.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <span style={{ color: 'white', fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>{pilar.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 14, textAlign: 'center' }}>{data.titulo}</div>
              <div style={{ width: '100%', textAlign: 'left' }}>
                {data.items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 18, color: '#444', lineHeight: 1.6 }}>
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
                  <img src="/logo-simbolo.svg" alt="Caribe LNG" style={{ width: 36, height: 36 }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: C.navy, letterSpacing: -0.3 }}>Caribe LNG</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>Caribe LNG <span style={{ fontFamily: "'Courgette', cursive", color: '#1565C0' }}>¡Conecta!</span></div>
              </div>
              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 34, fontWeight: 900, color: C.navy }}>HUELLA SOCIAL TERRITORIAL</h1>
                <div style={{ width: 80, height: 4, background: C.accent, borderRadius: 2, margin: '10px auto 12px' }} />
                <p style={{ margin: 0, color: '#5C6370', fontSize: 18, fontWeight: 500 }}>Lo que Caribe LNG deja en cada territorio</p>
              </div>
              {/* Legend bar */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? 10 : 28, marginBottom: 32, flexWrap: 'wrap', background: '#F5F7FA', borderRadius: 10, padding: '14px 24px' }}>
                {Object.values(P).map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: p.color, color: 'white', fontSize: 14, fontWeight: 900, padding: '5px 14px', borderRadius: 14 }}>{p.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{p.desc}</span>
                  </div>
                ))}
              </div>
              {/* Territories */}
              {territorios.map(t => (
                <div key={t.nombre} style={{ marginBottom: 40 }}>
                  <div style={{ marginBottom: 16, borderBottom: '2px solid #E0E4EA', paddingBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 900, color: C.navy }}>
                      {t.nombre} <span style={{ fontSize: 18, fontWeight: 400, color: '#8D95A0', marginLeft: 8 }}>{t.sub}</span>
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: isMobile ? 'wrap' : 'nowrap', marginBottom: 16 }}>
                    <HuellaCard pilar={P.c3} data={t.c3} />
                    <HuellaCard pilar={P.hub} data={t.hub} />
                    <HuellaCard pilar={P.eco} data={t.eco} />
                  </div>
                  {/* Summary banner */}
                  <div style={{ background: '#0D2137', borderRadius: 10, padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{t.resumen}</span>
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
          <div>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Registro de Campo</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: isMobile ? 13 : 16 }}>Registros diarios, reportes semanales y evidencias fotográficas</p>
            </div>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
              {[
                { id: 'diario', label: '📝 Registro Diario' },
                { id: 'semanal', label: '📊 Reporte Semanal' },
                { id: 'evidencias', label: '📸 Evidencias' },
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
                    if (file) foto_url = await uploadEvidenciaPhoto(file)
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
                    setTimeout(() => {
                      setSaved(false)
                      setDescripcion(''); setLugarR(''); setAsistentes(''); setFile(null); setPreview(null); setGeo(null); setGeoLugar(null)
                    }, 2000)
                  } catch (err) { alert('Error: ' + err.message) }
                  finally { setSaving(false) }
                }

                if (saved) return (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
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
                            {['Comunidad', 'Pescadores', 'JAC', 'Institucional', 'Socialización', 'Vecindad', 'Diagnóstico', 'Otro'].map(t => <option key={t} value={t}>{t}</option>)}
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
                      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                        {!preview ? (
                          <button onClick={() => fileRef.current?.click()}
                            style={{ background: `${C.accent}10`, border: `1.5px dashed ${C.accent}`, borderRadius: 10,
                              padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <span style={{ fontSize: 20 }}>📷</span>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>Tomar foto de evidencia</div>
                              <div style={{ fontSize: 11, color: C.subtle }}>GPS + hora automáticos (opcional)</div>
                            </div>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                            <img src={preview} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {geo && <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>📍 {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} ±{Math.round(geo.accuracy)}m</div>}
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
                        {saving ? '⏳ Guardando...' : '📤 Guardar registro'}
                      </button>
                    </div>

                    {/* Timeline de registros recientes */}
                    {registrosDiarios.length > 0 && (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Registros recientes</div>
                        {registrosDiarios.slice(0, 15).map(r => (
                          <div key={r.id} style={{ background: C.card, borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start',
                            borderLeft: `3px solid ${r.territorio === 'Tolú' ? C.tolu : C.barbosa}` }}>
                            {r.foto_url && <img src={r.foto_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: r.territorio === 'Tolú' ? C.tolu : C.barbosa }}>{r.territorio}</span>
                                <span style={{ fontSize: 11, color: C.subtle }}>·</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{r.tipo_reunion}</span>
                                {r.asistentes > 0 && <span style={{ fontSize: 11, color: C.subtle }}>· {r.asistentes} asistentes</span>}
                              </div>
                              <div style={{ fontSize: 13, color: C.text, marginBottom: 3, lineHeight: 1.4 }}>{r.descripcion}</div>
                              <div style={{ fontSize: 11, color: C.subtle }}>
                                📅 {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                                {r.lugar && <span> · 📌 {r.lugar}</span>}
                                {r.geo_lugar && !r.lugar && <span> · 📌 {r.geo_lugar}</span>}
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
                      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
                      {!preview ? (
                        <div onClick={() => fileRef.current?.click()}
                          style={{ border: `2px dashed ${C.accent}`, borderRadius: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: `${C.accent}08` }}>
                          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Tomar foto de evidencia</div>
                          <div style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>GPS + hora + lugar automáticos</div>
                        </div>
                      ) : (
                        <div>
                          <img src={preview} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover', marginBottom: 10 }} />
                          {captureTime && (
                            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13 }}>
                              <div>🕐 {new Date(captureTime).toLocaleString('es-CO')}</div>
                              {geo && <div>📍 {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)} ±{Math.round(geo.accuracy)}m</div>}
                              {lugar && <div>📌 {lugar}</div>}
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
                                const foto_url = await uploadEvidenciaPhoto(file)
                                await addEvidencia({ user_id: session.user.id, territorio: myTerritorio || 'Nacional', foto_url, latitud: geo.lat, longitud: geo.lng, precision_m: geo.accuracy, descripcion: desc.trim(), capturada_at: captureTime, lugar })
                                await loadData()
                                setFile(null); setPreview(null); setDesc(''); setGeo(null); setLugar(null); setCaptureTime(null)
                              } catch (err) { alert('Error: ' + err.message) }
                              finally { setUploading(false) }
                            }}
                              disabled={uploading || !desc.trim() || !geo}
                              style={{ flex: 2, background: uploading || !desc.trim() || !geo ? '#cbd5e1' : C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: uploading ? 'wait' : 'pointer' }}>
                              {uploading ? '⏳ Subiendo...' : '📤 Guardar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Gallery */}
                    {evidencias.filter(e => myTerritorio ? e.territorio === myTerritorio : true).length > 0 && (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Evidencias recientes</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                          {evidencias.filter(e => myTerritorio ? e.territorio === myTerritorio : true).slice(0, 20).map(ev => (
                            <div key={ev.id} style={{ background: C.card, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                              <img src={ev.foto_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                              <div style={{ padding: '10px 12px' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{ev.descripcion}</div>
                                <div style={{ fontSize: 11, color: C.subtle }}>🕐 {new Date(ev.capturada_at).toLocaleString('es-CO')}</div>
                                {ev.lugar && <div style={{ fontSize: 11, color: C.accent }}>📌 {ev.lugar}</div>}
                                <div style={{ fontSize: 10, color: C.subtle }}>📍 {ev.latitud?.toFixed(5)}, {ev.longitud?.toFixed(5)}</div>
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
          </div>
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
            <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>📍 Mi Territorio</h1>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{profile?.full_name} · {myTerritorio || 'Todos los territorios'}</p>
              </div>
              <button onClick={() => setShowGuia(true)}
                style={{ background: C.accent, color: 'white', border: 'none', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                📖 Guía
              </button>
            </div>

            {/* ── Modal Guía Gestora ── */}
            {showGuia && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={(e) => { if (e.target === e.currentTarget) setShowGuia(false) }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520,
                  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.navy }}>📖 Guía de la Gestora</h2>
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
            {/* ── Captura de Evidencia ── */}
            <div onClick={() => setShowEvidenciaCapture(true)}
              style={{ background: C.navy, borderRadius: 12, padding: '16px 20px', marginBottom: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: 28 }}>📸</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>Capturar Evidencia</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Foto con geolocalización y hora exacta</div>
              </div>
            </div>

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
                    const foto_url = await uploadEvidenciaPhoto(file)
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
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>📸 Capturar Evidencia</h3>
                        <button onClick={() => setShowEvidenciaCapture(false)}
                          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
                      </div>

                      {/* Botón cámara */}
                      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile}
                        style={{ display: 'none' }} />
                      {!preview ? (
                        <div onClick={() => fileRef.current?.click()}
                          style={{ border: `2px dashed ${C.accent}`, borderRadius: 12, padding: '32px 16px',
                            textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: `${C.accent}08` }}>
                          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Tomar foto</div>
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
                            <span style={{ fontWeight: 700, color: C.text }}>🕐 Hora:</span>
                            <span style={{ color: C.muted }}>{new Date(captureTime).toLocaleString('es-CO')}</span>
                          </div>
                          {geo ? (
                            <>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, color: C.text }}>📍 GPS:</span>
                                <span style={{ color: C.muted }}>{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, color: C.text }}>🎯 Precisión:</span>
                                <span style={{ color: geo.accuracy > 50 ? C.orange : C.green, fontWeight: 600 }}>
                                  ±{Math.round(geo.accuracy)}m {geo.accuracy > 50 ? '(baja)' : '(buena)'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontWeight: 700, color: C.text }}>📌 Lugar:</span>
                                <span style={{ color: C.muted }}>{lugar || '⏳ Resolviendo...'}</span>
                              </div>
                            </>
                          ) : geoError ? (
                            <div style={{ color: C.red, fontWeight: 600 }}>⚠️ {geoError}</div>
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
                        {uploading ? '⏳ Subiendo...' : '📤 Guardar evidencia'}
                      </button>
                    </div>
                  </div>
                )
              }
              return <CaptureForm />
            })()}

            {/* ── Galería de evidencias recientes ── */}
            {evidencias.filter(e => myTerritorio ? e.territorio === myTerritorio : true).length > 0 && (
              <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 12 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>📸 Evidencias recientes</h3>
                {evidencias.filter(e => myTerritorio ? e.territorio === myTerritorio : true).slice(0, 10).map(ev => (
                  <div key={ev.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}`, alignItems: 'flex-start' }}>
                    <img src={ev.foto_url} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{ev.descripcion}</div>
                      <div style={{ fontSize: 12, color: C.subtle }}>
                        🕐 {new Date(ev.capturada_at).toLocaleString('es-CO')}
                      </div>
                      {ev.lugar && <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
                        📌 {ev.lugar}
                      </div>}
                      <div style={{ fontSize: 11, color: C.subtle }}>
                        📍 {ev.latitud.toFixed(5)}, {ev.longitud.toFixed(5)}
                        {ev.precision_m && <span> · ±{Math.round(ev.precision_m)}m</span>}
                      </div>
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
      </div>

      <div style={{ padding: '30px 40px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg viewBox="0 0 863.64 794.92" width="36" height="36"><path fill="#1565c0" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#08306b" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, letterSpacing: -0.3 }}>Caribe LNG <span style={{ fontFamily: "'Courgette', cursive", color: '#1565C0', fontWeight: 400 }}>¡Conecta!</span></div>
            <div style={{ fontSize: 13, color: C.subtle }}>Plan de Gestion Social &mdash; 2026</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: C.subtle }}>Direccion de Asuntos Corporativos</div>
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Diana Silva</div>
        </div>
      </div>

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
                      {log.accion === 'insert' ? '➕ Creado' : log.accion === 'delete' ? '🗑️ Eliminado' : '✏️ Editado'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{actorName}</span>
                    <span style={{ fontSize: 11, color: C.subtle, marginLeft: 'auto' }}>
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
    </div>
  )
}
