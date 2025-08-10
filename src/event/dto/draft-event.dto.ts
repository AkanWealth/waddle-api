import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventType } from './create-event.dto';
import { Transform } from 'class-transformer';

export class DraftEventDto {
  @ApiPropertyOptional({ description: 'Event name', example: 'Art Workshop' })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Description',
    example:
      'Unleash your creativity in our art workshop, suitable for all skill levels.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Address',
    example: '321 Art Ave, Creative City, CC 98765',
  })
  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  address?: string;

  @ApiPropertyOptional({
    description: 'Price',
    example: '100.0',
  })
  @IsOptional()
  @IsString({ message: 'Price must be a string' })
  price?: string;

  @ApiPropertyOptional({
    description: 'Total ticket',
    example: '20',
  })
  @IsOptional()
  @IsString({ message: 'Total ticket must be a string' })
  total_ticket?: string;

  @ApiPropertyOptional({
    description: 'Date',
    example: '2025-03-26',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString({}, { message: 'Date must be a date string' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Time in 24 hours',
    example: '11:30:00',
  })
  @IsOptional()
  @IsString({ message: 'Time must be a string' })
  time?: string;

  @ApiPropertyOptional({
    description: 'Age range',
    example: '6-10',
  })
  @IsOptional()
  @IsString({ message: 'Age range must be a string' })
  age_range?: string;

  @ApiPropertyOptional({
    description: 'Instruction',
    example: ['Parent supervision is required'],
  })
  @IsOptional()
  @IsArray({ message: 'Instruction must be an array of strings' })
  instructions?: string[];

  @ApiPropertyOptional({
    description: 'Category',
    example: 'Games',
  })
  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  category?: string;

  @ApiPropertyOptional({ description: 'Published status', example: true })
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Distance', example: 10 })
  @IsOptional()
  @IsNumber({}, { message: 'Distance must be a number' })
  distance?: number;

  @ApiPropertyOptional({
    description: 'Facilities',
    example: ['WiFi', 'Parking'],
  })
  @IsOptional()
  @IsArray({ message: 'Facilities must be an array of strings' })
  @IsString({ each: true, message: 'Each facility must be a string' })
  facilities?: string[];

  @ApiPropertyOptional({
    description: 'Tags',
    example: ['Art', 'Kids', 'Science'],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array of strings' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Event type',
    enum: EventType,
    example: EventType.INDOOR,
  })
  @IsOptional()
  @IsEnum(EventType, { message: 'Event type must be INDOOR or OUTDOOR' })
  eventType?: EventType;

  @ApiPropertyOptional({
    description: 'Files',
    example: ['https://s3//shhhs.com'],
  })
  @IsOptional()
  @IsArray({ message: 'Files must be an array of strings' })
  @IsString({ each: true, message: 'Each file must be a string' })
  files?: string[];
}
