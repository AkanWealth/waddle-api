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
}
