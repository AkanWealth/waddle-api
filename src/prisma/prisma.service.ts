import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get<string>('DATABASE_URL'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  cleanDb() {
    return this.$transaction([
      this.event.deleteMany(),
      this.organiser.deleteMany(),
      this.user.deleteMany(),
    ]);
  }

  async getBlockedUserIds(userId?: string): Promise<string[]> {
    if (!userId) {
      return [];
    }

    const [blocked, blockedBy] = await this.$transaction([
      this.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      }),
      this.userBlock.findMany({
        where: { blockedId: userId },
        select: { blockerId: true },
      }),
    ]);

    const ids = new Set<string>();
    blocked.forEach((entry) => ids.add(entry.blockedId));
    blockedBy.forEach((entry) => ids.add(entry.blockerId));
    return Array.from(ids);
  }
}
