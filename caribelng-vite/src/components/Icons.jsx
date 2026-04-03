// Clean SVG icons for navigation — Lucide-inspired, 20x20, stroke-based
const I = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)

export const IconDashboard = (p) => <I {...p} d={<>
  <rect x="3" y="3" width="7" height="7" rx="1" />
  <rect x="14" y="3" width="7" height="4" rx="1" />
  <rect x="3" y="14" width="7" height="7" rx="1" />
  <rect x="14" y="11" width="7" height="10" rx="1" />
</>} />

export const IconPin = (p) => <I {...p} d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />

export const IconUsers = (p) => <I {...p} d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />

export const IconGlobe = (p) => <I {...p} d={<>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
  <path d="M2 12h20" />
</>} />

export const IconHandshake = (p) => <I {...p} d="M11 17a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1a5 5 0 0 1 3-4.58 M19 17a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1a5 5 0 0 1 3-4.58 M14.5 9.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0z M18.5 7.5a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" />

export const IconLeaf = (p) => <I {...p} d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />

export const IconCalendar = (p) => <I {...p} d={<>
  <rect x="3" y="4" width="18" height="18" rx="2" />
  <path d="M16 2v4 M8 2v4 M3 10h18" />
</>} />

export const IconAlert = (p) => <I {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />

export const IconClipboard = (p) => <I {...p} d={<>
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  <rect x="8" y="2" width="8" height="4" rx="1" />
</>} />

export const IconTarget = (p) => <I {...p} d={<>
  <circle cx="12" cy="12" r="10" />
  <circle cx="12" cy="12" r="6" />
  <circle cx="12" cy="12" r="2" />
</>} />

export const IconEdit = (p) => <I {...p} d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z M15 5l4 4" />

export const IconBrain = (p) => <I {...p} d="M12 2a7 7 0 0 0-7 7c0 3 1.5 5.5 4 6.5V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4.5c2.5-1 4-3.5 4-6.5a7 7 0 0 0-7-7z M9 18h6" />

export const IconCamera = (p) => <I {...p} d={<>
  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
  <circle cx="12" cy="13" r="3" />
</>} />

export const IconBell = (p) => <I {...p} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />

export const IconSearch = (p) => <I {...p} d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35" />

export const IconDownload = (p) => <I {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />

export const IconBook = (p) => <I {...p} d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />

export const IconTrash = (p) => <I {...p} d="M3 6h18 M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6 M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />

export const IconAnchor = (p) => <I {...p} d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 8v14 M5 12H2a10 10 0 0 0 20 0h-3" />

export const IconFactory = (p) => <I {...p} d={<>
  <path d="M2 20V8l4-4v6l4-4v6l4-4v12H2z" />
  <path d="M14 20V4l8 4v12H14z" />
  <path d="M6 20v-4 M10 20v-4 M18 20v-4" />
</>} />

export const IconBuilding = (p) => <I {...p} d={<>
  <rect x="4" y="2" width="16" height="20" rx="2" />
  <path d="M9 22v-4h6v4 M8 6h.01 M16 6h.01 M12 6h.01 M12 10h.01 M12 14h.01 M16 10h.01 M16 14h.01 M8 10h.01 M8 14h.01" />
</>} />

export const IconClipboardCheck = (p) => <I {...p} d={<>
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  <rect x="8" y="2" width="8" height="4" rx="1" />
  <path d="M9 14l2 2 4-4" />
</>} />
