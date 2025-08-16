import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryPaymentDto {
  @ApiPropertyOptional({
    description: 'Page number (for pagination)',
    minimum: 1,
    default: 1,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (for pagination)',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCESSFUL,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by User ID',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Event ID',
    example: 'event_67890',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO format)',
    example: '2025-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO format)',
    example: '2025-08-15T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
