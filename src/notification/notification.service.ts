import { Injectable, NotFoundException } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  // async sendPush(dto: sendNotificationDTO) {
  //   try {
  //     await firebase
  //       .messaging()
  //       .send({
  //         notification: {
  //           title: dto.title,
  //           body: dto.body,
  //         },
  //         token: dto.deviceId,
  //         data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
  //         android: {
  //           priority: 'high',
  //           notification: {
  //             sound: 'default',
  //             channelId: 'default',
  //           },
  //         },
  //         apns: {
  //           headers: {
  //             'apns-priority': '10',
  //           },
  //           payload: {
  //             aps: {
  //               contentAvailable: true,
  //               sound: 'default',
  //             },
  //           },
  //         },
  //       })
  //       .catch((error: any) => {
  //         throw error;
  //       });
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async sendNotification(token: string, title: string, body: string) {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
    };

    try {
      const response = await firebase.messaging().send(message);
      console.log('Notification sent successfully:', response);
      return { message: 'Notification sent successfully', response };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async getUserToken(id: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      return { token: user?.fcmToken || null };
    } catch (error) {
      throw error;
    }
  }

  async getAdminToken(id: string) {
    try {
      const admin = await this.prisma.admin.findUnique({ where: { id } });
      return { token: admin?.fcmToken || null };
    } catch (error) {
      throw error;
    }
  }

  async getOrganiserToken(id: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id },
      });
      return { token: organiser?.fcmToken || null };
    } catch (error) {
      throw error;
    }
  }

  async createNotification(dto: CreateNotificationDto) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          title: dto.title,
          body: dto.body,
          recipientId: dto.recipientId,
        },
      });

      // Send push notification if requested
      if (dto.sendPush) {
        await this.sendPushToUser(dto.recipientId, dto.title, dto.body);
      }

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Send push notification to specific user
  async sendPushToUser(userId: string, title: string, body: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true, fcmIsOn: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.fcmToken || !user.fcmIsOn) {
        console.log('User has no FCM token or notifications disabled');
        return { message: 'User has notifications disabled or no token' };
      }

      return await this.sendPushNotification(user.fcmToken, title, body);
    } catch (error) {
      throw error;
    }
  }

  // Send push notification using Firebase
  async sendPushNotification(token: string, title: string, body: string) {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            contentAvailable: true,
            sound: 'default',
          },
        },
      },
    };

    try {
      const response = await firebase.messaging().send(message);
      console.log('Push notification sent successfully:', response);
      return { message: 'Push notification sent successfully', response };
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Get user's notifications
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await this.prisma.notification.count({
        where: { recipientId: userId },
      });

      return {
        notifications,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.update({
        where: {
          id: notificationId,
          recipientId: userId, // Ensure user owns the notification
        },
        data: { isRead: true },
      });

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      await this.prisma.notification.updateMany({
        where: {
          recipientId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });

      return { message: 'All notifications marked as read' };
    } catch (error) {
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(userId: string) {
    try {
      const count = await this.prisma.notification.count({
        where: {
          recipientId: userId,
          isRead: false,
        },
      });

      return { count };
    } catch (error) {
      throw error;
    }
  }

  // Delete a single notification by ID and userId (for security)
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await this.prisma.notification.deleteMany({
        where: {
          id: notificationId,
          recipientId: userId,
        },
      });
      if (notification.count === 0) {
        throw new NotFoundException(
          'Notification not found or not owned by user',
        );
      }
      return { message: 'Notification deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Delete all notifications for a user
  async deleteAllNotifications(userId: string) {
    try {
      await this.prisma.notification.deleteMany({
        where: { recipientId: userId },
      });
      return { message: 'All notifications deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}
