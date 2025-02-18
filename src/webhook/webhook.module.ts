import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { BookingModule } from '../booking/booking.module';
import { BookingService } from '../booking/booking.service';

@Module({
  imports: [BookingModule],
  controllers: [WebhookController],
  providers: [BookingService],
})
export class WebhookModule {}
