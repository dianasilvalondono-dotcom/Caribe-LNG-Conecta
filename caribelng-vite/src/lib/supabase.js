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

export async function uploadToOneDrive(fileOrBlob, fileName, territorio, type) {
  const base64 = await blobToBase64(fileOrBlob)
  return fetch('/api/upload-onedrive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, territorio: territorio || 'General', fileBase64: base64, type, contentType: type === 'reporte' ? 'application/json' : 'image/jpeg' })
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
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

export async function uploadEvidenciaPhoto(file, territorio) {
  const compressed = await compressImage(file)
  const timestamp = Date.now()
  const fileName = `foto_${timestamp}.jpg`
  const path = `evidencias/${fileName}`

  // 1. Upload to Supabase Storage
  const { error } = await supabase.storage.from('archivos').upload(path, compressed, { contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from('archivos').getPublicUrl(path)

  // 2. Upload to OneDrive (async, non-blocking)
  uploadToOneDrive(compressed, fileName, territorio, 'evidencia').catch(() => {})

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
  return data
}

export async function getAlertas() {
  const { data, error } = await supabase.from('alertas').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function markAlertaLeida(id) {
  const { error } = await supabase.from('alertas').update({ leida: true }).eq('id', id)
  if (error) throw error
}