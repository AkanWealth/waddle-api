import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CreateNotificationPreferenceDto {
  @ApiPropertyOptional({ description: 'Notify on new orders', example: true })
  @IsOptional()
  @IsBoolean()
  order?: boolean;

  @ApiPropertyOptional({
    description: 'Notify on event approval',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  event_approval?: boolean;

  @ApiPropertyOptional({
    description: 'Notify on cancellations',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  cancellation?: boolean;

  @ApiPropertyOptional({ description: 'Notify on payments', example: true })
  @IsOptional()
  @IsBoolean()
  payments?: boolean;

  @ApiPropertyOptional({
    description: 'System/product announcements',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  system?: boolean;
}
