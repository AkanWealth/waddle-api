import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateActivitiesDto {
  @ApiProperty({
    description: 'The name of the activity',
    example: 'Art Workshop',
  })
  @IsNotEmpty({ message: 'The name can not be blank' })
  @IsString({ message: 'The name must be a string' })
  name: string;

  @ApiProperty({
    description: 'The description of the activity',
    example:
      'Unleash your creativity in our art workshop, suitable for all skill levels.',
  })
  @IsString({ message: 'The description must be a string' })
  @IsNotEmpty({ message: 'The description cannot be empty' })
  description: string;

  @ApiProperty({
    description: 'The address of the activity',
    example: '321 Art Ave, Creative City, CC 98765',
  })
  @IsString({ message: 'The address must be a string' })
  @IsNotEmpty({ message: 'The address can not be blank' })
  address: string;

  @ApiProperty({
    description: 'The price of the activity',
    example: 100.0,
  })
  @IsNumber({}, { message: 'The price must be a number' })
  @IsNotEmpty({ message: 'The price can not be blank' })
  price: number;

  @ApiProperty({
    description: 'The total ticket of the activity',
    example: 20,
  })
  @IsNumber({}, { message: 'The total ticket must be a number' })
  @IsNotEmpty({ message: 'The total ticket can not be blank' })
  total_ticket: number;

  @ApiProperty({
    description: 'The date of the activity',
    example: '2025-03-26',
  })
  @IsDateString({}, { message: 'The date must be a date string' })
  @IsNotEmpty({ message: 'The date can not be blank' })
  date: string;

  @ApiProperty({
    description: 'The time of the activity in 24 hours',
    example: '11:30:00',
  })
  @IsString({ message: 'The time must be a string' })
  @IsNotEmpty({ message: 'The time can not be blank' })
  time: string;

  @ApiProperty({
    description: 'The age range of the activity',
    example: '6-10',
  })
  @IsString({ message: 'The age range must be a string' })
  @IsNotEmpty({ message: 'The age range can not be blank' })
  age_range: string;

  @ApiPropertyOptional({
    description: 'The instruction of the activity',
    example: 'Parent supervision is required',
  })
  @IsString({ message: 'The instruction must be a string' })
  @IsOptional()
  instruction: string;
}
