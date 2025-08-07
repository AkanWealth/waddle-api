import { ApiProperty } from '@nestjs/swagger';

export class ToggleRecommendationDto {
  @ApiProperty({ example: 'user_123' })
  userId: string;

  @ApiProperty({ example: true })
  wouldRecommend: boolean;
}

export class AttendanceStatusDto {
  @ApiProperty({ example: 'user_123' })
  userId: string;

  @ApiProperty({ enum: ['YES', 'NO', 'PENDING'] })
  going: 'YES' | 'NO' | 'PENDING';
}
