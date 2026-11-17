import { Notification } from 'electron'
import type { Id } from '@shared/models'
import type { ApprovalNotifier } from '../application/launcher/LauncherService'

/** "AgentXP: <desktop> needs your approval"; clicking it connects the desktop. */
export class ElectronNotifier implements ApprovalNotifier {
  constructor(private readonly connect: (desktopId: Id) => void) {}

  approvalNeeded(desktopId: Id, desktopTitle: string): void {
    if (!Notification.isSupported()) return
    const notification = new Notification({ title: `AgentXP: ${desktopTitle} needs your approval`, body: 'An agent is waiting for your answer.' })
    notification.on('click', () => this.connect(desktopId))
    notification.show()
  }
}
