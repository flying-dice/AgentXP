// The sample project `claude-code-win` that the documentation screenshots plug in as drive E:.
export const files = {
  'README.md': '# claude-code-win\n\nA small web app with a sign-in page.\n\n## Scripts\n\n- `npm run dev` starts the server.\n- `npm test` runs the tests.\n',
  'package.json': JSON.stringify({ name: 'claude-code-win', version: '1.4.0', private: true, scripts: { dev: 'node src/index.ts', test: 'node --test tests' } }, null, 2) + '\n',
  '.gitignore': 'node_modules\ndist\n',
  'src/index.ts': "import { startServer } from './server'\n\nstartServer({ port: 3000 })\n",
  'src/server.ts': "export function startServer(options: { port: number }): void {\n  console.log(`Listening on port ${options.port}`)\n}\n",
  'src/auth/login.ts': "import { redirectAfterLogin } from './redirect'\n\nexport function onLogin(user: string, next: string | null): string {\n  console.log(`Signed in as ${user}`)\n  return redirectAfterLogin(next)\n}\n",
  'src/auth/session.ts': "export interface Session {\n  user: string\n  expires: number\n}\n\nexport const isExpired = (session: Session): boolean => session.expires < Date.now()\n",
  'src/auth/redirect.ts': OLD_REDIRECT(),
  'tests/redirect.test.ts': "import { test } from 'node:test'\nimport assert from 'node:assert'\nimport { redirectAfterLogin } from '../src/auth/redirect'\n\ntest('sends a new user to the home page', () => {\n  assert.equal(redirectAfterLogin(null), '/home')\n})\n"
}

export function OLD_REDIRECT() {
  return "const HOME = '/home'\n\n// Returns the address to open after sign-in.\nexport function redirectAfterLogin(next: string | null): string {\n  // BUG: the saved address is dropped, so deep links end on the home page.\n  return HOME\n}\n"
}

export const NEW_REDIRECT =
  "const HOME = '/home'\n\n// Returns the address to open after sign-in.\nexport function redirectAfterLogin(next: string | null): string {\n  // Keep the saved address, but only when it stays on this site.\n  if (next && next.startsWith('/') && !next.startsWith('//')) return next\n  return HOME\n}\n"
