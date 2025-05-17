import { Injectable } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import { PrismaService } from 'src/prisma/prisma.service';

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
}
