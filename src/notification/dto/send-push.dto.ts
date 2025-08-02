import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { recipientTypeEnum } from './recepientTypes';

export class SendPushDto {
  @ApiProperty({
    description: 'Title',
    example: 'Test Notification',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Body',
    example: 'Message body',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'User ID',
    example: 'clu123456789',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'User or Organiser',
    example: recipientTypeEnum.USER,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  recipientType: recipientTypeEnum;
}
