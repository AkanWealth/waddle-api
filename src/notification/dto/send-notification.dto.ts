import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class sendNotificationDTO {
  @ApiProperty({
    description: 'Title',
    example: 'Test Notification',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Body', example: 'Message body', required: true })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Devide ID',
    example: '8297897823',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
