import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class ToggleRecommendationDto {
  @ApiProperty({ example: 'user_123' })
  userId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  wouldRecommend: boolean;
}

export class AttendanceStatusDto {
  @ApiProperty({ enum: ['YES', 'NO', 'PENDING'] })
  @IsString()
  going: 'YES' | 'NO' | 'PENDING';
}
