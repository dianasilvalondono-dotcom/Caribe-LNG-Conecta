# Caribe LNG Conecta — Contexto del proyecto

## Qué es esto
App web de gestión social territorial para Caribe LNG. Permite a la Dirección de Asuntos Corporativos (DAC) gestionar actores, acuerdos comunitarios, cronograma, KPIs y riesgos del proyecto en tiempo real.

## Stack
- React (single-file, App.jsx)
- Supabase (base de datos + autenticación)
- Vercel (deploy)
- Autenticación: Microsoft 365 OAuth (tenant caribelng.com)

## Territorios
- **Tolú** — Terminal marítima, departamento de Sucre. Color: #0ea5e9
- **Barbosa** — Planta de regasificación, departamento de Antioquia. Color: #8b5cf6
- **Nacional** — Actores legislativos y regulatorios

## Estructura de la app
El archivo principal es `App.jsx`. Toda la UI vive ahí.

### Vistas (tabs en el menú superior)
| id | Descripción |
|----|-------------|
| `dashboard` | Resumen ejecutivo con estadísticas y semáforos |
| `actores` | Base de datos de 184 actores con filtros y modal de detalle |
| `acuerdos` | 6 acuerdos territoriales (3 Tolú, 3 Barbosa) con seguimiento |
| `cronograma` | Eventos 2026 por territorio, dos columnas lado a lado |
| `huella` | Huella Social Territorial por territorio, dos columnas |
| `input` | Input Semanal para gestoras |
| `kpis` | KPIs de Gestión Social con seguimiento trimestral |
| `riesgos` | Mapa de riesgos, bow-tie y cronograma legislativo |
| `gestora` | Vista personal para gestoras de territorio |

## Design tokens (objeto C en App.jsx)
```js
const C = {
  navy:    '#0f2744',  // fondo nav, botones primarios
  blue:    '#1e3a5f',
  accent:  '#3b82f6',
  tolu:    '#0ea5e9',  // color Tolú
  barbosa: '#8b5cf6',  // color Barbosa
  green:   '#22c55e',
  yellow:  '#eab308',
  orange:  '#f97316',
  red:     '#ef4444',
  bg:      '#f8fafc',
  card:    '#ffffff',
  border:  '#f1f5f9',
  text:    '#0f172a',
  muted:   '#64748b',
  subtle:  '#94a3b8',
}
```

## Roles de usuario
- **admin** — acceso total, puede borrar, editar todo
- **gestora** — puede registrar novedades, editar actores, ver su territorio
- Campo en tabla `profiles`: `role`, `territorio`

## Tablas principales en Supabase
- `actors` — actores del territorio
- `agreements` — acuerdos territoriales
- `interactions` — historial de novedades por actor
- `cronograma` — eventos del cronograma 2026
- `reportes_semanales` — inputs semanales de las gestoras
- `seguimiento_acuerdos` — seguimiento por acuerdo
- `riesgos` — mapa de riesgos
- `profiles` — perfiles de usuario con rol y territorio
- `huella_social` — huella social territorial por eje

## Convenciones de código
- Componentes funcionales con hooks
- Estilos inline con el objeto `C` para colores
- Sin CSS externo ni módulos — todo en App.jsx
- Layouts de dos columnas para comparar Tolú vs Barbosa
- Banners clickeables que filtran contenido
- Fuente: Montserrat

## Reglas para Claude

- Cada vez que hagamos un cambio en App.jsx que requiera columnas nuevas en Supabase, incluir al final de la respuesta el `ALTER TABLE` necesario para aplicar ese cambio.
- Cuando se creen layouts con datos por territorio, siempre usar dos columnas lado a lado: Tolú a la izquierda con color `#0ea5e9`, Barbosa a la derecha con color `#8b5cf6`.
- Al modificar App.jsx, nunca eliminar funcionalidad existente — solo agregar o ajustar. Si un cambio es estructural, avisar antes de implementarlo y esperar confirmación.
- Los banners de resumen numérico siempre deben ser clickeables y filtrar el contenido de la página al hacer clic.
- Cualquier campo personal de un actor (cumpleaños, familia, intereses, etc.) va exclusivamente en el tab 🌟 Datos Personales del modal de actor, nunca en otros tabs.

## Contexto del negocio
- Modelo de co-responsabilidad (no caridad): el proyecto deja capacidades instaladas
- La DAC gestiona relacionamiento comunitario, político e institucional
- KPIs se reportan trimestralmente (Q1–Q4 2026)
- Las gestoras trabajan en campo y registran novedades desde móvil