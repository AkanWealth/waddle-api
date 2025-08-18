import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConsentItemDto {
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

export class BookingConsentDto {
  @ApiProperty({
    description: 'Array of consent items',
    type: [ConsentItemDto],
    example: [
      {
        name: 'Tony Martins',
        age: 10,
        notes: 'Allergic to peanuts',
        consent: true,
      },
      {
        name: 'Sarah Johnson',
        age: 8,
        consent: true,
      },
    ],
  })
  @IsArray({ message: 'Consents must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ConsentItemDto)
  consents: ConsentItemDto[];
}
