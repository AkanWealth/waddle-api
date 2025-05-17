import { Controller } from '@nestjs/common';
import { ApiInternalServerErrorResponse } from '@nestjs/swagger';

@ApiInternalServerErrorResponse({ description: 'Internal Server Error' })
@Controller('notification')
export class NotificationController {
  constructor() {}

  // @ApiOperation({
  //   summary: 'send push notification',
  //   description: 'Send push notification',
  // })
  // @ApiOkResponse({ description: 'Ok' })
  // @HttpCode(HttpStatus.OK)
  // @Post('push')
  // sendNotification(@Body() dto: sendNotificationDTO) {
  //   this.notificationService.sendPush(dto);
  // }
}
