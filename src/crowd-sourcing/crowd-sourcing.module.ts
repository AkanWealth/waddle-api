import { Module } from '@nestjs/common';
import { CrowdSourcingService } from './crowd-sourcing.service';
import { CrowdSourcingController } from './crowd-sourcing.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [CrowdSourcingController],
  providers: [CrowdSourcingService],
})
export class CrowdSourcingModule {}
