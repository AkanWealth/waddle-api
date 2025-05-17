import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { NotificationService } from '../notification/notification.service';
import { Mailer } from 'src/helper';

@Module({
  controllers: [BookingController],
  providers: [BookingService, NotificationService, Mailer],
})
export class BookingModule {}
