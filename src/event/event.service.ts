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

  // function to add a event to the database
  async create(
    userId: string,
    userRole: string,
    dto: CreateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const vendorVerify = await this.prisma.vendor.findUnique({
        where: { id: userId },
      });
      const adminVerify = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!vendorVerify?.isVerified && !adminVerify?.email_verify)
        throw new ForbiddenException('You are not veified');

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

      // Determine whether to store vendorId or adminId
      const eventData: any = {
        ...dto,
        date,
        total_ticket: Number(dto.total_ticket),
        images: fileName || null,
        isPublished,
      };

      if (userRole === Role.Vendor) {
        eventData.vendorId = userId;
      } else if (userRole === Role.Admin) {
        eventData.adminId = userId;
      }

      const event = await this.prisma.event.create({
        data: eventData,
      });

      return event;
    } catch (error) {
      throw error;
    }
  }

  // function to find all Event from the database
  async findAll() {
    try {
      const events = await this.prisma.event.findMany({
        where: { isPublished: true },
        include: { vendor: true, admin: true },
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

      return eventWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to find all my event from the database
  async findMyEvents(userId: string, userRole: string) {
    try {
      const whereClause: any = {};

      if (userRole === Role.Vendor) {
        whereClause.vendorId = userId;
      } else if (userRole === Role.Admin) {
        whereClause.adminId = userId;
      }

      const event = await this.prisma.event.findMany({
        where: whereClause,
        include: { vendor: true, admin: true },
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

      return eventWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to find a event from the database
  async findOne(id: string) {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id },
        include: {
          vendor: true,
          admin: true,
        },
      });
      if (!event)
        throw new NotFoundException(
          'Event with the provdied ID does not exist.',
        );

      const images = `${process.env.R2_PUBLIC_ENDPOINT}/${event.images}`;

      return { ...event, images };
    } catch (error) {
      throw error;
    }
  }

  // function to search for event from the database
  async search(name: string, age: string, price: string) {
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
        include: { vendor: true, admin: true },
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

      return eventWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to filter event by age range or category from the database
  async filter(age_range?: string, category?: string, address?: string) {
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
        include: { vendor: true, admin: true },
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

      return eventWithImage;
    } catch (error) {
      throw error;
    }
  }

  // function to update an event in the database
  async update(
    id: string,
    userId: string,
    userRole: string,
    dto: UpdateEventDto,
    fileName?: string,
    file?: Buffer,
  ) {
    try {
      const vendorVerify = await this.prisma.vendor.findUnique({
        where: { id: userId },
      });
      const adminVerify = await this.prisma.admin.findUnique({
        where: { id: userId },
      });

      if (!vendorVerify?.isVerified && !adminVerify?.email_verify)
        throw new ForbiddenException('You are not veified');

      const whereClause: any = {};

      if (userRole === Role.Vendor) {
        whereClause.id = id;
        whereClause.vendorId = userId;
      } else if (userRole === Role.Admin) {
        whereClause.id = id;
        whereClause.adminId = userId;
      }

      const existingEvent = await this.prisma.event.findUnique({
        where: whereClause,
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

      return event;
    } catch (error) {
      throw error;
    }
  }

  // function to delete an event from the database
  async remove(id: string, userId: string, userRole: string) {
    try {
      const whereClause: any = {};

      if (userRole === Role.Vendor) {
        whereClause.id = id;
        whereClause.vendorId = userId;
      } else if (userRole === Role.Admin) {
        whereClause.id = id;
        whereClause.adminId = userId;
      }

      const existingEvent = await this.prisma.event.findUnique({
        where: whereClause,
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
