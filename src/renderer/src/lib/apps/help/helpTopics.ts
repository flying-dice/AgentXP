/** The manuals in the repo's `manuals/` folder, bundled at build time. */
import { parseTopics } from './helpModel'

const files = import.meta.glob('../../../../../../manuals/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export const helpTopics = parseTopics(files)
