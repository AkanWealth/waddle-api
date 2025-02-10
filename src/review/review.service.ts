import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReviewDto) {
    try {
      const review = await this.prisma.review.create({
        data: <any>{ ...dto },
      });
      return review;
    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    try {
      const reviews = await this.prisma.review.findMany({
        where: { eventId: '2' },
      });

      if (!reviews) throw new NotFoundException('Review not found');

      return reviews;
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const reviews = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!reviews) throw new NotFoundException('Review not found');

      return reviews;
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, dto: UpdateReviewDto) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) throw new NotFoundException('Review not found');

      const updateReview = await this.prisma.review.update({
        where: { id: review.id },
        data: { ...dto },
      });

      return updateReview;
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) throw new NotFoundException('Review not found');

      await this.prisma.review.delete({ where: { id: review.id } });
      return { message: 'Review deleted' };
    } catch (error) {
      throw error;
    }
  }
}
