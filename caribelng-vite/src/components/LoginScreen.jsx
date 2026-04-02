import { useState } from 'react'
import { C } from '../lib/constants'
import { supabase, signInWithMicrosoft } from '../lib/supabase'

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showEmail, setShowEmail] = useState(false)

  const handleMicrosoft = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithMicrosoft()
    } catch (e) {
      setError('No se pudo conectar. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const handleEmail = async () => {
    if (!email || !password) return
    setLoadingEmail(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoadingEmail(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${C.navy} 0%, #1e3a6e 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 380, width: '100%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <img src="/logo-conecta.svg" alt="Caribe LNG Conecta" style={{ width: '100%', maxWidth: 300, margin: '0 auto 8px', display: 'block' }} />
        <p style={{ margin: '0 0 6px', color: C.muted, fontSize: 15 }}>
          Plan de Gestion Social 2026
        </p>
        <p style={{ margin: '0 0 32px', color: C.subtle, fontSize: 16 }}>
          Tolú →  Barbosa →  Nacional
        </p>

        <button onClick={handleMicrosoft} disabled={loading}
          style={{ width: '100%', background: loading ? '#f1f5f9' : '#2f2f2f', border: 'none',
            borderRadius: 10, padding: '13px 16px', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', color: 'white', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          {loading ? 'Conectando...' : 'Entrar con Microsoft'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span style={{ fontSize: 13, color: C.subtle }}>o</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {!showEmail ? (
          <button onClick={() => setShowEmail(true)}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: 14,
              cursor: 'pointer', textDecoration: 'underline' }}>
            Entrar con correo y contraseña
          </button>
        ) : (
          <div>
            <input type="email" placeholder="Correo electrónico" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 15, marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
            <input type="password" placeholder="Contraseña" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }} />
            <button onClick={handleEmail} disabled={loadingEmail}
              style={{ width: '100%', background: loadingEmail ? '#f1f5f9' : C.navy, border: 'none',
                borderRadius: 10, padding: '12px 16px', fontSize: 15, fontWeight: 600,
                cursor: loadingEmail ? 'wait' : 'pointer', color: 'white' }}>
              {loadingEmail ? 'Conectando...' : 'Entrar'}
            </button>
          </div>
        )}

        {error && <p style={{ color: C.red, fontSize: 14, margin: '12px 0 0' }}>{error}</p>}
        <p style={{ margin: '20px 0 0', fontSize: 13, color: C.subtle }}>
          Solo para equipo Caribe LNG →  Acceso controlado por rol
        </p>
      </div>
    </div>
  )
}
