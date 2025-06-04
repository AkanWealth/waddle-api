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
import { CreateAdminDto, UpdateAdminDto } from './dto';
import { GetUser } from '../auth/decorator';
import { Role } from '../auth/enum';
import { Roles } from '../auth/decorator/role-decorator';
import { User } from '@prisma/client';
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
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // start of next month
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1); // start of month, 2 months ago

    const parsedStart = startDate ? new Date(startDate) : defaultStartDate;
    const parsedEnd = endDate ? new Date(endDate) : defaultEndDate;

    return await this.adminService.getUserActivity(parsedStart, parsedEnd);
  }
}
