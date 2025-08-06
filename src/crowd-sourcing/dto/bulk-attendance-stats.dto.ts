import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class BulkAttendanceStatsDto {
  @ApiProperty({
    description: 'Array of CrowdSource IDs to get statistics for',
    example: ['cs_123', 'cs_456', 'cs_789'],
  })
  @IsArray()
  @IsString({ each: true })
  crowdSourceIds: string[];
}
