// Endpoint genérico para enviar notificaciones por email a la DAC.
// Se invoca desde el frontend después de eventos relevantes (nueva acta,
// cambio de posición de actor, etc.) — el subject/html los arma el llamador.

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Caribe LNG Conecta <alertas@caribelng.com>'
const DEFAULT_TO = process.env.ALERT_TO_EMAIL || 'diana.silva@caribelng.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurado' })

  const { to, subject, html, replyTo } = req.body || {}
  if (!subject || !html) return res.status(400).json({ error: 'subject y html son requeridos' })

  const toList = Array.isArray(to) && to.length > 0 ? to : [DEFAULT_TO]

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
