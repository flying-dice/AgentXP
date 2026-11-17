// Installs the app that `npm run dist` packaged (`npm run app:install` packages and installs in one step).
//
// macOS: copies dist/mac-<arch>/AgentXP.app to ~/Applications (or --dir <folder>, or AGENTXP_INSTALL_DIR), keeps the copy it
// replaces in dist/previous-install/ so it can be put back, and checks the code signature. A running AgentXP is left alone:
// quit it first, or pass --quit to ask it to quit. Windows and Linux: says where the installer is.
//
//   npm run app:install                    package, then install to ~/Applications
//   npm run app:install -- --quit          ask a running AgentXP to quit first
//   node scripts/install-app.mjs --dir /Applications   install what dist/ already holds, elsewhere
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const APP = 'AgentXP.app'
const APP_ID = 'com.flyingdice.agentxp'
const QUIT_WAIT_MS = 15_000

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}

function fail(message) {
  console.error(`app:install: ${message}`)
  process.exit(1)
}

/** True while an AgentXP started from `app` runs. */
const runningFrom = (app) => spawnSync('pgrep', ['-f', join(app, 'Contents', 'MacOS', 'AgentXP')], { stdio: 'ignore' }).status === 0

function quit(app) {
  console.log('app:install: asking AgentXP to quit...')
  spawnSync('osascript', ['-e', `tell application id "${APP_ID}" to quit`], { stdio: 'ignore' })
  const deadline = Date.now() + QUIT_WAIT_MS
  while (runningFrom(app) && Date.now() < deadline) spawnSync('sleep', ['0.5'])
  if (runningFrom(app)) fail('AgentXP is still running. Quit it (it may be asking you something), then run the install again.')
}

function installMac() {
  const built = join(dist, process.arch === 'arm64' ? 'mac-arm64' : 'mac', APP)
  if (!existsSync(built)) fail(`${built} does not exist. Run "npm run dist" first, or use "npm run app:install", which packages first.`)
  const target = resolve(option('--dir') ?? process.env.AGENTXP_INSTALL_DIR ?? join(homedir(), 'Applications'))
  const installed = join(target, APP)
  mkdirSync(target, { recursive: true })

  if (runningFrom(installed)) {
    if (!flag('--quit')) fail(`AgentXP is running from ${installed}. Quit it first, or pass --quit to ask it to quit.`)
    quit(installed)
  }

  if (existsSync(installed)) {
    const backups = join(dist, 'previous-install')
    rmSync(join(backups, APP), { recursive: true, force: true })
    mkdirSync(backups, { recursive: true })
    renameSync(installed, join(backups, APP))
    console.log(`app:install: the app it replaces is kept in ${join(backups, APP)}`)
  }
  // ditto keeps the signature, the extended attributes and the symlinks of the bundle.
  execFileSync('ditto', [built, installed], { stdio: 'inherit' })

  const signed = spawnSync('codesign', ['--verify', '--deep', '--strict', installed], { encoding: 'utf8' })
  const info = join(installed, 'Contents', 'Resources', 'build-info.json')
  const build = existsSync(info) ? JSON.parse(readFileSync(info, 'utf8')) : null
  console.log(`app:install: installed ${installed}${build ? ` (commit ${String(build.commit).slice(0, 10)}, built ${build.builtAt})` : ''}`)
  console.log(signed.status === 0 ? 'app:install: the code signature is valid.' : `app:install: warning, the code signature does not verify:\n${signed.stderr.trim()}`)
}

function pointAtInstaller(pattern, how) {
  const found = existsSync(dist) ? readdirSync(dist).filter((name) => pattern.test(name)) : []
  if (found.length === 0) fail('no installer in dist/. Run "npm run dist" first.')
  console.log(`app:install: ${how}:\n${found.map((name) => `  ${join(dist, name)}`).join('\n')}`)
}

switch (process.platform) {
  case 'darwin':
    installMac()
    break
  case 'win32':
    pointAtInstaller(/\.exe$/i, 'run the installer (it installs AgentXP for your user)')
    break
  case 'linux':
    pointAtInstaller(/\.AppImage$/i, 'the AppImage needs no install: make it executable (chmod +x) and start it, or copy it to ~/Applications')
    break
  default:
    fail(`installing on ${process.platform} is not supported.`)
}
