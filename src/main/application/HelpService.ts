import { parseTopics, searchSections, sectionsOf, slugOf, type HelpHit, type HelpTopic } from '@shared/help'
import { AppError } from './errors'

/**
 * Help and Support for agents: the same manuals and search as the Help window (`@shared/help`). The manuals come in as
 * file name -> Markdown (bundled at build time by `infrastructure/help/bundledManuals.ts`).
 */
export class HelpService {
  private readonly topics: HelpTopic[]

  constructor(files: Record<string, string>) {
    this.topics = parseTopics(files)
  }

  list(): HelpTopic[] {
    return this.topics
  }

  search(query: string, limit = 8): HelpHit[] {
    return searchSections(this.topics, query).slice(0, limit)
  }

  /** A topic, or one section of it (by heading or slug), as Markdown. */
  read(topicId: string, section?: string): { topic: HelpTopic; markdown: string } {
    const topic = this.topics.find((t) => t.id === topicId.trim().toLowerCase().replace(/\.md$/, ''))
    if (!topic) throw new AppError(`There is no manual "${topicId}". Topics: ${this.topics.map((t) => t.id).join(', ')}.`)
    if (section === undefined || section.trim() === '') return { topic, markdown: topic.body }
    const wanted = slugOf(section)
    const hit = sectionsOf(topic).find((s) => s.sectionId === wanted)
    if (!hit) throw new AppError(`"${topic.title}" has no section "${section}". Sections: ${sectionsOf(topic).map((s) => s.section).filter(Boolean).join(', ')}.`)
    return { topic, markdown: markdownOf(topic.body, hit.section) }
  }
}

/** The Markdown of the section under `heading`, up to the next heading of the same or a higher level. */
function markdownOf(body: string, heading: string): string {
  const lines = body.split(/\r?\n/)
  const start = lines.findIndex((l) => /^#{2,4}\s/.test(l) && l.replace(/^#+\s+/, '').trim() === heading)
  if (start < 0) return body
  const level = /^#+/.exec(lines[start]!)![0].length
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#+)\s/.exec(lines[i]!)
    if (m && m[1]!.length <= level) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join('\n').trim()
}
