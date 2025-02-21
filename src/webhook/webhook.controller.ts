import { Controller, Post, Req, RawBodyRequest, Headers } from '@nestjs/common';
import { BookingService } from '../booking/booking.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('stripe')
  createHook(
    @Headers() headers: Record<string, string>,
    @Req() request: RawBodyRequest<Request>,
  ) {
    const payload = request;
    const signature = headers['stripe-signature'];

    if (!signature) {
      console.error('Missing Stripe signature');
      return { error: 'Missing Stripe signature' };
    }

    return this.bookingService.createStripeHook(payload, signature);
  }
}
