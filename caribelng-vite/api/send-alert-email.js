const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Caribe LNG Conecta <alertas@caribelng.com>'
const TO_EMAIL = process.env.ALERT_TO_EMAIL || 'diana.silva@caribelng.com'

const URGENCIA_LABELS = {
  alta: { emoji: '🔴', label: 'ALTA' },
  media: { emoji: '🟡', label: 'MEDIA' },
  baja: { emoji: '🟢', label: 'BAJA' },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY no configurado' })

  const { gestora, territorio, mensaje, urgencia } = req.body || {}
  if (!mensaje) return res.status(400).json({ error: 'Faltan datos de la alerta' })

  const { emoji, label } = URGENCIA_LABELS[urgencia] || { emoji: '⚪', label: (urgencia || '').toUpperCase() }
  const subject = `${emoji} Alerta ${label} — ${territorio || 'Sin territorio'}`
  const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="background: #0D47A1; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">Alerta de Campo — Caribe LNG Conecta</h2>
      </div>
      <div style="border: 1px solid #E8ECF0; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #5C6370; font-size: 13px; width: 120px;">Gestora</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 13px;">${gestora || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #5C6370; font-size: 13px;">Territorio</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 13px;">${territorio || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #5C6370; font-size: 13px;">Urgencia</td>
            <td style="padding: 8px 0; font-weight: 600; font-size: 13px;">${emoji} ${label}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #5C6370; font-size: 13px;">Fecha</td>
            <td style="padding: 8px 0; font-size: 13px;">${now}</td>
          </tr>
        </table>
        <div style="background: #F8FAFC; border-left: 4px solid #0D47A1; padding: 16px; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2B2926;">${mensaje}</p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #8D95A0; text-align: center;">
          Caribe LNG Conecta · Dirección de Asuntos Corporativos
        </p>
      </div>
    </div>
  `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [TO_EMAIL], subject, html }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(response.status).json({ error: data.message || 'Error enviando email' })
    }

    return res.status(200).json({ ok: true, id: data.id })
  } catch (err) {
    console.error('send-alert-email error:', err)
    return res.status(500).json({ error: err.message })
  }
}
