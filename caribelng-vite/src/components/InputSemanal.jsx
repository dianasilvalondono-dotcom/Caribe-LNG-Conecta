import { useState, useEffect } from 'react'
import { C } from '../lib/constants'
import { Field } from './ui'
import { supabase, addReporteSemanal, deleteReporteSemanal, sendAlerta, sendPushNotification, uploadReporteToOneDrive } from '../lib/supabase'

export default function InputSemanal({ session, profile, territorio, reportes, seguimiento, onSaved, isAdmin }) {
  const [tab, setTab] = useState('reporte')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 960)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [myTerr, setMyTerr] = useState(territorio || 'Barbosa')

  const [semana, setSemana] = useState('')
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0])
  const [acuerdosFirmados, setAcuerdosFirmados] = useState(0)
  const [compromisosNuevos, setCompromisosNuevos] = useState(0)
  const [compromisosCumplidos, setCompromisosCumplidos] = useState(0)
  const [diagnosticos, setDiagnosticos] = useState(0)
  const [actasVecindad, setActasVecindad] = useState(0)
  const [induccionesPgs, setInduccionesPgs] = useState(0)
  const [eventosAid, setEventosAid] = useState(0)
  const [eventosAii, setEventosAii] = useState(0)
  const [eventosInst, setEventosInst] = useState(0)
  const [asistentes, setAsistentes] = useState(0)
  const [pqrsRecibidas, setPqrsRecibidas] = useState(0)
  const [pqrsCerradas, setPqrsCerradas] = useState(0)
  const [pqrsPendientes, setPqrsPendientes] = useState(0)
  const [incidentes, setIncidentes] = useState(0)
  const [actoresGest, setActoresGest] = useState(0)
  const [alertasDac, setAlertasDac] = useState(0)
  // Nuevos campos PDF
  const [pctSocAsistentes, setPctSocAsistentes] = useState(0)
  const [ciclosDiag, setCiclosDiag] = useState(0)
  const [pctPqrsTiempo, setPctPqrsTiempo] = useState(0)
  const [pctPqrsCerradas, setPctPqrsCerradas] = useState(0)
  const [incumplimientos, setIncumplimientos] = useState(0)
  // Tolú específicos
  const [asociacionesMapeadas, setAsociacionesMapeadas] = useState(0)
  const [personasObstaculizadoras, setPersonasObstaculizadoras] = useState(0)
  const [aliadosIdentificados, setAliadosIdentificados] = useState(0)
  const [visitasAid, setVisitasAid] = useState(0)

  const [logros, setLogros] = useState('')
  const [dificultades, setDificultades] = useState('')
  const [escalamientos, setEscalamientos] = useState('')
  const [prioridades, setPrioridades] = useState('')

  const [alertaMensaje, setAlertaMensaje] = useState('')
  const [alertaUrgencia, setAlertaUrgencia] = useState('Media')
  const [alertaEnviada, setAlertaEnviada] = useState(false)

  async function handleSaveReporte() {
    if (!semana || !fechaCorte) return
    setSaving(true)
    try {
      await addReporteSemanal({
        semana: parseInt(semana), fecha_corte: fechaCorte, territorio: myTerr, user_id: session.user.id,
        acuerdos_firmados: acuerdosFirmados, compromisos_nuevos: compromisosNuevos, compromisos_cumplidos: compromisosCumplidos,
        incumplimientos_acuerdos: incumplimientos,
        diagnosticos, actas_vecindad: actasVecindad, inducciones_pgs: induccionesPgs,
        ciclos_diagnostico: ciclosDiag,
        asociaciones_mapeadas: asociacionesMapeadas, personas_obstaculizadoras: personasObstaculizadoras,
        aliados_identificados: aliadosIdentificados, visitas_aid: visitasAid,
        eventos_aid: eventosAid, eventos_aii: eventosAii, eventos_institucional: eventosInst, asistentes_total: asistentes,
        pct_socializaciones_asistentes: pctSocAsistentes,
        pqrs_recibidas: pqrsRecibidas, pqrs_cerradas: pqrsCerradas, pqrs_pendientes: pqrsPendientes,
        pct_pqrs_tiempo: pctPqrsTiempo, pct_pqrs_cerradas: pctPqrsCerradas,
        incidentes, actores_gestionados: actoresGest, alertas_escaladas_dac: alertasDac,
        logros, dificultades, escalamientos, prioridades_proxima: prioridades
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      onSaved()
      // Subir reporte a OneDrive
      uploadReporteToOneDrive({
        semana: parseInt(semana), fecha_corte: fechaCorte, territorio: myTerr,
        gestora: profile?.full_name, acuerdos_firmados: acuerdosFirmados,
        compromisos_nuevos: compromisosNuevos, compromisos_cumplidos: compromisosCumplidos,
        eventos_aid: eventosAid, eventos_aii: eventosAii, eventos_institucional: eventosInst,
        asistentes_total: asistentes, pqrs_recibidas: pqrsRecibidas, pqrs_cerradas: pqrsCerradas,
        incidentes, actores_gestionados: actoresGest, logros, dificultades, escalamientos, prioridades_proxima: prioridades
      }, myTerr, semana).catch(() => {})
      // Notificar a admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      if (admins?.length) {
        sendPushNotification({
          title: `Reporte Semanal — ${myTerr} S${semana}`,
          body: `${profile?.full_name || 'Gestora'} envió el reporte de la semana ${semana}`,
          user_ids: admins.map(a => a.id)
        }).catch(() => {})
      }
    } finally { setSaving(false) }
  }

  async function handleSendAlerta() {
    if (!alertaMensaje.trim()) return
    setSaving(true)
    try {
      await sendAlerta({
        gestora: profile?.full_name || session?.user?.email,
        territorio: myTerr,
        mensaje: alertaMensaje,
        urgencia: alertaUrgencia
      })
      setAlertaMensaje('')
      setAlertaEnviada(true)
      setTimeout(() => setAlertaEnviada(false), 4000)
      // Notificar a admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      if (admins?.length) {
        sendPushNotification({
          title: `Alerta ${alertaUrgencia} — ${myTerr}`,
          body: `${profile?.full_name || 'Gestora'}: ${alertaMensaje.substring(0, 100)}`,
          user_ids: admins.map(a => a.id)
        }).catch(() => {})
      }
    } catch(e) {
      alert('Error enviando alerta: ' + e.message)
    } finally { setSaving(false) }
  }

  const myReportes = reportes.filter(r => r.territorio === myTerr)

  const NumField = ({ label, value, onChange, max }) => (
    <div style={{ flex: 1, minWidth: 120 }}>
      <label style={{ fontSize: 16, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 3 }}>{label}</label>
      <input type="number" min="0" max={max} value={value} onChange={e => { const v = parseInt(e.target.value) || 0; onChange(max ? Math.min(v, max) : v) }}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 16,
          fontWeight: 700, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center' }} />
    </div>
  )

  const TextArea = ({ label, value, onChange, placeholder }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 15, color: C.muted, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 16,
          resize: 'none', height: 60, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: C.text }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Input Semanal</h1>
        <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 16 }}>{profile?.full_name} &rarr; Cada viernes</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {['Barbosa', 'Tolú'].map(t => (
                <button key={t} onClick={() => setMyTerr(t)}
                  style={{ flex: 1, background: myTerr === t ? C.navy : '#f1f5f9', color: myTerr === t ? 'white' : C.text,
                    border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
      </div>

      {saved && (
        <div style={{ background: '#dcfce7', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 15, color: '#166534', fontWeight: 600 }}>
          Guardado correctamente
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { id: 'reporte', label: 'Reporte Semanal' },
          { id: 'alerta', label: 'Escalar alerta' },
          { id: 'historico', label: 'Histórico' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, background: tab === t.id ? (t.id === 'alerta' ? C.red : C.navy) : '#f1f5f9',
              color: tab === t.id ? 'white' : C.text,
              border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reporte' && (
        <div>
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 16, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3 }}>SEMANA #</label>
                <input type="number" value={semana} onChange={e => setSemana(e.target.value)} placeholder="1-52"
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 16,
                    fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 16, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 3 }}>FECHA CORTE</label>
                <input type="date" value={fechaCorte} onChange={e => setFechaCorte(e.target.value)}
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 15,
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* OBJ.1 — PGS: Socializaciones y Eventos */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.tolu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.1 — PGS: Socializaciones y Eventos</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Socializaciones AID" value={eventosAid} onChange={setEventosAid} />
              <NumField label="Socializaciones AII" value={eventosAii} onChange={setEventosAii} />
              <NumField label="Reuniones institucionales" value={eventosInst} onChange={setEventosInst} />
              <NumField label="Asistentes total" value={asistentes} onChange={setAsistentes} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <NumField label="% socializ. con >=10 asistentes" value={pctSocAsistentes} onChange={setPctSocAsistentes} max={100} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>El % se calcula sobre AID+AII con al menos 10 asistentes</div>
          </div>

          {/* OBJ.1 — Diagnóstico (territory-specific) */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            {myTerr === 'Barbosa' ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.barbosa, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.1 — Diagnóstico Sociofamiliar (53 viviendas)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <NumField label="Visitas a familias (diag.)" value={diagnosticos} onChange={setDiagnosticos} />
                  <NumField label="Ciclos diagnóstico" value={ciclosDiag} onChange={setCiclosDiag} />
                  <NumField label="Actas de vecindad" value={actasVecindad} onChange={setActasVecindad} />
                  <NumField label="Inducciones PGS contratistas" value={induccionesPgs} onChange={setInduccionesPgs} />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.tolu, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.1 — Diagnóstico Social (asociaciones y actores)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <NumField label="Asociaciones mapeadas" value={asociacionesMapeadas} onChange={setAsociacionesMapeadas} />
                  <NumField label="Personas obstaculizadoras" value={personasObstaculizadoras} onChange={setPersonasObstaculizadoras} />
                  <NumField label="Aliados identificados" value={aliadosIdentificados} onChange={setAliadosIdentificados} />
                  <NumField label="Visitas a comunidades AID" value={visitasAid} onChange={setVisitasAid} />
                  <NumField label="Inducciones PGS contratistas" value={induccionesPgs} onChange={setInduccionesPgs} />
                </div>
              </>
            )}
          </div>

          {/* OBJ.3 — PQRS */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.orange, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.3 — Gestión de PQRS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="PQRS recibidas" value={pqrsRecibidas} onChange={setPqrsRecibidas} />
              <NumField label="PQRS cerradas" value={pqrsCerradas} onChange={setPqrsCerradas} />
              <NumField label="PQRS pendientes" value={pqrsPendientes} onChange={setPqrsPendientes} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <NumField label="% respondidas en tiempo" value={pctPqrsTiempo} onChange={setPctPqrsTiempo} max={100} />
              <NumField label="% cerradas en plazo" value={pctPqrsCerradas} onChange={setPctPqrsCerradas} max={100} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>% respondidas: ≤10 días hábiles · % cerradas: ≤15 días hábiles · Meta: 100%</div>
          </div>

          {/* OBJ.3 — Riesgo e incidentes */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.3 — Riesgo e Incidentes</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Incidentes / rumores críticos" value={incidentes} onChange={setIncidentes} />
              <NumField label="Alertas escaladas a DAC" value={alertasDac} onChange={setAlertasDac} />
              <NumField label="Personas contactadas" value={actoresGest} onChange={setActoresGest} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>Meta incidentes: 0 · Alertas escaladas en ≤24h: ≥90%</div>
          </div>

          {/* OBJ.2 — Acuerdos */}
          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>OBJ.2 — Acuerdos Sociales</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NumField label="Acuerdos firmados" value={acuerdosFirmados} onChange={setAcuerdosFirmados} />
              <NumField label="Compromisos nuevos" value={compromisosNuevos} onChange={setCompromisosNuevos} />
              <NumField label="Compromisos cumplidos" value={compromisosCumplidos} onChange={setCompromisosCumplidos} />
              <NumField label="Incumplimientos con impacto" value={incumplimientos} onChange={setIncumplimientos} />
            </div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>Meta acuerdos: {myTerr === 'Barbosa' ? '3' : '3 (T1+T2+T3)'} antes COD · Compromisos cumplidos: ≥90% · Incumplimientos: 0</div>
          </div>

          <div style={{ background: C.card, borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Resumen Narrativo</div>
            <TextArea label="Que se logro esta semana" value={logros} onChange={setLogros} placeholder="Que se logro esta semana..." />
            <TextArea label="Dificultades o problemas" value={dificultades} onChange={setDificultades} placeholder="Que dificultades hubo..." />
            <TextArea label="Temas que necesitan atencion de direccion" value={escalamientos} onChange={setEscalamientos} placeholder="Que se escalo a Diana..." />
            <TextArea label="Que hay que hacer la proxima semana" value={prioridades} onChange={setPrioridades} placeholder="Que hay que hacer la proxima semana..." />
          </div>

          <button onClick={handleSaveReporte} disabled={saving || !semana}
            style={{ width: '100%', background: saving ? '#94a3b8' : C.navy, color: 'white',
              border: 'none', borderRadius: 10, padding: '13px', fontSize: 16, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', marginBottom: 20 }}>
            {saving ? 'Guardando...' : 'Guardar Reporte Semanal'}
          </button>
          <div style={{ textAlign: 'center', fontSize: 13, color: C.subtle, marginTop: 4 }}>
            El reporte se sube automáticamente a OneDrive
          </div>
        </div>
      )}

      {tab === 'alerta' && (
        <div>
          <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Escalar alerta a Diana Silva</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>El mensaje llega directamente al correo de la Directora de Asuntos Corporativos.</div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Nivel de urgencia</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Alta', 'Media', 'Baja'].map(u => (
                  <button key={u} onClick={() => setAlertaUrgencia(u)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1.5px solid',
                      borderColor: alertaUrgencia === u ? (u === 'Alta' ? C.red : u === 'Media' ? C.orange : C.yellow) : '#e2e8f0',
                      background: alertaUrgencia === u ? (u === 'Alta' ? '#fee2e2' : u === 'Media' ? '#fff7ed' : '#fefce8') : 'white',
                      color: alertaUrgencia === u ? (u === 'Alta' ? C.red : u === 'Media' ? C.orange : C.yellow) : C.muted,
                      fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    {u === 'Alta' ? '●' : u === 'Media' ? '●' : '●'} {u}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.text, display: 'block', marginBottom: 5 }}>Mensaje *</label>
              <textarea value={alertaMensaje} onChange={e => setAlertaMensaje(e.target.value)} rows={5}
                placeholder="Describe la situación que necesitas escalar: qué pasó, quiénes están involucrados, qué necesitas de Diana..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #fecdd3',
                  fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            {alertaEnviada && (
              <div style={{ background: '#dcfce7', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 14, color: '#166534', fontWeight: 600 }}>
                Alerta enviada a diana.silva@caribelng.com
              </div>
            )}

            <button onClick={handleSendAlerta} disabled={saving || !alertaMensaje.trim()}
              style={{ width: '100%', background: saving || !alertaMensaje.trim() ? '#f1f5f9' : C.red,
                color: saving || !alertaMensaje.trim() ? C.muted : 'white',
                border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700,
                cursor: saving || !alertaMensaje.trim() ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enviando...' : 'Enviar alerta'}
            </button>
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Reportes enviados ({myReportes.length})
          </div>
          {myReportes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: C.subtle, fontSize: 15 }}>No hay reportes aun. Llena tu primer reporte semanal.</div>
          )}
          {myReportes.map(r => {
            const totalEventos = (r.eventos_aid || 0) + (r.eventos_aii || 0) + (r.eventos_institucional || 0)
            const semaforo = r.incidentes > 0 ? C.red : r.pqrs_pendientes > 3 ? C.orange : C.green
            return (
              <div key={r.id} style={{ background: C.card, borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${semaforo}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Semana {r.semana}</span>
                    <span style={{ fontSize: 15, color: C.subtle, marginLeft: 8 }}>{new Date(r.fecha_corte).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {(isAdmin || profile?.role === 'gestora') && (
                      <button onClick={async () => { if (confirm('¿Borrar este reporte?')) { await deleteReporteSemanal(r.id); onSaved() } }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.red, padding: '0 2px' }}
                        title="Borrar">✕</button>
                    )}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: semaforo }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
                  {[
                    { label: 'Acuerdos', value: r.acuerdos_firmados, color: C.accent },
                    { label: 'Eventos', value: totalEventos, color: C.tolu },
                    { label: 'Quejas pend.', value: r.pqrs_pendientes, color: r.pqrs_pendientes > 0 ? C.orange : C.green },
                    { label: 'Actores', value: r.actores_gestionados, color: C.barbosa },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 15, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {r.logros && <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5 }}><span style={{ fontWeight: 700, color: C.text }}>Logros: </span>{r.logros}</div>}
                {r.dificultades && <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginTop: 2 }}><span style={{ fontWeight: 700, color: C.text }}>Dificultades: </span>{r.dificultades}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
