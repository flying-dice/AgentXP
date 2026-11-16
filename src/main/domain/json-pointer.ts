/** JSON pointer writes for A2UI data model updates, delegated to web_core's `DataModel` so the
 * persisted model follows exactly the rules the renderer applies. */
import { DataModel } from '@a2ui/web_core/v0_9'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Returns a copy of `model` with `value` written at the RFC 6901 `path`. An empty path replaces
 * the whole model. Missing intermediate objects are created (arrays when the next token is
 * numeric); an `undefined` value removes the key. Throws on invalid paths, like web_core does.
 */
export function setAtPointer(model: unknown, path: string | undefined, value: unknown): unknown {
  if (!path || path === '/') return value
  const dataModel = new DataModel(isRecord(model) ? structuredClone(model) : {})
  try {
    dataModel.set(path, value, true)
    return dataModel.get('/')
  } finally {
    dataModel.dispose()
  }
}
