/** What Resume says to a chat whose step Pause stopped, and how the chat shows it. */

/** The message "Resume agents and continue" sends to each chat that Pause stopped (as the user's message). */
export const CONTINUE_TEXT = 'Please continue where you stopped.'

/** The marker above that message in the chat. */
export const RESUMED_NOTE = 'Resumed. Continuing where you stopped.'

/** The banner of a chat whose step Pause stopped, while the desktop is still paused. */
export const STOPPED_BY_PAUSE_NOTE = 'Paused. The step that was running was stopped. It continues when you click Resume agents and continue.'

/** The banner of a chat that Pause did not stop. */
export const PAUSED_NOTE = 'This desktop is paused. Click Resume agents and continue on the bar.'

/** The bar line after Resume when no chat had a step to continue. */
export const NOTHING_STOPPED_NOTICE = 'Resumed. Nothing was stopped.'

export const isContinueMessage = (text: string): boolean => text.trim() === CONTINUE_TEXT

/** The Action Center line of a chat that Pause stopped (built from the saved list), and of one that resumed. */
export const stoppedLine = (title: string): string => `In chat '${title}': Paused. The step that was running was stopped. Resume agents and continue carries it on.`
export const resumedLine = (title: string): string => `In chat '${title}': ${RESUMED_NOTE}`
