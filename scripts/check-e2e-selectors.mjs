// Enforces the e2e selector rule (docs/CONVENTIONS.md "Test ids"): specs and page objects locate
// elements ONLY with getByTestId (optionally chained with filter({ has / hasText }), nth, first, last, and, or).
// Fails on anything that takes a CSS / XPath / text / role selector. Comments are ignored.
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const RULES = [
  [/\.locator\s*\(/, 'locator( takes a CSS/XPath selector'],
  [/\bframeLocator\s*\(/, 'frameLocator( takes a selector'],
  [/\$\$?\s*\(/, '$( / $$( take a selector'],
  [/\$\$?eval\s*\(/, '$eval / $$eval take a selector'],
  [/\bgetBy(Role|Text|Label|Placeholder|AltText|Title)\s*\(/, 'only getByTestId is allowed'],
  [/\bwaitForSelector\s*\(/, 'waitForSelector takes a selector'],
  [/\bquerySelector(All)?\s*\(/, 'querySelector is a CSS selector'],
  [/['"`]\s*(?:xpath|css|text|role|internal:[a-z-]+)\s*=/i, 'selector-engine string (xpath=, css=, text=, role=...)'],
  [/['"`]\s*(?:\/\/|\.\.\/)[^'"`]*\[@/, 'XPath string'],
  // Page-level actions take a selector string as their first argument (page.click('#x'), launcherPage.fill('input', 'v')).
  // On a locator the first argument of fill/type/press is a value, so only receivers named *page / *Page are checked.
  [
    /\b\w*[pP]age\.(?:click|dblclick|fill|type|check|uncheck|hover|press|focus|blur|tap|dispatchEvent|selectOption|setInputFiles|textContent|innerText|innerHTML|inputValue|isVisible|isHidden|isEnabled|isDisabled|isChecked)\s*\(\s*['"`]/,
    'page.<action>(selector) takes a selector string (use getByTestId(...).<action>())'
  ],
  // locator.getAttribute('data-x') reads an attribute; page.getAttribute('#sel', 'x') takes a selector.
  [/\b\w*[pP]age\.getAttribute\s*\(\s*['"`]/, 'page.getAttribute(selector, name) takes a selector']
]

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(ts|mts|js|mjs)$/.test(entry.name)) yield path
  }
}

/** Blanks comments (keeps line numbers) so prose may mention the forbidden names. */
const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (_m, lead) => lead)

const problems = []
let files = 0
try {
  for await (const file of walk(join(root, 'e2e'))) {
    files++
    const lines = stripComments(await readFile(file, 'utf8')).split('\n')
    lines.forEach((line, i) => {
      for (const [pattern, why] of RULES) {
        if (pattern.test(line)) problems.push(`${relative(root, file)}:${i + 1}: ${why}\n    ${line.trim()}`)
      }
    })
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

if (problems.length > 0) {
  console.error(`e2e selector check failed (${problems.length}): e2e files may only locate elements with getByTestId.\n`)
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`e2e selector check ok (${files} files, getByTestId only)`)
