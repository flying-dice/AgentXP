/**
 * True when a failed turn failed because the agent connection went away (the program ended, the pipe closed), as
 * opposed to an error the agent reported itself. Main uses it to tell "stopped unexpectedly" from a plain failure;
 * the chat uses it to say "the connection to the agent dropped" only when that is what happened.
 */
export const isConnectionLossText = (text: string): boolean => /connection closed|closed before|EPIPE|process (ended|exited)|stream (closed|ended)/i.test(text)
