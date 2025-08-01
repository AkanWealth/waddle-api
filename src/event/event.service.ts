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
      const isPublished = dto.isPublished ?? false;

      // Transform the DTO to match Prisma schema
      const { instructions, ...restDto } = dto;
      const eventData = {
        ...restDto,
        instruction:
          instructions && instructions.length > 0 ? instructions[0] : null,
        date,
        total_ticket: Number(dto.total_ticket),
        images: fileName || null,
        isPublished: Boolean(isPublished),
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

  async createEventByAdmin(
    creatorId: string,
    dto: CreateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      console.log('Creating event by admin:', {
        creatorId,
        fileName,
        fileSize: file?.length,
        dtoKeys: Object.keys(dto),
        dtoData: dto,
      });

      if (file) {
        console.log('Uploading file to S3...');
        await this.uploadEventImages(fileName, file);
        console.log('File uploaded successfully');
      }

      const date = new Date(dto.date);
      const isPublished = dto.isPublished ?? false;

      // Transform the DTO to match Prisma schema
      const { instructions, ...restDto } = dto;
      const eventData = {
        ...restDto,
        instruction:
          instructions && instructions.length > 0 ? instructions[0] : null,
        date,
        total_ticket: Number(dto.total_ticket),
        images: fileName || null,
        isPublished,
        adminId: creatorId,
        distance: 0,
        facilities: dto.facilities ?? [],
        tags: dto.tags ?? [],
      };

      console.log('Creating event in database with data:', eventData);
      const event = await this.prisma.event.create({
        data: eventData,
      });

      console.log('Event created successfully:', event.id);
      return { message: 'Event created', event };
    } catch (error) {
      console.error('Error creating event by admin:', error);
      throw error;
    }
  }

  // async createEvent(
  //   creatorId: string,
  //   creatorType: string,
  //   dto: CreateEventDto,
  //   files?: Array<{ filename: string; buffer: Buffer }>, // Changed to handle multiple files
  // ) {
  //   try {
  //     let imageNames: string[] = []; // Array to store uploaded image names
  //     if (files && files.length > 0) {
  //       // Iterate through the files array and upload each image
  //       for (const file of files) {
  //         const fileName = file.filename; // Use the filename from the file object
  //         await this.s3Client.send(
  //           new PutObjectCommand({
  //             Bucket: this.config.getOrThrow('BUCKET_NAME'),
  //             Key: fileName, // Use the generated filename
  //             Body: file.buffer,
  //           }),
  //         );
  //         imageNames.push(fileName); // Add the filename to the array
  //       }
  //     }

  //     const date = new Date(dto.date);
  //     const isPublished = this.stringToBoolean(dto.isPublished);

  //     const event = await this.prisma.event.create({
  //       data: {
  //         ...dto,
  //         date,
  //         total_ticket: Number(dto.total_ticket),
  //         images: imageNames.join(',') || null, // Store the image names as a comma-separated string, or null if no images
  //         isPublished,
  //         creatorId,
  //         creatorType,
  //       },
  //     });

  //     return { message: 'Event created', event };
  //   } catch (error) {
  //     throw error;
  //   }
  // }

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
        const imageUrl = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${event.images}`;
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

  async viewAllEventAdmin() {
    try {
      const events = await this.prisma.event.findMany({
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
          date: 'desc',
        },
      });

      if (!events || events.length === 0) {
        return {
          message: 'No events found.',
          events: [],
        };
      }

      const eventsWithImages = events.map((event) => {
        const imageUrl = event.images
          ? `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${event.images}`
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
          bookings: true,
          favorites: true,
          like: true,
          recommendations: true,
        },
      });

      if (!event || event.length <= 0)
        throw new NotFoundException('No event found');

      const eventWithImage = event.map((list) => {
        const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.images}`;
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
        const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.images}`;
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

      const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${event.images}`;

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
  ) {
    try {
      const whereClause: any = {};

      if (name) {
        whereClause.name = { contains: name, mode: 'insensitive' };
        whereClause.isPublished = true;
      }

      if (age) {
        whereClause.age_range = age;
        whereClause.isPublished = true;
      }

      if (price) {
        whereClause.price = price;
        whereClause.isPublished = true;
      }

      if (tags) {
        if (Array.isArray(tags)) {
          whereClause.tags = { hasSome: tags };
        } else {
          whereClause.tags = { has: tags };
        }
        whereClause.isPublished = true;
      }

      if (facilities) {
        if (Array.isArray(facilities)) {
          whereClause.facilities = { hasSome: facilities };
        } else {
          whereClause.facilities = { has: facilities };
        }
        whereClause.isPublished = true;
      }

      if (distance) {
        const distNum = Number(distance);
        if (!isNaN(distNum)) {
          whereClause.distance = distNum;
          whereClause.isPublished = true;
        }
      }

      const event = await this.prisma.event.findMany({
        where: whereClause,
        include: { admin: true, organiser: true },
      });
      if (!event || event.length === 0)
        throw new NotFoundException(
          'Event with the provided criteria does not exist.',
        );

      const eventWithImage = event.map((list) => {
        const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return { message: 'Event found', event: eventWithImage };
    } catch (error) {
      throw error;
    }
  }

  async filterEvent(age_range?: string, category?: string, address?: string) {
    try {
      const whereClause: any = {};

      if (age_range) {
        whereClause.age_range = age_range;
        whereClause.isPublished = true;
      }

      if (address) {
        whereClause.address = { contains: address, mode: 'insensitive' };
        whereClause.isPublished = true;
      }

      if (category) {
        whereClause.category = { equals: category, mode: 'insensitive' };
        whereClause.isPublished = true;
      }

      const event = await this.prisma.event.findMany({
        where: whereClause,
        include: { admin: true, organiser: true },
      });

      if (!event || event.length === 0) {
        throw new NotFoundException(
          'No Event found with the provided criteria.',
        );
      }

      const eventWithImage = event.map((list) => {
        const images = `${process.env.S3_PUBLIC_URL}/${this.config.getOrThrow('S3_EVENT_FOLDER')}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return { message: 'Event found', event: eventWithImage };
    } catch (error) {
      throw error;
    }
  }

  async updateEventAsAdmin(
    id: string,
    creatorId: string,
    dto: UpdateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id, adminId: creatorId },
      });

      if (!existingEvent)
        throw new NotFoundException(
          'Event with the provided ID does not exist.',
        );

      if (new Date(existingEvent.date) <= new Date())
        throw new ForbiddenException('Past event can not be updated');

      let image = existingEvent?.images || undefined;

      // Upload the new image
      if (image !== fileName) {
        await this.uploadEventImages(fileName, file);

        // Delete the old image from bucket
        await this.deleteEventImages(image);

        // Update the profile image filename
        image = fileName;
      }

      const isPublished = this.stringToBoolean(dto.isPublished);

      // Transform the DTO to match Prisma schema
      const { instructions, ...restDto } = dto;
      const updateData = {
        ...restDto,
        instruction:
          instructions && instructions.length > 0 ? instructions[0] : undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        images: image || null,
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

  async updateEventAsOrganiser(
    id: string,
    creatorId: string,
    dto: UpdateEventDto,
    fileName?: string,
    file?: Buffer,
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

      let image = existingEvent?.images || undefined;

      // Upload the new image
      if (image !== fileName) {
        await this.uploadEventImages(fileName, file);

        // Delete the old image from bucket
        await this.deleteEventImages(image);

        // Update the profile image filename
        image = fileName;
      }

      const isPublished = this.stringToBoolean(dto.isPublished);

      // Transform the DTO to match Prisma schema
      const { instructions, ...restDto } = dto;
      const updateData = {
        ...restDto,
        instruction:
          instructions && instructions.length > 0 ? instructions[0] : undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        images: image || null,
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

  async deleteEvent(id: string) {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: { id },
      });

      if (!existingEvent)
        throw new NotFoundException(
          'Event with the provided ID does not exist.',
        );

      if (existingEvent?.images) {
        await this.deleteEventImages(existingEvent.images);
      }

      await this.prisma.event.delete({
        where: { id: existingEvent.id },
      });

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
