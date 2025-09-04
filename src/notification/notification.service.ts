import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAdminNotificationDto,
  CreateNotificationDto,
  CreateNotificationPreferenceDto,
  CreateUserNotificationPreferenceDto,
  SendEmailToWaddleTeamViaContactUsFormDto,
} from './dto';
import { recipientTypeEnum } from './dto/recepientTypes';
import { RecipientType } from '@prisma/client';
import { Mailer } from 'src/helper';
import { sendEmailMobile } from './dto/send-email-mobile.dto';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private mailer: Mailer,
    @Inject('FIREBASE_ADMIN')
    private readonly firebaseAdmin: { messaging: admin.messaging.Messaging },
  ) {}
  private async sendPushNotification(
    token: string,
    title: string,
    body: string,
  ) {
    console.log(token);
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
      const response = await this.firebaseAdmin.messaging.send(message);
      console.log('✅ Push sent:', response);
      return { message: 'Push notification sent successfully', response };
    } catch (error) {
      console.error('❌ Error sending push:', error);
    }
  }

  async createNotification(dto: CreateNotificationDto) {
    try {
      if (dto.recipientType === recipientTypeEnum.USER) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: dto.recipientId },
          select: { id: true },
        });
        if (!userExists) {
          throw new NotFoundException(
            `User with ID ${dto.recipientId} not found`,
          );
        }
      } else if (dto.recipientType === recipientTypeEnum.ORGANISER) {
        const organiserExists = await this.prisma.organiser.findUnique({
          where: { id: dto.recipientId },
          select: { id: true },
        });
        if (!organiserExists) {
          throw new NotFoundException(
            `Organiser with ID ${dto.recipientId} not found`,
          );
        }
      }

      // Use a transaction to ensure consistency
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create the notification
        const notification = await prisma.notification.create({
          data: {
            title: dto.title,
            body: dto.body,
            visibleToAdmins: dto.visibleToAdmins ?? false,
            ...(dto.recipientType === RecipientType.USER
              ? { userId: dto.recipientId }
              : { organiserId: dto.recipientId }),
          },
        });

        // If notification should be visible to admins, create read status entries for all admins
        // if (dto.visibleToAdmins) {
        //   const admins = await prisma.admin.findMany({
        //     where: {
        //       isDeleted: false,
        //       activationStatus: 'ACTIVE',
        //     },
        //     select: {
        //       id: true,
        //     },
        //   });

        //   if (admins.length > 0) {
        //     await this.createAdminNotification({
        //       title: dto.title,
        //       body: dto.body,
        //       type: 'GENERAL', // or something appropriate from your enum
        //       data: {
        //         linkedNotificationId: notification.id, // optional if you want to relate them
        //         recipientId: dto.recipientId,
        //       },
        //     });
        //   }
        // }

        return notification;
      });

      // Send push notification if requested
      if (dto.sendPush !== false) {
        if (dto.recipientType === recipientTypeEnum.USER) {
          await this.sendPushToUser(dto.recipientId, dto.title, dto.body);
        } else if (dto.recipientType === recipientTypeEnum.ORGANISER) {
          await this.sendPushToOrganiser(dto.recipientId, dto.title, dto.body);
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  async upsertOrganiserNotificationPreferences(
    organiserId: string,
    dto: CreateNotificationPreferenceDto,
  ) {
    // Ensure organiser exists
    const organiser = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
      select: { id: true },
    });
    if (!organiser) {
      throw new NotFoundException('Organiser not found');
    }

    // Upsert preferences
    const data: any = {
      organiserId,
      recipientType: RecipientType.ORGANISER,
      ...Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== undefined),
      ),
    };

    const existing = await this.prisma.notificationPreference.findUnique({
      where: { organiserId: organiserId },
    });

    if (existing) {
      const updated = await this.prisma.notificationPreference.update({
        where: { organiserId: organiserId },
        data,
      });
      return {
        success: true,
        data: {
          organiser: {
            order: updated.order,
            event_approval: updated.event_approval,
            cancellation: updated.cancellation,
            payments: updated.payments,
            system: updated.system,
          },
        },
      };
    }

    const created = await this.prisma.notificationPreference.create({
      data,
    });
    return {
      success: true,
      data: {
        organiser: {
          order: created.order,
          event_approval: created.event_approval,
          cancellation: created.cancellation,
          payments: created.payments,
          system: created.system,
        },
      },
    };
  }

  async upsertUserNotificationPreferences(
    userId: string,
    dto: CreateUserNotificationPreferenceDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {
      userId,
      recipientType: RecipientType.USER,
      ...Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== undefined),
      ),
    };

    const existing = await this.prisma.notificationPreference.findFirst({
      where: { userId },
    });

    if (existing) {
      const updated = await this.prisma.notificationPreference.update({
        where: { id: existing.id },
        data,
      });
      return {
        success: true,
        data: {
          user: {
            booking_confirmation: updated.booking_confirmation,
            new_events: updated.new_events,
            replies: updated.replies,
            past_events: updated.past_events,
            email: updated.email,
            new_features: updated.new_features,
          },
        },
      };
    }

    const created = await this.prisma.notificationPreference.create({
      data,
    });
    return {
      success: true,
      data: {
        user: {
          booking_confirmation: created.booking_confirmation,
          new_events: created.new_events,
          replies: created.replies,
          past_events: created.past_events,
          email: created.email,
          new_features: created.new_features,
        },
      },
    };
  }

  async getOrganiserNotificationPreferences(organiserId: string) {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { organiserId: organiserId },
    });
    return {
      success: true,
      data: {
        order: preferences.order,
        event_approval: preferences.event_approval,
        cancellation: preferences.cancellation,
        payments: preferences.payments,
        system: preferences.system,
      },
    };
  }

  async getUserNotificationPreferences(userId: string) {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    console.log(preferences);
    if (!preferences) {
      throw new BadRequestException(
        'No preference found for this user. It is probably ann older user created post 27 August',
      );
    }
    return {
      success: true,
      data: {
        booking_confirmation: preferences.booking_confirmation,
        new_events: preferences.new_events,
        replies: preferences.replies,
        past_events: preferences.past_events,
        email: preferences.email,
        new_features: preferences.new_features,
      },
    };
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
      console.log(user);

      if (!user.fcmToken || !user.fcmIsOn) {
        console.log('User has no FCM token or notifications disabled');
        return { message: 'User has notifications disabled or no token' };
      }

      return await this.sendPushNotification(user.fcmToken, title, body);
    } catch (error) {
      throw error;
    }
  }

  // Send push notification to specific organiser
  async sendPushToOrganiser(organiserId: string, title: string, body: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id: organiserId },
        select: { fcmToken: true, fcmIsOn: true },
      });

      if (!organiser) {
        throw new NotFoundException('Organiser not found');
      }

      if (!organiser.fcmToken || !organiser.fcmIsOn) {
        console.log('Organiser has no FCM token or notifications disabled');
        return { message: 'Organiser has notifications disabled or no token' };
      }

      return await this.sendPushNotification(organiser.fcmToken, title, body);
    } catch (error) {
      throw error;
    }
  }

  // Send push notification using Firebase
  // async sendPushNotification(token: string, title: string, body: string) {
  //   const message = {
  //     token,
  //     notification: {
  //       title,
  //       body,
  //     },
  //     data: {
  //       click_action: 'FLUTTER_NOTIFICATION_CLICK',
  //     },
  //     android: {
  //       priority: 'high' as const,
  //       notification: {
  //         sound: 'default',
  //         channelId: 'default',
  //       },
  //     },
  //     apns: {
  //       headers: {
  //         'apns-priority': '10',
  //       },
  //       payload: {
  //         aps: {
  //           contentAvailable: true,
  //           sound: 'default',
  //         },
  //       },
  //     },
  //   };

  //   try {
  //     const response = await firebase.messaging().send(message);
  //     console.log('Push notification sent successfully:', response);
  //     return { message: 'Push notification sent successfully', response };
  //   } catch (error) {
  //     console.error('Error sending push notification:', error);
  //     throw error;
  //   }
  // }

  // Get notifications for a user
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          userId: userId,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await this.prisma.notification.count({
        where: {
          userId: userId,
        },
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

  // Get notifications for an organiser
  async getOrganiserNotifications(
    organiserId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: {
          organiserId: organiserId,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await this.prisma.notification.count({
        where: {
          organiserId: organiserId,
        },
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
  async markAsRead(
    notificationId: string,
    recipientId: string,
    recipientType: recipientTypeEnum,
  ) {
    try {
      const whereClause =
        recipientType === recipientTypeEnum.USER
          ? { id: notificationId, userId: recipientId }
          : { id: notificationId, organiserId: recipientId };

      const notification = await this.prisma.notification.update({
        where: whereClause,
        data: { isRead: true },
      });

      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read for a recipient
  async markAllAsRead(recipientId: string, recipientType: recipientTypeEnum) {
    try {
      const whereClause =
        recipientType === recipientTypeEnum.USER
          ? { userId: recipientId, isRead: false }
          : { organiserId: recipientId, isRead: false };

      await this.prisma.notification.updateMany({
        where: whereClause,
        data: { isRead: true },
      });

      return { message: 'All notifications marked as read' };
    } catch (error) {
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(recipientId: string, recipientType: recipientTypeEnum) {
    try {
      const whereClause =
        recipientType === recipientTypeEnum.USER
          ? { userId: recipientId, isRead: false }
          : { organiserId: recipientId, isRead: false };

      const count = await this.prisma.notification.count({
        where: whereClause,
      });

      return { count };
    } catch (error) {
      throw error;
    }
  }

  // Delete a single notification
  async deleteNotification(
    notificationId: string,
    recipientId: string,
    recipientType: recipientTypeEnum,
  ) {
    try {
      const whereClause =
        recipientType === recipientTypeEnum.USER
          ? { id: notificationId, userId: recipientId }
          : { id: notificationId, organiserId: recipientId };

      const notification = await this.prisma.notification.deleteMany({
        where: whereClause,
      });

      if (notification.count === 0) {
        throw new NotFoundException(
          'Notification not found or not owned by recipient',
        );
      }

      return { message: 'Notification deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Delete all notifications for a recipient
  async deleteAllNotifications(
    recipientId: string,
    recipientType: recipientTypeEnum,
  ) {
    try {
      const whereClause =
        recipientType === recipientTypeEnum.USER
          ? { userId: recipientId }
          : { organiserId: recipientId };

      await this.prisma.notification.deleteMany({
        where: whereClause,
      });

      return { message: 'All notifications deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Enhanced admin notification creation
  async createAdminNotification(dto: CreateAdminNotificationDto) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const adminNotification = await prisma.adminNotification.create({
          data: {
            title: dto.title,
            body: dto.body,
            type: dto.type,
            data: dto.data,
          },
        });

        const activeAdmins = await prisma.admin.findMany({
          where: {
            isDeleted: false,
            activationStatus: 'ACTIVE',
          },
          select: {
            id: true,
            fcmToken: true,
            fcmIsOn: true,
          },
        });

        if (activeAdmins.length > 0) {
          await prisma.adminNotificationStatus.createMany({
            data: activeAdmins.map((admin) => ({
              adminId: admin.id,
              adminNotificationId: adminNotification.id,
            })),
          });
        }

        return adminNotification;
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get notifications for a specific admin
  async getAdminNotifications(
    adminId: string,
    options: {
      includeRead?: boolean;
      includeCleared?: boolean;
      includeDeleted?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const {
      includeRead = true,
      includeCleared = false,
      includeDeleted = false,
      limit = 50,
      offset = 0,
    } = options;

    const whereClause = {
      adminId,
      ...(includeRead ? {} : { isRead: false }),
      ...(includeCleared ? {} : { isCleared: false }),
      ...(includeDeleted ? {} : { isDeleted: false }),
    };

    try {
      // Get total count
      const total = await this.prisma.adminNotificationStatus.count({
        where: whereClause,
      });

      // Fetch paginated data
      const notifications = await this.prisma.adminNotificationStatus.findMany({
        where: whereClause,
        include: {
          adminNotification: true,
        },
        orderBy: {
          adminNotification: {
            createdAt: 'desc',
          },
        },
        take: limit,
        skip: offset,
      });

      const formatted = notifications.map((status) => ({
        id: status.adminNotification.id,
        title: status.adminNotification.title,
        body: status.adminNotification.body,
        type: status.adminNotification.type,
        data: status.adminNotification.data,
        createdAt: status.adminNotification.createdAt,
        isRead: status.isRead,
        isCleared: status.isCleared,
        isDeleted: status.isDeleted,
        readAt: status.readAt,
        clearedAt: status.clearedAt,
        deletedAt: status.deletedAt,
      }));

      return {
        data: formatted,
        meta: {
          total,
          limit,
          offset,
          page: Math.floor(offset / limit) + 1,
          hasNextPage: offset + limit < total,
          hasPrevPage: offset > 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Mark notification as read for specific admin
  async markAdminNotificationAsRead(adminId: string, notificationId: string) {
    try {
      return await this.prisma.adminNotificationStatus.update({
        where: {
          adminId_adminNotificationId: {
            adminId,
            adminNotificationId: notificationId,
          },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read for specific admin
  async markAllAdminNotificationAsRead(adminId: string) {
    try {
      return await this.prisma.adminNotificationStatus.updateMany({
        where: {
          adminId,
          isRead: false,
          isDeleted: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // Clear notification for specific admin (hide from main list but keep in database)
  async clearAdminNotification(adminId: string, notificationId: string) {
    try {
      return await this.prisma.adminNotificationStatus.update({
        where: {
          adminId_adminNotificationId: {
            adminId,
            adminNotificationId: notificationId,
          },
        },
        data: {
          isCleared: true,
          clearedAt: new Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // Clear all notifications for specific admin
  async clearAllAdminNotifications(adminId: string) {
    try {
      return await this.prisma.adminNotificationStatus.updateMany({
        where: {
          adminId,
          isCleared: false,
          isDeleted: false,
        },
        data: {
          isCleared: true,
          clearedAt: new Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // Soft delete notification for specific admin
  async deleteAdminNotification(adminId: string, notificationId: string) {
    try {
      return await this.prisma.adminNotificationStatus.update({
        where: {
          adminId_adminNotificationId: {
            adminId,
            adminNotificationId: notificationId,
          },
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  // Get notification counts for admin dashboard
  async getAdminNotificationCounts(adminId: string) {
    try {
      const [unread, total, cleared] = await Promise.all([
        this.prisma.adminNotificationStatus.count({
          where: {
            adminId,
            isRead: false,
            isCleared: false,
            isDeleted: false,
          },
        }),
        this.prisma.adminNotificationStatus.count({
          where: {
            adminId,
            isDeleted: false,
          },
        }),
        this.prisma.adminNotificationStatus.count({
          where: {
            adminId,
            isCleared: true,
            isDeleted: false,
          },
        }),
      ]);

      return {
        unread,
        total,
        cleared,
        read: total - unread,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get unread notification count for a single admin
  async getAdminUnreadCount(adminId: string) {
    try {
      const unreadCount = await this.prisma.adminNotificationStatus.count({
        where: {
          adminId: adminId,
          isRead: false,
          //isCleared: false,
          //isDeleted: false,
        },
      });
      console.log(unreadCount);

      return {
        adminId,
        unreadCount,
      };
    } catch (error) {
      throw error;
    }
  }

  // Clean up old notifications (run as a scheduled job)
  async cleanupOldAdminNotifications(daysOld: number = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Hard delete notifications older than specified days
      return await this.prisma.adminNotification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async sendEmailToWaddleTeamViaContactUsForm(
    dto: SendEmailToWaddleTeamViaContactUsFormDto,
  ) {
    try {
      const { email, name, message } = dto;
      const subject = 'New Contact Form Submission';

      const emailBody = `<p>Hello Team,</p>
<p>You’ve received a new message from the Waddle contact form:</p>
<p><b>Name</b>: ${name}</p>
<p><b>Email</b>: ${email}</p>
<p><b>Message</b>: ${message}</p>

Best regards,
`;
      await this.mailer.sendMail('iamdavidhype@gmail.com', subject, emailBody);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      throw error;
    }
  }

  async sendEmailToWaddleTeam(dto: sendEmailMobile) {
    try {
      const { message } = dto;
      const subject = 'New Contact Form Submission';

      const emailBody = `<p>Hello Team,</p>
<p>You’ve received a new message from the Waddle contact from the app:</p>
<p><b>Message</b>: ${message}</p>

Best regards,
`;
      await this.mailer.sendMail('iamdavidhype@gmail.com', subject, emailBody);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      throw error;
    }
  }
}
