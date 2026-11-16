/** Splits a byte stream into newline-delimited lines. */
export class LineSplitter {
  private buffer = ''

  push(chunk: string, onLine: (line: string) => void): void {
    this.buffer += chunk
    let idx: number
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim()
      this.buffer = this.buffer.slice(idx + 1)
      if (line) onLine(line)
    }
  }
}
