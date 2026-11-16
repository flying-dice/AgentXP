import { afterEach, describe, expect, it, vi } from 'vitest'
import { BoundedOutput } from './boundedOutput'
import { TerminalManager, type TerminalChange } from './TerminalManager'

const node = process.execPath
let manager: TerminalManager

afterEach(async () => {
  await manager?.releaseAll()
})

describe('TerminalManager', () => {
  it('runs a command, captures output and exit status, and streams changes', async () => {
    const changes: TerminalChange[] = []
    manager = new TerminalManager((c) => changes.push(c))
    const id = manager.create('s1', { command: node, args: ['-e', "console.log('hello'); console.error('oops')"] })
    const status = await manager.waitForExit(id)
    expect(status).toEqual({ exitCode: 0, signal: null })
    const snap = manager.output(id)
    expect(snap.output).toContain('hello')
    expect(snap.output).toContain('oops')
    expect(snap.truncated).toBe(false)
    expect(snap.exitStatus).toEqual({ exitCode: 0, signal: null })
    expect(changes.length).toBeGreaterThan(0)
    expect(changes.at(-1)).toMatchObject({ sessionKey: 's1', terminalId: id, exitStatus: { exitCode: 0 } })
  })

  it('reports non-zero exit codes', async () => {
    manager = new TerminalManager()
    const id = manager.create('s', { command: node, args: ['-e', 'process.exit(3)'] })
    expect((await manager.waitForExit(id)).exitCode).toBe(3)
  })

  it('reports a missing command as a failed exit', async () => {
    manager = new TerminalManager()
    const id = manager.create('s', { command: 'definitely-not-a-command-xyz' })
    const status = await manager.waitForExit(id)
    expect(status.exitCode).toBe(127)
    expect(manager.output(id).output).toContain('ENOENT')
  })

  it('truncates from the start to the byte limit', async () => {
    manager = new TerminalManager()
    const id = manager.create('s', {
      command: node,
      args: ['-e', "process.stdout.write('0123456789'.repeat(10))"],
      outputByteLimit: 25
    })
    await manager.waitForExit(id)
    const snap = manager.output(id)
    expect(snap.truncated).toBe(true)
    expect(snap.output).toHaveLength(25)
    expect(snap.output.endsWith('0123456789')).toBe(true)
  })

  it('kills a running command and passes env/cwd', async () => {
    manager = new TerminalManager()
    const sleeper = manager.create('s', { command: node, args: ['-e', 'setInterval(()=>{},1000)'] })
    await manager.kill(sleeper)
    const status = await manager.waitForExit(sleeper)
    expect(status.signal).toBe('SIGTERM')
    const env = manager.create('s', { command: node, args: ['-e', 'console.log(process.env.AXP_X + process.cwd())'], env: { AXP_X: 'v' }, cwd: '/tmp' })
    await manager.waitForExit(env)
    expect(manager.output(env).output.trim()).toMatch(/^v\/tmp$|^v\/private\/tmp$/)
  })

  it('rejects unknown terminals and forgets released ones', async () => {
    manager = new TerminalManager()
    const id = manager.create('s', { command: node, args: ['-e', '0'] })
    await manager.waitForExit(id)
    await manager.release(id)
    expect(() => manager.output(id)).toThrow(/Unknown terminal/)
    vi.restoreAllMocks()
  })
})

describe('BoundedOutput', () => {
  it('cuts at a character boundary', () => {
    const out = new BoundedOutput(5)
    out.append(Buffer.from('ab€€')) // 2 + 3 + 3 bytes
    expect(out.value).toBe('€')
    expect(out.truncated).toBe(true)
  })

  it('handles characters split across chunks', () => {
    const out = new BoundedOutput(100)
    const euro = Buffer.from('€')
    out.append(euro.subarray(0, 1))
    out.append(euro.subarray(1))
    expect(out.value).toBe('€')
    expect(out.truncated).toBe(false)
  })
})
