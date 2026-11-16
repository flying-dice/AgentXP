/** How long a chat must have worked before its status line offers "Not responding? End the agent program" (UX-176). */
export const NOT_RESPONDING_MS = 20_000

/** The link in the status line of a chat that has worked for a while: it opens Task Manager on Processes. */
export const NOT_RESPONDING_LINK = 'Not responding? End the agent program'

/** The tooltip of the link: what it does, and that the chat stays. */
export const NOT_RESPONDING_TIP = 'Open Task Manager on Processes. Select the agent program and click End process. The chat stays and you can restart it.'

/**
 * True when the link shows: the chat has worked for `NOT_RESPONDING_MS` or more and is not waiting for the user's answer
 * (a request that waits is not a program that does not respond).
 */
export const showNotResponding = (workingMs: number, waitingForUser: boolean): boolean => !waitingForUser && workingMs >= NOT_RESPONDING_MS
