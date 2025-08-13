// import { Controller, Post, Req, RawBodyRequest, Headers } from '@nestjs/common';
// import { BookingService } from '../booking/booking.service';
// import { ApiExcludeEndpoint } from '@nestjs/swagger';

// @Controller('webhook')
// export class WebhookController {
//   constructor(private readonly bookingService: BookingService) {}

//   @ApiExcludeEndpoint()
//   @Post('stripe')
//   createHook(
//     @Headers() headers: Record<string, string>,
//     @Req() request: RawBodyRequest<Request>,
//   ) {
//     const payload = request;
//     const signature = headers['stripe-signature'];
//     console.log('Testinnnnnnnnnnnng our payload', payload);

//     if (!signature) {
//       console.error('Missing Stripe signature');
//       return { error: 'Missing Stripe signature' };
//     }

//     return this.bookingService.createStripeHook(payload, signature);
//   }
// }

import { Controller, Post, Req, Headers } from '@nestjs/common';
import { BookingService } from '../booking/booking.service';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiExcludeEndpoint()
  @Post('stripe')
  async createHook(
    @Headers('stripe-signature') signature: string,
    @Req() request: any,
  ) {
    console.log('Webhook request received');
    console.log('Content-Type:', request.headers['content-type']);
    console.log('Signature present:', !!signature);
    console.log('Full signature header:', signature);
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);

    // Get the raw body from the request
    const rawBody = request.body;

    // Additional debugging
    console.log('Request body keys:', Object.keys(request));
    console.log('Request body constructor:', request.body?.constructor?.name);

    console.log('Raw body type:', typeof rawBody);
    console.log('Raw body is Buffer:', Buffer.isBuffer(rawBody));
    console.log('Raw body length:', rawBody ? rawBody.length : 'undefined');

    // Debug: log first 100 characters of the raw body
    if (rawBody) {
      console.log('Raw body preview:', rawBody.toString().substring(0, 100));
    }

    if (!rawBody) {
      console.error('No raw body found in request');
      throw new Error('No webhook payload was provided');
    }

    if (!signature) {
      console.error('Missing Stripe signature');
      throw new Error('Missing Stripe signature');
    }

    // For Stripe webhooks, we need to pass the raw body as-is
    // With NestJS body parser, the raw body should be available as a Buffer
    let payload: Buffer;
    if (Buffer.isBuffer(rawBody)) {
      payload = rawBody;
    } else if (typeof rawBody === 'string') {
      payload = Buffer.from(rawBody, 'utf8');
    } else {
      // If it's an object, this means the JSON parser got to it first
      // We need to convert it back to the original JSON string
      console.warn(
        'Raw body is not a Buffer or string, converting from object',
      );
      payload = Buffer.from(JSON.stringify(rawBody), 'utf8');
    }

    console.log('Final payload is Buffer:', Buffer.isBuffer(payload));
    console.log('Final payload length:', payload.length);

    return this.bookingService.createStripeHook(payload, signature);
  }
}
