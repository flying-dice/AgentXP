/**
 * F1 on a control (UX-205): the topic Help opens for the focused window. With a control focused that the window's manual lists in a
 * Controls Reference table, the topic carries that row as its section, so Help lands on the description of the control and not at
 * the top of a long manual. Without such a control it is the topic alone, as before.
 */
import type { AppKind } from '@shared/desktop'
import { controlSection, topicForApp } from './helpModel'
import { helpTopics } from './helpTopics'

/** The test ids of the focused element and of its parents inside its window, innermost first (the Help id of the control). */
export function focusedTestids(active: Element | null = document.activeElement): string[] {
  const ids: string[] = []
  for (let el = active; el && !el.matches('[data-region="window"], [data-testid^="window-"]'); el = el.parentElement) {
    const id = el.getAttribute('data-testid')
    if (id) ids.push(id)
  }
  return ids
}

/** The topic, with `#control:<row>` when the focused control has a row in that manual. */
export function helpTopicFor(app: AppKind | null | undefined, active: Element | null = document.activeElement): string {
  const topic = topicForApp(app)
  const body = helpTopics.find((t) => t.id === topic)?.body ?? ''
  const section = controlSection(body, focusedTestids(active))
  return section ? `${topic}#${section}` : topic
}
