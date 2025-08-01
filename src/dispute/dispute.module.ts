import { Module } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from 'src/notification/notification.module';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationHelper } from 'src/notification/notification.helper';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [DisputeController],
  providers: [DisputeService, NotificationService, NotificationHelper],
  exports: [DisputeService],
})
export class DisputeModule {}
