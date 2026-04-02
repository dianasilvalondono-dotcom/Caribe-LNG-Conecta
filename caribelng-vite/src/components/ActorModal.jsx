import { useState, useEffect, useRef } from 'react'
import { C, SEMAFORO, getTipoColor } from '../lib/constants'
import { Avatar, Pill, InfoRow, Block, Field, SemDot } from './ui'
import { getInteractions, addInteraction, updateActor, submitActorEdit } from '../lib/supabase'

export default function ActorModal({ actor, session, onClose, onUpdated, isAdmin, profile }) {
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
  // Edit fields
  const [editFields, setEditFields] = useState({
    nombre: actor.nombre || '', tipo: actor.tipo || '', territorio: actor.territorio || '',
    posicion: actor.posicion || '', riesgo: actor.riesgo || '', poder: actor.poder || 3,
    interes: actor.interes || 3, owner: actor.owner || '', contacto: actor.contacto || '',
    que_hacemos: actor.que_hacemos || '', prioridad: actor.prioridad || ''
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editSent, setEditSent] = useState(false)

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
    { id: 'editar', label: '✏️ Editar' },
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

        {/* ── TAB: EDITAR ── */}
        {modalTab === 'editar' && (
          <div>
            {editSent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>Cambios enviados para aprobación</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>La directora DAC revisará y aprobará los cambios.</div>
              </div>
            ) : (
              <>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                  {isAdmin
                    ? '⚡ Como admin, tus cambios se aplican directamente.'
                    : '📋 Tus cambios quedarán pendientes hasta que la directora DAC los apruebe.'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Nombre</label>
                    <input value={editFields.nombre} onChange={e => setEditFields({ ...editFields, nombre: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Tipo</label>
                    <select value={editFields.tipo} onChange={e => setEditFields({ ...editFields, tipo: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Comunitario', 'Político', 'Institucional', 'Empresarial', 'Mediático', 'Social', 'Educativo'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Territorio</label>
                    <select value={editFields.territorio} onChange={e => setEditFields({ ...editFields, territorio: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Tolú', 'Barbosa', 'Nacional'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Posición</label>
                    <select value={editFields.posicion} onChange={e => setEditFields({ ...editFields, posicion: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Aliado', 'Neutro', 'Opositor'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Riesgo</label>
                    <select value={editFields.riesgo} onChange={e => setEditFields({ ...editFields, riesgo: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {['Bajo', 'Medio', 'Alto', 'Muy Alto'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Poder (1-5)</label>
                    <select value={editFields.poder} onChange={e => setEditFields({ ...editFields, poder: +e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Interés (1-5)</label>
                    <select value={editFields.interes} onChange={e => setEditFields({ ...editFields, interes: +e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Prioridad</label>
                    <select value={editFields.prioridad} onChange={e => setEditFields({ ...editFields, prioridad: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box' }}>
                      <option value="">Sin prioridad</option>
                      <option value="A">A (máxima)</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Responsable</label>
                    <input value={editFields.owner} onChange={e => setEditFields({ ...editFields, owner: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Contacto</label>
                    <input value={editFields.contacto} onChange={e => setEditFields({ ...editFields, contacto: e.target.value })}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Qué hacemos (estrategia)</label>
                    <textarea value={editFields.que_hacemos} onChange={e => setEditFields({ ...editFields, que_hacemos: e.target.value })}
                      rows={2}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button onClick={async () => {
                  setEditSaving(true)
                  try {
                    // Detectar qué campos cambiaron
                    const changed = {}
                    Object.keys(editFields).forEach(k => {
                      if (editFields[k] !== (actor[k] || '')) changed[k] = editFields[k]
                    })
                    if (!Object.keys(changed).length) { alert('No hay cambios'); setEditSaving(false); return }
                    if (isAdmin) {
                      // Admin: aplicar directo
                      await updateActor(actor.id, changed)
                      onUpdated()
                      onClose()
                    } else {
                      // Gestora: enviar para aprobación
                      await submitActorEdit({
                        actor_id: actor.id,
                        user_id: session.user.id,
                        user_name: profile?.full_name || session.user.email,
                        campos: changed
                      })
                      setEditSent(true)
                    }
                  } catch (err) { alert('Error: ' + err.message) }
                  finally { setEditSaving(false) }
                }}
                  disabled={editSaving}
                  style={{ width: '100%', marginTop: 8, background: editSaving ? '#94a3b8' : isAdmin ? C.green : C.navy,
                    color: 'white', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700,
                    cursor: editSaving ? 'wait' : 'pointer' }}>
                  {editSaving ? '⏳ Guardando...' : isAdmin ? '✅ Aplicar cambios' : '📤 Enviar para aprobación'}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
