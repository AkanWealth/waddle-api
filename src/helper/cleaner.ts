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
}
