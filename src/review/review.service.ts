import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateReviewDto, ReportReviewDto, UpdateReviewDto } from './dto';
import { Role } from '../auth/enum';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  // create a new review for an event
  async createReview(dto: CreateReviewDto) {
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
  async viewAllReviews(eventId: string) {
    try {
      const reviews = await this.prisma.review.findMany({
        where: { eventId },
        include: { event: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!reviews || reviews.length <= 0)
        throw new NotFoundException('Reviews for provided event ID not found');

      return reviews;
    } catch (error) {
      throw error;
    }
  }

  // find one review based on the review id
  async viewReview(id: string) {
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
  async updateReview(id: string, dto: UpdateReviewDto) {
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

  // delete a review based on id
  async deleteReview(id: string) {
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

  async reportReview(
    reviewId: string,
    dto: ReportReviewDto,
    reporter: { id: string; role: Role },
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });

    if (!review) {
      throw new NotFoundException('Review for the provided ID not found');
    }

    const whereClause =
      reporter.role === Role.Organiser
        ? { reviewId, organiserId: reporter.id }
        : { reviewId, reporterId: reporter.id };

    const existingReport = await this.prisma.reviewReport.findFirst({
      where: whereClause,
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this review');
    }

    const reportData: Prisma.ReviewReportUncheckedCreateInput = {
      reviewId,
      reason: dto.reason,
      description: dto.description ?? null,
    };

    if (reporter.role === Role.Organiser) {
      reportData.organiserId = reporter.id;
    } else {
      reportData.reporterId = reporter.id;
    }

    const report = await this.prisma.reviewReport.create({
      data: reportData,
    });

    return { message: 'Review reported successfully', report };
  }

  async getReviewReportsByEvent(eventId: string) {
    const reports = await this.prisma.reviewReport.findMany({
      where: {
        review: {
          eventId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            eventId: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organiser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!reports || reports.length <= 0) {
      throw new NotFoundException('No review reports found for this event');
    }

    return {
      message: 'Review reports retrieved successfully',
      reports,
    };
  }
}
