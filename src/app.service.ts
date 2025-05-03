import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  // function to delete old balcklisted token
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

  // cron job to run the task
  @Cron('0 0 * * *') // runs every day at midnight
  async scheduleDeleteOldBlacklistedToken() {
    await this.deleteOldBlacklistedToken();
  }
}
