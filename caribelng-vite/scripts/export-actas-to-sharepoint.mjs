// Exporta las actas del Comite de Gestion Social (tabla comite_actas en Supabase)
// como documentos HTML con la marca Caribe LNG y las sube a SharePoint, vía el
// endpoint de produccion /api/upload-sharepoint (type 'acta' ->
// Conecta/Actas Comite Social/{año}). No requiere secreto de Azure.
//
// USO:  node scripts/export-actas-to-sharepoint.mjs
//       DRY_RUN=1 node scripts/export-actas-to-sharepoint.mjs   (solo genera, no sube)

// SEC-15: sin fallback embebido. La anon key es pública por diseño, pero
// hardcodearla dificulta la rotación; se lee siempre de entorno.
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_ANON = process.env.VITE_SUPABASE_ANON_KEY
if (!SUPA_URL || !SUPA_ANON) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el entorno.')
  process.exit(1)
}
const UPLOAD_URL = process.env.UPLOAD_URL || 'https://caribe-lng-conecta.vercel.app/api/upload-sharepoint'
const DRY_RUN = process.env.DRY_RUN === '1'

const NAVY = '#0D47A1', BLUE = '#1565C0', INK = '#2B2926', LINE = '#E4E7EC', ALT = '#F4F6FA'

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function nl2html(s) {
  return esc(s).split(/\n+/).filter(p => p.trim()).map(p => `<p style="margin:0 0 8px;line-height:1.6;">${p.trim()}</p>`).join('')
}
function fmtFecha(f) {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const [y, m, d] = (f || '').split('-').map(Number)
  if (!y) return f || ''
  return `${d} de ${meses[m - 1]} de ${y}`
}
function safeName(s) {
  return String(s || 'acta').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_').slice(0, 70)
}

function buildHtml(a) {
  const sec = (titulo, color, bg, contenidoHtml) => contenidoHtml ? `
    <div style="margin:0 0 18px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${color};margin:0 0 6px;">${titulo}</div>
      <div style="background:${bg};border:1px solid ${LINE};border-radius:8px;padding:12px 14px;font-size:13px;color:${INK};">${contenidoHtml}</div>
    </div>` : ''
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(a.titulo)}</title></head>
<body style="margin:0;padding:0;background:#fff;font-family:Georgia,'Times New Roman',serif;color:${INK};">
  <div style="max-width:760px;margin:0 auto;">
    <div style="background:${NAVY};color:#fff;padding:22px 28px;">
      <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Caribe LNG · Direccion de Asuntos Corporativos</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">Acta de Comite — Gestion Social PGS</div>
    </div>
    <div style="padding:24px 28px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;font-size:13px;">
        <tr><td style="padding:4px 0;color:${BLUE};font-weight:700;width:120px;">Titulo</td><td style="padding:4px 0;">${esc(a.titulo)}</td></tr>
        <tr><td style="padding:4px 0;color:${BLUE};font-weight:700;">Fecha</td><td style="padding:4px 0;">${fmtFecha(a.fecha_comite)}</td></tr>
        <tr><td style="padding:4px 0;color:${BLUE};font-weight:700;vertical-align:top;">Asistentes</td><td style="padding:4px 0;">${esc(a.asistentes)}</td></tr>
      </table>
      ${sec('Desarrollo y temas', NAVY, ALT, nl2html(a.temas))}
      ${sec('Acuerdos', '#1B5E20', '#E8F5E9', nl2html(a.acuerdos))}
      ${sec('Compromisos', '#8B6A00', '#FFF8E1', nl2html(a.compromisos))}
    </div>
    <div style="border-top:1px solid ${LINE};padding:14px 28px;font-size:11px;color:#8D95A0;text-align:center;">
      Caribe LNG S.A.S. E.S.P. · Cra. 7 #73-47, oficina 801. Bogota, Colombia<br>
      Documento generado desde Caribe LNG ¡Conecta! · Acta #${a.id}
    </div>
  </div>
</body></html>`
}

import { readFile } from 'node:fs/promises'

async function loadActas() {
  // 1) Intentar Supabase REST (requiere que RLS permita lectura; la anon key sola NO pasa RLS).
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/comite_actas?select=*&order=fecha_comite`, {
      headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}` },
    })
    if (res.ok) {
      const j = await res.json()
      if (Array.isArray(j) && j.length) return j
    }
  } catch { /* fallthrough */ }
  // 2) Fallback: snapshot local exportado desde el conector de Supabase (bypassa RLS).
  const raw = await readFile(new URL('./actas_data.json', import.meta.url), 'utf8')
  return JSON.parse(raw)
}

async function main() {
  const actas = (await loadActas()).sort((a, b) => (a.fecha_comite || '').localeCompare(b.fecha_comite || ''))
  console.log(`${actas.length} actas encontradas.`)

  let ok = 0, fail = 0
  for (const a of actas) {
    const fileName = `Acta_${a.fecha_comite}_${safeName(a.titulo)}.html`
    const html = buildHtml(a)
    if (DRY_RUN) { console.log(`[DRY] ${fileName} (${html.length} bytes)`); continue }
    try {
      const up = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName, territorio: 'General', type: 'acta',
          fileBase64: Buffer.from(html, 'utf8').toString('base64'),
          contentType: 'text/html; charset=utf-8',
        }),
      })
      const j = await up.json()
      if (j.success) { ok++; console.log(`OK  ${fileName}\n    -> ${j.webUrl}`) }
      else { fail++; console.error(`ERR ${fileName}: ${JSON.stringify(j)}`) }
    } catch (e) { fail++; console.error(`ERR ${fileName}: ${e.message}`) }
  }
  console.log(`\nListo. Subidas: ${ok}  Errores: ${fail}  Total: ${actas.length}`)
}
main().catch(e => { console.error(e); process.exit(1) })
