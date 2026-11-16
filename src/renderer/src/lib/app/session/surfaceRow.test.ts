import { describe, expect, it } from 'vitest'
import { A2UI_CATALOG_ID, type A2uiServerMessage } from '@shared/a2ui'
import { surfaceCaption, surfaceDisplayTitle, surfacePurpose, surfaceRowModel } from './surfaceRow'

const messages = (title?: string): A2uiServerMessage[] => [
  { version: 'v0.9', createSurface: { surfaceId: 's', catalogId: A2UI_CATALOG_ID, ...(title ? { theme: { title } } : {}) } }
]
const surface = (target: 'inline' | 'sidebar' | 'window', hidden = false, title?: string) => ({ surfaceId: 's', target, hidden, messages: messages(title) })

describe('surfaceRowModel', () => {
  it('takes the title from the theme and falls back to "Agent window"', () => {
    expect(surfaceCaption(messages('Contact'))).toBe('Contact')
    expect(surfaceDisplayTitle(messages())).toBe('Agent window')
    expect(surfaceRowModel(surface('window', false, 'Dash'), true).title).toBe('Dash')
  })

  it('a window is Open while its window exists and Closed otherwise; Open stays available to focus it', () => {
    const open = surfaceRowModel(surface('window'), true)
    expect(open).toMatchObject({ state: 'open', stateLabel: 'Open', canOpen: true, canClose: true, hasOpenClose: true })
    const closed = surfaceRowModel(surface('window'), false)
    expect(closed).toMatchObject({ state: 'closed', stateLabel: 'Closed', canOpen: true, canClose: false })
  })

  it('a sidebar surface is Closed when its tab is hidden', () => {
    expect(surfaceRowModel(surface('sidebar', false), false)).toMatchObject({ state: 'open', canOpen: true, openLabel: 'Show', canClose: true })
    expect(surfaceRowModel(surface('sidebar', true), false)).toMatchObject({ state: 'closed', canOpen: true, openLabel: 'Open', stateText: expect.stringMatching(/: Closed$/), canClose: false })
  })

  it('an inline surface is always open and has no Open/Close', () => {
    expect(surfaceRowModel(surface('inline'), false)).toMatchObject({ state: 'open', hasOpenClose: false })
  })

  it('offers every other place to move to', () => {
    expect(surfaceRowModel(surface('inline'), false).moveTargets).toEqual(['sidebar', 'window'])
    expect(surfaceRowModel(surface('window'), true).moveTargets).toEqual(['inline', 'sidebar'])
  })
})

describe('what a surface says about itself', () => {
  const withComponents = (title: string, components: string[]): A2uiServerMessage[] => [
    ...messages(title),
    { version: 'v0.9', updateComponents: { surfaceId: 's', components: components.map((component, i) => ({ id: `c${i}`, component })) } }
  ]
  const form = (target: 'inline' | 'sidebar' | 'window', hidden = false) => ({ surfaceId: 's', target, hidden, messages: withComponents('Your name', ['Label', 'TextBox', 'Button']) })

  it('is a form when it takes input, else a panel', () => {
    expect(surfacePurpose(withComponents('x', ['Label', 'TextBox']))).toBe('form')
    expect(surfacePurpose(withComponents('x', ['Label', 'DataGridView']))).toBe('panel')
    expect(surfacePurpose(messages('x'))).toBe('panel')
  })

  it('names the surface by purpose and says where it is', () => {
    expect(surfaceRowModel(form('window'), true)).toMatchObject({
      intro: 'The assistant opened a form: Your name.',
      where: "It is in the window 'Your name - from the assistant'."
    })
    expect(surfaceRowModel(form('sidebar'), false).where).toBe("It is in the sidebar 'Your name'.")
    expect(surfaceRowModel(form('window'), false).where).toBe("It is closed. It was in the window 'Your name - from the assistant'.")
  })

  it('needs no line for an inline surface', () => {
    expect(surfaceRowModel(form('inline'), false).where).toBe('')
  })
})
