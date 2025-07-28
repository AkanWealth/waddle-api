import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { DisputeCategory } from '@prisma/client';

export class CreateDisputeDto {
  @IsEnum(DisputeCategory)
  @IsNotEmpty()
  category: DisputeCategory;

  @IsString()
  @IsNotEmpty()
  bookingRef: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
