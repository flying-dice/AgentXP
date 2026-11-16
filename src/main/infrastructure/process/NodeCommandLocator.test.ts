import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NodeCommandLocator } from './NodeCommandLocator'

const dir = mkdtempSync(join(tmpdir(), 'agent7-locator-'))
const tool = join(dir, 'my-tool')
writeFileSync(tool, '#!/bin/sh\n')
chmodSync(tool, 0o755)
const plain = join(dir, 'plain.txt')
writeFileSync(plain, 'x')
chmodSync(plain, 0o644)

describe('NodeCommandLocator', () => {
  const locator = new NodeCommandLocator({ env: { PATH: dir }, platform: 'linux' })

  it('finds a bare name on PATH', async () => {
    expect(await locator.exists('my-tool')).toBe(true)
    expect(await locator.exists('  my-tool ')).toBe(true)
  })

  it('does not find a missing name, a file that cannot run or an empty command', async () => {
    expect(await locator.exists('nope')).toBe(false)
    expect(await locator.exists('plain.txt')).toBe(false)
    expect(await locator.exists('')).toBe(false)
  })

  it('checks a path as it is', async () => {
    expect(await locator.exists(tool)).toBe(true)
    expect(await locator.exists(join(dir, 'missing'))).toBe(false)
  })

  it('adds the Windows extensions', async () => {
    writeFileSync(join(dir, 'win-tool.CMD'), '@echo off')
    const windows = new NodeCommandLocator({ env: { Path: dir, PATHEXT: '.EXE;.CMD' }, platform: 'win32' })
    expect(await windows.exists('win-tool')).toBe(true)
    expect(await windows.exists('other')).toBe(false)
  })
})
