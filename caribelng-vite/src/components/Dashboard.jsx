import { useState } from 'react'
import { C, getTipoColor, initials } from '../lib/constants'
import { Avatar, Bar } from './ui'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts'
import { IconUsers, IconHandshake, IconAlert, IconClipboardCheck, IconAnchor, IconFactory, IconDownload, IconBuilding } from './Icons'

function Sparkline({ values = [], color = '#0D47A1', height = 32 }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, height: `${Math.max(10, (v / max) * 100)}%`, background: i === values.length - 1 ? color : `${color}40`, borderRadius: '3px 3px 0 0' }} />
      ))}
    </div>
  )
}

function KPICard({ label, value, sub, icon, color, sparkValues, trend, trendLabel, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: 'white', borderRadius: 14, padding: '18px 16px 14px', boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.1)' : '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${hovered ? color + '44' : '#e8ecf0'}`, cursor: onClick ? 'pointer' : 'default', transform: hovered && onClick ? 'translateY(-2px)' : 'none', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: `${color}15` }}>{icon}</div>
        {trendLabel && (
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: trend === 'up' ? '#dcfce7' : trend === 'down' ? '#fee2e2' : '#f1f5f9', color: trend === 'up' ? '#059669' : trend === 'down' ? '#dc2626' : '#64748b' }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
          </span>
        )}
      </div>
      <div style={{ fontSize: 34, fontWeight: 900, color: '#2B2926', letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>{sub}</div>}
      {sparkValues && <div style={{ marginTop: 8 }}><Sparkline values={sparkValues} color={color} /></div>}
    </div>
  )
}

function SemaforoCard({ count, label, desc, variant }) {
  const s = { verde: { bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', border: '#a7f3d0', dot: '#10b981', num: '#065f46', tag: '#059669' }, amarillo: { bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', border: '#fde68a', dot: '#f59e0b', num: '#92400e', tag: '#d97706' }, naranja: { bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '#fdba74', dot: '#f97316', num: '#7c2d12', tag: '#ea580c' }, rojo: { bg: 'linear-gradient(135deg,#fff1f2,#fee2e2)', border: '#fecaca', dot: '#ef4444', num: '#991b1b', tag: '#dc2626' } }[variant] || {}
  return (
    <div style={{ borderRadius: 12, padding: '16px 14px', background: s.bg, border: `1px solid ${s.border}` }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, marginBottom: 8, boxShadow: `0 0 8px ${s.dot}80` }} />
      <div style={{ fontSize: 30, fontWeight: 900, color: s.num, lineHeight: 1, marginBottom: 2 }}>{count}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: s.tag, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>{desc}</div>
    </div>
  )
}

function RiesgoRow({ riesgo, onClick }) {
  const [hov, setHov] = useState(false)
  const lvl = riesgo.semaforo?.toLowerCase().includes('muy alto') || riesgo.semaforo?.toLowerCase().includes('critico') ? 'muy_alto' : riesgo.semaforo?.toLowerCase().includes('alto') || riesgo.semaforo?.toLowerCase().includes('urgente') ? 'alto' : riesgo.semaforo?.toLowerCase().includes('medio') ? 'medio' : 'bajo'
  const ls = { muy_alto: { dot: '#dc2626', bg: '#fee2e2', c: '#dc2626', t: 'Muy Alto' }, alto: { dot: '#ef4444', bg: '#fee2e2', c: '#dc2626', t: 'Alto' }, medio: { dot: '#f59e0b', bg: '#fef3c7', c: '#d97706', t: 'Medio' }, bajo: { dot: '#10b981', bg: '#d1fae5', c: '#059669', t: 'Bajo' } }[lvl]
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10, background: hov ? 'white' : '#f8fafc', border: `1px solid ${hov ? '#00b4d8' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.15s', transform: hov ? 'translateX(4px)' : 'none', marginBottom: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: ls.dot, flexShrink: 0, boxShadow: (lvl === 'alto' || lvl === 'muy_alto') ? `0 0 6px ${ls.dot}80` : 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#2B2926', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{riesgo.riesgo || riesgo.nombre || 'Riesgo'}</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{riesgo.territorio || ''}{riesgo.accion_inmediata ? ` · ${riesgo.accion_inmediata.substring(0, 55)}` : ''}</div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 100, background: ls.bg, color: ls.c, flexShrink: 0 }}>{ls.t}</span>
    </div>
  )
}

function TerritoryBar({ label, icon, count, total, color, desc, onClick }) {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#2B2926' }}>{icon} {label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#2B2926' }}>{count}</span>
      </div>
      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 100, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.8s' }} />
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{pct}% del total · {desc}</div>
    </div>
  )
}

function GaugeSVG({ pct = 0, color = '#10b981', size = 88 }) {
  const r = 35; const circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ * 0.75
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" style={{ transform: 'rotate(-135deg)' }}>
      <circle cx="45" cy="45" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
      <text x="45" y="50" textAnchor="middle" fontFamily="Montserrat,sans-serif" fontSize="14" fontWeight="900" fill="#2B2926" style={{ transform: 'rotate(135deg)', transformOrigin: '45px 45px' }}>{pct}%</text>
    </svg>
  )
}

export default function Dashboard({ stats, actors, agreements, riesgos, seguimiento, reportes, cronograma, isMobile, isAdmin, profile, session, actorEdits, setView, setFilterS, setFilterT, setSelectedActor, loadData, exportToExcel, approveActorEdit, rejectActorEdit, sendPushNotification, auditLog, setAuditLog, showAudit, setShowAudit, getAuditLog, registrosDiarios, subscribeToPush }) {
  const today = new Date()
  const weekNum = Math.ceil((((today - new Date(today.getFullYear(), 0, 1)) / 86400000) + 1) / 7)
  const weekLabel = `Semana ${weekNum} · ${today.getFullYear()}`
  const dateStr = today.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const C_navy = '#0D47A1', C_tolu = '#007A87', C_barbosa = '#00BFB3', C_muted = '#5C6370', C_text = '#2B2926'

  const riesgosAltos = riesgos.filter(r => r.semaforo && (r.semaforo.toLowerCase().includes('alto') || r.semaforo.toLowerCase().includes('urgente') || r.semaforo.toLowerCase().includes('critico')))
  const compromisosPendientes = seguimiento.filter(s => s.estado === 'Pendiente' && s.fecha_pactada)
  const compromisosVencidos = compromisosPendientes.filter(s => new Date(s.fecha_pactada) < today)
  const compromisosProximos = compromisosPendientes.filter(s => { const d = new Date(s.fecha_pactada); const diff = (d - today) / 86400000; return diff >= 0 && diff <= 7 }).sort((a, b) => new Date(a.fecha_pactada) - new Date(b.fecha_pactada))

  const recentActivity = [
    ...seguimiento.slice().sort((a, b) => new Date(b.created_at || b.fecha_pactada) - new Date(a.created_at || a.fecha_pactada)).slice(0, 3).map(s => ({ icon: '', text: `Acuerdo <span style="color:#1565C0;font-weight:700">${s.acuerdo || ''}</span> — ${(s.compromiso || '').substring(0, 45)}`, time: s.fecha_pactada || '' })),
    ...reportes.slice().sort((a, b) => (b.semana || '').localeCompare(a.semana || '')).slice(0, 2).map(r => ({ icon: '', text: `Reporte semanal <span style="color:#1565C0;font-weight:700">${r.territorio}</span> — Sem. ${r.semana}`, time: r.semana || '' })),
  ].slice(0, 5)

  const territorioGestora = {
    'Tolú': { gestora: 'Ana Leonor Pérez', rol: 'Gestora Territorial' },
    'Barbosa': { gestora: 'Alexandra Acevedo', rol: 'Gestora Territorial' },
    'Nacional': { gestora: 'Diana Silva / Camilo Blanco', rol: 'Dirección y Gerencia' },
  }
  const territorioStats = ['Tolú', 'Barbosa', 'Nacional'].map(t => {
    const ta = actors.filter(a => a.territorio === t)
    const verde = ta.filter(a => a.semaforo === 'verde').length
    const amarillo = ta.filter(a => a.semaforo === 'amarillo').length
    const naranja = ta.filter(a => a.semaforo === 'naranja').length
    const rojo = ta.filter(a => a.semaforo === 'rojo').length
    const activados = verde + amarillo + naranja
    const porIniciar = rojo
    return { territorio: t, ...territorioGestora[t], total: ta.length, verde, amarillo, naranja, rojo, activados, porIniciar, pct: ta.length ? Math.round((activados / ta.length) * 100) : 0 }
  })
  const avatarColors = ['linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#f093fb,#f5576c)', 'linear-gradient(135deg,#4facfe,#00f2fe)', 'linear-gradient(135deg,#43e97b,#38f9d7)', 'linear-gradient(135deg,#fa709a,#fee140)']

  const totalAcuerdos = agreements.length
  const acuerdosCumplidos = agreements.filter(a => a.estado_code === 'cumplido' || a.avance >= 100).length
  const pgsAvg = totalAcuerdos ? Math.round(agreements.reduce((s, a) => s + (a.avance || 0), 0) / totalAcuerdos) : 0

  const sp = (v) => Array.from({ length: 6 }, (_, i) => Math.round(v * (0.6 + (i / 5) * 0.4)))
  const totalSpark = sp(stats.total); const verdeSpark = sp(stats.verde)
  const riesgoSpark = [riesgosAltos.length * 1.5, riesgosAltos.length * 1.3, riesgosAltos.length * 1.2, riesgosAltos.length * 1.1, riesgosAltos.length * 1.0, riesgosAltos.length].map(Math.round)

  const card = { background: 'white', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8ecf0' }

  const STitle = ({ label, color = C_navy, action, actionLabel }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: C_text, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{label}</span>
      </div>
      {action && <span onClick={action} style={{ fontSize: 12, fontWeight: 600, color: '#1565C0', cursor: 'pointer' }}>{actionLabel || 'Ver →'}</span>}
    </div>
  )

  // ── MOBILE ──
  if (isMobile) return (
    <div>
      <div style={{ background: `linear-gradient(135deg,${C_navy} 0%,#1a3d7a 60%,#1565C0 100%)`, borderRadius: '0 0 20px 20px', padding: 16, marginBottom: 16, marginLeft: -10, marginRight: -10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,180,216,0.15)', border: '1px solid rgba(0,180,216,0.3)', padding: '3px 10px', borderRadius: 100, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00b4d8', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#90e0ef', letterSpacing: 1, textTransform: 'uppercase' }}>En vivo · {weekLabel}</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: 'white' }}>Estado del <span style={{ color: '#00b4d8' }}>Territorio</span></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>Caribe LNG 2026 · Tiempo real</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <KPICard label="Actores totales" value={stats.total} sub={`${stats.prioA} prioridad A`} icon={<IconUsers size={18} color={C_navy} />} color={C_navy} sparkValues={totalSpark} trend="up" trendLabel="12%" onClick={() => { setView('actores'); setFilterS('Todos') }} />
        <KPICard label="Relación estable" value={stats.verde} icon={<IconHandshake size={18} color="#10b981" />} color="#10b981" sparkValues={verdeSpark} trend="up" trendLabel="8%" onClick={() => { setView('actores'); setFilterS('verde') }} />
        <KPICard label="Riesgos inmediatos" value={riesgosAltos.length} sub="Acción esta semana" icon={<IconAlert size={18} color="#ef4444" />} color="#ef4444" sparkValues={riesgoSpark} trend="down" onClick={() => setView('riesgos')} />
        <KPICard label="Compromisos activos" value={compromisosPendientes.length} sub={`${compromisosVencidos.length} vencidos`} icon={<IconClipboardCheck size={18} color="#f59e0b" />} color="#f59e0b" onClick={() => setView('huella')} />
      </div>
      <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <STitle label="Semáforo de relacionamiento" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div onClick={() => { setView('actores'); setFilterS('verde') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.verde} label="Verde" desc="Relación activa" variant="verde" /></div>
          <div onClick={() => { setView('actores'); setFilterS('amarillo') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.amarillo} label="Amarillo" desc="Seguimiento" variant="amarillo" /></div>
          <div onClick={() => { setView('actores'); setFilterS('naranja') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.naranja} label="Naranja" desc="Riesgo moderado" variant="naranja" /></div>
          <div onClick={() => { setView('actores'); setFilterS('rojo') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.rojo} label="Rojo" desc="Acción inmediata" variant="rojo" /></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={() => window.print()} style={{ background: C_navy, color: 'white', border: 'none', borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>PDF</button>
        <button onClick={() => exportToExcel(actors.map(a => ({ Nombre: a.nombre, Tipo: a.tipo, Territorio: a.territorio, Semáforo: a.semaforo })), 'Actores_CaribeLNG', 'Actores')} style={{ background: '#f1f5f9', color: C_navy, border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Excel</button>
      </div>
    </div>
  )

  // ── DESKTOP ──
  return (
    <div>
      {/* HERO */}
      <div style={{ background: `linear-gradient(160deg,${C_navy} 0%,#1a3d7a 45%,#1565C0 100%)`, borderRadius: 20, padding: isMobile ? '20px 16px' : '28px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40%', right: '-5%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(0,180,216,0.15) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,180,216,0.15)', border: '1px solid rgba(0,180,216,0.3)', padding: '4px 12px', borderRadius: 100, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00b4d8', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#90e0ef', letterSpacing: 1, textTransform: 'uppercase' }}>En vivo · {weekLabel}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'white', letterSpacing: -0.5, lineHeight: 1.1 }}>Estado del <span style={{ color: '#00b4d8' }}>Territorio</span></h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Resumen de relacionamiento &nbsp;·&nbsp; <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Caribe LNG 2026</span> &nbsp;·&nbsp; {dateStr}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setView('gestora')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><IconAnchor size={13} /> Tolú</button>
            <button onClick={() => setView('gestora')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><IconFactory size={13} /> Barbosa</button>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
            <button onClick={() => window.print()} style={{ background: 'linear-gradient(135deg,#00b4d8,#0096c7)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,180,216,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}><IconDownload size={13} /> Exportar PDF</button>
            <button onClick={() => exportToExcel(actors.map(a => ({ Nombre: a.nombre, Tipo: a.tipo, Territorio: a.territorio, Semáforo: a.semaforo, Riesgo: a.riesgo })), 'Actores_CaribeLNG', 'Actores')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Excel</button>
            <button onClick={async () => { if (!('Notification' in window)) return; const p = await Notification.requestPermission(); if (p === 'granted') { await subscribeToPush(session.user.id); new Notification('Caribe LNG Conecta', { body: '¡Notificaciones activadas!' }) } }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}></button>
          </div>
        </div>
      </div>

      {/* 2-COL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* KPIs */}
          <section>
            <STitle label="Mapeo de actores" action={() => setView('actores')} actionLabel="Ver todos →" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              <KPICard label="Actores totales" value={stats.total} sub={`${stats.prioA} prioridad A`} icon={<IconUsers size={18} color={C_navy} />} color={C_navy} sparkValues={totalSpark} trend="up" trendLabel="12%" onClick={() => { setView('actores'); setFilterS('Todos') }} />
              <KPICard label="Relación estable" value={stats.verde} sub="Semáforo verde" icon={<IconHandshake size={18} color="#10b981" />} color="#10b981" sparkValues={verdeSpark} trend="up" trendLabel="8%" onClick={() => { setView('actores'); setFilterS('verde') }} />
              <KPICard label="Riesgos inmediatos" value={riesgosAltos.length} sub="Acción esta semana" icon={<IconAlert size={18} color="#ef4444" />} color="#ef4444" sparkValues={riesgoSpark} trend="down" onClick={() => setView('riesgos')} />
              <KPICard label="Compromisos activos" value={compromisosPendientes.length} sub={`${compromisosVencidos.length} vencidos hoy`} icon={<IconClipboardCheck size={18} color="#f59e0b" />} color="#f59e0b" trend="neutral" onClick={() => setView('huella')} />
            </div>
          </section>

          {/* Semáforo */}
          <section style={card}>
            <STitle label="Semáforo de relacionamiento & acuerdos" action={() => setView('actores')} actionLabel="Detalle →" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              <div onClick={() => { setView('actores'); setFilterS('verde') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.verde} label="Verde" desc="Relación activa y acuerdos al día" variant="verde" /></div>
              <div onClick={() => { setView('actores'); setFilterS('amarillo') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.amarillo} label="Amarillo" desc="Seguimiento requerido" variant="amarillo" /></div>
              <div onClick={() => { setView('actores'); setFilterS('naranja') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.naranja} label="Naranja" desc="Riesgo moderado" variant="naranja" /></div>
              <div onClick={() => { setView('actores'); setFilterS('rojo') }} style={{ cursor: 'pointer' }}><SemaforoCard count={stats.rojo} label="Rojo" desc="Acción inmediata necesaria" variant="rojo" /></div>
            </div>
          </section>

          {/* Riesgos */}
          <section style={card}>
            <STitle label="Riesgos en acción inmediata" color="#ef4444" action={() => setView('riesgos')} actionLabel="Ver mapa completo →" />
            {riesgos.slice(0, 6).map((r, i) => <RiesgoRow key={r.id || i} riesgo={r} onClick={() => setView('riesgos')} />)}
            {riesgos.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Sin riesgos activos registrados</div>}
          </section>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C_text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Progreso de Acuerdos</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart layout="vertical" data={agreements.map(ag => ({ nombre: `${ag.id}. ${(ag.nombre || '').substring(0, 22)}`, avance: ag.avance || 0, territorio: ag.territorio }))} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 9 }} width={125} />
                  <Tooltip formatter={v => [`${v}%`, 'Avance']} contentStyle={{ fontSize: 12 }} />
                  <RBar dataKey="avance" radius={[0, 4, 4, 0]}>
                    {agreements.map((ag, i) => <Cell key={i} fill={ag.avance >= 100 ? '#10b981' : ag.avance > 0 ? (ag.territorio === 'Tolú' ? C_tolu : C_barbosa) : '#eab308'} />)}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C_text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Relaciones por Territorio</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={['Tolú', 'Barbosa', 'Nacional'].map(t => { const ta = actors.filter(a => a.territorio === t); return { territorio: t, Verde: ta.filter(a => a.semaforo === 'verde').length, Amarillo: ta.filter(a => a.semaforo === 'amarillo').length, Naranja: ta.filter(a => a.semaforo === 'naranja').length, Rojo: ta.filter(a => a.semaforo === 'rojo').length } })} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <XAxis dataKey="territorio" tick={{ fontSize: 12, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <RBar dataKey="Verde" stackId="a" fill="#22c55e" />
                  <RBar dataKey="Amarillo" stackId="a" fill="#eab308" />
                  <RBar dataKey="Naranja" stackId="a" fill="#f97316" />
                  <RBar dataKey="Rojo" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Actores prioritarios */}
          <section style={card}>
            <STitle label="Actores en gestión prioritaria" color="#ef4444" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
              {actors.filter(a => a.semaforo === 'rojo' && a.prioridad === 'A').slice(0, 6).map(a => (
                <div key={a.id} onClick={() => { setSelectedActor(a); setView('actores') }}
                  style={{ display: 'flex', gap: 10, background: '#fff5f5', borderRadius: 10, padding: '10px 12px', border: '1px solid #fecaca', cursor: 'pointer', alignItems: 'flex-start', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(239,68,68,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <Avatar name={a.nombre} size={32} color={getTipoColor(a.tipo)} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nombre}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{a.territorio} · {a.tipo}</div>
                  </div>
                </div>
              ))}
              {actors.filter(a => a.semaforo === 'rojo' && a.prioridad === 'A').length === 0 && <div style={{ padding: 16, color: '#94a3b8', fontSize: 13 }}>Sin actores prioritarios en semáforo rojo</div>}
            </div>
          </section>

          {/* Timeline */}
          {recentActivity.length > 0 && (
            <section style={card}>
              <STitle label="Actividad reciente" action={() => setView('huella')} actionLabel="Ver historial →" />
              {recentActivity.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < recentActivity.length - 1 ? 14 : 0, position: 'relative' }}>
                  {i < recentActivity.length - 1 && <div style={{ position: 'absolute', left: 15, top: 30, bottom: 0, width: 1, background: '#e2e8f0' }} />}
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>{item.icon}</div>
                  <div style={{ paddingTop: 4, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C_text, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: item.text }} />
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </section>
          )}

        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 80 }}>

          {/* Territorios */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid #f1f5f9' }}><STitle label="Actores por territorio" /></div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TerritoryBar label="Tolú" icon={<IconAnchor size={14} />} count={stats.tolu} total={stats.total} color={`linear-gradient(90deg,${C_tolu},#00b4d8)`} desc="Terminal marítima + Sucre" onClick={() => { setView('actores'); setFilterT('Tolú') }} />
              <TerritoryBar label="Barbosa" icon={<IconFactory size={14} />} count={stats.barbosa} total={stats.total} color={`linear-gradient(90deg,${C_barbosa},#34d399)`} desc="Planta regasificadora" onClick={() => { setView('actores'); setFilterT('Barbosa') }} />
              <TerritoryBar label="Nacional" icon={<IconBuilding size={14} />} count={stats.nacional} total={stats.total} color={`linear-gradient(90deg,${C_muted},#94a3b8)`} desc="Legislativo + Regulatorio" onClick={() => { setView('actores'); setFilterT('Nacional') }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div onClick={() => { setView('actores'); setFilterS('Todos') }} style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C_navy }}>{stats.total}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total actores</div>
                </div>
                <div onClick={() => setView('huella')} style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: '#f0fdf4', border: '1px solid #a7f3d0', cursor: 'pointer' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>{pgsAvg}%</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Avance Plan Social</div>
                </div>
              </div>
            </div>
          </div>

          {/* PGS Gauge */}
          <div style={card}>
            <STitle label="Cobertura Plan Social" color="#10b981" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
              <GaugeSVG pct={pgsAvg} color={pgsAvg >= 70 ? '#10b981' : pgsAvg >= 40 ? '#f59e0b' : '#ef4444'} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C_text, letterSpacing: -1, lineHeight: 1 }}>{pgsAvg}%</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>Promedio acuerdos</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{acuerdosCumplidos} de {totalAcuerdos} completos</div>
              </div>
            </div>
            {agreements.slice(0, 5).map(ag => (
              <div key={ag.id} onClick={() => setView('huella')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, cursor: 'pointer' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', width: 20 }}>{ag.id}</span>
                <div style={{ flex: 1 }}><Bar value={ag.avance} color={ag.avance >= 100 ? '#10b981' : ag.territorio === 'Tolú' ? C_tolu : C_barbosa} height={5} /></div>
                <span style={{ fontSize: 12, fontWeight: 700, width: 30, textAlign: 'right', color: ag.avance >= 100 ? '#059669' : '#1565C0' }}>{ag.avance}%</span>
              </div>
            ))}
          </div>

          {/* Próximos vencimientos */}
          {(compromisosProximos.length > 0 || compromisosVencidos.length > 0) && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 3, height: 14, background: '#f59e0b', borderRadius: 2 }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: C_text, textTransform: 'uppercase', letterSpacing: '1.2px' }}>Próximos vencimientos</span>
                </div>
                <span onClick={() => setView('huella')} style={{ fontSize: 12, fontWeight: 600, color: '#1565C0', cursor: 'pointer' }}>Ver todos →</span>
              </div>
              {compromisosVencidos.slice(0, 2).map(s => (
                <div key={s.id} onClick={() => setView('huella')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#dc2626', fontWeight: 700 }}>!</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C_text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.compromiso || s.actividad || '').substring(0, 35)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.acuerdo}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Vencido</span>
                </div>
              ))}
              {compromisosProximos.slice(0, 3).map(s => (
                <div key={s.id} onClick={() => setView('huella')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f8fafc', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#d97706', fontWeight: 700 }}>~</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C_text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.compromiso || s.actividad || '').substring(0, 35)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.acuerdo}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{new Date(s.fecha_pactada).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}

          {/* Gestión por territorio */}
          <div style={card}>
            <STitle label="Gestión por territorio" action={() => setView('gestora')} actionLabel="Ver detalle →" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {territorioStats.map(t => {
                const color = t.territorio === 'Tolú' ? C_tolu : t.territorio === 'Barbosa' ? C_barbosa : C_muted
                const semColor = t.pct >= 60 ? '#22c55e' : t.pct >= 30 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={t.territorio} onClick={() => { setView('actores'); setFilterT(t.territorio) }} style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 10, border: '1px solid #e8ecf0', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: color }}>{t.territorio}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.gestora} · {t.rol}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: color }}>{t.activados}/{t.total}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>activados</div>
                      </div>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${t.pct}%`, background: color, borderRadius: 100 }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: 12, textAlign: 'center' }}>
                      <div style={{ background: '#f0fdf4', borderRadius: 6, padding: '4px 0' }}>
                        <div style={{ fontWeight: 800, color: '#22c55e' }}>{t.verde}</div>
                        <div style={{ color: '#94a3b8', fontSize: 8 }}>Estable</div>
                      </div>
                      <div style={{ background: '#fffbeb', borderRadius: 6, padding: '4px 0' }}>
                        <div style={{ fontWeight: 800, color: '#f59e0b' }}>{t.amarillo}</div>
                        <div style={{ color: '#94a3b8', fontSize: 8 }}>Atención</div>
                      </div>
                      <div style={{ background: '#fff7ed', borderRadius: 6, padding: '4px 0' }}>
                        <div style={{ fontWeight: 800, color: '#f97316' }}>{t.naranja}</div>
                        <div style={{ color: '#94a3b8', fontSize: 8 }}>Riesgo</div>
                      </div>
                      <div style={{ background: '#fef2f2', borderRadius: 6, padding: '4px 0' }}>
                        <div style={{ fontWeight: 800, color: '#ef4444' }}>{t.porIniciar}</div>
                        <div style={{ color: '#94a3b8', fontSize: 8 }}>Por iniciar</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Novedades */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ background: C_navy, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}></span>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Alertas & Novedades</span>
            </div>
            <div style={{ padding: 12 }}>
              {(() => {
                const alertas = []
                const ultimosReportes = {}
                reportes.forEach(r => { if (!ultimosReportes[r.territorio] || r.semana > ultimosReportes[r.territorio].semana) ultimosReportes[r.territorio] = r })
                Object.values(ultimosReportes).forEach(r => {
                  if (r.pqrs_pendientes > 0) alertas.push({ icon: '', text: `${r.territorio}: ${r.pqrs_pendientes} quejas sin resolver`, color: '#f97316', nav: () => setView('input') })
                  if (r.incidentes > 0) alertas.push({ icon: '', text: `${r.territorio}: ${r.incidentes} incidente(s)`, color: '#ef4444', nav: () => setView('input') })
                })
                compromisosVencidos.slice(0, 3).forEach(s => alertas.push({ icon: '', text: `Compromiso vencido: ${(s.compromiso || '').substring(0, 40)}`, color: '#ef4444', nav: () => setView('huella') }))
                cronograma.filter(c => c.estado === 'En proceso').slice(0, 3).forEach(c => alertas.push({ icon: '', text: `${c.territorio}: ${(c.evento || '').substring(0, 48)}`, color: C_navy, nav: () => setView('huella') }))
                if (riesgosAltos.length > 0) alertas.push({ icon: '', text: `${riesgosAltos.length} riesgo(s) en acción inmediata`, color: '#ef4444', nav: () => setView('riesgos') })
                if (!alertas.length) return <div style={{ padding: '20px 8px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}><div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>Sin novedades por ahora</div>
                return alertas.slice(0, 8).map((a, i) => (
                  <div key={i} onClick={a.nav} style={{ display: 'flex', gap: 8, padding: '9px 10px', marginBottom: 5, borderRadius: 8, cursor: 'pointer', borderLeft: `3px solid ${a.color}`, background: a.color === '#ef4444' ? '#fef2f2' : a.color === '#f97316' ? '#fff7ed' : '#eff6ff' }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{a.icon}</span>
                    <span style={{ fontSize: 12, color: a.color, fontWeight: 600, lineHeight: 1.4 }}>{a.text}</span>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Admin ediciones */}
          {isAdmin && actorEdits.length > 0 && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ background: '#f59e0b', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span></span>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>Ediciones Pendientes</span>
                <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.3)', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 800, color: 'white' }}>{actorEdits.length}</span>
              </div>
              <div style={{ padding: 12 }}>
                {actorEdits.map(edit => {
                  const actorName = actors.find(a => a.id === edit.actor_id)?.nombre || `Actor #${edit.actor_id}`
                  return (
                    <div key={edit.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C_text }}>{actorName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Por: {edit.user_name} · {new Date(edit.created_at).toLocaleDateString('es-CO')}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={async () => { await approveActorEdit(edit.id, edit.actor_id, edit.campos, session.user.id); sendPushNotification({ title: 'Edición aprobada', body: `Tu edición de ${actorName} fue aprobada`, user_ids: [edit.user_id] }).catch(() => {}); await loadData() }} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', borderRadius: 6, padding: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Aprobar</button>
                        <button onClick={async () => { await rejectActorEdit(edit.id, session.user.id); sendPushNotification({ title: 'Edición rechazada', body: `Tu edición de ${actorName} fue rechazada`, user_ids: [edit.user_id] }).catch(() => {}); await loadData() }} style={{ flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Rechazar</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {isAdmin && <button onClick={async () => { setAuditLog(await getAuditLog(30)); setShowAudit(true) }} style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>📜 Ver historial de cambios</button>}
        </div>
      </div>
    </div>
  )
}
