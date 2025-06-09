import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReviewLikeDto {
  @ApiProperty({
    description: 'Review ID to like',
    example: 'hdiyir6ehef8y3883y',
    required: true,
  })
  @IsString({ message: 'Review ID must be a type of string' })
  @IsNotEmpty({ message: 'Review ID must not be empty' })
  reviewId: string;
}
