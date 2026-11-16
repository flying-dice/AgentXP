/** Sample data shared by organism stories. */

export const sampleTs = `import { sanitizeReturnUrl } from './urls'

/** Handles the sign-in POST and redirects back to where the user came from. */
export async function handleSignIn(req: Request, res: Response): Promise<User> {
  const user = await authenticate(req.body)
  const returnUrl = sanitizeReturnUrl(req.query.returnUrl)
  // Only same-origin paths are allowed, to avoid open redirects.
  const target = returnUrl ?? '/home'
  if (!user.verified) {
    throw new Error(\`Account \${user.name} is not verified\`)
  }
  res.redirect(target)
  return user
}
`

export const sampleOld = `import { authenticate } from './auth'

export async function handleSignIn(req, res) {
  const user = await authenticate(req.body);
  res.redirect('/home');
  return user;
}

export function signOut(res) {
  res.clearCookie('session');
  res.redirect('/login');
}
`

export const sampleNew = `import { authenticate } from './auth'
import { sanitizeReturnUrl } from './urls'

export async function handleSignIn(req, res) {
  const user = await authenticate(req.body);
  const returnUrl = sanitizeReturnUrl(req.query.returnUrl);
  // Only same-origin paths are allowed, to avoid open redirects.
  const target = returnUrl ?? '/home';
  res.redirect(target);
  return user;
}

export function signOut(res) {
  res.clearCookie('session');
  res.redirect('/login');
}
`

export const sampleUnified = `diff --git a/src/auth/redirect.ts b/src/auth/redirect.ts
index 3f2a1b0..9c4d7e2 100644
--- a/src/auth/redirect.ts
+++ b/src/auth/redirect.ts
@@ -18,7 +18,10 @@ export async function handleSignIn(req, res) {
   const user = await authenticate(req.body);
-  res.redirect('/home');
+  const returnUrl = sanitizeReturnUrl(req.query.returnUrl);
+  // Only same-origin paths are allowed, to avoid open redirects.
+  const target = returnUrl ?? '/home';
+  res.redirect(target);
   return user;
 }
diff --git a/src/auth/urls.ts b/src/auth/urls.ts
new file mode 100644
--- /dev/null
+++ b/src/auth/urls.ts
@@ -0,0 +3 @@
+export const sanitizeReturnUrl = (url: unknown): string | undefined =>
+  typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : undefined
+`

const ESC = '\u001b'
export const sampleAnsi = [
  `${ESC}[1m$ npm test -- parser${ESC}[0m`,
  '',
  `${ESC}[1;32m PASS ${ESC}[0m tests/parser.test.ts`,
  '  parseConfig',
  `    ${ESC}[32m✓${ESC}[0m handles empty input ${ESC}[90m(2 ms)${ESC}[0m`,
  `    ${ESC}[32m✓${ESC}[0m handles trailing commas ${ESC}[90m(1 ms)${ESC}[0m`,
  `    ${ESC}[31m✗ nested arrays${ESC}[0m`,
  '',
  `${ESC}[1;31m FAIL ${ESC}[0m tests/loader.test.ts`,
  `  ${ESC}[1m●${ESC}[0m loader › reads async`,
  `    ${ESC}[32m+ expected${ESC}[0m ${ESC}[31m- received${ESC}[0m`,
  `    ${ESC}[33mwarning:${ESC}[0m slow test ${ESC}[4m(1.8 s)${ESC}[0m`,
  '',
  `Tests:  ${ESC}[1;31m1 failed${ESC}[0m, ${ESC}[1;32m5 passed${ESC}[0m, 6 total`,
  `Time:   ${ESC}[36m1.8 s${ESC}[0m`
].join('\n')

export const sampleMarkdown = `# Fix login redirect

Claude changed **two files** so deep links survive sign-in. See the [issue](https://example.com/issue/42) for context.

## Changes

1. \`src/auth/redirect.ts\` validates \`returnUrl\`
2. \`src/auth/urls.ts\` adds \`sanitizeReturnUrl\`

- Same-origin paths only
- Falls back to \`/home\`

> Open redirects are a common vulnerability.

\`\`\`ts
export const sanitizeReturnUrl = (url: unknown): string | undefined =>
  typeof url === 'string' && url.startsWith('/') ? url : undefined
\`\`\`

| File | Change | Lines |
| --- | --- | --- |
| redirect.ts | modified | +4 -1 |
| urls.ts | added | +2 |

---

### Next steps

Run the tests with \`npm test\` and review the diff.
`
