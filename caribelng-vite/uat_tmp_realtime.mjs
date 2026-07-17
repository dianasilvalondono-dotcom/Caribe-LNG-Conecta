import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const KEY = readFileSync('./anon_key.txt', 'utf8').trim()
const supabase = createClient('https://vtvmlzgekfnptlqyiikr.supabase.co', KEY)
supabase.channel('uat-realtime-verify')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'actors' }, (p) => {
    console.log('EVENTO RECIBIDO:', p.eventType, p.new?.nombre || '')
  })
  .subscribe((status) => { console.log('STATUS:', status) })
setTimeout(() => { console.log('FIN'); process.exit(0) }, 40000)
