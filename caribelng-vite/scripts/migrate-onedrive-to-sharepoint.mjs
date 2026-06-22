// Migracion una sola vez: copia TODO el arbol Conecta/ de la OneDrive personal
// (diana.silva@caribelng.com) a la biblioteca de documentos del sitio de SharePoint
// de la empresa (course2.sharepoint.com/sites/CaribeLNG), conservando la estructura
// de carpetas exacta.
//
// Requiere Node 18+ (usa fetch global). Usa las MISMAS credenciales de Azure que la app.
// El registro de Azure debe tener permisos de aplicacion: Files.Read.All (origen OneDrive)
// + Sites.ReadWrite.All (destino SharePoint), con consentimiento de administrador.
//
// USO:
//   AZURE_TENANT_ID=...  AZURE_CLIENT_ID=...  AZURE_CLIENT_SECRET=...  \
//   node scripts/migrate-onedrive-to-sharepoint.mjs
//
// Opcionales (tienen default):
//   ONEDRIVE_USER       (default diana.silva@caribelng.com)  -> cuenta origen
//   SHAREPOINT_HOST     (default course2.sharepoint.com)
//   SHAREPOINT_SITE_PATH(default /sites/CaribeLNG)
//   SOURCE_ROOT         (default Conecta)  -> carpeta raiz a migrar dentro de OneDrive
//   DRY_RUN=1           -> solo lista lo que copiaria, sin escribir nada

const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET
const ONEDRIVE_USER = process.env.ONEDRIVE_USER || 'diana.silva@caribelng.com'
const SP_HOST = process.env.SHAREPOINT_HOST || 'course2.sharepoint.com'
const SP_SITE_PATH = process.env.SHAREPOINT_SITE_PATH || '/sites/CaribeLNG'
const SOURCE_ROOT = process.env.SOURCE_ROOT || 'Conecta'
const DRY_RUN = process.env.DRY_RUN === '1'

const G = 'https://graph.microsoft.com/v1.0'

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Faltan AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET en el entorno.')
  process.exit(1)
}

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })
  const d = await res.json()
  if (!d.access_token) throw new Error('Token error: ' + JSON.stringify(d))
  return d.access_token
}

async function gj(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${await res.text()}`)
  return res.json()
}

async function getSourceDriveId(token) {
  const d = await gj(token, `${G}/users/${ONEDRIVE_USER}/drive`)
  return d.id
}

async function getDestDriveId(token) {
  const site = await gj(token, `${G}/sites/${SP_HOST}:${SP_SITE_PATH}`)
  const drive = await gj(token, `${G}/sites/${site.id}/drive`)
  return drive.id
}

// Recorre recursivamente la carpeta origen y devuelve la lista de archivos
// con su ruta relativa respecto a SOURCE_ROOT.
async function listFiles(token, srcDriveId, folderPath) {
  const out = []
  let url = `${G}/drives/${srcDriveId}/root:/${encodeURI(folderPath)}:/children?$top=200`
  while (url) {
    const page = await gj(token, url)
    for (const item of page.value) {
      const childPath = `${folderPath}/${item.name}`
      if (item.folder) {
        out.push(...await listFiles(token, srcDriveId, childPath))
      } else if (item.file) {
        out.push({
          relPath: childPath,
          size: item.size,
          downloadUrl: item['@microsoft.graph.downloadUrl'],
        })
      }
    }
    url = page['@odata.nextLink'] || null
  }
  return out
}

async function downloadBuffer(downloadUrl) {
  const res = await fetch(downloadUrl)
  if (!res.ok) throw new Error(`download ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// Subida simple (<=4MB) o por sesion (archivos grandes) al drive destino.
async function uploadToDest(token, destDriveId, relPath, buffer) {
  const path = encodeURI(relPath)
  if (buffer.length <= 4_000_000) {
    const res = await fetch(`${G}/drives/${destDriveId}/root:/${path}:/content`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: buffer,
    })
    if (!res.ok) throw new Error(`PUT ${res.status} ${await res.text()}`)
    return
  }
  // Upload session para archivos grandes (chunks de 5MB)
  const sess = await fetch(`${G}/drives/${destDriveId}/root:/${path}:/createUploadSession`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
  }).then(r => r.json())
  const CHUNK = 5 * 1024 * 1024
  for (let start = 0; start < buffer.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, buffer.length)
    const chunk = buffer.subarray(start, end)
    const res = await fetch(sess.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end - 1}/${buffer.length}`,
      },
      body: chunk,
    })
    if (!res.ok && res.status !== 202 && res.status !== 201 && res.status !== 200) {
      throw new Error(`chunk ${res.status} ${await res.text()}`)
    }
  }
}

async function main() {
  const token = await getToken()
  const [srcDriveId, destDriveId] = await Promise.all([getSourceDriveId(token), getDestDriveId(token)])
  console.log(`Origen OneDrive drive: ${srcDriveId}`)
  console.log(`Destino SharePoint drive: ${destDriveId}`)
  console.log(`Listando ${SOURCE_ROOT}/ ...`)

  let files
  try {
    files = await listFiles(token, srcDriveId, SOURCE_ROOT)
  } catch (e) {
    console.error(`No se pudo listar "${SOURCE_ROOT}" en OneDrive: ${e.message}`)
    process.exit(1)
  }
  console.log(`${files.length} archivos encontrados.`)

  let ok = 0, fail = 0
  for (const f of files) {
    if (DRY_RUN) { console.log(`[DRY] ${f.relPath} (${f.size} bytes)`); continue }
    try {
      const buf = await downloadBuffer(f.downloadUrl)
      await uploadToDest(token, destDriveId, f.relPath, buf)
      ok++
      console.log(`OK  ${f.relPath}`)
    } catch (e) {
      fail++
      console.error(`ERR ${f.relPath} -> ${e.message}`)
    }
  }
  console.log(`\nListo. Copiados: ${ok}  Errores: ${fail}  Total: ${files.length}`)
  if (DRY_RUN) console.log('(DRY_RUN: no se escribio nada en SharePoint)')
}

main().catch(e => { console.error(e); process.exit(1) })
