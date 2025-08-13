import {
  BadRequestException,
  Injectable,
  NotFoundException,
  // RawBodyRequest,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingIntentDto } from './dto/create-booking-intent.dto';
import { PaymentSuccessDto, PaymentFailureDto } from './dto';
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
  // async createBookingAndCheckoutSession(userId: string, dto: CreateBookingDto) {
  //   try {
  //     const createBooking = await this.prisma.booking.create({
  //       data: { ...dto, userId },
  //     });

  //     const booking = await this.prisma.booking.findUnique({
  //       where: { id: createBooking.id },
  //       include: { user: true, event: true },
  //     });

  //     // Create a payment record with status PENDING (transactionId = booking.id for now)
  //     await this.paymentService.createPayment({
  //       transactionId: booking.id,
  //       bookingId: booking.id,
  //       userId: booking.userId,
  //       eventId: booking.eventId,
  //       username: booking.user.name,
  //       eventName: booking.event.name,
  //       amount: Number(booking.event.price) * booking.ticket_quantity,
  //       status: PaymentStatus.PENDING,
  //       method: 'stripe',
  //       processingFee: 0, // Set actual fee if available
  //       netAmount: 0, // Set actual net if available
  //       amountPaid: 0, // Set actual paid if available
  //     });

  //     const session = await this.stripe.checkout.sessions.create({
  //       payment_method_types: ['card'],
  //       line_items: [
  //         {
  //           price_data: {
  //             currency: 'usd',
  //             product_data: {
  //               name: booking.event.name,
  //               description: booking.event.description,
  //             },
  //             unit_amount: Number(booking.event.price) * 100,
  //           },
  //           quantity: dto.ticket_quantity,
  //         },
  //       ],
  //       mode: 'payment',
  //       success_url: `${this.config.getOrThrow('BASE_URL')}/confirmaion?session_id={CHECKOUT_SESSION_ID}`,
  //       cancel_url: `${this.config.getOrThrow('BASE_URL')}`,
  //     });

  //     await this.prisma.booking.update({
  //       where: { id: booking.id },
  //       data: {
  //         sessionId: session.id,
  //       },
  //     });

  //     // Update the payment record with the Stripe session ID as transactionId
  //     await this.paymentService.updatePaymentByBookingId(booking.id, {
  //       transactionId: session.id,
  //     });

  //     return { checkout_url: session.url, bookingId: booking.id };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async createBookingAndCheckoutSession(userId: string, dto: CreateBookingDto) {
    try {
      const createBooking = await this.prisma.booking.create({
        data: { ...dto, userId },
      });

      const booking = await this.prisma.booking.findUnique({
        where: { id: createBooking.id },
        include: {
          user: true,
          event: {
            include: {
              organiser: true,
            },
          },
        },
      });

      if (!booking.event.organiser?.stripe_account_id) {
        throw new Error('Organiser has not connected their Stripe account');
      }

      const eventPrice = Number(booking.event.price);
      const amount = eventPrice * booking.ticket_quantity;

      // Record pending payment
      await this.paymentService.createPayment({
        transactionId: booking.id,
        bookingId: booking.id,
        userId: booking.userId,
        eventId: booking.eventId,
        username: booking.user.name,
        eventName: booking.event.name,
        amount,
        status: PaymentStatus.PENDING,
        method: 'stripe',
        processingFee: 0,
        netAmount: 0,
        amountPaid: 0,
      });

      // Your platform fee (example: 15% commission)
      const platformFee = Math.round(amount * 0.15 * 100); // in pence

      // Create Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: booking.event.name,
                description: booking.event.description || '',
              },
              unit_amount: Math.round(eventPrice * 100), // pence
            },
            quantity: dto.ticket_quantity,
          },
        ],
        mode: 'payment',
        success_url: `${this.config.getOrThrow('BASE_URL')}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.config.getOrThrow('BASE_URL')}`,
        payment_intent_data: {
          application_fee_amount: platformFee, // your cut in pence
          transfer_data: {
            destination: booking.event.organiser.stripe_account_id, // send rest to organiser
          },
        },
      });

      // Save Stripe session ID to booking
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { sessionId: session.id },
      });

      // Update payment record with Stripe session ID
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
  // private async fulfillCheckout(sessionId: string) {
  //   try {
  //     const checkoutSession = await this.stripe.checkout.sessions.retrieve(
  //       sessionId,
  //       {
  //         expand: ['line_items'],
  //       },
  //     );
  //     console.log('checkoutSession', checkoutSession);

  //     // condition for payment status
  //     if (checkoutSession.payment_status === 'paid') {
  //       const paymentIntent = await this.stripe.paymentIntents.retrieve(
  //         checkoutSession.payment_intent as string,
  //         {
  //           expand: ['charges.data.balance_transaction'],
  //         },
  //       );

  //       const booking = await this.prisma.booking.findFirst({
  //         where: { sessionId: checkoutSession.id },
  //         include: { event: true, user: true },
  //       });

  //       if (!booking) throw new NotFoundException('Booking not found');

  //       if (booking.status !== 'Confirmed') {
  //         await this.prisma.booking.update({
  //           where: { id: booking.id, payment_intent: paymentIntent.id },
  //           data: { status: 'Confirmed' },
  //         });

  //         // Update payment status to SUCCESSFUL
  //         await this.paymentService.updatePaymentStatusByTransactionId(
  //           sessionId,
  //           { status: PaymentStatus.SUCCESSFUL },
  //         );

  //         if (booking.user.fcmIsOn) {
  //           await this.notificationHelper.sendBookingConfirmation(
  //             booking.userId,
  //             booking.event.name,
  //           );
  //         }

  //         await this.prisma.event.update({
  //           where: { id: booking.event.id },
  //           data: {
  //             ticket_booked: ++booking.ticket_quantity,
  //           },
  //         });

  //         const subject = 'Booking Confirmation';
  //         const message = `<p>Hello,</p>

  //         <p>Thank you for booking the event <b>${booking.event.name}</b>, your booking id is <b>${booking.id}</b> to verify your email account.</p>

  //         <p>Warm regards,</p>

  //         <p>Waddle Team</p>
  //         `;

  //         await this.mailer.sendMail(booking.user.email, subject, message);

  //         return { message: `Booking ${checkoutSession.id} confirmed` };
  //       } else {
  //         return {
  //           message: `Duplicate fulfillment attempt for booking ${checkoutSession.id}`,
  //         };
  //       }
  //     } else {
  //       const booking = await this.prisma.booking.findFirst({
  //         where: { sessionId: checkoutSession.id },
  //       });

  //       if (!booking) throw new NotFoundException('Booking not found');

  //       if (booking.status !== 'Failed') {
  //         await this.prisma.booking.update({
  //           where: { id: booking.id },
  //           data: { status: 'Failed' },
  //         });

  //         // Update payment status to FAILED
  //         await this.paymentService.updatePaymentStatusByTransactionId(
  //           sessionId,
  //           { status: PaymentStatus.FAILED },
  //         );

  //         return { message: `Booking ${checkoutSession.id} failed` };
  //       } else {
  //         return {
  //           message: `Duplicate fulfillment attempt for booking ${checkoutSession.id}`,
  //         };
  //       }
  //     }
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  async fulfillCheckout(sessionId: string) {
    try {
      const checkoutSession = await this.stripe.checkout.sessions.retrieve(
        sessionId,
        {
          expand: ['line_items', 'payment_intent'],
        },
      );

      console.log('Checkout session retrieved:', checkoutSession.id);

      // Find the booking associated with this session
      const booking = await this.prisma.booking.findFirst({
        where: { sessionId: checkoutSession.id },
        include: {
          event: {
            include: {
              organiser: true,
            },
          },
          user: true,
        },
      });

      if (!booking) {
        console.error(`No booking found for session ${sessionId}`);
        throw new NotFoundException('Booking not found');
      }

      // Handle successful payment
      if (checkoutSession.payment_status === 'paid') {
        const paymentIntent = checkoutSession.payment_intent as any;

        // Calculate amounts
        const totalAmount =
          Number(booking.event.price) * booking.ticket_quantity;
        const platformFeeRate = 0.15; // 15%
        const platformFee = totalAmount * platformFeeRate;
        const organiserAmount = totalAmount - platformFee;

        // Get Stripe fees (if available from expanded payment intent)
        let stripeFee = 0;
        if (
          paymentIntent &&
          paymentIntent.charges &&
          paymentIntent.charges.data.length > 0
        ) {
          const charge = paymentIntent.charges.data[0];
          if (charge.balance_transaction) {
            stripeFee = charge.balance_transaction.fee / 100; // Convert from cents
          }
        }

        const netAmount = organiserAmount - stripeFee;

        // Only update if booking is not already confirmed (prevent duplicate processing)
        if (booking.status !== 'Confirmed') {
          // Update booking status
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: 'Confirmed',
              payment_intent: paymentIntent.id,
            },
          });

          // Update payment record with detailed information
          await this.paymentService.updatePaymentStatusByTransactionId(
            sessionId,
            { status: PaymentStatus.SUCCESSFUL },
          );

          // Update payment with detailed fee and amount information
          await this.prisma.payment.updateMany({
            where: { transactionId: sessionId },
            data: {
              processingFee: stripeFee,
              netAmount: netAmount,
              amountPaid: totalAmount,
            },
          });

          // Update event ticket count
          await this.prisma.event.update({
            where: { id: booking.event.id },
            data: {
              ticket_booked: {
                increment: booking.ticket_quantity,
              },
            },
          });

          // Send notification if user has FCM enabled
          if (booking.user.fcmIsOn) {
            await this.notificationHelper.sendBookingConfirmation(
              booking.userId,
              booking.event.name,
            );
          }

          // Send confirmation email
          const subject = 'Booking Confirmation';
          const message = `
          <p>Hello ${booking.user.name},</p>
          <p>Thank you for booking the event <strong>${booking.event.name}</strong>!</p>
          <p>Your booking ID is: <strong>${booking.id}</strong></p>
          <p>Event Details:</p>
          <ul>
            <li>Event: ${booking.event.name}</li>
            <li>Date: ${booking.event.date ? new Date(booking.event.date).toLocaleDateString() : 'TBA'}</li>
            <li>Time: ${booking.event.time || 'TBA'}</li>
            <li>Tickets: ${booking.ticket_quantity}</li>
            <li>Total Paid: £${totalAmount.toFixed(2)}</li>
          </ul>
          <p>We look forward to seeing you at the event!</p>
          <p>Warm regards,</p>
          <p>Waddle Team</p>
        `;

          await this.mailer.sendMail(booking.user.email, subject, message);

          console.log(`Booking ${booking.id} confirmed successfully`);
          return { message: `Booking ${sessionId} confirmed` };
        } else {
          console.log(`Duplicate fulfillment attempt for booking ${sessionId}`);
          return {
            message: `Duplicate fulfillment attempt for booking ${sessionId}`,
          };
        }
      } else {
        // Handle failed/unpaid checkout
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

          console.log(`Booking ${booking.id} marked as failed`);
          return { message: `Booking ${sessionId} failed` };
        } else {
          return {
            message: `Duplicate failure handling for booking ${sessionId}`,
          };
        }
      }
    } catch (error) {
      console.error('Error in fulfillCheckout:', error);
      throw error;
    }
  }

  private async handlePaymentFailed(paymentIntentId: string) {
    try {
      // Find booking by payment intent ID
      const booking = await this.prisma.booking.findFirst({
        where: { payment_intent: paymentIntentId },
        include: { user: true, event: true },
      });

      if (!booking) {
        console.log(
          `No booking found for failed payment intent ${paymentIntentId}`,
        );
        return;
      }

      if (booking.status !== 'Failed') {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'Failed' },
        });

        // Update payment status
        await this.prisma.payment.updateMany({
          where: { bookingId: booking.id },
          data: { status: PaymentStatus.FAILED },
        });

        // Optionally send failure notification
        if (booking.user.fcmIsOn) {
          await this.notificationHelper.sendBookingCancel(
            booking.userId,
            booking.user.name,
            booking.event.name,
          );
        }

        console.log(
          `Booking ${booking.id} marked as failed due to payment failure`,
        );
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  private async handleCheckoutExpired(sessionId: string) {
    try {
      const booking = await this.prisma.booking.findFirst({
        where: { sessionId: sessionId },
      });

      if (!booking) {
        console.log(`No booking found for expired session ${sessionId}`);
        return;
      }

      if (booking.status === 'Pending') {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'Cancelled' },
        });

        // Update payment status
        await this.prisma.payment.updateMany({
          where: { bookingId: booking.id },
          data: { status: PaymentStatus.CANCELLED },
        });

        console.log(
          `Booking ${booking.id} cancelled due to session expiration`,
        );
      }
    } catch (error) {
      console.error('Error handling checkout expiration:', error);
    }
  }

  // stripe webhook
  // async createStripeHook(payload: RawBodyRequest<Request>, signature: string) {
  //   const endpointSecret = this.config.getOrThrow('STRIPE_ENDPOINT_SECRET');
  //   let event: any;

  //   try {
  //     event = this.stripe.webhooks.constructEvent(
  //       payload.rawBody,
  //       signature,
  //       endpointSecret,
  //     );
  //     console.log('Webhook verified');
  //   } catch (error) {
  //     console.log('Webhook error', error.message);
  //     throw error;
  //   }

  //   const data = event.data.object;
  //   const eventType = event.type;

  //   console.log('Event type:', eventType);
  //   console.log('Testinnnnnnnnnnnng');
  //   console.log('Data:', data);
  //   try {
  //     switch (eventType) {
  //       case 'checkout.session.completed':
  //       case 'checkout.session.async_payment_succeeded':
  //         console.log('Fulfilling checkout');
  //         await this.fulfillCheckout(data.id);
  //         break;

  //       case 'payment_intent.payment_failed':
  //         console.log('Handling payment failed');
  //         await this.handlePaymentFailed(data.id);
  //         break;

  //       case 'checkout.session.expired':
  //         console.log('Handling checkout expired');
  //         await this.handleCheckoutExpired(data.id);
  //         break;

  //       default:
  //         console.log(`Unhandled event type: ${eventType}`);
  //     }
  //   } catch (error) {
  //     console.error(`Error processing webhook event ${eventType}:`, error);
  //     // Don't throw here - we want to return 200 to Stripe even if processing fails
  //     // to avoid webhook retries for unrecoverable errors
  //   }

  //   return { received: true };
  // }
  // async createStripeHook(payload: Buffer, signature: string) {
  //   const endpointSecret = this.config.getOrThrow('STRIPE_ENDPOINT_SECRET');

  //   let event;
  //   try {
  //     event = this.stripe.webhooks.constructEvent(
  //       payload, // must be raw Buffer
  //       signature,
  //       endpointSecret,
  //     );
  //     console.log('Webhook verified:', event.type);
  //   } catch (err) {
  //     console.error('Webhook signature verification failed:', err.message);
  //     throw err;
  //   }

  //   const data = event.data.object;
  //   const eventType = event.type;

  //   console.log('Event type:', eventType);
  //   console.log('Data:', data);

  //   switch (eventType) {
  //     case 'checkout.session.completed':
  //     case 'checkout.session.async_payment_succeeded':
  //       console.log('Fulfilling checkout');
  //       await this.fulfillCheckout(data.id);
  //       break;
  //     case 'payment_intent.payment_failed':
  //       console.log('Handling payment failed');
  //       await this.handlePaymentFailed(data.id);
  //       break;
  //     case 'checkout.session.expired':
  //       console.log('Handling checkout expired');
  //       await this.handleCheckoutExpired(data.id);
  //       break;
  //     default:
  //       console.log(`Unhandled event type: ${eventType}`);
  //   }

  //   return { received: true };
  // }

  async createStripeHook(payload: Buffer, signature: string) {
    const endpointSecret = this.config.getOrThrow('STRIPE_ENDPOINT_SECRET');

    // Debug information
    console.log('=== Stripe Webhook Debug Info ===');
    console.log('Payload is Buffer:', Buffer.isBuffer(payload));
    console.log('Payload length:', payload.length);
    console.log('Signature:', signature);
    console.log('Endpoint secret present:', !!endpointSecret);
    console.log('Endpoint secret length:', endpointSecret?.length);

    // Log first 200 characters of payload for debugging
    console.log('Payload preview:', payload.toString('utf8').substring(0, 200));

    // Try to parse the signature header
    if (signature) {
      const sigParts = signature.split(',');
      console.log('Signature parts:', sigParts);
    }

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload, // must be raw Buffer
        signature,
        endpointSecret,
      );
      console.log('✅ Webhook verified successfully:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);

      // Additional debugging for signature verification
      console.log('Trying manual signature verification...');

      // Log what we're actually sending to Stripe
      console.log('Payload type being sent to Stripe:', typeof payload);
      console.log('Payload constructor:', payload.constructor.name);

      throw err;
    }

    const data = event.data.object;
    const eventType = event.type;

    console.log('Event type:', eventType);
    console.log('Data:', data);

    switch (eventType) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        console.log('Fulfilling checkout');
        await this.fulfillCheckout(data.id);
        break;
      case 'payment_intent.payment_failed':
        console.log('Handling payment failed');
        await this.handlePaymentFailed(data.id);
        break;
      case 'checkout.session.expired':
        console.log('Handling checkout expired');
        await this.handleCheckoutExpired(data.id);
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
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
      console.log('bookings', bookings);

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
      // const bookings = await this.prisma.booking.findMany({
      //   where: { event: { adminId: userId } },
      //   include: { event: true, user: true },
      // });

      const bookings = await this.prisma.booking.findMany({
        include: {
          event: true,
          user: true,
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      console.log('userId', userId);
      console.log('bookings for admin', bookings);

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
          take: Number(limit),
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
        website: organiser?.business_url,
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

  async createBookingIntent(userId: string, dto: CreateBookingIntentDto) {
    try {
      // First, verify the event exists and get its details
      const event = await this.prisma.event.findUnique({
        where: { id: dto.eventId },
        include: {
          organiser: true,
        },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      if (!event.organiser?.stripe_account_id) {
        throw new BadRequestException(
          'Organiser has not connected their Stripe account',
        );
      }

      const eventPrice = Number(event.price);
      const amount = eventPrice * dto.ticket_quantity;

      // Create a PaymentIntent with Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to pence
        currency: 'gbp',
        metadata: {
          eventId: dto.eventId,
          userId: userId,
          ticketQuantity: dto.ticket_quantity.toString(),
          eventName: event.name,
        },
        application_fee_amount: Math.round(amount * 0.15 * 100), // 15% platform fee
        transfer_data: {
          destination: event.organiser.stripe_account_id,
        },
      });

      // Get user details for payment record
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create a temporary booking record to associate with payment
      const tempBooking = await this.prisma.booking.create({
        data: {
          userId: userId,
          eventId: dto.eventId,
          ticket_quantity: dto.ticket_quantity,
          status: 'Pending',
          payment_intent: paymentIntent.id,
        },
      });

      // Create payment record in database
      await this.paymentService.createPayment({
        transactionId: paymentIntent.id, // Use payment intent ID as transaction ID
        bookingId: tempBooking.id,
        userId: userId,
        eventId: dto.eventId,
        username: user.name,
        eventName: event.name,
        amount: amount,
        status: PaymentStatus.PENDING,
        method: 'stripe',
        processingFee: amount * 0.15, // 15% platform fee
        netAmount: amount * 0.85, // 85% goes to organiser
        amountPaid: 0, // Will be updated when payment succeeds
      });

      return {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: 'gbp',
        event_name: event.name,
        ticket_quantity: dto.ticket_quantity,
        booking_id: tempBooking.id,
      };
    } catch (error) {
      throw error;
    }
  }

  async handlePaymentSuccess(userId: string, dto: PaymentSuccessDto) {
    try {
      // Verify the payment intent with Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        dto.payment_intent_id,
      );

      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException(
          'Payment has not been completed successfully',
        );
      }

      // Find the existing booking for this payment intent
      const existingBooking = await this.prisma.booking.findFirst({
        where: {
          payment_intent: dto.payment_intent_id,
          userId: userId,
        },
        include: {
          user: true,
          event: true,
        },
      });

      if (!existingBooking) {
        throw new NotFoundException('No booking found for this payment intent');
      }

      // Update the booking status to confirmed
      const booking = await this.prisma.booking.update({
        where: { id: existingBooking.id },
        data: {
          status: 'Confirmed',
        },
        include: {
          user: true,
          event: true,
        },
      });

      // Update payment record with final amounts
      const paymentAmount = Number(paymentIntent.amount) / 100;
      await this.paymentService.updatePaymentStatusByTransactionId(
        dto.payment_intent_id,
        { status: PaymentStatus.SUCCESSFUL },
      );

      // Also update the payment record with the final amounts
      const payment = await this.prisma.payment.findFirst({
        where: { transactionId: dto.payment_intent_id },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            amountPaid: paymentAmount,
            netAmount: paymentAmount * 0.85, // 85% to organiser
            processingFee: paymentAmount * 0.15, // 15% platform fee
          },
        });
      }

      // Send confirmation notification
      await this.notificationHelper.sendBookingConfirmation(
        booking.userId,
        booking.event.name,
      );
      const subject = 'Booking Confirmation';
      const message = `
      <p>Hello ${booking.user.name},</p>
      <p>Thank you for booking the event <strong>${booking.event.name}</strong>!</p>
      <p>Your booking ID is: <strong>${booking.id}</strong></p>
      <p>Event Details:</p>
      <ul>
        <li>Event: ${booking.event.name}</li>
        <li>Date: ${booking.event.date ? new Date(booking.event.date).toLocaleDateString() : 'TBA'}</li>
        <li>Time: ${booking.event.time || 'TBA'}</li>
        <li>Tickets: ${booking.ticket_quantity}</li>
        <li>Total Paid: £${paymentAmount.toFixed(2)}</li>
      </ul>
      <p>We look forward to seeing you at the event!</p>
      <p>Warm regards,</p>
      <p>Waddle Team</p>
    `;

      await this.mailer.sendMail(booking.user.email, subject, message);

      return {
        message: 'Payment successful and booking confirmed',
        booking: {
          id: booking.id,
          event_name: booking.event.name,
          ticket_quantity: booking.ticket_quantity,
          status: booking.status,
          event_date: booking.event.date,
        },
        payment: {
          amount: paymentAmount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async handlePaymentFailure(userId: string, dto: PaymentFailureDto) {
    try {
      // Verify the payment intent with Stripe
      await this.stripe.paymentIntents.retrieve(dto.payment_intent_id);

      // Find the existing booking for this payment intent
      const existingBooking = await this.prisma.booking.findFirst({
        where: {
          payment_intent: dto.payment_intent_id,
          userId: userId,
        },
        include: {
          event: true,
        },
      });

      // Update booking status to failed if it exists
      if (existingBooking) {
        await this.prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            status: 'Failed',
          },
        });
      }

      // Update payment record to failed status
      await this.paymentService.updatePaymentStatusByTransactionId(
        dto.payment_intent_id,
        { status: PaymentStatus.FAILED },
      );

      // Get user details for notification
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        // Send failure notification - using a simple notification for now
        await this.notification.createNotification({
          title: 'Payment Failed',
          body: `Your payment failed: ${dto.error_message || 'Payment was not completed successfully'}`,
          recipientId: userId,
          sendPush: true,
          recipientType: 'USER',
        });
      }

      const subject = 'Payment Failed – Booking Not Confirmed';
      const message = `
        <p>Hello ${user.name || 'Customer'},</p>
        <p>Unfortunately, your payment for the event 
        <strong>${existingBooking?.event?.name || 'Unknown Event'}</strong> 
        could not be processed.</p>
        
        ${
          existingBooking
            ? `
        <p>Booking ID: <strong>${existingBooking.id}</strong></p>
        <p>Event Details:</p>
        <ul>
          <li>Event: ${existingBooking.event.name}</li>
          <li>Date: ${existingBooking.event.date ? new Date(existingBooking.event.date).toLocaleDateString() : 'TBA'}</li>
          <li>Time: ${existingBooking.event.time || 'TBA'}</li>
          <li>Tickets: ${existingBooking.ticket_quantity}</li>
        </ul>`
            : ''
        }

        <p>Error message: ${dto.error_message || 'Payment was not completed successfully'}.</p>
        
        <p>If you believe this was a mistake or wish to try again, please visit your bookings page.</p>
        <p>Warm regards,</p>
        <p>Waddle Team</p>
      `;

      await this.mailer.sendMail(user.email, subject, message);

      return {
        message: 'Payment failure recorded',
        payment_intent_id: dto.payment_intent_id,
        status: 'failed',
        error_message:
          dto.error_message || 'Payment was not completed successfully',
      };
    } catch (error) {
      throw error;
    }
  }
}
