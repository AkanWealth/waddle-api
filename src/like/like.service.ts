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
