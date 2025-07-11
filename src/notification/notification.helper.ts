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
}
