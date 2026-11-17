import { describe, expect, it } from 'vitest'
import { staleIds, tableIds } from './check-help-coverage.mjs'

describe('tableIds', () => {
  it('reads the backticked ids of the last column of table rows only', () => {
    const md = ['Text with `not-a-row` in it.', '| Name | What | data-testid |', '|---|---|---|', '| OK | Closes. | `uac-allow`, `uac-option-*` |'].join('\n')
    expect(tableIds(md)).toEqual(['uac-allow', 'uac-option-*'])
  })
})

describe('staleIds', () => {
  const src = [
    '<button data-testid="uac-allow">Allow</button>',
    '<p data-testid="{testid}-detail-view"></p>',
    '<ApprovalDetail testid="uac" />',
    "const id = `${prefix}-dow-${i}`; const p = 'trigger-dialog'",
    "const about = `${app}-about`; const ok = `${about}-ok`; const app = 'notepad'"
  ].join('\n')

  it('keeps ids the source writes or builds at run time', () => {
    expect(staleIds(['uac-allow', 'uac-detail-view', 'trigger-dialog-dow-3', 'notepad-about-ok', 'uac-allow*'], src)).toEqual([])
  })

  it('reports an id whose control is gone (a deleted in-chat permission box)', () => {
    expect(staleIds(['permission-hint', 'gone-detail-view'], src)).toEqual(['permission-hint', 'gone-detail-view'])
  })

  it('lets a listed run-time id through', () => {
    expect(staleIds(['wordpad-menu-select-all'], src, [{ match: /-select-all$/, reason: 'built from a key' }])).toEqual([])
  })
})
