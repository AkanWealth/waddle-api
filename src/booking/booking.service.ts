import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BookingService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const stripeSecretKey = this.config.getOrThrow('STRIPE_SECRET_KEY');

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-01-27.acacia',
    });
  }

  // create a new booking for an event
  async createBookingAndCheckoutSession(userId: string, dto: CreateBookingDto) {
    try {
      const creatBooking = await this.prisma.booking.create({
        data: { ...dto, userId },
      });

      const booking = await this.prisma.booking.findUnique({
        where: { id: creatBooking.id },
        include: { user: true, event: true },
      });

      const session = await this.stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: booking.event.name,
                description: booking.event.description,
              },
              unit_amount: Number(booking.event.price) * 100,
            },
            quantity: dto.ticket_quantity,
          },
        ],
        mode: 'payment',
        success_url: `${this.config.getOrThrow('BASE_URL')}/feedback?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.config.getOrThrow('BASE_URL')}`,
      });

      return { checkout_url: session.url, bookingId: booking.id };
    } catch (error) {
      throw error;
    }
  }

  // checkout fulfillment confirmation function
  async fulfillCheckout(sessionId: string) {
    try {
      const checkoutSession = await this.stripe.checkout.sessions.retrieve(
        sessionId,
        {
          expand: ['line_items'],
        },
      );

      if (checkoutSession.payment_status === 'paid') {
        const bookingId = checkoutSession.metadata.bookingId;
        const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (booking.status !== 'Confirmed') {
          await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'Confirmed' },
          });

          return { message: `Booking ${bookingId} confirmed` };
        } else {
          return {
            message: `Duplicate fulfillment attempt for booking ${bookingId}`,
          };
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // stripe webhook
  async createStripeHook(payload: Buffer, signature: string) {
    console.log(payload, signature);
    const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret,
      );
      console.log(event);
    } catch (error) {
      throw error;
    }

    let data = event.data.object;
    let eventType = event.type;

    if (
      eventType === 'checkout.session.completed' ||
      eventType === 'checkout.session.async_payment_succeeded'
    ) {
      this.fulfillCheckout(data.id);
    }

    return true;
  }

  // find all bookings created
  async findAll() {
    try {
      const bookings = await this.prisma.booking.findMany({
        include: { event: true },
      });

      if (!bookings || bookings.length <= 0)
        throw new NotFoundException('No booking found');

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  // find all bookings created by a loggedin user
  async findAllForUser(userId: string) {
    try {
      const bookings = await this.prisma.booking.findMany({
        where: { userId },
        include: { event: true },
      });

      if (!bookings || bookings.length <= 0)
        throw new NotFoundException('No booking found');

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  // find a booking by id
  async findOne(id: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { event: true },
      });

      if (!booking)
        throw new NotFoundException('Booking with the provided ID not found');

      return booking;
    } catch (error) {
      throw error;
    }
  }

  // update a booking by id
  async update(id: string, dto: UpdateBookingDto) {
    try {
      const existingBooking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (!existingBooking)
        throw new NotFoundException('Booking with the provided ID not found');

      const booking = await this.prisma.booking.update({
        where: { id: existingBooking.id },
        data: <any>{ ...dto },
      });

      return booking;
    } catch (error) {
      throw error;
    }
  }

  // delete a booking by id
  async remove(id: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
      });

      if (!booking)
        throw new NotFoundException('Booking with the provided ID not found');

      await this.prisma.booking.delete({ where: { id: booking.id } });
    } catch (error) {
      throw error;
    }
  }
}
