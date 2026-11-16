import { noDriveMessage, type DriveLetter } from '@shared/vfs'
import { ToolRefusedError } from '../../domain/agent/ToolGate'

/** The agent touched a drive that is not plugged in (ejected or never there). Refused like a closed app. */
export class DriveUnavailableError extends ToolRefusedError {
  constructor(readonly letter: DriveLetter, removedProject?: string) {
    super(noDriveMessage(letter, removedProject))
    this.name = 'DriveUnavailableError'
  }
}

/** A real path that is on no drive of the desktop (neither C: nor a plugged-in project). */
export class OutsideDrivesError extends ToolRefusedError {
  constructor(path: string) {
    super(`Path is outside the drives of this desktop (C: and the plugged-in projects): ${path}`)
    this.name = 'OutsideDrivesError'
  }
}
