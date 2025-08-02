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

  async sendEventReminder(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Event Reminder',
      body: `Don't forget about "${eventName}" happening soon!`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }

  async sendBookingCancel(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Booking Cancelled',
      body: `Your booking for "${eventName}" has been cancelled!`,
      recipientId: userId,
      sendPush: true,
      visibleToAdmins: true,
      recipientType: recipientTypeEnum.USER,
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

  async sendPendingDisputeAlert(userId: string) {
    await this.notificationService.createNotification({
      title: 'You have a pending dispute',
      body: `You have just created a dispute. Please wait for the resolution by the admin.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
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

  async sendDisputeResolvedAlert(userId: string) {
    await this.notificationService.createNotification({
      title: 'Dispute Resolved',
      body: `Your dispute has been resolved. Please check the result.`,
      recipientId: userId,
      sendPush: true,
      recipientType: recipientTypeEnum.USER,
    });
  }

  async sendAccountSuspensionAlert(organiserId: string, reason?: string) {
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
      body: `An organiser has been suspended${reason ? ` due to: ${reason}` : ''}`,
      type: 'ORGANISER_SUSPENSION',
      data: {
        organiserId,
        reason: reason ?? 'No specific reason provided',
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendAccountApprovalStatusAlert(userId: string, isApproved: boolean) {
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
  }
}
