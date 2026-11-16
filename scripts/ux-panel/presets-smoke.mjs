#!/usr/bin/env node
// Facilitator self-test: starts every task's start state, runs its checker (an untouched start state is expected to
// FAIL or need MANUAL review for most tasks), stops. Usage: node scripts/ux-panel/presets-smoke.mjs [taskId ...]
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TASKS } from './tasks.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TASKS)
const base = mkdtempSync(join(tmpdir(), 'ux-smoke-'))
let broken = 0
for (const id of ids) {
  const out = join(base, id)
  const run = (...args) => spawnSync(process.execPath, [join(here, 'session.mjs'), ...args, '--out', out], { encoding: 'utf8' })
  const started = run('start', '--task', id, '--level', 'sonnet')
  if (started.status !== 0) {
    broken++
    console.log(`${id}\tSTART FAILED\t${started.stderr.trim().split('\n')[0]}`)
    run('stop', '--no-check')
    continue
  }
  const checked = run('check')
  const info = JSON.parse(readFileSync(join(out, 'session.json'), 'utf8'))
  console.log(`${id}\t${info.preset}\t${checked.stdout.split('\n')[0]}`)
  run('stop', '--no-check')
}
console.log(broken ? `${broken} start state(s) failed` : 'all start states came up')
process.exitCode = broken ? 1 : 0
