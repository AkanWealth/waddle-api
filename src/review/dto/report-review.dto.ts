import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportReviewDto {
  @ApiProperty({
    description: 'Short reason describing why the review is being reported',
    example: 'Contains offensive language',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'Detailed explanation to help admins resolve the report',
    example: 'Reviewer used slurs against other parents attending the event',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

