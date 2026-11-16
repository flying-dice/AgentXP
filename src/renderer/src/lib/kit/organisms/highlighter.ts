/**
 * Lazy shiki loader with a Visual Studio 2010 flavoured theme. Shiki and each grammar are
 * imported dynamically on first use and cached, so pages that never show code do not pay.
 */
import type { HighlighterCore, ThemeRegistrationRaw } from 'shiki'

export interface CodeToken {
  content: string
  color?: string
  bold?: boolean
  italic?: boolean
}

export const VS2010_THEME_NAME = 'vs2010'

type ThemeRule = NonNullable<ThemeRegistrationRaw['settings']>[number]

const rule = (scope: string[], foreground: string, fontStyle?: string): ThemeRule => ({
  scope,
  settings: { foreground, ...(fontStyle ? { fontStyle } : {}) }
})

export const VS2010_THEME: ThemeRegistrationRaw = {
  name: VS2010_THEME_NAME,
  type: 'light',
  fg: '#000000',
  bg: '#ffffff',
  settings: [
    rule(['comment', 'punctuation.definition.comment'], '#008000'),
    rule(['string', 'string.quoted', 'punctuation.definition.string', 'string.regexp.js'], '#a31515'),
    rule(['constant.character.escape', 'string.regexp'], '#811f3f'),
    rule(
      ['keyword', 'keyword.control', 'keyword.operator.new', 'keyword.operator.expression', 'keyword.operator.logical.python', 'storage', 'storage.type', 'storage.modifier', 'constant.language', 'variable.language.this', 'variable.language.super'],
      '#0000ff'
    ),
    rule(['keyword.operator', 'punctuation'], '#000000'),
    rule(['constant.numeric', 'constant.numeric.decimal'], '#000000'),
    rule(
      ['entity.name.type', 'entity.name.class', 'entity.other.inherited-class', 'support.class', 'support.type', 'entity.name.namespace', 'entity.name.type.class', 'meta.return.type', 'storage.type.cs'],
      '#2b91af'
    ),
    rule(['entity.name.function', 'support.function', 'meta.function-call'], '#000000'),
    rule(['entity.name.tag', 'punctuation.definition.tag'], '#a31515'),
    rule(['entity.other.attribute-name'], '#ff0000'),
    rule(['support.type.property-name', 'meta.object-literal.key'], '#a31515'),
    rule(['support.type.property-name.css', 'support.type.vendored.property-name'], '#ff0000'),
    rule(['support.constant.property-value.css', 'meta.property-value.css'], '#0000ff'),
    rule(['entity.name.selector', 'entity.other.attribute-name.class.css', 'entity.other.attribute-name.id.css'], '#800000'),
    rule(['markup.heading', 'entity.name.section'], '#0000ff', 'bold'),
    rule(['markup.inserted'], '#008000'),
    rule(['markup.deleted'], '#a31515'),
    rule(['markup.bold'], '#000000', 'bold'),
    rule(['markup.italic'], '#000000', 'italic'),
    rule(['meta.preprocessor', 'keyword.control.directive', 'punctuation.definition.directive'], '#808080'),
    rule(['invalid'], '#ff0000')
  ]
}

/** Common file extensions to shiki language ids. */
const EXTENSIONS: Record<string, string> = {
  ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript', json: 'json',
  svelte: 'svelte', vue: 'vue', html: 'html', htm: 'html', css: 'css', scss: 'scss', md: 'markdown', py: 'python',
  rs: 'rust', go: 'go', java: 'java', cs: 'csharp', cpp: 'cpp', cc: 'cpp', c: 'c', h: 'c', sh: 'bash', bash: 'bash',
  ps1: 'powershell', yml: 'yaml', yaml: 'yaml', toml: 'toml', sql: 'sql', xml: 'xml', diff: 'diff', patch: 'diff'
}

export const languageFromPath = (path: string): string => {
  const ext = path.split(/[\\/]/).pop()?.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSIONS[ext] ?? 'text'
}

const PLAIN = new Set(['', 'text', 'txt', 'plain', 'plaintext', 'none'])

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const plainTokens = (code: string): CodeToken[][] => code.split(/\r\n|\n/).map((line) => [{ content: line }])

export const tokensToHtml = (lines: readonly (readonly CodeToken[])[]): string =>
  lines
    .map((line) =>
      line
        .map((t) => {
          const style = [t.color ? `color:${t.color}` : '', t.bold ? 'font-weight:bold' : '', t.italic ? 'font-style:italic' : '']
            .filter(Boolean)
            .join(';')
          const text = escapeHtml(t.content)
          return style ? `<span style="${style}">${text}</span>` : text
        })
        .join('')
    )
    .join('\n')

export class HighlighterLoader {
  private core?: Promise<HighlighterCore>
  private readonly languages = new Map<string, Promise<boolean>>()

  private load(): Promise<HighlighterCore> {
    this.core ??= (async () => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
        import('shiki/core'),
        import('shiki/engine/javascript')
      ])
      return createHighlighterCore({ themes: [VS2010_THEME], langs: [], engine: createJavaScriptRegexEngine({ forgiving: true }) })
    })()
    return this.core
  }

  /** Resolves true when the grammar for `lang` is loaded, false if shiki does not know it. */
  private ensureLanguage(hl: HighlighterCore, lang: string): Promise<boolean> {
    let pending = this.languages.get(lang)
    if (!pending) {
      pending = (async () => {
        const { bundledLanguages } = await import('shiki/langs')
        const loader = (bundledLanguages as Record<string, (() => Promise<unknown>) | undefined>)[lang]
        if (!loader) return false
        await hl.loadLanguage(loader as never)
        return true
      })().catch(() => false)
      this.languages.set(lang, pending)
    }
    return pending
  }

  async tokenize(code: string, language: string): Promise<CodeToken[][]> {
    const lang = language.trim().toLowerCase()
    if (PLAIN.has(lang)) return plainTokens(code)
    try {
      const hl = await this.load()
      if (!(await this.ensureLanguage(hl, lang))) return plainTokens(code)
      return hl.codeToTokensBase(code, { lang, theme: VS2010_THEME_NAME }).map((line) =>
        line.map((t) => ({
          content: t.content,
          color: t.color,
          bold: t.fontStyle ? (t.fontStyle & 2) !== 0 : undefined,
          italic: t.fontStyle ? (t.fontStyle & 1) !== 0 : undefined
        }))
      )
    } catch {
      return plainTokens(code)
    }
  }

  async toHtml(code: string, language: string): Promise<string> {
    return tokensToHtml(await this.tokenize(code, language))
  }
}

export const highlighter = new HighlighterLoader()
