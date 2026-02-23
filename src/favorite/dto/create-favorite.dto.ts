import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateFavoriteDto {
  @ApiProperty({
    description: 'Event ID (for official events)',
    example: 'EVT-abc123',
    required: false,
  })
  @IsString({ message: 'Event ID must be a string' })
  @IsOptional()
  eventId?: string;

  @ApiProperty({
    description: 'CrowdSource ID (for crowdsourced events or places)',
    example: 'cs_abc123',
    required: false,
  })
  @IsString({ message: 'CrowdSource ID must be a string' })
  @IsOptional()
  crowdSourceId?: string;
}
