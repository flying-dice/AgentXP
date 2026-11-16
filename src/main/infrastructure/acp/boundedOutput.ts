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

  /** Returns the text newly decoded from `chunk` (before any truncation). */
  append(chunk: Buffer): string {
    return this.add(this.decoder.write(chunk))
  }

  /** Flushes a trailing partial character; returns the text it produced. */
  finish(): string {
    return this.add(this.decoder.end())
  }

  get value(): string {
    return this.text
  }

  get truncated(): boolean {
    return this.cut
  }

  private add(decoded: string): string {
    this.text += decoded
    this.enforceLimit()
    return decoded
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
