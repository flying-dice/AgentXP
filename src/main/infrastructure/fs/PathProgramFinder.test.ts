import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PathProgramFinder } from './PathProgramFinder'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'a7-which-'))
  await writeFile(join(dir, 'my-agent'), '#!/bin/sh\n')
  await chmod(join(dir, 'my-agent'), 0o755)
  await writeFile(join(dir, 'not-runnable'), 'x')
  await chmod(join(dir, 'not-runnable'), 0o644)
})
afterEach(async () => rm(dir, { recursive: true, force: true }))

describe('PathProgramFinder', () => {
  const finder = (): PathProgramFinder => new PathProgramFinder({ platform: 'linux', path: dir })

  it('finds a command on the PATH and by full path', async () => {
    expect(await finder().exists('my-agent')).toBe(true)
    expect(await finder().exists(join(dir, 'my-agent'))).toBe(true)
  })

  it('does not find a missing command, a file that cannot run or an empty command', async () => {
    expect(await finder().exists('nope')).toBe(false)
    expect(await finder().exists(join(dir, 'nope'))).toBe(false)
    expect(await finder().exists('not-runnable')).toBe(false)
    expect(await finder().exists('  ')).toBe(false)
  })

  it('tries the Windows extensions', async () => {
    await writeFile(join(dir, 'tool.cmd'), '@echo off')
    const win = new PathProgramFinder({ platform: 'win32', path: dir, pathExt: '.EXE;.CMD' })
    expect(await win.exists('tool')).toBe(true)
    expect(await win.exists('tool2')).toBe(false)
  })
})
