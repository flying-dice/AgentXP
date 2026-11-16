import { StringDecoder } from 'node:string_decoder'

/**
 * Accumulates text, keeping at most `byteLimit` UTF-8 bytes from the END.
 * Truncation drops the start and never splits a character.
 */
export class BoundedOutput {
  private text = ''
  private cut = false
  private readonly decoder = new StringDecoder('utf8')

  constructor(private readonly byteLimit: number) {}

  append(chunk: Buffer): void {
    this.text += this.decoder.write(chunk)
    this.enforceLimit()
  }

  finish(): void {
    this.text += this.decoder.end()
    this.enforceLimit()
  }

  get value(): string {
    return this.text
  }

  get truncated(): boolean {
    return this.cut
  }

  private enforceLimit(): void {
    const bytes = Buffer.from(this.text, 'utf8')
    if (bytes.length <= this.byteLimit) return
    let start = bytes.length - this.byteLimit
    while (start < bytes.length && (bytes[start] & 0xc0) === 0x80) start++
    this.text = bytes.subarray(start).toString('utf8')
    this.cut = true
  }
}
