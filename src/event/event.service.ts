import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto, UpdateEventDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { EventStatus } from 'src/utils/constants/eventTypes';
import { DraftEventDto } from './dto/draft-event.dto';
import { NotificationHelper } from 'src/notification/notification.helper';

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
  ) {}

  async createEventByOrganiser(
    creatorId: string,
    dto: CreateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      if (file) await this.uploadEventImages(fileName, file);

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

  async publishDraftedEventByOrganiser(eventId: string, creatorId: string) {
    try {
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
        },
      });

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
        await this.notificationHelper.sendEventApprovalNotification(
          event.organiserId,
          event.name,
          true,
        );
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
        await this.notificationHelper.sendEventApprovalNotification(
          event.organiserId,
          event.name,
          false,
        );
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

      const events = await this.prisma.event.findMany({
        where: { isPublished: true },
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
        where: { isPublished: true },
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
            {
              isPublished: true, // Include all published events
            },
            {
              status: 'PENDING', // Include all pending events
            },
            {
              AND: [
                {
                  isPublished: false, // Drafted events
                },
                {
                  adminId: adminId, // Only include drafted events created by current admin
                },
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

  async viewAllCancelledEventAsAdmin(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [total, events] = await this.prisma.$transaction([
        this.prisma.event.count({
          where: {
            isDeleted: false,
            status: EventStatus.CANCELLED,
          },
        }),
        this.prisma.event.findMany({
          where: {
            isDeleted: false,
            status: EventStatus.CANCELLED,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
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
  ) {
    try {
      const whereClause: any = {
        isDeleted: false,
        isPublished: true,
        status: EventStatus.APPROVED,
      };

      if (name) {
        whereClause.name = { contains: name, mode: 'insensitive' };
      }

      if (age) {
        whereClause.age_range = age;
      }

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
        include: { admin: true, organiser: true },
      });
      if (!event || event.length === 0)
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

      return { message: 'Event found', event };
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
      const whereClause: Record<
        string,
        | string
        | number
        | boolean
        | string[]
        | { contains: string; mode: string }
      > = {
        isPublished: true,
        status: EventStatus.APPROVED,
        isDeleted: false,
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
          include: { admin: true, organiser: true },
          skip,
          take: limit,
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

      if (new Date(existingEvent.date) <= new Date())
        throw new ForbiddenException('Past event can not be updated');

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
