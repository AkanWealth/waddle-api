import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateOrganiserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import Stripe from 'stripe';
import { UpdatePasswordDto } from '../user/dto';
// import { NotificationService } from '../notification/notification.service';
import { OrganiserStatus } from 'src/utils/constants/organiserTypes';
import { EventStatus } from 'src/utils/constants/eventTypes';
import { NotificationHelper } from 'src/notification/notification.helper';
import { Mailer } from 'src/helper';
import { RecentActivityType } from '@prisma/client';
import { ReuploadDocumentDto } from './dto/reupload-document.dto';

@Injectable()
export class OrganiserService {
  private readonly s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
      accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY'),
      secretAccessKey: this.config.getOrThrow('AWS_SECRET_KEY'),
    },
  });
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  });

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailer: Mailer,
    private notificationHelper: NotificationHelper,
  ) {}

  private calculateChange(current: number, previous: number) {
    if (previous === 0) {
      return {
        changePercent: Number((current > 0 ? 100 : 0).toFixed(1)),
        isPositive: current >= 0,
      };
    }
    const delta = ((current - previous) / previous) * 100;
    return {
      changePercent: Number(delta.toFixed(1)),
      isPositive: delta >= 0,
    };
  }

  private determinePeriodGranularity(
    startDate: Date,
    endDate: Date,
  ): '7days' | 'monthly' | 'yearly' {
    const diffMs = endDate.getTime() - startDate.getTime();
    const days = diffMs / (24 * 60 * 60 * 1000);
    if (days <= 31) return '7days';
    // Rough month diff
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    if (months <= 12) return 'monthly';
    return 'yearly';
  }

  private buildPeriodKeyAndLabel(
    date: Date,
    period: '7days' | 'monthly' | 'yearly',
  ) {
    if (period === '7days') {
      return {
        key: date.toISOString().split('T')[0],
        label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      };
    }
    if (period === 'monthly') {
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: [
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
        ][date.getMonth()],
      };
    }
    return {
      key: date.getFullYear().toString(),
      label: date.getFullYear().toString(),
    };
  }

  private initializeSeriesBuckets(
    startDate: Date,
    endDate: Date,
    period: '7days' | 'monthly' | 'yearly',
  ) {
    const map = new Map<string, { period: string; date: string }>();

    if (period === '7days') {
      // Generate each day between startDate and endDate (inclusive)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      const cursor = new Date(start);
      while (cursor <= end) {
        const { key, label } = this.buildPeriodKeyAndLabel(cursor, period);
        if (!map.has(key)) {
          map.set(key, { period: label, date: key });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (period === 'monthly') {
      // Last up-to 12 months between range
      const startY = startDate.getFullYear();
      const startM = startDate.getMonth();
      const endY = endDate.getFullYear();
      const endM = endDate.getMonth();
      let y = startY;
      let m = startM;
      while (y < endY || (y === endY && m <= endM)) {
        const d = new Date(y, m, 1);
        const { key, label } = this.buildPeriodKeyAndLabel(d, period);
        map.set(key, { period: label, date: key });
        m++;
        if (m > 11) {
          m = 0;
          y++;
        }
      }
    } else {
      // yearly - from start year to end year
      for (let y = startDate.getFullYear(); y <= endDate.getFullYear(); y++) {
        const d = new Date(y, 0, 1);
        const { key, label } = this.buildPeriodKeyAndLabel(d, period);
        map.set(key, { period: label, date: key });
      }
    }

    return map;
  }

  private async getBookingGrowthSeries(
    organiserId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const period = this.determinePeriodGranularity(startDate, endDate);

    const raw = await this.prisma.booking.findMany({
      where: {
        status: 'Confirmed',
        isDeleted: false,
        createdAt: { gte: startDate, lt: endDate },
        event: { organiserId, isDeleted: false },
      },
      select: { createdAt: true, ticket_quantity: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = this.initializeSeriesBuckets(startDate, endDate, period);
    const totals = new Map<string, number>();

    for (const r of raw) {
      const d = new Date(r.createdAt);
      const { key } = this.buildPeriodKeyAndLabel(d, period);
      totals.set(key, (totals.get(key) || 0) + (r.ticket_quantity || 0));
    }

    const series = Array.from(buckets.entries()).map(([key, meta]) => ({
      period: meta.period,
      bookings: totals.get(key) || 0,
      date: meta.date,
    }));

    return { period, series };
  }

  private async getRevenueGrowthSeries(
    organiserId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const period = this.determinePeriodGranularity(startDate, endDate);

    const raw = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESSFUL',
        createdAt: { gte: startDate, lt: endDate },
        event: { organiserId },
      },
      select: {
        createdAt: true,
        netAmount: true,
        amountPaid: true,
        amount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = this.initializeSeriesBuckets(startDate, endDate, period);
    const totals = new Map<string, number>();

    for (const r of raw) {
      const d = new Date(r.createdAt);
      const { key } = this.buildPeriodKeyAndLabel(d, period);
      const n = r.netAmount ? Number(r.netAmount) : 0;
      const a = r.amountPaid ? Number(r.amountPaid) : 0;
      const amt = n || a || (r.amount ? Number(r.amount) : 0) || 0;
      totals.set(key, Number(((totals.get(key) || 0) + amt).toFixed(2)));
    }

    const series = Array.from(buckets.entries()).map(([key, meta]) => ({
      period: meta.period,
      revenue: totals.get(key) || 0,
      date: meta.date,
    }));

    return { period, series };
  }

  async getOrganiserAnalytics(
    organiserId: string,
    startDate: Date,
    endDate: Date,
  ) {
    if (!organiserId) throw new BadRequestException('organiserId is required');
    if (!(startDate instanceof Date) || isNaN(startDate.getTime()))
      throw new BadRequestException('startDate is invalid');
    if (!(endDate instanceof Date) || isNaN(endDate.getTime()))
      throw new BadRequestException('endDate is invalid');

    const rangeMs = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - rangeMs);
    const previousEndDate = startDate;

    // Revenue (successful payments)
    const [currentPayments, previousPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: 'SUCCESSFUL',
          event: { organiserId },
          createdAt: { gte: startDate, lt: endDate },
        },
        select: { netAmount: true, amountPaid: true },
      }),
      this.prisma.payment.findMany({
        where: {
          status: 'SUCCESSFUL',
          event: { organiserId },
          createdAt: { gte: previousStartDate, lt: previousEndDate },
        },
        select: { netAmount: true, amountPaid: true },
      }),
    ]);

    // Use netAmount primarily, fallback to amountPaid
    const sumPayments = (list: { netAmount: any; amountPaid: any }[]) =>
      list.reduce((sum, p) => {
        const n = p.netAmount ? Number(p.netAmount) : 0;
        const a = p.amountPaid ? Number(p.amountPaid) : 0;
        return sum + (n || a || 0);
      }, 0);

    const currentRevenue = Number(sumPayments(currentPayments).toFixed(2));
    const previousRevenue = Number(sumPayments(previousPayments).toFixed(2));
    const revenueChange = this.calculateChange(currentRevenue, previousRevenue);

    // Bookings (Confirmed only)
    const [currentBookings, previousBookings] = await Promise.all([
      this.prisma.booking.count({
        where: {
          status: 'Confirmed',
          isDeleted: false,
          event: { organiserId, isDeleted: false },
          createdAt: { gte: startDate, lt: endDate },
        },
      }),
      this.prisma.booking.count({
        where: {
          status: 'Confirmed',
          isDeleted: false,
          event: { organiserId, isDeleted: false },
          createdAt: { gte: previousStartDate, lt: previousEndDate },
        },
      }),
    ]);
    const bookingChange = this.calculateChange(
      currentBookings,
      previousBookings,
    );

    // Top performing events (by attendees within period)
    const topEventBookings = await this.prisma.booking.groupBy({
      by: ['eventId'],
      where: {
        status: 'Confirmed',
        isDeleted: false,
        event: { organiserId, isDeleted: false },
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: { ticket_quantity: true },
    });

    // Fetch event names and revenue for the top IDs
    const sortedTop = topEventBookings
      .sort(
        (a, b) => (b._sum.ticket_quantity || 0) - (a._sum.ticket_quantity || 0),
      )
      .slice(0, 5);
    const topEventIds = sortedTop.map((t) => t.eventId);

    const [eventsMeta, revenueByEvent] = await Promise.all([
      this.prisma.event.findMany({
        where: { id: { in: topEventIds } },
        select: { id: true, name: true },
      }),
      this.prisma.payment.groupBy({
        by: ['eventId'],
        where: {
          status: 'SUCCESSFUL',
          eventId: { in: topEventIds },
          createdAt: { gte: startDate, lt: endDate },
        },
        _sum: { netAmount: true, amount: true, amountPaid: true },
      }),
    ]);

    const revenueMap = new Map<string, number>();
    for (const r of revenueByEvent) {
      const n = r._sum.netAmount ? Number(r._sum.netAmount) : 0;
      const a = r._sum.amountPaid ? Number(r._sum.amountPaid) : 0;
      const amt = n || a || (r._sum.amount ? Number(r._sum.amount) : 0) || 0;
      revenueMap.set(r.eventId, Number(amt.toFixed(2)));
    }

    const nameMap = new Map(eventsMeta.map((e) => [e.id, e.name || 'Unnamed']));

    const topEvents = sortedTop.map((t) => ({
      eventId: t.eventId,
      name: nameMap.get(t.eventId) || 'Unnamed',
      attendees: t._sum.ticket_quantity || 0,
      revenue: revenueMap.get(t.eventId) || 0,
    }));

    // Demographics within period (reuse logic with date filter)
    const consents = await this.prisma.consent.findMany({
      where: {
        booking: {
          status: 'Confirmed',
          isDeleted: false,
          createdAt: { gte: startDate, lt: endDate },
          event: { organiserId, isDeleted: false },
        },
      },
      select: { age: true },
    });

    const ages = consents
      .map((c) => c.age)
      .filter((a) => typeof a === 'number');
    const buckets = [
      { label: '0-5', min: 0, max: 5, count: 0 },
      { label: '6-12', min: 6, max: 12, count: 0 },
      { label: '13-20', min: 13, max: 20, count: 0 },
    ];
    for (const age of ages) {
      for (const b of buckets) {
        if (age >= b.min && age <= b.max) {
          b.count += 1;
          break;
        }
      }
    }
    const totalAttendees = buckets.reduce((sum, b) => sum + b.count, 0);
    const demographicsBuckets = buckets.map((b) => ({
      label: b.label,
      count: b.count,
      percentage:
        totalAttendees === 0
          ? 0
          : Number(((b.count / totalAttendees) * 100).toFixed(2)),
    }));

    // Returning customers percentage within period
    const bookingsForUsers = await this.prisma.booking.findMany({
      where: {
        status: 'Confirmed',
        isDeleted: false,
        createdAt: { gte: startDate, lt: endDate },
        event: { organiserId, isDeleted: false },
      },
      select: { userId: true },
    });

    const userCountMap = new Map<string, number>();
    for (const b of bookingsForUsers) {
      userCountMap.set(b.userId, (userCountMap.get(b.userId) || 0) + 1);
    }
    const totalUniqueCustomers = userCountMap.size;
    let returningCustomers = 0;
    for (const count of userCountMap.values())
      if (count >= 2) returningCustomers += 1;
    const returningCustomersPercentage =
      totalUniqueCustomers === 0
        ? 0
        : Number(
            ((returningCustomers / totalUniqueCustomers) * 100).toFixed(2),
          );

    const demographics = {
      message: 'Age group percentages fetched',
      total_attendees: totalAttendees,
      buckets: demographicsBuckets,
      returning_customers_percentage: returningCustomersPercentage,
    };

    // Recent payments (last 5 within period)
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        status: 'SUCCESSFUL',
        event: { organiserId },
        createdAt: { gte: startDate, lt: endDate },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        transactionId: true,
        eventId: true,
        amount: true,
        netAmount: true,
        amountPaid: true,
        status: true,
        createdAt: true,
        event: { select: { name: true } },
      },
    });

    const transformedRecentPayments = recentPayments.map((p) => ({
      id: p.id,
      transactionId: p.transactionId,
      eventId: p.eventId,
      eventName: p.event?.name || null,
      amount: p.amount ? Number(p.amount) : null,
      netAmount: p.netAmount ? Number(p.netAmount) : null,
      amountPaid: p.amountPaid ? Number(p.amountPaid) : null,
      status: p.status,
      createdAt: p.createdAt,
    }));

    // Growth series
    const [bookingGrowth, revenueGrowth] = await Promise.all([
      this.getBookingGrowthSeries(organiserId, startDate, endDate),
      this.getRevenueGrowthSeries(organiserId, startDate, endDate),
    ]);

    return {
      revenue: {
        total: currentRevenue,
        previous: previousRevenue,
        ...revenueChange,
      },
      bookings: {
        total: currentBookings,
        previous: previousBookings,
        ...bookingChange,
      },
      topEvents,
      demographics,
      recentPayments: transformedRecentPayments,
      bookingGrowth,
      revenueGrowth,
    };
  }

  private async createConnectAccount(userId: string) {
    const account = await this.stripe.accounts.create({
      type: 'express', // or 'standard'
    });
    // Save account ID in DB
    await this.prisma.organiser.update({
      where: { id: userId },
      data: { stripe_account_id: account.id, is_stripe_connected: true },
    });

    return account;
  }
  private async generateAccountLink(accountId: string) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://api.waddleapp.io/api/v1/organisers/refresh',
      return_url: 'https://api.waddleapp.io/api/v1/organisers/return',
      type: 'account_onboarding',
    });

    return link.url;
  }

  async connect(userId: string) {
    const user = await this.prisma.organiser.findUnique({
      where: { id: userId },
    });

    let accountId = user?.stripe_account_id;

    if (!accountId) {
      const account = await this.createConnectAccount(userId);
      accountId = account.id;
    }

    const onboardingUrl = await this.generateAccountLink(accountId);
    return { status: 'success', url: onboardingUrl };
  }

  async disconnect(userId: string) {
    const user = await this.prisma.organiser.findUnique({
      where: { id: userId },
      select: { stripe_account_id: true, is_stripe_connected: true },
    });

    if (!user?.stripe_account_id) {
      throw new Error('No Stripe account connected');
    }

    await this.stripe.oauth.deauthorize({
      client_id: process.env.STRIPE_CLIENT_ID,
      stripe_user_id: user.stripe_account_id,
    });

    await this.prisma.organiser.update({
      where: { id: userId },
      data: { stripe_account_id: null, is_stripe_connected: false },
    });
    return { status: 'success', message: 'Stripe disconnected' };
  }

  async isStripeConnected(
    organiserId: string,
  ): Promise<{ status: string; message: string; data: boolean }> {
    const organiser = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
    });

    if (!organiser) {
      throw new NotFoundException('Organiser not found');
    }

    const connected =
      !!organiser.stripe_account_id && organiser.is_stripe_connected === true;

    return {
      status: 'success',
      message: connected
        ? 'Stripe is connected successfully'
        : 'Stripe is not connected',
      data: connected,
    };
  }

  async saveOrganiserFcmToken(userId: string, token: string) {
    if (!userId || !token) {
      throw new BadRequestException('User ID and token are required.');
    }

    try {
      await this.prisma.organiser.update({
        where: { id: userId },
        data: { fcmToken: token },
      });

      return { message: 'FCM token updated successfully' };
    } catch (error) {
      console.error('Error saving FCM token:', error);
      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }
      throw error;
    }
  }

  async reuploadOrganiserDocument(userId: string, dto: ReuploadDocumentDto) {
    if (!userId || !dto.attachment) {
      throw new BadRequestException('User ID and token are required.');
    }

    try {
      const existingOrganiser = await this.prisma.organiser.update({
        where: { id: userId },
        data: { attachment: dto.attachment, status: OrganiserStatus.PENDING },
      });

      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      await this.notificationHelper.sendOrganiserDocumentReuploadAlert(
        userId,
        existingOrganiser.name,
      );

      return {
        success: true,
        message: 'Document reuploaded successfully',
      };
    } catch (error) {
      console.error('Error saving FCM token:', error);
      if (error.code === 'P2025') {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }
      throw error;
    }
  }

  async togglePushNotififcation(userId: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id: userId },
      });

      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      if (existingOrganiser.fcmIsOn) {
        await this.prisma.organiser.update({
          where: { id: userId },
          data: {
            fcmIsOn: false,
          },
        });
      } else {
        await this.prisma.organiser.update({
          where: { id: userId },
          data: {
            fcmIsOn: true,
          },
        });
      }

      return { message: 'Notification status updated' };
    } catch (error) {
      throw error;
    }
  }

  async viewAllOrganiser() {
    try {
      const organiser = await this.prisma.organiser.findMany({
        where: {
          isProfileCompleted: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const organisersWithLogo = organiser.map((list) => {
        const business_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${list.business_logo}`;
        return {
          ...list,
          business_logo,
        };
      });

      return { message: 'All organisers found', organiser: organisersWithLogo };
    } catch (error) {
      throw error;
    }
  }

  async viewAllOrganiserPreviousEvents(organiserId: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id: organiserId },
        include: {
          events: {
            where: {
              isDeleted: false,
            },
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              bookings: {
                where: {
                  isDeleted: false,
                  status: 'Confirmed', // or all bookings if needed
                },
              },
            },
          },
        },
      });

      if (!organiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      const now = new Date();

      let totalAttendees = 0;
      let upcomingEvents = 0;
      let pastEvents = 0;

      const eventsWithExtras = organiser.events.map((event) => {
        const event_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow(
          'S3_EVENT_FOLDER',
        )}/${event.files[0]}`;

        const isUpcoming = event.date > now;
        const isApproved = event.status === EventStatus.APPROVED;

        if (isUpcoming && isApproved) upcomingEvents++;
        else if (!isUpcoming) pastEvents++;

        const totalEventAttendees = event.bookings.reduce(
          (acc, booking) => acc + booking.ticket_quantity,
          0,
        );
        totalAttendees += totalEventAttendees;

        return {
          ...event,
          event_logo,
          totalEventAttendees,
          isUpcoming,
        };
      });

      return {
        message: 'Organiser events overview fetched successfully',
        totalEventsCreated: organiser.events.length,
        upcomingEvents,
        pastEvents,
        totalAttendees,
        events: eventsWithExtras.filter((e) => !e.isUpcoming),
      };
    } catch (error) {
      console.error(error);
      throw new NotFoundException(
        'Organiser with the provided ID does not exist.',
      );
    }
  }

  async viewMe(authOrganiser: string) {
    try {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id: authOrganiser },
      });

      const business_logo = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${organiser.business_logo}`;

      return {
        message: 'Profile found',
        organiser: { ...organiser, business_logo },
      };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(
    id: string,
    dto: UpdateOrganiserDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      let businessLogo = existingOrganiser.business_logo || undefined;

      // Upload new logo if changed
      if (fileName && businessLogo !== fileName) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${fileName}`,
            Body: file,
          }),
        );

        // Delete old logo
        if (businessLogo) {
          await this.s3Client.send(
            new DeleteObjectCommand({
              Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
              Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${businessLogo}`,
            }),
          );
        }

        businessLogo = fileName;
      }

      // Hash password if provided
      if (dto.password) {
        const hashed = await argon.hash(dto.password);

        const user = await this.prisma.organiser.update({
          where: { id },
          data: {
            ...dto,
            business_logo: businessLogo || null,
            password: hashed,
          },
        });

        delete user.password;
        return user;
      }

      // Filter out undefined values from dto
      const data: any = {
        ...Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          Object.entries(dto).filter(([_, value]) => value !== undefined),
        ),
        ...(businessLogo !== undefined && { business_logo: businessLogo }),
      };

      // Check for unique business_name if updating it
      if ('business_name' in data && data.business_name) {
        const existing = await this.prisma.organiser.findFirst({
          where: {
            business_name: data.business_name,
            NOT: { id },
          },
        });

        if (existing) {
          throw new BadRequestException('Business name is already taken');
        }
      }

      // Update organiser
      const user = await this.prisma.organiser.update({
        where: { id },
        data,
      });

      if (!user) {
        throw new NotFoundException('Organiser not found');
      }

      // Fetch updated organiser to verify completeness
      const updated = await this.prisma.organiser.findUnique({
        where: { id },
      });

      const requiredFields = [
        'name',
        'email',
        'business_name',
        'phone_number',
        'address',
        'description',
        'attachment',
      ];

      const isProfileCompleted = requiredFields.every((field) => {
        return !!updated?.[field];
      });

      if (updated?.isProfileCompleted !== isProfileCompleted) {
        await this.prisma.organiser.update({
          where: { id },
          data: {
            isProfileCompleted,
          },
        });
      }

      delete user.password;
      return { message: 'Profile updated', user };
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(id: string, dto: UpdatePasswordDto) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });
      if (!existingOrganiser) {
        throw new NotFoundException(
          'Organiser with the provided ID does not exist.',
        );
      }

      const isMatch = await argon.verify(
        existingOrganiser.password,
        dto.old_password,
      );
      if (!isMatch) throw new BadRequestException('Old password is incorrect');

      const hashed = await argon.hash(dto.new_password);

      const organiser = await this.prisma.organiser.update({
        where: { id: existingOrganiser.id },
        data: {
          password: hashed,
        },
      });

      delete organiser.password;
      return { message: 'Password updated successful', organiser };
    } catch (error) {
      throw error;
    }
  }

  async deleteOrganiserTemp(id: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser)
        throw new NotFoundException('Organiser not found');

      await this.prisma.organiser.update({
        where: { id: existingOrganiser.id },
        data: { isDeleted: true },
      });

      return { mesaage: 'Organiser deleted' };
    } catch (error) {
      throw error;
    }
  }

  async deleteOrganiser(id: string) {
    try {
      const existingOrganiser = await this.prisma.organiser.findUnique({
        where: { id },
      });

      if (!existingOrganiser)
        throw new NotFoundException('Organiser not found');

      const organiser = await this.prisma.organiser.delete({
        where: { id: existingOrganiser.id },
      });

      if (organiser?.business_logo) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
            Key: `${this.config.getOrThrow('S3_VENDOR_FOLDER')}/${organiser.business_logo}`,
          }),
        );
      }

      return { mesaage: 'Organiser deleted' };
    } catch (error) {
      throw error;
    }
  }

  async setApprovalStatus(
    id: string,
    isApproved: boolean,
    rejectionReason: string,
  ) {
    try {
      const updated = await this.prisma.organiser.update({
        where: { id },
        data: {
          isApproved: isApproved ? true : false,
          rejectionReason: isApproved ? '' : rejectionReason,
          status: isApproved
            ? OrganiserStatus.APPROVED
            : OrganiserStatus.REJECTED,
        },
      });

      // Prepare email details
      let subject: string;
      let message: string;

      if (isApproved) {
        subject = 'Your Waddle Vendor Account Has Been Approved 🎉';
        message = `
        <p>Hello ${updated.name},</p>
        <p>Good news! Your vendor account has been successfully verified and approved. You can now start creating and managing your events on Waddle.</p>

        <p><b>Next Steps:</b></p>
        <ul>
          <li>Log in to your account</li>
          <li>Set up your event listings</li>
          <li>Start receiving bookings from parents</li>
        </ul>

        <p>We’re excited to have you on board. Let’s make great events happen!</p>

        <p>Best regards,<br> The Waddle Team</p>
      `;
      } else {
        subject = 'Your Waddle Vendor Verification Status';
        message = `
  <p>Hello ${updated.name},</p>
  <p>After reviewing your vendor application, we’re unable to approve your account at this time.</p>
  
  <p><b>Reason provided by our team:</b></p>
  <p>${rejectionReason}</p>

  <p><b>What to do next:</b></p>
  <ul>
    <li>Review your submitted information</li>
    <li>Ensure all required documents are clear and valid</li>
    <li>Re-submit your application for verification</li>
  </ul>

  <p>We’d be happy to verify you once the necessary details are provided.</p>

  <p>Best regards,<br>Waddle Team</p>
`;
      }

      // Send email
      try {
        await this.mailer.sendMail(updated.email, subject, message);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Continue with the process even if email fails
      }

      // Send any in-app notification if needed
      try {
        await this.notificationHelper.sendAccountApprovalStatusAlert(
          id,
          updated.name,
          isApproved,
        );
      } catch (notificationError) {
        console.error(
          'Failed to send approval notification:',
          notificationError,
        );
        // Continue with the process even if notification fails
      }

      return {
        message: `Organiser ${isApproved ? 'approved' : 'rejected'}`,
        organiser: updated,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Organiser not found');
      }
      throw error;
    }
  }

  async reactivateOrganiser(id: string) {
    try {
      const updated = await this.prisma.organiser.update({
        where: { id },
        data: {
          status: OrganiserStatus.APPROVED,
          isApproved: true,
          rejectionReason: '',
        },
      });

      // Send email notification to the organiser
      const subject = 'Your Vendor Account Has Been Reactivated';
      const message = `
      <p><b>Hello ${updated.name},</b></p>
      <p> We are pleased to inform you that your vendor account has now been reinstated. You can log in again to manage your events, view bookings, and continue offering your services to parents on our platform.</p>
      <p>If you had active events before the suspension, they are now visible to parents again. We encourage you to review your event details to ensure everything is up to date.</p>
      <p>We’re glad to have you back and look forward to seeing your events thrive.</p>
      <p>If you have any questions or need support, please contact us at <a href="mailto:hello@waddleapp.io">hello@waddleapp.io</a></p>
      
        <p>Best regards,<br> The Waddle Team</p>
      `;

      // Send email notification to the organiser
      try {
        await this.mailer.sendMail(updated.email, subject, message);
      } catch (emailError) {
        console.error('Failed to send reactivation email:', emailError);
        // Continue with the process even if email fails
      }

      // Send in-app notification
      try {
        await this.notificationHelper.sendAccountReactivationAlert(
          id,
          updated.name,
        );
      } catch (notificationError) {
        console.error(
          'Failed to send reactivation notification:',
          notificationError,
        );
        // Continue with the process even if notification fails
      }
      return {
        message: `Organiser reactivated`,
        organiser: updated,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Organiser not found');
      }
      throw error;
    }
  }

  async suspendOrganiser(id: string, suspensionReason: string) {
    try {
      const updated = await this.prisma.organiser.update({
        where: { id },
        data: {
          status: OrganiserStatus.SUSPENDED,
          suspensionReason,
        },
      });

      // Send email notification to the organiser
      const subject = 'Your Waddle Vendor Account Has Been Suspended';
      const message = `
        <p>Hello ${updated.name},</p>
        <p>We regret to inform you that your vendor account has been suspended due to a policy violation.</p>
        
        <p><b>Reason for suspension:</b></p>
        <p>${suspensionReason}</p>
        
        <p><b>What this means:</b></p>
        <ul>
          <li>Your account is temporarily disabled</li>
          <li>You cannot create or manage events</li>
          <li>Existing bookings may be affected</li>
        </ul>
        
        <p><b>Next steps:</b></p>
        <ul>
          <li>Review the reason for suspension</li>
          <li>Address any issues mentioned above</li>
          <li>Contact our support team if you believe this is an error</li>
        </ul>
        
        <p>If you have any questions or concerns, please don't hesitate to reach out to our support team.</p>
        
        <p>Best regards,<br> The Waddle Team</p>
      `;

      // Send email notification to the organiser
      try {
        await this.mailer.sendMail(updated.email, subject, message);
      } catch (emailError) {
        console.error('Failed to send suspension email:', emailError);
        // Continue with the process even if email fails
      }

      // Send in-app notification
      try {
        await this.notificationHelper.sendAccountSuspensionAlert(
          id,
          updated.name,
          suspensionReason,
        );
      } catch (notificationError) {
        console.error(
          'Failed to send suspension notification:',
          notificationError,
        );
        // Continue with the process even if notification fails
      }

      return {
        message: `Organiser suspended`,
        organiser: updated,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Organiser not found');
      }
      throw error;
    }
  }

  async createOrganiserRecentActivity(data: {
    organiserId: string;
    type: RecentActivityType;
    amount: string;
    title: string;
  }) {
    try {
      return await this.prisma.recentActivity.create({ data });
    } catch (error) {
      throw error;
    }
  }

  async getOrganiserRecentActivities(organiserId: string, limit = 20) {
    const recentActivities = await this.prisma.recentActivity.findMany({
      where: { organiserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, data: recentActivities };
  }

  // async fetchOrganizerAnalytics(){}

  // End Organiser

  // Start staff
  // async createStaff(organiserId: string, dto: CreateOrganiserStaffDto) {
  //   try {
  //     const existingOrganiserEmail = await this.prisma.organiser.findUnique({
  //       where: { email: dto.email },
  //     });
  //     const existingStaffEmail = await this.prisma.organiserStaff.findUnique({
  //       where: { email: dto.email },
  //     });
  //     if (existingOrganiserEmail || existingStaffEmail)
  //       throw new BadRequestException('Email has been used.');

  //     const hashedPassword = await argon.hash(dto.password);
  //     const staff = await this.prisma.organiserStaff.create({
  //       data: {
  //         ...dto,
  //         role: dto.role as OrganiserRole,
  //         password: hashedPassword,
  //         organiser: { connect: { id: organiserId } },
  //       },
  //     });

  //     await this.sendInvite(staff.id);

  //     return { message: 'Staff created and invite sent' };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async sendInvite(id: string) {
  //   try {
  //     if (!id) throw new BadRequestException('Id is required');

  //     const staff = await this.prisma.organiserStaff.findUnique({
  //       where: { id },
  //     });
  //     if (!staff) throw new NotFoundException('Not found');

  //     // generate token and expiration time
  //     const resetToken = Math.random().toString(36).substr(2);
  //     const resetTokenExpiration = Date.now() + 3600000; // 1 hour

  //     await this.prisma.organiserStaff.update({
  //       where: { id: staff.id },
  //       data: {
  //         reset_token: resetToken,
  //         reset_expiration: resetTokenExpiration.toString(),
  //       },
  //     });

  //     const subject = 'Vendor Invite';
  //     const message = `<p>Hello ${staff.name},</p>

  //       <p>I hope this mail finds you well. Pleae note that you have been invited to manage events for your company.</p>

  //       <p>Kindly follow the steps below to reset your passowrd.</p>

  //       <ul>
  //         <li>Click the link to reset the password: https://waddleapp.io/organiser/staff/reset-password</li>
  //         <li>Use the token <b>${resetToken}</b> to reset your password.</li>
  //       </ul>

  //       <p>Warm regards,</p>

  //       <p><b>Waddle Team</b></p>
  //     `;

  //     await this.notificationService.sendMail(staff.email, subject, message);
  //     return { message: 'Invite sent' };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  // async viewAllStaff(organiserId: string) {
  //   const staffs = await this.prisma.organiserStaff.findMany({
  //     where: { organiserId },
  //   });
  //   if (!staffs || staffs.length <= 0) throw new NotFoundException('Not found');

  //   return { message: 'All staff found', staffs };
  // }

  // async viewStaff(organiserId: string, id: string) {
  //   const staff = await this.prisma.organiserStaff.findUnique({
  //     where: { id, organiserId },
  //   });
  //   if (!staff) throw new NotFoundException('Not found');

  //   return { message: 'Staff found', staff };
  // }

  // async deleteStaffTemp(organiserId: string, id: string) {
  //   const findStaff = await this.prisma.organiserStaff.findUnique({
  //     where: { id, organiserId },
  //   });
  //   if (!findStaff) throw new NotFoundException('Not found');

  //   await this.prisma.organiserStaff.update({
  //     where: { id: findStaff.id },
  //     data: { isDeleted: true },
  //   });
  //   return { message: 'Staff deleted' };
  // }

  // async deleteStaff(organiserId: string, id: string) {
  //   const findStaff = await this.prisma.organiserStaff.findUnique({
  //     where: { id, organiserId },
  //   });
  //   if (!findStaff) throw new NotFoundException('Not found');

  //   await this.prisma.organiserStaff.delete({ where: { id: findStaff.id } });
  //   return { message: 'Staff deleted' };
  // }
  // End Staff

  async getAgeGroups(organiserId: string) {
    try {
      const consents = await this.prisma.consent.findMany({
        where: {
          booking: {
            status: 'Confirmed',
            isDeleted: false,
            event: { organiserId, isDeleted: false },
          },
        },
        select: { age: true },
      });

      const ages = consents
        .map((c) => c.age)
        .filter((a) => typeof a === 'number');

      const buckets = [
        { label: '0-5', min: 0, max: 5, count: 0 },
        { label: '6-12', min: 6, max: 12, count: 0 },
        { label: '13-20', min: 13, max: 20, count: 0 },
      ];

      for (const age of ages) {
        for (const b of buckets) {
          if (age >= b.min && age <= b.max) {
            b.count += 1;
            break;
          }
        }
      }

      const total = buckets.reduce((sum, b) => sum + b.count, 0);

      const result = buckets.map((b) => ({
        label: b.label,
        count: b.count,
        percentage:
          total === 0 ? 0 : parseFloat(((b.count / total) * 100).toFixed(2)),
      }));

      const bookings = await this.prisma.booking.findMany({
        where: {
          status: 'Confirmed',
          isDeleted: false,
          event: { organiserId, isDeleted: false },
        },
        select: { userId: true },
      });

      const userCountMap = new Map<string, number>();
      for (const b of bookings) {
        const prev = userCountMap.get(b.userId) || 0;
        userCountMap.set(b.userId, prev + 1);
      }
      const totalUniqueCustomers = userCountMap.size;
      let returningCustomers = 0;
      for (const count of userCountMap.values()) {
        if (count >= 2) returningCustomers += 1;
      }
      const returningCustomersPercentage =
        totalUniqueCustomers === 0
          ? 0
          : parseFloat(
              ((returningCustomers / totalUniqueCustomers) * 100).toFixed(2),
            );

      return {
        message: 'Age group percentages fetched',
        total_attendees: total,
        buckets: result,
        // returning_customers: returningCustomers,
        // total_unique_customers: totalUniqueCustomers,
        returning_customers_percentage: returningCustomersPercentage,
      };
    } catch (error) {
      throw error;
    }
  }
}
