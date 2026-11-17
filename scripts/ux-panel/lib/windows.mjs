// H-102: which program window a screenshot shows. Every Electron window has the title "AgentXP" (H-43), so the kind tells them apart.

/** `launcher`, `desktop` or `window`, from the address of the page. */
export const windowKind = (url) => (/[?&]launcher=/.test(url) ? 'launcher' : /[?&]desktop=/.test(url) ? 'desktop' : 'window')

/** The line printed under a screenshot: "Window shown: desktop "Fix login redirect"". */
export const windowLine = (url, title) => `Window shown: ${windowKind(url)}${title ? ` "${title}"` : ''}`
