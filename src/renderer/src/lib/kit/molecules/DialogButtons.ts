export type DialogResult = 'none' | 'ok' | 'cancel' | 'yes' | 'no' | 'retry' | 'abort' | 'ignore'

export interface DialogButtonSpec {
  result: DialogResult
  label?: string
  disabled?: boolean
}

const LABELS: Record<DialogResult, string> = {
  none: '',
  ok: 'OK',
  cancel: 'Cancel',
  yes: 'Yes',
  no: 'No',
  retry: 'Retry',
  abort: 'Abort',
  ignore: 'Ignore'
}

export const dialogResultLabel = (result: DialogResult): string => LABELS[result]

/** WinForms MessageBoxButtons. */
export type MessageBoxButtons = 'OK' | 'OKCancel' | 'YesNo' | 'YesNoCancel' | 'RetryCancel' | 'AbortRetryIgnore'

export const MESSAGE_BOX_BUTTONS: Record<MessageBoxButtons, DialogResult[]> = {
  OK: ['ok'],
  OKCancel: ['ok', 'cancel'],
  YesNo: ['yes', 'no'],
  YesNoCancel: ['yes', 'no', 'cancel'],
  RetryCancel: ['retry', 'cancel'],
  AbortRetryIgnore: ['abort', 'retry', 'ignore']
}

/**
 * The result Esc / the close box yields, following Windows: a Cancel button wins, a lone OK
 * counts as cancel, a No button answers when there is no Cancel (YesNo disables the close box
 * in Windows, so there it returns undefined), Abort/Ignore sets return undefined too.
 */
export const cancelResultFor = (results: readonly DialogResult[]): DialogResult | undefined => {
  if (results.includes('cancel')) return 'cancel'
  if (results.length === 1 && results[0] === 'ok') return 'ok'
  return undefined
}
