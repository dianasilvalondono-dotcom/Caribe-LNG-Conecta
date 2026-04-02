import { useState, useEffect } from 'react'
import { C } from '../lib/constants'
import { Bar, Tag, StatCard } from './ui'
import { upsertKpiDac, deleteKpiEntry } from '../lib/supabase'

export default function KPIsView({ reportes, seguimiento, isAdmin, onDeleted, agreements, kpisDac, onKpiDacSaved }) {
  const [mainTab, setMainTab] = useState('dac')
  const [terrFilter, setTerrFilter] = useState('Todos')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 960)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // ── DAC Director KPIs — auto-calculated from gestora data ────────────────
  const dacMap = Object.fromEntries((kpisDac || []).map(k => [k.id, k]))
  const totalAcuerdos = agreements.length
  const acuerdosCumplidos = agreements.filter(a => a.estado_code === 'cumplido' || a.avance >= 100).length
  const acuerdosAvgPct = totalAcuerdos ? Math.round(agreements.reduce((s, a) => s + (a.avance || 0), 0) / totalAcuerdos) : 0
  const totalCompromisos = seguimiento.length
  const compromisosCumplidosD = seguimiento.filter(s => s.estado === 'Cumplido').length
  const compromisosVencidos = seguimiento.filter(s => s.estado === 'Pendiente' && s.fecha_pactada && new Date(s.fecha_pactada) < new Date()).length
  const compromisosPct = totalCompromisos ? Math.round((compromisosCumplidosD / totalCompromisos) * 100) : 0
  const totalEventosD = reportes.reduce((s, r) => s + (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0), 0)
  const totalIncidentesD = reportes.reduce((s, r) => s + (r.incidentes || 0), 0)
  const totalPqrs = reportes.reduce((s, r) => s + (r.pqrs_recibidas || 0), 0)
  const pqrsCerradas = reportes.reduce((s, r) => s + (r.pqrs_cerradas || 0), 0)
  const pqrsPct = totalPqrs ? Math.round((pqrsCerradas / totalPqrs) * 100) : 0
  const actoresGestionados = reportes.reduce((s, r) => s + (r.actores_gestionados || 0), 0)
  const actoresVerdes = (reportes.length > 0 ? actors : []).filter(a => a.semaforo === 'verde').length
  const actoresTotal = actors?.length || 0
  const relacionamientoPct = actoresTotal ? Math.round((actoresVerdes / actoresTotal) * 100) : 0

  const semColor = (pct, meta = 80) => pct >= meta ? '#10b981' : pct >= meta * 0.7 ? '#f59e0b' : '#ef4444'
  const semColorInv = (val) => val === 0 ? '#10b981' : val <= 2 ? '#f59e0b' : '#ef4444'
  const semLabel = (pct, meta = 80) => pct >= meta ? 'En meta' : pct >= meta * 0.7 ? 'Atención' : 'Crítico'

  // Hitos de acuerdos: 4 por territorio (mapeo, mesas, propuesta, firma)
  // Aproximación: avance >=25% = mapeo, >=50% = mesas, >=75% = propuesta, 100% = firma
  const hitosCompletados = agreements.reduce((s, a) => {
    let h = 0
    if (a.avance >= 25) h++
    if (a.avance >= 50) h++
    if (a.avance >= 75) h++
    if (a.avance >= 100) h++
    return s + h
  }, 0)
  const totalHitos = 8 // 4 por territorio × 2
  const hitosPct = Math.round((hitosCompletados / totalHitos) * 100)

  // PGS ejecutado: promedio avance acuerdos como proxy
  const pgsEjecutado = acuerdosAvgPct

  // Alertas escaladas a tiempo: proxy desde reportes
  const totalAlertas = reportes.reduce((s, r) => s + (r.alertas_escaladas_dac || 0), 0)
  const alertasPct = totalAlertas > 0 ? Math.min(90, Math.round((totalAlertas / Math.max(totalAlertas, 1)) * 100)) : (reportes.length > 0 ? 100 : 0)

  // Reconocimiento proporcional: (logrado / meta) × 5%
  const reconocer = (logrado, meta) => meta > 0 ? Math.min(Number(((logrado / meta) * 5).toFixed(2)), 5) : 0

  const DAC_KPIS = [
    { num: 1, titulo: 'Formalización de Acuerdos Sociales Tolú y Barbosa', peso: '5%', color: C.tolu,
      fecha: '30 junio 2026', medicion: '% hitos completados',
      meta: '≥75% hitos (6/8)', alertaRoja: '<50% hitos al 30 junio o sin mesas de diálogo',
      value: `${hitosCompletados}/8`, pct: hitosPct, metaNum: 75,
      reconocimiento: reconocer(hitosPct, 100),
      sc: hitosPct >= 75 ? '#10b981' : hitosPct >= 50 ? '#f59e0b' : '#ef4444',
      sub: `Tolú: ${agreements.filter(a => a.territorio === 'Tolú').reduce((s, a) => s + (a.avance >= 25 ? 1 : 0) + (a.avance >= 50 ? 1 : 0) + (a.avance >= 75 ? 1 : 0) + (a.avance >= 100 ? 1 : 0), 0)}/4 · Barbosa: ${agreements.filter(a => a.territorio === 'Barbosa').reduce((s, a) => s + (a.avance >= 25 ? 1 : 0) + (a.avance >= 50 ? 1 : 0) + (a.avance >= 75 ? 1 : 0) + (a.avance >= 100 ? 1 : 0), 0)}/4`
    },
    { num: 2, titulo: 'Ejecución del Plan de Gestión Social (PGS)', peso: '5%', color: C.barbosa,
      fecha: '31 dic 2026', medicion: '% PGS ejecutado',
      meta: 'PGS ≥80% ejecutado', alertaRoja: '<60% en cualquier territorio o bloqueo sin protocolo',
      value: `${pgsEjecutado}%`, pct: pgsEjecutado, metaNum: 80,
      reconocimiento: reconocer(pgsEjecutado, 80),
      sc: pgsEjecutado >= 80 ? '#10b981' : pgsEjecutado >= 60 ? '#f59e0b' : '#ef4444',
      sub: `Tolú: ${agreements.filter(a => a.territorio === 'Tolú').length ? Math.round(agreements.filter(a => a.territorio === 'Tolú').reduce((s, a) => s + (a.avance || 0), 0) / agreements.filter(a => a.territorio === 'Tolú').length) : 0}% · Barbosa: ${agreements.filter(a => a.territorio === 'Barbosa').length ? Math.round(agreements.filter(a => a.territorio === 'Barbosa').reduce((s, a) => s + (a.avance || 0), 0) / agreements.filter(a => a.territorio === 'Barbosa').length) : 0}% · Incidentes: ${totalIncidentesD}`
    },
    { num: 3, titulo: 'Gestión de Riesgos Sociales y Reputacionales', peso: '5%', color: '#ef4444',
      fecha: 'Continuo', medicion: '% alertas gestionadas a tiempo',
      meta: '≥90% alertas escaladas a tiempo', alertaRoja: '<70% alertas o incidente sin respuesta en 72h',
      value: `${pqrsPct}%`, pct: pqrsPct, metaNum: 90,
      reconocimiento: reconocer(pqrsPct, 90),
      sc: pqrsPct >= 90 ? '#10b981' : pqrsPct >= 70 ? '#f59e0b' : '#ef4444',
      sub: `PQRS cerradas: ${pqrsCerradas}/${totalPqrs} · Incidentes: ${totalIncidentesD} · Alertas escaladas: ${totalAlertas}`
    },
  ]

  const totalReconocimiento = DAC_KPIS.reduce((s, k) => s + k.reconocimiento, 0)
  const maxReconocimiento = DAC_KPIS.length * 5

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '14px 16px', background: `linear-gradient(135deg, ${color}10, ${color}05)`, borderRadius: 14, border: `1px solid ${color}20` }}>
          <div style={{ width: 4, height: 32, background: color, borderRadius: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2B2926' }}>{territorio}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              {territorio === 'Tolú' ? 'Terminal marítima · Sucre' : 'Planta regasificación · Antioquia'} · {totalReportes} reportes
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color }}>{totalReportes}</div>
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
                const pct = kpi.meta > 0 ? Math.min(Math.round((total / kpi.meta) * 100), 100) : 0
                const sc = kpi.invert
                  ? (total === 0 ? C.green : total <= 2 ? C.orange : C.red)
                  : (kpi.meta > 0 ? (pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red) : C.subtle)
                const semLabel = sc === C.green ? 'En meta' : sc === C.orange ? 'Atención' : sc === C.red ? 'Crítico' : ''
                return (
                  <div key={kpi.name} style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4,1fr) 60px 56px', gap: 4, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}`, minWidth: 420 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc, flexShrink: 0, boxShadow: `0 0 5px ${sc}60` }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#2B2926' }}>{kpi.name}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, paddingLeft: 13 }}>{kpi.base}</div>
                      {kpi.meta > 0 && <div style={{ marginTop: 4, paddingLeft: 13 }}>
                        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 100, overflow: 'hidden', width: '80%' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: sc, borderRadius: 100, transition: 'width 0.6s' }} />
                        </div>
                      </div>}
                    </div>
                    {[1,2,3,4].map(q => {
                      const qv = sumQ(territorio, kpi.field, q)
                      return <div key={q} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: qv ? '#2B2926' : '#cbd5e1' }}>{qv || '—'}</div>
                    })}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: sc }}>{total || '—'}</div>
                      {semLabel && <div style={{ fontSize: 8, fontWeight: 700, color: sc, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{semLabel}</div>}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{kpi.meta || '—'}</div>
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
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#2B2926', letterSpacing: -0.5 }}>KPIs 2026</h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>Caribe LNG · Dirección de Asuntos Corporativos · Enero–Diciembre 2026</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Reportes', value: totalReportes, color: C.navy },
          { label: 'Eventos totales', value: totalEventos, color: C.tolu },
          { label: 'Compromisos cumplidos', value: `${compromisosCumplidos}/${seguimiento.length}`, color: C.green },
          { label: 'Incidentes', value: totalIncidentes, color: totalIncidentes === 0 ? C.green : C.red },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: 14, padding: '16px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8ecf0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color }} />
            <div style={{ fontSize: 28, fontWeight: 900, color: '#2B2926', letterSpacing: -1, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#f8fafc', borderRadius: 12, padding: 4, border: '1px solid #e8ecf0' }}>
        {[{ id: 'dac', label: 'Director DAC' }, { id: 'gestoras', label: 'Gestoras Territoriales' }].map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            style={{ flex: 1, background: mainTab === t.id ? 'white' : 'transparent', color: mainTab === t.id ? C.navy : '#94a3b8',
              border: 'none', borderRadius: 8, padding: '10px 8px', fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: mainTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', letterSpacing: '0.3px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DAC Director tab — 5 KPIs individuales ── */}
      {mainTab === 'dac' && (
        <div>
          {/* Scorecard summary */}
          <div style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1a3d7a 60%, #1565C0 100%)', borderRadius: 16, padding: '20px 22px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Reconocimiento proporcional</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: 'white' }}>{totalReconocimiento.toFixed(1)}%</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>de {maxReconocimiento}% posible</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 100, marginTop: 12, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((totalReconocimiento / maxReconocimiento) * 100, 100)}%`, background: 'white', borderRadius: 100, transition: 'width 0.8s' }} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{DAC_KPIS.length} indicadores × 5% · Alimentados desde gestión territorial · Tiempo real</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid #93c5fd', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: '#1e40af', lineHeight: 1.5 }}>
            Estos indicadores se calculan automáticamente desde los datos de las gestoras territoriales. Se actualizan en tiempo real.
          </div>

          {DAC_KPIS.map(kpi => (
            <div key={kpi.num} style={{ background: 'white', borderRadius: 16, padding: '20px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8ecf0', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: kpi.sc }} />
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, background: kpi.color, color: 'white', padding: '3px 10px', borderRadius: 6 }}>{kpi.peso}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{kpi.fecha}</span>
                    {kpi.manual && <span style={{ fontSize: 9, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4 }}>Manual</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#2B2926', lineHeight: 1.3 }}>{kpi.num}. {kpi.titulo}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: kpi.sc }}>{kpi.value}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: kpi.sc, textTransform: 'uppercase' }}>
                    {kpi.pct >= kpi.metaNum ? 'En meta' : kpi.pct >= kpi.metaNum * 0.7 ? 'Atención' : kpi.pct > 0 ? 'Crítico' : '—'}
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              {kpi.metaNum > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(kpi.pct, 100)}%`, background: kpi.sc, borderRadius: 100, transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Meta: {kpi.meta}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: kpi.sc }}>Reconocimiento: {kpi.reconocimiento.toFixed(2)}%</span>
                  </div>
                </div>
              )}
              {/* Sub details */}
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{kpi.sub}</div>
              {/* Alerta roja */}
              <div style={{ fontSize: 10, color: '#dc2626', marginTop: 6, padding: '4px 8px', background: '#fef2f2', borderRadius: 6, display: 'inline-block' }}>
                Alerta roja: {kpi.alertaRoja}
              </div>
              {/* Manual input for KPIs 4 & 5 */}
              {kpi.manual && isAdmin && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8ecf0' }}>
                  <DACKpiRow kpi={{ id: kpi.num === 4 ? 'hitos_material' : 'esg_en_plazo', name: 'Actualizar valor', formula: kpi.medicion, frecuencia: kpi.fecha, meta: kpi.meta }} saved={dacMap[kpi.num === 4 ? 'hitos_material' : 'esg_en_plazo']} isAdmin={isAdmin} onSaved={onKpiDacSaved} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Gestoras tab ── */}
      {mainTab === 'gestoras' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[
              { id: 'Todos', color: C.navy },
              { id: 'Tolú', color: C.tolu },
              { id: 'Barbosa', color: C.barbosa },
            ].map(t => (
              <button key={t.id} onClick={() => setTerrFilter(t.id)}
                style={{ background: terrFilter === t.id ? t.color : 'white', color: terrFilter === t.id ? 'white' : '#64748b',
                  border: `1px solid ${terrFilter === t.id ? t.color : '#e8ecf0'}`, borderRadius: 10, padding: '8px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s', letterSpacing: '0.3px' }}>
                {t.id}
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

