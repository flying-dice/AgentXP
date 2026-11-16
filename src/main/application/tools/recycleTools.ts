import type { RecycleService } from '../RecycleService'
import { AppError } from '../errors'
import type { ToolHandlers } from './catalog'
import { attempt, textResult } from './types'

export interface RecycleToolsDeps {
  recycle: Pick<RecycleService, 'list' | 'restore'>
}

/** recycle_list, recycle_restore. */
export function createRecycleTools({ recycle }: RecycleToolsDeps): ToolHandlers<'recycle_list' | 'recycle_restore'> {
  return {
    recycle_list: async (_args, { desktopId }) => {
      const items = recycle.list(desktopId)
      return textResult(
        items.length === 0
          ? 'The Recycle Bin is empty.'
          : items.map((i) => `#${i.id} ${i.path} (${i.revertedText === null ? 'a deletion' : 'your version'} reverted ${i.revertedAt})`).join('\n')
      )
    },

    recycle_restore: ({ id }, { desktopId }) =>
      attempt(async () => {
        const item = recycle.list(desktopId).find((i) => i.id === id)
        if (!item) throw new AppError(`Recycle Bin item ${id} does not exist. Call recycle_list.`)
        await recycle.restore(id)
        return textResult(`Restored ${item.path}.`)
      })
  }
}
