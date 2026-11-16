import { describe, expect, it } from 'vitest'
import { describeLoadFailure, isShownFailure, pageStatus, shortAddress, stepZoom, zoomText } from './pageStatus'

describe('load failures', () => {
  it('names the cause in plain words and keeps the technical text', () => {
    expect(describeLoadFailure('http://x.invalid/', 'ERR_NAME_NOT_RESOLVED')).toEqual({ url: 'http://x.invalid/', cause: 'The name of the website was not found.', technical: 'ERR_NAME_NOT_RESOLVED' })
    expect(describeLoadFailure('http://127.0.0.1:9/', 'ERR_CONNECTION_REFUSED').cause).toBe('The website did not answer.')
  })
  it('ignores a load that was replaced or stopped, and sub frames', () => {
    expect(isShownFailure(-3, true)).toBe(false)
    expect(isShownFailure(-102, false)).toBe(false)
    expect(isShownFailure(-102, true)).toBe(true)
  })
  it('shortens the address', () => {
    expect(shortAddress('http://127.0.0.1:9/')).toBe('127.0.0.1:9')
    expect(shortAddress('https://example.com/a')).toBe('example.com/a')
  })
})

describe('pageStatus', () => {
  it('shows the real state', () => {
    expect(pageStatus({ url: 'https://a.b', loading: true, failed: false })).toBe('Connecting...')
    expect(pageStatus({ url: 'https://a.b', loading: false, failed: false })).toBe('Done')
    expect(pageStatus({ url: 'https://a.b', loading: false, failed: true })).toBe('Could not load the page')
    expect(pageStatus({ url: 'about:blank', loading: false, failed: false })).toBe('Ready')
  })
})

describe('zoom', () => {
  it('steps by ten points within limits and resets', () => {
    expect(stepZoom(1, 1)).toBe(1.1)
    expect(stepZoom(1.1, -1)).toBe(1)
    expect(stepZoom(1.7, 0)).toBe(1)
    expect(stepZoom(5, 1)).toBe(5)
    expect(stepZoom(0.25, -1)).toBe(0.25)
    expect(zoomText(1.1)).toBe('110%')
  })
})
