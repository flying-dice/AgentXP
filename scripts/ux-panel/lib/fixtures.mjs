// Sample projects on disk (the facilitator creates them; the panelist only sees folder names).
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const REDIRECT_BUG = `// BUG: the "next" address is dropped, so deep links are lost after sign-in.
export function afterLogin(url: string): string {
  void url
  return '/home'
}
`
export const REDIRECT_FIXED = `// Deep links survive sign-in: go back to the address in ?next=, but only inside this site.
export function afterLogin(url: string): string {
  const next = new URL(url, 'http://app.local').searchParams.get('next')
  return next && next.startsWith('/') ? next : '/home'
}
`
export const LOGIN_ORIGINAL = `import { afterLogin } from './redirect'

export function login(user: string, password: string, url: string): string | null {
  if (!user || !password) return null
  return afterLogin(url)
}
`
export const LOGIN_EDITED = `import { afterLogin } from './redirect'

export function login(user: string, password: string, url: string): string | null {
  if (!user.trim() || !password) return null // the agent trims the user name
  return afterLogin(url)
}
`

const put = (root, files) => {
  for (const [rel, text] of Object.entries(files)) {
    const file = join(root, rel)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, text)
  }
}

/** `login-app`: the project of most tasks. `git: true` makes it a repository with one commit (needs the git binary; the fixture lives in a temp dir). */
export function createLoginApp(base, { git = false } = {}) {
  const root = join(base, 'login-app')
  put(root, {
    'src/auth/redirect.ts': REDIRECT_BUG,
    'src/auth/login.ts': LOGIN_ORIGINAL,
    'tests/redirect.test.ts': "import { afterLogin } from '../src/auth/redirect'\n\nconsole.assert(afterLogin('/login?next=/orders') === '/orders')\n",
    'README.md': '# login-app\n\nA small sign-in page. Deep links should survive sign-in.\n',
    '.gitignore': 'node_modules\ndist\n'
  })
  if (git) {
    const run = (...args) => execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], { stdio: 'ignore' })
    run('init', '-q')
    run('add', '-A')
    run('commit', '-q', '-m', 'initial')
  }
  return root
}

export function createDocsSite(base) {
  const root = join(base, 'docs-site')
  put(root, { 'README.md': '# docs-site\n', 'index.md': '# Welcome\n\nThe documentation.\n', 'docs/intro.md': '# Introduction\n\nStart here.\n' })
  return root
}

/** A folder that is not under version control. */
export function createPlainFolder(base) {
  const root = join(base, 'notes-folder')
  put(root, { 'notes.txt': 'shopping list\n', 'README.md': '# notes\n' })
  return root
}

export const TEST_PAGE_PORT = 4173
export const TEST_PAGE_URL = `http://127.0.0.1:${TEST_PAGE_PORT}/`
export const TEST_PAGE_HTML = '<!doctype html><title>Fixture page</title><body style="font:20px sans-serif;margin:40px"><h1>Example Domain</h1><p>This page is served by the test harness. Welcome to the fixture page.</p></body>'
