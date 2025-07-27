import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DisputeCategory } from '@prisma/client';

export class UpdateDisputeDto {
  @IsEnum(DisputeCategory)
  @IsOptional()
  category?: DisputeCategory;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  refundRequest?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  file?: string;
}
