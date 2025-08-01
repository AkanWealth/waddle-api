import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { NotificationService } from '../notification/notification.service';
import { Mailer } from '../helper';
import { NotificationModule } from 'src/notification/notification.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [NotificationModule, PaymentModule],
  controllers: [BookingController],
  providers: [BookingService, NotificationService, Mailer],
})
export class BookingModule {}
