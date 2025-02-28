import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { NotificationService } from '../notification/notification.service';

@Module({
  controllers: [BookingController],
  providers: [BookingService, NotificationService],
})
export class BookingModule {}
