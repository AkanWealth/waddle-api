import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { DisputeCategory } from '@prisma/client';

export class CreateDisputeDto {
  @IsEnum(DisputeCategory)
  @IsNotEmpty()
  category: DisputeCategory;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  bookingRef: string;

  @IsString()
  @IsOptional()
  refundRequest?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  file?: string;
}
