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
  const [savingReco, setSavingReco] = useState(false)
  const [recoSaved, setRecoSaved] = useState(false)
  const [savingRecoDAC, setSavingRecoDAC] = useState(false)
  const [recoDACSaved, setRecoDACSaved] = useState(false)
  // Recomendación de relacionamiento (editable directo por gestora)
  const [recomendacion, setRecomendacion] = useState(actor.recomendacion_gestora || '')
  // Lectura estratégica DAC: la caja arranca vacía y queda vacía después de guardar.
  // La lectura previa se muestra como tarjeta arriba, no como contenido del textarea.
  const [recomendacionDAC, setRecomendacionDAC] = useState('')
  // Posición (editable junto con la Lectura DAC para flujo más rápido)
  const [posicion, setPosicion] = useState(actor.posicion || 'Neutro')
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
    telefono: actor.telefono || '', correo: actor.correo || '',
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

  async function handleSaveRecomendacion() {
    setSavingReco(true)
    setRecoSaved(false)
    try {
      await updateActor(actor.id, { recomendacion_gestora: recomendacion })
      onUpdated()
      setRecoSaved(true)
      setTimeout(() => setRecoSaved(false), 2200)
    } catch(e) { alert('Error guardando: ' + e.message) }
    finally { setSavingReco(false) }
  }

  async function handleSaveRecomendacionDAC() {
    setSavingRecoDAC(true)
    setRecoDACSaved(false)
    try {
      const posicionAnterior = actor.posicion || ''
      const posicionCambio = posicion !== posicionAnterior
      const nuevaLectura = recomendacionDAC.trim()
      const tieneNuevaLectura = nuevaLectura.length > 0
      const updates = {}
      if (tieneNuevaLectura) updates.recomendacion_dac = nuevaLectura
      if (posicionCambio) updates.posicion = posicion
      if (Object.keys(updates).length > 0) {
        await updateActor(actor.id, updates)
      }
      // Registrar en historial como interaction tipo "Lectura DAC"
      const partes = []
      if (posicionCambio) partes.push(`Posición: ${posicionAnterior || '(sin definir)'} → ${posicion}`)
      if (tieneNuevaLectura) partes.push(nuevaLectura)
      if (partes.length > 0) {
        await addInteraction({
          actorId: actor.id,
          tipo: 'Lectura DAC',
          resumen: partes.join('\n\n'),
          semaforo_nuevo: actor.semaforo,
          userId: session.user.id
        })
        const fresh = await getInteractions(actor.id)
        setInteractions(fresh || [])
      }
      // Limpiar el textarea para que quede listo para la próxima lectura.
      // La lectura recién guardada se muestra como "Última lectura" arriba.
      setRecomendacionDAC('')
      onUpdated()
      setRecoDACSaved(true)
      setTimeout(() => setRecoDACSaved(false), 3000)
    } catch(e) { alert('Error guardando: ' + e.message) }
    finally { setSavingRecoDAC(false) }
  }

  const sc = SEMAFORO[actor.semaforo] || SEMAFORO.amarillo

  const MODAL_TABS = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'relacionamiento', label: 'Actividad' },
    { id: 'personal', label: 'Personal' },
    { id: 'editar', label: 'Editar' },
  ]

  const tc = getTipoColor(actor.tipo)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 580,
        maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header con gradiente */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1a3d7a 60%, #1565C0 100%)`, padding: '20px 24px 16px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
              {actor.nombre?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>{actor.nombre}</h2>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{actor.tipo} · {actor.territorio}{actor.nivel ? ` · ${actor.nivel}` : ''}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: sc.color + '30', color: 'white' }}>{sc.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>{actor.posicion}</span>
                {actor.prioridad === 'A' && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 100, background: '#fbbf24', color: '#78350f' }}>Prioridad A</span>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, marginTop: -1, background: '#f8fafc', borderRadius: 12, padding: 4, border: '1px solid #e8ecf0' }}>
          {MODAL_TABS.map(t => (
            <button key={t.id} onClick={() => setModalTab(t.id)}
              style={{ flex: 1, background: modalTab === t.id ? 'white' : 'transparent',
                border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 12, fontWeight: 700,
                color: modalTab === t.id ? C.navy : '#94a3b8', cursor: 'pointer', letterSpacing: '0.3px',
                boxShadow: modalTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: PERFIL ── */}
        {modalTab === 'perfil' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Estado relación', value: sc.label, color: sc.color,
                  desc: actor.semaforo === 'rojo' ? 'Sin acercamiento' : actor.semaforo === 'naranja' ? 'En construcción' : actor.semaforo === 'amarillo' ? 'Avanzando' : 'Relación activa',
                  bg: sc.bg },
                { label: 'Posición', value: actor.posicion, color: (actor.posicion || '').includes('Aliado') ? '#10b981' : (actor.posicion || '').includes('Opositor') ? '#ef4444' : '#64748b',
                  desc: (actor.posicion || '').includes('Aliado') ? 'Apoya el proyecto' : (actor.posicion || '').includes('Opositor') ? 'Se opone activamente' : 'Sin posición definida',
                  bg: (actor.posicion || '').includes('Aliado') ? '#ecfdf5' : (actor.posicion || '').includes('Opositor') ? '#fff1f2' : '#f8fafc' },
                { label: 'Riesgo', value: actor.riesgo || 'N/A', color: (actor.riesgo === 'Alto' || actor.riesgo === 'Muy Alto') ? '#ef4444' : actor.riesgo === 'Medio' ? '#f59e0b' : '#10b981',
                  desc: (actor.riesgo === 'Alto' || actor.riesgo === 'Muy Alto') ? 'Gestión prioritaria' : actor.riesgo === 'Medio' ? 'Seguimiento regular' : 'Monitoreo rutina',
                  bg: (actor.riesgo === 'Alto' || actor.riesgo === 'Muy Alto') ? '#fff1f2' : actor.riesgo === 'Medio' ? '#fffbeb' : '#ecfdf5' },
              ].map(item => (
                <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: '12px 12px', border: `1px solid ${item.color}20` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{item.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}60` }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, background: '#f8fafc', borderRadius: 8, padding: '10px 12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>PODER</div><Pill value={actor.poder} color={C.accent} /></div>
              <div><div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>INTERÉS</div><Pill value={actor.interes} color={C.barbosa} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: C.subtle, fontWeight: 700, marginBottom: 3 }}>CUADRANTE</div><div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{actor.cuadrante}</div></div>
            </div>
            {actor.owner && <InfoRow label="Owner" val={actor.owner} />}
            {actor.frecuencia && <InfoRow label="Frecuencia" val={actor.frecuencia} />}
            {actor.contacto && <InfoRow label="Contacto" val={actor.contacto} />}
            {actor.telefono && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.subtle, fontWeight: 600 }}>Teléfono</span>
                <a href={`tel:${actor.telefono}`} style={{ fontSize: 13, color: C.accent, fontWeight: 600, textDecoration: 'none' }}>{actor.telefono}</a>
              </div>
            )}
            {actor.correo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.border}`, gap: 8 }}>
                <span style={{ fontSize: 12, color: C.subtle, fontWeight: 600 }}>Correo</span>
                <a href={`mailto:${actor.correo}`} style={{ fontSize: 13, color: C.accent, fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.correo}</a>
              </div>
            )}
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

            {/* ── Recomendación de la gestora (amarillo) ── */}
            <div style={{ marginTop: 14, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  💡 Recomendación de la gestora
                </div>
                {recoSaved && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>✓ Guardado</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#a16207', marginBottom: 8, lineHeight: 1.4 }}>
                Lectura desde el campo: tono, canales, frecuencia, temas a evitar, oportunidades.
              </div>
              <textarea
                value={recomendacion}
                onChange={e => setRecomendacion(e.target.value)}
                placeholder="Ej: Prefiere reuniones presenciales en su oficina los miércoles. Evitar temas de la consulta previa hasta que se cierre el acuerdo. Buena entrada por temas educativos..."
                style={{ width: '100%', border: '1px solid #fde68a', borderRadius: 8, padding: '9px 11px', fontSize: 13,
                  resize: 'vertical', minHeight: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                  color: C.text, background: 'white' }}
              />
              <button
                onClick={handleSaveRecomendacion}
                disabled={savingReco || recomendacion === (actor.recomendacion_gestora || '')}
                style={{ marginTop: 8, width: '100%', background: savingReco ? '#94a3b8' : recomendacion === (actor.recomendacion_gestora || '') ? '#e5e7eb' : '#92400e',
                  color: recomendacion === (actor.recomendacion_gestora || '') ? '#9ca3af' : 'white',
                  border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700,
                  cursor: savingReco ? 'wait' : recomendacion === (actor.recomendacion_gestora || '') ? 'default' : 'pointer' }}>
                {savingReco ? 'Guardando...' : 'Guardar recomendación'}
              </button>
            </div>

            {/* ── Lectura estratégica DAC (azul navy, solo admin edita) ── */}
            <div style={{ marginTop: 10, background: '#eff6ff', border: `1px solid ${C.navy}33`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  🎯 Lectura estratégica DAC
                </div>
                {recoDACSaved && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>✓ Guardado</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.navy, opacity: 0.75, marginBottom: 8, lineHeight: 1.4 }}>
                {isAdmin
                  ? 'Tu lectura como Dirección DAC: prioridad política, mensaje institucional, riesgos a vigilar.'
                  : 'Lectura de la Dirección DAC. Solo lectura para gestoras.'}
              </div>
              {isAdmin ? (
                <>
                  {/* Tarjeta con la última lectura registrada */}
                  {actor.recomendacion_dac && (
                    <div style={{ background: 'white', border: `1px solid ${C.navy}22`, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: C.navy, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Última lectura registrada{actor.updated_at ? ` · ${new Date(actor.updated_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                      </div>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {actor.recomendacion_dac}
                      </div>
                    </div>
                  )}
                  {/* Posición editable junto con la lectura */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.navy, opacity: 0.8, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Posición del actor
                    </label>
                    <select
                      value={posicion}
                      onChange={e => setPosicion(e.target.value)}
                      style={{ width: '100%', border: `1px solid ${C.navy}33`, borderRadius: 8, padding: '8px 10px', fontSize: 13,
                        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text, background: 'white', cursor: 'pointer' }}>
                      {['Aliado clave','Aliado','Aliado potencial','Favorable','Neutro','Neutral / Por definir','Opositor potencial','Opositor'].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                      {/* Mantener el valor actual si no está en la lista estándar */}
                      {actor.posicion && !['Aliado clave','Aliado','Aliado potencial','Favorable','Neutro','Neutral / Por definir','Opositor potencial','Opositor'].includes(actor.posicion) && (
                        <option value={actor.posicion}>{actor.posicion}</option>
                      )}
                    </select>
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.navy, opacity: 0.8, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {actor.recomendacion_dac ? 'Nueva lectura' : 'Lectura'}
                  </label>
                  <textarea
                    value={recomendacionDAC}
                    onChange={e => setRecomendacionDAC(e.target.value)}
                    placeholder={actor.recomendacion_dac
                      ? 'Escribe una nueva lectura. Reemplazará la anterior y quedará archivada en el historial.'
                      : 'Ej: Actor clave para destrabar el permiso ANLA. Mantener canal directo conmigo. Evitar exposición mediática hasta Q3...'}
                    style={{ width: '100%', border: `1px solid ${C.navy}33`, borderRadius: 8, padding: '9px 11px', fontSize: 13,
                      resize: 'vertical', minHeight: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      color: C.text, background: 'white' }}
                  />
                  {(() => {
                    const sinCambios = !recomendacionDAC.trim() && posicion === (actor.posicion || 'Neutro')
                    return (
                      <button
                        onClick={handleSaveRecomendacionDAC}
                        disabled={savingRecoDAC || sinCambios}
                        style={{ marginTop: 8, width: '100%', background: savingRecoDAC ? '#94a3b8' : sinCambios ? '#e5e7eb' : C.navy,
                          color: sinCambios ? '#9ca3af' : 'white',
                          border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 700,
                          cursor: savingRecoDAC ? 'wait' : sinCambios ? 'default' : 'pointer' }}>
                        {savingRecoDAC ? 'Guardando...' : 'Registrar lectura DAC'}
                      </button>
                    )
                  })()}
                  {recoDACSaved ? (
                    <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginTop: 8, textAlign: 'center', background: '#dcfce7', borderRadius: 6, padding: '6px 8px' }}>
                      ✓ Lectura registrada en el historial del actor
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: C.navy, opacity: 0.6, marginTop: 6, textAlign: 'center', lineHeight: 1.4 }}>
                      Cada lectura queda archivada en el historial (pestaña Actividad).
                    </div>
                  )}
                </>
              ) : (
                <div style={{ background: 'white', border: `1px solid ${C.navy}22`, borderRadius: 8, padding: '9px 11px', fontSize: 13, color: actor.recomendacion_dac ? C.text : C.subtle, lineHeight: 1.5, minHeight: 40, fontStyle: actor.recomendacion_dac ? 'normal' : 'italic' }}>
                  {actor.recomendacion_dac || 'La Dirección DAC aún no ha registrado lectura estratégica.'}
                </div>
              )}
            </div>
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
              {saving ? 'Guardando...' : 'Guardar novedad'}
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
                          → {i.accion_tomada}{i.fecha_accion ? ` — ${new Date(i.fecha_accion).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : ''}
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
              <Field label="Fecha de cumpleaños" value={cumple} onChange={setCumple} type="date" />
              <Field label="Cónyuge / pareja" value={conyuge} onChange={setConyuge} placeholder="Nombre" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Field label="Hijos" value={hijos} onChange={setHijos} placeholder="Ej: Ana (12), Pedro (8)" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <Field label="Intereses y hobbies" value={hobbies} onChange={setHobbies} placeholder="Ej: fútbol, pesca, música vallenata..." />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 6 }}>Fechas importantes</label>
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
              <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notas personales</label>
              <textarea value={notasPer} onChange={e => setNotasPer(e.target.value)}
                placeholder="Lo que hay que recordar: gustos, tensiones, contexto familiar, temas sensibles..."
                style={{ width: '100%', border: `1px solid #e2e8f0`, borderRadius: 8, padding: '8px 10px', fontSize: 13,
                  resize: 'none', height: 80, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
            </div>
            <button onClick={handleSavePersonal} disabled={savingPersonal}
              style={{ width: '100%', background: savingPersonal ? '#94a3b8' : C.green, color: 'white',
                border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: savingPersonal ? 'wait' : 'pointer' }}>
              {savingPersonal ? 'Guardando...' : 'Guardar datos personales'}
            </button>
          </div>
        )}

        {/* ── TAB: EDITAR ── */}
        {modalTab === 'editar' && (
          <div>
            {editSent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#dcfce7', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#10b981' }}>✓</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>Cambios enviados para aprobación</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>La directora DAC revisará y aprobará los cambios.</div>
              </div>
            ) : (
              <>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                  {isAdmin
                    ? '⚡ Como admin, tus cambios se aplican directamente.'
                    : 'Tus cambios quedarán pendientes hasta que la directora DAC los apruebe.'}
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
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Teléfono</label>
                    <input value={editFields.telefono} onChange={e => setEditFields({ ...editFields, telefono: e.target.value })}
                      type="tel" placeholder="+57 300 123 4567"
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }}>Correo electrónico</label>
                    <input value={editFields.correo} onChange={e => setEditFields({ ...editFields, correo: e.target.value })}
                      type="email" placeholder="nombre@dominio.com"
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
                  {editSaving ? 'Guardando...' : isAdmin ? 'Aplicar cambios' : 'Enviar para aprobación'}
                </button>
              </>
            )}
          </div>
        )}

      </div>
      </div>
    </div>
  )
}
