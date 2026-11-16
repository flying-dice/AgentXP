import { describe, expect, it } from 'vitest'
import { agentBarText, assistantStatus, describeLoadFailure, failureHint, isShownFailure, pageStatus, shortAddress, stepZoom, zoomText } from './pageStatus'

describe('load failures', () => {
  it('names the cause in plain words and keeps the technical text', () => {
    expect(describeLoadFailure('http://x.invalid/', 'ERR_NAME_NOT_RESOLVED')).toEqual({ url: 'http://x.invalid/', cause: 'The name of the website was not found.', technical: 'ERR_NAME_NOT_RESOLVED' })
    expect(describeLoadFailure('http://127.0.0.1:9/', 'ERR_CONNECTION_REFUSED').cause).toBe('Nothing answered at this address.')
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

describe('failureHint', () => {
  const hint = (url: string, technical: string): string => failureHint(describeLoadFailure(url, technical))
  it('names the blocked port and does not blame the network', () => {
    const failure = describeLoadFailure('http://127.0.0.1:9/', 'ERR_UNSAFE_PORT')
    expect(failure.cause).toBe('The address uses a port that the Browser blocks (the number after the colon).')
    const text = failureHint(failure)
    expect(text).toContain('(here :9)')
    expect(text).not.toContain('online')
    expect(`${failure.cause} ${text}`).not.toMatch(/ERR_|ENOENT/)
  })
  it('tells what to do for a refused connection, an unknown name and a missing network', () => {
    expect(hint('http://localhost:3000/', 'ERR_CONNECTION_REFUSED')).toContain('Nothing is listening at this address')
    expect(hint('http://x.invalid/', 'ERR_NAME_NOT_RESOLVED')).toContain('Check the spelling')
    expect(hint('http://a.b/', 'ERR_INTERNET_DISCONNECTED')).toBe('Check that your computer is online, then click Refresh.')
    expect(hint('http://a.b/', 'ERR_CONNECTION_TIMED_OUT')).toBe('Check that your computer is online, then click Refresh.')
  })
  it('falls back for an unknown error', () => {
    expect(hint('http://a.b/', 'ERR_SOMETHING')).toBe('Make sure the address is right, then click Refresh.')
  })
})

describe('assistantStatus', () => {
  it('says whether the agent can read the page', () => {
    expect(assistantStatus('allow', false)).toBe('Agent: can read this page')
    expect(assistantStatus('ask', false)).toBe('Agent: asks first')
    expect(assistantStatus('deny', false)).toBe('Agent: cannot read pages')
    expect(assistantStatus('allow', true)).toBe('Agent: reading')
    expect(assistantStatus('deny', true)).toBe('Agent: cannot read pages')
  })
  it('says that the agent read the page once it did', () => {
    expect(assistantStatus('allow', false, true)).toBe('The agent read this page')
    expect(assistantStatus('ask', false, true)).toBe('The agent read this page')
    expect(assistantStatus('allow', true, true)).toBe('Agent: reading')
    expect(assistantStatus('deny', false, true)).toBe('Agent: cannot read pages')
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

describe('agentBarText (UX-128)', () => {
  it('says what the agent does, that it read the page, or that the user has control', () => {
    expect(agentBarText({ userInControl: false, readDone: false, activity: 'Reading the page' })).toBe('Agent is using this page: Reading the page')
    expect(agentBarText({ userInControl: false, readDone: true, activity: 'Reading the page' })).toBe('The agent read this page.')
    expect(agentBarText({ userInControl: true, readDone: true, activity: null })).toContain('You have control of this page')
  })
})
