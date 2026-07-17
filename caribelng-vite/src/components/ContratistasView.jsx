import { useEffect, useMemo, useState } from 'react'
import { supabase, removeStorageObjectsByUrl } from '../lib/supabase'
import { C } from '../lib/constants'

const TIPOS = ['Contratista', 'Proveedor', 'Aliado logístico', 'Aliado estratégico', 'Otro']
const TERRITORIOS = ['Tolú', 'Barbosa', 'Nacional']
const ESTADOS = {
  activo:   { label: 'Activo',   color: '#047857', bg: '#D1FAE5' },
  pausado:  { label: 'Pausado',  color: '#B45309', bg: '#FEF3C7' },
  inactivo: { label: 'Inactivo', color: '#64748B', bg: '#F1F5F9' },
}
const TIPO_COLOR = {
  Contratista: '#1565C0', Proveedor: '#7C3AED', 'Aliado logístico': '#0891B2', 'Aliado estratégico': '#047857', Otro: '#64748B',
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((today - d) / (1000 * 60 * 60 * 24))
}

export default function ContratistasView({ profile, isAdmin }) {
  const [contratistas, setContratistas] = useState([])
  const [capacitaciones, setCapacitaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [terrFilter, setTerrFilter] = useState('Todos')
  const [tipoFilter, setTipoFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // 'new' | row
  const [savingC, setSavingC] = useState(false)
  const [selected, setSelected] = useState(null) // contratista para detalle
  const [newCapac, setNewCapac] = useState(null) // contratista_id para nueva capacitación
  const [savingCapac, setSavingCapac] = useState(false)

  // Roles con escritura: admin, supervisor, gestora. viewer = solo lectura.
  const canEdit = profile?.role === 'admin' || profile?.role === 'supervisor' || profile?.role === 'gestora'
  const canDelete = profile?.role === 'admin'

  async function loadAll() {
    setLoading(true)
    const [c, k] = await Promise.all([
      supabase.from('contratistas').select('*').order('nombre'),
      supabase.from('capacitaciones_contratistas').select('*').order('fecha', { ascending: false }),
    ])
    setContratistas(c.data || [])
    setCapacitaciones(k.data || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // Mapa contratista_id → array de capacitaciones
  const capsByContratista = useMemo(() => {
    const m = {}
    capacitaciones.forEach(k => { if (!m[k.contratista_id]) m[k.contratista_id] = []; m[k.contratista_id].push(k) })
    return m
  }, [capacitaciones])

  // Filtrado
  const filtered = useMemo(() => {
    return contratistas.filter(c => {
      if (terrFilter !== 'Todos' && !(c.territorios || []).includes(terrFilter)) return false
      if (tipoFilter !== 'Todos' && c.tipo !== tipoFilter) return false
      if (search && !c.nombre.toLowerCase().includes(search.toLowerCase()) && !(c.servicio || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [contratistas, terrFilter, tipoFilter, search])

  // KPIs
  const activos = contratistas.filter(c => c.estado === 'activo').length
  const totalCapac = capacitaciones.length
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30)
  const capacUlt30 = capacitaciones.filter(k => new Date(k.fecha + 'T00:00:00') >= hace30).length
  const sinCapacitar = contratistas.filter(c => c.estado === 'activo' && !capsByContratista[c.id]).length

  async function saveContratista(form) {
    setSavingC(true)
    const payload = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      servicio: form.servicio || null,
      territorios: form.territorios.length ? form.territorios : ['Nacional'],
      contraparte_interna: form.contraparte_interna || null,
      contacto_nombre: form.contacto_nombre || null,
      contacto_email: form.contacto_email || null,
      contacto_telefono: form.contacto_telefono || null,
      estado: form.estado,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      notas: form.notas || null,
      updated_at: new Date().toISOString(),
    }
    let error
    if (editing === 'new') {
      payload.created_by = profile?.id
      ;({ error } = await supabase.from('contratistas').insert(payload))
    } else {
      ;({ error } = await supabase.from('contratistas').update(payload).eq('id', editing.id))
    }
    setSavingC(false)
    if (error) return alert('Error: ' + error.message)
    setEditing(null)
    await loadAll()
  }

  async function deleteContratista(c) {
    if (!confirm(`¿Borrar "${c.nombre}"? Sus capacitaciones también se borrarán.`)) return false
    // Cumplir la promesa de la UI: borrar primero las capacitaciones hijas y sus
    // evidencias en Storage, luego el contratista (COD-02).
    const { data: caps } = await supabase.from('capacitaciones_contratistas').select('id, evidencia_url').eq('contratista_id', c.id)
    if (caps?.length) {
      await removeStorageObjectsByUrl(caps.map(k => k.evidencia_url))
      const { error: eCap } = await supabase.from('capacitaciones_contratistas').delete().eq('contratista_id', c.id)
      if (eCap) { alert('Error borrando capacitaciones: ' + eCap.message); return false }
    }
    const { error } = await supabase.from('contratistas').delete().eq('id', c.id)
    if (error) { alert('Error: ' + error.message); return false }
    await loadAll()
    return true
  }

  async function saveCapacitacion(form) {
    setSavingCapac(true)
    const payload = {
      contratista_id: newCapac.contratista_id,
      tema: form.tema.trim(),
      fecha: form.fecha,
      territorio: form.territorio || null,
      asistentes: parseInt(form.asistentes) || 0,
      horas: parseFloat(form.horas) || null,
      modalidad: form.modalidad,
      facilitador: form.facilitador || null,
      evidencia_url: form.evidencia_url || null,
      descripcion: form.descripcion || null,
      created_by: profile?.id,
    }
    const { error } = await supabase.from('capacitaciones_contratistas').insert(payload)
    setSavingCapac(false)
    if (error) return alert('Error: ' + error.message)
    setNewCapac(null)
    await loadAll()
  }

  async function deleteCapacitacion(k) {
    if (!confirm('¿Borrar esta capacitación?')) return
    const { error } = await supabase.from('capacitaciones_contratistas').delete().eq('id', k.id)
    if (error) return alert('Error: ' + error.message)
    await removeStorageObjectsByUrl(k.evidencia_url) // COD-21
    await loadAll()
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>Contratistas y Proveedores</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
            Quién hace qué en territorio · capacitaciones realizadas
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setEditing('new')} style={{ background: C.navy, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
            + Nuevo contratista
          </button>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
        <KpiBox label="Contratistas activos" value={activos} color={C.navy} />
        <KpiBox label="Capacitaciones totales" value={totalCapac} color="#7C3AED" />
        <KpiBox label="Capacitaciones · últimos 30d" value={capacUlt30} color="#047857" />
        <KpiBox label="Activos sin capacitar" value={sinCapacitar} color={sinCapacitar > 0 ? '#B91C1C' : '#64748B'} />
      </div>

      {/* Filtros */}
      <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o servicio..."
          style={{ flex: '1 1 220px', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: "Georgia, 'Times New Roman', serif" }} />
        <select value={terrFilter} onChange={e => setTerrFilter(e.target.value)}
          style={selectStyle()}>
          <option value="Todos">Territorio: Todos</option>
          {TERRITORIOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
          style={selectStyle()}>
          <option value="Todos">Tipo: Todos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Cargando contratistas...</div>}

      {/* Lista */}
      {!loading && (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ background: 'white', border: `1px dashed ${C.border}`, borderRadius: 12, padding: 30, textAlign: 'center', color: C.muted }}>
              No hay contratistas que coincidan con los filtros.
            </div>
          ) : filtered.map(c => {
            const caps = capsByContratista[c.id] || []
            const ultima = caps[0]
            const est = ESTADOS[c.estado] || ESTADOS.activo
            return (
              <div key={c.id} onClick={() => setSelected(c)}
                style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', borderLeft: `4px solid ${TIPO_COLOR[c.tipo] || C.navy}`, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{c.nombre}</h3>
                      <span style={{ padding: '2px 8px', background: `${TIPO_COLOR[c.tipo] || C.navy}15`, color: TIPO_COLOR[c.tipo] || C.navy, borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.tipo}</span>
                      <span style={{ padding: '2px 8px', background: est.bg, color: est.color, borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{est.label}</span>
                    </div>
                    {c.servicio && <div style={{ fontSize: 13, color: C.text, marginBottom: 4, lineHeight: 1.5 }}>{c.servicio}</div>}
                    <div style={{ fontSize: 11, color: C.muted, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>📍 {(c.territorios || []).join(' · ') || 'Sin territorio'}</span>
                      {c.contraparte_interna && <span>· 🏢 {c.contraparte_interna}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 130 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: caps.length > 0 ? '#047857' : '#B91C1C', lineHeight: 1 }}>{caps.length}</div>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      capacitacion{caps.length === 1 ? '' : 'es'}
                    </div>
                    {ultima && (
                      <div style={{ fontSize: 10, color: C.subtle, marginTop: 4 }}>
                        Última: hace {daysAgo(ultima.fecha)}d
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo/editar contratista */}
      {editing && (
        <ContratistaModal row={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={saveContratista}
          saving={savingC} />
      )}

      {/* Modal detalle contratista con capacitaciones */}
      {selected && (
        <DetalleModal contratista={selected}
          capacitaciones={(capsByContratista[selected.id] || [])}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); setSelected(null) }}
          onDelete={async () => { if (await deleteContratista(selected)) setSelected(null) }}
          onAddCapac={() => setNewCapac({ contratista_id: selected.id, contratista_nombre: selected.nombre })}
          onDeleteCapac={deleteCapacitacion} />
      )}

      {/* Modal nueva capacitación */}
      {newCapac && (
        <CapacitacionModal contratista_nombre={newCapac.contratista_nombre}
          onCancel={() => setNewCapac(null)}
          onSave={saveCapacitacion}
          saving={savingCapac} />
      )}
    </div>
  )
}

// ── Sub-componentes ──

function KpiBox({ label, value, color }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
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

function ContratistaModal({ row, onCancel, onSave, saving }) {
  const [f, setF] = useState(() => row ? { ...row, territorios: row.territorios || ['Nacional'] } : {
    nombre: '', tipo: 'Contratista', servicio: '', territorios: ['Nacional'],
    contraparte_interna: '', contacto_nombre: '', contacto_email: '', contacto_telefono: '',
    estado: 'activo', fecha_inicio: '', fecha_fin: '', notas: '',
  })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  const toggleTerr = (t) => {
    setF(s => ({ ...s, territorios: s.territorios.includes(t) ? s.territorios.filter(x => x !== t) : [...s.territorios, t] }))
  }
  return (
    <Modal title={row ? 'Editar contratista' : 'Nuevo contratista'} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={!!f.nombre.trim() && !!f.tipo}>
      <Field label="Nombre *"><input value={f.nombre} onChange={e => u('nombre', e.target.value)} style={inputStyle()} placeholder="Ej: Suragas" /></Field>
      <Grid2>
        <Field label="Tipo *">
          <select value={f.tipo} onChange={e => u('tipo', e.target.value)} style={inputStyle()}>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select value={f.estado} onChange={e => u('estado', e.target.value)} style={inputStyle()}>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </Grid2>
      <Field label="Servicio / Rol">
        <textarea value={f.servicio} onChange={e => u('servicio', e.target.value)} rows={2}
          style={{ ...inputStyle(), resize: 'vertical', minHeight: 50 }}
          placeholder="Ej: Transporte terrestre de carrotanques corredor Tolú–Barbosa" />
      </Field>
      <Field label="Territorios donde opera">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TERRITORIOS.map(t => (
            <button key={t} type="button" onClick={() => toggleTerr(t)}
              style={{ padding: '6px 12px', border: `1.5px solid ${f.territorios.includes(t) ? C.navy : C.border}`, background: f.territorios.includes(t) ? C.navy : 'white', color: f.territorios.includes(t) ? 'white' : C.text, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Contraparte interna en Caribe LNG">
        <input value={f.contraparte_interna} onChange={e => u('contraparte_interna', e.target.value)} style={inputStyle()} placeholder="Operaciones / DAC / Comercial..." />
      </Field>
      <Grid2>
        <Field label="Contacto · Nombre"><input value={f.contacto_nombre} onChange={e => u('contacto_nombre', e.target.value)} style={inputStyle()} /></Field>
        <Field label="Contacto · Email"><input type="email" value={f.contacto_email} onChange={e => u('contacto_email', e.target.value)} style={inputStyle()} /></Field>
      </Grid2>
      <Field label="Contacto · Teléfono"><input value={f.contacto_telefono} onChange={e => u('contacto_telefono', e.target.value)} style={inputStyle()} /></Field>
      <Grid2>
        <Field label="Inicio del contrato"><input type="date" value={f.fecha_inicio || ''} onChange={e => u('fecha_inicio', e.target.value)} style={inputStyle()} /></Field>
        <Field label="Fin del contrato"><input type="date" value={f.fecha_fin || ''} onChange={e => u('fecha_fin', e.target.value)} style={inputStyle()} /></Field>
      </Grid2>
      <Field label="Notas"><textarea value={f.notas} onChange={e => u('notas', e.target.value)} rows={2} style={{ ...inputStyle(), minHeight: 50, resize: 'vertical' }} /></Field>
    </Modal>
  )
}

function CapacitacionModal({ contratista_nombre, onCancel, onSave, saving }) {
  const [f, setF] = useState({ tema: '', fecha: new Date().toISOString().slice(0, 10), territorio: '', asistentes: '', horas: '', modalidad: 'Presencial', facilitador: '', evidencia_url: '', descripcion: '' })
  const u = (k, v) => setF(s => ({ ...s, [k]: v }))
  return (
    <Modal title={`Registrar capacitación · ${contratista_nombre}`} onCancel={onCancel}
      onSave={() => onSave(f)} saving={saving} canSave={!!f.tema.trim() && !!f.fecha}>
      <Field label="Tema de la capacitación *">
        <input value={f.tema} onChange={e => u('tema', e.target.value)} style={inputStyle()}
          placeholder="Inducción ambiental, Manejo de GNL, Seguridad vial, Protocolo de género..." />
      </Field>
      <Grid2>
        <Field label="Fecha *"><input type="date" value={f.fecha} onChange={e => u('fecha', e.target.value)} style={inputStyle()} /></Field>
        <Field label="Territorio">
          <select value={f.territorio} onChange={e => u('territorio', e.target.value)} style={inputStyle()}>
            <option value="">—</option>
            {TERRITORIOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </Grid2>
      <Grid2>
        <Field label="# Asistentes"><input type="number" value={f.asistentes} onChange={e => u('asistentes', e.target.value)} style={inputStyle()} /></Field>
        <Field label="Horas"><input type="number" step="0.5" value={f.horas} onChange={e => u('horas', e.target.value)} style={inputStyle()} /></Field>
      </Grid2>
      <Grid2>
        <Field label="Modalidad">
          <select value={f.modalidad} onChange={e => u('modalidad', e.target.value)} style={inputStyle()}>
            {['Presencial', 'Virtual', 'Mixta'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Facilitador / Quien dictó"><input value={f.facilitador} onChange={e => u('facilitador', e.target.value)} style={inputStyle()} /></Field>
      </Grid2>
      <Field label="URL evidencia (OneDrive / SharePoint)"><input value={f.evidencia_url} onChange={e => u('evidencia_url', e.target.value)} style={inputStyle()} placeholder="https://..." /></Field>
      <Field label="Descripción / Notas"><textarea value={f.descripcion} onChange={e => u('descripcion', e.target.value)} rows={2} style={{ ...inputStyle(), minHeight: 50, resize: 'vertical' }} /></Field>
    </Modal>
  )
}

function DetalleModal({ contratista, capacitaciones, canEdit, canDelete, onClose, onEdit, onDelete, onAddCapac, onDeleteCapac }) {
  const c = contratista
  const est = ESTADOS[c.estado] || ESTADOS.activo
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text }}>{c.nombre}</h2>
              <span style={{ padding: '3px 9px', background: `${TIPO_COLOR[c.tipo] || C.navy}15`, color: TIPO_COLOR[c.tipo] || C.navy, borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.tipo}</span>
              <span style={{ padding: '3px 9px', background: est.bg, color: est.color, borderRadius: 6, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{est.label}</span>
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>{(c.territorios || []).join(' · ')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>

        {c.servicio && (
          <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            {c.servicio}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 14, fontSize: 12 }}>
          {c.contraparte_interna && <KV label="Contraparte interna" value={c.contraparte_interna} />}
          {c.contacto_nombre && <KV label="Contacto" value={c.contacto_nombre} />}
          {c.contacto_email && <KV label="Email" value={c.contacto_email} />}
          {c.contacto_telefono && <KV label="Teléfono" value={c.contacto_telefono} />}
          {c.fecha_inicio && <KV label="Inicio" value={c.fecha_inicio} />}
          {c.fecha_fin && <KV label="Fin" value={c.fecha_fin} />}
        </div>

        {c.notas && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notas</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{c.notas}</div>
          </div>
        )}

        {/* Capacitaciones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.navy }}>
            Capacitaciones realizadas ({capacitaciones.length})
          </h3>
          {canEdit && (
            <button onClick={onAddCapac}
              style={{ background: '#047857', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
              + Registrar capacitación
            </button>
          )}
        </div>

        {capacitaciones.length === 0 ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#7F1D1D' }}>
            ⚠ Este contratista no tiene capacitaciones registradas.
          </div>
        ) : capacitaciones.map(k => (
          <div key={k.id} style={{ background: 'white', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{k.tema}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  📅 {k.fecha}
                  {k.territorio && <span> · 📍 {k.territorio}</span>}
                  {k.modalidad && <span> · {k.modalidad}</span>}
                  {k.asistentes > 0 && <span> · 👥 {k.asistentes} asistentes</span>}
                  {k.horas && <span> · ⏱ {k.horas}h</span>}
                </div>
                {k.facilitador && <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>Facilitador: {k.facilitador}</div>}
                {k.descripcion && <div style={{ fontSize: 12, color: C.text, marginTop: 4, lineHeight: 1.5 }}>{k.descripcion}</div>}
                {k.evidencia_url && (
                  <a href={k.evidencia_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: C.accent, fontWeight: 700, textDecoration: 'none' }}>
                    Ver evidencia ↗
                  </a>
                )}
              </div>
              {canDelete && (
                <button onClick={() => onDeleteCapac(k)} title="Borrar capacitación (solo Dirección)"
                  style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑</button>
              )}
            </div>
          </div>
        ))}

        {canEdit && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <button onClick={onEdit} style={{ flex: 1, background: '#EEF2FF', color: C.navy, border: `1px solid ${C.navy}44`, borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
              ✎ Editar contratista
            </button>
            {canDelete && (
              <button onClick={onDelete} style={{ background: '#FEF2F2', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
                🗑 Borrar
              </button>
            )}
          </div>
        )}
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
