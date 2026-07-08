import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'

// ── Ambiental · workspace Diana + Leonardo Cárdenas GAA · vista lectura para gestoras ──

const C2 = C || {
  navy: '#0D47A1', blue: '#1565C0', tolu: '#007A87', barbosa: '#00BFB3',
  green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  bg: '#FAFBFC', card: '#FFFFFF', border: '#E8ECF0', text: '#2B2926',
  muted: '#5C6370', subtle: '#8D95A0',
}

const TIPO_LABEL = {
  concepto: 'Concepto ambiental', eia: 'EIA', permiso: 'Permiso',
  respuesta_autoridad: 'Respuesta autoridad', estudio: 'Estudio', otro: 'Otro',
}

const STATUS_PGRD = {
  pendiente:      { label: 'Pendiente',      bg: '#F1F5F9', fg: '#64748B' },
  en_desarrollo:  { label: 'En desarrollo',  bg: '#FFFBEB', fg: '#B45309' },
  en_revision:    { label: 'En revisión',    bg: '#EEF2FF', fg: '#4338CA' },
  aprobado:       { label: 'Aprobado',       bg: '#ECFDF5', fg: '#047857' },
  vigente:        { label: 'Vigente',        bg: '#ECFDF5', fg: '#047857' },
  vencido:        { label: 'Vencido',        bg: '#FEF2F2', fg: '#B91C1C' },
}

const STATUS_COMP = {
  abierto:       { label: 'Abierto',      bg: '#EEF2FF', fg: '#4338CA' },
  en_progreso:   { label: 'En progreso',  bg: '#FFFBEB', fg: '#B45309' },
  cumplido:      { label: 'Cumplido',     bg: '#ECFDF5', fg: '#047857' },
  vencido:       { label: 'Vencido',      bg: '#FEF2F2', fg: '#B91C1C' },
  reprogramado:  { label: 'Reprogramado', bg: '#F3E8FF', fg: '#7C3AED' },
}

export default function AmbientalView({ profile }) {
  const [subtab, setSubtab] = useState('dashboard')
  const [docs, setDocs] = useState([])
  const [pgrd, setPgrd] = useState([])
  const [commitments, setCommitments] = useState([])
  const [advisorLog, setAdvisorLog] = useState([])
  const [tracker, setTracker] = useState([])
  const [terrFilter, setTerrFilter] = useState('Todos')
  const [loading, setLoading] = useState(true)

  const canEdit = profile?.role === 'admin' || profile?.ambiental_access === 'full'

  async function loadAll() {
    setLoading(true)
    const [d, p, c, a, t] = await Promise.all([
      supabase.from('ambiental_documents').select('*').order('fecha', { ascending: false, nullsFirst: false }),
      supabase.from('ambiental_pgrd').select('*').order('fecha_estimada', { ascending: true, nullsFirst: false }),
      supabase.from('ambiental_commitments').select('*').order('fecha_limite', { ascending: true, nullsFirst: false }),
      supabase.from('ambiental_advisor_log').select('*').order('fecha', { ascending: false }),
      supabase.from('ambiental_workstream_tracker').select('*').order('workstream').order('orden'),
    ])
    setDocs(d.data || [])
    setPgrd(p.data || [])
    setCommitments(c.data || [])
    setAdvisorLog(a.data || [])
    setTracker(t.data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // Filtrado por territorio (solo afecta docs y commitments que tienen territorio)
  const docsF = useMemo(() => terrFilter === 'Todos' ? docs : docs.filter(d => !d.territorio || d.territorio === terrFilter), [docs, terrFilter])
  const commitmentsF = useMemo(() => terrFilter === 'Todos' ? commitments : commitments.filter(c => !c.territorio || c.territorio === terrFilter), [commitments, terrFilter])

  const stats = useMemo(() => ({
    docs: docsF.length,
    compromisosAbiertos: commitmentsF.filter(c => c.status === 'abierto' || c.status === 'en_progreso').length,
    compromisosVencidos: commitmentsF.filter(c => c.status === 'vencido').length,
    pgrdVigente: pgrd.some(p => p.componente === 'plan_maestro' && (p.status === 'aprobado' || p.status === 'vigente')),
  }), [docsF, commitmentsF, pgrd])

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C2.text }}>
            Ambiental
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: C2.muted }}>
            Workspace Diana + Leonardo Cárdenas (GAA) · Lectura para gestoras
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Filtro de territorio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C2.subtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>Territorio</span>
            <select value={terrFilter} onChange={e => setTerrFilter(e.target.value)}
              style={{ padding: '6px 10px', border: `1px solid ${C2.border}`, borderRadius: 8, fontSize: 12, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, color: C2.navy, background: 'white', cursor: 'pointer' }}>
              <option value="Todos">Todos</option>
              <option value="Tolú">Tolú</option>
              <option value="Barbosa">Barbosa</option>
              <option value="Nacional">Nacional</option>
            </select>
          </div>
          {!canEdit && (
            <span style={{ padding: '4px 10px', background: '#F1F5F9', color: '#64748B', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
              VISTA DE LECTURA
            </span>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: `1px solid ${C2.border}`, overflowX: 'auto' }}>
        {[
          ['dashboard', 'Dashboard'],
          ['documentos', `Documentos (${docs.length})`],
          ['pgrd', 'PGRD + PEC'],
          ['compromisos', `Compromisos (${stats.compromisosAbiertos})`],
          ['asesor', 'Asesor externo'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setSubtab(k)} style={{
            padding: '10px 14px', background: 'transparent',
            border: 'none', borderBottom: subtab === k ? `3px solid ${C2.navy}` : '3px solid transparent',
            color: subtab === k ? C2.navy : C2.muted,
            fontSize: 13, fontWeight: subtab === k ? 800 : 600,
            cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif",
            whiteSpace: 'nowrap',
          }}>{l}</button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: C2.muted }}>Cargando ambiental...</div>}

      {!loading && subtab === 'dashboard' && (
        <DashboardAmbiental docs={docsF} pgrd={pgrd} commitments={commitmentsF} advisorLog={advisorLog} tracker={tracker} terrFilter={terrFilter} stats={stats} C2={C2} canEdit={canEdit} reload={loadAll} onNavigate={setSubtab} />
      )}
      {!loading && subtab === 'documentos' && (
        <DocumentosSection docs={docs} canEdit={canEdit} profile={profile} reload={loadAll} C2={C2} />
      )}
      {!loading && subtab === 'pgrd' && (
        <PGRDSection items={pgrd} canEdit={canEdit} profile={profile} reload={loadAll} C2={C2} />
      )}
      {!loading && subtab === 'compromisos' && (
        <CompromisosSection items={commitments} canEdit={canEdit} profile={profile} reload={loadAll} C2={C2} />
      )}
      {!loading && subtab === 'asesor' && (
        <AsesorSection log={advisorLog} docs={docs} canEdit={canEdit} profile={profile} reload={loadAll} C2={C2} />
      )}
    </div>
  )
}

// ── Dashboard ──
const TRACKER_STATUS = {
  pendiente:   { label: 'Pendiente',   color: '#64748B', bg: '#F1F5F9', dot: '○' },
  en_curso:    { label: 'En curso',    color: '#1D4ED8', bg: '#DBEAFE', dot: '◐' },
  completado:  { label: 'Completado',  color: '#047857', bg: '#D1FAE5', dot: '●' },
  vencido:     { label: 'Vencido',     color: '#B91C1C', bg: '#FEE2E2', dot: '⚠' },
  bloqueado:   { label: 'Bloqueado',   color: '#92400E', bg: '#FEF3C7', dot: '⛔' },
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

function DashboardAmbiental({ docs, pgrd, commitments, advisorLog, tracker, terrFilter, stats, C2, canEdit, reload, onNavigate }) {
  const recentDocs = docs.slice(0, 4)
  const openCompromisos = commitments.filter(c => c.status === 'abierto' || c.status === 'en_progreso').slice(0, 5)
  const vencidos = commitments.filter(c => c.status === 'vencido')
  const pgrdKey = pgrd.find(p => p.componente === 'plan_maestro')

  // Cronograma 60 días: une compromisos + PGRD + tracker que vencen pronto
  const horizonte = useMemo(() => {
    const items = []
    commitments.forEach(c => {
      if (!c.fecha_limite || c.status === 'cumplido') return
      const d = daysUntil(c.fecha_limite)
      if (d === null || d > 60 || d < -30) return
      items.push({ tipo: 'Compromiso', titulo: c.compromiso, contraparte: c.contraparte, fecha: c.fecha_limite, dias: d, territorio: c.territorio })
    })
    pgrd.forEach(p => {
      if (!p.fecha_estimada || p.status === 'aprobado' || p.status === 'vigente') return
      const d = daysUntil(p.fecha_estimada)
      if (d === null || d > 60 || d < -30) return
      items.push({ tipo: 'PGRD', titulo: p.titulo, contraparte: p.autoridad_aprueba || '—', fecha: p.fecha_estimada, dias: d, territorio: null })
    })
    tracker.forEach(t => {
      if (!t.fecha_target || t.status === 'completado') return
      const d = daysUntil(t.fecha_target)
      if (d === null || d > 60 || d < -30) return
      items.push({ tipo: t.workstream === 'eia' ? 'EIA' : t.workstream === 'err' ? 'ERR' : 'Riesgos', titulo: t.titulo, contraparte: t.responsable || '—', fecha: t.fecha_target, dias: d, territorio: t.territorio })
    })
    return items.sort((a, b) => a.dias - b.dias).slice(0, 10)
  }, [commitments, pgrd, tracker])

  // Distribución documentos por tipo
  const docsByType = useMemo(() => {
    const m = {}
    docs.forEach(d => { m[d.tipo] = (m[d.tipo] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [docs])

  const eiaHitos = tracker.filter(t => t.workstream === 'eia')
  const errHitos = tracker.filter(t => t.workstream === 'err')
  const riesgosHitos = tracker.filter(t => t.workstream === 'riesgos')

  const eiaCompletados = eiaHitos.filter(t => t.status === 'completado').length
  const eiaEnCurso = eiaHitos.filter(t => t.status === 'en_curso').length
  const errCompletados = errHitos.filter(t => t.status === 'completado').length
  const errEnCurso = errHitos.filter(t => t.status === 'en_curso').length

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatBox label="Documentos" value={stats.docs} color={C2.navy} />
        <StatBox label="Compromisos abiertos" value={stats.compromisosAbiertos} color="#B45309" />
        <StatBox label="Compromisos vencidos" value={stats.compromisosVencidos} color={C2.red} />
        <StatBox label="EIA · avance" value={`${eiaCompletados}/${eiaHitos.length}`} color={C2.navy} small />
        <StatBox label="ERR · avance" value={`${errCompletados}/${errHitos.length}`} color="#047857" small />
        <StatBox label="PGRD status" value={stats.pgrdVigente ? '✓ Vigente' : 'En gestión'} color={stats.pgrdVigente ? '#047857' : '#B45309'} small />
      </div>

      {/* Alerta compromisos vencidos */}
      {vencidos.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', marginBottom: 6 }}>⚠ {vencidos.length} compromiso{vencidos.length > 1 ? 's' : ''} vencido{vencidos.length > 1 ? 's' : ''}</div>
          {vencidos.slice(0, 4).map(c => (
            <div key={c.id} style={{ fontSize: 12, color: '#7F1D1D', lineHeight: 1.5, padding: '4px 0', borderBottom: '1px solid #FECACA' }}>
              <strong>{c.compromiso}</strong> · {c.contraparte} · {c.territorio || 'Nacional'} · venció {c.fecha_limite}
            </div>
          ))}
          {vencidos.length > 4 && (
            <button onClick={() => onNavigate('compromisos')} style={{ marginTop: 8, background: '#B91C1C', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Ver los {vencidos.length} compromisos vencidos →
            </button>
          )}
        </div>
      )}

      {/* Alerta PGRD */}
      {!stats.pgrdVigente && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>⚠ PGRD + PEC · prerrequisito COD</div>
          <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>
            Por Art. 2.2.3.3.4.14 Decreto 1076/2015 y Decreto 2157/2017. La falta de un PGRD formulado e implementado es infracción ambiental.
            {pgrdKey ? ` Status actual: ${STATUS_PGRD[pgrdKey.status]?.label || pgrdKey.status}.` : ' No se ha creado el registro del plan maestro.'}
          </div>
          <button onClick={() => onNavigate('pgrd')} style={{
            marginTop: 8, background: '#92400E', color: 'white', border: 'none', borderRadius: 6,
            padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif",
          }}>Ir a PGRD →</button>
        </div>
      )}

      {/* ─── Tracker EIA — 12 semanas con Leonardo Cárdenas ─── */}
      <TrackerSection
        title="Tracker EIA — Estudio de Impacto Ambiental"
        subtitle="12 semanas con Leonardo Cárdenas (GAA) · arrancó 5 mayo 2026 · entrega final 27 julio 2026"
        items={eiaHitos}
        canEdit={canEdit}
        reload={reload}
        C2={C2}
        accentColor={C2.navy}
        accentBg="#EEF4FF"
      />

      {/* ─── Seguimiento ERR ─── */}
      <TrackerSection
        title="Embedded Responsibility Report (ERR)"
        subtitle="Workflow con Nadim · GRI + IFRS S2 · target aprobación junio 2026 (soporte ronda de financiamiento)"
        items={errHitos}
        canEdit={canEdit}
        reload={reload}
        C2={C2}
        accentColor="#047857"
        accentBg="#D1FAE5"
      />

      {/* ─── Matriz de Riesgos Ambientales — placeholder ─── */}
      <div style={{ background: 'white', border: `2px dashed ${C2.border}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C2.text, marginBottom: 6 }}>🌱 Matriz de Riesgos Ambientales</div>
        <div style={{ fontSize: 12, color: C2.muted, lineHeight: 1.6 }}>
          Esta matriz se activa cuando Leonardo Cárdenas entregue el <strong>EIA final con el Plan de Manejo Ambiental</strong> y los riesgos identificados (target {riesgosHitos[0]?.fecha_target || '27 julio 2026'}).
          Hasta entonces los riesgos sociales viven en <em>Actores</em> y los institucionales/legislativos en <em>Riesgos Sociales</em>.
        </div>
        {riesgosHitos[0] && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: TRACKER_STATUS[riesgosHitos[0].status]?.color || C2.muted }}>
            <span>{TRACKER_STATUS[riesgosHitos[0].status]?.dot}</span>
            <span>{TRACKER_STATUS[riesgosHitos[0].status]?.label}</span>
            <span style={{ color: C2.muted, fontWeight: 400 }}>· responsable: {riesgosHitos[0].responsable}</span>
          </div>
        )}
      </div>

      {/* Cronograma 60 días */}
      <Card C2={C2} title={`Cronograma próximo · 60 días (${horizonte.length})`} onMore={() => onNavigate('compromisos')}>
        {horizonte.length === 0 ? (
          <Empty msg="Sin hitos ni compromisos en los próximos 60 días." C2={C2} />
        ) : horizonte.map((h, i) => {
          const urgencyColor = h.dias < 0 ? '#B91C1C' : h.dias <= 15 ? '#DC2626' : h.dias <= 30 ? '#D97706' : '#059669'
          return (
            <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${C2.border}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: urgencyColor, marginBottom: 2 }}>
                  {h.tipo} · {h.dias < 0 ? `vencido hace ${-h.dias}d` : h.dias === 0 ? 'hoy' : `en ${h.dias}d`}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C2.text }}>{h.titulo}</div>
                <div style={{ fontSize: 11, color: C2.muted, marginTop: 2 }}>{h.contraparte} · {h.fecha}</div>
              </div>
            </div>
          )
        })}
      </Card>

      {/* Distribución documentos */}
      {docsByType.length > 0 && (
        <Card C2={C2} title="Documentos por tipo">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {docsByType.map(([tipo, n]) => (
              <div key={tipo} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: C2.navy }}>{n}</div>
                <div style={{ fontSize: 11, color: C2.muted, fontWeight: 600 }}>{TIPO_LABEL[tipo] || tipo}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Últimos documentos */}
      <Card C2={C2} title={`Documentos recientes (${docs.length})`} onMore={() => onNavigate('documentos')}>
        {recentDocs.length === 0 ? (
          <Empty msg="Sin documentos ambientales cargados todavía." C2={C2} />
        ) : recentDocs.map(d => (
          <div key={d.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C2.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C2.text }}>{d.titulo}</div>
            <div style={{ fontSize: 11, color: C2.muted, marginTop: 2 }}>
              {TIPO_LABEL[d.tipo] || d.tipo} · {d.autor || '—'} · {d.fecha || 'sin fecha'}
            </div>
          </div>
        ))}
      </Card>

      {/* Compromisos abiertos */}
      <Card C2={C2} title={`Compromisos abiertos (${openCompromisos.length})`} onMore={() => onNavigate('compromisos')}>
        {openCompromisos.length === 0 ? (
          <Empty msg="Sin compromisos ambientales registrados." C2={C2} />
        ) : openCompromisos.map(c => (
          <div key={c.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C2.border}`, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C2.text }}>{c.compromiso}</div>
              <div style={{ fontSize: 11, color: C2.muted, marginTop: 2 }}>
                {c.contraparte} · {c.territorio || 'Nacional'} · vence {c.fecha_limite || 'sin fecha'}
              </div>
            </div>
            <Badge status={STATUS_COMP[c.status]} />
          </div>
        ))}
      </Card>
    </div>
  )
}

// ── Tracker reusable section (EIA, ERR) ──
function TrackerSection({ title, subtitle, items, canEdit, reload, C2, accentColor, accentBg }) {
  const [savingId, setSavingId] = useState(null)
  async function cycleStatus(item) {
    const order = ['pendiente', 'en_curso', 'completado']
    const idx = order.indexOf(item.status)
    const next = order[(idx + 1) % order.length]
    setSavingId(item.id)
    await supabase.from('ambiental_workstream_tracker').update({ status: next, updated_at: new Date().toISOString() }).eq('id', item.id)
    setSavingId(null)
    reload()
  }
  const completados = items.filter(i => i.status === 'completado').length
  const pct = items.length ? Math.round((completados / items.length) * 100) : 0
  return (
    <div style={{ background: 'white', border: `1px solid ${C2.border}`, borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: accentColor }}>{title}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C2.muted }}>{completados}/{items.length} hitos · {pct}%</div>
      </div>
      <div style={{ fontSize: 11, color: C2.muted, marginBottom: 12, lineHeight: 1.5 }}>{subtitle}</div>
      {/* Barra de progreso */}
      <div style={{ height: 6, background: accentBg, borderRadius: 100, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: accentColor, borderRadius: 100, transition: 'width 0.4s' }} />
      </div>
      {items.map(it => {
        const sc = TRACKER_STATUS[it.status] || TRACKER_STATUS.pendiente
        const dias = daysUntil(it.fecha_target)
        const urgency = it.status === 'completado' ? null : (dias === null ? null : dias < 0 ? 'vencido' : dias <= 15 ? 'urgente' : null)
        return (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 10, padding: '10px 0', borderTop: `1px solid ${C2.border}`, alignItems: 'start' }}>
            <button onClick={canEdit ? () => cycleStatus(it) : undefined} disabled={!canEdit || savingId === it.id}
              title={canEdit ? `Click para avanzar status (actual: ${sc.label})` : sc.label}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: `2px solid ${sc.color}`, background: sc.bg, color: sc.color,
                fontSize: 13, fontWeight: 900, cursor: canEdit ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}>{sc.dot}</button>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C2.text }}>{it.titulo}</div>
              {it.descripcion && <div style={{ fontSize: 11, color: C2.muted, marginTop: 3, lineHeight: 1.5 }}>{it.descripcion}</div>}
              <div style={{ fontSize: 10, color: C2.subtle, marginTop: 4, fontWeight: 600 }}>
                {it.responsable && <span>👤 {it.responsable}</span>}
                {it.fecha_target && <span style={{ marginLeft: 8 }}>📅 {it.fecha_target}</span>}
                {urgency === 'vencido' && <span style={{ marginLeft: 8, color: '#B91C1C', fontWeight: 800 }}>· vencido hace {-dias}d</span>}
                {urgency === 'urgente' && <span style={{ marginLeft: 8, color: '#D97706', fontWeight: 800 }}>· en {dias}d</span>}
              </div>
            </div>
            <span style={{ padding: '3px 8px', background: sc.bg, color: sc.color, borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{sc.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Documentos ──
function DocumentosSection({ docs, canEdit, profile, reload, C2 }) {
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave(form) {
    setSaving(true)
    const payload = {
      titulo: form.titulo, tipo: form.tipo, autor: form.autor || null,
      fecha: form.fecha || null, version: form.version || '1.0',
      territorio: form.territorio || null, url: form.url || null,
      descripcion: form.descripcion || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
    }
    let error
    if (editing === 'new') {
      payload.created_by = profile?.id
      ;({ error } = await supabase.from('ambiental_documents').insert(payload))
    } else {
      ;({ error } = await supabase.from('ambiental_documents').update(payload).eq('id', editing.id))
    }
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setEditing(null)
    reload()
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar "${row.titulo}"?`)) return
    const { error } = await supabase.from('ambiental_documents').delete().eq('id', row.id)
    if (error) { alert('Error: ' + error.message); return }
    reload()
  }

  return (
    <div>
      {canEdit && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setEditing('new')} style={primaryBtn(C2)}>+ Subir documento</button>
        </div>
      )}
      {docs.length === 0 ? <Empty msg="Sin documentos todavía." C2={C2} /> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {docs.map(d => (
            <div key={d.id} style={{ background: 'white', border: `1px solid ${C2.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C2.text }}>{d.titulo}</div>
                  <div style={{ fontSize: 11, color: C2.muted, marginTop: 4 }}>
                    {TIPO_LABEL[d.tipo] || d.tipo} · {d.autor || '—'} · {d.fecha || 'sin fecha'} · v{d.version}
                    {d.territorio && ` · ${d.territorio}`}
                  </div>
                  {d.descripcion && <div style={{ fontSize: 12, color: C2.text, marginTop: 8, lineHeight: 1.5 }}>{d.descripcion}</div>}
                  {d.tags && d.tags.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {d.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', background: '#EEF2FF', color: '#4338CA', borderRadius: 10 }}>{t}</span>)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                  {d.url && <a href={d.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C2.blue, fontWeight: 700, textDecoration: 'none' }}>Abrir ↗</a>}
                  {canEdit && <>
                    <button onClick={() => setEditing(d)} style={ghostBtn(C2)}>Editar</button>
                    <button onClick={() => handleDelete(d)} style={{ ...ghostBtn(C2), color: C2.red }}>Borrar</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <DocModal row={editing === 'new' ? null : editing} saving={saving}
          onCancel={() => setEditing(null)} onSave={handleSave} C2={C2} />
      )}
    </div>
  )
}

// ── PGRD + PEC ──
function PGRDSection({ items, canEdit, profile, reload, C2 }) {
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave(form) {
    setSaving(true)
    const payload = {
      componente: form.componente, titulo: form.titulo, status: form.status,
      fecha_estimada: form.fecha_estimada || null, fecha_completado: form.fecha_completado || null,
      responsable: form.responsable || null, autoridad_aprueba: form.autoridad_aprueba || null,
      descripcion: form.descripcion || null, evidencia_url: form.evidencia_url || null,
      prioridad: form.prioridad || 'alta',
    }
    let error
    if (editing === 'new') {
      payload.created_by = profile?.id
      ;({ error } = await supabase.from('ambiental_pgrd').insert(payload))
    } else {
      ;({ error } = await supabase.from('ambiental_pgrd').update(payload).eq('id', editing.id))
    }
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setEditing(null)
    reload()
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar "${row.titulo}"?`)) return
    const { error } = await supabase.from('ambiental_pgrd').delete().eq('id', row.id)
    if (error) { alert('Error: ' + error.message); return }
    reload()
  }

  const COMPONENTE_LABEL = {
    plan_maestro: 'Plan maestro PGRD', pec: 'PEC · Plan de Emergencias',
    simulacro: 'Simulacro', actualizacion: 'Actualización', otro: 'Otro',
  }

  return (
    <div>
      <div style={{ padding: '10px 14px', background: '#FFFBEB', borderLeft: '3px solid #F59E0B', borderRadius: '0 8px 8px 0', fontSize: 12, color: '#78350F', marginBottom: 14, lineHeight: 1.5 }}>
        <strong>Obligatorio · prerrequisito COD.</strong> Art. 2.2.3.3.4.14 Decreto 1076/2015 + Decreto 2157/2017. La falta de PGRD formulado e implementado es infracción ambiental.
      </div>
      {canEdit && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setEditing('new')} style={primaryBtn(C2)}>+ Nuevo componente</button>
        </div>
      )}
      {items.length === 0 ? <Empty msg="No hay componentes PGRD registrados todavía." C2={C2} /> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map(p => (
            <div key={p.id} style={{ background: 'white', border: `1px solid ${C2.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {COMPONENTE_LABEL[p.componente] || p.componente}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C2.text, marginTop: 2 }}>{p.titulo}</div>
                  <div style={{ fontSize: 11, color: C2.muted, marginTop: 4 }}>
                    {p.responsable && `Resp: ${p.responsable} · `}
                    {p.autoridad_aprueba && `Aprueba: ${p.autoridad_aprueba} · `}
                    {p.fecha_estimada && `Est: ${p.fecha_estimada}`}
                    {p.fecha_completado && ` · Completado: ${p.fecha_completado}`}
                  </div>
                  {p.descripcion && <div style={{ fontSize: 12, color: C2.text, marginTop: 8, lineHeight: 1.5 }}>{p.descripcion}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Badge status={STATUS_PGRD[p.status]} />
                  {p.evidencia_url && <a href={p.evidencia_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C2.blue, fontWeight: 700, textDecoration: 'none' }}>Evidencia ↗</a>}
                  {canEdit && <>
                    <button onClick={() => setEditing(p)} style={ghostBtn(C2)}>Editar</button>
                    <button onClick={() => handleDelete(p)} style={{ ...ghostBtn(C2), color: C2.red }}>Borrar</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <PGRDModal row={editing === 'new' ? null : editing} saving={saving}
          onCancel={() => setEditing(null)} onSave={handleSave} C2={C2} />
      )}
    </div>
  )
}

// ── Compromisos ──
function CompromisosSection({ items, canEdit, profile, reload, C2 }) {
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = filterStatus === 'all' ? items : items.filter(c => c.status === filterStatus)

  async function handleSave(form) {
    setSaving(true)
    const payload = {
      compromiso: form.compromiso, contraparte: form.contraparte,
      tipo_contraparte: form.tipo_contraparte || null,
      territorio: form.territorio || null,
      fecha_compromiso: form.fecha_compromiso || null,
      fecha_limite: form.fecha_limite || null,
      status: form.status, responsable: form.responsable || null,
      acuerdo_id: form.acuerdo_id || null,
      evidencia_url: form.evidencia_url || null, notas: form.notas || null,
    }
    let error
    if (editing === 'new') {
      payload.created_by = profile?.id
      ;({ error } = await supabase.from('ambiental_commitments').insert(payload))
    } else {
      ;({ error } = await supabase.from('ambiental_commitments').update(payload).eq('id', editing.id))
    }
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setEditing(null)
    reload()
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar compromiso "${row.compromiso}"?`)) return
    const { error } = await supabase.from('ambiental_commitments').delete().eq('id', row.id)
    if (error) { alert('Error: ' + error.message); return }
    reload()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{
          padding: '6px 10px', border: `1px solid ${C2.border}`, borderRadius: 8,
          fontSize: 12, fontFamily: "Georgia, 'Times New Roman', serif", background: 'white', cursor: 'pointer',
        }}>
          <option value="all">Todos</option>
          {Object.entries(STATUS_COMP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {canEdit && <button onClick={() => setEditing('new')} style={primaryBtn(C2)}>+ Nuevo compromiso</button>}
      </div>
      {filtered.length === 0 ? <Empty msg="Sin compromisos ambientales registrados." C2={C2} /> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: 'white', border: `1px solid ${C2.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C2.text }}>{c.compromiso}</div>
                  <div style={{ fontSize: 11, color: C2.muted, marginTop: 4 }}>
                    <strong>Contraparte:</strong> {c.contraparte} ({c.tipo_contraparte || '—'}) · {c.territorio || 'Nacional'}
                  </div>
                  <div style={{ fontSize: 11, color: C2.muted, marginTop: 2 }}>
                    Compromiso: {c.fecha_compromiso || '—'} · Vence: <strong>{c.fecha_limite || 'sin fecha'}</strong>
                    {c.responsable && ` · Resp: ${c.responsable}`}
                  </div>
                  {c.notas && <div style={{ fontSize: 12, color: C2.text, marginTop: 8, lineHeight: 1.5 }}>{c.notas}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Badge status={STATUS_COMP[c.status]} />
                  {c.evidencia_url && <a href={c.evidencia_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C2.blue, fontWeight: 700, textDecoration: 'none' }}>Evidencia ↗</a>}
                  {canEdit && <>
                    <button onClick={() => setEditing(c)} style={ghostBtn(C2)}>Editar</button>
                    <button onClick={() => handleDelete(c)} style={{ ...ghostBtn(C2), color: C2.red }}>Borrar</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <CompromisoModal row={editing === 'new' ? null : editing} saving={saving}
          onCancel={() => setEditing(null)} onSave={handleSave} C2={C2} />
      )}
    </div>
  )
}

// ── Asesor externo ──
function AsesorSection({ log, docs, canEdit, profile, reload, C2 }) {
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave(form) {
    setSaving(true)
    const payload = {
      asesor: form.asesor || 'Leonardo Cardenas (GAA)',
      tipo_interaccion: form.tipo_interaccion, titulo: form.titulo,
      fecha: form.fecha || new Date().toISOString().slice(0, 10),
      documento_id: form.documento_id || null,
      descripcion: form.descripcion || null, status: form.status || 'completado',
    }
    let error
    if (editing === 'new') {
      payload.created_by = profile?.id
      ;({ error } = await supabase.from('ambiental_advisor_log').insert(payload))
    } else {
      ;({ error } = await supabase.from('ambiental_advisor_log').update(payload).eq('id', editing.id))
    }
    setSaving(false)
    if (error) { alert('Error: ' + error.message); return }
    setEditing(null)
    reload()
  }

  async function handleDelete(row) {
    if (!confirm(`¿Eliminar interacción "${row.titulo}"?`)) return
    const { error } = await supabase.from('ambiental_advisor_log').delete().eq('id', row.id)
    if (error) { alert('Error: ' + error.message); return }
    reload()
  }

  return (
    <div>
      <div style={{ background: 'white', border: `1px solid ${C2.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C2.text }}>Leonardo Cárdenas Méndez</div>
        <div style={{ fontSize: 11, color: C2.muted, marginTop: 2 }}>Global Asesores Ambientales S.A.S · Consultor externo</div>
        <div style={{ fontSize: 12, color: C2.text, marginTop: 8 }}>
          📞 314 320 626 &nbsp;·&nbsp; ✉️ leonardocardenas3@hotmail.com
        </div>
        <div style={{ fontSize: 11, color: C2.muted, marginTop: 6 }}>
          Calle 104 A # 19 A – 70, Bogotá
        </div>
      </div>

      {canEdit && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setEditing('new')} style={primaryBtn(C2)}>+ Nueva interacción</button>
        </div>
      )}

      {log.length === 0 ? <Empty msg="Sin interacciones registradas con el asesor." C2={C2} /> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {log.map(l => (
            <div key={l.id} style={{ background: 'white', border: `1px solid ${C2.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', letterSpacing: 1, textTransform: 'uppercase' }}>{l.tipo_interaccion}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C2.text, marginTop: 2 }}>{l.titulo}</div>
                  <div style={{ fontSize: 11, color: C2.muted, marginTop: 2 }}>{l.fecha}</div>
                  {l.descripcion && <div style={{ fontSize: 12, color: C2.text, marginTop: 6, lineHeight: 1.5 }}>{l.descripcion}</div>}
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                    <button onClick={() => setEditing(l)} style={ghostBtn(C2)}>Editar</button>
                    <button onClick={() => handleDelete(l)} style={{ ...ghostBtn(C2), color: C2.red }}>Borrar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <AdvisorModal row={editing === 'new' ? null : editing} docs={docs} saving={saving}
          onCancel={() => setEditing(null)} onSave={handleSave} C2={C2} />
      )}
    </div>
  )
}

// ── Helpers ──
function StatBox({ label, value, color, small }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: small ? 14 : 22, fontWeight: 800, color }}>{value}</div>
    </div>
  )
}
function Card({ title, onMore, children, C2 }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${C2.border}`, borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C2.text }}>{title}</div>
        {onMore && <button onClick={onMore} style={{ background: 'transparent', border: 'none', color: C2.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>Ver todo →</button>}
      </div>
      {children}
    </div>
  )
}
function Empty({ msg, C2 }) {
  return <div style={{ padding: 24, textAlign: 'center', color: C2.muted, fontSize: 12 }}>{msg}</div>
}
function Badge({ status }) {
  if (!status) return null
  return (
    <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, background: status.bg, color: status.fg, display: 'inline-block' }}>{status.label}</span>
  )
}
const primaryBtn = (C2) => ({
  background: C2.navy, color: 'white', border: 'none', borderRadius: 8,
  padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif",
})
const ghostBtn = (C2) => ({
  background: 'transparent', border: 'none', color: C2.blue,
  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif", padding: '4px 6px',
})
const inputStyle = { width: '100%', padding: '9px 11px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: "Georgia, 'Times New Roman', serif", outline: 'none', boxSizing: 'border-box' }

// ── Modales ──
function ModalShell({ title, children, onCancel, onSave, saving, canSave, C2 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '92vh', overflow: 'auto', padding: '24px 28px', fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: C2.navy }}>{title}</h2>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ padding: '10px 18px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif", color: C2.text }}>Cancelar</button>
          <button onClick={onSave} disabled={!canSave || saving} style={{ padding: '10px 22px', background: C2.navy, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: (canSave && !saving) ? 'pointer' : 'not-allowed', fontFamily: "Georgia, 'Times New Roman', serif", opacity: (canSave && !saving) ? 1 : 0.5 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
function FieldLabel({ children }) {
  return <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{children}</label>
}
function Field({ label, children }) {
  return <div style={{ marginBottom: 12 }}><FieldLabel>{label}</FieldLabel>{children}</div>
}
function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}

// ── Helpers de subida de archivos a SharePoint vía /api/upload-sharepoint ──

const MAX_UPLOAD_BYTES = 4_400_000 // Vercel hobby ≈ 4.5MB platform limit

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadFileToOneDrive(file, { type, territorio }) {
  if (!file) throw new Error('Selecciona un archivo primero.')
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. Bridge solo admite hasta ~4.4MB por la API. Súbelo directo al SharePoint y pega el link en el campo URL.`)
  }
  const fileBase64 = await fileToBase64(file)
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/upload-sharepoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (session?.access_token || ''),
    },
    body: JSON.stringify({
      fileName: file.name,
      fileBase64,
      type,
      territorio: territorio || null,
      contentType: file.type || 'application/octet-stream',
    }),
  })
  const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }))
  if (!res.ok) throw new Error(data.error || 'Falló la subida a OneDrive')
  return data // { webUrl, path }
}

function FileUploadField({ label, type, territorio, onUploaded, C2 }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [okMsg, setOkMsg] = useState(null)
  async function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null); setOkMsg(null)
    try {
      const data = await uploadFileToOneDrive(file, { type, territorio })
      onUploaded(data.webUrl)
      setOkMsg(`✓ Subido: ${file.name}`)
    } catch (err) {
      setError(err.message || 'Error al subir')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <FieldLabel>{label || 'Subir archivo (PDF, DOCX, XLSX, imagen)'}</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input type="file" onChange={handleChange} disabled={uploading}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
          style={{ fontSize: 12, fontFamily: "Georgia, 'Times New Roman', serif" }} />
        {uploading && <div style={{ fontSize: 11, color: C2.blue, fontWeight: 600 }}>Subiendo a OneDrive...</div>}
        {okMsg && <div style={{ fontSize: 11, color: C2.green, fontWeight: 600 }}>{okMsg}</div>}
        {error && <div style={{ fontSize: 11, color: C2.red, fontWeight: 600 }}>⚠ {error}</div>}
        <div style={{ fontSize: 10, color: C2.muted }}>Límite ~4.4MB. Para archivos más grandes, súbelos directo a OneDrive y pega el link en el campo URL.</div>
      </div>
    </div>
  )
}

function DocModal({ row, saving, onCancel, onSave, C2 }) {
  const [f, setF] = useState(() => row ? { ...row, tags: (row.tags || []).join(', ') } : {
    titulo: '', tipo: 'concepto', autor: '', fecha: '', version: '1.0',
    territorio: '', url: '', descripcion: '', tags: '',
  })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  return (
    <ModalShell title={row ? 'Editar documento' : 'Subir documento'} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={!!f.titulo && !!f.tipo} C2={C2}>
      <Field label="Título *"><input value={f.titulo} onChange={e => u('titulo', e.target.value)} style={inputStyle} placeholder="Ej: Concepto ambiental GAA Feb 2025" /></Field>
      <Grid2>
        <Field label="Tipo *">
          <select value={f.tipo} onChange={e => u('tipo', e.target.value)} style={inputStyle}>
            {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Autor"><input value={f.autor} onChange={e => u('autor', e.target.value)} style={inputStyle} placeholder="GAA, ANLA, Consultor..." /></Field>
      </Grid2>
      <Grid2>
        <Field label="Fecha"><input type="date" value={f.fecha || ''} onChange={e => u('fecha', e.target.value)} style={inputStyle} /></Field>
        <Field label="Versión"><input value={f.version} onChange={e => u('version', e.target.value)} style={inputStyle} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Territorio">
          <select value={f.territorio || ''} onChange={e => u('territorio', e.target.value)} style={inputStyle}>
            <option value="">Todos</option>
            <option value="Tolú">Tolú</option>
            <option value="Barbosa">Barbosa</option>
            <option value="Nacional">Nacional</option>
          </select>
        </Field>
        <Field label="URL (OneDrive/SharePoint)"><input value={f.url} onChange={e => u('url', e.target.value)} style={inputStyle} placeholder="https://..." /></Field>
      </Grid2>
      <FileUploadField type="ambiental" territorio={f.territorio}
        onUploaded={webUrl => u('url', webUrl)} C2={C2} />
      <Field label="Descripción"><textarea value={f.descripcion} onChange={e => u('descripcion', e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></Field>
      <Field label="Tags (separados por coma)"><input value={f.tags} onChange={e => u('tags', e.target.value)} style={inputStyle} placeholder="marpol, off-shore, licencia" /></Field>
    </ModalShell>
  )
}

function PGRDModal({ row, saving, onCancel, onSave, C2 }) {
  const [f, setF] = useState(() => row || {
    componente: 'plan_maestro', titulo: '', status: 'pendiente',
    fecha_estimada: '', fecha_completado: '', responsable: '', autoridad_aprueba: '',
    descripcion: '', evidencia_url: '', prioridad: 'alta',
  })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  return (
    <ModalShell title={row ? 'Editar componente PGRD' : 'Nuevo componente PGRD'} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={!!f.titulo && !!f.componente} C2={C2}>
      <Grid2>
        <Field label="Componente *">
          <select value={f.componente} onChange={e => u('componente', e.target.value)} style={inputStyle}>
            <option value="plan_maestro">Plan maestro PGRD</option>
            <option value="pec">PEC · Plan de Emergencias</option>
            <option value="simulacro">Simulacro</option>
            <option value="actualizacion">Actualización</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Status *">
          <select value={f.status} onChange={e => u('status', e.target.value)} style={inputStyle}>
            {Object.entries(STATUS_PGRD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </Grid2>
      <Field label="Prioridad">
        <select value={f.prioridad} onChange={e => u('prioridad', e.target.value)} style={inputStyle}>
          {['alta', 'media', 'baja'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </Field>
      <Field label="Título *"><input value={f.titulo} onChange={e => u('titulo', e.target.value)} style={inputStyle} placeholder="Ej: Plan Maestro PGRD v1.0 operación Tolú" /></Field>
      <Grid2>
        <Field label="Fecha estimada"><input type="date" value={f.fecha_estimada || ''} onChange={e => u('fecha_estimada', e.target.value)} style={inputStyle} /></Field>
        <Field label="Fecha completado"><input type="date" value={f.fecha_completado || ''} onChange={e => u('fecha_completado', e.target.value)} style={inputStyle} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Responsable"><input value={f.responsable} onChange={e => u('responsable', e.target.value)} style={inputStyle} /></Field>
        <Field label="Autoridad aprueba"><input value={f.autoridad_aprueba} onChange={e => u('autoridad_aprueba', e.target.value)} style={inputStyle} placeholder="ANLA / UNGRD / CARSUCRE" /></Field>
      </Grid2>
      <Field label="Descripción"><textarea value={f.descripcion} onChange={e => u('descripcion', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} /></Field>
      <Field label="URL evidencia"><input value={f.evidencia_url} onChange={e => u('evidencia_url', e.target.value)} style={inputStyle} /></Field>
      <FileUploadField type="pgrd" territorio={null}
        onUploaded={webUrl => u('evidencia_url', webUrl)} C2={C2} />
    </ModalShell>
  )
}

function CompromisoModal({ row, saving, onCancel, onSave, C2 }) {
  const [f, setF] = useState(() => row || {
    compromiso: '', contraparte: '', tipo_contraparte: 'autoridad',
    territorio: '', fecha_compromiso: '', fecha_limite: '',
    status: 'abierto', responsable: '', acuerdo_id: '', evidencia_url: '', notas: '',
  })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  return (
    <ModalShell title={row ? 'Editar compromiso' : 'Nuevo compromiso'} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={!!f.compromiso && !!f.contraparte} C2={C2}>
      <Field label="Compromiso *"><input value={f.compromiso} onChange={e => u('compromiso', e.target.value)} style={inputStyle} placeholder="Ej: Entregar informe trimestral a CARSUCRE" /></Field>
      <Grid2>
        <Field label="Contraparte *"><input value={f.contraparte} onChange={e => u('contraparte', e.target.value)} style={inputStyle} placeholder="CARSUCRE, EPM, Consejo Comunitario X" /></Field>
        <Field label="Tipo contraparte">
          <select value={f.tipo_contraparte || ''} onChange={e => u('tipo_contraparte', e.target.value)} style={inputStyle}>
            <option value="">—</option>
            <option value="autoridad">Autoridad</option>
            <option value="comunidad">Comunidad</option>
            <option value="empresa">Empresa</option>
            <option value="interno">Interno</option>
          </select>
        </Field>
      </Grid2>
      <Grid2>
        <Field label="Territorio">
          <select value={f.territorio || ''} onChange={e => u('territorio', e.target.value)} style={inputStyle}>
            <option value="">—</option>
            <option value="Tolú">Tolú</option>
            <option value="Barbosa">Barbosa</option>
            <option value="Nacional">Nacional</option>
          </select>
        </Field>
        <Field label="Status *">
          <select value={f.status} onChange={e => u('status', e.target.value)} style={inputStyle}>
            {Object.entries(STATUS_COMP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </Grid2>
      <Grid2>
        <Field label="Fecha compromiso"><input type="date" value={f.fecha_compromiso || ''} onChange={e => u('fecha_compromiso', e.target.value)} style={inputStyle} /></Field>
        <Field label="Fecha límite"><input type="date" value={f.fecha_limite || ''} onChange={e => u('fecha_limite', e.target.value)} style={inputStyle} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Responsable"><input value={f.responsable} onChange={e => u('responsable', e.target.value)} style={inputStyle} /></Field>
        <Field label="ID acuerdo (si aplica)"><input value={f.acuerdo_id} onChange={e => u('acuerdo_id', e.target.value)} style={inputStyle} placeholder="B1, B2, T1..." /></Field>
      </Grid2>
      <Field label="URL evidencia"><input value={f.evidencia_url} onChange={e => u('evidencia_url', e.target.value)} style={inputStyle} /></Field>
      <FileUploadField type="compromiso" territorio={f.territorio}
        onUploaded={webUrl => u('evidencia_url', webUrl)} C2={C2} />
      <Field label="Notas"><textarea value={f.notas} onChange={e => u('notas', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} /></Field>
    </ModalShell>
  )
}

function AdvisorModal({ row, docs, saving, onCancel, onSave, C2 }) {
  const [f, setF] = useState(() => row || {
    asesor: 'Leonardo Cardenas (GAA)', tipo_interaccion: 'entrega',
    titulo: '', fecha: new Date().toISOString().slice(0, 10),
    documento_id: '', descripcion: '', status: 'completado',
  })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  return (
    <ModalShell title={row ? 'Editar interacción' : 'Nueva interacción con asesor'} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={!!f.titulo && !!f.tipo_interaccion} C2={C2}>
      <Grid2>
        <Field label="Asesor"><input value={f.asesor} onChange={e => u('asesor', e.target.value)} style={inputStyle} /></Field>
        <Field label="Tipo interacción *">
          <select value={f.tipo_interaccion} onChange={e => u('tipo_interaccion', e.target.value)} style={inputStyle}>
            <option value="solicitud">Solicitud</option>
            <option value="entrega">Entrega</option>
            <option value="reunion">Reunión</option>
            <option value="revision">Revisión</option>
            <option value="concepto">Concepto</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
      </Grid2>
      <Field label="Título *"><input value={f.titulo} onChange={e => u('titulo', e.target.value)} style={inputStyle} placeholder="Ej: Entrega concepto ambiental" /></Field>
      <Grid2>
        <Field label="Fecha"><input type="date" value={f.fecha} onChange={e => u('fecha', e.target.value)} style={inputStyle} /></Field>
        <Field label="Status">
          <select value={f.status} onChange={e => u('status', e.target.value)} style={inputStyle}>
            <option value="solicitado">Solicitado</option>
            <option value="en_progreso">En progreso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
      </Grid2>
      <Field label="Documento asociado (opcional)">
        <select value={f.documento_id || ''} onChange={e => u('documento_id', e.target.value)} style={inputStyle}>
          <option value="">—</option>
          {docs.map(d => <option key={d.id} value={d.id}>{d.titulo}</option>)}
        </select>
      </Field>
      <Field label="Descripción"><textarea value={f.descripcion} onChange={e => u('descripcion', e.target.value)} style={{ ...inputStyle, minHeight: 60 }} /></Field>
    </ModalShell>
  )
}
