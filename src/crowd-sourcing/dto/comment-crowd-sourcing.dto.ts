import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CommentCrowdSourcingDto {
  @ApiProperty({
    description: 'Content',
    type: String,
    example: 'This is a comment',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Crowd Sourced Event ID',
    type: String,
    example: 'cr93e2h9h9rr92rh2rh',
  })
  @IsOptional()
  @IsString()
  crowdSourceId?: string;

  @ApiPropertyOptional({
    description: 'Parent Comment ID',
    type: String,
    example: 'cr93e2h9h9rr92rh2rh',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
