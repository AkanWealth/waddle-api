import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { NotificationService } from '../notification/notification.service';
import { Mailer } from '../helper';
import { NotificationModule } from 'src/notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { OrganiserModule } from 'src/organiser/organiser.module';
import { OrganiserService } from 'src/organiser/organiser.service';

@Module({
  imports: [NotificationModule, PaymentModule, OrganiserModule],
  controllers: [BookingController],
  providers: [BookingService, NotificationService, Mailer, OrganiserService],
})
export class BookingModule {}
