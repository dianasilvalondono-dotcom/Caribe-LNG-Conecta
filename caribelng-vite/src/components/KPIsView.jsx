import { useState, useEffect } from 'react'
import { C } from '../lib/constants'
import { Bar, Tag } from './ui'
import { upsertKpiDac, deleteKpiEntry } from '../lib/supabase'

export default function KPIsView({ reportes, seguimiento, isAdmin, onDeleted, agreements, kpisDac, onKpiDacSaved }) {
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

