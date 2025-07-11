import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
}
