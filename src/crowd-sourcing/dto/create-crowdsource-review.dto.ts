import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateCrowdSourceReviewDto {
  @ApiProperty({
    description: 'Review comment about the place',
    type: String,
    example: 'Beautiful space, well maintained, and kid-friendly!',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    description: 'Would you recommend this place?',
    type: Boolean,
    example: true,
    required: true,
  })
  @IsBoolean()
  would_recommend: boolean;
}
