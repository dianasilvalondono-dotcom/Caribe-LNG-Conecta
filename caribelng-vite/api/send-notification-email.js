// Endpoint genérico para enviar notificaciones por email a la DAC.
// Se invoca desde el frontend después de eventos relevantes (nueva acta,
// cambio de posición de actor, etc.) — el subject/html los arma el llamador.

import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Caribe LNG Conecta <alertas@caribelng.com>'
const DEFAULT_TO = process.env.ALERT_TO_EMAIL || 'diana.silva@caribelng.com'

// Auth: exige un JWT válido de Supabase y devuelve {user, role}. El rol se lee
// server-side con la service key (SEC-08/SEC-11): no basta con tener sesión.
async function requireAuth(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    // Rol leído con el token del propio usuario (RLS permite leer el propio perfil).
    // No depende de SUPABASE_SERVICE_KEY para no bloquear a todos si no está configurada.
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

// Solo se permiten destinatarios @caribelng.com (evita usar el endpoint como relay abierto)
function isAllowedRecipient(email) {
  return typeof email === 'string' && /^[^\s@]+@caribelng\.com$/i.test(email.trim())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAuth(req)
  if (!auth) return res.status(401).json({ error: 'No autorizado' })
  // Solo roles con función operativa pueden disparar notificaciones (evita abuso por 'viewer'). SEC-08.
  if (!['admin', 'supervisor', 'gestora'].includes(auth.role)) {
    return res.status(403).json({ error: 'Rol sin permiso para enviar notificaciones' })
  }

  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurado' })

  const { to, subject, html, replyTo } = req.body || {}
  if (!subject || !html) return res.status(400).json({ error: 'subject y html son requeridos' })

  const rawTo = Array.isArray(to) ? to : (to ? [to] : [])
  const toList = rawTo.length > 0 ? rawTo : [DEFAULT_TO]
  if (!toList.every(isAllowedRecipient)) {
    return res.status(400).json({ error: 'Destinatario no permitido' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toList,
        subject,
        html,
        reply_to: replyTo,
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: 'Resend rechazó el envío', detail: err })
    }
    const data = await response.json()
    return res.status(200).json({ ok: true, id: data?.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
