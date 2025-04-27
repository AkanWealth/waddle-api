import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Rate the event', example: 5, required: true })
  @IsNumber({}, { message: 'Rating must be an integer' })
  @IsNotEmpty({ message: 'Rating can not be blank' })
  rating: number;

  @ApiPropertyOptional({
    description: 'Comment for the given rating.',
    example: 'Such a wonderful event',
  })
  @IsString({ message: 'Comment must be a string' })
  @IsOptional()
  comment: string;

  @ApiProperty({
    description: 'Event ID for the given rating.',
    example: 'cm750aqk900081417lrqc4iq6',
    required: true,
  })
  @IsString({ message: 'Comment must be a string' })
  @IsNotEmpty({ message: 'The event ID cannot be empty' })
  eventId: string;
}
