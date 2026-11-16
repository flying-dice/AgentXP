/** The manuals of `docs/help`, bundled at build time. */
import { parseTopics } from './helpModel'

const files = import.meta.glob('../../../../../../docs/help/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const helpTopics = parseTopics(files)
