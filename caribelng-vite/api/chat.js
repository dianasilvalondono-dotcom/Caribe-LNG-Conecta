import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const MONTHLY_BUDGET = parseFloat(process.env.CHAT_MONTHLY_BUDGET || '10')

// Haiku pricing per million tokens
const INPUT_COST_PER_M = 0.80
const OUTPUT_COST_PER_M = 4.00

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { question, context, userId } = req.body
  if (!question?.trim()) return res.status(400).json({ error: 'No question provided' })
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Check monthly budget
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: usageRows } = await supabase
    .from('chat_usage')
    .select('estimated_cost')
    .gte('created_at', monthStart)

  const monthSpend = (usageRows || []).reduce((s, r) => s + (r.estimated_cost || 0), 0)
  if (monthSpend >= MONTHLY_BUDGET) {
    return res.status(429).json({
      error: `Límite mensual alcanzado ($${monthSpend.toFixed(2)} / $${MONTHLY_BUDGET}). Se reinicia el próximo mes.`
    })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `Eres el asistente de inteligencia artificial de Caribe LNG Conecta, la plataforma de gestión social territorial. Respondes preguntas sobre la operación social del proyecto usando los datos que te proporcionan como contexto.

Reglas:
- Responde en español, de forma clara y concisa
- Usa los datos del contexto para dar respuestas precisas con números concretos
- Si no tienes la información en el contexto, dilo honestamente
- No inventes datos que no estén en el contexto
- Formato: usa bullets y negritas cuando ayude a la claridad
- Máximo 3-4 párrafos por respuesta
- Tono: profesional pero accesible, como un briefing ejecutivo`,
        messages: [
          { role: 'user', content: `CONTEXTO DE LA PLATAFORMA:\n${context}\n\nPREGUNTA: ${question}` }
        ]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: 'Error de API: ' + err })
    }

    const data = await response.json()
    const answer = data.content?.[0]?.text || 'Sin respuesta'
    const inputTokens = data.usage?.input_tokens || 0
    const outputTokens = data.usage?.output_tokens || 0
    const cost = (inputTokens * INPUT_COST_PER_M / 1_000_000) + (outputTokens * OUTPUT_COST_PER_M / 1_000_000)

    // Log usage
    await supabase.from('chat_usage').insert({
      user_id: userId || null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost: cost
    })

    return res.status(200).json({
      answer,
      usage: { inputTokens, outputTokens, cost: cost.toFixed(6) },
      budget: { spent: (monthSpend + cost).toFixed(2), limit: MONTHLY_BUDGET }
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
