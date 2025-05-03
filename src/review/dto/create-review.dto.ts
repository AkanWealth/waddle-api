import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateReviewDto {
  @ApiPropertyOptional({ description: 'Name', example: 'John Paul' })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  name: string;

  @ApiProperty({ description: 'Rating', example: 5, required: true })
  @IsNumber({}, { message: 'Rating must be an integer' })
  @IsNotEmpty({ message: 'Rating can not be blank' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Comment',
    example: 'Such a wonderful event',
  })
  @IsString({ message: 'Comment must be a string' })
  @IsOptional()
  comment: string;

  @ApiProperty({
    description: 'Event ID',
    example: 'cm750aqk900081417lrqc4iq6',
    required: true,
  })
  @IsString({ message: 'Event ID must be a string' })
  @IsNotEmpty({ message: 'Event ID cannot be empty' })
  eventId: string;
}
