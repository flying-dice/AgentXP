/** Minimal RFC 6901 JSON pointer writer used for A2UI data model updates. */

function parsePointer(path: string): string[] {
  return path
    .split('/')
    .slice(1)
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'))
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object' && value !== null
}

function childKey(container: Record<string, unknown> | unknown[], token: string): string | number {
  if (!Array.isArray(container)) return token
  return token === '-' ? container.length : Number(token)
}

function assign(container: Record<string, unknown> | unknown[], key: string | number, value: unknown): void {
  ;(container as Record<string | number, unknown>)[key] = value
}

function read(container: Record<string, unknown> | unknown[], key: string | number): unknown {
  return (container as Record<string | number, unknown>)[key]
}

/**
 * Returns a copy of `model` with `value` written at `path`. An empty path replaces the
 * whole model. Missing intermediate objects are created (arrays when the next token is numeric).
 */
export function setAtPointer(model: unknown, path: string | undefined, value: unknown): unknown {
  if (!path || path === '/') return value
  const tokens = parsePointer(path)
  const root: Record<string, unknown> | unknown[] = isContainer(model)
    ? structuredClone(model)
    : /^\d+$/.test(tokens[0]) ? [] : {}
  let node = root
  tokens.forEach((token, index) => {
    const key = childKey(node, token)
    if (index === tokens.length - 1) return assign(node, key, value)
    let next = read(node, key)
    if (!isContainer(next)) {
      next = /^\d+$/.test(tokens[index + 1]) ? [] : {}
      assign(node, key, next)
    }
    node = next as Record<string, unknown> | unknown[]
  })
  return root
}
