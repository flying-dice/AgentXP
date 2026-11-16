/** SQL expression producing an ISO-8601 UTC timestamp with millisecond precision. */
export const NOW_SQL = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

/** Encodes ids for `WHERE col IN (SELECT value FROM json_each(?))` so one cached statement serves any id count. */
export function idsJson(ids: readonly number[]): string {
  return JSON.stringify(ids)
}

export function groupBy<T>(rows: readonly T[], key: (row: T) => number): Map<number, T[]> {
  const groups = new Map<number, T[]>()
  for (const row of rows) {
    const k = key(row)
    const bucket = groups.get(k)
    if (bucket) bucket.push(row)
    else groups.set(k, [row])
  }
  return groups
}
