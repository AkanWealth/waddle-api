import { Controller, Post, Req, RawBodyRequest } from '@nestjs/common';
import { BookingService } from '../booking/booking.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('stripe')
  createHook(@Req() request: RawBodyRequest<Request>) {
    return this.bookingService.createStripeHook(
      request.rawBody,
      request.headers['stripe-signature'],
    );
  }
}
