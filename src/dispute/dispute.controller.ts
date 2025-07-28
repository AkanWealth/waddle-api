import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DisputeService } from './dispute.service';
import {
  CreateDisputeDto,
  UpdateDisputeDto,
  UpdateDisputeStatusDto,
  QueryDisputesDto,
} from './dto';
import { JwtGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { Role } from '@prisma/client';

enum DisputeStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
}

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(JwtGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  // User endpoints
  @Post()
  @ApiOperation({
    summary: 'Create a new dispute',
    description:
      'Create a new dispute for a booking. Only the customer who made the booking can create a dispute.',
  })
  @ApiBody({
    type: CreateDisputeDto,
    description: 'Dispute creation data',
    examples: {
      payment: {
        summary: 'Payment Dispute',
        value: {
          category: 'PAYMENT',
          reason: 'Double charged for tickets',
          eventId: 'event-id-here',
          bookingRef: 'booking-id-here',
          description: 'I was charged twice for the same booking',
          refundRequest: 'Please refund the duplicate charge',
        },
      },
      service: {
        summary: 'Service Dispute',
        value: {
          category: 'SERVICE',
          reason: 'Event was cancelled without notice',
          eventId: 'event-id-here',
          bookingRef: 'booking-id-here',
          description: 'The event was cancelled 2 hours before start time',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Dispute created successfully',
    schema: {
      example: {
        id: 'DPT-0001',
        category: 'PAYMENT',
        reason: 'Double charged for tickets',
        status: 'PENDING',
        createdAt: '2024-01-15T10:30:00Z',
        vendor: {
          id: 'vendor-id',
          name: 'Event Organizer',
          business_name: 'Event Co.',
        },
        event: {
          id: 'event-id',
          name: 'Summer Festival',
        },
        booking: {
          id: 'booking-id',
          ticket_quantity: 2,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Booking not found or does not belong to user',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  async createDispute(
    @GetUser('id') userId: string,
    @Body() createDisputeDto: CreateDisputeDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Attach file name if file is present
    if (file) {
      (createDisputeDto as any).file = file.originalname;
    }
    return this.disputeService.createDispute(userId, createDisputeDto);
  }

  @Get('my-disputes')
  @ApiOperation({
    summary: 'Get user disputes',
    description:
      'Retrieve all disputes created by the authenticated user with pagination and filtering options.',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page (default: 10, max: 100)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by dispute status',
    required: false,
    enum: DisputeStatus,
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by dispute category',
    required: false,
    example: 'PAYMENT',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Filter disputes created from this date (ISO format)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Filter disputes created until this date (ISO format)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'includeResolved',
    description: 'Include resolved disputes (default: false)',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiOkResponse({
    description: 'List of user disputes with pagination',
    schema: {
      example: {
        data: [
          {
            id: 'DPT-0001',
            category: 'PAYMENT',
            reason: 'Double charged for tickets',
            status: 'PENDING',
            createdAt: '2024-01-15T10:30:00Z',
            vendor: {
              name: 'Event Organizer',
              business_name: 'Event Co.',
            },
            event: {
              name: 'Summer Festival',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  async getUserDisputes(
    @GetUser('id') userId: string,
    @Query() queryDto: QueryDisputesDto,
  ) {
    return this.disputeService.getUserDisputes(userId, queryDto);
  }

  @Get('my-disputes/:id')
  @ApiOperation({
    summary: 'Get specific user dispute',
    description:
      'Retrieve a specific dispute by ID. Only accessible by the dispute creator.',
  })
  @ApiParam({
    name: 'id',
    description: 'Dispute ID',
    example: 'DPT-0001',
  })
  @ApiOkResponse({
    description: 'Dispute details',
    schema: {
      example: {
        id: 'DPT-0001',
        category: 'PAYMENT',
        reason: 'Double charged for tickets',
        status: 'PENDING',
        description: 'I was charged twice for the same booking',
        createdAt: '2024-01-15T10:30:00Z',
        vendor: {
          name: 'Event Organizer',
          business_name: 'Event Co.',
        },
        event: {
          name: 'Summer Festival',
        },
        booking: {
          ticket_quantity: 2,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Dispute not found',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - Dispute does not belong to user',
  })
  async getUserDispute(
    @GetUser('id') userId: string,
    @Param('id') disputeId: string,
  ) {
    const dispute = await this.disputeService.getDisputeById(disputeId);

    // Check if the dispute belongs to the user
    if (dispute.customerId !== userId) {
      throw new Error('Access denied');
    }

    return dispute;
  }

  @Patch('my-disputes/:id')
  @ApiOperation({
    summary: 'Update user dispute',
    description: 'Update a dispute. Only allowed if status is PENDING.',
  })
  @ApiParam({
    name: 'id',
    description: 'Dispute ID',
    example: 'DPT-0001',
  })
  @ApiBody({
    type: UpdateDisputeDto,
    description: 'Dispute update data',
    examples: {
      update: {
        summary: 'Update Dispute',
        value: {
          description: 'Updated description with more details',
          refundRequest: 'Please process refund within 5 business days',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Dispute updated successfully',
  })
  @ApiForbiddenResponse({
    description: 'Cannot update dispute - not in pending status or not owner',
  })
  @ApiNotFoundResponse({
    description: 'Dispute not found',
  })
  async updateUserDispute(
    @GetUser('id') userId: string,
    @Param('id') disputeId: string,
    @Body() updateDisputeDto: UpdateDisputeDto,
  ) {
    return this.disputeService.updateDispute(
      userId,
      disputeId,
      updateDisputeDto,
    );
  }

  // Vendor endpoints
  @Get('vendor-disputes')
  @UseGuards(RolesGuard)
  @Roles(Role.ORGANISER)
  @ApiOperation({
    summary: 'Get vendor disputes',
    description:
      'Retrieve all disputes against the authenticated vendor/organiser with pagination and filtering.',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page (default: 10, max: 100)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by dispute status',
    required: false,
    enum: DisputeStatus,
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by dispute category',
    required: false,
    example: 'PAYMENT',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Filter disputes created from this date (ISO format)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Filter disputes created until this date (ISO format)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'includeResolved',
    description: 'Include resolved disputes (default: false)',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiOkResponse({
    description: 'List of vendor disputes with pagination',
    schema: {
      example: {
        data: [
          {
            id: 'DPT-0001',
            category: 'PAYMENT',
            reason: 'Double charged for tickets',
            status: 'PENDING',
            createdAt: '2024-01-15T10:30:00Z',
            customer: {
              name: 'John Doe',
              email: 'john@example.com',
            },
            event: {
              name: 'Summer Festival',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 15,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Requires ORGANISER role',
  })
  async getVendorDisputes(
    @GetUser('id') vendorId: string,
    @Query() queryDto: QueryDisputesDto,
  ) {
    return this.disputeService.getVendorDisputes(vendorId, queryDto);
  }

  @Get('vendor-disputes/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ORGANISER)
  @ApiOperation({
    summary: 'Get specific vendor dispute',
    description:
      'Retrieve a specific dispute by ID. Only accessible by the vendor involved.',
  })
  @ApiParam({
    name: 'id',
    description: 'Dispute ID',
    example: 'DPT-0001',
  })
  @ApiOkResponse({
    description: 'Dispute details',
  })
  @ApiNotFoundResponse({
    description: 'Dispute not found',
  })
  @ApiForbiddenResponse({
    description: 'Access denied - Dispute does not belong to vendor',
  })
  async getVendorDispute(
    @GetUser('id') vendorId: string,
    @Param('id') disputeId: string,
  ) {
    const dispute = await this.disputeService.getDisputeById(disputeId);

    // Check if the dispute belongs to the vendor
    if (dispute.vendorId !== vendorId) {
      throw new Error('Access denied');
    }

    return dispute;
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all disputes (Admin)',
    description:
      'Retrieve all disputes in the system with pagination and filtering. Admin only.',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page (default: 10, max: 100)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by dispute status',
    required: false,
    enum: DisputeStatus,
    example: 'PENDING | IN_REVIEW | RESOLVED',
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by dispute category',
    required: false,
    example: 'PAYMENT',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Filter disputes created from this date (ISO format)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Filter disputes created until this date (ISO format)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'includeResolved',
    description: 'Include resolved disputes (default: false)',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiOkResponse({
    description: 'List of all disputes with pagination',
    schema: {
      example: {
        data: [
          {
            id: 'DPT-0001',
            category: 'PAYMENT',
            reason: 'Double charged for tickets',
            status: 'PENDING',
            createdAt: '2024-01-15T10:30:00Z',
            vendor: {
              name: 'Event Organizer',
              business_name: 'Event Co.',
            },
            customer: {
              name: 'John Doe',
              email: 'john@example.com',
            },
            event: {
              name: 'Summer Festival',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5,
          hasNext: true,
          hasPrev: false,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Requires ADMIN role',
  })
  async getAllDisputes(@Query() queryDto: QueryDisputesDto) {
    return this.disputeService.getAllDisputes(queryDto);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get specific dispute (Admin)',
    description: 'Retrieve a specific dispute by ID. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Dispute ID',
    example: 'DPT-0001',
  })
  @ApiOkResponse({
    description: 'Dispute details',
  })
  @ApiNotFoundResponse({
    description: 'Dispute not found',
  })
  async getDisputeById(@Param('id') disputeId: string) {
    return this.disputeService.getDisputeById(disputeId);
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update dispute status (Admin)',
    description:
      'Update the status of a dispute. Valid transitions: PENDING → IN_REVIEW → RESOLVED',
  })
  @ApiParam({
    name: 'id',
    description: 'Dispute ID',
    example: 'DPT-0001',
  })
  @ApiBody({
    type: UpdateDisputeStatusDto,
    description: 'Status update data',
    examples: {
      inReview: {
        summary: 'Move to In Review',
        value: {
          status: 'IN_REVIEW',
        },
      },
      resolved: {
        summary: 'Resolve Dispute',
        value: {
          status: 'RESOLVED',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Dispute status updated successfully',
  })
  @ApiForbiddenResponse({
    description: 'Invalid status transition or requires ADMIN role',
  })
  @ApiNotFoundResponse({
    description: 'Dispute not found',
  })
  async updateDisputeStatus(
    @Param('id') disputeId: string,
    @Body() updateStatusDto: UpdateDisputeStatusDto,
  ) {
    return this.disputeService.updateDisputeStatus(disputeId, updateStatusDto);
  }

  @Get('admin/by-status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get disputes by status (Admin)',
    description:
      'Filter disputes by status with pagination and additional filters. Admin only.',
  })
  @ApiQuery({
    name: 'status',
    description: 'Dispute status to filter by',
    enum: DisputeStatus,
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page (default: 10, max: 100)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by dispute category',
    required: false,
    example: 'PAYMENT',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Filter disputes created from this date (ISO format)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Filter disputes created until this date (ISO format)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @ApiOkResponse({
    description: 'List of disputes filtered by status with pagination',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Requires ADMIN role',
  })
  async getDisputesByStatus(
    @Query('status') status: DisputeStatus,
    @Query() queryDto: QueryDisputesDto,
  ) {
    return this.disputeService.getDisputesByStatus(status, queryDto);
  }

  @Get('admin/by-category')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get disputes by category (Admin)',
    description:
      'Filter disputes by category with pagination and additional filters. Admin only.',
  })
  @ApiQuery({
    name: 'category',
    description: 'Dispute category to filter by',
    example: 'PAYMENT',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (default: 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per page (default: 10, max: 100)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by dispute status',
    required: false,
    enum: DisputeStatus,
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Filter disputes created from this date (ISO format)',
    required: false,
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    description: 'Filter disputes created until this date (ISO format)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  @ApiOkResponse({
    description: 'List of disputes filtered by category with pagination',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Requires ADMIN role',
  })
  async getDisputesByCategory(
    @Query('category') category: string,
    @Query() queryDto: QueryDisputesDto,
  ) {
    return this.disputeService.getDisputesByCategory(category, queryDto);
  }

  // Statistics endpoints for admin
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get dispute statistics (Admin)',
    description: 'Get statistics about disputes. Admin only.',
  })
  @ApiOkResponse({
    description: 'Dispute statistics',
    schema: {
      example: {
        total: 25,
        pending: 10,
        inReview: 8,
        resolved: 7,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Requires ADMIN role',
  })
  async getDisputeStats() {
    const [total, pending, inReview, resolved] = await Promise.all([
      this.disputeService.getAllDisputes({ includeResolved: true }),
      this.disputeService.getDisputesByStatus(DisputeStatus.PENDING, {}),
      this.disputeService.getDisputesByStatus(DisputeStatus.IN_REVIEW, {}),
      this.disputeService.getDisputesByStatus(DisputeStatus.RESOLVED, {}),
    ]);

    return {
      total: total.pagination.total,
      pending: pending.pagination.total,
      inReview: inReview.pagination.total,
      resolved: resolved.pagination.total,
    };
  }
}
