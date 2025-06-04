import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class BookingConsentDto {
  @ApiProperty({
    description: 'Booking ID',
    example: 'cm7539b180003u0qavzlq72p4',
    required: true,
  })
  @IsString({ message: 'Booking ID must be a string' })
  @IsNotEmpty({ message: 'Booking ID can not be empty' })
  bookingId: string;

  @ApiProperty({
    description: 'Name',
    example: 'Tony Martins',
    required: true,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name can not be empty' })
  name: string;

  @ApiProperty({
    description: 'Age',
    example: 10,
    required: true,
  })
  @IsNumber({}, { message: 'Age must be a number' })
  @IsNotEmpty({ message: 'Age can not be empty' })
  age: number;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Allegic to peanuts',
  })
  @IsString({ message: 'Notes must be a string' })
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: 'Consent',
    example: true,
    required: true,
  })
  @IsBoolean({ message: 'Consent must be a boolean' })
  @IsNotEmpty()
  consent: boolean;
}
