const BY_EXTENSION: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', mts: 'typescript', cts: 'typescript', js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript',
  json: 'json', md: 'markdown', svelte: 'svelte', html: 'html', css: 'css', scss: 'scss', py: 'python', rs: 'rust', go: 'go',
  java: 'java', cs: 'csharp', c: 'c', h: 'c', cpp: 'cpp', sh: 'bash', yml: 'yaml', yaml: 'yaml', toml: 'toml', sql: 'sql', xml: 'xml'
}

/** Shiki language id for a file path; plain text when unknown. */
export function languageForPath(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? (BY_EXTENSION[name.slice(dot + 1).toLowerCase()] ?? 'text') : 'text'
}
