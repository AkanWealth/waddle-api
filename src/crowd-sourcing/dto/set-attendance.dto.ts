import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetAttendanceDto {
  @ApiProperty({
    description: 'Whether the user is going or not',
    example: true,
  })
  @IsBoolean()
  isGoing: boolean;
}
