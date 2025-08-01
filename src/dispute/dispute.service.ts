import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  UpdateDisputeStatusDto,
  QueryDisputesDto,
} from './dto';
import { DisputeStatus } from '@prisma/client';
import { NotificationHelper } from 'src/notification/notification.helper';

@Injectable()
export class DisputeService {
  constructor(
    private prisma: PrismaService,
    private notificationHelper: NotificationHelper,
  ) {}

  private async generateDisputeId(): Promise<string> {
    // Get the count of existing disputes to generate the next number
    const count = await this.prisma.dispute.count();
    const nextNumber = count + 1;
    return `DPT-${nextNumber.toString().padStart(4, '0')}`;
  }

  async createDispute(userId: string, createDisputeDto: CreateDisputeDto) {
    // Verify the booking exists and belongs to the user
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: createDisputeDto.bookingRef,
        userId: userId,
      },
      include: {
        event: {
          include: {
            organiser: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(
        'Booking not found or does not belong to you',
      );
    }

    // Generate custom dispute ID
    const disputeId = await this.generateDisputeId();

    const dispute = await this.prisma.dispute.create({
      data: {
        id: disputeId,
        category: createDisputeDto.category,
        reason: '', // No reason in DTO, set to empty string
        vendorId: booking.event.organiserId,
        customerId: userId,
        eventId: booking.eventId,
        bookingRef: createDisputeDto.bookingRef,
        refundRequest: null, // No refundRequest in DTO
        description: createDisputeDto.description,
        file: (createDisputeDto as any).file || null,
        status: DisputeStatus.PENDING,
      },
      include: {
        vendor: true,
        customer: true,
        event: true,
        booking: true,
      },
    });

    await this.notificationHelper.sendPendingDisputeAlert(
      userId,
      dispute.customer.name,
    );

    return dispute;
  }

  async getUserDisputes(userId: string, queryDto: QueryDisputesDto) {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      startDate,
      endDate,
      includeResolved,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      customerId: userId,
    };

    // Add status filter
    if (status) {
      where.status = status;
    } else if (!includeResolved) {
      // By default, exclude resolved disputes unless explicitly requested
      where.status = {
        not: DisputeStatus.RESOLVED,
      };
    }

    // Add category filter
    if (category) {
      where.category = category;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          vendor: true,
          event: true,
          booking: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getVendorDisputes(vendorId: string, queryDto: QueryDisputesDto) {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      startDate,
      endDate,
      includeResolved,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      vendorId: vendorId,
    };

    // Add status filter
    if (status) {
      where.status = status;
    } else if (!includeResolved) {
      // By default, exclude resolved disputes unless explicitly requested
      where.status = {
        not: DisputeStatus.RESOLVED,
      };
    }

    // Add category filter
    if (category) {
      where.category = category;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          customer: true,
          event: true,
          booking: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getAllDisputes(queryDto: QueryDisputesDto) {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      startDate,
      endDate,
      includeResolved,
      search,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Add status filter
    if (status) {
      where.status = status;
    } else if (!includeResolved) {
      // By default, exclude resolved disputes unless explicitly requested
      where.status = {
        not: DisputeStatus.RESOLVED,
      };
    }

    // Add category filter
    if (category) {
      where.category = category;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Add search filter
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        // Search by dispute ID
        {
          id: {
            contains: searchTerm,
            mode: 'insensitive' as const,
          },
        },
        // Search by event name
        {
          event: {
            name: {
              contains: searchTerm,
              mode: 'insensitive' as const,
            },
          },
        },
        // Search by customer name
        {
          customer: {
            OR: [
              {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        },
        // Search by vendor name
        {
          vendor: {
            OR: [
              {
                name: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
              {
                business_name: {
                  contains: searchTerm,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        },
        // Search by booking ID
        {
          bookingRef: {
            contains: searchTerm,
            mode: 'insensitive' as const,
          },
        },
      ];
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          vendor: true,
          customer: true,
          event: true,
          booking: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getDisputeById(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: {
        id: disputeId,
      },
      include: {
        vendor: true,
        customer: true,
        event: true,
        booking: true,
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  async updateDispute(
    userId: string,
    disputeId: string,
    updateDisputeDto: UpdateDisputeDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: {
        id: disputeId,
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Only the customer can update their own dispute
    if (dispute.customerId !== userId) {
      throw new ForbiddenException('You can only update your own disputes');
    }

    // Only allow updates if status is PENDING
    if (dispute.status !== DisputeStatus.PENDING) {
      throw new ForbiddenException(
        'Cannot update dispute that is not in pending status',
      );
    }

    return this.prisma.dispute.update({
      where: {
        id: disputeId,
      },
      data: updateDisputeDto,
      include: {
        vendor: true,
        customer: true,
        event: true,
        booking: true,
      },
    });
  }

  async updateDisputeStatus(
    disputeId: string,
    updateStatusDto: UpdateDisputeStatusDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: {
        id: disputeId,
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Validate status transition
    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new ForbiddenException('Cannot update a resolved dispute');
    }

    if (
      dispute.status === DisputeStatus.PENDING &&
      updateStatusDto.status === DisputeStatus.RESOLVED
    ) {
      throw new ForbiddenException(
        'Cannot directly resolve a pending dispute. Must go through IN_REVIEW first',
      );
    }
    const updatedDispute = await this.prisma.dispute.update({
      where: {
        id: disputeId,
      },
      data: {
        status: updateStatusDto.status,
      },
      include: {
        vendor: true,
        customer: true,
        event: true,
        booking: true,
      },
    });

    if (updatedDispute.status === DisputeStatus.IN_REVIEW) {
      await this.notificationHelper.sendDisputeInReviewAlert(
        updatedDispute.customerId,
      );
    }
    if (updatedDispute.status === DisputeStatus.RESOLVED) {
      await this.notificationHelper.sendDisputeResolvedAlert(
        updatedDispute.customerId,
        updatedDispute.customer.name,
      );
    }

    return updatedDispute;
  }

  async getDisputesByStatus(status: DisputeStatus, queryDto: QueryDisputesDto) {
    const { page = 1, limit = 10, category, startDate, endDate } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      status: status,
    };

    // Add category filter
    if (category) {
      where.category = category;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          vendor: true,
          customer: true,
          event: true,
          booking: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getDisputesByCategory(category: string, queryDto: QueryDisputesDto) {
    const { page = 1, limit = 10, status, startDate, endDate } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      category: category as any,
    };

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        include: {
          vendor: true,
          customer: true,
          event: true,
          booking: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
