import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { BookingModule } from '../booking/booking.module';
import { BookingService } from '../booking/booking.service';
import { NotificationService } from '../notification/notification.service';
import { Mailer } from '../helper';
import { NotificationModule } from 'src/notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { OrganiserModule } from 'src/organiser/organiser.module';
import { OrganiserService } from 'src/organiser/organiser.service';

@Module({
  imports: [BookingModule, NotificationModule, PaymentModule, OrganiserModule],
  controllers: [WebhookController],
  providers: [BookingService, NotificationService, Mailer, OrganiserService],
})
export class WebhookModule {}
