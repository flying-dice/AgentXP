import { fileURLToPath } from 'node:url'
import { AppError } from '../errors'

/** `file:` URL to an absolute path (the renderer builds these from picked paths). */
export function fileUrlToPath(url: string): string {
  try {
    return fileURLToPath(url)
  } catch {
    throw new AppError(`Not a valid file URL: ${url}`)
  }
}
