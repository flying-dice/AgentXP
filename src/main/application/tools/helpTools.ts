import type { HelpService } from '../HelpService'
import type { ToolHandlers } from './catalog'
import { attempt, textResult } from './types'

export interface HelpToolsDeps {
  help: Pick<HelpService, 'search' | 'read'>
}

/** help_search, help_read: the manuals of Help and Support. */
export function createHelpTools({ help }: HelpToolsDeps): ToolHandlers<'help_search' | 'help_read'> {
  return {
    help_search: async ({ query, limit }) => {
      const hits = help.search(query, limit ?? 8)
      return textResult(
        hits.length === 0
          ? `No section of the manuals matches "${query}".`
          : hits.map((h) => `${h.topic.id}${h.section ? ` > ${h.section}` : ''} (${h.topic.title}): ${h.snippet}`).join('\n') + '\n\nCall help_read with the topic (and section) to read it.'
      )
    },
    help_read: ({ topic, section }) => attempt(() => textResult(help.read(topic, section).markdown))
  }
}
