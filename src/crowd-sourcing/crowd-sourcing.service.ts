import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateCrowdSourcingDto, UpdateCrowdSourcingDto } from './dto';

@Injectable()
export class CrowdSourcingService {
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

  async createSourcedEvent(
    creatorId: string,
    _dto: CreateCrowdSourcingDto,
    fileNames?: string[],
    files?: Buffer[],
  ) {
    try {
      if (files && fileNames && files.length === fileNames.length) {
        await this.uploadEventImagesMultiple(fileNames, files);
      }

      const event = await this.prisma.crowdSource.create({
        data: {
          ..._dto,
          images: fileNames || [],
          creatorId,
        },
      });

      return { message: 'Event created', event };
    } catch (error) {
      throw error;
    }
  }

  async findAllSourcedEvent() {
    const events = await this.prisma.crowdSource.findMany({
      where: { isDeleted: false, isVerified: true },
      include: { like: true },
    });
    if (!events || events.length === 0) {
      throw new NotFoundException('No events found');
    }

    const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    const url = `${baseUrl}/${folder}`;

    const eventsWithFullImageUrls = events.map((event) => {
      const fullImageUrls = event.images.map((image) => `${url}/${image}`);
      return {
        ...event,
        images: fullImageUrls,
      };
    });

    return { message: 'Events found', events: eventsWithFullImageUrls };
  }

  async findOneSourcedEvent(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
      include: { like: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    const url = `${baseUrl}/${folder}`;

    const fullImageUrls = event.images.map((image) => `${url}/${image}`);

    return {
      message: 'Event found',
      event: { ...event, images: fullImageUrls },
    };
  }

  async verifyCrowdSourcedEvent(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    const updatedEvent = await this.prisma.crowdSource.update({
      where: { id },
      data: { isVerified: true },
    });

    return {
      message: 'Event verified',
      event: updatedEvent,
    };
  }

  async updateSourcedEvent(
    creatorId: string,
    id: string,
    dto: UpdateCrowdSourcingDto,
    fileNames?: string[],
    files?: Buffer[],
  ) {
    // Find existing event
    const existingEvent = await this.prisma.crowdSource.findUnique({
      where: { id, creatorId },
    });

    if (!existingEvent) {
      throw new Error(`CrowdSource event with id ${id} not found`);
    }

    // Handle image updates
    let updatedImages = existingEvent.images;

    if (files && fileNames && files.length === fileNames.length) {
      // Upload new images
      await this.uploadEventImagesMultiple(fileNames, files);

      // Determine images to delete (those in existing but not in new fileNames)
      const imagesToDelete = existingEvent.images.filter(
        (img) => !fileNames.includes(img),
      );

      // Delete old images from S3
      const deletePromises = imagesToDelete.map((image) =>
        this.deleteEventImages(image),
      );
      await Promise.all(deletePromises);

      // Update images array
      updatedImages = fileNames;
    }

    // Update event in database
    const updatedEvent = await this.prisma.crowdSource.update({
      where: { id, creatorId },
      data: {
        ...dto,
        images: updatedImages,
      },
    });

    return { message: 'Event updated', event: updatedEvent };
  }

  async removeSourcedEventTemp(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`CrowdSource event with id ${id} not found`);
    }

    await this.prisma.crowdSource.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: `Event with id ${id} removed successfully` };
  }

  async removeSourcedEvent(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`CrowdSource event with id ${id} not found`);
    }

    // Delete images from S3
    const deletePromises = event.images.map((image) =>
      this.deleteEventImages(image),
    );
    await Promise.all(deletePromises);

    // Delete the event from the database
    await this.prisma.crowdSource.delete({
      where: { id },
    });

    return { message: `Event with id ${id} deleted successfully` };
  }

  private async uploadEventImagesMultiple(
    fileNames: string[],
    files: Buffer[],
  ) {
    const uploadPromises = fileNames.map((fileName, index) =>
      this.uploadEventImages(fileName, files[index]),
    );
    await Promise.all(uploadPromises);
  }

  private uploadEventImages(fileName: string, file: Buffer) {
    return this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
        Key: `${this.config.getOrThrow('S3_CROWDSOURCE_FOLDER')}/${fileName}`,
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

  private stringToBoolean(value: string): boolean {
    if (value === 'true') {
      return true;
    } else if (value === 'false') {
      return false;
    }
    return undefined;
  }
}
