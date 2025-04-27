import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'The name of the event',
    example: 'Art Workshop',
  })
  @IsNotEmpty({ message: 'The name can not be blank' })
  @IsString({ message: 'The name must be a string' })
  name: string;

  @ApiProperty({
    description: 'The description of the event',
    example:
      'Unleash your creativity in our art workshop, suitable for all skill levels.',
  })
  @IsString({ message: 'The description must be a string' })
  @IsNotEmpty({ message: 'The description cannot be empty' })
  description: string;

  @ApiProperty({
    description: 'The address of the event',
    example: '321 Art Ave, Creative City, CC 98765',
  })
  @IsString({ message: 'The address must be a string' })
  @IsNotEmpty({ message: 'The address can not be blank' })
  address: string;

  @ApiProperty({
    description: 'The price of the event',
    example: '100.0',
  })
  @IsString({ message: 'The price must be a string' })
  @IsNotEmpty({ message: 'The price can not be blank' })
  price: string;

  @ApiProperty({
    description: 'The total ticket of the event',
    example: '20',
  })
  @IsString({ message: 'The total ticket must be a string' })
  @IsNotEmpty({ message: 'The total ticket can not be blank' })
  total_ticket: string;

  @ApiProperty({
    description: 'The date of the event',
    example: '2025-03-26',
  })
  @IsDateString({}, { message: 'The date must be a date string' })
  @IsNotEmpty({ message: 'The date can not be blank' })
  date: string;

  @ApiProperty({
    description: 'The time of the event in 24 hours',
    example: '11:30:00',
  })
  @IsString({ message: 'The time must be a string' })
  @IsNotEmpty({ message: 'The time can not be blank' })
  time: string;

  @ApiProperty({
    description: 'The age range of the event',
    example: '6-10',
  })
  @IsString({ message: 'The age range must be a string' })
  @IsNotEmpty({ message: 'The age range can not be blank' })
  age_range: string;

  @ApiPropertyOptional({
    description: 'The instruction of the event',
    example: 'Parent supervision is required',
  })
  @IsString({ message: 'The instruction must be a string' })
  @IsOptional()
  instruction: string;

  @ApiProperty({
    description: 'The category of the event',
    example: 'Games',
    required: true,
  })
  @IsString({ message: 'The category must be a string' })
  @IsNotEmpty({ message: 'The category can not be blank' })
  category: string;

  @ApiPropertyOptional({
    description: 'The published state of the event',
    example: true,
  })
  @IsString({ message: 'The published value must be a string' })
  @IsOptional()
  isPublished: true;
}
