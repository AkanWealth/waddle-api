import { Body, Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { sendNotificationDTO } from './dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  sendNotification(@Body() dto: sendNotificationDTO) {
    this.notificationService.sendPush(dto);
  }
}
