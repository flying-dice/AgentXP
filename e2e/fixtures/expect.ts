/**
 * Auto-retrying assertions over Playwright locators (a tiny stand-in for `@playwright/test`'s `expect`).
 * Each helper polls until it holds or WAIT_MS elapses; nothing sleeps for a fixed time.
 */
import { expect, vi } from 'vitest'
import type { Locator } from 'playwright'
import { WAIT_MS } from './launch'

const retry = <T>(fn: () => Promise<T>): Promise<T> => vi.waitFor(fn, { timeout: WAIT_MS, interval: 50 })

export const see = {
  visible: (locator: Locator): Promise<void> => locator.first().waitFor({ state: 'visible' }),
  /** Not visible or not in the DOM. */
  gone: (locator: Locator): Promise<void> => locator.first().waitFor({ state: 'hidden' }),
  count: (locator: Locator, expected: number): Promise<void> => retry(async () => expect(await locator.count()).toBe(expected)),
  text: (locator: Locator, expected: string | RegExp): Promise<void> =>
    retry(async () => {
      const text = await locator.first().innerText()
      if (typeof expected === 'string') expect(text).toContain(expected)
      else expect(text).toMatch(expected)
    }),
  attribute: (locator: Locator, name: string, expected: string | RegExp): Promise<void> =>
    retry(async () => {
      const value = await locator.first().getAttribute(name)
      if (typeof expected === 'string') expect(value).toBe(expected)
      else expect(value).toMatch(expected)
    }),
  enabled: (locator: Locator): Promise<void> => retry(async () => expect(await locator.first().isEnabled()).toBe(true)),
  /** Runs any async check until it stops throwing. */
  eventually: retry
}
