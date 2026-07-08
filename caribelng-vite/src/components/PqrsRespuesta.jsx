import { useState } from 'react'
import { supabase, uploadPqrsDoc } from '../lib/supabase'
import { C } from '../lib/constants'

// Documento de marca (Brand Book v2): plantilla oficial (banner navy + pie de olas), tipografía Georgia.
const SERIF = "Georgia, 'Times New Roman', serif"
const NAVY = '#0D47A1'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function fechaLarga(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0')
  return `${dd} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

// Cuerpo estándar profesional; si resultado === 'Negada' usa el texto de fase preliminar / PGS en estructuración.
function cuerpoDefault(p) {
  const tema = (p.categoria_tema || p.descripcion || 'su solicitud').toString().trim()
  if (p.resultado === 'Negada') {
    return (
      `En atención a su solicitud relacionada con ${tema.toLowerCase()}, nos permitimos informarle que el proyecto de Caribe LNG se encuentra actualmente en una fase preliminar de desarrollo. ` +
      `El Plan de Gestión Social (PGS), instrumento a través del cual se canalizan las iniciativas de inversión y relacionamiento con las comunidades del área de influencia, se encuentra en proceso de estructuración. ` +
      `Por lo anterior, en este momento no es posible realizar aportes, contribuciones ni compromisos económicos por fuera de los mecanismos formales que dicho plan definirá una vez sea aprobado. ` +
      `Reiteramos nuestra disposición al diálogo permanente y le confirmamos que su solicitud queda debidamente registrada para ser considerada dentro de los espacios de participación que se habiliten en el marco del PGS.`
    )
  }
  return (
    `En atención a su comunicación relacionada con ${tema.toLowerCase()}, y una vez surtido el análisis correspondiente por parte de las áreas responsables de Caribe LNG, nos permitimos dar respuesta de fondo en los siguientes términos. ` +
    `La compañía ha revisado los hechos expuestos y adelanta las gestiones que resultan procedentes dentro de su ámbito de actuación y de conformidad con los procedimientos internos de relacionamiento con las comunidades del área de influencia del proyecto. ` +
    `Quedamos atentos a cualquier inquietud adicional y reiteramos nuestra disposición al diálogo permanente y transparente con usted y con la comunidad.`
  )
}

function asuntoDefault(p) {
  const base = 'Respuesta de fondo al derecho de petición relacionado con '
  const tema = (p.categoria_tema || p.descripcion || '').toString().trim()
  const corto = tema.length > 90 ? tema.slice(0, 90).trim() + '…' : tema
  return base + (corto ? corto.toLowerCase() : 'la solicitud radicada')
}

export default function PqrsRespuesta({ p, onClose, onSaved, onSaveDoc }) {
  const [asunto, setAsunto] = useState(p.respuesta_asunto || asuntoDefault(p))
  const [hechos, setHechos] = useState(p.respuesta_hechos || (p.descripcion || ''))
  const [cuerpo, setCuerpo] = useState(p.respuesta_cuerpo || cuerpoDefault(p))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [respNombre, setRespNombre] = useState(p.respuesta_nombre || '')

  async function subirRespuestaFirmada(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const { url, nombre } = await uploadPqrsDoc(file, p.codigo, 'respuesta')
      if (onSaveDoc) await onSaveDoc(p, { respuesta_url: url, respuesta_nombre: nombre })
      setRespNombre(nombre)
    } catch (err) {
      alert('No se pudo subir la respuesta firmada: ' + (err?.message || err))
    }
    setUploading(false)
  }

  const hoy = fechaLarga(new Date())
  const dirigidoA = [p.solicitante_nombre, p.organizacion].filter(Boolean).join(' – ') || '—'
  const contacto = [p.telefono, p.lugar_ocurrencia].filter(Boolean).join(' – ') || '—'

  async function guardarCuerpo() {
    setSaving(true)
    const patch = {
      respuesta_cuerpo: cuerpo,
      respuesta_asunto: asunto,
      respuesta_hechos: hechos,
      updated_at: new Date().toISOString(),
    }
    let { error } = await supabase.from('pqrs').update(patch).eq('id', p.id)
    // Fallback: si respuesta_asunto / respuesta_hechos aún no existen en la tabla, persistir al menos el cuerpo.
    if (error && /column|does not exist|schema/i.test(error.message || '')) {
      ;({ error } = await supabase.from('pqrs').update({ respuesta_cuerpo: cuerpo, updated_at: new Date().toISOString() }).eq('id', p.id))
    }
    setSaving(false)
    if (error) return alert('No se pudo guardar la respuesta: ' + error.message)
    onSaved && onSaved({ respuesta_cuerpo: cuerpo, respuesta_asunto: asunto, respuesta_hechos: hechos })
    alert('Respuesta guardada.')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, overflowY: 'auto', padding: '20px 12px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>

      {/* Estilos de impresión: solo la carta, tamaño carta, márgenes */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pqrs-carta, #pqrs-carta * { visibility: visible !important; }
          #pqrs-carta {
            position: absolute !important; left: 0; top: 0; width: 100% !important;
            box-shadow: none !important; border-radius: 0 !important; margin: 0 !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .pqrs-noprint { display: none !important; }
          .pqrs-edit { border: none !important; background: transparent !important; padding: 0 !important; resize: none !important; }
          @page { size: letter; margin: 18mm 16mm; }
        }
      `}</style>

      {/* Barra de acciones (no se imprime) */}
      <div className="pqrs-noprint" style={{ maxWidth: 800, margin: '0 auto 12px', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
        <span style={{ marginRight: 'auto', color: 'white', fontSize: 12, fontFamily: "Georgia, 'Times New Roman', serif", opacity: 0.9 }}>
          Documento editable · ajusta el texto antes de imprimir
        </span>
        <button onClick={guardarCuerpo} disabled={saving}
          style={{ background: '#047857', color: 'white', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: "Georgia, 'Times New Roman', serif", opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Guardando…' : '💾 Guardar cuerpo'}
        </button>
        <button onClick={() => window.print()}
          style={{ background: NAVY, color: 'white', border: 'none', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
          🖨 Imprimir / Guardar PDF
        </button>
        <label
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: uploading ? 'default' : 'pointer', fontFamily: "Georgia, 'Times New Roman', serif", opacity: uploading ? 0.6 : 1, whiteSpace: 'nowrap' }}
          title="Sube el PDF ya firmado como Respuesta firmada del caso">
          {uploading ? 'Subiendo...' : (respNombre ? '📎 Reemplazar firmada' : '📎 Subir firmada')}
          <input type="file" accept=".pdf,image/*" onChange={subirRespuestaFirmada} disabled={uploading} style={{ display: 'none' }} />
        </label>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "Georgia, 'Times New Roman', serif" }}>
          ✕ Cerrar
        </button>
      </div>

      {/* La carta */}
      <div id="pqrs-carta" style={{ maxWidth: 800, margin: '0 auto', background: 'white', borderRadius: 6, overflow: 'hidden', fontFamily: SERIF, color: '#2B2926', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>

        {/* Encabezado oficial (Brand Book v2): franja navy con logo en reversa + ola */}
        <img src="/brand/banner_cover.png" alt="Caribe LNG" style={{ display: 'block', width: '100%' }} />

        <div style={{ padding: '28px 40px 40px' }}>
          {/* Título */}
          <h1 style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 700, color: NAVY, fontFamily: SERIF, letterSpacing: 0.3 }}>PQRS - SOLICITUD</h1>
          <div style={{ fontSize: 13, color: '#5C6370', marginBottom: 20, fontFamily: SERIF }}>
            Respuesta: <strong style={{ color: '#2B2926' }}>{p.numero_documental || p.codigo || '—'}</strong>
          </div>

          {/* Tabla de encabezado */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontFamily: SERIF, fontSize: 13 }}>
            <tbody>
              <HeadRow label="Fecha" value={hoy} />
              <HeadRow label="Punto de contacto" value="Alexandra S. Acevedo · Coordinadora Territorial y Social" />
              <HeadRow label="Correo" value="pqrs@caribelng.com" />
              <HeadRow label="Revisó" value="Diana Silva · Directora de Asuntos Corporativos" />
              <HeadRow label="Confidencialidad" value="Público" />
              <HeadRow label="Dirigido a peticionaria" value={dirigidoA} />
              <HeadRow label="Contacto" value={contacto} />
              <HeadRow label="Territorial" value="Ana Leonor Pérez - 3017064627" />
            </tbody>
          </table>

          {/* 1. Asunto */}
          <SeccionTitulo>1. Asunto:</SeccionTitulo>
          <textarea className="pqrs-edit" value={asunto} onChange={e => setAsunto(e.target.value)} rows={2}
            style={editStyle()} />

          {/* 1.1 Hechos */}
          <SeccionTitulo>1.1 Hechos:</SeccionTitulo>
          <textarea className="pqrs-edit" value={hechos} onChange={e => setHechos(e.target.value)} rows={4}
            style={editStyle()} />

          {/* Cuerpo de la respuesta */}
          <SeccionTitulo>Cuerpo de la respuesta</SeccionTitulo>
          <textarea className="pqrs-edit" value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={10}
            style={editStyle()} />

          {/* Cierre legal fijo */}
          <p style={{ fontSize: 13, lineHeight: 1.7, marginTop: 18, textAlign: 'justify', fontFamily: SERIF }}>
            La presente comunicación constituye respuesta de fondo a su solicitud, en cumplimiento del artículo 23 de la
            Constitución Política, desarrollado por la Ley 1755 de 2015, por medio de la cual se regula el derecho
            fundamental de petición. En caso de no encontrarse conforme con la presente respuesta, podrá ejercer los
            recursos y las acciones que la ley le confiere.
          </p>

          <p style={{ fontSize: 13, lineHeight: 1.7, marginTop: 18, marginBottom: 4, fontFamily: SERIF }}>Cordialmente,</p>
          <div style={{ marginTop: 44, borderTop: '1px solid #2B2926', width: 300, paddingTop: 6, fontSize: 13, fontFamily: SERIF }}>
            <strong>Alexandra Acevedo</strong><br />
            Coordinadora Territorial y Social de Caribe LNG
          </div>
        </div>

        {/* Footer oficial (Brand Book v2): watermark de olas con razón social + dirección (texto incrustado en la imagen) */}
        <img src="/brand/band_footer_company.png" alt="Caribe LNG S.A.S. E.S.P. · Cra. 7 #73-47, oficina 801. Bogotá, Colombia" style={{ display: 'block', width: '100%', marginTop: 8 }} />
      </div>
    </div>
  )
}

function HeadRow({ label, value }) {
  return (
    <tr>
      <td style={{ padding: '6px 12px 6px 0', width: 200, verticalAlign: 'top', color: '#5C6370', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: 0.5, borderBottom: '1px solid #E4E7EC', fontFamily: SERIF }}>
        {label}
      </td>
      <td style={{ padding: '6px 0', verticalAlign: 'top', fontSize: 13, color: '#2B2926', borderBottom: '1px solid #E4E7EC', fontFamily: SERIF }}>
        {value}
      </td>
    </tr>
  )
}

function SeccionTitulo({ children }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, margin: '20px 0 6px', fontFamily: SERIF }}>{children}</div>
}

function editStyle() {
  return {
    width: '100%', boxSizing: 'border-box', border: '1px solid #E4E7EC', borderRadius: 6,
    padding: '10px 12px', fontSize: 13, lineHeight: 1.7, fontFamily: SERIF, color: '#2B2926',
    background: '#FCFDFE', outline: 'none', resize: 'vertical', textAlign: 'justify',
  }
}
