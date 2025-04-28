import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto, UpdateEventDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Role } from '../auth/enum/role.enum';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AdminRole } from 'src/auth/enum';

@Injectable()
export class EventService {
  private readonly s3Client = new S3Client({
    region: 'auto',
    endpoint: this.config.getOrThrow('S3_API'),
    credentials: {
      accessKeyId: this.config.getOrThrow('ACCESS_KEY_ID'),
      secretAccessKey: this.config.getOrThrow('SECRET_ACCESS_KEY'),
    },
  });

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async createEvent(
    creatorId: string,
    creatorType: string,
    dto: CreateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      if (file) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: fileName,
            Body: file,
          }),
        );
      }

      const date = new Date(dto.date);
      const isPublished = this.stringToBoolean(dto.isPublished);

      const event = await this.prisma.event.create({
        data: {
          ...dto,
          date,
          total_ticket: Number(dto.total_ticket),
          images: fileName || null,
          isPublished,
          creatorId,
          creatorType,
        },
      });

      return {message: "Event created", event};
    } catch (error) {
      throw error;
    }
  }

  async viewAllEvent() {
    try {
      const events = await this.prisma.event.findMany({
        where: { isPublished: true },
      });

      if (!events || events.length <= 0)
        throw new NotFoundException('No event found');

      const eventWithImage = events.map((event) => {
        const images = `${process.env.R2_PUBLIC_ENDPOINT}/${event.images}`;
        return {
          ...event,
          images,
        };
      });

      return {message: "All events found", events: eventWithImage};
    } catch (error) {
      throw error;
    }
  }

  async viewMyEvents(creatorId: string) {
    try {
      const event = await this.prisma.event.findMany({
        where: {creatorId},
      });

      if (!event || event.length <= 0)
        throw new NotFoundException('No event found');

      const eventWithImage = event.map((list) => {
        const images = `${process.env.R2_PUBLIC_ENDPOINT}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return {message: "Events found", events: eventWithImage};
    } catch (error) {
      throw error;
    }
  }

  async viewOneEvent(id: string) {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id },
      });
      if (!event)
        throw new NotFoundException(
          'Event with the provdied ID does not exist.',
        );

      const images = `${process.env.R2_PUBLIC_ENDPOINT}/${event.images}`;

      return { message: "Event found", event: {...event, images} };
    } catch (error) {
      throw error;
    }
  }

  async searchEvent(name: string, age: string, price: string) {
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

      const event = await this.prisma.event.findMany({
        where: whereClause,
      });
      if (!event || event.length === 0)
        throw new NotFoundException(
          'Event with the provided name does not exist.',
        );

      const eventWithImage = event.map((list) => {
        const images = `${process.env.R2_PUBLIC_ENDPOINT}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return {message: "Event found", event: eventWithImage};
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
      });

      if (!event || event.length === 0) {
        throw new NotFoundException(
          'No Event found with the provided criteria.',
        );
      }

      const eventWithImage = event.map((list) => {
        const images = `${process.env.R2_PUBLIC_ENDPOINT}/${list.images}`;
        return {
          ...list,
          images,
        };
      });

      return {message: "Event found", event: eventWithImage};
    } catch (error) {
      throw error;
    }
  }

  async updateEvent(
    id: string,
    creatorId: string,
    dto: UpdateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: {id, creatorId},
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
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: fileName,
            Body: file,
          }),
        );

        // Delete the old image from bucket
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: image || 'null',
          }),
        );

        // Update the profile image filename
        image = fileName;
      }

      const isPublished = this.stringToBoolean(dto.isPublished);
      const event = await this.prisma.event.update({
        where: {
          id: existingEvent.id,
        },
        data: <any>{
          ...dto,
          date: dto.date ? new Date(dto.date) : undefined,
          images: image || null,
          total_ticket: Number(dto.total_ticket) || undefined,
          isPublished,
        },
      });

      return {message: "Event updated", event};
    } catch (error) {
      throw error;
    }
  }

  async deleteEvent(id: string, creatorId: string) {
    try {
      const existingEvent = await this.prisma.event.findUnique({
        where: {id, creatorId},
      });

      if (!existingEvent)
        throw new NotFoundException(
          'Event with the provdied ID does not exist.',
        );

      if (existingEvent?.images) {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.config.getOrThrow('BUCKET_NAME'),
            Key: existingEvent.images,
          }),
        );
      }

      await this.prisma.event.delete({
        where: { id: existingEvent.id },
      });

      return { message: 'Event deleted.' };
    } catch (error) {
      throw error;
    }
  }

  private stringToBoolean(str: any) {
    if (typeof str !== 'string') {
      return !!str; // handles non-string inputs
    }

    const lowerStr = str.toLowerCase();

    if (lowerStr === 'true') {
      return true;
    } else if (lowerStr === 'false') {
      return false;
    } else {
      //Handles cases of "1","0", or any other string.
      if (!Number.isNaN(Number(str))) {
        return !!Number(str);
      }
      return !!str; //Default behavior for any other string.
    }
  }
}
