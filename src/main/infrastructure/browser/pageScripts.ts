/** Scripts run inside the page of a Browser window (`webContents.executeJavaScript`). Each is one expression. */

const MAX_TEXT = 20_000
const MAX_ELEMENTS = 200

/**
 * Numbers the visible links, buttons and inputs (data-agent7-ref) and returns
 * `{ title, url, text, elements: [{ ref, kind, label, detail? }] }`.
 */
export const READ_PAGE_SCRIPT = `(() => {
  document.querySelectorAll('[data-agent7-ref]').forEach((e) => e.removeAttribute('data-agent7-ref'))
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const clean = (t) => String(t || '').replace(/\\s+/g, ' ').trim().slice(0, 80)
  const label = (el) => clean(el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.title || el.alt || el.name)
  const FIELD = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
  const PUSH = new Set(['button', 'submit', 'reset', 'image'])
  const elements = []
  for (const el of document.querySelectorAll('a[href], button, input, textarea, select, [role="button"], [role="link"]')) {
    if (elements.length >= ${MAX_ELEMENTS}) break
    if (!visible(el) || (el.tagName === 'INPUT' && el.type === 'hidden')) continue
    const link = el.tagName === 'A' || el.getAttribute('role') === 'link'
    const field = FIELD.has(el.tagName) && !PUSH.has(el.type)
    const kind = link ? 'link' : field ? 'input' : 'button'
    const ref = elements.length + 1
    el.setAttribute('data-agent7-ref', String(ref))
    const detail = link ? el.href : field ? 'type=' + (el.type || el.tagName.toLowerCase()) + (el.type === 'password' || !el.value ? '' : ' value=' + clean(el.value)) : undefined
    elements.push({ ref, kind, label: label(el), detail })
  }
  const text = ((document.body && document.body.innerText) || '').replace(/\\n{3,}/g, '\\n\\n').trim()
  return { title: document.title, url: location.href, text: text.slice(0, ${MAX_TEXT}), elements }
})()`

const findElement = (ref: number): string => `document.querySelector('[data-agent7-ref="${Math.trunc(ref)}"]')`

/** Clicks the numbered element. Returns `{ ok }`. */
export const clickScript = (ref: number): string => `(() => {
  const el = ${findElement(ref)}
  if (!el) return { ok: false }
  el.scrollIntoView({ block: 'center' })
  el.click()
  return { ok: true }
})()`

/** Replaces the value of the numbered input (firing input/change like typing) and optionally submits. Returns `{ ok }`. */
export const typeScript = (ref: number, text: string, submit: boolean): string => `(() => {
  const el = ${findElement(ref)}
  if (!el) return { ok: false }
  el.focus()
  if (el.isContentEditable) {
    el.textContent = ${JSON.stringify(text)}
  } else {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(text)})
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  if (${submit ? 'true' : 'false'}) {
    if (el.form && el.form.requestSubmit) el.form.requestSubmit()
    else el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
  }
  return { ok: true }
})()`
