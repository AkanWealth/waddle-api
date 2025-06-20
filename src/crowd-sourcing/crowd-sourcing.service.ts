import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  CommentCrowdSourcingDto,
  CreateCrowdSourcingDto,
  UpdateCrowdSourcingDto,
} from './dto';

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

      const date = new Date(_dto.date);
      const event = await this.prisma.crowdSource.create({
        data: <any>{
          ..._dto,
          images: fileNames || [],
          date,
          creatorId,
          isPublished: this.stringToBoolean(_dto.isPublished),
        },
      });

      return { message: 'CrowdSource created', event };
    } catch (error) {
      throw error;
    }
  }

  async findAllSourcedEvent(page: number, pageSize: number) {
    try {
      const calSkip = (page - 1) * pageSize;
      const events = await this.prisma.crowdSource.findMany({
        where: {
          isDeleted: false,
          isVerified: true,
          isPublished: true,
          tag: 'Event',
        },
        skip: calSkip,
        take: pageSize,
        include: { like: true, creator: true },
      });

      const totalEvents = await this.prisma.crowdSource.count({
        where: {
          isDeleted: false,
          isVerified: true,
          isPublished: true,
          tag: 'Event',
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

      const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
      const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
      const url = `${baseUrl}/${folder}`;

      const eventsWithImage = events.map((event) => {
        const imageUrls = event.images.map((image) => `${url}/${image}`);
        return {
          ...event,
          images: imageUrls,
        };
      });

      return {
        message: 'Events found',
        events: eventsWithImage,
        totalEvents: totalEvents,
        currentPage: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalEvents / pageSize),
      };
    } catch (error) {
      throw error;
    }
  }

  async findAllSourcedEventAdmin() {
    try {
      const events = await this.prisma.crowdSource.findMany({
        where: {
          isDeleted: false,
          isVerified: true,
          isPublished: true,
          tag: 'Event',
        },

        include: { like: true, creator: true },
      });

      const totalEvents = await this.prisma.crowdSource.count({
        where: {
          isDeleted: false,
          isVerified: true,
          isPublished: true,
          tag: 'Event',
        },
      });
      if (!events || events.length === 0) {
        return {
          message: 'No events found for the given page.',
          events: [],
          totalEvents: totalEvents,
        };
      }

      const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
      const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
      const url = `${baseUrl}/${folder}`;

      const eventsWithImage = events.map((event) => {
        const imageUrls = event.images.map((image) => `${url}/${image}`);
        return {
          ...event,
          images: imageUrls,
        };
      });

      return {
        message: 'Events found',
        events: eventsWithImage,
        totalEvents: totalEvents,
      };
    } catch (error) {
      throw error;
    }
  }

  async findAllSourcedPlace(page: number, pageSize: number) {
    const calSkip = (page - 1) * pageSize;
    const places = await this.prisma.crowdSource.findMany({
      where: {
        isDeleted: false,
        isVerified: true,
        isPublished: true,
        tag: 'Place',
      },
      skip: calSkip,
      take: pageSize,
      include: { like: true, creator: true },
    });

    const totalPlaces = await this.prisma.crowdSource.count({
      where: {
        isDeleted: false,
        isVerified: true,
        isPublished: true,
        tag: 'Place',
      },
    });
    if (!places || places.length === 0) {
      return {
        message: 'No place found for the given page.',
        events: [],
        totalPlaces: totalPlaces,
        currentPage: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalPlaces / pageSize),
      };
    }

    const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    const url = `${baseUrl}/${folder}`;

    const placesWithImage = places.map((place) => {
      const imageUrls = place.images.map((image) => `${url}/${image}`);
      return {
        ...place,
        images: imageUrls,
      };
    });

    return {
      message: 'Places found',
      places: placesWithImage,
      totalPlaces: totalPlaces,
      currentPage: page,
      pageSize: pageSize,
      totalPages: Math.ceil(totalPlaces / pageSize),
    };
  }

  async findMySourcedEvent(id: string) {
    const events = await this.prisma.crowdSource.findMany({
      where: { creatorId: id, isDeleted: false, tag: 'Event' },
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

  async findMySourcedPlace(id: string) {
    const places = await this.prisma.crowdSource.findMany({
      where: { creatorId: id, isDeleted: false, tag: 'Place' },
      include: { like: true },
    });
    if (!places || places.length === 0) {
      throw new NotFoundException('No places found');
    }

    const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    const url = `${baseUrl}/${folder}`;

    const placesWithFullImageUrls = places.map((place) => {
      const fullImageUrls = place.images.map((image) => `${url}/${image}`);
      return {
        ...place,
        images: fullImageUrls,
      };
    });

    return { message: 'Places found', places: placesWithFullImageUrls };
  }

  async findOneSourcedEvent(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
      include: { like: true, creator: true },
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
      throw new NotFoundException('Not found');
    }
    const updatedEvent = await this.prisma.crowdSource.update({
      where: { id },
      data: { isVerified: true },
    });

    return {
      message: 'Verified',
      event: updatedEvent,
    };
  }

  async unverifyCrowdSourcedEvent(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException('Not found');
    }
    const updatedEvent = await this.prisma.crowdSource.update({
      where: { id },
      data: { isVerified: false },
    });

    return {
      message: 'Unverified',
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
      throw new Error(`CrowdSource with id ${id} not found`);
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
      data: <any>{
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        images: updatedImages,
        isPublished: this.stringToBoolean(dto.isPublished),
      },
    });

    return { message: 'Updated', event: updatedEvent };
  }

  async removeSourcedEventTemp(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`CrowdSource with id ${id} not found`);
    }

    await this.prisma.crowdSource.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { message: `CrowdSource with id ${id} removed successfully` };
  }

  async removeSourcedEvent(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`CrowdSource with id ${id} not found`);
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

    return { message: `CrowdSource with id ${id} deleted successfully` };
  }

  async commentOnSourcedEvent(userId: string, dto: CommentCrowdSourcingDto) {
    try {
      if (!dto.crowdSourceId)
        throw new BadRequestException('Crowd Sourced ID is required');

      const event = await this.prisma.crowdSource.findUnique({
        where: { id: dto.crowdSourceId },
      });
      if (!event) {
        throw new NotFoundException('CrowdSource not found');
      }

      const comment = await this.prisma.comment.create({
        data: {
          ...dto,
          userId,
        },
      });
      return {
        message: 'Comment added successfully',
        comment,
      };
    } catch (error) {
      throw error;
    }
  }

  async viewCommentsForSourcedEvent(eventId: string) {
    try {
      const comment = await this.prisma.comment.findMany({
        where: { crowdSourceId: eventId },
        include: { replies: true, user: true },
      });
      if (!comment || comment.length === 0) {
        throw new NotFoundException('No comments found');
      }

      return { message: 'Comments found', comment };
    } catch (error) {
      throw error;
    }
  }

  async respondToComment(userId: string, dto: CommentCrowdSourcingDto) {
    try {
      if (!dto.parentId) throw new BadRequestException('Parent ID is required');

      const response = await this.prisma.comment.create({
        data: {
          ...dto,
          userId,
        },
      });
      return {
        message: 'Response added successfully',
        response,
      };
    } catch (error) {
      throw error;
    }
  }

  async viewRepliesForComment(commentId: string) {
    try {
      const response = await this.prisma.comment.findMany({
        where: { parentId: commentId },
        include: { user: true },
      });
      if (!response || response.length === 0) {
        throw new NotFoundException('No responses found for this comment');
      }

      return { message: 'Responses found', response };
    } catch (error) {
      throw error;
    }
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
