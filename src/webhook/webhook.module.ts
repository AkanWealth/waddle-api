import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { BookingModule } from '../booking/booking.module';
import { BookingService } from '../booking/booking.service';
import { NotificationService } from '../notification/notification.service';
import { Mailer } from 'src/helper';

@Module({
  imports: [BookingModule],
  controllers: [WebhookController],
  providers: [BookingService, NotificationService, Mailer],
})
export class WebhookModule {}
