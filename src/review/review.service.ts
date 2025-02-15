import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  // create a new review for an event
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

  // find all reviews based on the event id
  async findAll(eventId: string) {
    try {
      const reviews = await this.prisma.review.findMany({
        where: { eventId },
        include: { event: true },
      });

      if (!reviews || reviews.length <= 0)
        throw new NotFoundException('Reviews for provided event ID not found');

      return reviews;
    } catch (error) {
      throw error;
    }
  }

  // find one review based on the review id
  async findOne(id: string) {
    try {
      const reviews = await this.prisma.review.findUnique({
        where: { id },
        include: { event: true },
      });

      if (!reviews)
        throw new NotFoundException('Review for the provided ID not found');

      return reviews;
    } catch (error) {
      throw error;
    }
  }

  // update a review based on id
  async update(id: string, dto: UpdateReviewDto) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review)
        throw new NotFoundException('Review for the provided ID not found');

      const updateReview = await this.prisma.review.update({
        where: { id: review.id },
        data: { ...dto },
      });

      return updateReview;
    } catch (error) {
      throw error;
    }
  }

  // remove a review based on id
  async remove(id: string) {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review)
        throw new NotFoundException('Review for the provided ID not found');

      await this.prisma.review.delete({ where: { id: review.id } });
      return { message: 'Review deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}
