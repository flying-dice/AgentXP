/** ISO 8601 <-> Date for the date controls; a date-only string stays date-only when written back. */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseIsoDate(value: string): Date | undefined {
  const m = DATE_ONLY.exec(value)
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** Writes `date` in the shape of `previous`: `YYYY-MM-DD` when that was date-only, else full ISO. */
export function formatIsoDate(date: Date, previous: string): string {
  return DATE_ONLY.test(previous) ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : date.toISOString()
}
