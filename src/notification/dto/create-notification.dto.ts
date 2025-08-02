import { ApiProperty } from '@nestjs/swagger';
import { RecipientType } from '@prisma/client';
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

  @ApiProperty({
    description: 'Recipient type',
    example: RecipientType,
    required: false,
  })
  @IsString()
  recipientType: RecipientType;

  @ApiProperty({
    description: 'Should be visible to admins',
    example: true,
    required: false,
  })
  @IsOptional()
  visibleToAdmins?: boolean = false;
}

export interface CreateAdminNotificationDto {
  title: string;
  body: string;
  type?: string;
  data?: any;
}
