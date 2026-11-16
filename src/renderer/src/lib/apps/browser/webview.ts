/** The subset of Electron's `<webview>` element the Browser app uses. */
export interface WebviewElement extends HTMLElement {
  src: string
  loadURL(url: string): Promise<void>
  goBack(): void
  goForward(): void
  canGoBack(): boolean
  canGoForward(): boolean
  reload(): void
  stop(): void
  getWebContentsId(): number
}
