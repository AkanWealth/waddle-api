// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Patch,
//   Param,
//   Query,
//   HttpCode,
//   HttpStatus,
//   Delete,
// } from '@nestjs/common';
// import {
//   ApiInternalServerErrorResponse,
//   ApiOkResponse,
//   ApiOperation,
//   ApiQuery,
// } from '@nestjs/swagger';
// import { NotificationService } from './notification.service';
// import {
//   CreateAdminNotificationDto,
//   CreateNotificationDto,
//   SendPushDto,
// } from './dto';

// @ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
// @Controller('notifications')
// export class NotificationController {
//   constructor(private readonly notificationService: NotificationService) {}

//   @ApiOperation({
//     summary: 'Create and send notification',
//     description:
//       'Create notification in database and optionally send push notification',
//   })
//   @ApiOkResponse({ description: 'Notification created successfully' })
//   @HttpCode(HttpStatus.CREATED)
//   @Post()
//   async createNotification(@Body() dto: CreateNotificationDto) {
//     return this.notificationService.createNotification(dto);
//   }

//   @ApiOperation({
//     summary: 'Send push notification',
//     description: 'Send push notification to user',
//   })
//   @ApiOkResponse({ description: 'Push notification sent' })
//   @HttpCode(HttpStatus.OK)
//   @Post('push')
//   async sendPush(@Body() dto: SendPushDto) {
//     return this.notificationService.sendPushToUser(
//       dto.userId,
//       dto.title,
//       dto.body,
//     );
//   }

//   @ApiOperation({
//     summary: 'Get user notifications',
//     description: 'Get paginated notifications for a user',
//   })
//   @ApiOkResponse({ description: 'Notifications retrieved successfully' })
//   @ApiQuery({ name: 'page', required: false, type: Number })
//   @ApiQuery({ name: 'limit', required: false, type: Number })
//   @Get('user/:userId')
//   async getUserNotifications(
//     @Param('userId') userId: string,
//     @Query('page') page: number = 1,
//     @Query('limit') limit: number = 20,
//   ) {
//     return this.notificationService.getUserNotifications(userId, page, limit);
//   }

//   @ApiOperation({
//     summary: 'Mark notification as read',
//     description: 'Mark a specific notification as read',
//   })
//   @ApiOkResponse({ description: 'Notification marked as read' })
//   @Patch(':id/read/:userId')
//   async markAsRead(@Param('id') id: string, @Param('userId') userId: string) {
//     return this.notificationService.markAsRead(id, userId);
//   }

//   @ApiOperation({
//     summary: 'Mark all notifications as read',
//     description: 'Mark all notifications as read for a user',
//   })
//   @ApiOkResponse({ description: 'All notifications marked as read' })
//   @Patch('read-all/:userId')
//   async markAllAsRead(@Param('userId') userId: string) {
//     return this.notificationService.markAllAsRead(userId);
//   }

//   @ApiOperation({
//     summary: 'Get unread count',
//     description: 'Get count of unread notifications for a user',
//   })
//   @ApiOkResponse({ description: 'Unread count retrieved' })
//   @Get('unread-count/:userId')
//   async getUnreadCount(@Param('userId') userId: string) {
//     return this.notificationService.getUnreadCount(userId);
//   }

//   @ApiOperation({
//     summary: 'Delete a notification',
//     description: 'Delete a specific notification for a user',
//   })
//   @ApiOkResponse({ description: 'Notification deleted successfully' })
//   @Delete(':id/user/:userId')
//   async deleteNotification(
//     @Param('id') id: string,
//     @Param('userId') userId: string,
//   ) {
//     return this.notificationService.deleteNotification(id, userId);
//   }

//   @ApiOperation({
//     summary: 'Delete all notifications for a user',
//     description: 'Delete all notifications for a user',
//   })
//   @ApiOkResponse({ description: 'All notifications deleted successfully' })
//   @Delete('user/:userId')
//   async deleteAllNotifications(@Param('userId') userId: string) {
//     return this.notificationService.deleteAllNotifications(userId);
//   }

//   @Post()
//   async createAdminNotification(@Body() dto: CreateAdminNotificationDto) {
//     return this.notificationService.createAdminNotification(dto);
//   }

//   @Get()
//   async getMyNotifications(
//     @Param('adminId') adminId: string,
//     @Query('includeRead') includeRead?: string,
//     @Query('includeCleared') includeCleared?: string,
//     @Query('limit') limit?: string,
//     @Query('offset') offset?: string,
//   ) {
//     const options = {
//       includeRead: includeRead !== 'false',
//       includeCleared: includeCleared === 'true',
//       limit: limit ? parseInt(limit) : 50,
//       offset: offset ? parseInt(offset) : 0,
//     };

//     return this.notificationService.getAdminNotifications(adminId, options);
//   }

//   @Get('counts')
//   async getNotificationCounts(@Param('adminId') adminId: string) {
//     return this.notificationService.getAdminNotificationCounts(adminId);
//   }

//   @Patch(':notificationId/read')
//   async markAdminNotificationAsRead(
//     @Param('adminId') adminId: string,
//     @Param('notificationId') notificationId: string,
//   ) {
//     return this.notificationService.markAdminNotificationAsRead(
//       adminId,
//       notificationId,
//     );
//   }

//   @Patch('read-all')
//   async markAllAdminNotificationAsRead(@Param('adminId') adminId: string) {
//     return this.notificationService.markAllAdminNotificationAsRead(adminId);
//   }

//   @Patch(':notificationId/clear')
//   async clearNotification(
//     @Param('adminId') adminId: string,
//     @Param('notificationId') notificationId: string,
//   ) {
//     return this.notificationService.clearAdminNotification(
//       adminId,
//       notificationId,
//     );
//   }

//   @Patch('clear-all')
//   async clearAllNotifications(@Param('adminId') adminId: string) {
//     return this.notificationService.clearAllAdminNotifications(adminId);
//   }

//   @Delete(':notificationId')
//   async deleteAdminNotification(
//     @Param('adminId') adminId: string,
//     @Param('notificationId') notificationId: string,
//   ) {
//     return this.notificationService.deleteAdminNotification(
//       adminId,
//       notificationId,
//     );
//   }
// }

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import {
  CreateAdminNotificationDto,
  CreateNotificationDto,
  SendPushDto,
  SendEmailToWaddleTeamViaContactUsFormDto,
} from './dto';
import { recipientTypeEnum } from './dto/recepientTypes';

@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // --- SHARED / PUBLIC NOTIFICATIONS ---

  @ApiOperation({
    summary: 'Create and send notification',
    description:
      'Create notification in database and optionally send push notification',
  })
  @ApiOkResponse({ description: 'Notification created successfully' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationService.createNotification(dto);
  }

  @ApiOperation({
    summary: 'Send push notification',
    description: 'Send push notification to user or organiser',
  })
  @ApiOkResponse({ description: 'Push notification sent' })
  @HttpCode(HttpStatus.OK)
  @Post('push')
  async sendPush(@Body() dto: SendPushDto) {
    if (dto.recipientType === recipientTypeEnum.USER) {
      return this.notificationService.sendPushToUser(
        dto.userId,
        dto.title,
        dto.body,
      );
    } else if (dto.recipientType === recipientTypeEnum.ORGANISER) {
      return this.notificationService.sendPushToOrganiser(
        dto.userId,
        dto.title,
        dto.body,
      );
    }
  }

  @ApiOperation({
    summary: 'Get notifications',
    description:
      'Get paginated notifications for a user or organiser based on recipientType',
  })
  @ApiQuery({ name: 'recipientType', enum: recipientTypeEnum })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('recipients/:recipientId')
  async getNotifications(
    @Param('recipientId') recipientId: string,
    @Query('recipientType') recipientType: recipientTypeEnum,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    if (recipientType === recipientTypeEnum.USER) {
      return this.notificationService.getUserNotifications(
        recipientId,
        page,
        limit,
      );
    } else if (recipientType === recipientTypeEnum.ORGANISER) {
      return this.notificationService.getOrganiserNotifications(
        recipientId,
        page,
        limit,
      );
    }
  }

  @ApiOperation({
    summary: 'Mark a notification as read',
    description: 'Mark a specific notification as read for a recipient',
  })
  @Patch(':id/read/:recipientId/:recipientType')
  async markAsRead(
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
    @Param('recipientType') recipientType: recipientTypeEnum,
  ) {
    return this.notificationService.markAsRead(id, recipientId, recipientType);
  }

  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications as read for a recipient',
  })
  @Patch('read-all/:recipientId/:recipientType')
  async markAllAsRead(
    @Param('recipientId') recipientId: string,
    @Param('recipientType') recipientType: recipientTypeEnum,
  ) {
    return this.notificationService.markAllAsRead(recipientId, recipientType);
  }

  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Get count of unread notifications for a recipient',
  })
  @Get('unread-count/:recipientId/:recipientType')
  async getUnreadCount(
    @Param('recipientId') recipientId: string,
    @Param('recipientType') recipientType: recipientTypeEnum,
  ) {
    return this.notificationService.getUnreadCount(recipientId, recipientType);
  }

  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Delete a specific notification for a recipient',
  })
  @Delete(':id/recipient/:recipientId/:recipientType')
  async deleteNotification(
    @Param('id') id: string,
    @Param('recipientId') recipientId: string,
    @Param('recipientType') recipientType: recipientTypeEnum,
  ) {
    return this.notificationService.deleteNotification(
      id,
      recipientId,
      recipientType,
    );
  }

  @ApiOperation({
    summary: 'Delete all notifications for recipient',
    description: 'Delete all notifications for a recipient',
  })
  @Delete('recipient/:recipientId/:recipientType')
  async deleteAllNotifications(
    @Param('recipientId') recipientId: string,
    @Param('recipientType') recipientType: recipientTypeEnum,
  ) {
    return this.notificationService.deleteAllNotifications(
      recipientId,
      recipientType,
    );
  }

  // --- ADMIN NOTIFICATIONS ---

  @ApiOperation({
    summary: 'Create admin notification',
    description: 'Create a notification for all active admins',
  })
  @Post('admin')
  async createAdminNotification(@Body() dto: CreateAdminNotificationDto) {
    return this.notificationService.createAdminNotification(dto);
  }

  @ApiOperation({
    summary: 'Get admin notifications',
    description: 'Get admin notifications with filter options',
  })
  @Get('admin/:adminId')
  async getAdminNotifications(
    @Param('adminId') adminId: string,
    @Query('includeRead') includeRead?: string,
    @Query('includeCleared') includeCleared?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const options = {
      includeRead: includeRead !== 'false',
      includeCleared: includeCleared === 'true',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };

    return this.notificationService.getAdminNotifications(adminId, options);
  }

  @ApiOperation({ summary: 'Get admin notification counts' })
  @Get('admin/:adminId/counts')
  async getNotificationCounts(@Param('adminId') adminId: string) {
    return this.notificationService.getAdminNotificationCounts(adminId);
  }

  @ApiOperation({
    summary: 'Get admin unread notification count',
    description: 'Get the count of unread notifications for a specific admin',
  })
  @Get('admin/:adminId/unread-count')
  async getAdminUnreadCount(@Param('adminId') adminId: string) {
    return this.notificationService.getAdminUnreadCount(adminId);
  }

  @ApiOperation({ summary: 'Mark admin notification as read' })
  @Patch('admin/:notificationId/read/:adminId')
  async markAdminNotificationAsRead(
    @Param('adminId') adminId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.markAdminNotificationAsRead(
      adminId,
      notificationId,
    );
  }

  @ApiOperation({ summary: 'Mark all admin notifications as read' })
  @Patch('admin/read-all/:adminId')
  async markAllAdminNotificationAsRead(@Param('adminId') adminId: string) {
    return this.notificationService.markAllAdminNotificationAsRead(adminId);
  }

  @ApiOperation({ summary: 'Clear specific admin notification' })
  @Patch('admin/:notificationId/clear/:adminId')
  async clearNotification(
    @Param('adminId') adminId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.clearAdminNotification(
      adminId,
      notificationId,
    );
  }

  @ApiOperation({ summary: 'Clear all admin notifications' })
  @Patch('admin/clear-all/:adminId')
  async clearAllNotifications(@Param('adminId') adminId: string) {
    return this.notificationService.clearAllAdminNotifications(adminId);
  }

  @ApiOperation({ summary: 'Soft delete admin notification' })
  @Delete('admin/:notificationId/:adminId')
  async deleteAdminNotification(
    @Param('adminId') adminId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.deleteAdminNotification(
      adminId,
      notificationId,
    );
  }

  @ApiOperation({ summary: 'Send Email To Waddle Team Via Contact Us Form' })
  @Post('admin/send-email-to-waddle-team-via-contact-us-form')
  async sendEmailToWaddleTeamViaContactUsForm(
    @Body() dto: SendEmailToWaddleTeamViaContactUsFormDto,
  ) {
    return this.notificationService.sendEmailToWaddleTeamViaContactUsForm(dto);
  }
}
