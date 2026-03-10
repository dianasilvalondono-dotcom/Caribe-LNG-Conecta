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
    options: { redirectTo: window.location.origin }
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

export async function addInteraction({ actorId, tipo, resumen, semaforo_nuevo, userId }) {
  const { error } = await supabase
    .from('interactions')
    .insert({
      actor_id: actorId,
      tipo,
      resumen,
      semaforo_nuevo,
      user_id: userId,
      created_at: new Date().toISOString()
    })
  if (error) throw error
  if (semaforo_nuevo) {
    await updateActorSemaforo(actorId, semaforo_nuevo)
  }
}

// ── Agreements ───────────────────────────────────────────────────────────────

export async function getAgreements() {
  const { data, error } = await supabase
    .from('agreements')
    .select('*')
    .order('territorio', { ascending: true })
  if (error) throw error
  return data
}

export async function updateAgreementAvance(id, avance, notas) {
  const { error } = await supabase
    .from('agreements')
    .update({ avance, notas, updated_at: new Date().toISOString() })
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

export async function upsertProfile(userId, { full_name, avatar_url, email, role }) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name, avatar_url, email, role, updated_at: new Date().toISOString() })
  if (error) throw error
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
  const { data } = await supabase.from('cronograma').update({ estado }).eq('id', id)
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
  const { data } = await supabase.from('seguimiento_acuerdos').insert(acuerdo)
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
