/** The `file:` URL of an absolute path (POSIX or Windows), as the backend's `fileURLToPath` expects it. */
export function pathToFileUrl(path: string): string {
  const slashed = path.replace(/\\/g, '/')
  const absolute = slashed.startsWith('/') ? slashed : `/${slashed}`
  return `file://${absolute.split('/').map(encodeURIComponent).join('/').replace(/^\/([A-Za-z])%3A/, '/$1:')}`
}
