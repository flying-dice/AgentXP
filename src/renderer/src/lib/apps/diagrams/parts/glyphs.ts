/**
 * The 16 × 16 toolbar glyphs of Agent Diagrams (inner SVG markup, viewBox 0 0 16 16), drawn in the flat, slightly
 * shaded style of an XP-era office toolbar.
 */
const ink = '#1c2f4a'
const blue = '#2f62b0'

export const GLYPHS = {
  pointer: `<path d="M4 1.5v11.5l3-2.8 2 4.3 1.8-.8-2-4.2h4z" fill="#fff" stroke="#000" stroke-linejoin="round"/>`,
  connector: `<rect x="1.5" y="1.5" width="5" height="4" fill="#dbe8f8" stroke="${blue}"/><rect x="9.5" y="10.5" width="5" height="4" fill="#dbe8f8" stroke="${blue}"/><path d="M4 5.5v4.5h6.5" fill="none" stroke="${ink}"/><path d="M9 8l2.5 2-2.5 2z" fill="${ink}"/>`,
  text: `<path d="M3 2.5h10v3h-1.2l-.5-1.6H9v8.6l1.6.4V14H5.4v-1.1l1.6-.4V3.9H4.7l-.5 1.6H3z" fill="${ink}"/>`,
  'route-orthogonal': `<path d="M2 3.5h6v9h6" fill="none" stroke="${ink}" stroke-width="1.4"/><circle cx="2" cy="3.5" r="1.5" fill="${blue}"/><circle cx="14" cy="12.5" r="1.5" fill="${blue}"/>`,
  'route-straight': `<path d="M2.5 13l11-10" fill="none" stroke="${ink}" stroke-width="1.4"/><circle cx="2.5" cy="13" r="1.5" fill="${blue}"/><circle cx="13.5" cy="3" r="1.5" fill="${blue}"/>`,
  'route-curved': `<path d="M2.5 13C3 5 13 11 13.5 3" fill="none" stroke="${ink}" stroke-width="1.4"/><circle cx="2.5" cy="13" r="1.5" fill="${blue}"/><circle cx="13.5" cy="3" r="1.5" fill="${blue}"/>`,
  bold: `<path d="M4 2.5h4.6c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.6 2.2 1.3.3 2.1 1.2 2.1 2.6 0 2-1.4 3.1-3.6 3.1H4zm2.3 1.8v2.6h1.9c1 0 1.5-.5 1.5-1.3s-.5-1.3-1.5-1.3zm0 4.3v3h2.1c1.1 0 1.7-.5 1.7-1.5s-.6-1.5-1.7-1.5z" fill="${ink}"/>`,
  italic: `<path d="M6.5 2.5h5.5l-.2 1.2h-1.9L7.6 12.3h1.9l-.2 1.2H3.8l.2-1.2h1.9l2.3-8.6H6.3z" fill="${ink}"/>`,
  underline: `<path d="M4.5 2.5h2v5.3c0 1.4.6 2.2 1.6 2.2s1.6-.8 1.6-2.2V2.5h2v5.4c0 2.6-1.3 3.9-3.6 3.9s-3.6-1.3-3.6-3.9z" fill="${ink}"/><path d="M3.5 14h9" stroke="${ink}" stroke-width="1.2"/>`,
  'align-text-left': `<path d="M2 3.5h12M2 6.5h8M2 9.5h12M2 12.5h8" stroke="${ink}" stroke-width="1.2"/>`,
  'align-text-center': `<path d="M2 3.5h12M4 6.5h8M2 9.5h12M4 12.5h8" stroke="${ink}" stroke-width="1.2"/>`,
  'align-text-right': `<path d="M2 3.5h12M6 6.5h8M2 9.5h12M6 12.5h8" stroke="${ink}" stroke-width="1.2"/>`,
  'valign-top': `<path d="M2 2.5h12" stroke="${ink}" stroke-width="1.2"/><path d="M4.5 4.5h7M5.5 7h5" stroke="${blue}" stroke-width="1.2"/><rect x="2.5" y="3.5" width="11" height="10" fill="none" stroke="#9aa7b8"/>`,
  'valign-middle': `<path d="M4.5 7.5h7M5.5 10h5" stroke="${blue}" stroke-width="1.2"/><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="#9aa7b8"/>`,
  'valign-bottom': `<path d="M2 14.5h12" stroke="${ink}" stroke-width="1.2"/><path d="M4.5 9.5h7M5.5 12h5" stroke="${blue}" stroke-width="1.2"/><rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="#9aa7b8"/>`,
  'fill-color': `<path d="M2.5 6.5L7 2l4.5 4.5L7 11z" fill="#fff" stroke="${ink}" stroke-linejoin="round"/><path d="M2.5 6.5h9" stroke="${ink}"/><path d="M13 7.5c.8 1.1 1.1 1.9.5 2.4-.6.4-1.4-.1-1.4-.9 0-.5.5-1.1.9-1.5z" fill="${ink}"/>`,
  'line-color': `<path d="M2.5 11.5l8.5-8.5 2 2-8.5 8.5H2.5z" fill="#fff" stroke="${ink}" stroke-linejoin="round"/><path d="M9.5 4.5l2 2" stroke="${ink}"/>`,
  'font-color': `<path d="M3.5 12.5L7.2 2h1.6l3.7 10.5h-1.9l-.9-2.8H6.3l-.9 2.8zm3.3-4.3h2.4L8 4.4z" fill="${ink}"/>`,
  'line-weight': `<path d="M2 3h12" stroke="${ink}" stroke-width="1"/><path d="M2 6.5h12" stroke="${ink}" stroke-width="2"/><path d="M2 11h12" stroke="${ink}" stroke-width="3.5"/>`,
  'line-pattern': `<path d="M2 3.5h12" stroke="${ink}" stroke-width="1.4"/><path d="M2 8h12" stroke="${ink}" stroke-width="1.4" stroke-dasharray="3 2"/><path d="M2 12.5h12" stroke="${ink}" stroke-width="1.4" stroke-dasharray="1.2 1.8"/>`,
  'line-ends': `<path d="M2 4.5h9" stroke="${ink}" stroke-width="1.2"/><path d="M10 2l4 2.5-4 2.5z" fill="${ink}"/><path d="M5 11.5h9" stroke="${ink}" stroke-width="1.2"/><path d="M5 11.5l-1.5-2M5 11.5l-1.5 2M5 11.5H2" stroke="${ink}" stroke-width="1.2"/>`,
  shadow: `<rect x="4.5" y="4.5" width="9" height="9" fill="#7a7a7a"/><rect x="2.5" y="2.5" width="9" height="9" fill="#dbe8f8" stroke="${blue}"/>`,
  'align-left': `<path d="M2.5 1.5v13" stroke="${ink}"/><rect x="3.5" y="3.5" width="9" height="3" fill="#dbe8f8" stroke="${blue}"/><rect x="3.5" y="9.5" width="5" height="3" fill="#dbe8f8" stroke="${blue}"/>`,
  'align-center': `<path d="M8 1.5v13" stroke="${ink}"/><rect x="3.5" y="3.5" width="9" height="3" fill="#dbe8f8" stroke="${blue}"/><rect x="5.5" y="9.5" width="5" height="3" fill="#dbe8f8" stroke="${blue}"/>`,
  'align-right': `<path d="M13.5 1.5v13" stroke="${ink}"/><rect x="3.5" y="3.5" width="9" height="3" fill="#dbe8f8" stroke="${blue}"/><rect x="7.5" y="9.5" width="5" height="3" fill="#dbe8f8" stroke="${blue}"/>`,
  'align-top': `<path d="M1.5 2.5h13" stroke="${ink}"/><rect x="3.5" y="3.5" width="3" height="9" fill="#dbe8f8" stroke="${blue}"/><rect x="9.5" y="3.5" width="3" height="5" fill="#dbe8f8" stroke="${blue}"/>`,
  'align-middle': `<path d="M1.5 8h13" stroke="${ink}"/><rect x="3.5" y="3.5" width="3" height="9" fill="#dbe8f8" stroke="${blue}"/><rect x="9.5" y="5.5" width="3" height="5" fill="#dbe8f8" stroke="${blue}"/>`,
  'align-bottom': `<path d="M1.5 13.5h13" stroke="${ink}"/><rect x="3.5" y="3.5" width="3" height="9" fill="#dbe8f8" stroke="${blue}"/><rect x="9.5" y="7.5" width="3" height="5" fill="#dbe8f8" stroke="${blue}"/>`,
  'distribute-h': `<rect x="1.5" y="4.5" width="3" height="7" fill="#dbe8f8" stroke="${blue}"/><rect x="6.5" y="4.5" width="3" height="7" fill="#dbe8f8" stroke="${blue}"/><rect x="11.5" y="4.5" width="3" height="7" fill="#dbe8f8" stroke="${blue}"/><path d="M1 14h14" stroke="${ink}"/>`,
  'distribute-v': `<rect x="4.5" y="1.5" width="7" height="3" fill="#dbe8f8" stroke="${blue}"/><rect x="4.5" y="6.5" width="7" height="3" fill="#dbe8f8" stroke="${blue}"/><rect x="4.5" y="11.5" width="7" height="3" fill="#dbe8f8" stroke="${blue}"/><path d="M14 1v14" stroke="${ink}"/>`,
  front: `<rect x="1.5" y="1.5" width="8" height="8" fill="#c0c8d4" stroke="#6b7886"/><rect x="5.5" y="5.5" width="9" height="9" fill="#dbe8f8" stroke="${blue}"/>`,
  back: `<rect x="5.5" y="5.5" width="9" height="9" fill="#c0c8d4" stroke="#6b7886"/><rect x="1.5" y="1.5" width="8" height="8" fill="none" stroke="${blue}" stroke-dasharray="2 1"/><rect x="5.5" y="5.5" width="4" height="4" fill="#c0c8d4"/>`,
  group: `<rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke="${ink}" stroke-dasharray="2 1.5"/><rect x="3.5" y="3.5" width="5" height="4" fill="#dbe8f8" stroke="${blue}"/><circle cx="10.5" cy="10.5" r="2.5" fill="#fbe7a3" stroke="#a87a0c"/>`,
  ungroup: `<rect x="1.5" y="1.5" width="6" height="5" fill="#dbe8f8" stroke="${blue}"/><circle cx="11.5" cy="11.5" r="3" fill="#fbe7a3" stroke="#a87a0c"/><path d="M8.5 4h3M12 4v3" stroke="${ink}" stroke-dasharray="1.5 1"/>`,
  layout: `<rect x="5.5" y="1.5" width="5" height="3" fill="#dbe8f8" stroke="${blue}"/><rect x="1.5" y="11.5" width="5" height="3" fill="#dbe8f8" stroke="${blue}"/><rect x="9.5" y="11.5" width="5" height="3" fill="#dbe8f8" stroke="${blue}"/><path d="M8 4.5v3.5M4 11.5V8h8v3.5" fill="none" stroke="${ink}"/>`,
  'rotate-left': `<path d="M5 3.5A5 5 0 1 1 3 8" fill="none" stroke="${ink}" stroke-width="1.4"/><path d="M2 1.5v4h4" fill="none" stroke="${ink}" stroke-width="1.4"/>`,
  'rotate-right': `<path d="M11 3.5A5 5 0 1 0 13 8" fill="none" stroke="${ink}" stroke-width="1.4"/><path d="M14 1.5v4h-4" fill="none" stroke="${ink}" stroke-width="1.4"/>`,
  'zoom-in': `<circle cx="6.5" cy="6.5" r="4.5" fill="#eef5ff" stroke="${ink}" stroke-width="1.3"/><path d="M10 10l4.5 4.5" stroke="${ink}" stroke-width="2"/><path d="M4.5 6.5h4M6.5 4.5v4" stroke="${blue}" stroke-width="1.3"/>`,
  'zoom-out': `<circle cx="6.5" cy="6.5" r="4.5" fill="#eef5ff" stroke="${ink}" stroke-width="1.3"/><path d="M10 10l4.5 4.5" stroke="${ink}" stroke-width="2"/><path d="M4.5 6.5h4" stroke="${blue}" stroke-width="1.3"/>`,
  'whole-page': `<rect x="3.5" y="1.5" width="9" height="13" fill="#fff" stroke="${ink}"/><path d="M1 4V1h3M15 4V1h-3M1 12v3h3M15 12v3h-3" fill="none" stroke="${blue}"/>`,
  'shapes-pane': `<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="${ink}"/><rect x="1.5" y="1.5" width="5" height="13" fill="#c6d3f7" stroke="${ink}"/><rect x="2.8" y="3" width="2.4" height="2" fill="${blue}"/><circle cx="4" cy="8" r="1.2" fill="${blue}"/><path d="M2.8 12l1.2-2 1.2 2z" fill="${blue}"/>`,
  'format-pane': `<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="${ink}"/><rect x="9.5" y="1.5" width="5" height="13" fill="#c6d3f7" stroke="${ink}"/><path d="M10.5 4h3M10.5 6.5h3M10.5 9h3" stroke="${blue}"/>`,
  grid: `<path d="M1.5 1.5h13v13h-13zM6 1.5v13M10.5 1.5v13M1.5 6h13M1.5 10.5h13" fill="none" stroke="#8a9ab0"/>`,
  'new-page': `<path d="M3.5 1.5h6l3 3v10h-9z" fill="#fff" stroke="#6b7886"/><path d="M9.5 1.5v3h3" fill="#cfd9e6" stroke="#6b7886"/><path d="M8 7v5M5.5 9.5h5" stroke="#2e9a2e" stroke-width="1.6"/>`,
  'export-image': `<rect x="1.5" y="2.5" width="11" height="9" fill="#fff" stroke="#6b7886"/><path d="M2.5 10.5l3-3.5 2 2 1.5-1.5 2.5 3z" fill="#7fb4e6"/><circle cx="9.5" cy="5" r="1.2" fill="#f2c94a"/><path d="M11 13.5h4M13 11.5l2 2-2 2" fill="none" stroke="#2e9a2e" stroke-width="1.3"/>`,
  lock: `<rect x="3.5" y="7.5" width="9" height="7" rx="1" fill="#f2cf4a" stroke="#a87a0c"/><path d="M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5" fill="none" stroke="#6b7886" stroke-width="1.4"/>`,
  'connection-point': `<path d="M4 4l8 8M12 4l-8 8" stroke="${blue}" stroke-width="1.6"/>`
} as const

export type GlyphName = keyof typeof GLYPHS
