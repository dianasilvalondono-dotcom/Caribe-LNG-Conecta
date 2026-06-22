import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  if (error) throw error
}

export async function signInWithMicrosoft() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: window.location.origin,
      scopes: 'email openid profile',
    }
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Actors ────────────────────────────────────────────────────────────────────

export async function getActors() {
  const { data, error } = await supabase
    .from('actors')
    .select('*')
    .order('prioridad', { ascending: true })
    .order('poder', { ascending: false })
  if (error) throw error
  return data
}

export async function addActor(fields) {
  const { data, error } = await supabase
    .from('actors')
    .insert({ ...fields, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateActorSemaforo(id, semaforo) {
  const { error } = await supabase
    .from('actors')
    .update({ semaforo, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateActor(id, fields) {
  const { error } = await supabase
    .from('actors')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Interactions (novedades) ──────────────────────────────────────────────────

export async function getInteractions(actorId) {
  const { data, error } = await supabase
    .from('interactions')
    .select('*, profiles(full_name, avatar_url)')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllInteractions() {
  const { data } = await supabase.from('interactions').select('actor_id, created_at, tipo').order('created_at', { ascending: false })
  return data || []
}

export async function addInteraction({ actorId, tipo, resumen, semaforo_nuevo, userId, accion_tomada, fecha_accion }) {
  const { data, error } = await supabase
    .from('interactions')
    .insert({
      actor_id: actorId,
      tipo,
      resumen,
      semaforo_nuevo,
      user_id: userId,
      accion_tomada: accion_tomada || null,
      fecha_accion: fecha_accion || null,
      created_at: new Date().toISOString()
    })
    .select()
  if (error) throw error
  if (semaforo_nuevo) {
    await updateActorSemaforo(actorId, semaforo_nuevo)
  }
  return data
}

// ── Agreements ───────────────────────────────────────────────────────────────

export async function getAgreements() {
  const { data, error } = await supabase
    .from('agreements')
    .select('*')
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export async function deleteSeguimientoAcuerdo(id) {
  const { error } = await supabase
    .from('seguimiento_acuerdos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function updateAgreementAvance(id, avance, notas) {
  const estado_code = avance >= 100 ? 'cumplido' : avance > 0 ? 'en_curso' : 'por_estructurar'
  const estado = avance >= 100 ? 'Cumplido' : avance > 0 ? 'En curso' : 'Por estructurar'
  const { error } = await supabase
    .from('agreements')
    .update({ avance, notas, estado_code, estado, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

const ADMIN_EMAILS = [
  'diana.silva@caribelng.com', 'felipe.rodriguez@caribelng.com',
  'pablo.tribin@caribelng.com', 'pablo.tribin@course2.energy',
  'camilo.blanco@caribelng.com', 'berend.vandenberg@caribelng.com',
]
const GESTORA_CONFIG = {
  'ana.perez@caribelng.com': 'Tolú',
  'alexandra.acevedo@caribelng.com': 'Barbosa',
}

export async function upsertProfile(userId, { full_name, avatar_url, email }) {
  const { data: existing } = await supabase.from('profiles').select('id, role').eq('id', userId).single()
  if (existing) {
    const { error } = await supabase.from('profiles')
      .update({ full_name, avatar_url, email, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw error
  } else {
    const emailLower = (email || '').toLowerCase()
    const role = ADMIN_EMAILS.includes(emailLower) ? 'admin' : GESTORA_CONFIG[emailLower] ? 'gestora' : 'viewer'
    const territorio = GESTORA_CONFIG[emailLower] || null
    const { error } = await supabase.from('profiles')
      .insert({ id: userId, full_name, avatar_url, email, role, territorio, updated_at: new Date().toISOString() })
    if (error) throw error
  }
}
export async function getCronograma() {
  const { data } = await supabase.from('cronograma').select('*').order('territorio').order('numero')
  return data
}

export async function getHuellaSocial() {
  const { data } = await supabase.from('huella_social').select('*').order('territorio').order('id')
  return data
}

export async function updateCronogramaEstado(id, estado) {
  const { data, error } = await supabase.from('cronograma').update({ estado }).eq('id', id)
  if (error) throw error
  return data
}
export async function getReportesSemanales(territorio) {
  let q = supabase.from('reportes_semanales').select('*').order('semana', { ascending: false })
  if (territorio) q = q.eq('territorio', territorio)
  const { data } = await q
  return data
}

export async function addReporteSemanal(reporte) {
  const { data } = await supabase.from('reportes_semanales').insert(reporte)
  return data
}

export async function getSeguimientoAcuerdos(territorio) {
  let q = supabase.from('seguimiento_acuerdos').select('*').order('id')
  if (territorio) q = q.eq('territorio', territorio)
  const { data } = await q
  return data
}

export async function addSeguimientoAcuerdo(acuerdo) {
  const { data, error } = await supabase.from('seguimiento_acuerdos').insert(acuerdo).select()
  if (error) throw error
  return data
}

export async function updateSeguimientoAcuerdo(id, updates) {
  const { data } = await supabase.from('seguimiento_acuerdos').update(updates).eq('id', id)
  return data
}
export async function getRiesgos() {
  const { data } = await supabase.from('riesgos').select('*').order('id')
  return data
}

export async function getBowTie(riesgoId) {
  const { data } = await supabase.from('bow_tie').select('*').eq('riesgo_id', riesgoId)
  return data
}

export async function getRiesgosLegislativos() {
  const { data } = await supabase.from('riesgos_legislativos').select('*').order('id')
  return data
}

export async function getCronogramaLegislativo() {
  const { data } = await supabase.from('cronograma_legislativo').select('*').order('id')
  return data
}

export async function addCronogramaLegislativo(entry) {
  const { data, error } = await supabase.from('cronograma_legislativo').insert([entry]).select().single()
  if (error) throw error
  return data
}

export async function deleteCronogramaLegislativo(id) {
  const { error } = await supabase.from('cronograma_legislativo').delete().eq('id', id)
  if (error) throw error
}

// ── Delete functions ──────────────────────────────────────────────────────────

export async function deleteReporteSemanal(id) {
  const { error } = await supabase.from('reportes_semanales').delete().eq('id', id)
  if (error) throw error
}

export async function deleteKpiEntry(id) {
  const { error } = await supabase.from('kpis').delete().eq('id', id)
  if (error) throw error
}

export async function deleteCronogramaEvent(id) {
  const { error } = await supabase.from('cronograma').delete().eq('id', id)
  if (error) throw error
}

export async function deleteRiesgo(id) {
  const { error } = await supabase.from('riesgos').delete().eq('id', id)
  if (error) throw error
}

// ── KPIs DAC Director ─────────────────────────────────────────────────────────

export async function getKpisDac() {
  const { data } = await supabase.from('kpis_dac').select('*')
  return data || []
}

export async function upsertKpiDac(id, { valor, estado, notas }) {
  const { error } = await supabase.from('kpis_dac')
    .upsert({ id, valor, estado, notas, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ── Knowledge Base (Base de Conocimiento) ────────────────────────────────────

export async function getKnowledgeBase() {
  const { data } = await supabase.from('knowledge_base').select('*').order('categoria').order('titulo')
  return data || []
}

export async function addKnowledgeDoc({ titulo, categoria, contenido, file_url }) {
  const row = { titulo, categoria, contenido }
  if (file_url) row.file_url = file_url
  const { data, error } = await supabase.from('knowledge_base').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateKnowledgeDoc(id, { titulo, categoria, contenido }) {
  const { error } = await supabase.from('knowledge_base').update({ titulo, categoria, contenido, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteKnowledgeDoc(id) {
  const { error } = await supabase.from('knowledge_base').delete().eq('id', id)
  if (error) throw error
}

// ── File Storage (Knowledge Base) ────────────────────────────────────────────

export async function uploadKnowledgeFile(file) {
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `knowledge/${timestamp}_${safeName}`
  const { error } = await supabase.storage.from('archivos').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('archivos').getPublicUrl(path)
  return data.publicUrl
}

// ── Registros Diarios ────────────────────────────────────────────────────────

export async function addRegistroDiario(registro) {
  const { data, error } = await supabase
    .from('registros_diarios')
    .insert(registro)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRegistrosDiarios(territorio) {
  let q = supabase.from('registros_diarios').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false })
  if (territorio) q = q.eq('territorio', territorio)
  const { data } = await q
  return data || []
}

// ── Actor Edits (pending approval) ──────────────────────────────────────────

export async function submitActorEdit({ actor_id, user_id, user_name, campos }) {
  const { data, error } = await supabase
    .from('actor_edits')
    .insert({ actor_id, user_id, user_name, campos, estado: 'pendiente' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getActorEdits() {
  const { data } = await supabase
    .from('actor_edits')
    .select('*')
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
  return data || []
}

export async function approveActorEdit(editId, actorId, campos, adminId) {
  // Apply changes to actor
  const { error: updateErr } = await supabase
    .from('actors')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', actorId)
  if (updateErr) throw updateErr
  // Mark edit as approved
  const { error } = await supabase
    .from('actor_edits')
    .update({ estado: 'aprobado', revisado_at: new Date().toISOString(), revisado_por: adminId })
    .eq('id', editId)
  if (error) throw error
}

export async function rejectActorEdit(editId, adminId) {
  const { error } = await supabase
    .from('actor_edits')
    .update({ estado: 'rechazado', revisado_at: new Date().toISOString(), revisado_por: adminId })
    .eq('id', editId)
  if (error) throw error
}

// ── Evidencias ───────────────────────────────────────────────────────────────

// ── OneDrive upload helper ───────────────────────────────────────────────────

async function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(blob)
  })
}

export async function uploadToOneDrive(fileOrBlob, fileName, territorio, type, contentType) {
  const base64 = await blobToBase64(fileOrBlob)
  let ct = contentType
  if (!ct) {
    if (type === 'reporte') ct = 'application/json'
    else if (type === 'acta') ct = fileOrBlob.type || 'application/pdf'
    else ct = 'image/jpeg'
  }
  return fetch('/api/upload-sharepoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, territorio: territorio || 'General', fileBase64: base64, type, contentType: ct })
  })
}

export async function uploadReporteToOneDrive(reporteData, territorio, semana) {
  const json = JSON.stringify(reporteData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const fileName = `S${semana}_${territorio}_${new Date().toISOString().split('T')[0]}.json`
  return uploadToOneDrive(blob, fileName, territorio, 'reporte').catch(() => {})
}

// ── Image compression ────────────────────────────────────────────────────────

async function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    // Timeout de 30s para evitar trabes silenciosas (HEIC iPhone, archivos corruptos, formatos raros)
    const url = URL.createObjectURL(file)
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error(`No se pudo procesar la imagen "${file.name}". Formato no soportado o archivo dañado. Si es HEIC del iPhone, conviértelo a JPG.`))
    }, 30000)
    const img = new Image()
    img.onload = () => {
      clearTimeout(timer)
      try {
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (!blob) {
            reject(new Error(`No se pudo comprimir "${file.name}".`))
          } else {
            resolve(blob)
          }
        }, 'image/jpeg', quality)
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.onerror = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      reject(new Error(`No se pudo cargar la imagen "${file.name}". Verifica que sea JPG o PNG. Las fotos HEIC de iPhone no se soportan — actívalas como JPG en Ajustes → Cámara → Formato → Más compatible.`))
    }
    img.src = url
  })
}

export async function uploadEvidenciaPhoto(file, territorio) {
  const timestamp = Date.now()
  const isImage = file.type?.startsWith('image/')
  let body, fileName, contentType

  if (isImage) {
    // Imagen: comprimir y guardar como jpg
    body = await compressImage(file)
    fileName = `foto_${timestamp}.jpg`
    contentType = 'image/jpeg'
  } else {
    // PDF u otro documento: subir tal cual respetando extensión y mime
    body = file
    const ext = (file.name?.split('.').pop() || 'bin').toLowerCase().slice(0, 8)
    fileName = `doc_${timestamp}.${ext}`
    contentType = file.type || 'application/octet-stream'
  }

  const path = `evidencias/${fileName}`

  // 1. Upload to Supabase Storage
  const { error } = await supabase.storage.from('archivos').upload(path, body, { contentType })
  if (error) throw error
  const { data } = supabase.storage.from('archivos').getPublicUrl(path)

  // 2. Upload to OneDrive (async, non-blocking)
  uploadToOneDrive(body, fileName, territorio, 'evidencia').catch(() => {})

  return data.publicUrl
}

export async function addEvidencia({ user_id, territorio, foto_url, latitud, longitud, precision_m, descripcion, capturada_at, lugar }) {
  const { data, error } = await supabase
    .from('evidencias')
    .insert({ user_id, territorio, foto_url, latitud, longitud, precision_m, descripcion, capturada_at, lugar })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getEvidencias(territorio) {
  let q = supabase.from('evidencias').select('*').order('capturada_at', { ascending: false })
  if (territorio) q = q.eq('territorio', territorio)
  const { data } = await q
  return data || []
}

export async function deleteEvidencia(id) {
  // NOTE: requires RLS policy for admin delete on evidencias table
  // Run in Supabase SQL editor:
  // CREATE POLICY "Admins can delete evidencias" ON evidencias FOR DELETE
  // USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  const { error } = await supabase.from('evidencias').delete().eq('id', id)
  if (error) throw error
}

// ── Audit Log ────────────────────────────────────────────────────────────────

export async function getAuditLog(limit = 50) {
  const { data } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ── Push Notifications ──────────────────────────────────────────────────────

const VAPID_PUBLIC = 'BEy_rY5v5ndxTzAuGo_8teAI9S8jjmkkk76iILNo9rMvavjtXRj6ntL9NBJ_u7xVSeyKfDLpih2952bGL3IgRKM'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function subscribeToPush(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }
  const keys = sub.toJSON().keys
  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    keys_p256dh: keys.p256dh,
    keys_auth: keys.auth,
  }, { onConflict: 'endpoint' })
  return sub
}

export async function sendPushNotification({ title, body, user_ids, url }) {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: { title, body, user_ids, url }
  })
  if (error) throw error
  return data
}

// ── Alertas ───────────────────────────────────────────────────────────────────

export async function sendAlerta({ gestora, territorio, mensaje, urgencia }) {
  const { data, error } = await supabase.from('alertas').insert({
    gestora, territorio, mensaje, urgencia, leida: false
  }).select().single()
  if (error) throw error
  // Enviar email en background — no bloquea si falla
  fetch('/api/send-alert-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gestora, territorio, mensaje, urgencia })
  }).catch(() => {})
  return data
}

export async function getAlertas() {
  const { data, error } = await supabase.from('alertas').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function resolverAlerta(id, estado, resolucion) {
  const { error } = await supabase.from('alertas')
    .update({ leida: true, estado, resolucion, resuelta_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    // Fallback: si las columnas nuevas no existen aún, al menos marcar como leída
    await supabase.from('alertas').update({ leida: true }).eq('id', id)
  }
}

// ── Comité Social — Actas ────────────────────────────────────────────────────

export async function getComiteActas() {
  const { data, error } = await supabase
    .from('comite_actas')
    .select('*, profile:profiles!user_id(full_name, email)')
    .order('fecha_comite', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) {
    // Fallback sin join si la tabla no expone la FK
    const { data: d2 } = await supabase
      .from('comite_actas')
      .select('*')
      .order('fecha_comite', { ascending: false })
      .order('created_at', { ascending: false })
    return d2 || []
  }
  return data || []
}

export async function uploadActaToOneDrive(file) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
  const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'pdf'
  const safeName = (file.name || 'acta').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const fileName = `${ts}_${safeName}`
  const res = await uploadToOneDrive(file, fileName, 'General', 'acta', file.type || 'application/octet-stream')
  if (!res.ok) throw new Error('OneDrive upload failed')
  const json = await res.json()
  return { url: json.webUrl, name: file.name || fileName }
}

export async function addComiteActa({ fecha_comite, titulo, asistentes, temas, acuerdos, compromisos, archivo_url, archivo_nombre, foto_url, user_id }) {
  const { data, error } = await supabase
    .from('comite_actas')
    .insert({ fecha_comite, titulo, asistentes, temas, acuerdos, compromisos, archivo_url, archivo_nombre, foto_url, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteComiteActa(id) {
  const { error } = await supabase.from('comite_actas').delete().eq('id', id)
  if (error) throw error
}

export async function updateComiteActa(id, fields) {
  const { data, error } = await supabase.from('comite_actas').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateEvidencia(id, fields) {
  const { data, error } = await supabase.from('evidencias').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function updateRegistroDiario(id, fields) {
  const { data, error } = await supabase.from('registros_diarios').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

// ── Notificaciones por email a la DAC ────────────────────────────────────────

export async function sendNotificationEmail({ to, subject, html, replyTo }) {
  // Best-effort: si falla, no bloquea el flujo principal.
  try {
    const r = await fetch('/api/send-notification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, replyTo }),
    })
    return r.ok
  } catch (e) {
    console.error('Email notif falló:', e)
    return false
  }
}

const C_NAVY = '#0D47A1'
const C_TEXT = '#2B2926'

export function buildActaEmail({ titulo, fecha_comite, asistentes, temas, acuerdos, compromisos, archivo_url, archivo_nombre, foto_url, autor }) {
  const fechaFmt = fecha_comite
    ? new Date(fecha_comite + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  const subject = `📋 Nueva acta de reunión PGS — ${titulo || fechaFmt}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: ${C_TEXT};">
      <div style="background: ${C_NAVY}; color: white; padding: 20px 24px; border-radius: 10px 10px 0 0;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7;">Reuniones · Plan de Gestión Social</div>
        <h2 style="margin: 4px 0 0; font-size: 19px;">${escapeHtml(titulo || 'Nueva acta registrada')}</h2>
      </div>
      <div style="border: 1px solid #E8ECF0; border-top: none; border-radius: 0 0 10px 10px; padding: 22px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
          <tr><td style="padding: 4px 0; color: #5C6370; font-size: 12px; width: 110px;">Fecha</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${escapeHtml(fechaFmt)}</td></tr>
          ${autor ? `<tr><td style="padding: 4px 0; color: #5C6370; font-size: 12px;">Subido por</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${escapeHtml(autor)}</td></tr>` : ''}
          ${asistentes ? `<tr><td style="padding: 4px 0; color: #5C6370; font-size: 12px; vertical-align: top;">Asistentes</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px; line-height: 1.5;">${escapeHtml(asistentes)}</td></tr>` : ''}
        </table>
        ${temas ? sectionHtml('Temas tratados', temas) : ''}
        ${acuerdos ? boxHtml('✓ Acuerdos / Decisiones', acuerdos, '#f0fdf4', '#bbf7d0', '#166534', '#14532d') : ''}
        ${compromisos ? boxHtml('→ Compromisos pendientes', compromisos, '#fffbeb', '#fde68a', '#92400e', '#78350f') : ''}
        ${archivo_url ? `<a href="${archivo_url}" style="display: block; margin-top: 14px; background: #EEF2FF; color: ${C_NAVY}; border: 1px solid ${C_NAVY}; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none;">📎 Abrir acta en OneDrive${archivo_nombre ? ` · ${escapeHtml(archivo_nombre)}` : ''}</a>` : ''}
        ${foto_url ? `<a href="${foto_url}" style="display: block; margin-top: 8px; background: white; color: ${C_NAVY}; border: 1px solid ${C_NAVY}55; border-radius: 8px; padding: 8px 16px; font-size: 12px; font-weight: 700; text-align: center; text-decoration: none;">📷 Ver foto del comité</a>` : ''}
        <p style="margin-top: 22px; font-size: 12px; color: #8D95A0; text-align: center;">Caribe LNG Conecta · Reuniones del Plan de Gestión Social</p>
      </div>
    </div>`
  return { subject, html }
}

export function buildPosicionCambioEmail({ actor_nombre, actor_territorio, posicion_anterior, posicion_nueva, autor, recomendacion_gestora }) {
  const subject = `🎯 Posición de actor cambiada — ${actor_nombre}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: ${C_TEXT};">
      <div style="background: ${C_NAVY}; color: white; padding: 20px 24px; border-radius: 10px 10px 0 0;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7;">Cambio de posición de actor</div>
        <h2 style="margin: 4px 0 0; font-size: 19px;">${escapeHtml(actor_nombre)}</h2>
      </div>
      <div style="border: 1px solid #E8ECF0; border-top: none; border-radius: 0 0 10px 10px; padding: 22px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr><td style="padding: 4px 0; color: #5C6370; font-size: 12px; width: 130px;">Territorio</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${escapeHtml(actor_territorio || '—')}</td></tr>
          <tr><td style="padding: 4px 0; color: #5C6370; font-size: 12px;">Cambio realizado por</td><td style="padding: 4px 0; font-weight: 600; font-size: 13px;">${escapeHtml(autor || '—')}</td></tr>
        </table>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #9a3412; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">Posición</div>
          <div style="font-size: 14px; color: #7c2d12; font-weight: 600;">
            <span style="text-decoration: line-through; opacity: 0.7;">${escapeHtml(posicion_anterior || '(sin definir)')}</span>
            <span style="margin: 0 10px; color: #c2410c; font-weight: 800;">→</span>
            <span style="font-weight: 800;">${escapeHtml(posicion_nueva)}</span>
          </div>
        </div>
        ${recomendacion_gestora ? boxHtml('💡 Recomendación de la gestora', recomendacion_gestora, '#fffbeb', '#fde68a', '#92400e', '#78350f') : ''}
        <p style="margin-top: 22px; font-size: 12px; color: #8D95A0; text-align: center;">Caribe LNG Conecta · Base de Actores</p>
      </div>
    </div>`
  return { subject, html }
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function sectionHtml(title, body) {
  return `<div style="margin-bottom: 14px;">
    <div style="font-size: 11px; font-weight: 800; color: ${C_NAVY}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">${escapeHtml(title)}</div>
    <div style="font-size: 13px; color: ${C_TEXT}; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(body)}</div>
  </div>`
}

function boxHtml(title, body, bg, border, titleColor, textColor) {
  return `<div style="margin-bottom: 14px; background: ${bg}; border: 1px solid ${border}; border-radius: 10px; padding: 12px 14px;">
    <div style="font-size: 11px; font-weight: 800; color: ${titleColor}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">${escapeHtml(title)}</div>
    <div style="font-size: 13px; color: ${textColor}; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(body)}</div>
  </div>`
}