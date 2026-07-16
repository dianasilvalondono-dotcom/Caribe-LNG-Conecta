# Caribe LNG Conecta — Contexto del proyecto

## Qué es esto
App web de gestión social territorial para Caribe LNG. Permite a la Dirección de Asuntos Corporativos (DAC) gestionar actores, acuerdos comunitarios, cronograma, KPIs y riesgos del proyecto en tiempo real.

## Caribe LNG — Definición de verdad (ADN corporativo, 8 jul 2026)
Fuente canónica: `Caribe LNG/01 Estrategia Institucional/20260708_Fundamentos_Corporativos_ADN_v1.3.pdf`. Ante cualquier conflicto sobre qué es la empresa, esta definición gana.

- **Qué es (OFICIAL):** Caribe LNG es una **empresa de infraestructura energética** enfocada en llevar GNL a los mercados de Latinoamérica. Solución integral del buque al consumidor: FSU en el Golfo de Morrosquillo, barcaza Ro/Ro, transferencia, transporte terrestre, regasificación en tierra e inyección al Sistema Nacional de Transporte. Colombia es la primera implementación de una plataforma logística de GNL escalable para Latinoamérica. Joint venture de tres socios: Course2 Energy, Six One Commodities y Andalusian Energy.
- **Propósito (OFICIAL):** fortalecer la seguridad energética de Latinoamérica con una operación de GNL flexible, segura, escalable y sostenible, generando desarrollo en las regiones donde operamos.
- **Misión (PROPUESTA, en aprobación MD → CEO → Junta):** asegurar el acceso oportuno y confiable al gas natural en Latinoamérica mediante infraestructura innovadora de GNL, creando valor para clientes, accionistas y los países donde operamos, contribuyendo a una transición energética responsable.
- **Visión (PROPUESTA):** ser la empresa que redefina la infraestructura del gas natural en Latinoamérica, con Colombia como primera implementación y referente logístico y energético del Caribe.
- **Valores (PROPUESTA):** Seguridad · Rigor · Sostenibilidad · Cercanía · Integridad.
- **Cultura:** "todos responsables de todos"; justo a tiempo, no antes; **lo que no está registrado, no ocurrió** (este es el fundamento cultural de esta app: toda la evidencia de campo se registra aquí).
- **Dónde (OFICIAL):** Tolú (Sucre) y Barbosa (Antioquia), con **Vasconia en Fase 2** y alcance nacional. Con quién: Energy Transition (ET), socio comercializador Fase 1 (51.000 MMBtu/día); Compas, socio portuario en Tolú.
- **Mensajes clave (OFICIAL, framing regional):** (1) Venimos a sumar: alternativa complementaria a la red de gas de cada mercado donde operamos. (2) Una operación flexible, segura, escalable y sostenible. (3) Fortalecemos la seguridad energética de la región con desarrollo en cada territorio donde operamos.

## Stack
- React (single-file, App.jsx)
- Supabase (base de datos + autenticación)
- Vercel (deploy)
- Autenticación: Microsoft 365 OAuth (tenant caribelng.com)

## Territorios
- **Tolú** — Terminal marítima, departamento de Sucre. Color: #007A87
- **Barbosa** — Planta de regasificación, departamento de Antioquia. Color: #00BFB3
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

## Design tokens (objeto C en App.jsx) — Brandbook 2026
```js
const C = {
  navy:    '#0D47A1',  // Pantone 294 C — primary dark
  blue:    '#1565C0',  // Pantone 2145 C — primary medium
  accent:  '#1565C0',  // primary blue for links/accents
  tolu:    '#007A87',  // Pantone 7716 C — secondary teal (Tolú)
  barbosa: '#00BFB3',  // Pantone 3262 C — secondary cyan (Barbosa)
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
- Cuando se creen layouts con datos por territorio, siempre usar dos columnas lado a lado: Tolú a la izquierda con color `#0ea5e9`, Barbosa a la derecha con color `#00BFB3`.
- Al modificar App.jsx, nunca eliminar funcionalidad existente — solo agregar o ajustar. Si un cambio es estructural, avisar antes de implementarlo y esperar confirmación.
- Los banners de resumen numérico siempre deben ser clickeables y filtrar el contenido de la página al hacer clic.
- Cualquier campo personal de un actor (cumpleaños, familia, intereses, etc.) va exclusivamente en el tab 🌟 Datos Personales del modal de actor, nunca en otros tabs.

## Contexto del negocio
- Modelo de co-responsabilidad (no caridad): el proyecto deja capacidades instaladas
- La DAC gestiona relacionamiento comunitario, político e institucional
- KPIs se reportan trimestralmente (Q1–Q4 2026)
- Las gestoras trabajan en campo y registran novedades desde móvil