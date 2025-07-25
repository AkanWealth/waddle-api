import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum EventType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR',
}

export class CreateEventDto {
  @ApiProperty({ description: 'Event name', example: 'Art Workshop' })
  @IsNotEmpty({ message: 'Name can not be blank' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @ApiProperty({
    description: 'Description',
    example:
      'Unleash your creativity in our art workshop, suitable for all skill levels.',
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description cannot be empty' })
  description: string;

  @ApiProperty({
    description: 'Address',
    example: '321 Art Ave, Creative City, CC 98765',
  })
  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address can not be blank' })
  address: string;

  @ApiProperty({
    description: 'Price',
    example: '100.0',
  })
  @IsString({ message: 'Price must be a string' })
  @IsNotEmpty({ message: 'Price can not be blank' })
  price: string;

  @ApiProperty({
    description: 'Total ticket ',
    example: '20',
  })
  @IsString({ message: 'Total ticket must be a string' })
  @IsNotEmpty({ message: 'Total ticket can not be blank' })
  total_ticket: string;

  @ApiProperty({
    description: 'Date',
    example: '2025-03-26',
  })
  @IsDateString({}, { message: 'Date must be a date string' })
  @IsNotEmpty({ message: 'Date can not be blank' })
  date: string;

  @ApiProperty({
    description: 'Time in 24 hours',
    example: '11:30:00',
  })
  @IsString({ message: 'Time must be a string' })
  @IsNotEmpty({ message: 'Time can not be blank' })
  time: string;

  @ApiProperty({
    description: 'Age range',
    example: '6-10',
  })
  @IsString({ message: 'Age range must be a string' })
  @IsNotEmpty({ message: 'Age range can not be blank' })
  age_range: string;

  @ApiPropertyOptional({
    description: 'Instruction',
    example: ['Parent supervision is required'],
  })
  @IsArray({ message: 'Instruction must be a string of array' })
  @IsOptional()
  instructions: [string];

  @ApiProperty({
    description: 'Category',
    example: 'Games',
    required: true,
  })
  @IsString({ message: 'Category must be a string' })
  @IsNotEmpty({ message: 'Category can not be blank' })
  category: string;

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
  @IsString({ message: 'Published value must be a string' })
  @IsOptional()
  @IsArray({ message: 'Facilities must be an array of strings' })
  @IsString({ each: true, message: 'Each facility must be a string' })
  facilities?: string[];

  @ApiPropertyOptional({ description: 'Tags', example: ['Art', 'Kids'] })
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
}
