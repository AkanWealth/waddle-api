import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  QueryPaymentDto,
  RevenuePeriod,
  RevenueData,
} from './dto';
import { PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const stripeSecretKey = this.config.getOrThrow('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createPayment(dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: dto,
    });
  }

  async updatePaymentByBookingId(
    bookingId: string,
    data: Partial<{ transactionId: string }>,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId },
    });
    if (!payment) throw new NotFoundException('Payment not found for booking');
    return this.prisma.payment.update({
      where: { id: payment.id },
      data,
    });
  }

  async updatePaymentStatusByTransactionId(
    transactionId: string,
    dto: UpdatePaymentStatusDto,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionId },
    });
    if (!payment)
      throw new NotFoundException('Payment not found for transaction');
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new ForbiddenException('Cannot update a refunded payment');
    }
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: dto.status },
    });
  }

  // async getPayments(query: QueryPaymentDto) {
  //   const {
  //     page = 1,
  //     limit = 10,
  //     status,
  //     userId,
  //     eventId,
  //     startDate,
  //     endDate,
  //   } = query;
  //   const skip = (page - 1) * limit;
  //   const where: any = {};
  //   if (status) where.status = status;
  //   if (userId) where.userId = userId;
  //   if (eventId) where.eventId = eventId;
  //   if (startDate || endDate) {
  //     where.createdAt = {};
  //     if (startDate) where.createdAt.gte = new Date(startDate);
  //     if (endDate) where.createdAt.lte = new Date(endDate);
  //   }
  //   const [data, total] = await Promise.all([
  //     this.prisma.payment.findMany({
  //       where,
  //       orderBy: { createdAt: 'desc' },
  //       skip,
  //       take: limit,
  //       include: { user: true, event: true, booking: true },
  //     }),
  //     this.prisma.payment.count({ where }),
  //   ]);
  //   return {
  //     data,
  //     pagination: {
  //       page,
  //       limit,
  //       total,
  //       totalPages: Math.ceil(total / limit),
  //       hasNext: page * limit < total,
  //       hasPrev: page > 1,
  //     },
  //   };
  // }
  async getPayments(query: QueryPaymentDto) {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      bookingStatus,
      userId,
      eventId,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Handle payment status filtering (prioritize paymentStatus over status)
    const finalPaymentStatus = paymentStatus || status;
    if (finalPaymentStatus) {
      where.status = finalPaymentStatus;
    }

    // Handle booking status filtering
    if (bookingStatus) {
      switch (bookingStatus) {
        case 'SUCCESSFUL':
          where.booking = {
            status: 'Confirmed', // Maps to BookingStatus.Confirmed from your schema
          };
          break;
        case 'CANCELLED':
          where.booking = {
            status: 'Cancelled', // Maps to BookingStatus.Cancelled from your schema
          };
          break;
        case 'NO_BOOKING':
          // This means payments without associated bookings or failed/pending/refunded bookings
          where.OR = [
            {
              booking: {
                status: 'Pending',
              },
            },
            {
              booking: {
                status: 'Failed',
              },
            },
            {
              booking: {
                status: 'Refunded',
              },
            },
          ];
          break;
      }
    }

    // Handle other filters
    if (userId) where.userId = userId;
    if (eventId) where.eventId = eventId;

    // Handle date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: true,
          event: true,
          booking: true,
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { user: true, event: true, booking: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async updatePaymentStatus(id: string, dto: UpdatePaymentStatusDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new ForbiddenException('Cannot update a refunded payment');
    }
    return this.prisma.payment.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async refundPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new ForbiddenException('Payment is already refunded');
    }
    // Get the payment intent from the booking
    const paymentIntent = payment.booking?.payment_intent;
    if (!paymentIntent) {
      throw new NotFoundException(
        'No Stripe payment intent found for this booking',
      );
    }
    // Call Stripe to process the refund
    let refund;
    try {
      // Generate unique idempotency key for this refund
      const refundIdempotencyKey = `refund_${payment.id}_${Date.now()}_${randomUUID()}`;

      refund = await this.stripe.refunds.create(
        {
          payment_intent: paymentIntent,
        },
        {
          idempotencyKey: refundIdempotencyKey,
        },
      );
    } catch (error) {
      throw new ForbiddenException('Stripe refund failed: ' + error.message);
    }
    // Optionally, check refund.status === 'succeeded'
    if (refund.status !== 'succeeded') {
      throw new ForbiddenException('Refund not successful: ' + refund.status);
    }
    // Update payment record with refundId and refundStatus
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundId: refund.id,
        refundStatus: refund.status,
      },
    });
  }

  async getRevenue(
    period: RevenuePeriod = RevenuePeriod.SIX_MONTHS,
    status: PaymentStatus = PaymentStatus.SUCCESSFUL,
  ): Promise<RevenueData[]> {
    const { startDate, endDate } = this.getDateRange(period);
    console.log(status, 'This is the status');
    // let statusFilter = status === undefined ? PaymentStatus.SUCCESSFUL : status;
    // Get successful payments within the date range
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: PaymentStatus.SUCCESSFUL,
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    const monthlyRevenue: Record<string, number> = {};
    payments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = 0;
      }
      monthlyRevenue[monthKey] += parseFloat(payment.amount.toString());
    });

    // Format as required: [{ date: "Jan", amount: 42000 }]
    return this.formatMonthlyData(monthlyRevenue, period);
  }

  private getDateRange(period: RevenuePeriod): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case RevenuePeriod.THREE_MONTHS:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate(),
        );
        break;
      case RevenuePeriod.SIX_MONTHS:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate(),
        );
        break;
      case RevenuePeriod.NINE_MONTHS:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 9,
          now.getDate(),
        );
        break;
      case RevenuePeriod.TWELVE_MONTHS:
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
        break;
      default:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate(),
        );
    }

    return { startDate, endDate: now };
  }

  private formatMonthlyData(
    monthlyRevenue: Record<string, number>,
    period: RevenuePeriod,
  ): RevenueData[] {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const now = new Date();
    const data: RevenueData[] = [];

    // Get the number of months based on period
    let monthsToInclude: number;
    switch (period) {
      case RevenuePeriod.THREE_MONTHS:
        monthsToInclude = 3;
        break;
      case RevenuePeriod.SIX_MONTHS:
        monthsToInclude = 6;
        break;
      case RevenuePeriod.NINE_MONTHS:
        monthsToInclude = 9;
        break;
      case RevenuePeriod.TWELVE_MONTHS:
        monthsToInclude = 12;
        break;
      default:
        monthsToInclude = 6;
    }

    // Generate data for the specified number of months (going backwards from current month)
    for (let i = monthsToInclude - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = monthNames[targetDate.getMonth()];

      data.push({
        date: monthName,
        amount: parseFloat((monthlyRevenue[monthKey] || 0).toFixed(2)),
      });
    }

    return data;
  }
}
