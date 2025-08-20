import { PrismaService } from './../prisma/prisma.service';

export class Cleaner {
  constructor(private prisma: PrismaService) {}

  async deleteOldBlacklistedToken() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await this.prisma.blacklistedToken.deleteMany({
      where: {
        createdAt: {
          lte: threeDaysAgo,
        },
      },
    });
  }

  async removePendingBooking() {
    await this.prisma.booking.deleteMany({ where: { status: 'Pending' } });
  }

  async deleteOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete old regular notifications (for users and organisers)
    await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    // Delete old admin notification statuses first (due to foreign key constraint)
    await this.prisma.adminNotificationStatus.deleteMany({
      where: {
        adminNotification: {
          createdAt: {
            lte: thirtyDaysAgo,
          },
        },
      },
    });

    // Then delete old admin notifications
    await this.prisma.adminNotification.deleteMany({
      where: {
        createdAt: {
          lte: thirtyDaysAgo,
        },
      },
    });
  }
}
