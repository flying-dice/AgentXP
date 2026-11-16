import { describe, expect, it } from 'vitest'
import { hostOf, isSecure, normalizeAddress } from './address'

describe('normalizeAddress', () => {
  it('keeps full URLs and schemes', () => {
    expect(normalizeAddress('https://example.com/a')).toBe('https://example.com/a')
    expect(normalizeAddress('about:blank')).toBe('about:blank')
    expect(normalizeAddress('file:///C:/a.html')).toBe('file:///C:/a.html')
  })

  it('adds a scheme to hosts', () => {
    expect(normalizeAddress('example.com')).toBe('https://example.com')
    expect(normalizeAddress('docs.example.org/page?q=1')).toBe('https://docs.example.org/page?q=1')
    expect(normalizeAddress('localhost:5173')).toBe('http://localhost:5173')
    expect(normalizeAddress('127.0.0.1:8080/x')).toBe('http://127.0.0.1:8080/x')
  })

  it('searches for anything else', () => {
    expect(normalizeAddress('svelte 5 runes')).toBe('https://duckduckgo.com/?q=svelte%205%20runes')
    expect(normalizeAddress('hello')).toBe('https://duckduckgo.com/?q=hello')
    expect(normalizeAddress('  ')).toBe('about:blank')
  })

  it('reads hosts and security', () => {
    expect(hostOf('https://example.com/a')).toBe('example.com')
    expect(hostOf('about:blank')).toBe('about:blank')
    expect(isSecure('https://x.dev')).toBe(true)
    expect(isSecure('http://x.dev')).toBe(false)
  })
})
