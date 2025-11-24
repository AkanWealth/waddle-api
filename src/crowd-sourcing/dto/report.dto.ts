import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportContentDto {
  @ApiProperty({
    description: 'Short reason for reporting the content',
    example: 'Inappropriate language',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional context for the report',
    example: 'Contains profanity directed at other parents',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
