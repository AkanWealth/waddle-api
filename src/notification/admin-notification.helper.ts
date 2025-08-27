import { NotificationService } from './notification.service';

export class AdminNotificationHelper {
  constructor(private readonly adminNotificationService: NotificationService) {}

  // Send organiser suspension notification
  async sendOrganiserSuspensionAlert(organiserId: string, reason: string) {
    return this.adminNotificationService.createAdminNotification({
      title: 'Organiser Suspended',
      body: `An organiser has been suspended due to: ${reason}`,
      type: 'ORGANISER_SUSPENSION',
      data: {
        organiserId,
        reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Send payment dispute notification
  async sendPaymentDisputeAlert(disputeId: string, amount: number) {
    return this.adminNotificationService.createAdminNotification({
      title: 'New Payment Dispute',
      body: `A new payment dispute of $${amount} requires attention`,
      type: 'PAYMENT_DISPUTE',
      data: {
        disputeId,
        amount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendOrganiserDocumentReuploadAlert(organiserId: string) {
    return this.adminNotificationService.createAdminNotification({
      title: 'Organiser Document Reuploaded',
      body: `An organiser has reuploaded their document`,
      type: 'ORGANISER_DOCUMENT_REUPLOAD',
      data: {
        organiserId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Send system alert
  async sendSystemAlert(title: string, message: string, data?: any) {
    return this.adminNotificationService.createAdminNotification({
      title,
      body: message,
      type: 'SYSTEM_ALERT',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
