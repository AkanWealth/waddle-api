import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { BookingModule } from '../booking/booking.module';
import { BookingService } from '../booking/booking.service';
import { NotificationService } from '../notification/notification.service';

@Module({
  imports: [BookingModule],
  controllers: [WebhookController],
  providers: [BookingService, NotificationService],
})
export class WebhookModule {}
