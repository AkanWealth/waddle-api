import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateCommentLikeDto,
  CreateEventLikeDto,
  CreateReviewLikeDto,
} from './dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(private prisma: PrismaService) {}

  // like the event
  async likeEvent(userId: string, dto: CreateEventLikeDto) {
    try {
      const like = await this.prisma.like.create({ data: { ...dto, userId } });
      return { message: 'Event liked', like };
    } catch (error) {
      throw error;
    }
  }

  // like the crowd sourced event
  async likeCrowdSourcedEvent(userId: string, dto: CreateEventLikeDto) {
    try {
      const existingLike = await this.prisma.like.findUnique({
        where: {
          userId_crowdSourceId: {
            userId,
            crowdSourceId: dto.eventId,
          },
        },
      });

      if (existingLike) {
        await this.prisma.like.delete({
          where: { id: existingLike.id },
        });
        return { message: 'Crowd sourced unliked', like: null };
      }

      const like = await this.prisma.like.create({
        data: { crowdSourceId: dto.eventId, userId },
      });
      return { message: 'Crowd sourced liked', like };
    } catch (error) {
      throw error;
    }
  }

  // like the comment
  async likeComment(userId: string, dto: CreateCommentLikeDto) {
    try {
      const like = await this.prisma.like.create({
        data: { commentId: dto.commentId, userId },
      });
      return { message: 'Comment liked', like };
    } catch (error) {
      throw error;
    }
  }

  async likeACrowdsourcePlaceComment(
    userId: string,
    dto: CreateCommentLikeDto,
  ) {
    try {
      const like = await this.prisma.like.create({
        data: { crowdSourceReviewId: dto.commentId, userId },
      });
      return { success: true, message: 'Crowdource place review liked', like };
    } catch (error) {
      throw error;
    }
  }

  async unLikeACrowdsourcePlaceComment(userId: string, commentId: string) {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_crowdSourceReviewId: {
          userId,
          crowdSourceReviewId: commentId,
        },
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    await this.prisma.like.delete({
      where: { id: like.id },
    });

    return { success: true, message: 'Deleted successfully' };
  }

  // like the review
  async likeReview(userId: string, dto: CreateReviewLikeDto) {
    try {
      const like = await this.prisma.like.create({
        data: { reviewId: dto.reviewId, userId },
      });
      return { message: 'Review liked', like };
    } catch (error) {
      throw error;
    }
  }

  // view all likes based on events
  async viewLikesByEvent(eventId: string) {
    try {
      const likes = await this.prisma.like.findMany({
        where: { eventId },
      });

      if (!likes || likes.length <= 0)
        throw new NotFoundException('Likes not found');

      return { message: 'Likes found', likes, count: likes?.length };
    } catch (error) {
      throw error;
    }
  }

  // view all likes based on crowd sourced events
  async viewLikesByCrowdSourceEvent(crowdSourceId: string) {
    try {
      const likes = await this.prisma.like.findMany({
        where: { crowdSourceId },
      });

      if (!likes || likes.length <= 0)
        throw new NotFoundException('Likes not found');

      return { message: 'Likes found', likes, count: likes?.length };
    } catch (error) {
      throw error;
    }
  }

  // view all likes based on comments
  async viewLikesByComment(commentId: string) {
    try {
      const likes = await this.prisma.like.findMany({
        where: { commentId },
      });

      if (!likes || likes.length <= 0)
        throw new NotFoundException('Likes not found');

      return { message: 'Likes found', likes, count: likes?.length };
    } catch (error) {
      throw error;
    }
  }

  // view all likes based on reviews
  async viewLikesByReview(reviewId: string) {
    try {
      const likes = await this.prisma.like.findMany({
        where: { reviewId },
      });

      if (!likes || likes.length <= 0)
        throw new NotFoundException('Likes not found');

      return { message: 'Likes found', likes, count: likes?.length };
    } catch (error) {
      throw error;
    }
  }

  async getMyLikedCrowdSource(userId: string) {
    try {
      const [eventLikes, crowdSourceLikes] = await this.prisma.$transaction([
        this.prisma.like.findMany({
          where: {
            userId,
            eventId: {
              not: null,
            },
          },
          include: {
            event: {
              include: {
                reviews: true,
                favorites: true,
                like: true,
                recommendations: true,
              },
            },
          },
        }),
        this.prisma.like.findMany({
          where: {
            userId,
            crowdSourceId: {
              not: null,
            },
          },
          include: {
            crowdSource: {
              include: {
                like: true,
                creator: true,
                attendances: {
                  include: {
                    user: {
                      select: {
                        profile_picture: true,
                        id: true,
                      },
                    },
                  },
                },
                reviews: {
                  include: {
                    user: {
                      select: {
                        profile_picture: true,
                        id: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      const items = [];
      let officialEvents = 0;
      let crowdSourceEvents = 0;
      let crowdSourcePlaces = 0;

      for (const like of eventLikes) {
        if (!like.event) continue;
        const ev = like.event;
        officialEvents += 1;
        items.push({
          id: ev.id,
          name: ev.name,
          description: ev.description,
          address: ev.address,
          price: ev.price,
          date: ev.date,
          time: ev.time,
          category: ev.category,
          facilities: ev.facilities,
          tags: ev.tags,
          images: ev.files,
          type: 'event',
          source: 'official',
          createdAt: ev.createdAt,
          updatedAt: ev.updatedAt,
          likes: ev.like,
          reviews: ev.reviews,
          favorites: ev.favorites,
          recommendations: ev.recommendations,
          totalTickets: ev.total_ticket,
          ticketsBooked: ev.ticket_booked,
          isUnlimited: ev.isUnlimited,
          ageRange: ev.age_range,
          likedAt: like.createdAt,
        });
      }

      for (const like of crowdSourceLikes) {
        if (!like.crowdSource) continue;
        const cs = like.crowdSource;

        if (cs.tag === 'Event') {
          crowdSourceEvents += 1;
          items.push({
            id: cs.id,
            name: cs.name,
            description: cs.description,
            address: cs.address,
            price: null,
            date: cs.date,
            time: cs.time,
            category: cs.category,
            facilities: cs.facilities,
            tags: [],
            images: cs.images,
            type: 'event',
            source: 'crowdsourced',
            createdAt: cs.createdAt,
            updatedAt: cs.updatedAt,
            creator: cs.creator,
            likes: cs.like,
            attendances: cs.attendances,
            reviews: cs.reviews,
            isFree: cs.isFree,
            tips: cs.tips,
            likedAt: like.createdAt,
          });
        } else if (cs.tag === 'Place') {
          crowdSourcePlaces += 1;
          items.push({
            id: cs.id,
            name: cs.name,
            description: cs.description,
            address: cs.address,
            price: null,
            date: null,
            time: null,
            category: cs.category,
            facilities: cs.facilities,
            tags: [],
            images: cs.images,
            type: 'place',
            source: 'crowdsourced',
            createdAt: cs.createdAt,
            updatedAt: cs.updatedAt,
            creator: cs.creator,
            likes: cs.like,
            reviews: cs.reviews,
            isFree: cs.isFree,
            tips: cs.tips,
            likedAt: like.createdAt,
          });
        }
      }

      items.sort((a, b) => b.likedAt.getTime() - a.likedAt.getTime());

      return {
        message: 'Liked items found',
        items,
        total: items.length,
        breakdown: {
          officialEvents,
          crowdSourceEvents,
          crowdSourcePlaces,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // unlike the event
  async deleteLike(userId: string, id: string) {
    try {
      const like = await this.prisma.like.findUnique({
        where: { id, userId },
      });
      if (!like) {
        throw new NotFoundException('Like not found');
      }

      await this.prisma.like.delete({ where: { id: like.id } });

      return { message: 'Deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}
