/** A user-facing failure: the message is shown to the user as is. */
export class AppError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppError'
  }
}

/** Returns `value` or throws a readable "not found" error. */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new AppError(`${what} not found`)
  return value
}
