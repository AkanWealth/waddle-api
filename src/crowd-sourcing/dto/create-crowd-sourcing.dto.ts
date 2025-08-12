import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCrowdSourcingDto {
  @ApiPropertyOptional({
    description: 'Images',
    type: 'array',
    example: ['xample.png', 'example.png', 'ample.png'],
  })
  @IsArray()
  @IsOptional()
  images: string[];

  @ApiPropertyOptional({
    description: 'Is Free',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFree: boolean;

  @ApiProperty({
    description: 'Name',
    type: String,
    example: 'Isaac John Park',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description',
    type: String,
    example: 'Isaac John Park',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Address',
    type: String,
    example: '156 Landrole Coventry',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Category',
    type: String,
    example: 'Workshop',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Tag',
    type: String,
    example: 'Event',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  tag: string;

  @ApiPropertyOptional({
    description: 'Tips',
    type: String,
    example: 'Weekdays morning are quiet',
  })
  @IsString()
  @IsOptional()
  tips?: string;

  @ApiPropertyOptional({
    description: 'Date',
    type: String,
    example: '2026-07-26',
  })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({
    description: 'Time',
    type: String,
    example: '12:30:00',
  })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({
    description: 'Facilities',
    type: [String],
    example: ['HVAC', 'Security Systems', 'Parking'],
  })
  @IsArray({
    message: 'The input must be an array.',
  })
  @IsString({ each: true, message: 'Each item in the array must be a string.' })
  @IsOptional()
  facilities?: string[];

  @ApiPropertyOptional({
    description: 'Published',
    type: String,
    example: 'true',
  })
  @IsString()
  @IsOptional()
  isPublished?: string;
}
