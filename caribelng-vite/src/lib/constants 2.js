// ━━ Design tokens ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const C = {
  navy:    '#0D47A1',  // Pantone 294 C — primary dark
  blue:    '#1565C0',  // Pantone 2145 C — primary medium
  accent:  '#1565C0',  // primary blue for links/accents
  tolu:    '#007A87',  // Pantone 7716 C — secondary teal
  barbosa: '#00BFB3',  // Pantone 3262 C — secondary cyan
  green:   '#22c55e',
  yellow:  '#eab308',
  orange:  '#f97316',
  red:     '#ef4444',
  bg:      '#FAFBFC',  // very light neutral
  card:    '#FFFFFF',
  border:  '#E8ECF0',
  text:    '#2B2926',  // Pantone Black C
  muted:   '#5C6370',
  subtle:  '#8D95A0',
}

export const SEMAFORO = {
  verde:    { color: C.green,  bg: '#dcfce7', label: 'Verde',    dot: '🟢' },
  amarillo: { color: C.yellow, bg: '#fef9c3', label: 'Amarillo', dot: '🟡' },
  naranja:  { color: C.orange, bg: '#ffedd5', label: 'Naranja',  dot: '🟠' },
  rojo:     { color: C.red,    bg: '#fee2e2', label: 'Rojo',     dot: '🔴' },
}

export const TIPO_COLOR = {
  Comunitario: C.tolu, Político: '#ec4899', Institucional: C.barbosa,
  Empresarial: '#f59e0b', Mediático: C.muted, Social: '#10b981', Educativo: '#06b6d4',
}

export function getTipoColor(tipo = '') {
  for (const k of Object.keys(TIPO_COLOR)) if (tipo.includes(k)) return TIPO_COLOR[k]
  return C.subtle
}

export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
