/** Address bar input of the Browser app. */

const SCHEME = /^[a-z][a-z0-9+.-]*:/i

export const BLANK = 'about:blank'

/** Turns what the user typed into a URL: keeps schemes, adds https for hosts, searches for the rest. */
export function normalizeAddress(text: string): string {
  const input = text.trim()
  if (!input) return BLANK
  if (/^localhost(:\d+)?(\/|$)/i.test(input) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(input)) return `http://${input}`
  if (SCHEME.test(input) && !/^[a-z0-9.-]+:\d+/i.test(input)) return input
  if (!/\s/.test(input) && /^[^/?#\s]+\.[a-z]{2,}([/?#:]|$)/i.test(input)) return `https://${input}`
  return `https://duckduckgo.com/?q=${encodeURIComponent(input)}`
}

/** The host of a URL for the status bar and tab title, or the URL itself when it has none. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host || url
  } catch {
    return url
  }
}

export const isSecure = (url: string): boolean => url.startsWith('https://')

/** True when running inside Electron, where the real `<webview>` is available. */
export const inElectron = (): boolean =>
  typeof window !== 'undefined' && 'agent7' in window && typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')
