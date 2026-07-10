import { useEffect, useMemo, useState } from 'react'
import { supabase, uploadPqrsDoc } from '../lib/supabase'
import { C } from '../lib/constants'
import PqrsRespuesta from './PqrsRespuesta'

// ── Catálogos (deben coincidir EXACTO con los CHECK de la tabla pqrs) ──
const TIPO_SOLICITUD = ['PETICIÓN', 'QUEJA', 'RECLAMO', 'SUGERENCIA', 'FELICITACIÓN']
const ESTADOS_LIST = ['RECIBIDA', 'EN ANÁLISIS', 'EN TRÁMITE', 'RESUELTA', 'CERRADA']
const TERRITORIOS = ['Tolú', 'Barbosa', 'Nacional']
const TIPO_DOCUMENTO = ['Cédula de ciudadanía', 'Cédula de extranjería', 'NIT', 'Pasaporte', 'Otro']
const MEDIO_RECEPCION = ['Correo', 'Presencial', 'Teléfono', 'WhatsApp', 'Buzón físico', 'Reunión', 'Oficio', 'Otro']
const NIVEL_3 = ['Alto', 'Medio', 'Bajo']
const RESULTADO = ['Aprobada', 'Negada', 'Parcial', 'En definición']
const AREA_RESPONSABLE = ['Gestión Social', 'Asuntos Corporativos', 'Jurídica', 'Operaciones', 'Comercial', 'Financiera']

const ABIERTOS = ['RECIBIDA', 'EN ANÁLISIS', 'EN TRÁMITE']

const ESTADO_STYLE = {
  'RECIBIDA':    { color: '#1D4ED8', bg: '#DBEAFE' },
  'EN ANÁLISIS': { color: '#B45309', bg: '#FEF3C7' },
  'EN TRÁMITE':  { color: '#7C3AED', bg: '#EDE9FE' },
  'RESUELTA':    { color: '#047857', bg: '#D1FAE5' },
  'CERRADA':     { color: '#64748B', bg: '#F1F5F9' },
}
const TIPO_COLOR = {
  'PETICIÓN': '#1565C0', 'QUEJA': '#DC2626', 'RECLAMO': '#B91C1C', 'SUGERENCIA': '#7C3AED', 'FELICITACIÓN': '#047857',
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((today - d) / (1000 * 60 * 60 * 24))
}
function isVencido(p) {
  return ABIERTOS.includes(p.estado_actual) && p.fecha_cierre && new Date(p.fecha_cierre + 'T23:59:59') < new Date()
}
function primerasPalabras(txt, n = 14) {
  if (!txt) return ''
  const w = txt.trim().split(/\s+/)
  return w.slice(0, n).join(' ') + (w.length > n ? '…' : '')
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
  const [respuestaFor, setRespuestaFor] = useState(null) // row para generar carta

  async function loadAll() {
    setLoading(true)
    const { data, error } = await supabase.from('pqrs').select('*').order('fecha_recepcion', { ascending: false })
    if (error) console.error('[pqrs] load:', error.message)
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  // Base visible según rol/territorio
  const base = useMemo(() => (
    rows.filter(p => seesAll ? true : (myTerritorio ? p.territorio === myTerritorio : true))
  ), [rows, seesAll, myTerritorio])

  const filtered = useMemo(() => base.filter(p => {
    if (terrFilter !== 'Todos' && p.territorio !== terrFilter) return false
    if (tipoFilter !== 'Todos' && p.tipo_solicitud !== tipoFilter) return false
    if (estadoFilter === 'abiertos' && !ABIERTOS.includes(p.estado_actual)) return false
    if (estadoFilter === 'cerrados' && ABIERTOS.includes(p.estado_actual)) return false
    if (estadoFilter === 'vencidos' && !isVencido(p)) return false
    if (!['abiertos', 'cerrados', 'vencidos', 'Todos'].includes(estadoFilter) && p.estado_actual !== estadoFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = [p.codigo, p.numero_documental, p.descripcion, p.solicitante_nombre, p.organizacion, p.profesional_responsable, p.categoria_tema]
        .some(v => (v || '').toLowerCase().includes(q))
      if (!hay) return false
    }
    return true
  }), [base, terrFilter, tipoFilter, estadoFilter, search])

  // KPIs (sobre lo visible por rol)
  const abiertos = base.filter(p => ABIERTOS.includes(p.estado_actual)).length
  const vencidos = base.filter(isVencido).length
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
  const nuevos30 = base.filter(p => p.fecha_recepcion && new Date(p.fecha_recepcion + 'T00:00:00') >= hace30).length
  const resueltos = base.filter(p => !ABIERTOS.includes(p.estado_actual)).length

  // Radicado automático: YYYYMMDD-NN según fecha_recepcion + consecutivo del día.
  // Consulta la BD (no las filas en memoria, que pueden estar paginadas o
  // filtradas por RLS) y toma el consecutivo mayor del día + 1.
  // NOTA: el único consecutivo 100% atómico y a prueba de concurrencia sería
  // una secuencia/RPC en Postgres; pendiente de crear (ver SQL para Diana).
  async function generarCodigo(fechaRecepcion) {
    const ymd = (fechaRecepcion || new Date().toISOString().slice(0, 10)).replaceAll('-', '')
    let maxNN = 0
    try {
      const { data } = await supabase.from('pqrs').select('codigo').like('codigo', `${ymd}-%`)
      for (const r of (data || [])) {
        const m = /-(\d+)$/.exec(r.codigo || '')
        if (m) maxNN = Math.max(maxNN, parseInt(m[1], 10))
      }
    } catch { /* si falla la consulta, cae al conteo en memoria abajo */ }
    if (maxNN === 0) {
      maxNN = rows.filter(p => (p.fecha_recepcion || '').replaceAll('-', '') === ymd).length
    }
    const nn = String(maxNN + 1).padStart(2, '0')
    return `${ymd}-${nn}`
  }

  async function savePqrs(form) {
    setSaving(true)
    const payload = {
      fecha_recepcion: form.fecha_recepcion || null,
      hora_recepcion: form.hora_recepcion || null,
      medio_recepcion: form.medio_recepcion || null,
      territorio: form.territorio || null,
      solicitante_nombre: form.solicitante_nombre?.trim() || null,
      tipo_documento: form.tipo_documento || null,
      numero_doc: form.numero_doc?.trim() || null,
      telefono: form.telefono?.trim() || null,
      correo: form.correo?.trim() || null,
      organizacion: form.organizacion?.trim() || null,
      cargo: form.cargo?.trim() || null,
      tipo_solicitud: form.tipo_solicitud,
      descripcion: form.descripcion?.trim() || null,
      lugar_ocurrencia: form.lugar_ocurrencia?.trim() || null,
      tipo_afectacion: form.tipo_afectacion?.trim() || null,
      categoria_tema: form.categoria_tema?.trim() || null,
      nivel_impacto: form.nivel_impacto || null,
      actor_estrategico: form.actor_estrategico?.trim() || null,
      influencia: form.influencia || null,
      riesgo_conflictividad: form.riesgo_conflictividad || null,
      nivel_relacionamiento: form.nivel_relacionamiento || null,
      requiere_visita: !!form.requiere_visita,
      requiere_reunion: !!form.requiere_reunion,
      requiere_gerencia: !!form.requiere_gerencia,
      requiere_respuesta_tecnica: !!form.requiere_respuesta_tecnica,
      area_responsable: form.area_responsable || null,
      profesional_responsable: form.profesional_responsable?.trim() || null,
      fecha_asignacion: form.fecha_asignacion || null,
      accion_inmediata: form.accion_inmediata?.trim() || null,
      accion_correctiva: form.accion_correctiva?.trim() || null,
      accion_preventiva: form.accion_preventiva?.trim() || null,
      entidad_involucrada: form.entidad_involucrada?.trim() || null,
      estado_actual: form.estado_actual || 'RECIBIDA',
      fecha_respuesta_inicial: form.fecha_respuesta_inicial || null,
      resultado: form.resultado || null,
      respuesta_enviada_juridica: form.respuesta_enviada_juridica?.trim() || null,
      respuesta_aprobada_juridica: form.respuesta_aprobada_juridica || null,
      respuesta_entregada: form.respuesta_entregada || null,
      fecha_cierre: form.fecha_cierre || null,
      estado_final: form.estado_final || null,
      observaciones: form.observaciones?.trim() || null,
      seguimiento_posterior: form.seguimiento_posterior?.trim() || null,
      updated_at: new Date().toISOString(),
    }
    let error
    if (editing === 'new') {
      const codigo = await generarCodigo(payload.fecha_recepcion)
      payload.codigo = codigo
      payload.numero_documental = codigo + '-01'
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

  async function deletePqrs(p) {
    if (!confirm(`¿Borrar la solicitud ${p.codigo || ''}? No se puede deshacer.`)) return
    const { error } = await supabase.from('pqrs').delete().eq('id', p.id)
    if (error) return alert('No se pudo borrar: ' + error.message)
    setSelected(null)
    await loadAll()
  }

  // Persiste url+nombre de un PDF adjunto (petición o respuesta firmada) y refresca en memoria.
  async function saveDocPatch(row, patch) {
    // .select() para no mostrar exito falso: si RLS niega el UPDATE, Supabase
    // devuelve 0 filas SIN error; sin esto la UI marcaba el PDF como adjunto
    // aunque la BD no cambiara (y se revertia al recargar).
    const { data, error } = await supabase.from('pqrs')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', row.id).select()
    if (error) { alert('No se pudo guardar el documento: ' + error.message); return false }
    if (!data || data.length === 0) {
      alert('No se pudo guardar el documento: no tienes permiso sobre esta solicitud.')
      return false
    }
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, ...patch } : r))
    setSelected(s => s && s.id === row.id ? { ...s, ...patch } : s)
    return true
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>PQRSF</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
            Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones · matriz de gestión y respuesta
            {!seesAll && myTerritorio ? ` · ${myTerritorio}` : ''}
          </p>
        </div>
        <button onClick={() => setEditing('new')} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
          + Registrar PQRSF
        </button>
      </div>

      {/* KPIs clickeables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        <KpiBox label="Abiertos" value={abiertos} color={C.navy} active={estadoFilter === 'abiertos'} onClick={() => setEstadoFilter('abiertos')} />
        <KpiBox label="Vencidos (fuera de plazo)" value={vencidos} color={vencidos > 0 ? '#B91C1C' : '#64748B'} active={estadoFilter === 'vencidos'} onClick={() => setEstadoFilter('vencidos')} />
        <KpiBox label="Nuevos · últimos 30d" value={nuevos30} color="#7C3AED" />
        <KpiBox label="Resueltos / cerrados" value={resueltos} color="#047857" active={estadoFilter === 'cerrados'} onClick={() => setEstadoFilter('cerrados')} />
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por radicado, solicitante, tema..."
          style={{ flex: '1 1 220px', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: "Georgia, 'Times New Roman', serif" }} />
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} style={selectStyle()}>
          <option value="abiertos">Estado: Abiertos</option>
          <option value="cerrados">Estado: Cerrados</option>
          <option value="vencidos">Estado: Vencidos</option>
          <option value="Todos">Estado: Todos</option>
          {ESTADOS_LIST.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {seesAll && (
          <select value={terrFilter} onChange={e => setTerrFilter(e.target.value)} style={selectStyle()}>
            <option value="Todos">Territorio: Todos</option>
            {TERRITORIOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} style={selectStyle()}>
          <option value="Todos">Tipo: Todos</option>
          {TIPO_SOLICITUD.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Cargando PQRSF...</div>}

      {/* Lista */}
      {!loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ background: 'white', border: `1px dashed ${C.border}`, borderRadius: 12, padding: 30, textAlign: 'center', color: C.muted }}>
              No hay solicitudes que coincidan con los filtros.
            </div>
          ) : filtered.map(p => {
            const est = ESTADO_STYLE[p.estado_actual] || ESTADO_STYLE['RECIBIDA']
            const venc = isVencido(p)
            const asunto = p.organizacion || p.solicitante_nombre || 'Solicitante anónimo'
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{ background: 'white', border: `1px solid ${venc ? '#FCA5A5' : C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', borderLeft: `4px solid ${TIPO_COLOR[p.tipo_solicitud] || C.navy}`, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: C.subtle, fontWeight: 800 }}>{p.codigo}</span>
                      <span style={{ padding: '2px 8px', background: `${TIPO_COLOR[p.tipo_solicitud] || C.navy}15`, color: TIPO_COLOR[p.tipo_solicitud] || C.navy, borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.tipo_solicitud}</span>
                      <span style={{ padding: '2px 8px', background: est.bg, color: est.color, borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.estado_actual}</span>
                      {venc && <span style={{ padding: '2px 8px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vencido</span>}
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: C.text }}>{asunto}</h3>
                    {p.descripcion && <div style={{ fontSize: 12, color: C.muted, marginBottom: 4, lineHeight: 1.5 }}>{primerasPalabras(p.descripcion)}</div>}
                    <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>📍 {p.territorio || 'Sin territorio'}</span>
                      {p.categoria_tema && <span>· 🏷 {p.categoria_tema}</span>}
                      {p.profesional_responsable && <span>· 🧑‍💼 {p.profesional_responsable}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: venc ? '#B91C1C' : C.subtle, fontWeight: 700 }}>
                      {p.fecha_recepcion ? `hace ${daysAgo(p.fecha_recepcion)}d` : ''}
                    </div>
                    {p.nivel_impacto && <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase', marginTop: 3 }}>Impacto {p.nivel_impacto}</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <PqrsModal row={editing === 'new' ? null : editing} seesAll={seesAll} myTerritorio={myTerritorio}
          nextCodigo={editing === 'new' ? generarCodigo : null}
          onCancel={() => setEditing(null)} onSave={savePqrs} saving={saving} />
      )}

      {selected && (
        <DetalleModal p={selected} canDelete={canDelete}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDelete={() => deletePqrs(selected)}
          onRespuesta={() => setRespuestaFor(selected)}
          onSaveDoc={saveDocPatch} />
      )}

      {respuestaFor && (
        <PqrsRespuesta p={respuestaFor}
          onClose={() => setRespuestaFor(null)}
          onSaved={(patch) => {
            setRows(rs => rs.map(r => r.id === respuestaFor.id ? { ...r, ...patch } : r))
            setSelected(s => s && s.id === respuestaFor.id ? { ...s, ...patch } : s)
          }}
          onSaveDoc={saveDocPatch} />
      )}
    </div>
  )
}

// ── Sub-componentes ──

function KpiBox({ label, value, color, onClick, active }) {
  return (
    <div onClick={onClick} style={{ background: 'white', border: `1px solid ${active ? color : C.border}`, borderRadius: 10, padding: '12px 14px', cursor: onClick ? 'pointer' : 'default', boxShadow: active ? `0 0 0 1px ${color}` : 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function selectStyle() {
  return { padding: '8px 10px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: C.navy, background: 'white', cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }
}
function inputStyle() {
  return { width: '100%', padding: '8px 11px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: "Georgia, 'Times New Roman', serif", outline: 'none', boxSizing: 'border-box' }
}

const emptyForm = (seesAll, myTerritorio) => ({
  fecha_recepcion: new Date().toISOString().slice(0, 10),
  hora_recepcion: new Date().toTimeString().slice(0, 5),
  medio_recepcion: 'Correo',
  territorio: seesAll ? '' : (myTerritorio || ''),
  solicitante_nombre: '', tipo_documento: 'Cédula de ciudadanía', numero_doc: '', telefono: '', correo: '', organizacion: '', cargo: '',
  tipo_solicitud: 'PETICIÓN', descripcion: '', lugar_ocurrencia: '', categoria_tema: '', tipo_afectacion: '',
  nivel_impacto: '', actor_estrategico: '', influencia: '', riesgo_conflictividad: '', nivel_relacionamiento: '',
  requiere_visita: false, requiere_reunion: false, requiere_gerencia: false, requiere_respuesta_tecnica: false,
  area_responsable: '', profesional_responsable: '', fecha_asignacion: '', accion_inmediata: '', accion_correctiva: '', accion_preventiva: '', entidad_involucrada: '',
  estado_actual: 'RECIBIDA', fecha_respuesta_inicial: '', resultado: '', respuesta_enviada_juridica: '', respuesta_aprobada_juridica: '', respuesta_entregada: '', fecha_cierre: '', estado_final: '', observaciones: '', seguimiento_posterior: '',
})

function PqrsModal({ row, seesAll, myTerritorio, nextCodigo, onCancel, onSave, saving }) {
  const [f, setF] = useState(() => row
    ? { ...emptyForm(seesAll, myTerritorio), ...row }
    : emptyForm(seesAll, myTerritorio))
  const [open, setOpen] = useState({ recep: true, solic: false, solicitud: false, analisis: false, gestion: false, cierre: false })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  const toggle = (k) => setOpen(s => ({ ...s, [k]: !s[k] }))

  // El radicado real (consecutivo del día) se calcula contra la BD al guardar;
  // aquí solo mostramos el prefijo del día como vista previa. (nextCodigo es
  // async, no se puede renderizar directo o pinta "[object Promise]".)
  const ymdPrev = (f.fecha_recepcion || '').replaceAll('-', '')
  const codigoPreview = row ? (row.codigo || '') : (ymdPrev ? `${ymdPrev}-NN · se asigna al guardar` : 'Se asigna al guardar')
  const canSave = !!f.tipo_solicitud && !!f.solicitante_nombre?.trim() && !!f.descripcion?.trim() && !!f.fecha_recepcion

  return (
    <Modal title={row ? `Editar ${row.codigo || 'PQRSF'}` : 'Registrar PQRSF'} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={canSave}>

      {/* RECEPCIÓN */}
      <Seccion titulo="Recepción" abierta={open.recep} onToggle={() => toggle('recep')}>
        <Field label="Radicado (automático)">
          <input value={codigoPreview} disabled style={{ ...inputStyle(), background: '#F1F5F9', fontWeight: 800, color: C.navy }} />
        </Field>
        <Grid2>
          <Field label="Fecha de recepción *"><input type="date" value={f.fecha_recepcion} onChange={e => u('fecha_recepcion', e.target.value)} style={inputStyle()} /></Field>
          <Field label="Hora de recepción"><input type="time" value={f.hora_recepcion || ''} onChange={e => u('hora_recepcion', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
        <Grid2>
          <Field label="Medio de recepción">
            <select value={f.medio_recepcion || ''} onChange={e => u('medio_recepcion', e.target.value)} style={inputStyle()}>
              {MEDIO_RECEPCION.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Territorio">
            <select value={f.territorio || ''} onChange={e => u('territorio', e.target.value)} style={inputStyle()} disabled={!seesAll && !!myTerritorio}>
              <option value="">—</option>
              {TERRITORIOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </Grid2>
      </Seccion>

      {/* SOLICITANTE */}
      <Seccion titulo="Solicitante" abierta={open.solic} onToggle={() => toggle('solic')}>
        <Field label="Nombre del solicitante *"><input value={f.solicitante_nombre || ''} onChange={e => u('solicitante_nombre', e.target.value)} style={inputStyle()} placeholder="Nombre completo" /></Field>
        <Grid2>
          <Field label="Tipo de documento">
            <select value={f.tipo_documento || ''} onChange={e => u('tipo_documento', e.target.value)} style={inputStyle()}>
              {TIPO_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Número de documento"><input value={f.numero_doc || ''} onChange={e => u('numero_doc', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
        <Grid2>
          <Field label="Teléfono"><input value={f.telefono || ''} onChange={e => u('telefono', e.target.value)} style={inputStyle()} /></Field>
          <Field label="Correo"><input type="email" value={f.correo || ''} onChange={e => u('correo', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
        <Grid2>
          <Field label="Organización"><input value={f.organizacion || ''} onChange={e => u('organizacion', e.target.value)} style={inputStyle()} placeholder="JAC, asociación, empresa..." /></Field>
          <Field label="Cargo"><input value={f.cargo || ''} onChange={e => u('cargo', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
      </Seccion>

      {/* SOLICITUD */}
      <Seccion titulo="Solicitud" abierta={open.solicitud} onToggle={() => toggle('solicitud')}>
        <Field label="Tipo de solicitud *">
          <select value={f.tipo_solicitud} onChange={e => u('tipo_solicitud', e.target.value)} style={inputStyle()}>
            {TIPO_SOLICITUD.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Descripción *">
          <textarea value={f.descripcion || ''} onChange={e => u('descripcion', e.target.value)} rows={3}
            style={{ ...inputStyle(), resize: 'vertical', minHeight: 64 }} placeholder="¿Qué solicita, reclama o sugiere?" />
        </Field>
        <Grid2>
          <Field label="Lugar de ocurrencia"><input value={f.lugar_ocurrencia || ''} onChange={e => u('lugar_ocurrencia', e.target.value)} style={inputStyle()} /></Field>
          <Field label="Categoría del tema"><input value={f.categoria_tema || ''} onChange={e => u('categoria_tema', e.target.value)} style={inputStyle()} placeholder="Ambiental, laboral, social..." /></Field>
        </Grid2>
        <Field label="Tipo de afectación"><input value={f.tipo_afectacion || ''} onChange={e => u('tipo_afectacion', e.target.value)} style={inputStyle()} /></Field>
      </Seccion>

      {/* ANÁLISIS Y CLASIFICACIÓN */}
      <Seccion titulo="Análisis y clasificación" abierta={open.analisis} onToggle={() => toggle('analisis')}>
        <Grid2>
          <Field label="Nivel de impacto"><SelNivel value={f.nivel_impacto} onChange={v => u('nivel_impacto', v)} /></Field>
          <Field label="Influencia"><SelNivel value={f.influencia} onChange={v => u('influencia', v)} /></Field>
        </Grid2>
        <Grid2>
          <Field label="Riesgo de conflictividad"><SelNivel value={f.riesgo_conflictividad} onChange={v => u('riesgo_conflictividad', v)} /></Field>
          <Field label="Nivel de relacionamiento"><SelNivel value={f.nivel_relacionamiento} onChange={v => u('nivel_relacionamiento', v)} /></Field>
        </Grid2>
        <Field label="Actor estratégico"><input value={f.actor_estrategico || ''} onChange={e => u('actor_estrategico', e.target.value)} style={inputStyle()} /></Field>
        <div style={{ marginBottom: 11 }}>
          <label style={labelStyle()}>Requerimientos</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chk label="Visita" checked={f.requiere_visita} onChange={v => u('requiere_visita', v)} />
            <Chk label="Reunión" checked={f.requiere_reunion} onChange={v => u('requiere_reunion', v)} />
            <Chk label="Gerencia" checked={f.requiere_gerencia} onChange={v => u('requiere_gerencia', v)} />
            <Chk label="Respuesta técnica" checked={f.requiere_respuesta_tecnica} onChange={v => u('requiere_respuesta_tecnica', v)} />
          </div>
        </div>
      </Seccion>

      {/* GESTIÓN */}
      <Seccion titulo="Gestión" abierta={open.gestion} onToggle={() => toggle('gestion')}>
        <Grid2>
          <Field label="Área responsable">
            <select value={f.area_responsable || ''} onChange={e => u('area_responsable', e.target.value)} style={inputStyle()}>
              <option value="">—</option>
              {AREA_RESPONSABLE.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Profesional responsable"><input value={f.profesional_responsable || ''} onChange={e => u('profesional_responsable', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
        <Grid2>
          <Field label="Fecha de asignación"><input type="date" value={f.fecha_asignacion || ''} onChange={e => u('fecha_asignacion', e.target.value)} style={inputStyle()} /></Field>
          <Field label="Entidad involucrada"><input value={f.entidad_involucrada || ''} onChange={e => u('entidad_involucrada', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
        <Field label="Acción inmediata"><textarea value={f.accion_inmediata || ''} onChange={e => u('accion_inmediata', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical', minHeight: 46 }} /></Field>
        <Field label="Acción correctiva"><textarea value={f.accion_correctiva || ''} onChange={e => u('accion_correctiva', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical', minHeight: 46 }} /></Field>
        <Field label="Acción preventiva"><textarea value={f.accion_preventiva || ''} onChange={e => u('accion_preventiva', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical', minHeight: 46 }} /></Field>
      </Seccion>

      {/* RESPUESTA Y CIERRE */}
      <Seccion titulo="Respuesta y cierre" abierta={open.cierre} onToggle={() => toggle('cierre')}>
        <Grid2>
          <Field label="Estado actual">
            <select value={f.estado_actual} onChange={e => u('estado_actual', e.target.value)} style={inputStyle()}>
              {ESTADOS_LIST.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Fecha de respuesta inicial"><input type="date" value={f.fecha_respuesta_inicial || ''} onChange={e => u('fecha_respuesta_inicial', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
        <Grid2>
          <Field label="Resultado">
            <select value={f.resultado || ''} onChange={e => u('resultado', e.target.value)} style={inputStyle()}>
              <option value="">—</option>
              {RESULTADO.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Estado final">
            <select value={f.estado_final || ''} onChange={e => u('estado_final', e.target.value)} style={inputStyle()}>
              <option value="">—</option>
              {ESTADOS_LIST.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
        </Grid2>
        <Field label="Respuesta enviada a jurídica"><textarea value={f.respuesta_enviada_juridica || ''} onChange={e => u('respuesta_enviada_juridica', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical', minHeight: 46 }} /></Field>
        <Grid2>
          <Field label="Respuesta aprobada por jurídica"><input type="date" value={f.respuesta_aprobada_juridica || ''} onChange={e => u('respuesta_aprobada_juridica', e.target.value)} style={inputStyle()} /></Field>
          <Field label="Respuesta entregada"><input type="date" value={f.respuesta_entregada || ''} onChange={e => u('respuesta_entregada', e.target.value)} style={inputStyle()} /></Field>
        </Grid2>
        <Field label="Fecha de cierre"><input type="date" value={f.fecha_cierre || ''} onChange={e => u('fecha_cierre', e.target.value)} style={inputStyle()} /></Field>
        <Field label="Observaciones"><textarea value={f.observaciones || ''} onChange={e => u('observaciones', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical', minHeight: 46 }} /></Field>
        <Field label="Seguimiento posterior"><textarea value={f.seguimiento_posterior || ''} onChange={e => u('seguimiento_posterior', e.target.value)} rows={2} style={{ ...inputStyle(), resize: 'vertical', minHeight: 46 }} /></Field>
      </Seccion>

      {!canSave && (
        <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>
          Obligatorios: tipo de solicitud, nombre del solicitante, descripción y fecha de recepción.
        </div>
      )}
    </Modal>
  )
}

function SelNivel({ value, onChange }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle()}>
      <option value="">—</option>
      {NIVEL_3.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

function Chk({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      style={{ padding: '6px 12px', border: `1.5px solid ${checked ? C.navy : C.border}`, background: checked ? C.navy : 'white', color: checked ? 'white' : C.text, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {checked ? '✓ ' : ''}{label}
    </button>
  )
}

function Seccion({ titulo, abierta, onToggle, children }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <button type="button" onClick={onToggle}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: 'none', padding: '10px 14px', cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: 0.5 }}>{titulo}</span>
        <span style={{ fontSize: 13, color: C.muted }}>{abierta ? '▲' : '▼'}</span>
      </button>
      {abierta && <div style={{ padding: '12px 14px' }}>{children}</div>}
    </div>
  )
}

function DetalleModal({ p, canDelete, onClose, onEdit, onDelete, onRespuesta, onSaveDoc }) {
  const est = ESTADO_STYLE[p.estado_actual] || ESTADO_STYLE['RECIBIDA']
  const venc = isVencido(p)
  const reqs = [
    p.requiere_visita && 'Visita', p.requiere_reunion && 'Reunión',
    p.requiere_gerencia && 'Gerencia', p.requiere_respuesta_tecnica && 'Respuesta técnica',
  ].filter(Boolean)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ padding: '3px 9px', background: `${TIPO_COLOR[p.tipo_solicitud] || C.navy}15`, color: TIPO_COLOR[p.tipo_solicitud] || C.navy, borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.tipo_solicitud}</span>
              <span style={{ padding: '3px 9px', background: est.bg, color: est.color, borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.estado_actual}</span>
              {venc && <span style={{ padding: '3px 9px', background: '#FEE2E2', color: '#B91C1C', borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vencido</span>}
            </div>
            <h2 style={{ margin: '0 0 2px', fontSize: 19, fontWeight: 800, color: C.text }}>{p.organizacion || p.solicitante_nombre || 'Solicitante'}</h2>
            <div style={{ fontSize: 12, color: C.muted }}>{p.codigo} · {p.numero_documental} · recibido {p.fecha_recepcion}{p.hora_recepcion ? ` ${p.hora_recepcion}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>

        {p.descripcion && (
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            {p.descripcion}
          </div>
        )}

        <Bloque titulo="Recepción y solicitante">
          <KV label="Medio" value={p.medio_recepcion} />
          <KV label="Territorio" value={p.territorio} />
          <KV label="Solicitante" value={p.solicitante_nombre} />
          <KV label="Documento" value={[p.tipo_documento, p.numero_doc].filter(Boolean).join(' ')} />
          <KV label="Teléfono" value={p.telefono} />
          <KV label="Correo" value={p.correo} />
          <KV label="Organización" value={p.organizacion} />
          <KV label="Cargo" value={p.cargo} />
          <KV label="Lugar ocurrencia" value={p.lugar_ocurrencia} />
          <KV label="Categoría tema" value={p.categoria_tema} />
          <KV label="Tipo afectación" value={p.tipo_afectacion} />
        </Bloque>

        <Bloque titulo="Análisis y clasificación">
          <KV label="Nivel impacto" value={p.nivel_impacto} />
          <KV label="Influencia" value={p.influencia} />
          <KV label="Riesgo conflictividad" value={p.riesgo_conflictividad} />
          <KV label="Nivel relacionamiento" value={p.nivel_relacionamiento} />
          <KV label="Actor estratégico" value={p.actor_estrategico} />
          {reqs.length > 0 && <KV label="Requiere" value={reqs.join(', ')} />}
        </Bloque>

        <Bloque titulo="Gestión">
          <KV label="Área responsable" value={p.area_responsable} />
          <KV label="Profesional" value={p.profesional_responsable} />
          <KV label="Fecha asignación" value={p.fecha_asignacion} />
          <KV label="Entidad involucrada" value={p.entidad_involucrada} />
          <KV label="Acción inmediata" value={p.accion_inmediata} />
          <KV label="Acción correctiva" value={p.accion_correctiva} />
          <KV label="Acción preventiva" value={p.accion_preventiva} />
        </Bloque>

        <Bloque titulo="Respuesta y cierre">
          <KV label="Resultado" value={p.resultado} />
          <KV label="Fecha respuesta inicial" value={p.fecha_respuesta_inicial} />
          <KV label="Enviada a jurídica" value={p.respuesta_enviada_juridica} />
          <KV label="Aprobada jurídica" value={p.respuesta_aprobada_juridica} />
          <KV label="Respuesta entregada" value={p.respuesta_entregada} />
          <KV label="Fecha cierre" value={p.fecha_cierre} />
          <KV label="Estado final" value={p.estado_final} />
          <KV label="Observaciones" value={p.observaciones} />
          <KV label="Seguimiento posterior" value={p.seguimiento_posterior} />
        </Bloque>

        {/* Documentos adjuntos */}
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Documentos</div>
          <DocRow label="Petición (PDF)" url={p.peticion_url} nombre={p.peticion_nombre} tipo="peticion" p={p} onSaveDoc={onSaveDoc} />
          <DocRow label="Respuesta firmada (PDF)" url={p.respuesta_url} nombre={p.respuesta_nombre} tipo="respuesta" p={p} onSaveDoc={onSaveDoc} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
          <button onClick={onEdit} style={{ flex: '1 1 140px', background: '#EEF2FF', color: C.navy, border: `1px solid ${C.navy}44`, borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
            ✎ Editar
          </button>
          <button onClick={onRespuesta} style={{ flex: '1 1 140px', background: C.navy, color: 'white', border: 'none', borderRadius: 8, padding: '9px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
            📄 Generar respuesta
          </button>
          {canDelete && (
            <button onClick={onDelete} style={{ background: '#FEF2F2', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
              🗑 Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Fila de documento: sube un PDF (petición o respuesta firmada) al bucket y guarda url+nombre.
function DocRow({ label, url, nombre, tipo, p, onSaveDoc }) {
  const [uploading, setUploading] = useState(false)
  const campoUrl = tipo === 'peticion' ? 'peticion_url' : 'respuesta_url'
  const campoNombre = tipo === 'peticion' ? 'peticion_nombre' : 'respuesta_nombre'
  const inputId = `doc-${tipo}-${p.id}`

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo nombre
    if (!file) return
    setUploading(true)
    try {
      const { url: newUrl, nombre: newNombre } = await uploadPqrsDoc(file, p.codigo, tipo)
      await onSaveDoc(p, { [campoUrl]: newUrl, [campoNombre]: newNombre })
    } catch (err) {
      alert('No se pudo subir el archivo: ' + (err?.message || err))
    }
    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{label}</div>
        {url
          ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.accent, fontWeight: 700, textDecoration: 'none' }}>Ver PDF ↗{nombre ? ` · ${nombre}` : ''}</a>
          : <div style={{ fontSize: 11, color: C.subtle }}>Sin archivo</div>}
      </div>
      <label htmlFor={inputId}
        style={{ background: url ? 'white' : C.navy, color: url ? C.navy : 'white', border: `1px solid ${url ? C.border : C.navy}`, borderRadius: 8, padding: '7px 12px', fontSize: 11, fontWeight: 700, cursor: uploading ? 'default' : 'pointer', fontFamily: "Georgia, 'Times New Roman', serif", opacity: uploading ? 0.6 : 1, whiteSpace: 'nowrap' }}>
        {uploading ? 'Subiendo...' : (url ? 'Reemplazar' : 'Subir PDF')}
        <input id={inputId} type="file" accept=".pdf,image/*" onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
      </label>
    </div>
  )
}

function Bloque({ titulo, children }) {
  // Filtra los KV sin valor: si todos vacíos, no renderiza el bloque.
  const items = (Array.isArray(children) ? children : [children]).filter(c => c && c.props && c.props.value)
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{titulo}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10, fontSize: 12 }}>
        {items}
      </div>
    </div>
  )
}

function Modal({ title, children, onCancel, onSave, saving, canSave }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 22, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>{title}</h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>Cancelar</button>
          <button onClick={onSave} disabled={!canSave || saving}
            style={{ padding: '9px 20px', background: C.navy, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: (canSave && !saving) ? 'pointer' : 'not-allowed', fontFamily: "Georgia, 'Times New Roman', serif", opacity: (canSave && !saving) ? 1 : 0.5 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function labelStyle() {
  return { fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <label style={labelStyle()}>{label}</label>
      {children}
    </div>
  )
}
function Grid2({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{children}</div>
}
function KV({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>{value}</div>
    </div>
  )
}
