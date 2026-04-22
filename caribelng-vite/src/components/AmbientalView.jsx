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
  const [loading, setLoading] = useState(true)

  const canEdit = profile?.role === 'admin' || profile?.ambiental_access === 'full'

  async function loadAll() {
    setLoading(true)
    const [d, p, c, a] = await Promise.all([
      supabase.from('ambiental_documents').select('*').order('fecha', { ascending: false, nullsFirst: false }),
      supabase.from('ambiental_pgrd').select('*').order('fecha_estimada', { ascending: true, nullsFirst: false }),
      supabase.from('ambiental_commitments').select('*').order('fecha_limite', { ascending: true, nullsFirst: false }),
      supabase.from('ambiental_advisor_log').select('*').order('fecha', { ascending: false }),
    ])
    setDocs(d.data || [])
    setPgrd(p.data || [])
    setCommitments(c.data || [])
    setAdvisorLog(a.data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const stats = useMemo(() => ({
    docs: docs.length,
    compromisosAbiertos: commitments.filter(c => c.status === 'abierto' || c.status === 'en_progreso').length,
    compromisosVencidos: commitments.filter(c => c.status === 'vencido').length,
    pgrdVigente: pgrd.some(p => p.componente === 'plan_maestro' && (p.status === 'aprobado' || p.status === 'vigente')),
  }), [docs, commitments, pgrd])

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
        {!canEdit && (
          <span style={{ padding: '4px 10px', background: '#F1F5F9', color: '#64748B', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            VISTA DE LECTURA
          </span>
        )}
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
            cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            whiteSpace: 'nowrap',
          }}>{l}</button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: C2.muted }}>Cargando ambiental...</div>}

      {!loading && subtab === 'dashboard' && (
        <DashboardAmbiental docs={docs} pgrd={pgrd} commitments={commitments} advisorLog={advisorLog} stats={stats} C2={C2} onNavigate={setSubtab} />
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
function DashboardAmbiental({ docs, pgrd, commitments, advisorLog, stats, C2, onNavigate }) {
  const recentDocs = docs.slice(0, 4)
  const openCompromisos = commitments.filter(c => c.status === 'abierto' || c.status === 'en_progreso').slice(0, 5)
  const pgrdKey = pgrd.find(p => p.componente === 'plan_maestro')
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatBox label="Documentos" value={stats.docs} color={C2.navy} />
        <StatBox label="Compromisos abiertos" value={stats.compromisosAbiertos} color="#B45309" />
        <StatBox label="Compromisos vencidos" value={stats.compromisosVencidos} color={C2.red} />
        <StatBox label="PGRD status" value={stats.pgrdVigente ? '✓ Vigente' : 'En gestión'} color={stats.pgrdVigente ? '#047857' : '#B45309'} small />
      </div>

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
            padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
          }}>Ir a PGRD →</button>
        </div>
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
          fontSize: 12, fontFamily: 'Montserrat, sans-serif', background: 'white', cursor: 'pointer',
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
        {onMore && <button onClick={onMore} style={{ background: 'transparent', border: 'none', color: C2.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Ver todo →</button>}
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
  padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
})
const ghostBtn = (C2) => ({
  background: 'transparent', border: 'none', color: C2.blue,
  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', padding: '4px 6px',
})
const inputStyle = { width: '100%', padding: '9px 11px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box' }

// ── Modales ──
function ModalShell({ title, children, onCancel, onSave, saving, canSave, C2 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 620, maxHeight: '92vh', overflow: 'auto', padding: '24px 28px', fontFamily: 'Montserrat, sans-serif' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: C2.navy }}>{title}</h2>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button onClick={onCancel} style={{ padding: '10px 18px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', color: C2.text }}>Cancelar</button>
          <button onClick={onSave} disabled={!canSave || saving} style={{ padding: '10px 22px', background: C2.navy, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: (canSave && !saving) ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat, sans-serif', opacity: (canSave && !saving) ? 1 : 0.5 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
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
