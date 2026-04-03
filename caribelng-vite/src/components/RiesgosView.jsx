import { useState, useEffect } from 'react'
import { C } from '../lib/constants'
import { Tag, Bar, SemDot } from './ui'
import { getBowTie, deleteRiesgo, addCronogramaLegislativo, deleteCronogramaLegislativo } from '../lib/supabase'

export default function RiesgosView({ riesgos, riesgosLeg, cronoLeg, isAdmin, onDeleted }) {
  const [tab, setTab] = useState('mapa')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 960)
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
      {/* Hero header */}
      <div style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 30%, #dc2626 70%, #f87171 100%)', borderRadius: 20, padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 100, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: rojos.length > 0 ? '#fbbf24' : '#34d399', animation: rojos.length > 0 ? 'none' : 'none' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' }}>{rojos.length + legAlto.length > 0 ? `${rojos.length + legAlto.length} requieren acción` : 'Bajo control'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white' }}>Gestión de Riesgos</h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Dirección de Asuntos Corporativos</p>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{total}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sociales</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{totalLeg}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legislativos</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fbbf24' }}>{rojos.length}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Críticos</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#34d399' }}>{verdes.length}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Controlados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Acción inmediata', key: 'Alto', count: rojos.length, pct: pct(rojos.length), color: C.red, bg: 'linear-gradient(135deg,#fff1f2,#fee2e2)', border: '#fecaca' },
          { label: 'Vigilar', key: 'Medio', count: amarillos.length, pct: pct(amarillos.length), color: C.yellow, bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fde68a' },
          { label: 'Bajo control', key: 'Bajo', count: verdes.length, pct: pct(verdes.length), color: C.green, bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '#a7f3d0' },
          { label: 'En revisión', key: 'Revision', count: azules.length, pct: pct(azules.length), color: C.accent, bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '#93c5fd' },
        ].map(s => {
          const isActive = riesgoFilter === s.key
          return (
            <div key={s.key} onClick={() => { setRiesgoFilter(isActive ? 'Todos' : s.key); setTab('mapa') }}
              style={{ background: isActive ? s.color : s.bg, borderRadius: 14,
                padding: '16px 14px', border: `1px solid ${isActive ? s.color : s.border}`, cursor: 'pointer',
                boxShadow: isActive ? `0 8px 20px ${s.color}30` : '0 1px 4px rgba(0,0,0,0.04)',
                transform: isActive ? 'translateY(-2px)' : 'none', transition: 'all 0.2s' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? 'white' : s.color, marginBottom: 8, boxShadow: `0 0 8px ${isActive ? 'rgba(255,255,255,0.5)' : s.color + '60'}` }} />
              <div style={{ fontSize: 28, fontWeight: 900, color: isActive ? 'white' : '#2B2926', lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: isActive ? 'rgba(255,255,255,0.9)' : s.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{s.label}</div>
              {total > 0 && <div style={{ marginTop: 8, height: 4, borderRadius: 100, background: isActive ? 'rgba(255,255,255,0.3)' : `${s.color}20`, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: isActive ? 'white' : s.color, borderRadius: 100, transition: 'width 0.6s' }} />
              </div>}
            </div>
          )
        })}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#f8fafc', borderRadius: 12, padding: 4, border: '1px solid #e8ecf0' }}>
        {[
          { id: 'mapa', label: 'Sociales', count: riesgos.length },
          { id: 'legislativo', label: 'Legislativos', count: riesgosLeg.length },
          { id: 'cronograma', label: 'Agenda', count: cronoLeg.length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? C.navy : '#94a3b8',
              border: 'none', borderRadius: 8, padding: '10px 4px',
              fontSize: isMobile ? 11 : 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.3px',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span>{t.label}</span>
            {t.count > 0 && <span style={{ fontSize: 9, fontWeight: 600, color: tab === t.id ? '#94a3b8' : '#cbd5e1' }}>{t.count}</span>}
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
                  <div key={r.id} style={{ background: 'white', borderRadius: 14, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8ecf0', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: semColor }} />
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#2B2926', lineHeight: 1.4 }}>{r.nombre}</div>
                      {!isExp && r.que_hacemos && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.que_hacemos}</div>}
                    </div>
                    {isExp && (
                      <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
                        <div style={{ paddingTop: 12 }}>
                          {r.descripcion && <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 10, background: 'linear-gradient(135deg,#fff7ed,#fffbeb)', padding: '12px 14px', borderRadius: 10, border: '1px solid #fde68a' }}><span style={{ fontWeight: 700, color: '#9a3412', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qué puede pasar</span><br/>{r.descripcion}</div>}
                          {r.quien_detona && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}><div style={{ width: 3, height: 14, background: C.red, borderRadius: 2, flexShrink: 0, marginTop: 2 }} /><div><span style={{ fontWeight: 700, color: '#dc2626', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actores clave</span><br/>{r.quien_detona}</div></div>}
                          {r.quien_mitiga && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}><div style={{ width: 3, height: 14, background: C.green, borderRadius: 2, flexShrink: 0, marginTop: 2 }} /><div><span style={{ fontWeight: 700, color: '#059669', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quién nos ayuda</span><br/>{r.quien_mitiga}</div></div>}
                          {r.que_hacemos && <div style={{ fontSize: 12, color: '#166534', background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', padding: '12px 14px', borderRadius: 10, lineHeight: 1.6, marginBottom: 10, border: '1px solid #a7f3d0' }}><span style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qué estamos haciendo</span><br/>{r.que_hacemos}</div>}
                          {bt.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{ width: 3, height: 14, background: C.accent, borderRadius: 2 }} />
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#2B2926', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Causa y efecto</span>
                              </div>
                              {bt.map((b, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr', gap: 8, marginBottom: 10, fontSize: 12, lineHeight: 1.5 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {b.causa && <div style={{ background: 'linear-gradient(135deg,#fff1f2,#fee2e2)', padding: '10px 12px', borderRadius: 10, color: '#991b1b', border: '1px solid #fecaca' }}><span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Causa</span><br/>{b.causa}</div>}
                                    {b.control_preventivo && <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', padding: '10px 12px', borderRadius: 10, color: '#1e40af', border: '1px solid #93c5fd' }}><span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prevención</span><br/>{b.control_preventivo}</div>}
                                  </div>
                                  {!isMobile && <div style={{ display: 'flex', alignItems: 'center', color: '#cbd5e1', fontSize: 18, padding: '0 4px' }}>&rarr;</div>}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {b.control_detectivo && <div style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', padding: '10px 12px', borderRadius: 10, color: '#854d0e', border: '1px solid #fde68a' }}><span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detección</span><br/>{b.control_detectivo}</div>}
                                    {b.consecuencia && <div style={{ background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', padding: '10px 12px', borderRadius: 10, color: '#9d174d', border: '1px solid #fbcfe8' }}><span style={{ fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consecuencia</span><br/>{b.consecuencia}</div>}
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
