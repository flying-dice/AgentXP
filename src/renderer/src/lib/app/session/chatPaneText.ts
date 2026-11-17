/** Words of the chat pane of an app window (the quick pane beside Code, Browser, Notepad...). */

/** The tooltip of the collapsed strip. */
export const OPEN_PANE_TIP = 'Open the chat pane: ask about what you are looking at'

/** The empty pane: what it is, and where its conversation goes when the window closes. */
export const PANE_EMPTY_TEXT = 'Ask about what you are looking at. When you close the window, the conversation is kept: open it again from Start > Recent chats.'

/** A button above the message box: clicking it sends `text`; a disabled one says in `tip` what is missing. */
export interface ChatSuggestion {
  id: string
  label: string
  text: string
  disabled?: boolean
  tip?: string
}

/** The tooltip of "Explain this" while nothing is selected. */
export const SELECT_FIRST_TIP = 'Select some text first.'
