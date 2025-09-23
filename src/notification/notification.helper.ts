// src/notification/notification.helper.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { recipientTypeEnum } from './dto/recepientTypes';

@Injectable()
export class NotificationHelper {
  constructor(private notificationService: NotificationService) {}

  async sendBookingConfirmation(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Booking Confirmed',
      body: `Your booking for "${eventName}" has been confirmed!`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }
  async sendEventBookedNotification(
    organiserId: string,
    eventName: string,
    userName: string,
  ) {
    // Send notification to organiser
    await this.notificationService.createNotification({
      title: 'New Booking!',
      body: `${userName} has booked a spot for your event "${eventName}".`,
      recipientId: organiserId,
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });
  }

  async sendEventReminder(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Event Reminder',
      body: `Don't forget about "${eventName}" happening soon!`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }
  async sendEventApprovalNotification(
    userId: string,
    eventName: string,
    isApproved: boolean,
  ) {
    await this.notificationService.createNotification({
      title: isApproved ? 'Event Approved!' : 'Event Rejected!',
      body: isApproved
        ? `Great news! Your event "${eventName}" has been approved and is now visible to users.`
        : `We’re sorry. Your event "${eventName}" has been rejected. Please review our guidelines or contact support for more details.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });
  }

  async sendBookingCancel(
    userId: string,
    name: string,
    eventName: string,
    sendPush: boolean,
  ) {
    await this.notificationService.createNotification({
      title: 'Booking Cancelled',
      body: `Your booking for "${eventName}" has been cancelled!`,
      recipientId: userId,
      sendPush: sendPush,
      visibleToAdmins: true,
      recipientType: recipientTypeEnum.USER,
    });

    await this.notificationService.createAdminNotification({
      title: 'Booking Cancelled',
      body: `${name} has cancelled their booking for "${eventName}".`,
      type: 'BOOKING_CANCELLED',
      data: {
        userId,
        eventName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendNewEventAlert(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'New Event Available',
      body: `Check out the new event: "${eventName}"`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }

  async sendPendingDisputeAlert(userId: string, name: string) {
    await this.notificationService.createNotification({
      title: 'You have a pending dispute',
      body: 'You have just created a dispute. Please wait for the resolution by the admin.',
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });

    await this.notificationService.createAdminNotification({
      title: 'New Dispute Created',
      body: ` ${name} has submitted a new dispute. Please review it.`,
      type: 'NEW_DISPUTE',
      data: {
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendDisputeInReviewAlert(userId: string) {
    await this.notificationService.createNotification({
      title: 'Dispute in Review',
      body: `Your dispute is under review. Please wait for the result.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }

  async sendDisputeResolvedAlert(userId: string, name: string) {
    await this.notificationService.createNotification({
      title: 'Dispute Resolved',
      body: 'Your dispute has been resolved. Please check the result.',
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });

    await this.notificationService.createAdminNotification({
      title: 'Dispute Resolved',
      body: `The dispute submitted by ${name} has been resolved.`,
      type: 'DISPUTE_RESOLVED',
      data: {
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendAccountSuspensionAlert(
    organiserId: string,
    name: string,
    reason?: string,
  ) {
    const title = 'Account Suspended!';
    const body =
      'Your Waddle event organiser account has been suspended due to a violation of our terms. Please contact support for more information.';

    // Send to organiser
    await this.notificationService.createNotification({
      title,
      body,
      recipientId: organiserId,
      visibleToAdmins: true, // will create admin notification too
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });

    // Send to admins
    await this.notificationService.createAdminNotification({
      title: 'Organiser Suspended',
      body: `An organiser named ${name}  has been suspended${reason ? ` due to: ${reason}` : ''}`,
      type: 'ORGANISER_SUSPENSION',
      data: {
        organiserId,
        reason: reason ?? 'No specific reason provided',
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendAccountApprovalStatusAlert(
    userId: string,
    name: string,
    isApproved: boolean,
  ) {
    await this.notificationService.createNotification({
      title: isApproved ? 'Account Approved!' : 'Account Rejected!',
      body: isApproved
        ? 'Congratulations! Your Waddle event organiser account has been approved.'
        : "We're sorry. Your Waddle event organiser account has been rejected. Please contact support for clarification.",
      recipientId: userId,
      visibleToAdmins: true,
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });
    await this.notificationService.createAdminNotification({
      title: isApproved ? 'Organiser Approved!' : 'Organiser Rejected!',

      body: isApproved
        ? `An organiser named ${name}  has been approved`
        : `An organiser named ${name}  has been rejected`,
      type: isApproved ? 'ORGANISER_APPROVED' : 'ORGANISER_APPROVED',
      data: {
        organiserId: userId,
        reason: 'No specific reason provided',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Account Reactivation Notification
  async sendAccountReactivationAlert(userId: string, name: string) {
    await this.notificationService.createNotification({
      title: 'Account Reactivated!',
      body: 'Congratulations! Your Waddle event organiser account has been reactivated.',
      recipientId: userId,
      visibleToAdmins: true,
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });
    await this.notificationService.createAdminNotification({
      title: 'Organiser Reactivated!',
      body: `An organiser named ${name}  has been reactivated`,
      type: 'ORGANISER_REACTIVATED',
      data: {
        organiserId: userId,
        reason: 'No specific reason provided',
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Event Cancellation Notification
  async sendEventCancellationNotification(
    organiserId: string,
    eventName: string,
  ) {
    await this.notificationService.createNotification({
      title: 'Requested Event Cancellation',
      body: `You have requested a cancellation for "${eventName}". Our admin will initiate the refund process and notify you when the event is cancelled.`,
      recipientId: organiserId,
      recipientType: recipientTypeEnum.ORGANISER,
      sendPush: true,
      visibleToAdmins: false,
    });
    await this.notificationService.createAdminNotification({
      title: 'Organiser Event Cancellationn',
      body: 'A Vendor has just rejected for an event cancellation.',
      type: 'EVENT_CANCELLATION_REQUEST',
      data: {
        organiserId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendEventCancellationNotificationToWishlistUsers(
    userId: string,
    eventName: string,
  ) {
    await this.notificationService.createNotification({
      title: 'Event Cancelled',
      body: `The event "${eventName}" that you were interested in has been cancelled.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }

  async sendEventCancellationConfirmation(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Event Cancelled Confirmed',
      body: `Your event "${eventName}" cancellation has been approved by an admin. Attendees have been notified, and refunds are now being processed.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });
  }

  async sendOrganiserDocumentReuploadAlert(
    organiserId: string,
    organiserName: string,
  ) {
    await this.notificationService.createAdminNotification({
      title: 'Organiser Document Reuploaded',
      body: `An organiser named ${organiserName} has reuploaded their document`,
      type: 'ORGANISER_DOCUMENT_REUPLOAD',
      data: {
        organiserId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendRecommendationApprovedNotification(
    userId: string,
    eventName: string,
    isEvent: boolean,
  ) {
    await this.notificationService.createNotification({
      title: `${isEvent ? 'Event' : 'Place'} Recommendation Approved`,
      body: `Your recommended ${isEvent ? 'event' : 'place'} "${eventName}" has just been reviewed and approve by the admin.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }
  async sendRecommendationRejectionNotification(
    userId: string,
    eventName: string,
    isEvent: boolean,
  ) {
    await this.notificationService.createNotification({
      title: `${isEvent ? 'Event' : 'Place'} Recommendation Rejected`,
      body: `Your recommended ${isEvent ? 'event' : 'place'} "${eventName}" has just been rejected by the admin.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }

  async sendWaddleApprovedTagToVendorNotification(
    vendorId: string,
    vendorName: string,
  ) {
    await this.notificationService.createNotification({
      title: 'Your account is now Waddle Approved!',
      body: `Your vendor account "${vendorName}" has been tagged as Waddle Approved by the admin.`,
      recipientId: vendorId,
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });
  }
  async removeWaddleApprovedTagToVendorNotification(
    vendorId: string,
    vendorName: string,
  ) {
    await this.notificationService.createNotification({
      title: 'Your account is no longer Waddle Approved!',
      body: `Your vendor account "${vendorName}" has been removed from Waddle Approved by the admin.`,
      recipientId: vendorId,
      sendPush: true,
      recipientType: recipientTypeEnum.ORGANISER,
    });
  }
}
