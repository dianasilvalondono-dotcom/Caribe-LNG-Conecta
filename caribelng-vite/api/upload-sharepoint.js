// Vercel Serverless Function: uploads file to the company SharePoint site via Microsoft Graph API
//
// Reemplaza a upload-onedrive.js (que subia a la OneDrive personal de diana.silva@caribelng.com).
// Ahora sube a la biblioteca de documentos del sitio de SharePoint de la empresa:
//   https://course2.sharepoint.com/sites/CaribeLNG  ->  Documentos/Conecta/...
//
// Requisito de permisos: el registro de Azure (AZURE_CLIENT_ID) debe tener el permiso de
// aplicacion Sites.ReadWrite.All con consentimiento de administrador. Con Files.ReadWrite.All
// (el que usaba la version OneDrive) NO basta para escribir en un sitio de SharePoint.
import { createClient } from '@supabase/supabase-js'

const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET
// Host y ruta del sitio de SharePoint destino (configurables por env var; defaults = sitio de la empresa)
const SP_HOST = process.env.SHAREPOINT_HOST || 'course2.sharepoint.com'
const SP_SITE_PATH = process.env.SHAREPOINT_SITE_PATH || '/sites/CaribeLNG'

async function getAccessToken() {
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
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to get token: ' + JSON.stringify(data))
  return data.access_token
}

// Auth: exige un JWT válido de Supabase en Authorization: Bearer <token>
async function requireAuth(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await authClient.auth.getUser(token)
    if (error || !user) return null
    let role = null
    try {
      const asUser = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data: prof } = await asUser.from('profiles').select('role').eq('id', user.id).single()
      role = prof?.role || null
    } catch { role = null }
    return { user, role }
  } catch {
    return null
  }
}

// Resuelve el site-id de Graph a partir del host + path del sitio.
async function getSiteId(token) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SP_HOST}:${SP_SITE_PATH}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  const data = await res.json()
  if (!data.id) throw new Error('Failed to resolve SharePoint site id: ' + JSON.stringify(data))
  return data.id
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req)
  if (!auth) return res.status(401).json({ error: 'No autorizado' })
  if (!['admin', 'supervisor', 'gestora'].includes(auth.role)) {
    return res.status(403).json({ error: 'Rol sin permiso para subir archivos' }) // SEC-11
  }

  try {
    const { fileName, territorio, fileBase64, type, contentType } = req.body
    if (!fileName || !fileBase64) return res.status(400).json({ error: 'Missing fileName or fileBase64' })

    // SEC-12: sanear territorio y fileName para evitar path traversal en la ruta de Graph.
    // Solo territorios conocidos; cualquier otro cae a 'General'. El nombre se limpia de separadores.
    const TERRITORIOS_OK = ['Tolú', 'Barbosa', 'Nacional', 'General']
    const safeTerritorio = TERRITORIOS_OK.includes(territorio) ? territorio : 'General'
    const safeFileName = String(fileName).replace(/[\\/]/g, '_').replace(/\.\./g, '_')

    const token = await getAccessToken()
    const siteId = await getSiteId(token)

    // Estructura de carpetas (igual que la version OneDrive, ahora bajo la biblioteca del sitio):
    // Evidencias  -> Conecta/Evidencias/{Territorio}/{YYYY-MM}/file
    // Reportes    -> Conecta/Reportes/{Territorio}/file
    // Registros   -> Conecta/Registros/{Territorio}/{YYYY-MM}/file
    // Actas       -> Conecta/Actas Comite Social/{año}/file
    // Ambiental   -> Conecta/Ambiental/Documentos|PGRD|Compromisos/{Territorio}/{YYYY-MM}/file
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const t = safeTerritorio
    let folder
    if (type === 'reporte') folder = `Conecta/Reportes/${t}`
    else if (type === 'registro') folder = `Conecta/Registros/${t}/${month}`
    else if (type === 'acta') folder = `Conecta/Actas Comite Social/${now.getFullYear()}`
    else if (type === 'ambiental') folder = `Conecta/Ambiental/Documentos/${t}/${month}`
    else if (type === 'pgrd') folder = `Conecta/Ambiental/PGRD/${t}/${month}`
    else if (type === 'compromiso') folder = `Conecta/Ambiental/Compromisos/${t}/${month}`
    else folder = `Conecta/Evidencias/${t}/${month}`
    const filePath = `${folder}/${safeFileName}`

    // Convert base64 to buffer
    const buffer = Buffer.from(fileBase64, 'base64')

    // Upload to the site's default document library (Documentos)
    const uploadRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${filePath}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': contentType || 'image/jpeg',
        },
        body: buffer,
      }
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      throw new Error(`SharePoint upload failed: ${uploadRes.status} ${err}`)
    }

    const fileData = await uploadRes.json()

    return res.status(200).json({
      success: true,
      webUrl: fileData.webUrl,
      path: filePath,
    })
  } catch (e) {
    console.error('SharePoint upload error:', e)
    return res.status(500).json({ error: e.message })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}
