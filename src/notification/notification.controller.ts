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
import { CreateNotificationDto, SendPushDto } from './dto';

@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

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
    description: 'Send push notification to user',
  })
  @ApiOkResponse({ description: 'Push notification sent' })
  @HttpCode(HttpStatus.OK)
  @Post('push')
  async sendPush(@Body() dto: SendPushDto) {
    return this.notificationService.sendPushToUser(
      dto.userId,
      dto.title,
      dto.body,
    );
  }

  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Get paginated notifications for a user',
  })
  @ApiOkResponse({ description: 'Notifications retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.notificationService.getUserNotifications(userId, page, limit);
  }

  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiOkResponse({ description: 'Notification marked as read' })
  @Patch(':id/read/:userId')
  async markAsRead(@Param('id') id: string, @Param('userId') userId: string) {
    return this.notificationService.markAsRead(id, userId);
  }

  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications as read for a user',
  })
  @ApiOkResponse({ description: 'All notifications marked as read' })
  @Patch('read-all/:userId')
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @ApiOperation({
    summary: 'Get unread count',
    description: 'Get count of unread notifications for a user',
  })
  @ApiOkResponse({ description: 'Unread count retrieved' })
  @Get('unread-count/:userId')
  async getUnreadCount(@Param('userId') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @ApiOperation({
    summary: 'Delete a notification',
    description: 'Delete a specific notification for a user',
  })
  @ApiOkResponse({ description: 'Notification deleted successfully' })
  @Delete(':id/user/:userId')
  async deleteNotification(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.notificationService.deleteNotification(id, userId);
  }

  @ApiOperation({
    summary: 'Delete all notifications for a user',
    description: 'Delete all notifications for a user',
  })
  @ApiOkResponse({ description: 'All notifications deleted successfully' })
  @Delete('user/:userId')
  async deleteAllNotifications(@Param('userId') userId: string) {
    return this.notificationService.deleteAllNotifications(userId);
  }
}
