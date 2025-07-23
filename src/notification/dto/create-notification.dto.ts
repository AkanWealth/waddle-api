import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Title',
    example: 'Event Booking Confirmed',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Body',
    example: 'Your booking for Kids Party has been confirmed!',
    required: true,
  }) 
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Recipient User ID',
    example: 'clu123456789',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({
    description: 'Send push notification',
    example: true,
    required: false,
  })
  @IsOptional()
  sendPush?: boolean = true;
}
