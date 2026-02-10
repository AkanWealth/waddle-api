import {
  BadRequestException,
  // ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConfirmEventCancellation,
  CreateEventDto,
  UpdateEventDto,
  ReportEventDto,
} from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { EventStatus } from 'src/utils/constants/eventTypes';
import { OrganiserStatus } from 'src/utils/constants/organiserTypes';
import { DraftEventDto } from './dto/draft-event.dto';
import { NotificationHelper } from 'src/notification/notification.helper';
import { PaymentService } from '../payment/payment.service';
import { Mailer } from '../helper';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { OrganiserRecentActivity } from 'src/organiser/organiser-recent-activity-helper';

@Injectable()
export class EventService {
  private readonly s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
      accessKeyId: this.config.getOrThrow('AWS_ACCESS_KEY'),
      secretAccessKey: this.config.getOrThrow('AWS_SECRET_KEY'),
    },
  });

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notificationHelper: NotificationHelper,
    private organiserRecentActivity: OrganiserRecentActivity,
    private paymentService: PaymentService,
    private mailer: Mailer,
  ) {}

  async createEventByOrganiser(
    creatorId: string,
    dto: CreateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      if (file) await this.uploadEventImages(fileName, file);
      const organiser = await this.prisma.organiser.findFirst({
        where: {
          id: creatorId,
          isDeleted: false,
          status: OrganiserStatus.APPROVED,
        },
        select: {
          stripe_account_id: true,
          is_stripe_connected: true,
        },
      });
      if (!organiser.is_stripe_connected) {
        throw new BadRequestException(
          'Failed to create an event. Please connect your stripe account',
        );
      }

      const date = new Date(dto.date);
      console.log(dto.isPublished, 'This is the published');
      // const isPublished = dto.isPublished ?? false;

      // Transform the DTO to match Prisma schema
      const { ...restDto } = dto;
      const eventData = {
        ...restDto,
        // instruction:
        //   instructions && instructions.length > 0 ? instructions[0] : null,
        date,
        total_ticket: Number(dto.total_ticket),
        isPublished: false,
        organiserId: creatorId,
        distance: 0,
        facilities: dto.facilities ?? [],
        tags: dto.tags ?? [],
      };

      const event = await this.prisma.event.create({
        data: eventData,
      });

      return { message: 'Event created', event };
    } catch (error) {
      throw error;
    }
  }

  async draftsEventByOrganiser(creatorId: string, dto: DraftEventDto) {
    try {
      const date = new Date(dto.date);
      const isPublished = dto.isPublished ?? false;

      // Transform the DTO to match Prisma schema
      const { total_ticket, ...restDto } = dto; // Extract total_ticket from restDto
      const parsedTotalTicket = Number(total_ticket);

      const eventData = {
        ...restDto,
        // instruction: instructions?.[0] ?? null,
        date,
        ...(isNaN(parsedTotalTicket) || parsedTotalTicket === 0
          ? { isUnlimited: true }
          : { total_ticket: parsedTotalTicket }), // Now this won't be overridden
        isPublished,
        status: EventStatus.DRAFT,
        organiserId: creatorId,
        distance: 0,
        facilities: dto.facilities ?? [],
        tags: dto.tags ?? [],
        files: dto.files,
      };

      console.log('Creating event in database with data:', eventData);
      const event = await this.prisma.event.create({
        data: eventData,
      });

      console.log('Event created successfully:', event.id);
      return { message: 'Event created' };
    } catch (error) {
      console.error('Error creating event by organiser:', error);
      throw error;
    }
  }
  async duplicateEventAsOrganiser(eventId: string, creatorId: string) {
    try {
      const originalEvent = await this.prisma.event.findFirst({
        where: { id: eventId, organiserId: creatorId },
      });
      if (!originalEvent) {
        throw new BadRequestException(
          'Could not find this event on the list of duplicated events',
        );
      }

      const newEventData = {
        name: originalEvent.name,
        description: originalEvent.description,
        address: originalEvent.address,
        price: originalEvent.price,
        total_ticket: originalEvent.total_ticket,
        isUnlimited: originalEvent.isUnlimited,
        ticket_booked: 0, // Reset ticket count for new event
        frequency: originalEvent.frequency,
        customFrequency: originalEvent.customFrequency,
        date: originalEvent.date,
        time: originalEvent.time, // Keep same time
        age_range: originalEvent.age_range,
        instructions: originalEvent.instructions || [],
        category: originalEvent.category,
        distance: originalEvent.distance,
        facilities: originalEvent.facilities || [],
        tags: originalEvent.tags || [],
        eventType: originalEvent.eventType,
        status: EventStatus.DRAFT, // New events start as pending
        rejectionReason: null,
        files: originalEvent.files || [],
        isPublished: originalEvent.isPublished,
        isDeleted: false,
        adminId: originalEvent.adminId,
        organiserId: originalEvent.organiserId,
      };

      await this.prisma.event.create({
        data: newEventData,
      });
      return {
        success: true,
        message: 'Your event has been duplicated successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  async publishDraftedEventByOrganiser(eventId: string, creatorId: string) {
    try {
      const organiser = await this.prisma.organiser.findFirst({
        where: {
          id: creatorId,
          isDeleted: false,
          status: OrganiserStatus.APPROVED,
        },
        select: {
          stripe_account_id: true,
          is_stripe_connected: true,
        },
      });
      if (!organiser.is_stripe_connected) {
        throw new BadRequestException(
          'Failed to create an event. Please connect your stripe account',
        );
      }
      const event = await this.prisma.event.update({
        where: { id: eventId, organiserId: creatorId },
        data: {
          status: EventStatus.PENDING,
          isPublished: false,
        },
      });
      if (!event) {
        throw new Error('Failed to move event from draft');
      }

      return {
        success: true,
        message: 'Your drafted event is now pending',
        data: event,
      };
    } catch (error) {
      console.error('Error publishing drafted event by organiser:', error);
      throw error;
    }
  }
  async cancelAnEventAsOrganiser(eventId: string, organiserId: string) {
    try {
      const event = await this.prisma.event.findFirst({
        where: { id: eventId, organiserId },
      });

      if (!event) {
        throw new Error('Event not found or you are not the organiser');
      }
      const cancelledEvent = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.CANCELLED,
          isPublished: false,
          requestedCancellationAt: new Date(),
        },
      });
      await this.notificationHelper.sendEventCancellationNotification(
        organiserId,
        event.name,
      );

      return {
        success: true,
        message: 'Your event is now cancelled',
        data: cancelledEvent,
      };
    } catch (error) {
      throw error;
    }
  }

  async createEventByAdmin(creatorId: string, dto: CreateEventDto) {
    try {
      const date = new Date(dto.date);
      // const isPublished = dto.isPublished ?? false;

      // Transform the DTO to match Prisma schema
      const { total_ticket, ...restDto } = dto;
      const parsedTotalTicket = Number(total_ticket);

      const eventData = {
        ...restDto,
        // instruction:
        //   instructions && instructions.length > 0 ? instructions[0] : null,
        date,

        ...(isNaN(parsedTotalTicket) || parsedTotalTicket === 0
          ? { isUnlimited: true }
          : { total_ticket: parsedTotalTicket }),

        isPublished: true,
        status: EventStatus.APPROVED,
        admin: {
          connect: { id: creatorId },
        },
        distance: 0,
        facilities: dto.facilities ?? [],
        tags: dto.tags ?? [],
        files: dto.files,
      };

      const event = await this.prisma.event.create({
        data: eventData,
      });

      return { message: 'Event created', event };
    } catch (error) {
      console.error('Error creating event by admin:', error);
      throw error;
    }
  }

  async draftsEventByAdmin(creatorId: string, dto: DraftEventDto) {
    try {
      const date = new Date(dto.date);
      const isPublished = dto.isPublished ?? false;

      // Transform the DTO to match Prisma schema
      const { total_ticket, ...restDto } = dto; // Extract total_ticket from restDto
      const parsedTotalTicket = Number(total_ticket);

      const eventData = {
        ...restDto,
        // instruction: instructions?.[0] ?? null,
        date,
        ...(isNaN(parsedTotalTicket) || parsedTotalTicket === 0
          ? { isUnlimited: true }
          : { total_ticket: parsedTotalTicket }), // Now this won't be overridden
        isPublished,
        status: EventStatus.DRAFT,
        admin: {
          connect: { id: creatorId },
        },
        distance: 0,
        facilities: dto.facilities ?? [],
        tags: dto.tags ?? [],
        files: dto.files,
      };

      console.log('Creating event in database with data:', eventData);
      const event = await this.prisma.event.create({
        data: eventData,
      });

      console.log('Event created successfully:', event.id);
      return { message: 'Event created' };
    } catch (error) {
      console.error('Error creating event by admin:', error);
      throw error;
    }
  }
  async approveDraftedEventsByAdmin(eventId: string) {
    try {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.APPROVED,
          isPublished: true,
        },
      });

      if (!event) {
        throw new Error('Event not found or could not be updated');
      }

      if (event.organiserId) {
        const organiserPreferences =
          await this.prisma.notificationPreference.findFirst({
            where: {
              organiserId: event.organiserId,
            },
          });
        console.log('This is the organiser event approval');
        console.log(organiserPreferences.event_approval);
        if (organiserPreferences.event_approval) {
          await this.notificationHelper.sendEventApprovalNotification(
            event.organiserId,
            event.name,
            true,
          );
        }
      }

      return {
        success: true,
        message: 'Event approved and published',
        data: event,
      };
    } catch (error) {
      // You can customize this error to use a custom AppError class or logging
      throw new Error(`Failed to approve event: ${error.message}`);
    }
  }
  async rejectDraftedEventsByAdmin(eventId: string) {
    try {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.NON_COMPLIANT,
          isPublished: false,
        },
      });

      if (!event) {
        throw new Error('Event not found or could not be updated');
      }
      if (event.organiserId) {
        const organiserPreferences =
          await this.prisma.notificationPreference.findFirst({
            where: {
              organiserId: event.organiserId,
            },
          });
        if (organiserPreferences.event_approval) {
          await this.notificationHelper.sendEventApprovalNotification(
            event.organiserId,
            event.name,
            false,
          );
        }
      }

      return {
        success: true,
        message: 'The Event has been rejected',
        data: event,
      };
    } catch (error) {
      // You can customize this error to use a custom AppError class or logging
      throw new Error(`Failed to approve event: ${error.message}`);
    }
  }

  async restoreSoftDeletedEvent(eventId: string) {
    try {
      const event = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.PENDING,
          isDeleted: false,
          isPublished: false, // Optionally set to true if you want to restore as published
        },
      });

      if (!event) {
        throw new NotFoundException('Event not found or could not be restored');
      }

      return { message: 'Event restored successfully', event };
    } catch (error) {
      throw error;
    }
  }

  async getAllSoftDeletedEvents() {
    try {
      console.log('Soft deleted events retrieval initiated');

      const softDeletedEvents = await this.prisma.event.findMany({
        where: { isDeleted: true },
        include: {
          admin: true,
          organiser: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      if (!softDeletedEvents || softDeletedEvents.length === 0) {
        return { message: 'No soft-deleted events found.' };
      }

      return { success: true, data: softDeletedEvents };
    } catch (error) {
      throw error;
    }
  }

  async viewAllEvent(page: number, pageSize: number) {
    try {
      // Calculate skip based on page and pageSize for pagination
      const calSkip = (page - 1) * pageSize;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const events = await this.prisma.event.findMany({
        where: {
          isPublished: true,
          status: EventStatus.APPROVED,
          date: {
            gte: today,
          },
          organiser: {
            isDeleted: false,
            status: { not: OrganiserStatus.SUSPENDED },
          },
        },
        skip: calSkip,
        take: pageSize,
        include: {
          admin: true,
          organiser: true,
          reviews: true,
          bookings: true,
          favorites: true,
          like: true,
          recommendations: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get the total count of published events for pagination metadata
      const totalEvents = await this.prisma.event.count({
        where: {
          isPublished: true,
          status: EventStatus.APPROVED,
          date: {
            gte: today,
          },
          organiser: {
            isDeleted: false,
            status: { not: OrganiserStatus.SUSPENDED },
          },
        },
      });

      if (!events || events.length === 0) {
        return {
          message: 'No events found for the given page.',
          events: [],
          totalEvents: totalEvents,
          currentPage: page,
          pageSize: pageSize,
          totalPages: Math.ceil(totalEvents / pageSize),
        };
      }

      const eventsWithImages = events.map((event) => {
        const imageUrl = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${event.files}`;
        return {
          ...event,
          images: imageUrl,
        };
      });

      return {
        message: 'Events found',
        events: eventsWithImages,
        totalEvents: totalEvents,
        currentPage: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalEvents / pageSize),
      };
    } catch (error) {
      throw error;
    }
  }

  async viewAllEventAdmin(adminId: string) {
    try {
      const events = await this.prisma.event.findMany({
        where: {
          isDeleted: false,
          status: {
            not: EventStatus.CANCELLED,
          },
          OR: [
            // Organiser events (published, pending, non-compliant)
            {
              AND: [
                {
                  organiser: {
                    isDeleted: false,
                    status: { not: OrganiserStatus.SUSPENDED },
                  },
                },
                {
                  OR: [
                    { status: EventStatus.APPROVED },
                    { status: EventStatus.PENDING }, // Include all pending events
                    { status: EventStatus.NON_COMPLIANT }, // Include non-compliant events
                  ],
                },
              ],
            },
            // Admin events (drafted by current admin)
            {
              AND: [
                { adminId: adminId }, // Only include drafted events created by current admin
              ],
            },
          ],
        },
        include: {
          admin: true,
          organiser: true,
          reviews: true,
          bookings: true,
          favorites: true,
          like: true,
          recommendations: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!events || events.length === 0) {
        return {
          message: 'No events found.',
          events: [],
        };
      }

      const eventsWithImages = events.map((event) => {
        const imageUrl = event.files
          ? `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${event.files}`
          : null;
        return {
          ...event,
          images: imageUrl,
        };
      });

      return {
        message: 'Events found',
        events: eventsWithImages,
      };
    } catch (error) {
      throw error;
    }
  }

  async viewAllCancelledEventAsAdmin(
    page: number = 1,
    limit: number = 10,
    isCancelled?: boolean,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      // Base condition (cancelled + not deleted + not from suspended organisers)
      const whereCondition: any = {
        isDeleted: false,
        status: EventStatus.CANCELLED,
        // Filter out events from suspended organisers to ensure compliance
        // This prevents suspended organisers' events from appearing in admin views
        organiser: {
          isDeleted: false,
          status: { not: OrganiserStatus.SUSPENDED },
        },
      };

      // Add isCancelled filter only if provided
      if (isCancelled !== undefined) {
        whereCondition.isCancelled = isCancelled;
      }

      // Add date range filter if provided
      if (startDate || endDate) {
        whereCondition.requestedCancellationAt = {};
        if (startDate) {
          whereCondition.requestedCancellationAt.gte = new Date(startDate);
        }
        if (endDate) {
          whereCondition.requestedCancellationAt.lte = new Date(endDate);
        }
      }

      // Add search filter if present
      if (search && search.trim() !== '') {
        whereCondition.OR = [
          { name: { contains: search, mode: 'insensitive' } }, // Event name
          { organiser: { name: { contains: search, mode: 'insensitive' } } }, // Organiser name
        ];
      }

      const [total, events] = await this.prisma.$transaction([
        this.prisma.event.count({ where: whereCondition }),
        this.prisma.event.findMany({
          where: whereCondition,
          include: {
            organiser: true,
            bookings: true,
            favorites: true,
          },
          skip,
          take: limit,
          orderBy: { requestedCancellationAt: 'desc' },
        }),
      ]);

      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        events,
      };
    } catch (error) {
      throw error;
    }
  }

  async sendNotificationReminderAndProcessRefund(
    eventId: string,
    dto: ConfirmEventCancellation,
  ) {
    try {
      // Find the event with all related data
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          bookings: {
            include: {
              user: true,
              payments: true,
            },
          },
          favorites: {
            include: {
              user: true,
            },
          },
          like: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Mark event as cancelled and set cancelledAt date
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
        },
      });

      // Process refunds for users who booked the event
      const confirmedBookings = event.bookings.filter(
        (booking) => booking.status === BookingStatus.Confirmed,
      );

      for (const booking of confirmedBookings) {
        const payment = booking.payments[0]; // Get the first payment
        if (payment && payment.status === PaymentStatus.SUCCESSFUL) {
          try {
            // Process refund
            await this.paymentService.refundPayment(payment.id);

            // Update booking status to cancelled
            await this.prisma.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.Cancelled },
            });

            // Decrement event ticket count since booking is cancelled
            await this.prisma.event.update({
              where: { id: eventId },
              data: {
                ticket_booked: {
                  decrement: booking.ticket_quantity,
                },
              },
            });

            // Send email notification to user about refund
            const subject = 'Event Cancelled - Refund Processed';
            const message = `
              <p>Hello ${booking.user.name},</p>
              <p>We regret to inform you that the event <strong>"${event.name}"</strong> has been cancelled.</p>
              <p>Your refund has been processed and will be credited back to your original payment method within 5-10 business days.</p>
              <p><strong>Refund Details:</strong></p>
              <ul>
                <li>Event: ${event.name}</li>
                <li>Booking ID: ${booking.id}</li>
                <li>Amount Refunded: £${payment.amount}</li>
                <li>Refund Date: ${new Date().toLocaleDateString()}</li>
                ${
                  dto.customMessage &&
                  `<li>Custom message: ${dto.customMessage}</li>`
                }
                <li>Custom message: ${dto.customMessage}</li>
              </ul>
              <p>If you have any questions about your refund, please contact our support team.</p>
              <p>We apologize for any inconvenience caused.</p>
              <p>Best regards,<br>The Waddle Team</p>
            `;
            const userPreferences =
              await this.prisma.notificationPreference.findFirst({
                where: { userId: booking.userId },
              });
            if (userPreferences.email) {
              await this.mailer.sendMail(booking.user.email, subject, message);
            }

            // return { success: true, message: 'Event is now fully cancelled' };
          } catch (error) {
            console.error(
              `Failed to process refund for booking ${booking.id}:`,
              error,
            );
            // Continue with other bookings even if one fails
          }
        }
      }

      // Send in-app notifications to users who favorited or liked the event
      const usersToNotify = new Set<string>();
      // Add users who favorited the event (ensure array handling)
      if (Array.isArray(event.favorites)) {
        for (const fav of event.favorites) {
          if (fav?.userId) usersToNotify.add(fav.userId);
        }
      }

      // Add users who liked the event (ensure array handling)
      if (Array.isArray(event.like)) {
        for (const like of event.like) {
          if (like?.userId) usersToNotify.add(like.userId);
        }
      }
      const organiserPreferences =
        await this.prisma.notificationPreference.findFirst({
          where: { organiserId: event.organiserId },
        });
      if (organiserPreferences.cancellation) {
        await this.notificationHelper.sendEventCancellationConfirmation(
          event.organiserId,
          event.name,
        );
      }

      await this.organiserRecentActivity.sendRecentEventCancellationActivity(
        event.organiserId,
        String(event.price),
        confirmedBookings.length,
        event.name,
      );

      // Send in-app notifications with concurrency limit and retries
      // const userIdList = Array.from(usersToNotify);
      // const maxConcurrent = 10;
      // let sentCount = 0;

      // const sendWithRetry = async (userId: string, retries = 2) => {
      //   try {
      //     await this.notificationHelper.sendEventCancellationNotificationToWishlistUsers(
      //       userId,
      //       event.name,
      //     );
      //     sentCount += 1;
      //   } catch (error) {
      //     if (retries > 0) {
      //       // basic backoff
      //       await new Promise((res) => setTimeout(res, 200));
      //       return sendWithRetry(userId, retries - 1);
      //     }
      //     console.error(
      //       `Failed to send notification to user ${userId}:`,
      //       error,
      //     );
      //   }
      // };

      // for (let i = 0; i < userIdList.length; i += maxConcurrent) {
      //   const chunk = userIdList.slice(i, i + maxConcurrent);
      //   await Promise.allSettled(chunk.map((id) => sendWithRetry(id)));
      // }
      // Send in-app notifications with concurrency limit and retries
      const userIdList = Array.from(usersToNotify);
      const maxConcurrent = 10;
      let sentCount = 0;

      const sendWithRetry = async (userId: string, retries = 2) => {
        try {
          // Fetch organiser notification preferences for this event
          const userPreferences =
            await this.prisma.notificationPreference.findFirst({
              where: { userId: userId },
            });

          // Check if notifications are enabled for cancellations
          if (!userPreferences?.replies) {
            console.log(
              `Skipping notification for user ${userId} (organiser disabled cancellations)`,
            );
            return;
          }

          // Try sending notification
          await this.notificationHelper.sendEventCancellationNotificationToWishlistUsers(
            userId,
            event.name,
          );

          sentCount += 1;
        } catch (error) {
          if (retries > 0) {
            // basic backoff
            await new Promise((res) => setTimeout(res, 200));
            return sendWithRetry(userId, retries - 1);
          }
          console.error(
            `Failed to send notification to user ${userId}:`,
            error,
          );
        }
      };

      for (let i = 0; i < userIdList.length; i += maxConcurrent) {
        const chunk = userIdList.slice(i, i + maxConcurrent);
        await Promise.allSettled(chunk.map((id) => sendWithRetry(id)));
      }

      console.log(`Successfully sent ${sentCount} notifications`);

      return {
        message: 'Event cancelled successfully',
        refundsProcessed: confirmedBookings.length,
        notificationsSent: sentCount,
      };
    } catch (error) {
      throw error;
    }
  }

  // async viewAllEvent() {
  //   try {
  //     const events = await this.prisma.event.findMany({
  //       where: { isPublished: true },
  //       include: {
  //         admin: true,
  //         organiser: true,
  //         reviews: true,
  //         bookings: true,
  //         favorites: true,
  //         like: true,
  //         recommendations: true,
  //       },
  //     });

  //     if (!events || events.length <= 0)
  //       throw new NotFoundException('No event found');

  //     const eventWithImage = events.map((event) => {
  //       const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${event.images}`;
  //       return {
  //         ...event,
  //         images,
  //       };
  //     });

  //     return { message: 'All events found', events: eventWithImage };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async viewMyEventsAsOrganiser(creatorId: string) {
    try {
      const event = await this.prisma.event.findMany({
        where: { organiserId: creatorId },
        include: {
          organiser: true,
          reviews: true,
          bookings: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          favorites: true,
          like: true,
          recommendations: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!event || event.length <= 0)
        throw new NotFoundException('No event found');

      const eventWithImage = event.map((list) => {
        const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.files[0]}`;
        return {
          ...list,
          images,
        };
      });

      return { message: 'Events found', events: eventWithImage };
    } catch (error) {
      throw error;
    }
  }

  async viewMyEventsAsAdmin(creatorId: string) {
    try {
      const event = await this.prisma.event.findMany({
        where: { adminId: creatorId },
        include: {
          admin: true,
          reviews: true,
          bookings: true,
          favorites: true,
          like: true,
          recommendations: true,
        },
      });

      if (!event || event.length <= 0)
        throw new NotFoundException('No event found');

      const eventWithImage = event.map((list) => {
        const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.files[0]}`;
        return {
          ...list,
          images,
        };
      });

      return { message: 'Events found', events: eventWithImage };
    } catch (error) {
      throw error;
    }
  }

  // async viewMyEventsAsAdmin(creatorId: string) {
  //   try {
  //     const event = await this.prisma.event.findMany({
  //       where: { adminId: creatorId },
  //       include: {
  //         admin: true,
  //         reviews: true,
  //         bookings: true,
  //         favorites: true,
  //         like: true,
  //         recommendations: true,
  //       },
  //     });

  //     if (!event || event.length <= 0)
  //       throw new NotFoundException('No event found');

  //     const eventWithImage = event.map((list) => {
  //       const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.images}`;
  //       return {
  //         ...list,
  //         images,
  //       };
  //     });

  //     return { message: 'Events found', events: eventWithImage };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async viewOneEvent(id: string) {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id },
        include: { admin: true, organiser: true },
      });
      if (!event)
        throw new NotFoundException(
          'Event with the provdied ID does not exist.',
        );

      const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${event.files[0]}`;

      return { message: 'Event found', event: { ...event, images } };
    } catch (error) {
      throw error;
    }
  }

  async searchEvent(
    name: string,
    age: string,
    price: string,
    tags?: string[] | string,
    facilities?: string[] | string,
    distance?: string,
    eventType?: string,
    parsedDate?: Date,
  ) {
    try {
      const whereClause: any = {
        isDeleted: false,
        isPublished: true,
        status: EventStatus.APPROVED,
        OR: [
          {
            organiser: {
              isDeleted: false,
              status: { not: OrganiserStatus.SUSPENDED },
              is_stripe_connected: true,
              stripe_account_id: { not: null },
            },
          },
          { adminId: { not: null } },
        ],
      };

      if (name) {
        whereClause.name = { contains: name, mode: 'insensitive' };
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate) {
        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const gteDate = startOfDay < today ? today : startOfDay;
        whereClause.date = { gte: gteDate, lt: endOfDay };
      } else {
        whereClause.date = { gte: today };
      }

      // Age range filtering is handled after fetching by overlapping ranges

      if (price) {
        whereClause.price = price;
      }

      if (tags) {
        if (Array.isArray(tags)) {
          whereClause.tags = { hasSome: tags };
        } else {
          whereClause.tags = { has: tags };
        }
      }

      if (facilities) {
        if (Array.isArray(facilities)) {
          whereClause.facilities = { hasSome: facilities };
        } else {
          whereClause.facilities = { has: facilities };
        }
      }

      if (distance) {
        const distNum = Number(distance);
        if (!isNaN(distNum)) {
          whereClause.distance = distNum;
        }
      }

      if (eventType) whereClause.eventType = eventType;

      const event = await this.prisma.event.findMany({
        where: whereClause,
        include: {
          admin: true,
          organiser: true,
        },
      });
      // Filter by age range overlap if age query provided (e.g., "2-6")
      let filteredEvents = event;
      if (age) {
        const parseRange = (value?: string | null) => {
          if (!value) return null;
          const parts = String(value).split('-');
          const trimmed = parts.map((p) => p.trim());
          if (trimmed.length !== 2) return null;
          const min = Number(trimmed[0]);
          const max = Number(trimmed[1]);
          if (Number.isNaN(min) || Number.isNaN(max)) return null;
          return { min, max };
        };

        const requested = parseRange(age);
        if (requested) {
          filteredEvents = event.filter((ev) => {
            const stored = parseRange(ev.age_range as unknown as string);
            if (!stored) return false;
            return requested.min <= stored.max && stored.min <= requested.max;
          });
        } else {
          // If age is a single number or invalid, try to match inclusively against stored range
          const singleAge = Number(age);
          if (!Number.isNaN(singleAge)) {
            filteredEvents = event.filter((ev) => {
              const stored = parseRange(ev.age_range as unknown as string);
              if (!stored) return false;
              return singleAge >= stored.min && singleAge <= stored.max;
            });
          }
        }
      }

      if (!filteredEvents || filteredEvents.length === 0)
        throw new NotFoundException(
          'Event with the provided criteria does not exist.',
        );

      // const eventWithImage = event.map((list) => {
      //   const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.files[0]}`;
      //   return {
      //     ...list,
      //     images,
      //   };
      // });

      return { message: 'Event found', event: filteredEvents };
    } catch (error) {
      throw error;
    }
  }

  async filterEvent(
    age_range?: string,
    category?: string,
    address?: string,
    page = 1,
    limit = 10,
    eventType?: string,
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const whereClause: any = {
        isPublished: true,
        status: EventStatus.APPROVED,
        isDeleted: false,
        date: { gte: today },
        OR: [
          {
            organiser: {
              isDeleted: false,
              status: { not: OrganiserStatus.SUSPENDED },
              is_stripe_connected: true,
              stripe_account_id: { not: null },
            },
          },
          { adminId: { not: null } },
        ],
      };

      if (age_range) whereClause.age_range = age_range;
      if (address)
        whereClause.address = { contains: address, mode: 'insensitive' };
      if (category)
        whereClause.category = { contains: category, mode: 'insensitive' };
      if (eventType) whereClause.eventType = eventType;
      const skip = (page - 1) * limit;

      const [events, total] = await this.prisma.$transaction([
        this.prisma.event.findMany({
          where: whereClause,
          include: {
            admin: true,
            organiser: true,
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.event.count({ where: whereClause }),
      ]);

      // if (!events || events.length === 0) {
      //   throw new NotFoundException(
      //     'No Event found with the provided criteria.',
      //   );
      // }

      // const eventWithImage = events.map((list) => {
      //   const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.files[0]}`;
      //   return { ...list, images };
      // });

      return {
        message: 'Event found',
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        event: events,
      };
    } catch (error) {
      throw error;
    }
  }

  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  async filterEventByLocation(
    latitude: number,
    longitude: number,
    radius = 10, // in km
    age_range?: string,
    category?: string,
    page = 1,
    limit = 10,
    eventType?: string,
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const whereClause: any = {
        isPublished: true,
        status: EventStatus.APPROVED,
        isDeleted: false,
        date: { gte: today },
        OR: [
          {
            organiser: {
              isDeleted: false,
              status: { not: OrganiserStatus.SUSPENDED },
              is_stripe_connected: true,
              stripe_account_id: { not: null },
            },
          },
          { adminId: { not: null } },
        ],
      };

      if (age_range) whereClause.age_range = age_range;
      if (category)
        whereClause.category = { contains: category, mode: 'insensitive' };
      if (eventType) whereClause.eventType = eventType;

      // We need to fetch all matching events to filter by location in memory
      // because we don't have geospatial index or lat/long columns
      const events = await this.prisma.event.findMany({
        where: whereClause,
        include: {
          admin: true,
          organiser: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filter by location
      const eventsWithDistance = await Promise.all(
        events.map(async (event) => {
          const coords = await this.getCoordinatesFromAddress(event.address);
          if (!coords) return null;

          const distance = this.calculateDistance(
            Number(latitude),
            Number(longitude),
            coords.lat,
            coords.lng,
          );
          return { ...event, distance };
        }),
      );

      const filteredEvents = eventsWithDistance.filter(
        (event) => event && event.distance <= Number(radius),
      );

      // Pagination in memory
      const total = filteredEvents.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

      return {
        message: 'Event found',
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        event: paginatedEvents,
      };
    } catch (error) {
      throw error;
    }
  }

  private async getCoordinatesFromAddress(
    address: string,
  ): Promise<{ lat: number; lng: number } | null> {
    if (!address) return null;

    // Check if address is already in "lat,lng" format (fallback/optimization)
    const parts = address.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address,
      )}&key=${this.GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
    } catch (error) {
      console.error('Error geocoding address:', address, error);
    }
    return null;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // async updateEventAsAdmin(
  //   id: string,
  //   creatorId: string,
  //   dto: UpdateEventDto,
  //   fileName?: string,
  //   file?: Buffer,
  // ) {
  //   try {
  //     const existingEvent = await this.prisma.event.findUnique({
  //       where: { id, adminId: creatorId },
  //     });

  //     if (!existingEvent)
  //       throw new NotFoundException(
  //         'Event with the provided ID does not exist.',
  //       );

  //     if (new Date(existingEvent.date) <= new Date())
  //       throw new ForbiddenException('Past event can not be updated');

  //     let image = existingEvent?.files[0] || undefined;

  //     // Upload the new image
  //     if (image !== fileName) {
  //       await this.uploadEventImages(fileName, file);

  //       // Delete the old image from bucket
  //       await this.deleteEventImages(image);

  //       // Update the profile image filename
  //       image = fileName;
  //     }

  //     const isPublished = this.stringToBoolean(dto.isPublished);

  //     // Transform the DTO to match Prisma schema
  //     const { ...restDto } = dto;
  //     const updateData = {
  //       ...restDto,
  //       // instruction:
  //       //   instructions && instructions.length > 0 ? instructions[0] : undefined,
  //       date: dto.date ? new Date(dto.date) : undefined,
  //       total_ticket: Number(dto.total_ticket) || undefined,
  //       isPublished,
  //       distance: 0,
  //       facilities: dto.facilities ?? [],
  //       tags: dto.tags ?? [],
  //     };

  //     const event = await this.prisma.event.update({
  //       where: {
  //         id: existingEvent.id,
  //       },
  //       data: updateData,
  //     });

  //     return { message: 'Event updated', event };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async updateEventAsAdmin(id: string, creatorId: string, dto: UpdateEventDto) {
    // Find event owned by this admin
    const existingEvent = await this.prisma.event.findFirst({
      where: { id, adminId: creatorId },
    });

    if (!existingEvent) {
      throw new NotFoundException('Event with the provided ID does not exist.');
    }

    // Prevent updates to past events

    // Ensure type conversions where necessary
    const updateData: any = {
      ...dto,
      date: dto.date ? new Date(dto.date) : undefined,
      total_ticket: dto.total_ticket ? Number(dto.total_ticket) : undefined,
      distance: dto.distance !== undefined ? dto.distance : undefined,
    };

    // Remove undefined fields so Prisma doesn't overwrite them
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    // Update event
    const event = await this.prisma.event.update({
      where: { id: existingEvent.id },
      data: updateData,
    });

    return { message: 'Event updated', event };
  }

  async publishAdminDraftedEvent(
    id: string,
    creatorId: string,
    dto: UpdateEventDto,
  ) {
    // Find event owned by this admin
    const existingEvent = await this.prisma.event.findFirst({
      where: { id, adminId: creatorId },
    });

    if (!existingEvent) {
      throw new NotFoundException('Event with the provided ID does not exist.');
    }

    // Prevent updates to past events

    // Ensure type conversions where necessary
    const updateData: any = {
      ...dto,
      status: EventStatus.APPROVED,
      isPublished: true,
      date: dto.date ? new Date(dto.date) : undefined,
      total_ticket: dto.total_ticket ? Number(dto.total_ticket) : undefined,
      distance: dto.distance !== undefined ? dto.distance : undefined,
    };

    // Remove undefined fields so Prisma doesn't overwrite them
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    // Update event
    const event = await this.prisma.event.update({
      where: { id: existingEvent.id },
      data: updateData,
    });

    return { message: 'Event updated', event };
  }

  async updateEventAsOrganiser(
    id: string,
    creatorId: string,
    dto: UpdateEventDto,
  ) {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id, organiserId: creatorId },
      });

      if (!existingEvent)
        throw new NotFoundException(
          'Event with the provided ID does not exist.',
        );

      // if (new Date(existingEvent.date) <= new Date())
      //   throw new ForbiddenException('Past event can not be updated');

      // let image = existingEvent?.files[0] || undefined;

      // // Upload the new image
      // if (image !== fileName) {
      //   await this.uploadEventImages(fileName, file);

      //   // Delete the old image from bucket
      //   await this.deleteEventImages(image);

      //   // Update the profile image filename
      //   image = fileName;
      // }

      const isPublished = this.stringToBoolean(dto.isPublished);

      // Transform the DTO to match Prisma schema
      const { ...restDto } = dto;
      const updateData = {
        ...restDto,
        // instruction:
        //   instructions && instructions.length > 0 ? instructions[0] : undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        // images: image || null,
        total_ticket: Number(dto.total_ticket) || undefined,
        isPublished,
        distance: 0,
        facilities: dto.facilities ?? [],
        tags: dto.tags ?? [],
      };

      const event = await this.prisma.event.update({
        where: {
          id: existingEvent.id,
        },
        data: updateData,
      });

      return { message: 'Event updated', event };
    } catch (error) {
      throw error;
    }
  }

  // async updateEvent(
  //   id: string,
  //   creatorId: string,
  //   dto: UpdateEventDto,
  //   files?: Array<{ filename: string; buffer: Buffer }>, // Changed to handle multiple files
  // ) {
  //   try {
  //     const existingEvent = await this.prisma.event.findUnique({
  //       where: { id, creatorId },
  //     });

  //     if (!existingEvent) {
  //       throw new NotFoundException(
  //         'Event with the provided ID does not exist.',
  //       );
  //     }

  //     if (new Date(existingEvent.date) <= new Date()) {
  //       throw new ForbiddenException('Past event cannot be updated');
  //     }

  //     let existingImageNames: string[] = existingEvent.images
  //       ? existingEvent.images.split(',')
  //       : []; //get existing images

  //     if (files && files.length > 0) {
  //       // Upload new images
  //       const uploadedImageNames: string[] = [];
  //       for (const file of files) {
  //         const fileName = file.filename;
  //         await this.s3Client.send(
  //           new PutObjectCommand({
  //             Bucket: this.config.getOrThrow('BUCKET_NAME'),
  //             Key: fileName,
  //             Body: file.buffer,
  //           }),
  //         );
  //         uploadedImageNames.push(fileName);
  //       }

  //       // Delete old images
  //       for (const imageName of existingImageNames) {
  //         await this.s3Client.send(
  //           new DeleteObjectCommand({
  //             Bucket: this.config.getOrThrow('BUCKET_NAME'),
  //             Key: imageName,
  //           }),
  //         );
  //       }
  //       existingImageNames = uploadedImageNames; // Update imageNames
  //     }
  //     const isPublished = this.stringToBoolean(dto.isPublished);
  //     const event = await this.prisma.event.update({
  //       where: {
  //         id: existingEvent.id,
  //       },
  //       data: <any>{
  //         ...dto,
  //         date: dto.date ? new Date(dto.date) : undefined,
  //         images: existingImageNames.join(',') || null, //save the image names
  //         total_ticket: Number(dto.total_ticket) || undefined,
  //         isPublished,
  //       },
  //     });

  //     return { message: 'Event updated', event };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async softDeleteEvent(id: string) {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent)
        throw new NotFoundException(
          'Event with the provided ID does not exist.',
        );

      // Optional: delete associated images if any
      if (existingEvent.files && existingEvent.files.length > 0) {
        await this.deleteEventImages(existingEvent.files[0]);
      }

      // Soft delete by setting isDeleted to true and isPublished to false
      await this.prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          isDeleted: true,
          isPublished: false, // optional: unpublish when soft-deleted
        },
      });

      return { message: 'Event soft-deleted successfully.' };
    } catch (error) {
      throw error;
    }
  }

  async deleteEvent(id: string) {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent)
        throw new NotFoundException(
          'Event with the provided ID does not exist.',
        );

      if (existingEvent?.files && existingEvent.files.length > 0) {
        await this.deleteEventImages(existingEvent.files[0]);
      }

      await this.prisma.$transaction([
        this.prisma.payment.deleteMany({ where: { eventId: id } }),
        this.prisma.booking.deleteMany({ where: { eventId: id } }),
        this.prisma.review.deleteMany({ where: { eventId: id } }),
        this.prisma.recommendation.deleteMany({ where: { eventId: id } }),
        this.prisma.like.deleteMany({ where: { eventId: id } }),
        this.prisma.favorite.deleteMany({ where: { eventId: id } }),
        this.prisma.dispute.deleteMany({ where: { eventId: id } }),
        this.prisma.event.delete({ where: { id } }),
      ]);

      return { message: 'Event deleted.' };
    } catch (error) {
      throw error;
    }
  }

  async reportEvent(userId: string, eventId: string, dto: ReportEventDto) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        isDeleted: false,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const existingReport = await this.prisma.eventReport.findFirst({
      where: {
        eventId,
        reporterId: userId,
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this event');
    }

    const report = await this.prisma.eventReport.create({
      data: {
        eventId,
        reporterId: userId,
        reason: dto.reason,
        description: dto.description,
      },
    });

    return {
      message: 'Event reported successfully',
      report,
    };
  }

  private uploadEventImages(fileName: string, file: Buffer) {
    console.log('Uploading to S3:', {
      fileName,
      fileSize: file.length,
      bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
      folder: this.config.getOrThrow('S3_EVENT_FOLDER'),
    });

    return this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
        Key: `${this.config.getOrThrow('S3_EVENT_FOLDER')}/${fileName}`,
        Body: file,
        ACL: 'public-read',
      }),
    );
  }

  private deleteEventImages(fileName: string) {
    return this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
        Key:
          `${this.config.getOrThrow('S3_EVENT_FOLDER')}/${fileName}` || 'null',
      }),
    );
  }

  private stringToBoolean(value: string | boolean): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === 'true') {
      return true;
    } else if (value === 'false') {
      return false;
    }
    return undefined;
  }
}
