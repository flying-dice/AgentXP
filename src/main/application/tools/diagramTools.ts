import type { Id } from '@shared/models'
import { AppError } from '../errors'
import type { VirtualFileSystem } from '../vfs/VirtualFileSystem'
import type { ToolHandlers } from './catalog'
import { parseImageDataUrl } from './dataUrl'
import type { AgentFileWriter, AppRequests, DesktopOps } from './ports'
import type { ToolPaths } from './ToolPaths'
import { attempt, imageResult, textResult } from './types'
import { pickWindow } from './windows'

export interface DiagramToolsDeps {
  desktops: Pick<DesktopOps, 'state'>
  vfs: Pick<VirtualFileSystem, 'readFile'>
  paths: ToolPaths
  requests: AppRequests
  files: AgentFileWriter
}

type DiagramToolName =
  | 'diagram_new'
  | 'diagram_stencils'
  | 'diagram_add'
  | 'diagram_update'
  | 'diagram_delete'
  | 'diagram_layout'
  | 'diagram_arrange'
  | 'diagram_pages'
  | 'diagram_select'
  | 'diagram_read'
  | 'diagram_export'
  | 'diagram_save'
  | 'diagram_open'

/** The extension of a saved diagram. */
export const DIAGRAM_FILE_EXTENSION = '.xpdiagram'

const text = (value: unknown, what: string): string => {
  if (typeof value !== 'string') throw new AppError(`Agent Diagrams did not return ${what}.`)
  return value
}

/**
 * diagram_*: the Agent Diagrams window owns the document, so every call is an app request it answers (the window
 * applies the change as one undo step and flashes what changed). Files go through the agent's file writer, so a
 * save or an export is one of the agent's recorded changes.
 */
export function createDiagramTools({ desktops, vfs, paths, requests, files }: DiagramToolsDeps): ToolHandlers<DiagramToolName> {
  const ask = (desktopId: Id, windowId: number | undefined, method: string, params: unknown): Promise<unknown> => {
    const window = pickWindow(desktops.state(desktopId), 'diagrams', windowId)
    return requests.request(desktopId, window.id, method, params)
  }
  /** A model method: the window answers with the text for the agent. */
  const model = (method: string) => (args: { windowId?: number } & Record<string, unknown>, context: { desktopId: Id }) =>
    attempt(async () => {
      const { windowId, ...params } = args
      return textResult(text(await ask(context.desktopId, windowId, method, params), 'an answer'))
    })

  return {
    diagram_new: model('new'),
    diagram_stencils: model('stencils'),
    diagram_add: model('add'),
    diagram_update: model('update'),
    diagram_delete: model('delete'),
    diagram_layout: model('layout'),
    diagram_arrange: model('arrange'),
    diagram_pages: model('pages'),
    diagram_select: model('select'),
    diagram_read: model('read'),

    diagram_export: ({ format, path, page, area, windowId }, context) =>
      attempt(async () => {
        if (format === 'png') {
          if (path) throw new AppError('A png export comes back to you as a picture; leave out path, or export svg to write a file.')
          const { data, mimeType } = parseImageDataUrl(await ask(context.desktopId, windowId, 'export-png', { page, area }))
          return imageResult(data, mimeType, 'The diagram page as a picture.')
        }
        const body = text(await ask(context.desktopId, windowId, format === 'svg' ? 'export-svg' : 'read', format === 'svg' ? { page, area } : { page, format: 'json', allPages: true }), format)
        if (!path) return textResult(body)
        const file = paths.resolve(context, path)
        await files.write(context.sessionId, file, body)
        return textResult(`Wrote ${file} (${body.length} characters).`)
      }),

    diagram_save: ({ path, windowId }, context) =>
      attempt(async () => {
        const doc = (await ask(context.desktopId, windowId, 'serialize', {})) as { json?: unknown; path?: unknown; title?: unknown } | null
        const json = text(doc?.json, 'the diagram')
        const target = path ?? (typeof doc?.path === 'string' ? doc.path : null)
        if (!target) throw new AppError(`The diagram has not been saved yet: give a path such as C:\\Users\\Agent\\Documents\\${typeof doc?.title === 'string' && doc.title ? doc.title : 'Drawing1'}${DIAGRAM_FILE_EXTENSION}.`)
        let file = paths.resolve(context, target)
        if (!file.toLowerCase().endsWith(DIAGRAM_FILE_EXTENSION)) file += DIAGRAM_FILE_EXTENSION
        await files.write(context.sessionId, file, json)
        await ask(context.desktopId, windowId, 'saved', { path: file })
        return textResult(`Saved the diagram as ${file}.`)
      }),

    diagram_open: ({ path, windowId }, context) =>
      attempt(async () => {
        const file = paths.resolve(context, path)
        const body = await vfs.readFile(context.desktopId, file)
        return textResult(text(await ask(context.desktopId, windowId, 'load', { path: file, text: body }), 'an answer'))
      })
  }
}
