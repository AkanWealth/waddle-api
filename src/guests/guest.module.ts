import { Module } from '@nestjs/common';
import { GuestService } from './guest.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GuestController } from './guest.controller';

@Module({
  controllers: [GuestController],
  providers: [GuestService, PrismaService, ConfigService],
})
export class GuestModule {}
