// Vercel Serverless Function: uploads file to OneDrive via Microsoft Graph API
const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET
const DRIVE_USER = process.env.ONEDRIVE_USER || 'diana.silva@caribelng.com'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { fileName, territorio, fileBase64 } = req.body
    if (!fileName || !fileBase64) return res.status(400).json({ error: 'Missing fileName or fileBase64' })

    const token = await getAccessToken()

    // Build path: Evidencias/Tolú/2026-04/filename.jpg
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const folder = `Evidencias/${territorio || 'General'}/${month}`
    const filePath = `${folder}/${fileName}`

    // Convert base64 to buffer
    const buffer = Buffer.from(fileBase64, 'base64')

    // Upload to OneDrive
    const uploadRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${DRIVE_USER}/drive/root:/${filePath}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'image/jpeg',
        },
        body: buffer,
      }
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      throw new Error(`OneDrive upload failed: ${uploadRes.status} ${err}`)
    }

    const fileData = await uploadRes.json()

    return res.status(200).json({
      success: true,
      webUrl: fileData.webUrl,
      path: filePath,
    })
  } catch (e) {
    console.error('OneDrive upload error:', e)
    return res.status(500).json({ error: e.message })
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } }
}
