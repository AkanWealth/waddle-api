import {
  BadRequestException,
  Injectable,
  NotFoundException,
  RawBodyRequest,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../notification/notification.service';
import { Mailer } from '../helper';
import { BookingConsentDto, CreateRefundDto } from './dto';
import { NotificationHelper } from 'src/notification/notification.helper';
import { PaymentService } from '../payment/payment.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notification: NotificationService,
    private mailer: Mailer,
    private notificationHelper: NotificationHelper,
    private paymentService: PaymentService, // Inject PaymentService
  ) {
    const stripeSecretKey = this.config.getOrThrow('STRIPE_SECRET_KEY');

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  // create a new booking for an event
  async createBookingAndCheckoutSession(userId: string, dto: CreateBookingDto) {
    try {
      const createBooking = await this.prisma.booking.create({
        data: { ...dto, userId },
      });

      const booking = await this.prisma.booking.findUnique({
        where: { id: createBooking.id },
        include: { user: true, event: true },
      });

      // Create a payment record with status PENDING (transactionId = booking.id for now)
      await this.paymentService.createPayment({
        transactionId: booking.id,
        bookingId: booking.id,
        userId: booking.userId,
        eventId: booking.eventId,
        username: booking.user.name,
        eventName: booking.event.name,
        amount: Number(booking.event.price) * booking.ticket_quantity,
        status: PaymentStatus.PENDING,
        method: 'stripe',
        processingFee: 0, // Set actual fee if available
        netAmount: 0, // Set actual net if available
        amountPaid: 0, // Set actual paid if available
      });

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
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
        success_url: `${this.config.getOrThrow('BASE_URL')}/confirmaion?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.config.getOrThrow('BASE_URL')}`,
      });

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          sessionId: session.id,
        },
      });

      // Update the payment record with the Stripe session ID as transactionId
      await this.paymentService.updatePaymentByBookingId(booking.id, {
        transactionId: session.id,
      });

      return { checkout_url: session.url, bookingId: booking.id };
    } catch (error) {
      throw error;
    }
  }

  async bookingConsent(dto: BookingConsentDto) {
    try {
      const consent = await this.prisma.consent.create({
        data: <any>{ ...dto },
      });

      return {
        message: 'Booking consent added',
        consent,
      };
    } catch (error) {
      throw error;
    }
  }

  // checkout fulfillment confirmation function
  private async fulfillCheckout(sessionId: string) {
    try {
      const checkoutSession = await this.stripe.checkout.sessions.retrieve(
        sessionId,
        {
          expand: ['line_items'],
        },
      );
      console.log('checkoutSession', checkoutSession);

      // condition for payment status
      if (checkoutSession.payment_status === 'paid') {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          checkoutSession.payment_intent as string,
          {
            expand: ['charges.data.balance_transaction'],
          },
        );

        const booking = await this.prisma.booking.findFirst({
          where: { sessionId: checkoutSession.id },
          include: { event: true, user: true },
        });

        if (!booking) throw new NotFoundException('Booking not found');

        if (booking.status !== 'Confirmed') {
          await this.prisma.booking.update({
            where: { id: booking.id, payment_intent: paymentIntent.id },
            data: { status: 'Confirmed' },
          });

          // Update payment status to SUCCESSFUL
          await this.paymentService.updatePaymentStatusByTransactionId(
            sessionId,
            { status: PaymentStatus.SUCCESSFUL },
          );

          if (booking.user.fcmIsOn) {
            await this.notificationHelper.sendBookingConfirmation(
              booking.userId,
              booking.event.name,
            );
          }

          await this.prisma.event.update({
            where: { id: booking.event.id },
            data: {
              ticket_booked: ++booking.ticket_quantity,
            },
          });

          const subject = 'Booking Confirmation';
          const message = `<p>Hello,</p>

          <p>Thank you for booking the event <b>${booking.event.name}</b>, your booking id is <b>${booking.id}</b> to verify your email account.</p>

          <p>Warm regards,</p>

          <p>Waddle Team</p>
          `;

          await this.mailer.sendMail(booking.user.email, subject, message);

          return { message: `Booking ${checkoutSession.id} confirmed` };
        } else {
          return {
            message: `Duplicate fulfillment attempt for booking ${checkoutSession.id}`,
          };
        }
      } else {
        const booking = await this.prisma.booking.findFirst({
          where: { sessionId: checkoutSession.id },
        });

        if (!booking) throw new NotFoundException('Booking not found');

        if (booking.status !== 'Failed') {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'Failed' },
          });

          // Update payment status to FAILED
          await this.paymentService.updatePaymentStatusByTransactionId(
            sessionId,
            { status: PaymentStatus.FAILED },
          );

          return { message: `Booking ${checkoutSession.id} failed` };
        } else {
          return {
            message: `Duplicate fulfillment attempt for booking ${checkoutSession.id}`,
          };
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // stripe webhook
  async createStripeHook(payload: RawBodyRequest<Request>, signature: string) {
    const endpointSecret = this.config.getOrThrow('STRIPE_ENDPOINT_SECRET');
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload.rawBody,
        signature,
        endpointSecret,
      );
      console.log('Webhook verified');
    } catch (error) {
      console.log('Webhook error', error.message);
      throw error;
    }
    const data = event.data.object;
    const eventType = event.type;

    if (
      eventType === 'checkout.session.completed' ||
      eventType === 'checkout.session.async_payment_succeeded'
    ) {
      this.fulfillCheckout(data.id);
    }

    return { received: true };
  }

  // view all bookings
  async viewAllBookings() {
    try {
      const bookings = await this.prisma.booking.findMany({
        include: {
          event: {
            include: {
              organiser: true,
            },
          },
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!bookings || bookings.length <= 0)
        throw new NotFoundException('No booking found');

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  // find all my bookings as the event creator
  async viewMyBookingsAsOrganiser(userId: string) {
    try {
      const bookings = await this.prisma.booking.findMany({
        where: { event: { organiserId: userId } },
        include: { event: true, user: true },
      });

      if (!bookings || bookings.length <= 0)
        throw new NotFoundException('No booking found');

      return { message: 'Bookings found', bookings };
    } catch (error) {
      throw error;
    }
  }

  // find all my bookings as the admin
  async viewBookingsAsAdmin(userId: string) {
    try {
      const bookings = await this.prisma.booking.findMany({
        where: { event: { adminId: userId } },
        include: { event: true, user: true },
      });

      if (!bookings || bookings.length <= 0)
        throw new NotFoundException('No booking found');

      return { message: 'Bookings found', bookings };
    } catch (error) {
      throw error;
    }
  }

  // find all bookings created by a loggedin user
  async viewAllBookingForUser(userId: string, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [bookings, total] = await this.prisma.$transaction([
        this.prisma.booking.findMany({
          where: { userId },
          include: { event: true },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.booking.count({ where: { userId } }),
      ]);

      return {
        message: 'Bookings found',
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        bookings,
      };
    } catch (error) {
      throw error;
    }
  }

  // find a booking by id
  async viewBooking(id: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { event: true, user: true },
      });

      if (!booking)
        throw new NotFoundException('Booking with the provided ID not found');

      return booking;
    } catch (error) {
      throw error;
    }
  }

  // update a booking by id
  async updateBooking(id: string, dto: UpdateBookingDto) {
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
  async cancelBooking(dto: CreateRefundDto) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.id },
        include: { event: true, user: true },
      });

      if (!booking)
        throw new NotFoundException('Booking with the provided ID not found');
      if (booking.user.fcmIsOn) {
        await this.notificationHelper.sendBookingCancel(
          booking.userId,
          booking.user.name,
          booking.event.name,
        );
      }

      const refund = await this.stripe.refunds.create({
        payment_intent: dto.payment_intent,
      });

      if (!refund) throw new Error('Unable to create a refund');

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'Cancelled',
        },
      });

      const subject = 'Booking Confirmation';
      const message = `<p>Hello,</p>

      <p>Thank you for booking the event <b>${booking.event.name}</b>, your booking id is <b>${booking.id}</b> to verify your email account.</p>

      <p>Warm regards,</p>

      <p>Waddle Team</p>
      `;

      await this.mailer.sendMail(booking.user.email, subject, message);
    } catch (error) {
      throw error;
    }
  }

  async payoutBooking(
    payoutAccountId: string,
    amount: number,
    description: string,
  ) {
    try {
      if (amount <= 0)
        throw new BadRequestException('Amount must be greater than zero');

      const payout = await this.stripe.payouts.create({
        amount,
        currency: 'usd',
        statement_descriptor: 'Event Payout',
        destination: payoutAccountId,
        description,
        method: 'standard',
      });
      if (!payout) throw new Error('Unable to payout!');

      return { message: 'Payout initiated', payout };
    } catch (error) {
      throw error;
    }
  }

  async getRevenuePerVendor() {
    const organisers = await this.prisma.organiser.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        events: {
          where: {
            isDeleted: false,
          },
          include: {
            bookings: {
              where: {
                isDeleted: false,
                status: 'Confirmed',
              },
            },
          },
        },
      },
    });

    return organisers.map((organiser) => {
      const totalEvents = organiser.events.length;

      let totalBookings = 0;
      let revenue = 0;

      organiser.events.forEach((event) => {
        const eventRevenue = event.bookings.reduce((sum, booking) => {
          return sum + booking.ticket_quantity * Number(event.price);
        }, 0);

        revenue += eventRevenue;
        totalBookings += event.bookings.length;
      });

      return {
        name: organiser.business_name,
        representative: organiser.name,
        totalEvents,
        totalBookings,
        revenue,
      };
    });
  }

  async getBookingReport() {
    const bookings = await this.prisma.booking.findMany({
      where: {
        isDeleted: false,
        event: {
          isDeleted: false,
        },
      },
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const transformed = bookings.map((booking, index) => ({
      id: index + 1,
      name: booking.event?.name ?? 'Unknown',
      date: booking.event?.date.toISOString().split('T')[0],
      status: this.mapStatus(booking.status),
      revenue:
        Number(booking.ticket_quantity) * Number(booking.event?.price ?? 0),
    }));

    return transformed;
  }

  private mapStatus(status: string): string {
    if (status === 'Confirmed') return 'Completed';
    if (status === 'Cancelled') return 'Cancelled';
    return 'Pending';
  }

  async getOrganiserReport(organiserId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const bookings = await this.prisma.booking.findMany({
      where: {
        isDeleted: false,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        event: {
          organiserId,
          isDeleted: false,
        },
      },
      include: {
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const bookingRows = bookings.map((b, i) => ({
      id: i + 1,
      name: b.event?.name ?? 'Unknown',
      date: b.event?.date.toISOString().split('T')[0],
      status: b.status,
      revenue: Number(b.ticket_quantity) * Number(b.event?.price ?? 0),
    }));

    const totalBookings = bookingRows.length;
    const totalCancelled = bookingRows.filter(
      (b) => b.status === 'Cancelled',
    ).length;
    const totalRevenue = bookingRows.reduce((sum, b) => sum + b.revenue, 0);

    const chart = this.generateChartData(bookingRows, fromDate, toDate);

    const organiser = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
    });

    return {
      summary: {
        name: organiser?.business_name ?? '',
        email: organiser?.email,
        phone: organiser?.phone_number,
        address: organiser?.address,
        website: organiser?.website_url,
      },
      stats: {
        totalBookings,
        totalCancelled,
        totalRevenue,
      },
      chart,
      bookings: bookingRows,
    };
  }

  private generateChartData(
    bookings: { date: string; revenue: number }[],
    from: Date,
    to: Date,
  ): { month: string; revenue: number }[] {
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

    const groupBy: 'day' | 'week' | 'month' =
      diffDays <= 30 ? 'day' : diffDays <= 90 ? 'week' : 'month';

    const buckets: Record<string, number> = {};

    for (const booking of bookings) {
      const date = new Date(booking.date);
      let label: string;

      if (groupBy === 'day') {
        label = date.toISOString().split('T')[0]; // e.g. "2024-01-05"
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        label = `Week of ${weekStart.toISOString().split('T')[0]}`;
      } else {
        label = date.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        }); // e.g. "Jun 2025"
      }

      buckets[label] = (buckets[label] || 0) + booking.revenue;
    }

    return Object.entries(buckets)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
