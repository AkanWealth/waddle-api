// src/notification/notification.helper.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationHelper {
  constructor(private notificationService: NotificationService) {}

  async sendBookingConfirmation(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Booking Confirmed',
      body: `Your booking for "${eventName}" has been confirmed!`,
      recipientId: userId,
      sendPush: true,
    });
  }

  async sendEventReminder(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Event Reminder',
      body: `Don't forget about "${eventName}" happening soon!`,
      recipientId: userId,
      sendPush: true,
    });
  }

  async sendBookingCancel(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'Booking Cancelled',
      body: `Your booking for "${eventName}" has been cancelled!`,
      recipientId: userId,
      sendPush: true,
    });
  }

  async sendNewEventAlert(userId: string, eventName: string) {
    await this.notificationService.createNotification({
      title: 'New Event Available',
      body: `Check out the new event: "${eventName}"`,
      recipientId: userId,
      sendPush: true,
    });
  }

  async sendPendingDisputeAlert(userId: string) {
    await this.notificationService.createNotification({
      title: 'You have a pending dispute',
      body: `You have just created a dispute. Please wait for the resolution by the admin.`,
      recipientId: userId,
      sendPush: true,
    });
  }
  async sendDisputeInReviewAlert(userId: string) {
    await this.notificationService.createNotification({
      title: 'Dispute in Review',
      body: `Your dispute is under review. Please wait for the result.`,
      recipientId: userId,
      sendPush: true,
    });
  }

  async sendDisputeResolvedAlert(userId: string) {
    await this.notificationService.createNotification({
      title: 'Dispute Resolved',
      body: `Your dispute has been resolved. Please check the result.`,
      recipientId: userId,
      sendPush: true,
    });
  }
}
