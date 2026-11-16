/**
 * Win7-flavoured 16x16 icon set. Each entry is the inner SVG markup (viewBox 0 0 16 16).
 * Gradient ids are namespaced per icon (`ix-<name>-…`) so identical markup can repeat on a page.
 */

export const iconNames = [
  'folder', 'folder-open', 'file', 'file-code', 'file-text', 'session', 'new', 'open-folder',
  'save', 'undo', 'redo', 'compact', 'stop', 'options', 'info', 'warning', 'error', 'question',
  'shield', 'terminal', 'search', 'edit', 'check', 'close', 'minimize', 'maximize', 'restore',
  'chevron-down', 'chevron-right', 'chevron-up', 'chevron-left', 'plus', 'minus', 'refresh',
  'attach', 'agent', 'claude', 'tasks', 'changes', 'properties', 'copy', 'cut', 'paste',
  'delete', 'play', 'pause', 'globe', 'lock', 'user', 'help', 'agent7',
  'paint', 'wordpad', 'sticky', 'eventlog', 'scissors', 'recycle', 'recycle-full', 'taskmgr'
] as const

export type IconName = (typeof iconNames)[number]

/** Vertical two-stop gradient definition. `~` in markup is replaced by the icon's id prefix. */
const vg = (id: string, top: string, bottom: string, mid?: string): string =>
  `<linearGradient id="~${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/>` +
  (mid ? `<stop offset=".5" stop-color="${mid}"/>` : '') +
  `<stop offset="1" stop-color="${bottom}"/></linearGradient>`

const rg = (id: string, inner: string, outer: string): string =>
  `<radialGradient id="~${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient>`

const folderDefs = vg('f', '#fde9a0', '#f0c04e')
const folderBody =
  '<path d="M1.5 3.5h4.5l1.5 1.5h7v8.5h-13z" fill="url(#~f)" stroke="#b8902c"/>' +
  '<path d="M2 6.5h12" stroke="#fff" opacity=".55"/>'

const docDefs = vg('d', '#ffffff', '#e4eaf2')
const docBase =
  '<path d="M3.5 1.5h6l3 3v10h-9z" fill="url(#~d)" stroke="#6b7886"/>' +
  '<path d="M9.5 1.5v3h3" fill="#cfd9e6" stroke="#6b7886"/>'

const circleBadge = (a: string, b: string, stroke: string, glyph: string): string =>
  `<defs>${rg('c', a, b)}</defs><circle cx="8" cy="8" r="6.8" fill="url(#~c)" stroke="${stroke}"/>${glyph}`

const chev = (d: string): string =>
  `<path d="${d}" fill="none" stroke="#3d4a5c" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>`

const defs = (d: string, body: string): string => `<defs>${d}</defs>${body}`

const markup: Record<IconName, string> = {
  folder: defs(folderDefs, folderBody),
  'folder-open': defs(
    folderDefs + vg('g', '#fff3c4', '#f4cf6a'),
    '<path d="M1.5 3.5h4.5l1.5 1.5h6v2.5h-12z" fill="url(#~f)" stroke="#b8902c"/>' +
      '<path d="M4 7.5h11.5l-2 6h-12z" fill="url(#~g)" stroke="#b8902c" stroke-linejoin="round"/>'
  ),
  'open-folder': defs(
    folderDefs + vg('g', '#fff3c4', '#f4cf6a'),
    '<path d="M1.5 3.5h4.5l1.5 1.5h6v2.5h-12z" fill="url(#~f)" stroke="#b8902c"/>' +
      '<path d="M4 7.5h11.5l-2 6h-12z" fill="url(#~g)" stroke="#b8902c" stroke-linejoin="round"/>'
  ),
  file: defs(docDefs, docBase),
  'file-code': defs(
    docDefs,
    docBase +
      '<path d="M6.5 7l-2 2 2 2M9.5 7l2 2-2 2" fill="none" stroke="#2f6db5" stroke-width="1.4"/>'
  ),
  'file-text': defs(
    docDefs,
    docBase + '<path d="M5 8h6M5 10h6M5 12h4" stroke="#7d8da3" stroke-width="1"/>'
  ),
  session: defs(
    vg('s', '#f1f8ff', '#bcd9f5'),
    '<path d="M1.5 2.5h13v8.5H7.5l-3 3v-3h-3z" fill="url(#~s)" stroke="#4a7fb8" stroke-linejoin="round"/>' +
      '<path d="M4 5.5h8M4 7.5h5" stroke="#6f9fd0"/>'
  ),
  new: circleBadge(
    '#8fc4f5',
    '#2f78cf',
    '#1d5fae',
    '<path d="M8 4.2v7.6M4.2 8h7.6" stroke="#fff" stroke-width="2"/>'
  ),
  save: defs(
    vg('b', '#8aa5c6', '#4e6a8d'),
    '<path d="M1.5 1.5h10.5l2.5 2.5v10.5h-13z" fill="url(#~b)" stroke="#34506f" stroke-linejoin="round"/>' +
      '<rect x="4" y="1.5" width="7" height="4.5" fill="#eef3f9" stroke="#34506f"/>' +
      '<rect x="8.5" y="2.5" width="1.5" height="2.5" fill="#6b86a8"/>' +
      '<rect x="3.5" y="8.5" width="9" height="6" fill="#fff" stroke="#34506f"/>'
  ),
  undo: defs(
    vg('a', '#7fb6ef', '#2f6db5'),
    '<path d="M4 7h6.5a3.5 3.5 0 010 7H6" fill="none" stroke="#2f6db5" stroke-width="2"/>' +
      '<path d="M6.5 2.5L1.5 7l5 4.5z" fill="url(#~a)" stroke="#1d5fae" stroke-linejoin="round"/>'
  ),
  redo: defs(
    vg('a', '#7fb6ef', '#2f6db5'),
    '<path d="M12 7H5.5a3.5 3.5 0 000 7H10" fill="none" stroke="#2f6db5" stroke-width="2"/>' +
      '<path d="M9.5 2.5l5 4.5-5 4.5z" fill="url(#~a)" stroke="#1d5fae" stroke-linejoin="round"/>'
  ),
  compact:
    '<path d="M8 1v5M5 4l3 3 3-3M8 15v-5M5 12l3-3 3 3" fill="none" stroke="#4d7a2b" stroke-width="1.8"/>',
  stop: defs(
    vg('r', '#f58a82', '#c8312b'),
    '<rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="url(#~r)" stroke="#8f1d18"/>' +
      '<rect x="3.5" y="3.5" width="9" height="4" rx="1" fill="#fff" opacity=".3"/>'
  ),
  options: defs(
    vg('o', '#9aa6b5', '#56606d'),
    '<path d="M7 1h2l.4 1.9 1.3.6 1.6-1.1 1.4 1.4-1.1 1.6.6 1.3L15 7v2l-1.9.4-.6 1.3 1.1 1.6-1.4 1.4-1.6-1.1-1.3.6L9 15H7l-.4-1.9-1.3-.6-1.6 1.1-1.4-1.4 1.1-1.6-.6-1.3L1 9V7l1.9-.4.6-1.3-1.1-1.6 1.4-1.4 1.6 1.1 1.3-.6z" fill="url(#~o)" stroke="#3f4753" stroke-width=".8" stroke-linejoin="round"/>' +
      '<circle cx="8" cy="8" r="2.4" fill="#f0f0f0" stroke="#3f4753"/>'
  ),
  info: circleBadge(
    '#9fd0fb',
    '#2f78cf',
    '#1d5fae',
    '<path d="M8 7.2v4.6" stroke="#fff" stroke-width="2"/><circle cx="8" cy="4.6" r="1.2" fill="#fff"/>'
  ),
  warning: defs(
    vg('w', '#fff3a6', '#f2b51c'),
    '<path d="M8 1.5l7 12.5H1z" fill="url(#~w)" stroke="#a87a0c" stroke-linejoin="round"/>' +
      '<path d="M8 6v4" stroke="#4a3a00" stroke-width="1.8"/><circle cx="8" cy="12" r="1" fill="#4a3a00"/>'
  ),
  error: circleBadge(
    '#f59a92',
    '#c8312b',
    '#8f1d18',
    '<path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="#fff" stroke-width="2"/>'
  ),
  question: circleBadge(
    '#9fd0fb',
    '#2f78cf',
    '#1d5fae',
    '<path d="M5.8 6.2a2.2 2.2 0 114 1c-.8.7-1.8 1-1.8 2.3" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="8" cy="12" r="1.1" fill="#fff"/>'
  ),
  shield: defs(
    vg('l', '#6fb1f5', '#2d6fc4') + vg('r', '#ffe27a', '#e8a800'),
    '<path d="M8 1L14 3.4v4.4c0 3.2-2.4 5.9-6 7.2-3.6-1.3-6-4-6-7.2V3.4z" fill="url(#~l)" stroke="#1d5fae"/>' +
      '<path d="M8 1v14c3.6-1.3 6-4 6-7.2V3.4z" fill="url(#~r)" stroke="#1d5fae" stroke-linejoin="round" opacity=".95"/>' +
      '<path d="M8 1L2 3.4v4.4c0 3.2 2.4 5.9 6 7.2z" fill="url(#~l)" stroke="#1d5fae" stroke-linejoin="round"/>'
  ),
  terminal: defs(
    vg('t', '#4a4a4a', '#0c0c0c'),
    '<rect x="1.5" y="2.5" width="13" height="11" rx="1" fill="url(#~t)" stroke="#333"/>' +
      '<rect x="1.5" y="2.5" width="13" height="2" fill="#7a96c2"/>' +
      '<path d="M4 7l2 1.5L4 10M7.5 10.5h3" fill="none" stroke="#ccc" stroke-width="1.1"/>'
  ),
  search: defs(
    rg('s', '#ffffff', '#b9d6f3'),
    '<circle cx="6.5" cy="6.5" r="4.5" fill="url(#~s)" stroke="#4a7fb8" stroke-width="1.5"/>' +
      '<path d="M10 10l4.5 4.5" stroke="#6b7886" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M10 10l4.5 4.5" stroke="#a9b4c2" stroke-width="1" stroke-linecap="round"/>'
  ),
  edit: defs(
    vg('p', '#ffe27a', '#e8a800'),
    '<path d="M2 14l.8-3.6L11 2.2l2.8 2.8-8.2 8.2z" fill="url(#~p)" stroke="#8a6a0a" stroke-linejoin="round"/>' +
      '<path d="M9.8 3.4l2.8 2.8" stroke="#8a6a0a"/><path d="M2 14l.8-3.6 2.8 2.8z" fill="#f4d9a8" stroke="#8a6a0a" stroke-linejoin="round"/>' +
      '<path d="M2 14l1-.2-.8-.8z" fill="#333"/>'
  ),
  check:
    '<path d="M2.5 8.5l3.8 3.8 7.2-8" fill="none" stroke="#237a23" stroke-width="3" stroke-linecap="square"/>' +
    '<path d="M2.5 8.5l3.8 3.8 7.2-8" fill="none" stroke="#5fd35f" stroke-width="1.3" stroke-linecap="square"/>',
  close:
    '<g stroke-width="3.4" stroke="#5a1710" stroke-linecap="square"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></g>' +
    '<g stroke-width="1.8" stroke="#fff" stroke-linecap="square"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></g>',
  minimize:
    '<rect x="3.5" y="10" width="9" height="3" fill="#fff" stroke="#3a4f6e"/>',
  maximize:
    '<rect x="3" y="3" width="10" height="10" fill="none" stroke="#3a4f6e" stroke-width="1.8"/>' +
    '<rect x="3" y="3" width="10" height="2.5" fill="#fff" stroke="#3a4f6e" stroke-width=".6"/>',
  restore:
    '<rect x="6" y="2.5" width="7.5" height="7" fill="none" stroke="#3a4f6e" stroke-width="1.5"/>' +
    '<rect x="2.5" y="6" width="7.5" height="7.5" fill="#e9eef6" stroke="#3a4f6e" stroke-width="1.5"/>' +
    '<rect x="2.5" y="6" width="7.5" height="2" fill="#fff" stroke="#3a4f6e" stroke-width=".5"/>',
  'chevron-down': chev('M3.5 6l4.5 4.5L12.5 6'),
  'chevron-right': chev('M6 3.5l4.5 4.5L6 12.5'),
  'chevron-up': chev('M3.5 10l4.5-4.5L12.5 10'),
  'chevron-left': chev('M10 3.5L5.5 8l4.5 4.5'),
  plus: defs(
    vg('a', '#7ed07e', '#2e9a2e'),
    '<path d="M6 2h4v4h4v4h-4v4H6v-4H2V6h4z" fill="url(#~a)" stroke="#237a23" stroke-linejoin="round"/>'
  ),
  minus: defs(
    vg('a', '#f58a82', '#c8312b'),
    '<rect x="2" y="6" width="12" height="4" fill="url(#~a)" stroke="#8f1d18"/>'
  ),
  refresh: defs(
    vg('a', '#8fd08f', '#2e9a2e'),
    '<path d="M13 8a5 5 0 01-9 3" fill="none" stroke="#2e9a2e" stroke-width="2"/>' +
      '<path d="M3 8a5 5 0 019-3" fill="none" stroke="#2e9a2e" stroke-width="2"/>' +
      '<path d="M14.5 2v5H9.5z" fill="url(#~a)" stroke="#237a23" stroke-linejoin="round"/>' +
      '<path d="M1.5 14V9h5z" fill="url(#~a)" stroke="#237a23" stroke-linejoin="round"/>'
  ),
  attach:
    '<path d="M11 5.5L6 10.5a1.5 1.5 0 002.1 2.1l6-6a3 3 0 00-4.2-4.2l-6.3 6.3a4.5 4.5 0 006.4 6.4L12 12.5" fill="none" stroke="#6b7886" stroke-width="1.6" stroke-linecap="round" transform="translate(-1 -.5)"/>',
  agent: defs(
    vg('h', '#dfe7f1', '#98a8bd'),
    '<path d="M8 1.5v2" stroke="#56606d"/><circle cx="8" cy="1.5" r="1" fill="#d9403a"/>' +
      '<rect x="2.5" y="3.5" width="11" height="8" rx="2" fill="url(#~h)" stroke="#56606d"/>' +
      '<circle cx="5.8" cy="7.5" r="1.4" fill="#2f78cf" stroke="#1d5fae" stroke-width=".6"/>' +
      '<circle cx="10.2" cy="7.5" r="1.4" fill="#2f78cf" stroke="#1d5fae" stroke-width=".6"/>' +
      '<path d="M6 10h4" stroke="#56606d"/><rect x="5" y="12" width="6" height="2.5" fill="url(#~h)" stroke="#56606d"/>'
  ),
  claude:
    '<g stroke="#d97757" stroke-width="1.7" stroke-linecap="round"><path d="M8 1.5v13M1.5 8h13M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2"/></g>',
  tasks: defs(
    vg('c', '#ffffff', '#e4eaf2'),
    '<rect x="2.5" y="1.5" width="11" height="13" fill="url(#~c)" stroke="#6b7886"/>' +
      '<path d="M4 5l1 1 1.8-2M4 9l1 1 1.8-2M4 13l1 1 1.8-2" fill="none" stroke="#237a23" stroke-width="1.1" transform="translate(0 -1.5)"/>' +
      '<path d="M8 4.5h4M8 8.5h4M8 12.5h4" stroke="#7d8da3"/>'
  ),
  changes: defs(
    docDefs,
    docBase +
      '<path d="M5.5 7.5h4M7.5 5.5v4" stroke="#237a23" stroke-width="1.4"/>' +
      '<path d="M5.5 12h4" stroke="#c8312b" stroke-width="1.4"/>'
  ),
  properties: defs(
    docDefs + vg('b', '#6fb1f5', '#2d6fc4'),
    '<rect x="1.5" y="1.5" width="13" height="13" fill="url(#~d)" stroke="#6b7886"/>' +
      '<rect x="1.5" y="1.5" width="13" height="3" fill="url(#~b)" stroke="#1d5fae"/>' +
      '<path d="M4 7.5h8M4 10h8M4 12.5h5" stroke="#7d8da3"/>'
  ),
  copy: defs(
    docDefs,
    '<path d="M2.5 1.5h5l2 2v7h-7z" fill="url(#~d)" stroke="#6b7886"/>' +
      '<path d="M6.5 5.5h5l2 2v7h-7z" fill="url(#~d)" stroke="#6b7886"/><path d="M11.5 5.5v2h2" fill="#cfd9e6" stroke="#6b7886"/>'
  ),
  cut:
    '<path d="M5 1.5l4.5 8M11 1.5l-4.5 8" stroke="#6b7886" stroke-width="1.5"/>' +
    '<circle cx="5" cy="12" r="2.2" fill="#fff" stroke="#c8312b" stroke-width="1.5"/>' +
    '<circle cx="11" cy="12" r="2.2" fill="#fff" stroke="#c8312b" stroke-width="1.5"/>',
  paste: defs(
    vg('c', '#e0b878', '#b98440') + docDefs,
    '<rect x="2" y="2.5" width="9" height="11.5" rx="1" fill="url(#~c)" stroke="#7a5420"/>' +
      '<rect x="4.5" y="1" width="4" height="3" rx=".8" fill="#c9cdd3" stroke="#56606d"/>' +
      '<path d="M7 6.5h5l2 2v6H7z" fill="url(#~d)" stroke="#6b7886"/><path d="M12 6.5v2h2" fill="#cfd9e6" stroke="#6b7886"/>'
  ),
  delete: defs(
    vg('x', '#f58a82', '#c8312b'),
    '<path d="M2 2l12 12M14 2L2 14" stroke="#8f1d18" stroke-width="4" stroke-linecap="square"/>' +
      '<path d="M2 2l12 12M14 2L2 14" stroke="url(#~x)" stroke-width="2.4" stroke-linecap="square"/>'
  ),
  play: defs(
    vg('a', '#8fd88f', '#2e9a2e'),
    '<path d="M4 2l10 6-10 6z" fill="url(#~a)" stroke="#237a23" stroke-linejoin="round"/>'
  ),
  pause: defs(
    vg('a', '#9ab8e0', '#4a72a8'),
    '<rect x="3" y="2.5" width="3.5" height="11" fill="url(#~a)" stroke="#2f5282"/>' +
      '<rect x="9.5" y="2.5" width="3.5" height="11" fill="url(#~a)" stroke="#2f5282"/>'
  ),
  globe: defs(
    rg('g', '#a9dcff', '#2f78cf'),
    '<circle cx="8" cy="8" r="6.5" fill="url(#~g)" stroke="#1d5fae"/>' +
      '<path d="M4 4c1.5 0 2 1 3 1s0 2-1 2.5-1 2 0 2.5S5 12.5 4.5 11 2.5 8 2.7 6.5zM10 3.5c1.5.5 3 1.5 3 3.5s-1.5 1.5-2 3-2-.5-2-2 1.5-1.5 1-4.5z" fill="#5fb85f" stroke="#2e7a2e" stroke-width=".6"/>'
  ),
  lock: defs(
    vg('b', '#ffe27a', '#d89a00'),
    '<path d="M4.5 7V5a3.5 3.5 0 017 0v2" fill="none" stroke="#6b7886" stroke-width="1.8"/>' +
      '<rect x="2.5" y="7" width="11" height="7.5" rx="1" fill="url(#~b)" stroke="#8a6a0a"/>' +
      '<circle cx="8" cy="10.5" r="1.2" fill="#4a3a00"/><path d="M8 11v2" stroke="#4a3a00"/>'
  ),
  user: defs(
    rg('h', '#ffe3c4', '#e0a878') + vg('b', '#6fb1f5', '#2d6fc4'),
    '<path d="M2 15v-1.5a6 4 0 0112 0V15z" fill="url(#~b)" stroke="#1d5fae" stroke-linejoin="round"/>' +
      '<circle cx="8" cy="5" r="3.5" fill="url(#~h)" stroke="#a8743c"/>'
  ),
  help: defs(
    rg('c', '#fff6c0', '#f0b81c'),
    '<circle cx="8" cy="8" r="6.8" fill="url(#~c)" stroke="#a87a0c"/>' +
      '<path d="M5.8 6.2a2.2 2.2 0 114 1c-.8.7-1.8 1-1.8 2.3" fill="none" stroke="#4a3a00" stroke-width="1.7"/><circle cx="8" cy="12" r="1.1" fill="#4a3a00"/>'
  ),
  paint: defs(
    vg('p', '#fff3d6', '#e6c88a') + rg('a', '#ff8a80', '#c8312b') + rg('b', '#8fd88f', '#2e9a2e') + rg('c', '#8fc4f5', '#2f78cf'),
    '<path d="M8 1.8c4 0 6.7 2.4 6.7 5.5 0 2.3-1.7 2.8-3 2.8-1.3 0-1.7.9-1.2 1.8.5 1-.2 2.4-2.1 2.4C4.4 14.3 1.3 11.6 1.3 8 1.3 4.5 4.2 1.8 8 1.8z" fill="url(#~p)" stroke="#8a6a2a" stroke-linejoin="round"/>' +
      '<circle cx="5" cy="6" r="1.3" fill="url(#~a)" stroke="#8f1d18" stroke-width=".5"/>' +
      '<circle cx="8.4" cy="4.4" r="1.3" fill="url(#~b)" stroke="#237a23" stroke-width=".5"/>' +
      '<circle cx="11.6" cy="6.4" r="1.3" fill="url(#~c)" stroke="#1d5fae" stroke-width=".5"/>'
  ),
  wordpad: defs(
    docDefs + vg('b', '#6fb1f5', '#2d6fc4'),
    docBase +
      '<path d="M5 7.5h6M5 9.5h6M5 11.5h3" stroke="#7d8da3"/>' +
      '<path d="M9.5 14.5l.7-2.2 4-4 1.5 1.5-4 4z" fill="url(#~b)" stroke="#1d5fae" stroke-width=".8" stroke-linejoin="round"/>'
  ),
  sticky: defs(
    vg('y', '#fff9a8', '#f2d94a'),
    '<path d="M2 2.5h12v8.5l-3.5 3.5H2z" fill="url(#~y)" stroke="#a38a14" stroke-linejoin="round"/>' +
      '<path d="M10.5 14.5V11H14" fill="#e6c52c" stroke="#a38a14" stroke-linejoin="round"/>' +
      '<path d="M4 5.5h8M4 7.5h8M4 9.5h4" stroke="#b39a28"/>'
  ),
  eventlog: defs(
    docDefs + rg('w', '#fff6c0', '#f0b81c'),
    '<rect x="1.5" y="1.5" width="10" height="12" fill="url(#~d)" stroke="#6b7886"/>' +
      '<path d="M3.5 4.5h6M3.5 6.5h6M3.5 8.5h4" stroke="#7d8da3"/>' +
      '<circle cx="11.2" cy="11" r="4" fill="url(#~w)" stroke="#a87a0c"/>' +
      '<path d="M11.2 8.9v2.6" stroke="#4a3a00" stroke-width="1.4"/><circle cx="11.2" cy="13" r=".7" fill="#4a3a00"/>'
  ),
  scissors:
    '<path d="M5 1.5l5.3 8M11 1.5l-5.3 8" stroke="#8a97a8" stroke-width="1.6"/>' +
    '<circle cx="4.6" cy="12.2" r="2.2" fill="#fff" stroke="#2f6db5" stroke-width="1.5"/>' +
    '<circle cx="11.4" cy="12.2" r="2.2" fill="#fff" stroke="#2f6db5" stroke-width="1.5"/>',
  recycle: defs(
    vg('b', '#dfe9f4', '#a4b8cf'),
    '<path d="M3.5 4.5h9l-1 10h-7z" fill="url(#~b)" stroke="#52667f" stroke-linejoin="round"/>' +
      '<path d="M2.5 3.5h11v1.5h-11zM6 2h4v1.5H6z" fill="#cdd9e8" stroke="#52667f" stroke-linejoin="round"/>' +
      '<path d="M6 7v5.5M8 7v5.5M10 7v5.5" stroke="#7f93ab"/>'
  ),
  'recycle-full': defs(
    vg('b', '#dfe9f4', '#a4b8cf') + docDefs,
    '<path d="M4 1.5l3.5-.5 1 3-4 .8zM8.5 2l3.5 1.2-1.2 3-3.6-1.4z" fill="url(#~d)" stroke="#6b7886" stroke-linejoin="round"/>' +
      '<path d="M3.5 5.5h9l-1 9h-7z" fill="url(#~b)" stroke="#52667f" stroke-linejoin="round"/>' +
      '<path d="M2.5 4.5h11v1.5h-11z" fill="#cdd9e8" stroke="#52667f" stroke-linejoin="round"/>' +
      '<path d="M6 8v5M8 8v5M10 8v5" stroke="#7f93ab"/>'
  ),
  taskmgr: defs(
    vg('m', '#1c2a1c', '#0a140a') + vg('f', '#eef3f9', '#bfd0e4'),
    '<rect x="1.5" y="2" width="13" height="10" rx="1" fill="url(#~f)" stroke="#52667f"/>' +
      '<rect x="3" y="3.5" width="10" height="7" fill="url(#~m)" stroke="#2f3a2f" stroke-width=".6"/>' +
      '<path d="M3.5 9l2-2.5 1.8 1.5 2.2-3.5 1.5 2 1.5-1" fill="none" stroke="#5fe05f" stroke-width="1"/>' +
      '<path d="M5 14h6M8 12v2" stroke="#52667f" stroke-width="1.2"/>'
  ),
  agent7: defs(
    vg('b', '#7cc3ff', '#3f9bf0', '#2f86e0') + vg('c', '#8fe9ff', '#3cc8ee', '#22b8e0') + vg('a', '#ffe08a', '#ffb84d', '#f6a93a'),
    '<g transform="scale(.25)" stroke-width="3" stroke-linejoin="round">' +
      '<rect x="4" y="4" width="26" height="26" rx="3" fill="url(#~b)" stroke="#124a8c"/>' +
      '<rect x="34" y="4" width="26" height="26" rx="3" fill="url(#~c)" stroke="#0b6a8a"/>' +
      '<rect x="34" y="34" width="26" height="26" rx="3" fill="url(#~a)" stroke="#9a5a06"/></g>' +
      '<g fill="#fff" opacity=".4"><rect x="1.5" y="1.5" width="5.5" height="2.6" rx=".5"/><rect x="9" y="1.5" width="5.5" height="2.6" rx=".5"/><rect x="9" y="9" width="5.5" height="2.6" rx=".5"/></g>'
  )
}

/** Inner SVG markup for an icon with its gradient ids namespaced (`ix-<name>-`). */
export function iconMarkup(name: IconName): string {
  return markup[name].replaceAll('~', `ix-${name}-`)
}
