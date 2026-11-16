/**
 * Scopes ACP tool call ids per prompt turn. ACP only promises that a `toolCallId` is unique within a
 * session, but agents restart their counters per turn (`t1` again in the next prompt); everything
 * downstream (transcript, AG-UI state, permission rows) keys tool calls by id, so a reused id would
 * overwrite the card of an earlier turn.
 *
 * The first use of an id in a session keeps it unchanged; a call created (or a permission requested)
 * under an id that an earlier turn already used gets `<id>@<turn>`. Updates follow the id's latest call.
 */
export class ToolCallScope {
  private readonly turns = new Map<string, number>()
  /** Per session: ACP id -> scoped id of the call in the current turn. */
  private readonly current = new Map<string, Map<string, string>>()
  /** Per session: ACP id -> scoped id of its most recent call (any turn). */
  private readonly latest = new Map<string, Map<string, string>>()

  /** A new prompt turn starts in the session. */
  beginTurn(sessionId: string): void {
    this.turns.set(sessionId, (this.turns.get(sessionId) ?? 0) + 1)
    this.current.delete(sessionId)
  }

  /** The id of a call that is created (or first mentioned by a permission request) in the current turn. */
  forCreate(sessionId: string, acpId: string): string {
    const current = this.mapOf(this.current, sessionId)
    const existing = current.get(acpId)
    if (existing !== undefined) return existing
    const latest = this.mapOf(this.latest, sessionId)
    const scoped = latest.has(acpId) ? `${acpId}@${this.turns.get(sessionId) ?? 0}` : acpId
    current.set(acpId, scoped)
    latest.set(acpId, scoped)
    return scoped
  }

  /** The id an update of `acpId` applies to. */
  forUpdate(sessionId: string, acpId: string): string {
    return this.current.get(sessionId)?.get(acpId) ?? this.latest.get(sessionId)?.get(acpId) ?? acpId
  }

  private mapOf(maps: Map<string, Map<string, string>>, sessionId: string): Map<string, string> {
    let map = maps.get(sessionId)
    if (!map) maps.set(sessionId, (map = new Map()))
    return map
  }
}
