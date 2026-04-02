import { useState, useRef, useCallback } from 'react'
import { C } from '../lib/constants'
import { supabase } from '../lib/supabase'

export default function ChatBot({ appData, knowledgeDocs, session, isMobile }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  function buildContext() {
    const d = appData
    const lines = []
    lines.push(`== RESUMEN GENERAL ==`)
    lines.push(`Total actores: ${d.actors?.length || 0}`)
    const byTerr = (t) => d.actors?.filter(a => a.territorio === t) || []
    lines.push(`Actores Tolú: ${byTerr('Tolú').length}, Barbosa: ${byTerr('Barbosa').length}, Nacional: ${byTerr('Nacional').length}`)
    const sem = (color) => d.actors?.filter(a => a.semaforo === color).length || 0
    lines.push(`Semáforo: ${sem('Verde')} verde, ${sem('Amarillo')} amarillo, ${sem('Rojo')} rojo`)
    lines.push(`Total acuerdos: ${d.agreements?.length || 0}`)
    d.agreements?.forEach(a => lines.push(`  - ${a.nombre}: ${a.estado} (${a.territorio})`))
    lines.push(`Total riesgos sociales: ${d.riesgos?.length || 0}`)
    d.riesgos?.forEach(r => lines.push(`  - [${r.nivel_riesgo}] ${r.riesgo} → Acción: ${r.accion_inmediata}`))
    lines.push(`Total riesgos legislativos: ${d.riesgosLeg?.length || 0}`)
    d.riesgosLeg?.forEach(r => lines.push(`  - [${r.nivel_riesgo}] ${r.riesgo} → ${r.accion_inmediata}`))
    lines.push(`\n== HUELLA SOCIAL TERRITORIAL ==`)
    lines.push(`TOLÚ: C3 Licencia C3 (formación, género, sustancias peligrosas) | HUB Muelle Astivik (hub operativo, deportes acuáticos, certificaciones marítimas) | ECO Ambiental Marino (impacto ambiental con pescadores, restauración arrecifes)`)
    lines.push(`BARBOSA: C3 Licencia C3 (formación, género) | HUB Cancha El Machete (polideportivo, espacio comunitario) | ECO Cadena de Reciclaje (puntos ecológicos, siembra 150 árboles, genera ingreso)`)
    lines.push(`\n== CRONOGRAMA LEGISLATIVO ==`)
    d.cronoLeg?.forEach(c => lines.push(`  - ${c.fecha}: [${c.nivel_riesgo}] ${c.evento} (${c.tipo})`))
    lines.push(`\n== ACTORES CLAVE (top 20 por relevancia) ==`)
    const topActors = [...(d.actors || [])].sort((a, b) => (b.relevancia || 0) - (a.relevancia || 0)).slice(0, 20)
    topActors.forEach(a => lines.push(`  - ${a.nombre} (${a.territorio}, ${a.sector}, semáforo: ${a.semaforo}, cargo: ${a.cargo || 'N/A'})`))
    lines.push(`\n== KPIs DAC ==`)
    d.kpisDac?.forEach(k => lines.push(`  - ${k.kpi_id}: valor=${k.valor || 'pendiente'}, estado=${k.estado || 'EN CURSO'}`))
    lines.push(`\n== REPORTES SEMANALES ==`)
    lines.push(`Total reportes: ${d.reportes?.length || 0}`)
    const lastR = d.reportes?.[0]
    if (lastR) lines.push(`Último reporte: Semana ${lastR.semana} (${lastR.territorio}) — Eventos AID: ${lastR.eventos_aid}, AII: ${lastR.eventos_aii}, PQRS: ${lastR.pqrs_recibidas}, Incidentes: ${lastR.incidentes}`)
    // Knowledge base documents
    if (knowledgeDocs?.length) {
      lines.push(`\n== BASE DE CONOCIMIENTO (${knowledgeDocs.length} documentos) ==`)
      knowledgeDocs.forEach(d => {
        lines.push(`\n--- ${d.titulo} [${d.categoria}] ---`)
        lines.push(d.contenido)
      })
    }
    return lines.join('\n')
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context: buildContext(), userId: session?.user?.id })
      })
      const data = await res.json()
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.error }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer, budget: data.budget }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error de conexión: ' + e.message }])
    } finally { setLoading(false) }
  }

  const panelW = isMobile ? '92vw' : 400
  const panelH = isMobile ? '70vh' : 500

  return (
    <>
      {/* Floating label above button */}
      {!open && (
        <div onClick={() => setOpen(true)}
          style={{ position: 'fixed', bottom: isMobile ? 78 : 88, right: isMobile ? 4 : 8,
            background: 'white', borderRadius: 14, padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            cursor: 'pointer', zIndex: 10000, textAlign: 'center', minWidth: 180,
            border: `1.5px solid ${C.navy}22` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>¡Hola! Soy Conecta</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Tu asistente personal de Caribe LNG</div>
          {/* Arrow pointing down */}
          <div style={{ position: 'absolute', bottom: -8, right: 28, width: 16, height: 16,
            background: 'white', transform: 'rotate(45deg)', boxShadow: '2px 2px 4px rgba(0,0,0,0.08)',
            borderRight: `1.5px solid ${C.navy}22`, borderBottom: `1.5px solid ${C.navy}22` }} />
        </div>
      )}
      {/* Floating button */}
      <button onClick={() => setOpen(!open)}
        style={{ position: 'fixed', bottom: isMobile ? 16 : 24, right: isMobile ? 16 : 24,
          width: 56, height: 56, borderRadius: '50%', background: C.navy, color: 'white',
          border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', cursor: 'pointer',
          fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        {open ? '✕' : <svg viewBox="0 0 863.64 794.92" width="28" height="28"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#90caf9" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{ position: 'fixed', bottom: isMobile ? 80 : 90, right: isMobile ? '4vw' : 24,
          width: panelW, height: panelH, background: 'white', borderRadius: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)', zIndex: 9998, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid #e8ecf0' }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, #0D47A1 0%, #1a3d7a 60%, #1565C0 100%)`, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 863.64 794.92" width="28" height="28"><path fill="#fff" d="M426.09,605.21c-24.95-5.2-50.05-7.83-74.6-7.83-48.9,0-95.09,10.12-137.27,30.12-.03,0-.06.03-.09.03,27.18,53.3,68.19,109.2,126.41,167.39,0,0,101.03-72.55,127.8-180.89l-42.25-8.82ZM407.3,369.29c-19.9-76.36-26.5-218.87,123.5-369.29,0,0-398.92,193.08-357.66,500.5,59.71-38.26,129.97-58.41,204.07-58.41,21.36,0,43.15,1.7,64.88,5.08-1.15-1.95-2.32-3.9-3.53-5.88-13.74-22.44-24.64-46.55-31.26-72h0ZM559.06,623.91c-8.45,0-16.78-.28-24.73-.77-.84-.06-1.67-.09-2.51-.19-12.26,55.56-48.97,116.1-132.11,171.97,0,0,168.23-15.1,253.62-182.4-30.43,7.55-62.03,11.39-94.28,11.39ZM617.35,254.06c-43.8-53.15-83.6-131.24-56.95-224.47,0,0-139.72,129.38-95.09,328.93,7,31.11,19.41,60.67,35.16,88.31,2.04,3.59,4.21,7.55,6.44,11.89l48.25,8.7c21.42,3.87,43.05,5.82,64.32,5.82s43.64-2.1,64.44-6.22c2.75-.56,5.51-1.11,8.26-1.73,1.42-75.86-25.13-150.96-74.84-211.22h0Z"/><path fill="#90caf9" d="M863.64,410.8c-42.84,81.22-111.86,138.14-193.92,164.85-34.88,11.39-72.09,17.3-110.66,17.3-7.55,0-15.14-.22-22.78-.71-19.16-1.15-38.6-3.75-58.19-7.8l-4.4-.93-41.26-8.6c-27.21-5.66-54.32-8.48-80.94-8.48-53.05,0-104.22,11.17-150.52,33.09-4.83,2.29-9.63,4.7-14.39,7.24L0,706.43l133.28-134.18c14.27-14.36,29.62-27.27,45.9-38.6,57.01-39.68,125.42-60.6,198.03-60.6,22.9,0,46.27,2.1,69.8,6.35l11.89,2.14,62.74,11.3,28.04,5.05c23.49,4.24,46.83,6.31,69.8,6.31s47.57-2.26,70.45-6.81c47.14-9.29,91.34-28.01,130.31-55.68l43.4-30.89Z"/></svg>
            <div>
              <div style={{ color: 'white', fontSize: 14, fontWeight: 800 }}>Conecta</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Asistente IA · Caribe LNG</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: C.subtle, fontSize: 13, padding: '30px 10px', lineHeight: 1.7 }}>
                ¡Hola! Soy <b>Conecta</b>, tu asistente personal de Caribe LNG.<br />
                Pregúntame lo que necesites sobre actores, acuerdos, riesgos, huella social, KPIs o cualquier dato de la plataforma.
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 14 }}>
                  {['¿Cuántos actores hay en Tolú?', '¿Cuál es la huella social de Barbosa?', '¿Qué riesgos legislativos tenemos?', '¿Cómo van los acuerdos?'].map(q => (
                    <button key={q} onClick={() => { setInput(q); }}
                      style={{ background: 'white', border: '1px solid #e8ecf0', borderRadius: 10, padding: '7px 12px',
                        fontSize: 11, color: '#2B2926', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all 0.15s' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  background: m.role === 'user' ? C.navy : '#f1f5f9',
                  color: m.role === 'user' ? 'white' : C.text,
                  padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'user' ? 12 : 4,
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.text}
                </div>
                {m.budget && (
                  <div style={{ fontSize: 10, color: C.subtle, marginTop: 2, textAlign: 'right' }}>
                    ${m.budget.spent} / ${m.budget.limit} este mes
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '10px 14px', borderRadius: 12, fontSize: 13, color: C.muted }}>
                Pensando...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #e8ecf0', padding: '12px 14px', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu pregunta..."
              style={{ flex: 1, border: '1px solid #e8ecf0', borderRadius: 12, padding: '10px 14px',
                fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#2B2926', background: '#f8fafc' }} />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              style={{ background: loading ? '#94a3b8' : C.navy, color: 'white', border: 'none',
                borderRadius: 12, width: 44, height: 44, fontSize: 18, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
              →
            </button>
          </div>
        </div>
      )}
    </>
  )
}

