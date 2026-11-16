// Writes resources/build-info.json ({ commit, version, builtAt }) before the packaged app is built, so that the UX panel can read which
// commit a packaged app came from (H-100). electron-builder copies the file to the `resources` folder beside the executable.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readCommit } from './ux-panel/lib/build.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const commit = process.env.UX_BUILD_COMMIT ?? readCommit(root)
if (!commit) throw new Error('cannot tell the commit: set UX_BUILD_COMMIT or build inside the repository')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version ?? null
mkdirSync(join(root, 'resources'), { recursive: true })
writeFileSync(join(root, 'resources', 'build-info.json'), `${JSON.stringify({ commit, version, builtAt: new Date().toISOString() }, null, 2)}\n`)
console.log(`resources/build-info.json: commit ${commit.slice(0, 10)}, version ${version}`)
