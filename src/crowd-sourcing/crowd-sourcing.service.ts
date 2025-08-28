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
// import { CreateReviewDto } from './dto/create-review.dto';
import { CommentStatus, CrowdSourceStatus } from '@prisma/client';
import { CreateCrowdSourceReviewDto } from './dto/create-crowdsource-review.dto';
import { NotificationHelper } from 'src/notification/notification.helper';

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
    private notificationHelper: NotificationHelper,
  ) {}

  async createSourcedEvent(creatorId: string, dto: CreateCrowdSourcingDto) {
    try {
      const date = new Date(dto.date);
      const event = await this.prisma.crowdSource.create({
        data: <any>{
          ...dto,
          images: dto.images,
          date,
          creatorId,
          isVerified: false,
          isPublished: false,
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
          status: 'APPROVED',
          tag: 'Event',
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: calSkip,
        take: pageSize,
        include: {
          like: true,
          creator: true,
          attendances: {
            include: {
              user: true,
            },
          },
        },
      });

      const totalEvents = await this.prisma.crowdSource.count({
        where: {
          isDeleted: false,
          status: 'APPROVED',
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

      // const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
      // const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
      // const url = `${baseUrl}/${folder}`;

      // const eventsWithImage = events.map((event) => {
      //   const imageUrls = event.images.map((image) => `${url}/${image}`);
      //   return {
      //     ...event,
      //     images: imageUrls,
      //   };
      // });

      return {
        message: 'Events found',
        events,
        totalEvents: totalEvents,
        currentPage: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalEvents / pageSize),
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
        status: 'APPROVED',
        // isVerified: true,
        // isPublished: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        like: true,
        creator: true,
        reviews: {
          include: {
            user: true,
          },
        },
      },
    });

    const totalPlaces = await this.prisma.crowdSource.count({
      where: {
        isDeleted: false,
        tag: 'Place',
        status: 'APPROVED',
      },
    });
    if (!places || places.length === 0) {
      return {
        message: 'No place found for the given page.',
        events: [],
        totalPlaces: totalPlaces,
      };
    }

    // const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    // const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    // const url = `${baseUrl}/${folder}`;

    // const placesWithImage = places.map((place) => {
    //   const imageUrls = place.images.map((image) => `${url}/${image}`);
    //   return {
    //     ...place,
    //     images: imageUrls,
    //   };
    // });

    return {
      message: 'Places found',
      places,
      totalPlaces: totalPlaces,
    };
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
          createdAt: 'desc',
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

  async findAllSourcedPlaceAdmin() {
    const places = await this.prisma.crowdSource.findMany({
      where: {
        isDeleted: false,
        tag: 'Place',
        // status: 'APPROVED',
        // isVerified: true,
        // isPublished: true,
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
        // status: 'APPROVED',
      },
    });
    if (!places || places.length === 0) {
      return {
        message: 'No place found for the given page.',
        events: [],
        totalPlaces: totalPlaces,
      };
    }

    // const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    // const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    // const url = `${baseUrl}/${folder}`;

    // const placesWithImage = places.map((place) => {
    //   const imageUrls = place.images.map((image) => `${url}/${image}`);
    //   return {
    //     ...place,
    //     images: imageUrls,
    //   };
    // });

    return {
      message: 'Places found',
      places,
      totalPlaces: totalPlaces,
    };
  }

  async findMySourcedEvent(id: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [events, total] = await this.prisma.$transaction([
      this.prisma.crowdSource.findMany({
        where: { creatorId: id, isDeleted: false, tag: 'Event' },
        include: { like: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // newest first
      }),
      this.prisma.crowdSource.count({
        where: { creatorId: id, isDeleted: false, tag: 'Event' },
      }),
    ]);

    // if (events.length === 0) {
    //   throw new NotFoundException('No events found');
    // }

    // const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    // const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    // const url = `${baseUrl}/${folder}`;

    // const eventsWithFullImageUrls = events.map((event) => ({
    //   ...event,
    //   images: event.images.map((image) => `${url}/${image}`),
    // }));

    return {
      message: 'Events found',
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      events,
    };
  }

  // async findMySourcedEvent(id: string) {
  //   const events = await this.prisma.crowdSource.findMany({
  //     where: { creatorId: id, isDeleted: false, tag: 'Event' },
  //     include: { like: true },
  //   });
  //   if (!events || events.length === 0) {
  //     throw new NotFoundException('No events found');
  //   }

  //   const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
  //   const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
  //   const url = `${baseUrl}/${folder}`;

  //   const eventsWithFullImageUrls = events.map((event) => {
  //     const fullImageUrls = event.images.map((image) => `${url}/${image}`);
  //     return {
  //       ...event,
  //       images: fullImageUrls,
  //     };
  //   });

  //   return { message: 'Events found', events: eventsWithFullImageUrls };
  // }

  // async findMySourcedPlace(id: string) {
  //   const places = await this.prisma.crowdSource.findMany({
  //     where: { creatorId: id, isDeleted: false, tag: 'Place' },
  //     include: { like: true },
  //   });
  //   if (!places || places.length === 0) {
  //     throw new NotFoundException('No places found');
  //   }

  //   const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
  //   const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
  //   const url = `${baseUrl}/${folder}`;

  //   const placesWithFullImageUrls = places.map((place) => {
  //     const fullImageUrls = place.images.map((image) => `${url}/${image}`);
  //     return {
  //       ...place,
  //       images: fullImageUrls,
  //     };
  //   });

  //   return { message: 'Places found', places: placesWithFullImageUrls };
  // }

  async findMySourcedPlace(id: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [places, total] = await this.prisma.$transaction([
      this.prisma.crowdSource.findMany({
        where: { creatorId: id, isDeleted: false, tag: 'Place' },
        include: { like: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // newest first
      }),
      this.prisma.crowdSource.count({
        where: { creatorId: id, isDeleted: false, tag: 'Place' },
      }),
    ]);

    // if (places.length === 0) {
    //   throw new NotFoundException('No places found');
    // }

    // const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    // const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    // const url = `${baseUrl}/${folder}`;

    // const placesWithFullImageUrls = places.map((place) => ({
    //   ...place,
    //   images: place.images.map((image) => `${url}/${image}`),
    // }));

    return {
      message: 'Places found',
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      places,
    };
  }

  async findOneSourcedEvent(id: string) {
    const event = await this.prisma.crowdSource.findUnique({
      where: { id },
      include: { like: true, creator: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // const baseUrl = this.config.getOrThrow('S3_PUBLIC_URL');
    // const folder = this.config.getOrThrow('S3_CROWDSOURCE_FOLDER');
    // const url = `${baseUrl}/${folder}`;

    // const fullImageUrls = event.images.map((image) => `${url}/${image}`);

    return {
      message: 'Event found',
      event,
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
    await this.notificationHelper.sendRecommendationApprovedNotification(
      event.creatorId,
      event.name,
      event.tag == 'Event' ? true : false,
    );

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
    await this.notificationHelper.sendRecommendationRejectionNotification(
      event.creatorId,
      event.name,
      event.tag == 'Event' ? true : false,
    );

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
        where: { id: dto.crowdSourceId, tag: 'Event' },
      });
      if (!event) {
        throw new NotFoundException(
          'CrowdSource not found or is probably a place.',
        );
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

  // End Attendance Methods

  // Start Review Methods
  // async createReview(
  //   userId: string,
  //   crowdSourceId: string,
  //   dto: CreateReviewDto,
  // ) {
  //   // Verify crowdsource exists
  //   const crowdSource = await this.prisma.crowdSource.findFirst({
  //     where: {
  //       id: crowdSourceId,
  //       isDeleted: false,
  //       isPublished: true, // Only allow reviews on published crowdsources
  //     },
  //   });

  //   if (!crowdSource) {
  //     throw new NotFoundException('CrowdSource not found or not published');
  //   }

  //   // Check if user already reviewed this crowdsource
  //   const existingReview = await this.prisma.crowdSourceReview.findUnique({
  //     where: {
  //       userId_crowdSourceId: {
  //         userId,
  //         crowdSourceId,
  //       },
  //     },
  //   });

  //   if (existingReview) {
  //     throw new BadRequestException(
  //       'You have already reviewed this crowdsource',
  //     );
  //   }

  //   // Check if user attended (optional - for verified reviews)
  //   const attendance = await this.prisma.crowdSourceAttendance.findUnique({
  //     where: {
  //       userId_crowdSourceId: {
  //         userId,
  //         crowdSourceId,
  //       },
  //     },
  //   });

  //   const review = await this.prisma.crowdSourceReview.create({
  //     data: {
  //       userId,
  //       crowdSourceId,
  //       rating: dto.rating,
  //       comment: dto.comment,
  //       verified: attendance?.isGoing === true, // Mark as verified if they said they were going
  //     },
  //     include: {
  //       user: {
  //         select: {
  //           id: true,
  //           name: true,
  //           profile_picture: true,
  //         },
  //       },
  //       _count: {
  //         select: {
  //           likes: true,
  //         },
  //       },
  //     },
  //   });

  //   return {
  //     success: true,
  //     message: 'Review created successfully',
  //     data: review,
  //   };
  // }

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

  //This one has the likes stuff that i need.
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

  // Method 13: Get event attendance percentage (excluding PENDING)
  async getEventAttendancePercentage(crowdSourceId: string): Promise<number> {
    // Verify crowdsource exists and is an event
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Event',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Event not found');
    }

    // Get total responses (excluding PENDING)
    const totalResponses = await this.prisma.crowdSourceAttendance.count({
      where: {
        crowdSourceId,
        going: {
          in: ['YES', 'NO'],
        },
      },
    });

    if (totalResponses === 0) return 0;

    // Get positive responses (YES)
    const positiveResponses = await this.prisma.crowdSourceAttendance.count({
      where: {
        crowdSourceId,
        going: 'YES',
      },
    });

    const percentage = (positiveResponses / totalResponses) * 100;

    return Math.round(percentage);
  }

  // Method 14: Get place recommendation percentage (excluding PENDING)
  async getPlaceRecommendationPercentage(
    crowdSourceId: string,
  ): Promise<number> {
    // Verify crowdsource exists and is a place
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Place',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Place not found');
    }

    // Get total responses (excluding PENDING - which would be null would_recommend)
    const totalResponses = await this.prisma.crowdSourceReview.count({
      where: {
        crowdSourceId,
      },
    });

    if (totalResponses === 0) return 0;

    // Get positive responses (would_recommend: true)
    const positiveResponses = await this.prisma.crowdSourceReview.count({
      where: {
        crowdSourceId,
        would_recommend: true,
      },
    });

    const percentage = (positiveResponses / totalResponses) * 100;

    return Math.round(percentage);
  }

  // Method 15: Get comprehensive percentage for both events and places
  async getCrowdSourcePercentage(crowdSourceId: string) {
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

    let type: string;
    let totalResponses: number;
    let positiveResponses: number;

    if (crowdSource.tag === 'Event') {
      // For events: calculate percentage of people going (excluding PENDING)
      totalResponses = await this.prisma.crowdSourceAttendance.count({
        where: {
          crowdSourceId,
          going: {
            in: ['YES', 'NO'],
          },
        },
      });

      positiveResponses = await this.prisma.crowdSourceAttendance.count({
        where: {
          crowdSourceId,
          going: 'YES',
        },
      });

      type = 'attendance';
    } else {
      // For places: calculate percentage of people recommending (excluding PENDING)
      totalResponses = await this.prisma.crowdSourceReview.count({
        where: {
          crowdSourceId,
          would_recommend: {
            not: null,
          },
        },
      });

      positiveResponses = await this.prisma.crowdSourceReview.count({
        where: {
          crowdSourceId,
          would_recommend: true,
        },
      });

      type = 'recommendation';
    }

    const percentage =
      totalResponses > 0
        ? Math.round((positiveResponses / totalResponses) * 100)
        : 0;

    return {
      success: true,
      data: {
        crowdSourceId,
        type,
        percentage,
        totalResponses,
        positiveResponses,
        crowdSourceName: crowdSource.name,
        crowdSourceTag: crowdSource.tag,
      },
    };
  }

  // Method 16: Get user's attendance status for an event
  async getMyAttendanceStatus(userId: string, crowdSourceId: string) {
    // Verify crowdsource exists and is an event
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Event',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Event not found');
    }

    // Check if user has an attendance record
    const attendance = await this.prisma.crowdSourceAttendance.findUnique({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
      include: {
        crowdSource: {
          select: {
            id: true,
            name: true,
            date: true,
            time: true,
            address: true,
          },
        },
      },
    });

    // If no attendance record exists, return PENDING status
    if (!attendance) {
      return {
        success: true,
        data: {
          userId,
          crowdSourceId,
          going: 'PENDING',
          message: 'No attendance response recorded yet',
          event: {
            id: crowdSource.id,
            name: crowdSource.name,
            date: crowdSource.date,
            time: crowdSource.time,
            address: crowdSource.address,
          },
        },
      };
    }

    return {
      success: true,
      data: {
        userId,
        crowdSourceId,
        going: attendance.going,
        status: attendance.going,
        message: `You have responded: ${attendance.going}`,
        event: {
          id: attendance.crowdSource.id,
          name: attendance.crowdSource.name,
          date: attendance.crowdSource.date,
          time: attendance.crowdSource.time,
          address: attendance.crowdSource.address,
        },
        respondedAt: attendance.createdAt,
        updatedAt: attendance.updatedAt,
      },
    };
  }

  // crowdsource-review.service.ts

  // async getPaginatedPlaceReviews(
  //   crowdSourceId: string,
  //   page: number = 1,
  //   limit: number = 10,
  // ) {
  //   const skip = (page - 1) * limit;

  //   const [total, reviews] = await this.prisma.$transaction([
  //     this.prisma.crowdSourceReview.count({
  //       where: { crowdSourceId },
  //     }),
  //     this.prisma.crowdSourceReview.findMany({
  //       where: { crowdSourceId },
  //       skip,
  //       take: limit,
  //       orderBy: { createdAt: 'desc' },
  //       include: {
  //         user: {
  //           select: {
  //             name: true,
  //             profile_picture: true,
  //             password: false,
  //           },
  //         },
  //       },
  //     }),
  //   ]);

  //   return {
  //     total,
  //     page,
  //     limit,
  //     totalPages: Math.ceil(total / limit),
  //     reviews,
  //   };
  // }

  async getPaginatedPlaceReviews(
    crowdSourceId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.crowdSourceReview.count({
        where: {
          crowdSourceId,
          status: {
            in: [CommentStatus.APPROPRIATE, CommentStatus.PENDING],
          },
        },
      }),
      this.prisma.crowdSourceReview.findMany({
        where: {
          crowdSourceId,
          status: {
            in: [CommentStatus.APPROPRIATE, CommentStatus.PENDING],
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              profile_picture: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    const formattedReviews = reviews.map((review) => ({
      ...review,
      user: review.user,
      likeCount: review._count.likes,
      likes: review.likes,
      // Remove the _count object from the response as we've extracted likeCount
      _count: undefined,
      // If you have a status field on reviews, you can check for flagging
      // isFlagged: review.status === 'INAPPROPRIATE',
    }));

    return {
      success: true, // Fixed typo from "sucess" to "success"
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      reviews: formattedReviews,
    };
  }

  async getPaginatedReviewsAsAdmin(
    crowdSourceId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.crowdSourceReview.count({
        where: {
          crowdSourceId,
        },
      }),
      this.prisma.crowdSourceReview.findMany({
        where: {
          crowdSourceId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              profile_picture: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    const formattedReviews = reviews.map((review) => ({
      ...review,
      user: review.user,
      likeCount: review._count.likes,
      likes: review.likes,
      // Remove the _count object from the response as we've extracted likeCount
      _count: undefined,
      // If you have a status field on reviews, you can check for flagging
      // isFlagged: review.status === 'INAPPROPRIATE',
    }));

    return {
      success: true, // Fixed typo from "sucess" to "success"
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      reviews: formattedReviews,
    };
  }

  async getPaginatedEventComments(
    crowdSourceId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({
        where: {
          crowdSourceId,
          status: {
            in: [CommentStatus.APPROPRIATE, CommentStatus.PENDING],
          },
          parentId: null, // ✅ only fetch top-level comments
        },
      }),
      this.prisma.comment.findMany({
        where: {
          crowdSourceId,
          status: {
            in: [CommentStatus.APPROPRIATE, CommentStatus.PENDING],
          },
          parentId: null, // ✅ only top-level comments
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              profile_picture: true,
            },
          },
          like: {
            select: {
              userId: true, // ✅ fetch the likers
            },
          },
          _count: {
            select: {
              like: true,
              replies: true, // ✅ count replies too
            },
          },
          replies: {
            take: 2, // ✅ first 2 replies
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  name: true,
                  profile_picture: true,
                },
              },
              like: {
                select: {
                  userId: true, // ✅ fetch reply likers
                },
              },
              _count: {
                select: {
                  like: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedComments = comments.map((comment) => ({
      ...comment,
      user: comment.user,
      likeCount: comment._count.like,
      replyCount: comment._count.replies,
      replies: comment.replies.map((reply) => ({
        ...reply,
        user: reply.user,
        likeCount: reply._count.like,

        _count: undefined,
      })),
      _count: undefined, // cleanup
    }));

    return {
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      comments: formattedComments,
    };
  }

  async getPaginatedEventCommentsAsAdmin(
    crowdSourceId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({
        where: {
          crowdSourceId,

          parentId: null, // ✅ only fetch top-level comments
        },
      }),
      this.prisma.comment.findMany({
        where: {
          crowdSourceId,

          parentId: null, // ✅ only top-level comments
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              profile_picture: true,
            },
          },
          like: {
            select: {
              userId: true, // ✅ fetch the likers
            },
          },
          _count: {
            select: {
              like: true,
              replies: true, // ✅ count replies too
            },
          },
          replies: {
            take: 2, // ✅ first 2 replies
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  name: true,
                  profile_picture: true,
                },
              },
              like: {
                select: {
                  userId: true, // ✅ fetch reply likers
                },
              },
              _count: {
                select: {
                  like: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedComments = comments.map((comment) => ({
      ...comment,
      user: comment.user,
      likeCount: comment._count.like,
      replyCount: comment._count.replies,
      replies: comment.replies.map((reply) => ({
        ...reply,
        user: reply.user,
        likeCount: reply._count.like,

        _count: undefined,
      })),
      _count: undefined, // cleanup
    }));

    return {
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      comments: formattedComments,
    };
  }

  async getParentsWhoRecommendedPlace(crowdSourceId: string) {
    // Verify crowdsource exists and is a place
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Place',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Place not found');
    }

    const parentsWhoRecommended = await this.prisma.crowdSourceReview.findMany({
      where: {
        crowdSourceId,
        would_recommend: true,
        user: {
          role: 'GUARDIAN',
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      message: 'Parents who recommended this place retrieved successfully',
      data: {
        totalRecommendations: parentsWhoRecommended.length,
        parents: parentsWhoRecommended.map((review) => ({
          reviewId: review.id,
          user: {
            ...review.user,
          },
          comment: review.comment,
          recommendedAt: review.createdAt,
        })),
      },
    };
  }

  // Method 2: Get List Of Parents That Have Recommended An Event
  async getParentsWhoRecommendedEvent(crowdSourceId: string) {
    // Verify crowdsource exists and is an event
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Event',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Event not found');
    }

    const parentsWhoRecommended = await this.prisma.crowdSourceReview.findMany({
      where: {
        crowdSourceId,
        would_recommend: true,
        user: {
          role: 'GUARDIAN',
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      message: 'Parents who recommended this event retrieved successfully',
      data: {
        totalRecommendations: parentsWhoRecommended.length,
        parents: parentsWhoRecommended.map((review) => ({
          reviewId: review.id,
          user: {
            ...review.user,
            profile_picture: review.user.profile_picture
              ? `${process.env.S3_PUBLIC_URL}/users/${review.user.profile_picture}`
              : null,
          },
          comment: review.comment,
          recommendedAt: review.createdAt,
        })),
      },
    };
  }

  async toggleEventRecommendation(
    userId: string,
    crowdSourceId: string,
    wouldRecommend: boolean,
  ) {
    // Verify crowdsource exists and is an event
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Event',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Event not found');
    }

    // Check if user already has a review for this event
    const existingReview = await this.prisma.crowdSourceReview.findUnique({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
    });

    let review;

    if (existingReview) {
      // Update existing review
      review = await this.prisma.crowdSourceReview.update({
        where: {
          userId_crowdSourceId: {
            userId,
            crowdSourceId,
          },
        },
        data: {
          would_recommend: wouldRecommend,
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
        },
      });
    } else {
      // Create new review with recommendation only
      review = await this.prisma.crowdSourceReview.create({
        data: {
          userId,
          crowdSourceId,
          rating: null, // No rating required for recommendation
          comment: null, // No comment required for recommendation
          would_recommend: wouldRecommend,
          verified: false,
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
    }

    return {
      success: true,
      message: `Event ${wouldRecommend ? 'recommended' : 'recommendation removed'} successfully`,
      data: {
        reviewId: review.id,
        wouldRecommend: review.would_recommend,
        user: review.user,
      },
    };
  }

  // Method 5: Update attendance with new going enum (YES/NO/PENDING)
  async setAttendanceWithStatus(
    userId: string,
    crowdSourceId: string,
    going: string,
  ) {
    console.log(going, 'This is the going stuff');
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

    // Validate going status

    // Upsert attendance record
    const attendance = await this.prisma.crowdSourceAttendance.upsert({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
      update: {
        going,
        updatedAt: new Date(),
      },
      create: {
        userId,
        crowdSourceId,
        going,
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
      message: `Attendance status set to ${going} successfully`,
      data: attendance,
    };
  }

  async getAttendanceStatsWithStatus(crowdSourceId: string) {
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
      by: ['going'],
      where: {
        crowdSourceId,
        user: {
          isDeleted: false,
        },
      },
      _count: {
        going: true,
      },
    });

    const yes =
      attendanceStats.find((stat) => stat.going === 'YES')?._count?.going || 0;
    const no =
      attendanceStats.find((stat) => stat.going === 'NO')?._count?.going || 0;
    const pending =
      attendanceStats.find((stat) => stat.going === 'PENDING')?._count?.going ||
      0;
    const total = yes + no + pending;

    return {
      success: true,
      data: {
        going: yes,
        notGoing: no,
        pending: pending,
        total,
        percentageGoing: total > 0 ? Math.round((yes / total) * 100) : 0,
        percentageNotGoing: total > 0 ? Math.round((no / total) * 100) : 0,
        percentagePending: total > 0 ? Math.round((pending / total) * 100) : 0,
      },
    };
  }

  // Method 6: Get parents who are going to an event with profile pictures
  async getParentsGoingToEvent(crowdSourceId: string) {
    // Verify crowdsource exists and is an event
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Event',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Event not found');
    }

    const parentsGoing = await this.prisma.crowdSourceAttendance.findMany({
      where: {
        crowdSourceId,
        going: 'YES',
        user: {
          role: 'GUARDIAN',
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      message: 'Parents going to this event retrieved successfully',
      data: {
        totalGoing: parentsGoing.length,
        parents: parentsGoing.map((attendance) => ({
          attendanceId: attendance.id,
          user: attendance.user,
          goingStatus: attendance.going,
          respondedAt: attendance.createdAt,
        })),
      },
    };
  }

  // Method 7: Toggle place recommendation
  async togglePlaceRecommendation(
    userId: string,
    crowdSourceId: string,
    wouldRecommend: boolean,
  ) {
    // Verify crowdsource exists and is a place
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Place',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Place not found');
    }

    // Check if user already has a review for this place
    const existingReview = await this.prisma.crowdSourceReview.findUnique({
      where: {
        userId_crowdSourceId: {
          userId,
          crowdSourceId,
        },
      },
    });

    let review;

    if (existingReview) {
      // Update existing review
      review = await this.prisma.crowdSourceReview.update({
        where: {
          userId_crowdSourceId: {
            userId,
            crowdSourceId,
          },
        },
        data: {
          would_recommend: wouldRecommend,
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
        },
      });
    } else {
      // Create new review with recommendation only
      review = await this.prisma.crowdSourceReview.create({
        data: {
          userId,
          crowdSourceId,
          rating: null, // No rating required for recommendation
          comment: null, // No comment required for recommendation
          would_recommend: wouldRecommend,
          verified: false,
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
    }

    return {
      success: true,
      message: `Place ${wouldRecommend ? 'recommended' : 'recommendation removed'} successfully`,
      data: {
        reviewId: review.id,
        wouldRecommend: review.would_recommend,
        user: review.user,
      },
    };
  }

  // Method 8: Get place recommendation stats
  async getPlaceRecommendationStats(crowdSourceId: string) {
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Place',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Place not found');
    }

    const recommendationStats = await this.prisma.crowdSourceReview.groupBy({
      by: ['would_recommend'],
      where: {
        crowdSourceId,
        user: {
          isDeleted: false,
        },
      },
      _count: {
        would_recommend: true,
      },
    });

    const recommended =
      recommendationStats.find((stat) => stat.would_recommend === true)?._count
        ?.would_recommend || 0;
    const notRecommended =
      recommendationStats.find((stat) => stat.would_recommend === false)?._count
        ?.would_recommend || 0;
    const total = recommended + notRecommended;

    return {
      success: true,
      data: {
        recommended,
        notRecommended,
        total,
        percentageRecommended:
          total > 0 ? Math.round((recommended / total) * 100) : 0,
        percentageNotRecommended:
          total > 0 ? Math.round((notRecommended / total) * 100) : 0,
      },
    };
  }

  // Method 9: Add comment to place review
  async addReviewComment(
    userId: string,
    crowdSourceId: string,
    dto: CommentCrowdSourcingDto,
  ) {
    // Verify crowdsource exists and is a place
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Place',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Place not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        userId,
        crowdSourceId,
        parentId: dto.parentId || null,
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
      message: 'Comment added successfully',
      data: {
        ...comment,
        user: {
          ...comment.user,
          profile_picture: comment.user.profile_picture
            ? `${process.env.S3_PUBLIC_URL}/users/${comment.user.profile_picture}`
            : null,
        },
      },
    };
  }

  // Method 10: Get review comments with like counts
  async getReviewComments(crowdSourceId: string) {
    const crowdSource = await this.prisma.crowdSource.findFirst({
      where: {
        id: crowdSourceId,
        isDeleted: false,
        tag: 'Place',
      },
    });

    if (!crowdSource) {
      throw new NotFoundException('Place not found');
    }

    const comments = await this.prisma.comment.findMany({
      where: {
        crowdSourceId,
        parentId: null, // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
          },
        },
        replies: {
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
                like: true,
              },
            },
          },
        },
        _count: {
          select: {
            like: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedComments = comments.map((comment) => ({
      ...comment,
      user: {
        ...comment.user,
        profile_picture: comment.user.profile_picture
          ? `${process.env.S3_PUBLIC_URL}/users/${comment.user.profile_picture}`
          : null,
      },
      replies: comment.replies.map((reply) => ({
        ...reply,
        user: {
          ...reply.user,
          profile_picture: reply.user.profile_picture
            ? `${process.env.S3_PUBLIC_URL}/users/${reply.user.profile_picture}`
            : null,
        },
      })),
    }));

    return {
      success: true,
      data: {
        totalComments: comments.length,
        comments: formattedComments,
      },
    };
  }

  // Method 11: Toggle comment like
  async toggleCommentLike(userId: string, commentId: string) {
    // Verify comment exists
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user already liked this comment
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      // Unlike the comment
      await this.prisma.like.delete({
        where: {
          userId_commentId: {
            userId,
            commentId,
          },
        },
      });

      return {
        success: true,
        message: 'Comment unliked successfully',
        data: { liked: false },
      };
    } else {
      // Like the comment
      await this.prisma.like.create({
        data: {
          userId,
          commentId,
        },
      });

      return {
        success: true,
        message: 'Comment liked successfully',
        data: { liked: true },
      };
    }
  }

  // Method 12: Flag comment as appropriate or inappropriate (Admin only)
  // TODO: Uncomment after running migration to add status field to comment table

  async flagComment(
    commentId: string,
    status: 'APPROPRIATE' | 'INAPPROPRIATE',
  ) {
    console.log(status, 'This is the status');
    // Verify comment exists
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Update comment status
    const updatedComment = await this.prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Comment flagged as ${status.toLowerCase()} successfully`,
      data: {
        commentId: updatedComment.id,
        status: updatedComment.status,
        user: updatedComment.user,
        comment: updatedComment.content,
        flaggedAt: updatedComment.updatedAt,
      },
    };
  }

  async flagCrowdsourcePlaceCommentAsAdmin(
    commentId: string,
    status: 'APPROPRIATE' | 'INAPPROPRIATE',
  ) {
    const comment = await this.prisma.crowdSourceReview.findUnique({
      where: {
        id: commentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Update comment status
    const updatedComment = await this.prisma.crowdSourceReview.update({
      where: {
        id: commentId,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Comment flagged as ${status.toLowerCase()} successfully`,
      data: {
        commentId: updatedComment.id,
        status: updatedComment.status,
        user: updatedComment.user,
        comment: updatedComment.comment,
        flaggedAt: updatedComment.updatedAt,
      },
    };
  }
}
