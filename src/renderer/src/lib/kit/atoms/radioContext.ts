import { getContext, setContext } from 'svelte'

export interface RadioGroupContext {
  readonly value: string
  readonly disabled: boolean
  readonly hasSelection: boolean
  select(value: string): void
  register(value: string): () => void
}

const KEY = Symbol('w7-radio-group')

export const provideRadioGroup = (ctx: RadioGroupContext): void => {
  setContext(KEY, ctx)
}

export const useRadioGroup = (): RadioGroupContext => {
  const ctx = getContext<RadioGroupContext | undefined>(KEY)
  if (!ctx) throw new Error('RadioButton must be placed inside a RadioButtonGroup')
  return ctx
}
