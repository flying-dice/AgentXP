import { describe, expect, it } from 'vitest'
import { drop, emptyQueue, MAX_WAITING, moreText, next, push, type BalloonQueueState } from './balloonQueue'

interface B {
  text: string
  key?: string
  queued?: boolean
}
const notice = (text: string): B => ({ text, key: text, queued: true })
const shell = (text: string): B => ({ text })
const texts = (s: BalloonQueueState<B>): [string | null, string[]] => [s.current?.text ?? null, s.waiting.map((b) => b.text)]

describe('balloon queue', () => {
  it('shows the first balloon at once; notices after it wait their turn, in order', () => {
    let s = push(emptyQueue<B>(), notice('a'))
    s = push(s, notice('b'))
    s = push(s, notice('c'))
    expect(texts(s)).toEqual(['a', ['b', 'c']])
    expect(moreText(s)).toBe('2 more')
    s = next(s)
    expect(texts(s)).toEqual(['b', ['c']])
    s = next(next(s))
    expect(texts(s)).toEqual([null, []])
    expect(moreText(s)).toBeNull()
  })

  it('a shell balloon shows at once; the notice it covers is first in line again', () => {
    let s = push(push(emptyQueue<B>(), notice('a')), notice('b'))
    s = push(s, shell('Project removed'))
    expect(texts(s)).toEqual(['Project removed', ['a', 'b']])
    expect(texts(next(s))).toEqual(['a', ['b']])
  })

  it('a shell balloon replaces another shell balloon (that one is done)', () => {
    const s = push(push(emptyQueue<B>(), shell('one')), shell('two'))
    expect(texts(s)).toEqual(['two', []])
  })

  it('the same notice twice shows once', () => {
    const s = push(push(push(emptyQueue<B>(), notice('a')), notice('b')), notice('a'))
    expect(texts(s)).toEqual(['a', ['b']])
  })

  it('drops what matches: the one on screen makes way for the next', () => {
    let s = push(push(push(emptyQueue<B>(), shell('hint')), notice('a')), notice('b'))
    s = push(s, notice('c'))
    s = drop(s, (b) => b.text === 'hint')
    expect(texts(s)).toEqual(['a', ['b', 'c']])
    s = drop(s, (b) => b.text === 'c')
    expect(texts(s)).toEqual(['a', ['b']])
  })

  it('keeps at most MAX_WAITING waiting (the newest)', () => {
    let s = push(emptyQueue<B>(), notice('first'))
    for (let i = 0; i < MAX_WAITING + 5; i++) s = push(s, notice(`n${i}`))
    expect(s.waiting).toHaveLength(MAX_WAITING)
    expect(s.waiting.at(-1)?.text).toBe(`n${MAX_WAITING + 4}`)
  })
})
