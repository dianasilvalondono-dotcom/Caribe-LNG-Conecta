import { useState } from 'react'
import { C } from '../lib/constants'
import { supabase } from '../lib/supabase'

// Login OTP · código al correo (6 dígitos)
// SSO Microsoft temporalmente oculto — pendiente de config Azure AD redirect URI de Supabase
// Reactivar cambiando SHOW_MICROSOFT_SSO a true cuando Pablo ajuste el Azure Portal

const SHOW_MICROSOFT_SSO = false

export default function LoginScreen() {
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('clng_last_email') || '' } catch { return '' }
  })
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e) {
    e.preventDefault()
    if (!email) return
    setSending(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) throw error
      try { localStorage.setItem('clng_last_email', email) } catch {}
      setSent(true)
    } catch (err) {
      setError(err.message || 'Error al enviar el código')
    }
    setSending(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    if (!code || code.length < 6) return
    setVerifying(true); setError('')
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      })
      if (error) throw error
    } catch (err) {
      setError(err.message || 'Código inválido')
      setVerifying(false)
    }
  }

  async function handleMicrosoft() {
    setSending(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: { redirectTo: window.location.origin, scopes: 'email openid profile' }
      })
      if (error) throw error
    } catch (err) {
      setError('No se pudo conectar con Microsoft. Intenta con código al correo.')
      setSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.barbosa || '#00BFB3'} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Montserrat, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <img src="/logo-conecta.svg" alt="Caribe LNG Conecta" style={{ width: '100%', maxWidth: 260, margin: '0 auto 12px', display: 'block' }} onError={e => e.target.style.display = 'none'} />
        <p style={{ margin: '0 0 4px', color: C.muted, fontSize: 14, fontWeight: 600 }}>Plan de Gestión Social 2026</p>
        <p style={{ margin: '0 0 24px', color: C.subtle || C.muted, fontSize: 12 }}>Tolú · Barbosa · Nacional</p>

        {sent ? (
          <form onSubmit={handleVerify}>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F0FDF4', marginBottom: 14, fontSize: 12, color: '#047857' }}>
              Código enviado a <strong>{email}</strong>
            </div>
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Código del correo" autoFocus
              style={{ width: '100%', padding: 14, fontSize: 18, letterSpacing: 3, textAlign: 'center', fontWeight: 700, border: '1.5px solid #e2e8f0', borderRadius: 10, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            <button type="submit" disabled={verifying || code.length < 6}
              style={{ width: '100%', padding: 14, marginTop: 10, background: C.navy, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (verifying || code.length < 6) ? 0.6 : 1 }}>
              {verifying ? 'Verificando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => { setSent(false); setCode(''); setError('') }}
              style={{ width: '100%', padding: 10, marginTop: 6, background: 'transparent', color: C.muted, border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Usar otro correo
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSend}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu.correo@caribelng.com" required
                style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 10, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
              />
              <button type="submit" disabled={sending || !email}
                style={{ width: '100%', padding: '13px 16px', background: C.navy, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (sending || !email) ? 0.6 : 1 }}>
                {sending ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>

            {SHOW_MICROSOFT_SSO && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: C.muted, fontSize: 12 }}>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />o<div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>
                <button onClick={handleMicrosoft}
                  style={{ width: '100%', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#2B2926', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg width="16" height="16" viewBox="0 0 23 23"><rect x="1" y="1" width="10" height="10" fill="#F25022"/><rect x="12" y="1" width="10" height="10" fill="#7FBA00"/><rect x="1" y="12" width="10" height="10" fill="#00A4EF"/><rect x="12" y="12" width="10" height="10" fill="#FFB900"/></svg>
                  Entrar con Microsoft
                </button>
              </>
            )}
          </>
        )}

        {error && <p style={{ color: '#B91C1C', fontSize: 12, margin: '12px 0 0' }}>{error}</p>}
        <p style={{ margin: '20px 0 0', fontSize: 11, color: C.subtle || C.muted }}>
          Solo para equipo Caribe LNG · acceso controlado por rol
        </p>
      </div>
    </div>
  )
}
