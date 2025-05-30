import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveOrganiserDto {
  @ApiProperty({
    example: true,
    description: 'Set to true to approve, false to reject the organiser',
  })
  @IsBoolean()
  isApproved: boolean;
}
