import { useState } from 'react'
import { C } from '../lib/constants'
import { supabase } from '../lib/supabase'

// ── Onboarding Tour Conecta ──

export default function OnboardingTour({ profile, onComplete }) {
  const [step, setStep] = useState(0)

  const isAdmin = profile?.role === 'admin'
  const isGestora = profile?.role === 'gestora'
  const territorio = profile?.territorio
  const firstName = (profile?.full_name || '').split(' ')[0] || ''

  const steps = [
    {
      icon: '👋',
      title: `Bienvenida a Conecta, ${firstName}`,
      body: 'Esta es la plataforma de gestion social territorial. Aqui registras actores, haces seguimiento a acuerdos, subes evidencias, alimentas KPIs y dejas huella de todo lo que pasa en el territorio.',
      accent: C.navy,
    },
    {
      icon: '🗺️',
      title: 'Todo se organiza por territorio',
      body: 'Tolu (Sucre) y Barbosa (Antioquia) son nuestros dos territorios. Cada actor, acuerdo, evidencia e hito esta asociado a su territorio. Los dashboards comparan ambos lado a lado.',
      tip: territorio && territorio !== 'Nacional' ? `Tu territorio asignado es ${territorio}.` : null,
      accent: '#007A87',
    },
    ...(isGestora ? [{
      icon: '📱',
      title: 'Input Semanal · tu reporte',
      body: 'Cada semana registras novedades: eventos en AID/AII, PQRS recibidas, incidentes, actores nuevos. Lo haces desde el movil en campo. Se sincroniza con OneDrive automatico.',
      tip: 'Puedes adjuntar fotos como evidencia.',
      accent: '#00BFB3',
    }] : []),
    {
      icon: '👥',
      title: 'Base de mas de 500 actores mapeados',
      body: 'En "Actores" tienes toda la base con filtros por territorio, sector, poder/interes y semaforo. Click en cualquiera abre el modal con su historia de interacciones y datos personales.',
      accent: '#1565C0',
    },
    {
      icon: '📋',
      title: '6 acuerdos territoriales activos',
      body: 'B1-B2-B3 en Barbosa, T1-T2-T3 en Tolu. Cada acuerdo tiene su seguimiento, actas firmadas y cronograma. Alexandra (Barbosa) y Ana Leonor (Tolu) son las gestoras territoriales.',
      accent: '#00BFB3',
    },
    {
      icon: '🤖',
      title: 'Asistente IA · Conecta',
      body: 'Abajo a la derecha tienes un boton flotante. Pregunta cualquier cosa: "cuantos actores rojos hay?", "dame los riesgos legislativos criticos", "huella social de Barbosa".',
      accent: '#7c3aed',
    },
    ...(isAdmin ? [{
      icon: '🔧',
      title: 'Acceso completo de admin',
      body: 'Como admin puedes editar todo, gestionar usuarios y ver los datos de ambos territorios. Las gestoras solo ven su territorio asignado.',
      accent: '#EA580C',
    }] : []),
    {
      icon: '✓',
      title: 'Listo · puedes empezar',
      body: 'Cualquier duda, escribeme a diana.silva@caribelng.com. Para cosas de campo, coordina con Alexandra o Ana Leonor.',
      accent: C.cyan || '#00BFB3',
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  async function complete() {
    await supabase.from('profiles').update({ onboarding_conecta_completed: true }).eq('id', profile.id)
    onComplete && onComplete()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(13, 71, 161, 0.5)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, maxWidth: 520, width: '100%',
        padding: '32px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? current.accent : '#E2E8F0', transition: 'background 0.3s' }} />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{current.icon}</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#2B2926', lineHeight: 1.3 }}>{current.title}</h2>
          <p style={{ margin: 0, fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{current.body}</p>
          {current.tip && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: `${current.accent}10`, borderLeft: `3px solid ${current.accent}`, fontSize: 12, color: '#2B2926', textAlign: 'left' }}>
              💡 {current.tip}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={complete} style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Saltar tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} style={{ padding: '10px 18px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#2B2926' }}>
                ← Anterior
              </button>
            )}
            <button onClick={() => isLast ? complete() : setStep(step + 1)} style={{ padding: '10px 22px', background: current.accent, color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {isLast ? '✓ Entendido' : 'Siguiente →'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#64748B', marginTop: 16, letterSpacing: 1 }}>
          {step + 1} DE {steps.length}
        </p>
      </div>
    </div>
  )
}
