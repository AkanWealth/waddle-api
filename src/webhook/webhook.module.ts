import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { BookingModule } from '../booking/booking.module';
import { BookingService } from '../booking/booking.service';
import { NotificationService } from '../notification/notification.service';
import { Mailer } from '../helper';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [BookingModule, NotificationModule],
  controllers: [WebhookController],
  providers: [BookingService, NotificationService, Mailer],
})
export class WebhookModule {}
