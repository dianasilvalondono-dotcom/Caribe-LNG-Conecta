import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/constants'

// IMPORTANTE: estos valores deben coincidir EXACTO con el CHECK constraint de la tabla pqrs.
const TIPOS = ['Petición', 'Queja', 'Reclamo', 'Sugerencia']
const TERRITORIOS = ['Tolú', 'Barbosa', 'Nacional']
const CANALES = ['Presencial', 'Teléfono', 'WhatsApp', 'Correo', 'Buzón físico', 'Reunión', 'Redes sociales', 'Otro']
const PRIORIDADES = ['Alta', 'Media', 'Baja']

const ESTADOS = {
  recibido:   { label: 'Recibido',    color: '#1D4ED8', bg: '#DBEAFE' },
  en_gestion: { label: 'En gestión',  color: '#B45309', bg: '#FEF3C7' },
  resuelto:   { label: 'Resuelto',    color: '#047857', bg: '#D1FAE5' },
  cerrado:    { label: 'Cerrado',     color: '#64748B', bg: '#F1F5F9' },
}
const TIPO_COLOR = {
  'Petición': '#1565C0', 'Queja': '#DC2626', 'Reclamo': '#B91C1C', 'Sugerencia': '#7C3AED',
}
const PRIO_COLOR = { Alta: '#DC2626', Media: '#F59E0B', Baja: '#64748B' }
const ABIERTOS = ['recibido', 'en_gestion']

function daysAgo(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((today - d) / (1000 * 60 * 60 * 24))
}
function isVencido(p) {
  return ABIERTOS.includes(p.estado) && p.fecha_limite && new Date(p.fecha_limite + 'T23:59:59') < new Date()
}
function genRadicado() {
  const y = new Date().getFullYear()
  return `PQRS-${y}-${String(Date.now()).slice(-5)}`
}

export default function PqrsView({ profile, isAdmin }) {
  const seesAll = isAdmin || profile?.role === 'supervisor'
  const myTerritorio = profile?.territorio
  const canDelete = profile?.role === 'admin'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [terrFilter, setTerrFilter] = useState('Todos')
  const [tipoFilter, setTipoFilter] = useState('Todos')
  const [estadoFilter, setEstadoFilter] = useState('abiertos')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // 'new' | row
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  async function loadAll() {
    setLoading(true)
    const { data, error } = await supabase.from('pqrs').select('*').order('fecha_recibido', { ascending: false })
    if (error) console.error('[pqrs] load:', error.message)
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  // Base visible segun rol/territorio
  const base = useMemo(() => (
    rows.filter(p => seesAll ? true : (myTerritorio ? p.territorio === myTerritorio : true))
  ), [rows, seesAll, myTerritorio])

  const filtered = useMemo(() => base.filter(p => {
    if (terrFilter !== 'Todos' && p.territorio !== terrFilter) return false
    if (tipoFilter !== 'Todos' && p.tipo !== tipoFilter) return false
    if (estadoFilter === 'abiertos' && !ABIERTOS.includes(p.estado)) return false
    if (estadoFilter === 'cerrados' && ABIERTOS.includes(p.estado)) return false
    if (estadoFilter !== 'abiertos' && estadoFilter !== 'cerrados' && estadoFilter !== 'Todos' && p.estado !== estadoFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [p.asunto, p.descripcion, p.solicitante_nombre, p.radicado, p.responsable]
        .some(v => (v || '').toLowerCase().includes(q))
      if (!hay) return false
    }
    return true
  }), [base, terrFilter, tipoFilter, estadoFilter, search])

  // KPIs (sobre lo visible por rol)
  const abiertos = base.filter(p => ABIERTOS.includes(p.estado)).length
  const vencidos = base.filter(isVencido).length
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
  const nuevos30 = base.filter(p => p.fecha_recibido && new Date(p.fecha_recibido + 'T00:00:00') >= hace30).length
  const resueltos = base.filter(p => !ABIERTOS.includes(p.estado)).length

  async function savePqrs(form) {
    setSaving(true)
    const payload = {
      tipo: form.tipo,
      territorio: form.territorio || null,
      canal: form.canal || null,
      fecha_recibido: form.fecha_recibido,
      solicitante_nombre: form.solicitante_nombre?.trim() || null,
      solicitante_contacto: form.solicitante_contacto?.trim() || null,
      asunto: form.asunto.trim(),
      descripcion: form.descripcion?.trim() || null,
      prioridad: form.prioridad,
      estado: form.estado,
      responsable: form.responsable?.trim() || null,
      respuesta: form.respuesta?.trim() || null,
      fecha_limite: form.fecha_limite || null,
      fecha_cierre: (!ABIERTOS.includes(form.estado)) ? (form.fecha_cierre || new Date().toISOString().slice(0, 10)) : null,
      updated_at: new Date().toISOString(),
    }
    let error
    if (editing === 'new') {
      payload.radicado = genRadicado()
      payload.created_by = profile?.id
      ;({ error } = await supabase.from('pqrs').insert(payload))
    } else {
      ;({ error } = await supabase.from('pqrs').update(payload).eq('id', editing.id))
    }
    setSaving(false)
    if (error) return alert('No se pudo guardar: ' + error.message)
    setEditing(null); setSelected(null)
    await loadAll()
  }

  async function cambiarEstado(p, nuevoEstado) {
    const patch = { estado: nuevoEstado, updated_at: new Date().toISOString() }
    if (!ABIERTOS.includes(nuevoEstado) && !p.fecha_cierre) patch.fecha_cierre = new Date().toISOString().slice(0, 10)
    if (ABIERTOS.includes(nuevoEstado)) patch.fecha_cierre = null
    const { error } = await supabase.from('pqrs').update(patch).eq('id', p.id)
    if (error) return alert('No se pudo actualizar: ' + error.message)
    await loadAll()
    setSelected(s => s ? { ...s, ...patch } : s)
  }

  async function deletePqrs(p) {
    if (!confirm(`¿Borrar el PQRS "${p.asunto}" (${p.radicado})? No se puede deshacer.`)) return
    const { error } = await supabase.from('pqrs').delete().eq('id', p.id)
    if (error) return alert('No se pudo borrar: ' + error.message)
    setSelected(null)
    await loadAll()
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>PQRS</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
            Peticiones, Quejas, Reclamos y Sugerencias · registro y seguimiento
            {!seesAll && myTerritorio ? ` · ${myTerritorio}` : ''}
          </p>
        </div>
        <button onClick={() => setEditing('new')} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
          + Registrar PQRS
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        <KpiBox label="Abiertos" value={abiertos} color={C.navy} onClick={() => setEstadoFilter('abiertos')} />
        <KpiBox label="Vencidos (fuera de plazo)" value={vencidos} color={vencidos > 0 ? '#B91C1C' : '#64748B'} onClick={() => setEstadoFilter('abiertos')} />
        <KpiBox label="Nuevos · últimos 30d" value={nuevos30} color="#7C3AED" />
        <KpiBox label="Resueltos / cerrados" value={resueltos} color="#047857" onClick={() => setEstadoFilter('cerrados')} />
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por asunto, radicado, solicitante..."
          style={{ flex: '1 1 220px', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} style={selectStyle()}>
          <option value="abiertos">Estado: Abiertos</option>
          <option value="cerrados">Estado: Cerrados</option>
          <option value="Todos">Estado: Todos</option>
          {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {seesAll && (
          <select value={terrFilter} onChange={e => setTerrFilter(e.target.value)} style={selectStyle()}>
            <option value="Todos">Territorio: Todos</option>
            {TERRITORIOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} style={selectStyle()}>
          <option value="Todos">Tipo: Todos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Cargando PQRS...</div>}

      {/* Lista */}
      {!loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ background: 'white', border: `1px dashed ${C.border}`, borderRadius: 12, padding: 30, textAlign: 'center', color: C.muted }}>
              No hay PQRS que coincidan con los filtros.
            </div>
          ) : filtered.map(p => {
            const est = ESTADOS[p.estado] || ESTADOS.recibido
            const venc = isVencido(p)
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{ background: 'white', border: `1px solid ${venc ? '#FCA5A5' : C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', borderLeft: `4px solid ${TIPO_COLOR[p.tipo] || C.navy}`, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ padding: '2px 8px', background: `${TIPO_COLOR[p.tipo] || C.navy}15`, color: TIPO_COLOR[p.tipo] || C.navy, borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.tipo}</span>
                      <span style={{ padding: '2px 8px', background: est.bg, color: est.color, borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{est.label}</span>
                      {venc && <span style={{ padding: '2px 8px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vencido</span>}
                      <span style={{ fontSize: 10, color: C.subtle, fontWeight: 700 }}>{p.radicado}</span>
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: C.text }}>{p.asunto}</h3>
                    <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>📍 {p.territorio || 'Sin territorio'}</span>
                      {p.canal && <span>· 📥 {p.canal}</span>}
                      {p.solicitante_nombre && <span>· 👤 {p.solicitante_nombre}</span>}
                      {p.responsable && <span>· 🧑‍💼 {p.responsable}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: venc ? '#B91C1C' : C.subtle, fontWeight: 700 }}>
                      {p.fecha_recibido ? `hace ${daysAgo(p.fecha_recibido)}d` : ''}
                    </div>
                    {p.prioridad && <div style={{ fontSize: 10, color: PRIO_COLOR[p.prioridad], fontWeight: 800, textTransform: 'uppercase', marginTop: 3 }}>{p.prioridad}</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <PqrsModal row={editing === 'new' ? null : editing} seesAll={seesAll} myTerritorio={myTerritorio}
          onCancel={() => setEditing(null)} onSave={savePqrs} saving={saving} />
      )}

      {selected && (
        <DetalleModal p={selected} canDelete={canDelete}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected) }}
          onDelete={() => deletePqrs(selected)}
          onEstado={(e) => cambiarEstado(selected, e)} />
      )}
    </div>
  )
}

// ── Sub-componentes ──

function KpiBox({ label, value, color, onClick }) {
  return (
    <div onClick={onClick} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function selectStyle() {
  return { padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: C.navy, background: 'white', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }
}
function inputStyle() {
  return { width: '100%', padding: '8px 11px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box' }
}

function PqrsModal({ row, seesAll, myTerritorio, onCancel, onSave, saving }) {
  const [f, setF] = useState(() => row ? {
    ...row,
    fecha_recibido: row.fecha_recibido || new Date().toISOString().slice(0, 10),
  } : {
    tipo: 'Petición',
    territorio: seesAll ? '' : (myTerritorio || ''),
    canal: 'Presencial',
    fecha_recibido: new Date().toISOString().slice(0, 10),
    solicitante_nombre: '', solicitante_contacto: '',
    asunto: '', descripcion: '',
    prioridad: 'Media', estado: 'recibido',
    responsable: '', respuesta: '', fecha_limite: '', fecha_cierre: '',
  })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  const cerrado = !ABIERTOS.includes(f.estado)
  return (
    <Modal title={row ? `Editar ${row.radicado || 'PQRS'}` : 'Registrar PQRS'} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={!!f.asunto.trim() && !!f.tipo && !!f.fecha_recibido}>
      <Grid2>
        <Field label="Tipo *">
          <select value={f.tipo} onChange={e => u('tipo', e.target.value)} style={inputStyle()}>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Prioridad">
          <select value={f.prioridad} onChange={e => u('prioridad', e.target.value)} style={inputStyle()}>
            {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </Grid2>
      <Field label="Asunto *">
        <input value={f.asunto} onChange={e => u('asunto', e.target.value)} style={inputStyle()} placeholder="Resumen corto del PQRS" />
      </Field>
      <Field label="Descripción / detalle">
        <textarea value={f.descripcion} onChange={e => u('descripcion', e.target.value)} rows={3}
          style={{ ...inputStyle(), resize: 'vertical', minHeight: 64 }} placeholder="¿Qué solicita, reclama o sugiere?" />
      </Field>
      <Grid2>
        <Field label="Territorio">
          <select value={f.territorio} onChange={e => u('territorio', e.target.value)} style={inputStyle()} disabled={!seesAll && !!myTerritorio}>
            <option value="">—</option>
            {TERRITORIOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Canal de ingreso">
          <select value={f.canal} onChange={e => u('canal', e.target.value)} style={inputStyle()}>
            {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </Grid2>
      <Grid2>
        <Field label="Fecha recibido *"><input type="date" value={f.fecha_recibido} onChange={e => u('fecha_recibido', e.target.value)} style={inputStyle()} /></Field>
        <Field label="Fecha límite (compromiso)"><input type="date" value={f.fecha_limite || ''} onChange={e => u('fecha_limite', e.target.value)} style={inputStyle()} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Solicitante · Nombre (opcional)"><input value={f.solicitante_nombre} onChange={e => u('solicitante_nombre', e.target.value)} style={inputStyle()} placeholder="Puede ser anónimo" /></Field>
        <Field label="Solicitante · Contacto"><input value={f.solicitante_contacto} onChange={e => u('solicitante_contacto', e.target.value)} style={inputStyle()} placeholder="Tel / correo" /></Field>
      </Grid2>
      <Grid2>
        <Field label="Estado">
          <select value={f.estado} onChange={e => u('estado', e.target.value)} style={inputStyle()}>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="Responsable"><input value={f.responsable} onChange={e => u('responsable', e.target.value)} style={inputStyle()} placeholder="Quién lo gestiona" /></Field>
      </Grid2>
      <Field label={cerrado ? 'Respuesta / cómo se resolvió' : 'Respuesta / avance (opcional)'}>
        <textarea value={f.respuesta} onChange={e => u('respuesta', e.target.value)} rows={2}
          style={{ ...inputStyle(), resize: 'vertical', minHeight: 50 }} />
      </Field>
    </Modal>
  )
}

function DetalleModal({ p, canDelete, onClose, onEdit, onDelete, onEstado }) {
  const est = ESTADOS[p.estado] || ESTADOS.recibido
  const venc = isVencido(p)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ padding: '3px 9px', background: `${TIPO_COLOR[p.tipo] || C.navy}15`, color: TIPO_COLOR[p.tipo] || C.navy, borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.tipo}</span>
              <span style={{ padding: '3px 9px', background: est.bg, color: est.color, borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{est.label}</span>
              {venc && <span style={{ padding: '3px 9px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vencido</span>}
            </div>
            <h2 style={{ margin: '0 0 2px', fontSize: 19, fontWeight: 800, color: C.text }}>{p.asunto}</h2>
            <div style={{ fontSize: 12, color: C.muted }}>{p.radicado} · recibido {p.fecha_recibido}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>

        {p.descripcion && (
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            {p.descripcion}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 14, fontSize: 12 }}>
          {p.territorio && <KV label="Territorio" value={p.territorio} />}
          {p.canal && <KV label="Canal" value={p.canal} />}
          {p.prioridad && <KV label="Prioridad" value={p.prioridad} />}
          {p.responsable && <KV label="Responsable" value={p.responsable} />}
          {p.solicitante_nombre && <KV label="Solicitante" value={p.solicitante_nombre} />}
          {p.solicitante_contacto && <KV label="Contacto" value={p.solicitante_contacto} />}
          {p.fecha_limite && <KV label="Fecha límite" value={p.fecha_limite} />}
          {p.fecha_cierre && <KV label="Fecha cierre" value={p.fecha_cierre} />}
        </div>

        {p.respuesta && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Respuesta / gestión</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px' }}>{p.respuesta}</div>
          </div>
        )}

        {/* Cambiar estado rapido */}
        <div style={{ marginTop: 6, marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Mover a estado</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <button key={k} onClick={() => onEstado(k)} disabled={p.estado === k}
                style={{ padding: '6px 12px', border: `1.5px solid ${p.estado === k ? v.color : C.border}`, background: p.estado === k ? v.bg : 'white', color: p.estado === k ? v.color : C.text, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: p.estado === k ? 'default' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onEdit} style={{ flex: 1, background: '#EEF2FF', color: C.navy, border: `1px solid ${C.navy}44`, borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
            ✎ Editar / responder
          </button>
          {canDelete && (
            <button onClick={onDelete} style={{ background: '#FEF2F2', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
              🗑 Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Modal({ title, children, onCancel, onSave, saving, canSave }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 22, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>{title}</h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>Cancelar</button>
          <button onClick={onSave} disabled={!canSave || saving}
            style={{ padding: '9px 20px', background: C.navy, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: (canSave && !saving) ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat, sans-serif', opacity: (canSave && !saving) ? 1 : 0.5 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}
function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{children}</div>
}
function KV({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  )
}
