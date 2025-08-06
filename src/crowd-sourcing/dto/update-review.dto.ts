import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: 'Optional review comment',
    example: 'Updated: Still a great place but could be cleaner',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
