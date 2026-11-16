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

/** What a right-click inside the guest page reports (viewport coordinates of the app). */
export interface PageContext {
  x: number
  y: number
  linkURL: string
  selectionText: string
}
