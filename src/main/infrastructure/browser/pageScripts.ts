/**
 * The few things done with page scripts because CDP has nothing better. Everything else (reading, clicking, typing,
 * keys, scrolling) goes through the DevTools protocol in `ElectronBrowserDriver`.
 */

/** `Runtime.evaluate` expression: is the focused element a password field? Looks through shadow roots and same-origin frames. */
export const ACTIVE_IS_PASSWORD_SCRIPT = `(() => {
  let doc = document
  let el = doc.activeElement
  for (let i = 0; i < 20 && el; i++) {
    if (el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement
    else if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
      let inner = null
      try { inner = el.contentDocument && el.contentDocument.activeElement } catch (e) { inner = null }
      if (!inner) break
      el = inner
    } else break
  }
  return !!el && el.tagName === 'INPUT' && String(el.type).toLowerCase() === 'password'
})()`

/** `Runtime.callFunctionOn` declaration: choose an option of a native `<select>` (`this`) by label or value. */
export const SELECT_OPTION_FUNCTION = `function (wanted) {
  if (!this || this.tagName !== 'SELECT') return { ok: false, error: 'not-select' }
  const options = Array.from(this.options)
  const lower = String(wanted).trim().toLowerCase()
  const text = (o) => (o.label || o.textContent || '').trim()
  const found =
    options.find((o) => text(o) === wanted || o.value === wanted) ||
    options.find((o) => text(o).toLowerCase() === lower) ||
    options.find((o) => text(o).toLowerCase().includes(lower))
  if (!found) return { ok: false, error: 'no-option', options: options.map(text).slice(0, 30) }
  if (found.disabled) return { ok: false, error: 'disabled', options: [text(found)] }
  this.value = found.value
  this.dispatchEvent(new Event('input', { bubbles: true }))
  this.dispatchEvent(new Event('change', { bubbles: true }))
  return { ok: true, label: text(found) }
}`
