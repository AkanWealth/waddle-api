import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CreateAdminDto,
  EditAdminDto,
  UpdateAdminDto,
  UpdateReportStatusDto,
} from './dto';
import { GetUser } from '../auth/decorator';
import { Role } from '../auth/enum';
import { Roles } from '../auth/decorator/role-decorator';
import { ReportStatus, User } from '@prisma/client';
import { UpdatePasswordDto } from '../user/dto';
import { JwtGuard } from '../auth/guard';
import { RolesGuard } from '../auth/guard/role.guard';

@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unathorized' })
@ApiInternalServerErrorResponse({ description: 'Internal Server error' })
@UseGuards(JwtGuard, RolesGuard)
@Controller('host')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({
    summary: 'create other admin account',
    description: 'Super admin can create other admin account',
  })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiCreatedResponse({ description: 'Created' })
  @Post('create')
  @Roles(Role.Admin)
  createAdmin(@GetUser() admin: { id: string }, @Body() dto: CreateAdminDto) {
    if (admin) return this.adminService.createAdmin(dto);
  }

  @ApiOperation({
    summary: 'send invite to created admin',
    description: 'Send an invite to the created admin account',
  })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('invite/:id')
  @Roles(Role.Admin)
  sendInvite(@GetUser() admin: { id: string }, @Param('id') id: string) {
    if (admin) return this.adminService.sendInvite(id);
  }

  @ApiOperation({
    summary: 'Invite admin to complete account setup',
    description:
      'Sends an email invitation to the specified admin with a time-limited setup link. A unique token is generated and stored for secure password creation.',
  })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('invite/:id')
  @Roles(Role.Admin)
  sendInviteWeb(@GetUser() admin: { id: string }, @Param('id') id: string) {
    if (admin) return this.adminService.sendInviteWeb(id);
  }

  @ApiOperation({
    summary: 'view all admins as an admin',
    description: 'Admin with admin role can view all admins',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('all')
  @Roles(Role.Admin)
  viewAllAdmin(@GetUser() admin: User) {
    if (admin) return this.adminService.viewAllAdmin();
  }

  @ApiOperation({
    summary: 'view all soft deleted admins as an admin',
    description: 'Admin with admin role can view all soft deleted admins',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('all/soft-deleted')
  @Roles(Role.Admin)
  viewAllSoftDeletedAdmin(@GetUser() admin: User) {
    if (admin) return this.adminService.viewAllSoftDeletedAdmin();
  }
  @ApiOperation({
    summary: 'view my details as a loggedin admin',
    description: 'Admin can view their details',
  })
  @ApiOkResponse({ description: 'Ok' })
  @Get('me')
  @Roles(Role.Admin)
  viewMe(@GetUser() admin: User) {
    return this.adminService.viewMe(admin.id);
  }

  @ApiOperation({
    summary: 'save my fcm token as a loggedin admin',
    description: 'Save my fcm token as a loggedin admin',
  })
  @ApiBody({
    description: 'Device ID',
    type: String,
    required: true,
    schema: {
      properties: {
        token: {
          example: 'your-device-id',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('device-token')
  saveAdminFcmToken(@GetUser('id') id: string, @Body('token') token: string) {
    return this.adminService.saveAdminFcmToken(id, token);
  }

  @ApiOperation({
    summary: 'toogle push notification for loggedin admin',
    description: 'Toogle push notification for loggedin admin',
  })
  @ApiOkResponse({ description: 'Ok' })
  @HttpCode(HttpStatus.OK)
  @Post('push-notification')
  tooglePushNotification(@GetUser('id') id: string) {
    return this.adminService.togglePushNotififcation(id);
  }

  @ApiOperation({
    summary: 'update my details as a loggedin admin',
    description: 'Admin can update their details',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me')
  @Roles(Role.Admin)
  updateProfile(@GetUser('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateProfile(id, dto);
  }

  @Patch('admins/:id/edit')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Edit an admin',
    description:
      "Admin with admin role can update another admin's details and permissions",
  })
  @ApiOkResponse({ description: 'Admin successfully updated' })
  async editAdminWeb(
    @GetUser() admin: User,
    @Param('id') id: string,
    @Body() payload: EditAdminDto,
  ): Promise<{ message: string }> {
    return this.adminService.editAdmin(id, payload);
  }

  @ApiOperation({
    summary: 'update my password as a loggedin admin',
    description: 'Admin can update their password',
  })
  @ApiAcceptedResponse({ description: 'Accepted' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @Patch('me/password')
  @Roles(Role.Admin)
  updatePassword(@GetUser('id') id: string, @Body() dto: UpdatePasswordDto) {
    return this.adminService.updatePassword(id, dto);
  }

  @ApiOperation({
    summary: 'delete an admin',
    description: 'Admin with admin role can delete an admin by id',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  @Roles(Role.Admin)
  deleteAdmin(@GetUser() admin: User, @Param('id') id: string) {
    if (admin) return this.adminService.deleteAdmin(id);
  }

  @ApiOperation({
    summary: 'delete an admin web',
    description: 'Admin with admin role can delete an admin by id on web',
  })
  @ApiNoContentResponse({ description: 'No content' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('web/:id')
  @Roles(Role.Admin)
  deleteAdminWeb(@GetUser() admin: User, @Param('id') id: string) {
    if (admin) return this.adminService.deleteAdminWeb(id);
  }

  @ApiOperation({
    summary: 'Restore a soft-deleted admin (web)',
    description: 'Admin with admin role can restore a soft-deleted admin by ID',
  })
  @ApiNoContentResponse({ description: 'Admin successfully restored' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('restore/:id')
  @Roles(Role.Admin)
  async restoreDeletedAdmin(
    @GetUser() admin: User,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    if (admin) {
      return this.adminService.restoreDeletedAdmin(id);
    }
  }

  @ApiOperation({
    summary: 'Mark a vendor as Waddle Approved',
    description:
      'Admin with admin role can mark a vendor as Waddle Approved by ID',
  })
  @ApiOkResponse({
    description: 'Vendor successfully marked as Waddle Approved',
    schema: {
      example: { message: 'Vendor marked as Waddle Approved successfully' },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isWaddleApproved: {
          type: 'boolean',
          example: true,
          description:
            'Set true to mark vendor as Waddle Approved, false otherwise',
        },
      },
      required: ['isWaddleApproved'],
    },
  })
  @HttpCode(HttpStatus.OK)
  @Patch('vendor/:vendorId/waddle-approved')
  @Roles(Role.Admin)
  async markVendorAsWaddleApproved(
    @Param('vendorId') vendorId: string,
    @Body() body: { isWaddleApproved: boolean },
  ): Promise<{ message: string }> {
    return this.adminService.markVendorAsWaddleApproved(
      vendorId,
      body.isWaddleApproved,
    );
  }

  @ApiOperation({
    summary: 'Deactivate an admin (web)',
    description: 'Admin with admin role can deactivate another admin by ID',
  })
  @ApiNoContentResponse({ description: 'Admin successfully deactivated' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('activate/:id')
  @Roles(Role.Admin)
  async deactivateAdminWeb(
    @GetUser() admin: User,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    if (admin) {
      return this.adminService.deactivateAdmin(id);
    }
  }

  @ApiOperation({
    summary: 'Reactivate an admin (web)',
    description: 'Admin with admin role can reactivate an admin by ID',
  })
  @ApiOkResponse({ description: 'Admin successfully reactivated' })
  @Patch('web/:id/reactivate')
  @Roles(Role.Admin)
  async reactivateAdminWeb(
    @GetUser() admin: User,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    if (admin) {
      return this.adminService.reactivateAdmin(id);
    }
  }

  @ApiOperation({
    summary: 'Get user activity statistics',
    description:
      'Retrieves user statistics including total users, parents, organizers, inactive users, and monthly growth data',
  })
  @ApiOkResponse({ description: 'ser activity data retrieved successfully' })
  @Get('analytics')
  @Roles(Role.Admin)
  async getUserActivity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); // start of month, 3 months ago
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // start of next month

    const parsedStartRaw = startDate ? new Date(startDate) : defaultStartDate;
    const parsedEndRaw = endDate ? new Date(endDate) : defaultEndDate;

    // Normalize to day boundaries: start inclusive 00:00, end exclusive next day 00:00
    const start = new Date(parsedStartRaw);
    start.setHours(0, 0, 0, 0);

    const end = new Date(parsedEndRaw);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);

    return await this.adminService.getUserActivity(start, end);
  }

  @ApiOperation({
    summary: 'Get event activity statistics',
    description:
      'Retrieves event statistics including total events, active events, cancelled events, total attendees, top performing events, and booking rate data',
  })
  @ApiOkResponse({ description: 'Event activity data retrieved successfully' })
  @Get('analytics/event')
  @Roles(Role.Admin)
  async getEventActivity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // start of next month
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // start of month, 2 months ago

    const parsedStart = startDate ? new Date(startDate) : defaultStartDate;
    const parsedEnd = endDate ? new Date(endDate) : defaultEndDate;

    return await this.adminService.getEventActivity(parsedStart, parsedEnd);
  }

  @ApiOperation({
    summary: 'Export user analytics data (CSV-friendly)',
    description:
      'Returns the full user analytics object plus CSV headings for each data array.',
  })
  @ApiOkResponse({ description: 'User analytics data for CSV export' })
  @Get('analytics/export/csv')
  @Roles(Role.Admin)
  async exportUserAnalyticsCSV(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const parsedStart = startDate ? new Date(startDate) : defaultStartDate;
    const parsedEnd = endDate ? new Date(endDate) : defaultEndDate;
    const data = await this.adminService.getUserActivity(
      parsedStart,
      parsedEnd,
    );
    // Provide headings for each array
    return {
      ...data,
      headings: {
        userStats: ['type', 'title', 'count', 'change', 'isPositive'],
        monthlyData: ['name', 'parents', 'organizers'],
      },
    };
  }

  @ApiOperation({
    summary: 'Export event analytics data (CSV-friendly)',
    description:
      'Returns the full event analytics object plus CSV headings for each data array.',
  })
  @ApiOkResponse({ description: 'Event analytics data for CSV export' })
  @Get('analytics/event/export/csv')
  @Roles(Role.Admin)
  async exportEventAnalyticsCSV(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const now = new Date();
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const parsedStart = startDate ? new Date(startDate) : defaultStartDate;
    const parsedEnd = endDate ? new Date(endDate) : defaultEndDate;
    const data = await this.adminService.getEventActivity(
      parsedStart,
      parsedEnd,
    );
    // Provide headings for each array
    return {
      ...data,
      headings: {
        eventStats: ['type', 'title', 'count', 'change', 'isPositive'],
        topEvents: ['id', 'event', 'vendor', 'attendees'],
        bookingData: ['day', 'bookings'],
      },
    };
  }

  @ApiOperation({
    summary: 'Get booking data by period',
    description:
      'Retrieves booking data for different time periods: 7days (last 7 days), monthly (last 12 months), or yearly (last 7 years)',
  })
  @ApiOkResponse({ description: 'Booking data retrieved successfully' })
  @Get('analytics/booking/:period')
  @Roles(Role.Admin)
  async getBookingData(
    @Param('period') period: '7days' | 'monthly' | 'yearly',
  ) {
    return await this.adminService.getBookingData(period);
  }

  @ApiOperation({
    summary: 'Fetch reported events',
    description: 'Lists reports opened against parent-created events.',
  })
  @ApiOkResponse({ description: 'Reported events retrieved successfully' })
  @Get('reports/events')
  @Roles(Role.Admin)
  getReportedEvents(
    @GetUser('id') adminId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    if (adminId) {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      return this.adminService.getEventReports({
        status: this.parseReportStatus(status),
        search,
        startDate,
        endDate,
        page: pageNum,
        limit: limitNum,
      });
    }
  }

  @ApiOperation({
    summary: 'View reported event details',
    description: 'Fetch the specific event and context for a report.',
  })
  @ApiOkResponse({ description: 'Reported event retrieved successfully' })
  @Get('reports/events/:reportId')
  @Roles(Role.Admin)
  getReportedEventDetail(
    @GetUser('id') adminId: string,
    @Param('reportId') reportId: string,
  ) {
    if (adminId) {
      return this.adminService.getEventReportDetail(reportId);
    }
  }

  // @ApiOperation({
  //   summary: 'Fetch reported recommendations',
  //   description: 'Lists reports raised against parent recommendations/places.',
  // })
  // @ApiOkResponse({
  //   description: 'Reported recommendations retrieved successfully',
  // })
  // @Get('reports/recommendations')
  // @Roles(Role.Admin)
  // getReportedRecommendations(
  //   @GetUser('id') adminId: string,
  //   @Query('status') status?: string,
  // ) {
  //   if (adminId) {
  //     return this.adminService.getCrowdSourceReportsByTag(
  //       'Place',
  //       this.parseReportStatus(status),
  //     );
  //   }
  // }

  @ApiOperation({
    summary: 'Fetch reported recommendations',
    description: 'Lists reports raised against parent recommendations/places.',
  })
  @ApiOkResponse({
    description: 'Reported recommendations retrieved successfully',
  })
  @Get('reports/recommendations')
  @Roles(Role.Admin)
  getReportedRecommendations(
    @GetUser('id') adminId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    if (adminId) {
      return this.adminService.getCrowdSourceReports({
        status: this.parseReportStatus(status),
        search,
        startDate,
        endDate,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    }
  }

  @ApiOperation({
    summary: 'Fetch reported comments',
    description: 'Lists crowdsource comments that have been reported.',
  })
  @ApiOkResponse({ description: 'Reported comments retrieved successfully' })
  @Get('reports/comments')
  @Roles(Role.Admin)
  getReportedComments(
    @GetUser('id') adminId: string,
    @Query('status') status?: string,
  ) {
    if (adminId) {
      return this.adminService.getCommentReports(
        this.parseReportStatus(status),
      );
    }
  }

  @ApiOperation({
    summary: 'Fetch reported reviews',
    description:
      'Lists reviews on events or places that admins need to review.',
  })
  @ApiOkResponse({ description: 'Reported reviews retrieved successfully' })
  @Get('reports/reviews')
  @Roles(Role.Admin)
  getReportedReviews(
    @GetUser('id') adminId: string,
    @Query('status') status?: string,
  ) {
    if (adminId) {
      return this.adminService.getReviewReports(this.parseReportStatus(status));
    }
  }

  @ApiOperation({
    summary: 'Update reported event',
    description: 'Marks a reported event as reviewed (no content removal).',
  })
  @ApiOkResponse({ description: 'Event report updated successfully' })
  @Patch('reports/events/:reportId')
  @Roles(Role.Admin)
  updateEventReport(
    @GetUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    if (adminId) {
      return this.adminService.updateEventReport(reportId, adminId, dto.status);
    }
  }

  @ApiOperation({
    summary: 'Update reported recommendation',
    description: 'Marks a reported recommendation or removes it entirely.',
  })
  @ApiOkResponse({
    description: 'Recommendation report updated successfully',
  })
  @Patch('reports/recommendations/:reportId')
  @Roles(Role.Admin)
  updateRecommendationReport(
    @GetUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    if (adminId) {
      return this.adminService.updateCrowdSourceReport(
        reportId,
        adminId,
        dto.status,
        dto.removeContent,
      );
    }
  }

  @ApiOperation({
    summary: 'Update reported comment',
    description:
      'Marks a comment report as reviewed and optionally hides the comment.',
  })
  @ApiOkResponse({ description: 'Comment report updated successfully' })
  @Patch('reports/comments/:reportId')
  @Roles(Role.Admin)
  updateCommentReport(
    @GetUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    if (adminId) {
      return this.adminService.updateCommentReport(
        reportId,
        adminId,
        dto.status,
        dto.removeContent,
      );
    }
  }

  @ApiOperation({
    summary: 'Update reported review',
    description: 'Marks a review report as reviewed and optionally removes it.',
  })
  @ApiOkResponse({ description: 'Review report updated successfully' })
  @Patch('reports/reviews/:reportId')
  @Roles(Role.Admin)
  updateReviewReport(
    @GetUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    if (adminId) {
      return this.adminService.updateReviewReport(
        reportId,
        adminId,
        dto.status,
        dto.removeContent,
      );
    }
  }

  private parseReportStatus(status?: string): ReportStatus | undefined {
    if (!status) {
      return undefined;
    }
    const normalized = status.toUpperCase();
    if ((Object.values(ReportStatus) as string[]).includes(normalized)) {
      return normalized as ReportStatus;
    }
    return undefined;
  }
}
