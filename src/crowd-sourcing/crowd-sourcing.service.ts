import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CrowdSourceStatus } from '@prisma/client';
import { CreateCrowdSourceReviewDto } from './dto/create-crowdsource-review.dto';

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
          tag: 'Event',
        },

        include: { like: true, creator: true },
        orderBy: {
          date: 'desc',
        },
      });

      const totalEvents = await this.prisma.crowdSource.count({
        where: {
          isDeleted: false,
          tag: 'Event',
        },
        orderBy: {
          date: 'desc',
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
    console.log(page, pageSize);
    const places = await this.prisma.crowdSource.findMany({
      where: {
        isDeleted: false,
        tag: 'Place',
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: { like: true, creator: true },
    });

    const totalPlaces = await this.prisma.crowdSource.count({
      where: {
        isDeleted: false,
        tag: 'Place',
      },
    });
    if (!places || places.length === 0) {
      return {
        message: 'No place found for the given page.',
        events: [],
        totalPlaces: totalPlaces,
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
      data: { isVerified: true, status: CrowdSourceStatus.APPROVED },
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
      data: { isVerified: false, status: CrowdSourceStatus.REJECTED },
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

  async setAttendance(userId: string, crowdSourceId: string, isGoing: boolean) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found');
    }

    // Upsert attendance record
    const attendance = await this.prisma.crowdSourceAttendance.upsert({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
      update: {
        isGoing,
        updatedAt: new Date(),
      },
      create: {
        userId,
        crowdSourceId,
        isGoing,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Attendance ${isGoing ? 'confirmed' : 'declined'} successfully`,
      data: attendance,
    };
  }

  async getAttendanceStats(crowdSourceId: string) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found');
    }

    const attendanceStats = await this.prisma.crowdSourceAttendance.groupBy({
      by: ['isGoing'],
      where: {
        crowdSourceId,
        user: {
          isDeleted: false,
        },
      },
      _count: {
        isGoing: true,
      },
    });

    const going =
      attendanceStats.find((stat) => stat.isGoing === true)?._count?.isGoing ||
      0;
    const notGoing =
      attendanceStats.find((stat) => stat.isGoing === false)?._count?.isGoing ||
      0;
    const total = going + notGoing;

    return {
      success: true,
      data: {
        going,
        notGoing,
        total,
        percentageGoing: total > 0 ? Math.round((going / total) * 100) : 0,
        percentageNotGoing:
          total > 0 ? Math.round((notGoing / total) * 100) : 0,
      },
    };
  }

  async getParentAttendanceStats(crowdSourceId: string) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found');
    }

    const parentAttendanceStats =
      await this.prisma.crowdSourceAttendance.groupBy({
        by: ['isGoing'],
        where: {
          crowdSourceId,
          user: {
            role: 'GUARDIAN',
            isDeleted: false,
          },
        },
        _count: {
          isGoing: true,
        },
      });

    const going =
      parentAttendanceStats.find((stat) => stat.isGoing === true)?._count
        ?.isGoing || 0;
    const notGoing =
      parentAttendanceStats.find((stat) => stat.isGoing === false)?._count
        ?.isGoing || 0;
    const total = going + notGoing;

    return {
      success: true,
      data: {
        parentsGoing: going,
        parentsNotGoing: notGoing,
        totalParentsResponded: total,
        percentageParentsGoing:
          total > 0 ? Math.round((going / total) * 100) : 0,
        percentageParentsNotGoing:
          total > 0 ? Math.round((notGoing / total) * 100) : 0,
      },
    };
  }

  async getDetailedAttendanceStats(crowdSourceId: string) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found');
    }

    const attendanceRecords = await this.prisma.crowdSourceAttendance.findMany({
      where: {
        crowdSourceId,
        user: {
          isDeleted: false,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
            role: true,
          },
        },
      },
    });

    // Separate by role and attendance
    const stats = {
      parents: {
        going: attendanceRecords.filter(
          (r) => r.user.role === 'GUARDIAN' && r.isGoing,
        ).length,
        notGoing: attendanceRecords.filter(
          (r) => r.user.role === 'GUARDIAN' && !r.isGoing,
        ).length,
      },
      organisers: {
        going: attendanceRecords.filter(
          (r) => r.user.role === 'ORGANISER' && r.isGoing,
        ).length,
        notGoing: attendanceRecords.filter(
          (r) => r.user.role === 'ORGANISER' && !r.isGoing,
        ).length,
      },
      others: {
        going: attendanceRecords.filter(
          (r) => !['GUARDIAN', 'ORGANISER'].includes(r.user.role) && r.isGoing,
        ).length,
        notGoing: attendanceRecords.filter(
          (r) => !['GUARDIAN', 'ORGANISER'].includes(r.user.role) && !r.isGoing,
        ).length,
      },
    };

    const totalParents = stats.parents.going + stats.parents.notGoing;
    const totalAll = attendanceRecords.length;
    const totalGoing =
      stats.parents.going + stats.organisers.going + stats.others.going;

    return {
      success: true,
      data: {
        summary: {
          totalResponses: totalAll,
          totalGoing,
          totalNotGoing: totalAll - totalGoing,
          overallPercentageGoing:
            totalAll > 0 ? Math.round((totalGoing / totalAll) * 100) : 0,
        },
        parents: {
          going: stats.parents.going,
          notGoing: stats.parents.notGoing,
          total: totalParents,
          percentageGoing:
            totalParents > 0
              ? Math.round((stats.parents.going / totalParents) * 100)
              : 0,
        },
        organisers: {
          going: stats.organisers.going,
          notGoing: stats.organisers.notGoing,
          total: stats.organisers.going + stats.organisers.notGoing,
        },
        others: {
          going: stats.others.going,
          notGoing: stats.others.notGoing,
          total: stats.others.going + stats.others.notGoing,
        },
      },
    };
  }

  async getMyAttendanceStatus(userId: string, crowdSourceId: string) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found');
    }

    const attendance = await this.prisma.crowdSourceAttendance.findUnique({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
    });

    return {
      success: true,
      data: {
        hasResponded: !!attendance,
        isGoing: attendance?.isGoing || null,
        respondedAt: attendance?.createdAt || null,
      },
    };
  }

  async removeAttendance(userId: string, crowdSourceId: string) {
    const attendance = await this.prisma.crowdSourceAttendance.findUnique({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.prisma.crowdSourceAttendance.delete({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
    });

    return {
      success: true,
      message: 'Attendance removed successfully',
    };
  }

  async getBulkAttendanceStats(crowdSourceIds: string[]) {
    const bulkStats = await Promise.all(
      crowdSourceIds.map(async (id) => {
        try {
          const attendanceStats =
            await this.prisma.crowdSourceAttendance.groupBy({
              by: ['isGoing'],
              where: {
                crowdSourceId: id,
                user: {
                  role: 'GUARDIAN',
                  isDeleted: false,
                },
              },
              _count: {
                isGoing: true,
              },
            });

          const going =
            attendanceStats.find((stat) => stat.isGoing === true)?._count
              ?.isGoing || 0;
          const notGoing =
            attendanceStats.find((stat) => stat.isGoing === false)?._count
              ?.isGoing || 0;
          const total = going + notGoing;

          return {
            crowdSourceId: id,
            parentsGoing: going,
            parentsNotGoing: notGoing,
            totalParents: total,
            percentageGoing: total > 0 ? Math.round((going / total) * 100) : 0,
          };
        } catch (error: unknown) {
          console.error(`Error fetching stats for:`, error);
          return {
            crowdSourceId: id,
            error: 'Failed to fetch stats',
            parentsGoing: 0,
            parentsNotGoing: 0,
            totalParents: 0,
            percentageGoing: 0,
          };
        }
      }),
    );

    return {
      success: true,
      data: { stats: bulkStats },
    };
  }
  // End Attendance Methods

  // Start Review Methods
  async createReview(
    userId: string,
    crowdSourceId: string,
    dto: CreateReviewDto,
  ) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        isPublished: true, // Only allow reviews on published crowdsources
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found or not published');
    }

    // Check if user already reviewed this crowdsource
    const existingReview = await this.prisma.crowdSourceReview.findUnique({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this crowdsource',
      );
    }

    // Check if user attended (optional - for verified reviews)
    const attendance = await this.prisma.crowdSourceAttendance.findUnique({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
    });

    const review = await this.prisma.crowdSourceReview.create({
      data: {
        userId,
        crowdSourceId,
        rating: dto.rating,
        comment: dto.comment,
        verified: attendance?.isGoing === true, // Mark as verified if they said they were going
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Review created successfully',
      data: review,
    };
  }

  async getReviews(crowdSourceId: string, page: number, pageSize: number) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found');
    }

    const skip = (page - 1) * pageSize;

    const [reviews, total] = await Promise.all([
      this.prisma.crowdSourceReview.findMany({
        where: {
          crowdSourceId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile_picture: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: [
          { verified: 'desc' }, // Verified reviews first
          { createdAt: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.crowdSourceReview.count({
        where: {
          crowdSourceId,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    };
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.crowdSourceReview.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.crowdSourceReview.update({
      where: {
        id: reviewId,
      },
      data: {
        ...(dto.comment !== undefined && { comment: dto.comment }),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    };
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.prisma.crowdSourceReview.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.crowdSourceReview.delete({
      where: {
        id: reviewId,
      },
    });

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  async getReviewStats(crowdSourceId: string) {
    // Verify crowdsource exists
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('CrowdSource not found');
    }

    const stats = await this.prisma.crowdSourceReview.aggregate({
      where: {
        crowdSourceId,
      },
      _count: {
        id: true,
      },
    });

    const ratingBreakdown = await this.prisma.crowdSourceReview.groupBy({
      by: ['rating'],
      where: {
        crowdSourceId,
      },
      _count: {
        rating: true,
      },
      orderBy: {
        rating: 'desc',
      },
    });

    const verifiedCount = await this.prisma.crowdSourceReview.count({
      where: {
        crowdSourceId,
        verified: true,
      },
    });

    return {
      success: true,
      data: {
        totalReviews: stats._count.id,
        verifiedReviews: verifiedCount,
        ratingBreakdown: ratingBreakdown.reduce((acc, curr) => {
          acc[`${curr.rating}Stars`] = curr._count.rating;
          return acc;
        }, {}),
      },
    };
  }

  // Start Review Like Methods
  async toggleReviewLike(userId: string, reviewId: string) {
    // Verify review exists
    const review = await this.prisma.crowdSourceReview.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check if user already liked this review
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_crowdSourceReviewId: {
          userId,
          crowdSourceReviewId: reviewId,
        },
      },
    });

    if (existingLike) {
      // Unlike the review
      await this.prisma.like.delete({
        where: {
          userId_crowdSourceReviewId: {
            userId,
            crowdSourceReviewId: reviewId,
          },
        },
      });

      return {
        success: true,
        message: 'Review unliked successfully',
        data: { liked: false },
      };
    } else {
      // Like the review
      await this.prisma.like.create({
        data: {
          userId,
          crowdSourceReviewId: reviewId,
        },
      });

      return {
        success: true,
        message: 'Review liked successfully',
        data: { liked: true },
      };
    }
  }

  async getReviewLikes(reviewId: string) {
    // Verify review exists
    const review = await this.prisma.crowdSourceReview.findUnique({
      where: {
        id: reviewId,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const likes = await this.prisma.like.findMany({
      where: {
        crowdSourceReviewId: reviewId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: {
        likeCount: likes.length,
        likes: likes.map((like) => ({
          id: like.id,
          user: like.user,
          likedAt: like.createdAt,
        })),
      },
    };
  }

  async createPlaceReview(
    userId: string,
    crowdSourceId: string,
    dto: CreateCrowdSourceReviewDto,
  ) {
    const existing = await this.prisma.crowdSourceReview.findUnique({
      where: { userId_crowdSourceId: { userId, crowdSourceId } }, // unique constraint
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this place.');
    }

    return this.prisma.crowdSourceReview.create({
      data: {
        userId,
        crowdSourceId,
        rating: 0,
        comment: dto.comment,
        would_recommend: dto.would_recommend,
      },
    });
  }

  async getRecommendationPlacePercentage(
    crowdSourceId: string,
  ): Promise<number> {
    const totalReviews = await this.prisma.crowdSourceReview.count({
      where: { crowdSourceId },
    });

    if (totalReviews === 0) return 0;

    const totalRecommendations = await this.prisma.crowdSourceReview.count({
      where: { crowdSourceId, would_recommend: true },
    });

    const percentage = (totalRecommendations / totalReviews) * 100;

    return Math.round(percentage);
  }

  // crowdsource-review.service.ts

  async getPaginatedPlaceReviews(
    crowdSourceId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.crowdSourceReview.count({
        where: { crowdSourceId },
      }),
      this.prisma.crowdSourceReview.findMany({
        where: { crowdSourceId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              profile_picture: true,
              password: false,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      reviews,
    };
  }
}
