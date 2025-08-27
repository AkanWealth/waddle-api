import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CreateUserNotificationPreferenceDto {
  @ApiPropertyOptional({ description: 'Booking confirmation', example: true })
  @IsOptional()
  @IsBoolean()
  booking_confirmation?: boolean;

  @ApiPropertyOptional({ description: 'New events', example: true })
  @IsOptional()
  @IsBoolean()
  new_events?: boolean;

  @ApiPropertyOptional({ description: 'Replies', example: true })
  @IsOptional()
  @IsBoolean()
  replies?: boolean;

  @ApiPropertyOptional({ description: 'Past events', example: true })
  @IsOptional()
  @IsBoolean()
  past_events?: boolean;

  @ApiPropertyOptional({ description: 'Email notifications', example: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ description: 'New features', example: true })
  @IsOptional()
  @IsBoolean()
  new_features?: boolean;
}
