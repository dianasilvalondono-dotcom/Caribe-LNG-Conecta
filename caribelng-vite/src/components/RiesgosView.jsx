import { useState, useEffect } from 'react'
import { C } from '../lib/constants'
import { Tag, Bar, SemDot } from './ui'
import { getBowTie, deleteRiesgo, addCronogramaLegislativo, deleteCronogramaLegislativo } from '../lib/supabase'

export default function RiesgosView({ riesgos, riesgosLeg, cronoLeg, isAdmin, onDeleted }) {
  const [tab, setTab] = useState('mapa')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960 || navigator.maxTouchPoints > 0)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 960 || navigator.maxTouchPoints > 0)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const [expandedRisk, setExpandedRisk] = useState(null)
  const [bowTieData, setBowTieData] = useState({})
  const [riesgoFilter, setRiesgoFilter] = useState('Todos')

  async function toggleRisk(rid) {
    if (expandedRisk === rid) { setExpandedRisk(null); return }
    setExpandedRisk(rid)
    if (!bowTieData[rid]) {
      const data = await getBowTie(rid)
      setBowTieData(prev => ({ ...prev, [rid]: data || [] }))
    }
  }

  function getSemaforoColor(sem) {
    if (!sem) return C.subtle
    if (sem.includes('Alto') || sem.includes('Rojo')) return C.red
    if (sem.includes('Medio') || sem.includes('Vigilar')) return C.yellow
    if (sem.includes('Bajo') || sem.includes('control')) return C.green
    if (sem.includes('Revision') || sem.includes('Azul')) return C.accent
    return C.subtle
  }

  function getNivelColor(nivel) {
    if (!nivel) return C.subtle
    const n = nivel.toUpperCase()
    if (n.includes('MUY ALTO')) return '#7f1d1d'
    if (n.includes('ALTO')) return C.red
    if (n.includes('MEDIO')) return C.orange
    if (n.includes('BAJO')) return C.green
    return C.subtle
  }

  // Social risks
  const rojos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Alto') || r.semaforo.includes('urgente')))
  const amarillos = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Medio') || r.semaforo.includes('Vigilar')))
  const verdes = riesgos.filter(r => r.semaforo && (r.semaforo.includes('Bajo') || r.semaforo.includes('control')))
  const azules = riesgos.filter(r => r.semaforo && r.semaforo.includes('Revision'))
  const total = riesgos.length
  const pct = (n) => total ? Math.round((n / total) * 100) : 0

  // Legislative risks bucketed by nivel_riesgo
  const legAlto = (riesgosLeg || []).filter(r => { const n = (r.nivel_riesgo || '').toUpperCase(); return n.includes('MUY ALTO') || n.includes('ALTO') })
  const legMedio = (riesgosLeg || []).filter(r => (r.nivel_riesgo || '').toUpperCase().includes('MEDIO'))
  const legBajo = (riesgosLeg || []).filter(r => (r.nivel_riesgo || '').toUpperCase().includes('BAJO'))
  const totalLeg = (riesgosLeg || []).length
  const pctLeg = (n) => totalLeg ? Math.round((n / totalLeg) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              background: C.navy, color: 'white', padding: '3px 8px', borderRadius: 6 }}>DAC</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dirección de Asuntos Corporativos</span>
          </div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Gestión de Riesgos</h1>
          <p style={{ margin: '4px 0 0', color: C.muted, fontSize: isMobile ? 13 : 15 }}>
            {total} riesgos sociales · {totalLeg} legislativos · {rojos.length + legAlto.length} requieren acción inmediata
          </p>
        </div>
        {/* Dual mini status bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: isMobile ? '100%' : 200 }}>
          {/* Social risks bar — clickable → switches to mapa sub-tab */}
          {total > 0 && <div onClick={() => setTab('mapa')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Sociales y Comunitarios ↗</div>
            <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 3 }}>
              {rojos.length > 0 && <div style={{ background: C.red, flex: rojos.length }} title={`${rojos.length} acción inmediata`} />}
              {amarillos.length > 0 && <div style={{ background: C.yellow, flex: amarillos.length }} title={`${amarillos.length} vigilar`} />}
              {verdes.length > 0 && <div style={{ background: C.green, flex: verdes.length }} title={`${verdes.length} bajo control`} />}
              {azules.length > 0 && <div style={{ background: C.accent, flex: azules.length }} title={`${azules.length} en revisión`} />}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: C.muted, justifyContent: 'flex-end' }}>
              {[[C.red, rojos.length], [C.yellow, amarillos.length], [C.green, verdes.length], [C.accent, azules.length]].map(([c, n], i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: c, fontWeight: 700 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />{n}
                </span>
              ))}
            </div>
          </div>}
          {/* Legislative risks bar — clickable → switches to legislativo sub-tab */}
          {totalLeg > 0 && <div onClick={() => setTab('legislativo')} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Legislativos y Regulatorios ↗</div>
            <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', gap: 1, marginBottom: 3 }}>
              {legAlto.length > 0 && <div style={{ background: C.red, flex: legAlto.length }} title={`${legAlto.length} alto`} />}
              {legMedio.length > 0 && <div style={{ background: C.orange, flex: legMedio.length }} title={`${legMedio.length} medio`} />}
              {legBajo.length > 0 && <div style={{ background: C.green, flex: legBajo.length }} title={`${legBajo.length} bajo`} />}
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: C.muted, justifyContent: 'flex-end' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: C.red, fontWeight: 700 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red, display: 'inline-block' }} />{legAlto.length}</span>
              <span style={{ color: C.orange, fontWeight: 700 }}>{legMedio.length}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: C.green, fontWeight: 700 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, display: 'inline-block' }} />{legBajo.length}</span>
            </div>
          </div>}
        </div>
      </div>

      {/* Filter cards — social risks only */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Riesgos Sociales y Comunitarios</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Acción inmediata', key: 'Alto', count: rojos.length, pct: pct(rojos.length), color: C.red, bg: '#fee2e2' },
          { label: 'Vigilar', key: 'Medio', count: amarillos.length, pct: pct(amarillos.length), color: C.yellow, bg: '#fef9c3' },
          { label: 'Bajo control', key: 'Bajo', count: verdes.length, pct: pct(verdes.length), color: C.green, bg: '#dcfce7' },
          { label: 'En revisión', key: 'Revision', count: azules.length, pct: pct(azules.length), color: C.accent, bg: '#dbeafe' },
        ].map(s => {
          const isActive = riesgoFilter === s.key
          return (
            <div key={s.key} onClick={() => { setRiesgoFilter(isActive ? 'Todos' : s.key); setTab('mapa') }}
              style={{ background: isActive ? s.color : C.card, borderRadius: 12,
                padding: isMobile ? '10px 12px' : '14px 16px',
                borderTop: `3px solid ${s.color}`, cursor: 'pointer',
                boxShadow: isActive ? `0 4px 14px ${s.color}44` : '0 1px 4px rgba(0,0,0,0.07)',
                transform: isActive ? 'translateY(-2px)' : 'none', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 900, color: isActive ? 'white' : s.color, lineHeight: 1 }}>{s.count}</div>
                <span style={{ fontSize: isMobile ? 16 : 20 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: isActive ? 'rgba(255,255,255,0.9)' : s.color, marginTop: 6 }}>{s.label}</div>
              {total > 0 && <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: isActive ? 'rgba(255,255,255,0.3)' : `${s.color}30` }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: isActive ? 'white' : s.color, borderRadius: 2, transition: 'width 0.6s' }} />
              </div>}
            </div>
          )
        })}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'mapa', label: 'Riesgos Sociales', count: riesgos.length },
          { id: 'legislativo', label: 'Riesgos Legislativos', count: riesgosLeg.length },
          { id: 'cronograma', label: 'Agenda Gubernamental', count: cronoLeg.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? C.navy : '#f1f5f9',
              color: tab === t.id ? 'white' : C.text,
              border: 'none', borderRadius: 8, padding: isMobile ? '7px 4px' : '9px 4px',
              fontSize: isMobile ? 11 : 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span>{t.label}</span>
            {t.count > 0 && <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>{t.count} registros</span>}
          </button>
        ))}
      </div>

      {tab === 'mapa' && (
        <div>
          {[
            { label: 'Acción inmediata', color: C.red, items: rojos },
            { label: 'Vigilar', color: C.yellow, items: amarillos },
            { label: 'Bajo control', color: C.green, items: verdes },
            { label: 'En revisión', color: C.accent, items: azules },
          ].filter(g => riesgoFilter === 'Todos' ? g.items.length > 0 : (
            (riesgoFilter === 'Alto' && (g.color === C.red)) ||
            (riesgoFilter === 'Medio' && (g.color === C.yellow)) ||
            (riesgoFilter === 'Bajo' && (g.color === C.green)) ||
            (riesgoFilter === 'Revision' && (g.color === C.accent))
          )).map(group => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${group.color}` }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, display: 'inline-block' }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: group.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>({group.items.length})</span>
              </div>
              {group.items.sort((a, b) => {
                const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0
                const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0
                return numA - numB
              }).map(r => {
                const semColor = getSemaforoColor(r.semaforo)
                const isExp = expandedRisk === r.id
                const bt = bowTieData[r.id] || []
                return (
                  <div key={r.id} style={{ background: C.card, borderRadius: 12, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${semColor}`, overflow: 'hidden' }}>
                    <div onClick={() => toggleRisk(r.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'white', background: semColor, padding: '2px 8px', borderRadius: 10 }}>{r.id}</span>
                          <span style={{ fontSize: 16, color: C.muted }}>{r.zona}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <Tag color={C.muted}>P: {r.probabilidad}</Tag>
                          <Tag color={semColor}>I: {r.impacto}</Tag>
                          {isAdmin && (
                            <button onClick={async (e) => { e.stopPropagation(); if (confirm('¿Borrar este riesgo?')) { await deleteRiesgo(r.id); onDeleted() } }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.red, padding: '0 2px' }}
                              title="Borrar">✕</button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{r.nombre}</div>
                      {!isExp && r.que_hacemos && <div style={{ fontSize: 15, color: C.muted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.que_hacemos}</div>}
                    </div>
                    {isExp && (
                      <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
                        <div style={{ paddingTop: 12 }}>
                          {r.descripcion && <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.5, marginBottom: 10, background: '#fff7ed', padding: '8px 10px', borderRadius: 8 }}><span style={{ fontWeight: 700, color: '#9a3412' }}>Que puede pasar: </span>{r.descripcion}</div>}
                          {r.quien_detona && <div style={{ fontSize: 15, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.red }}>Actores clave a gestionar: </span>{r.quien_detona}</div>}
                          {r.quien_mitiga && <div style={{ fontSize: 15, color: C.muted, marginBottom: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.green }}>Quien nos ayuda a controlarlo: </span>{r.quien_mitiga}</div>}
                          {r.que_hacemos && <div style={{ fontSize: 15, color: '#166534', background: '#f0fdf4', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5, marginBottom: 10 }}><span style={{ fontWeight: 700 }}>Que estamos haciendo hoy: </span>{r.que_hacemos}</div>}
                          {bt.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Causa y efecto</div>
                              {bt.map((b, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, marginBottom: 8, fontSize: 16, lineHeight: 1.4 }}>
                                  <div>
                                    {b.causa && <div style={{ background: '#fee2e2', padding: '6px 8px', borderRadius: 6, color: '#991b1b', marginBottom: 3 }}><span style={{ fontWeight: 700 }}>Causa: </span>{b.causa}</div>}
                                    {b.control_preventivo && <div style={{ background: '#dbeafe', padding: '6px 8px', borderRadius: 6, color: '#1e40af' }}><span style={{ fontWeight: 700 }}>Que hacemos para evitarlo: </span>{b.control_preventivo}</div>}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', color: C.subtle, fontSize: 16, padding: '0 4px' }}>&rarr;</div>
                                  <div>
                                    {b.control_detectivo && <div style={{ background: '#fef9c3', padding: '6px 8px', borderRadius: 6, color: '#854d0e', marginBottom: 3 }}><span style={{ fontWeight: 700 }}>Como nos enteramos: </span>{b.control_detectivo}</div>}
                                    {b.consecuencia && <div style={{ background: '#fce7f3', padding: '6px 8px', borderRadius: 6, color: '#9d174d' }}><span style={{ fontWeight: 700 }}>Si no actuamos: </span>{b.consecuencia}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'legislativo' && (
        <div>
          {[
            { label: 'Riesgo Alto / Muy Alto', color: C.red, items: legAlto },
            { label: 'Riesgo Medio', color: C.yellow, items: legMedio },
            { label: 'Riesgo Bajo', color: C.green, items: legBajo },
          ].filter(g => g.items.length > 0).map(group => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${group.color}` }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, display: 'inline-block' }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: group.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>({group.items.length})</span>
              </div>
              {group.items.map(r => {
                const nivelColor = getNivelColor(r.nivel_riesgo)
                return (
                  <div key={r.id} style={{ background: C.card, borderRadius: 12, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${nivelColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.3, flex: 1 }}>{r.tema}</div>
                      <Tag color={nivelColor}>{r.nivel_riesgo}</Tag>
                    </div>
                    <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>{r.descripcion}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      <Tag color={C.muted}>Prob: {r.probabilidad}</Tag>
                      <Tag color={C.accent}>{r.comision}</Tag>
                    </div>
                    {r.impacto && <div style={{ fontSize: 15, color: '#9a3412', background: '#fff7ed', padding: '6px 8px', borderRadius: 6, lineHeight: 1.5, marginBottom: 6 }}><span style={{ fontWeight: 700 }}>Impacto: </span>{r.impacto}</div>}
                    {r.acciones_preventivas && <div style={{ fontSize: 15, color: '#166534', background: '#f0fdf4', padding: '6px 8px', borderRadius: 6, lineHeight: 1.5 }}><span style={{ fontWeight: 700 }}>Acciones: </span>{r.acciones_preventivas}</div>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'cronograma' && (
        <AgendaGubernamental cronoLeg={cronoLeg} isAdmin={isAdmin} onReloaded={onDeleted} getNivelColor={getNivelColor} isMobile={isMobile} />
      )}
    </div>
  )
}

// Agenda Government Affairs component
function AgendaGubernamental({ cronoLeg, isAdmin, onReloaded, getNivelColor, isMobile }) {
  const NIVELES = ['Bajo', 'Medio', 'Alto', 'Muy Alto']
  const TIPOS = ['Debate de control político', 'Proyecto de ley', 'Audiencia pública', 'Reunión', 'Comisión', 'Otro']

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fecha: '', tipo: '', nivel_riesgo: 'Medio', evento: '', impacto: '', accion: '', responsable: '' })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.fecha || !form.evento) return
    setSaving(true)
    try {
      await addCronogramaLegislativo(form)
      setForm({ fecha: '', tipo: '', nivel_riesgo: 'Medio', evento: '', impacto: '', accion: '', responsable: '' })
      setShowForm(false)
      onReloaded()
    } catch(err) { alert('Error al guardar: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await deleteCronogramaLegislativo(id)
      onReloaded()
    } catch(err) { alert('Error al eliminar: ' + err.message) }
  }

  const sorted = [...(cronoLeg || [])].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

  return (
    <div style={{ padding: isMobile ? '12px 8px' : '0 8px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text }}>
          Agenda Gubernamental
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ background: showForm ? C.muted : C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {showForm ? '✕ Cancelar' : '+ Agregar evento'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && isAdmin && (
        <form onSubmit={handleAdd} style={{ background: '#f1f5f9', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }}>
                <option value="">Seleccionar...</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Nivel de riesgo</label>
              <select value={form.nivel_riesgo} onChange={e => setForm(f => ({ ...f, nivel_riesgo: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }}>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Responsable</label>
              <input type="text" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Nombre"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Evento / Descripción *</label>
            <input type="text" value={form.evento} onChange={e => setForm(f => ({ ...f, evento: e.target.value }))} required placeholder="Descripción del evento"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Impacto</label>
            <textarea value={form.impacto} onChange={e => setForm(f => ({ ...f, impacto: e.target.value }))} rows={2} placeholder="Posible impacto del evento"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Acción</label>
            <textarea value={form.accion} onChange={e => setForm(f => ({ ...f, accion: e.target.value }))} rows={2} placeholder="Acción a tomar"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 14, marginTop: 3, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving}
              style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar evento'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: isMobile ? 16 : 20 }}>
        {sorted.length === 0 && (
          <div style={{ color: C.muted, fontSize: 14, padding: '20px 0' }}>No hay eventos registrados.</div>
        )}
        {sorted.map((ev, i) => {
          const nivelColor = getNivelColor(ev.nivel_riesgo)
          return (
            <div key={ev.id || i} style={{ position: 'relative', paddingLeft: isMobile ? 20 : 28, paddingBottom: 20, borderLeft: `2px solid ${C.border}` }}>
              {/* Dot */}
              <div style={{ position: 'absolute', left: -7, top: 4, width: 12, height: 12, borderRadius: '50%', background: nivelColor, border: '2px solid #fff', boxShadow: '0 0 0 2px ' + nivelColor }} />
              <div style={{ background: C.card, borderRadius: 10, padding: isMobile ? '10px 12px' : '12px 16px', border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, background: nivelColor + '22', color: nivelColor, borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>{ev.nivel_riesgo}</span>
                      {ev.tipo && <span style={{ fontSize: 12, background: '#f1f5f9', color: C.muted, borderRadius: 6, padding: '2px 8px' }}>{ev.tipo}</span>}
                      <span style={{ fontSize: 12, color: C.subtle }}>{ev.fecha}</span>
                    </div>
                    <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{ev.evento}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDelete(ev.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 16, padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
                      title="Eliminar">✕</button>
                  )}
                </div>
                {ev.impacto && <div style={{ fontSize: 13, color: '#9a3412', background: '#fff7ed', padding: '5px 8px', borderRadius: 6, marginBottom: 4, lineHeight: 1.5 }}><span style={{ fontWeight: 700 }}>Impacto: </span>{ev.impacto}</div>}
                {ev.accion && <div style={{ fontSize: 13, color: '#166534', background: '#f0fdf4', padding: '5px 8px', borderRadius: 6, marginBottom: 4, lineHeight: 1.5 }}><span style={{ fontWeight: 700 }}>Acción: </span>{ev.accion}</div>}
                {ev.responsable && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>👤 {ev.responsable}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
