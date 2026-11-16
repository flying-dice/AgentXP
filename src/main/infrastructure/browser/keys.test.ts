import { describe, expect, it } from 'vitest'
import { keyEvents, parseChord, parseKeys } from './keys'

describe('parseChord', () => {
  it('parses named keys', () => {
    expect(parseChord('Enter')).toMatchObject({ key: 'Enter', code: 'Enter', keyCode: 13, modifiers: 0, text: '\r' })
    expect(parseChord('escape')).toMatchObject({ key: 'Escape', keyCode: 27 })
    expect(parseChord('ArrowDown')).toMatchObject({ key: 'ArrowDown', keyCode: 40 })
    expect(parseChord('F5')).toMatchObject({ key: 'F5', keyCode: 116 })
  })

  it('parses modifiers and drops the typed text for shortcuts', () => {
    expect(parseChord('Control+K')).toMatchObject({ key: 'k', code: 'KeyK', keyCode: 75, modifiers: 2 })
    expect(parseChord('Control+K').text).toBeUndefined()
    expect(parseChord('Ctrl+Shift+k')).toMatchObject({ modifiers: 10, key: 'K' })
    expect(parseChord('Shift+Enter')).toMatchObject({ modifiers: 8, text: '\r' })
    expect(parseChord('Meta+Alt+Delete').modifiers).toBe(5)
  })

  it('types printable keys and handles the plus key', () => {
    expect(parseChord('a')).toMatchObject({ key: 'a', text: 'a' })
    expect(parseChord('7')).toMatchObject({ code: 'Digit7', text: '7' })
    expect(parseChord('Control++')).toMatchObject({ key: '+', modifiers: 2 })
  })

  it('names bad input', () => {
    expect(() => parseChord('Hyper+K')).toThrow(/Unknown modifier "Hyper"/)
    expect(() => parseChord('Banana')).toThrow(/Unknown key "Banana"/)
    expect(() => parseChord('  ')).toThrow(/Empty/)
  })
})

describe('parseKeys', () => {
  it('splits a sequence at spaces', () => {
    expect(parseKeys('ArrowDown ArrowDown  Enter').map((c) => c.key)).toEqual(['ArrowDown', 'ArrowDown', 'Enter'])
    expect(() => parseKeys('   ')).toThrow(/No keys/)
  })
})

describe('keyEvents', () => {
  it('presses and releases; Enter types a carriage return', () => {
    const events = keyEvents(parseChord('Enter'))
    expect(events.map((e) => e.type)).toEqual(['keyDown', 'keyUp'])
    expect(events[0]).toMatchObject({ text: '\r', windowsVirtualKeyCode: 13, modifiers: 0 })
  })

  it('uses rawKeyDown without text and adds editing commands to Control+A', () => {
    const [down] = keyEvents(parseChord('Control+A'))
    expect(down.type).toBe('rawKeyDown')
    expect(down.commands).toEqual(['selectAll'])
    expect(keyEvents(parseChord('Escape'))[0].commands).toBeUndefined()
    expect(keyEvents(parseChord('Control+Shift+Z'))[0].commands).toEqual(['redo'])
  })
})
