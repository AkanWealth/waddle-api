import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLikeDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(private prisma: PrismaService) {}

  // like the event
  async createLike(userId: string, dto: CreateLikeDto) {
    try {
      const like = await this.prisma.like.create({ data: { ...dto, userId } });
      return like;
    } catch (error) {
      throw error;
    }
  }

  // view all likes based on events
  async viewAllLikes(eventId: string) {
    try {
      const likes = await this.prisma.like.findMany({
        where: { eventId: eventId },
      });

      if (!likes || likes.length <= 0)
        throw new NotFoundException('Likes not found');

      return likes;
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
