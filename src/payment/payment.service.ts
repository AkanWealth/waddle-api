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
} from './dto';
import { PaymentStatus } from '@prisma/client';

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

  async getPayments(query: QueryPaymentDto) {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      eventId,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (eventId) where.eventId = eventId;
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
        include: { user: true, event: true, booking: true },
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
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntent,
    });
    // Optionally, store refundId in the payment record (add field if desired)
    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }
}
