import { AppError } from '../errors'

/** Splits `data:<mime>;base64,<data>` into the parts an MCP image content needs. */
export function parseImageDataUrl(value: unknown): { data: string; mimeType: string } {
  const match = typeof value === 'string' ? /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(value) : null
  if (!match) throw new AppError('The app did not return an image (expected a PNG data URL).')
  return { mimeType: match[1]!, data: match[2]! }
}
